import { ForbiddenException, HttpException, HttpStatus, Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type Counter = { resetAtMs: number; count: number };

function parsePositiveInt(value: string | undefined, fallback: number): number {
  if (value == null) return fallback;
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n) || n < 0) return fallback;
  return n;
}

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value == null) return fallback;
  const v = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'y', 'on'].includes(v)) return true;
  if (['0', 'false', 'no', 'n', 'off'].includes(v)) return false;
  return fallback;
}

@Injectable()
export class AiUsageService {
  private readonly chatCounters = new Map<string, Counter>();
  private readonly webSearchCounters = new Map<string, Counter>();
  private readonly activeStreams = new Map<string, number>();

  private readonly chatRateLimitPerMinute: number;
  private readonly webSearchRateLimitPerMinute: number;
  private readonly streamMaxConcurrencyPerUser: number;

  private readonly creditsEnabled: boolean;
  private readonly creditCostChat: number;
  private readonly creditCostWebSearch: number;

  constructor(private readonly prisma: PrismaService) {
    this.chatRateLimitPerMinute = parsePositiveInt(process.env.AI_RATE_LIMIT_PER_MINUTE, 30);
    this.webSearchRateLimitPerMinute = parsePositiveInt(process.env.AI_WEBSEARCH_RATE_LIMIT_PER_MINUTE, 10);
    this.streamMaxConcurrencyPerUser = parsePositiveInt(process.env.AI_STREAM_MAX_CONCURRENCY_PER_USER, 2);

    const defaultCreditsEnabled = process.env.NODE_ENV === 'production';
    this.creditsEnabled = parseBoolean(process.env.AI_CREDITS_ENABLED, defaultCreditsEnabled);
    this.creditCostChat = parsePositiveInt(process.env.AI_CREDIT_COST_CHAT, 1);
    this.creditCostWebSearch = parsePositiveInt(process.env.AI_CREDIT_COST_WEBSEARCH, 1);
  }

  private hitCounter(map: Map<string, Counter>, key: string, limitPerMinute: number) {
    if (limitPerMinute <= 0) return;

    const now = Date.now();
    const windowMs = 60_000;
    const existing = map.get(key);

    if (!existing || now >= existing.resetAtMs) {
      map.set(key, { resetAtMs: now + windowMs, count: 1 });
      return;
    }

    existing.count += 1;
    if (existing.count > limitPerMinute) {
      const retryAfterSec = Math.max(1, Math.ceil((existing.resetAtMs - now) / 1000));
      throw new HttpException(`Rate limit exceeded. Try again in ${retryAfterSec}s.`, HttpStatus.TOO_MANY_REQUESTS);
    }
  }

  assertChatRateLimit(userId: string, opts: { webSearch?: boolean }) {
    this.hitCounter(this.chatCounters, userId, this.chatRateLimitPerMinute);
    if (opts.webSearch) {
      this.hitCounter(this.webSearchCounters, userId, this.webSearchRateLimitPerMinute);
    }
  }

  reserveStreamSlot(userId: string): () => void {
    if (this.streamMaxConcurrencyPerUser <= 0) {
      return () => {};
    }

    const current = this.activeStreams.get(userId) ?? 0;
    if (current >= this.streamMaxConcurrencyPerUser) {
      throw new HttpException('Too many concurrent streaming requests', HttpStatus.TOO_MANY_REQUESTS);
    }

    this.activeStreams.set(userId, current + 1);

    let released = false;
    return () => {
      if (released) return;
      released = true;
      const next = (this.activeStreams.get(userId) ?? 1) - 1;
      if (next <= 0) this.activeStreams.delete(userId);
      else this.activeStreams.set(userId, next);
    };
  }

  getChatCreditCost(opts: { webSearch?: boolean }): number {
    if (!this.creditsEnabled) return 0;
    const base = this.creditCostChat;
    const extra = opts.webSearch ? this.creditCostWebSearch : 0;
    return base + extra;
  }

  async consumeCreditsOrThrow(userId: string, cost: number): Promise<number | null> {
    if (!this.creditsEnabled) return null;
    if (cost <= 0) return null;

    const [updateResult, user] = await this.prisma.$transaction([
      this.prisma.user.updateMany({
        where: { id: userId, credits: { gte: cost } },
        data: { credits: { decrement: cost } },
      }),
      this.prisma.user.findUnique({ where: { id: userId }, select: { credits: true } }),
    ]);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (updateResult.count === 0) {
      throw new ForbiddenException(`Insufficient credits (${user.credits} remaining)`);
    }

    return user.credits;
  }
}

