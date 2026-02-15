import { Injectable, UnauthorizedException, BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { PrismaService } from '../prisma/prisma.service';
import { isFirebaseAuthConfigured, verifyFirebaseToken } from '../../utils/firebase-admin';

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly inviteOnlySettingKey = 'auth.inviteOnly';
  private readonly defaultProfileSettings = {
    userBubble: 'purple',
    aiBubble: 'soft',
    notifyEmail: true,
    notifyProduct: true,
    notifyWeekly: false,
    darkMode: false,
    locale: 'en' as const,
  };
  private readonly defaultIntegrations = {
    notion: false,
    drive: false,
    feishu: false,
    feishuOpenId: '',
  };

  private normalizeInterests(input: unknown): string[] {
    if (!Array.isArray(input)) return [];
    const unique = new Set<string>();
    for (const item of input) {
      if (typeof item !== 'string') continue;
      const trimmed = item.trim();
      if (!trimmed) continue;
      unique.add(trimmed.slice(0, 48));
      if (unique.size >= 12) break;
    }
    return Array.from(unique);
  }

  private normalizeSettings(input: unknown) {
    const base = { ...this.defaultProfileSettings };
    if (!input || typeof input !== 'object') return base;
    const settings = input as Record<string, any>;
    if (typeof settings.userBubble === 'string' && settings.userBubble.trim()) {
      base.userBubble = settings.userBubble.trim().slice(0, 32);
    }
    if (typeof settings.aiBubble === 'string' && settings.aiBubble.trim()) {
      base.aiBubble = settings.aiBubble.trim().slice(0, 32);
    }
    if (typeof settings.notifyEmail === 'boolean') base.notifyEmail = settings.notifyEmail;
    if (typeof settings.notifyProduct === 'boolean') base.notifyProduct = settings.notifyProduct;
    if (typeof settings.notifyWeekly === 'boolean') base.notifyWeekly = settings.notifyWeekly;
    if (typeof settings.darkMode === 'boolean') base.darkMode = settings.darkMode;
    if (settings.locale === 'en' || settings.locale === 'zh') base.locale = settings.locale;
    return base;
  }

  private normalizeIntegrations(input: unknown) {
    const base = { ...this.defaultIntegrations };
    if (!input || typeof input !== 'object') return base;
    const integrations = input as Record<string, any>;
    if (typeof integrations.notion === 'boolean') base.notion = integrations.notion;
    if (typeof integrations.drive === 'boolean') base.drive = integrations.drive;
    if (typeof integrations.feishu === 'boolean') base.feishu = integrations.feishu;
    if (typeof integrations.feishuOpenId === 'string') {
      base.feishuOpenId = integrations.feishuOpenId.trim().slice(0, 128);
    }
    return base;
  }

  private serializeUser(user: any) {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      credits: user.credits,
      isAdmin: user.isAdmin,
      avatarUrl: user.avatarUrl,
      bio: user.bio ?? '',
      interests: this.normalizeInterests(user.interests),
      settings: this.normalizeSettings(user.settings),
      integrations: this.normalizeIntegrations(user.integrations),
      createdAt: user.createdAt,
    };
  }

  private parseBooleanEnv(value: string | undefined): boolean | null {
    if (value == null) return null;
    const v = value.trim().toLowerCase();
    if (['1', 'true', 'yes', 'y', 'on'].includes(v)) return true;
    if (['0', 'false', 'no', 'n', 'off'].includes(v)) return false;
    return null;
  }

  private parseCsvEnv(value: string | undefined): string[] {
    if (!value) return [];
    return value
      .split(/[,\s]+/g)
      .map(v => v.trim())
      .filter(Boolean);
  }

  private async isInviteOnlyEnabled(): Promise<boolean> {
    const db = await this.prisma.appSetting.findUnique({
      where: { key: this.inviteOnlySettingKey },
      select: { value: true },
    });
    const dbValue = this.parseBooleanEnv(db?.value);
    if (dbValue != null) return dbValue;

    const configured = this.parseBooleanEnv(process.env.AUTH_INVITE_ONLY);
    if (configured != null) return configured;

    return process.env.NODE_ENV === 'production';
  }

  private isEmailAllowedByEnv(emailRaw: string): boolean {
    const email = emailRaw.trim().toLowerCase();
    const allowedEmails = new Set(this.parseCsvEnv(process.env.AUTH_ALLOWLIST_EMAILS).map(e => e.toLowerCase()));
    if (allowedEmails.has(email)) return true;

    const at = email.lastIndexOf('@');
    if (at === -1) return false;
    const domain = email.slice(at + 1);
    const allowedDomains = new Set(this.parseCsvEnv(process.env.AUTH_ALLOWLIST_DOMAINS).map(d => d.toLowerCase()));
    if (allowedDomains.has(domain)) return true;

    return false;
  }

  private async isEmailAllowedToSignup(emailRaw: string): Promise<boolean> {
    const email = emailRaw.trim().toLowerCase();
    if (this.isEmailAllowedByEnv(email)) return true;

    const row = await this.prisma.signupAllowlistEmail.findUnique({
      where: { email },
      select: { id: true },
    });

    return Boolean(row);
  }

  private async assertSignupAllowed(email: string) {
    if (!(await this.isInviteOnlyEnabled())) return;
    if (await this.isEmailAllowedToSignup(email)) return;
    throw new BadRequestException('Sign-ups are invite-only. Please ask the admin for access.');
  }

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
    email = email.trim().toLowerCase();
    name = name.trim();

    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new BadRequestException('Email already registered');
    }

    await this.assertSignupAllowed(email);

    const hash = await bcrypt.hash(password, 10);
    const user = await this.prisma.user.create({
      data: { email, name, password: hash },
    });

    const tokens = this.generateTokens(user.id);
    return {
      user: this.serializeUser(user),
      ...tokens,
    };
  }

  async login(email: string, password: string) {
    email = email.trim().toLowerCase();
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
      user: this.serializeUser(user),
      ...tokens,
    };
  }

  async googleLogin(firebaseToken: string) {
    if (!isFirebaseAuthConfigured()) {
      throw new ServiceUnavailableException('Google Sign-In is not configured on the server');
    }

    const token = firebaseToken.trim();
    if (!token) {
      throw new BadRequestException('Missing Google token');
    }

    const decoded = await verifyFirebaseToken(token);
    if (!decoded) {
      throw new UnauthorizedException('Invalid Google token');
    }

    const email = decoded.email.trim().toLowerCase();
    if (!email) {
      throw new BadRequestException('Google account email is not available for this user');
    }

    const name = decoded.name.trim() || email.split('@')[0] || 'Google User';

    let user = await this.prisma.user.findUnique({ where: { email } });

    if (!user) {
      await this.assertSignupAllowed(email);
      user = await this.prisma.user.create({
        data: {
          email,
          name,
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
      user: this.serializeUser(user),
      ...tokens,
    };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    return this.serializeUser(user);
  }

  async updateProfile(userId: string, payload: {
    name?: string;
    bio?: string;
    interests?: string[];
    settings?: Record<string, any>;
    integrations?: Record<string, any>;
  }) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const data: any = {};
    if (typeof payload.name === 'string') {
      const trimmed = payload.name.trim();
      if (trimmed) data.name = trimmed.slice(0, 128);
    }
    if (typeof payload.bio === 'string') {
      const trimmed = payload.bio.trim();
      data.bio = trimmed ? trimmed.slice(0, 500) : null;
    }
    if (payload.interests) {
      data.interests = this.normalizeInterests(payload.interests);
    }
    if (payload.settings) {
      data.settings = this.normalizeSettings({ ...this.normalizeSettings(user.settings), ...payload.settings });
    }
    if (payload.integrations) {
      data.integrations = this.normalizeIntegrations({ ...this.normalizeIntegrations(user.integrations), ...payload.integrations });
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data,
    });

    return this.serializeUser(updated);
  }
}
