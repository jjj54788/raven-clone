import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateCheckInDto } from './dto/create-checkin.dto';
import type { ListCheckInsQueryDto } from './dto/list-checkins-query.dto';

const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;
const CHECKIN_DAY_START_HOUR = 5;

function formatDateKey(date: Date): string {
  const shifted = new Date(date.getTime() - CHECKIN_DAY_START_HOUR * 60 * 60 * 1000);
  const year = shifted.getFullYear();
  const month = String(shifted.getMonth() + 1).padStart(2, '0');
  const day = String(shifted.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function assertDateKey(value: string): string {
  const v = value.trim();
  if (!DATE_KEY_RE.test(v)) throw new BadRequestException('Invalid dateKey (expected YYYY-MM-DD)');
  return v;
}

@Injectable()
export class CheckInService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string, query: ListCheckInsQueryDto) {
    const where: Prisma.DailyCheckInWhereInput = { userId };

    if (query.from || query.to) {
      const from = query.from ? assertDateKey(query.from) : null;
      const to = query.to ? assertDateKey(query.to) : null;
      if (from && to && from > to) {
        throw new BadRequestException('Invalid range: from must be <= to');
      }
      where.dateKey = {
        ...(from ? { gte: from } : {}),
        ...(to ? { lte: to } : {}),
      };

      const rows = await this.prisma.dailyCheckIn.findMany({
        where,
        orderBy: { dateKey: 'asc' },
        select: { dateKey: true },
      });
      return { dates: rows.map((r) => r.dateKey) };
    }

    const rows = await this.prisma.dailyCheckIn.findMany({
      where,
      take: 400,
      orderBy: { dateKey: 'desc' },
      select: { dateKey: true },
    });
    const dates = rows.map((r) => r.dateKey);
    dates.sort();
    return { dates };
  }

  async checkIn(userId: string, dto: CreateCheckInDto) {
    const dateKey = dto.dateKey ? assertDateKey(dto.dateKey) : formatDateKey(new Date());

    try {
      const row = await this.prisma.dailyCheckIn.create({
        data: { userId, dateKey },
        select: { dateKey: true, createdAt: true },
      });
      return { dateKey: row.dateKey, created: true, createdAt: row.createdAt.toISOString() };
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        const existing = await this.prisma.dailyCheckIn.findUnique({
          where: { userId_dateKey: { userId, dateKey } },
          select: { dateKey: true, createdAt: true },
        });
        if (existing) {
          return { dateKey: existing.dateKey, created: false, createdAt: existing.createdAt.toISOString() };
        }
      }
      throw err;
    }
  }
}

