import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAllowlistEmailDto } from './dto/create-allowlist-email.dto';

const AUTH_INVITE_ONLY_KEY = 'auth.inviteOnly';

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function parseBoolean(value: string | undefined): boolean | null {
  if (value == null) return null;
  const v = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'y', 'on'].includes(v)) return true;
  if (['0', 'false', 'no', 'n', 'off'].includes(v)) return false;
  return null;
}

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async getAuthSettings() {
    const setting = await this.prisma.appSetting.findUnique({
      where: { key: AUTH_INVITE_ONLY_KEY },
      select: { value: true, updatedAt: true },
    });

    const allowlistCount = await this.prisma.signupAllowlistEmail.count();

    const dbValue = parseBoolean(setting?.value);
    const envValue = parseBoolean(process.env.AUTH_INVITE_ONLY);

    let inviteOnly: boolean;
    let inviteOnlySource: 'db' | 'env' | 'default';

    if (dbValue != null) {
      inviteOnly = dbValue;
      inviteOnlySource = 'db';
    } else if (envValue != null) {
      inviteOnly = envValue;
      inviteOnlySource = 'env';
    } else {
      inviteOnly = process.env.NODE_ENV === 'production';
      inviteOnlySource = 'default';
    }

    return {
      inviteOnly,
      inviteOnlySource,
      inviteOnlyStored: setting?.value ?? null,
      inviteOnlyUpdatedAt: setting?.updatedAt || null,
      allowlistCount,
    };
  }

  async setInviteOnly(inviteOnly: boolean) {
    const value = inviteOnly ? '1' : '0';
    await this.prisma.appSetting.upsert({
      where: { key: AUTH_INVITE_ONLY_KEY },
      update: { value },
      create: { key: AUTH_INVITE_ONLY_KEY, value },
    });
    return { inviteOnly };
  }

  async listAllowlistEmails() {
    return this.prisma.signupAllowlistEmail.findMany({
      orderBy: { createdAt: 'desc' },
      select: { id: true, email: true, note: true, createdAt: true, updatedAt: true },
    });
  }

  async addAllowlistEmail(dto: CreateAllowlistEmailDto) {
    const email = normalizeEmail(dto.email);
    try {
      return await this.prisma.signupAllowlistEmail.create({
        data: {
          email,
          note: dto.note?.trim() || null,
        },
        select: { id: true, email: true, note: true, createdAt: true, updatedAt: true },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new BadRequestException('Email already allowlisted');
      }
      throw err;
    }
  }

  async deleteAllowlistEmail(id: string) {
    const existing = await this.prisma.signupAllowlistEmail.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) {
      throw new NotFoundException('Allowlist entry not found');
    }
    await this.prisma.signupAllowlistEmail.delete({ where: { id } });
    return { ok: true };
  }

  async listUsers(params?: { q?: string }) {
    const q = params?.q?.trim();
    const where = q
      ? {
          OR: [
            { email: { contains: q, mode: 'insensitive' as const } },
            { name: { contains: q, mode: 'insensitive' as const } },
          ],
        }
      : undefined;

    return this.prisma.user.findMany({
      where,
      orderBy: [{ isAdmin: 'desc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        email: true,
        name: true,
        provider: true,
        credits: true,
        isAdmin: true,
        avatarUrl: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async setUserAdmin(targetUserId: string, isAdmin: boolean) {
    const target = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, isAdmin: true },
    });

    if (!target) {
      throw new NotFoundException('User not found');
    }

    if (!isAdmin && target.isAdmin) {
      const adminCount = await this.prisma.user.count({ where: { isAdmin: true } });
      if (adminCount <= 1) {
        throw new BadRequestException('Cannot remove the last admin');
      }
    }

    return this.prisma.user.update({
      where: { id: targetUserId },
      data: { isAdmin },
      select: {
        id: true,
        email: true,
        name: true,
        provider: true,
        credits: true,
        isAdmin: true,
        avatarUrl: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }
}
