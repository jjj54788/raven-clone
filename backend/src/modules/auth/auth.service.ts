import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { PrismaService } from '../prisma/prisma.service';
import { verifyFirebaseToken } from '../../utils/firebase-admin';

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  private get jwtSecret(): string {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET is required');
    }
    return secret;
  }

  generateTokens(userId: string) {
    const accessToken = jwt.sign({ sub: userId, type: 'access' }, this.jwtSecret, { expiresIn: '7d' });
    const refreshToken = jwt.sign({ sub: userId, type: 'refresh' }, this.jwtSecret, { expiresIn: '30d' });
    return { accessToken, refreshToken };
  }

  private verifyToken(token: string): { sub: string; type?: string } | null {
    try {
      const decoded = jwt.verify(token, this.jwtSecret) as { sub: string; type?: string };
      return decoded;
    } catch {
      return null;
    }
  }

  getUserIdFromRequest(req: { headers?: { authorization?: string } }): string | null {
    const auth = req.headers?.authorization;
    if (!auth?.startsWith('Bearer ')) return null;
    const decoded = this.verifyToken(auth.slice(7));
    if (!decoded) return null;
    if (decoded.type === 'refresh') return null;
    return decoded.sub;
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

    if (!user.password) {
      throw new UnauthorizedException('This account uses Google Sign-In. Please sign in with Google.');
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

  async googleLogin(firebaseToken: string) {
    const decoded = await verifyFirebaseToken(firebaseToken);
    if (!decoded) {
      throw new UnauthorizedException('Invalid Google token');
    }

    let user = await this.prisma.user.findUnique({ where: { email: decoded.email } });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email: decoded.email,
          name: decoded.name,
          password: null,
          provider: 'google',
          avatarUrl: decoded.picture || null,
        },
      });
    } else if (user.provider === 'local') {
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          provider: 'google',
          avatarUrl: decoded.picture || user.avatarUrl,
        },
      });
    }

    const tokens = this.generateTokens(user.id);
    return {
      user: { id: user.id, email: user.email, name: user.name, credits: user.credits, avatarUrl: user.avatarUrl },
      ...tokens,
    };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    return { id: user.id, email: user.email, name: user.name, credits: user.credits, avatarUrl: user.avatarUrl };
  }
}
