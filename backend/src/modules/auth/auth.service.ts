import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  private get jwtSecret(): string {
    return process.env.JWT_SECRET || 'raven-secret';
  }

  generateTokens(userId: string) {
    const accessToken = jwt.sign({ sub: userId }, this.jwtSecret, { expiresIn: '7d' });
    const refreshToken = jwt.sign({ sub: userId, type: 'refresh' }, this.jwtSecret, { expiresIn: '30d' });
    return { accessToken, refreshToken };
  }

  verifyToken(token: string): string | null {
    try {
      const decoded = jwt.verify(token, this.jwtSecret) as { sub: string };
      return decoded.sub;
    } catch {
      return null;
    }
  }

  getUserIdFromRequest(req: { headers?: { authorization?: string } }): string | null {
    const auth = req.headers?.authorization;
    if (!auth?.startsWith('Bearer ')) return null;
    return this.verifyToken(auth.slice(7));
  }

  async register(email: string, name: string, password: string) {
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new BadRequestException('Email already registered');
    }

    const hash = await bcrypt.hash(password, 10);
    const user = await this.prisma.user.create({
      data: { email, name, password: hash },
    });

    const tokens = this.generateTokens(user.id);
    return {
      user: { id: user.id, email: user.email, name: user.name, credits: user.credits },
      ...tokens,
    };
  }

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const tokens = this.generateTokens(user.id);
    return {
      user: { id: user.id, email: user.email, name: user.name, credits: user.credits },
      ...tokens,
    };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    return { id: user.id, email: user.email, name: user.name, credits: user.credits };
  }
}
