import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { IntegrationProvider as PrismaIntegrationProvider, Prisma } from '@prisma/client';
import * as jwt from 'jsonwebtoken';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';

export type IntegrationProvider = 'notion' | 'google-drive' | 'feishu';

type IntegrationState = {
  sub: string;
  provider: IntegrationProvider;
  type?: string;
};

type TokenExchangeResult = {
  accessToken: string;
  refreshToken?: string | null;
  tokenType?: string | null;
  scope?: string | null;
  expiresAt?: Date | null;
  metadata?: Prisma.InputJsonValue;
};

@Injectable()
export class IntegrationsService {
  constructor(
    private readonly authService: AuthService,
    private readonly prisma: PrismaService,
  ) {}

  private get jwtSecret(): string {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET is required');
    return secret;
  }

  private signState(userId: string, provider: IntegrationProvider) {
    return jwt.sign({ sub: userId, provider, type: 'integration' }, this.jwtSecret, { expiresIn: '15m' });
  }

  private verifyState(token: string): IntegrationState | null {
    try {
      const decoded = jwt.verify(token, this.jwtSecret) as IntegrationState;
      if (!decoded?.sub || !decoded?.provider) return null;
      if (decoded.type && decoded.type !== 'integration') return null;
      return decoded;
    } catch {
      return null;
    }
  }

  private buildUrl(base: string, params: Record<string, string>) {
    const url = new URL(base);
    Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
    return url.toString();
  }

  private parseScopes(value: string | undefined): string[] {
    if (!value) return [];
    return value
      .split(/[,\s]+/g)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  private toPrismaProvider(provider: IntegrationProvider): PrismaIntegrationProvider {
    switch (provider) {
      case 'notion':
        return PrismaIntegrationProvider.NOTION;
      case 'google-drive':
        return PrismaIntegrationProvider.GOOGLE_DRIVE;
      case 'feishu':
        return PrismaIntegrationProvider.FEISHU;
      default:
        throw new BadRequestException('Unsupported integration provider');
    }
  }

  getAuthUrl(provider: IntegrationProvider, userId: string) {
    switch (provider) {
      case 'notion':
        return this.getNotionAuthUrl(userId);
      case 'google-drive':
        return this.getGoogleDriveAuthUrl(userId);
      case 'feishu':
        throw new BadRequestException('Feishu OAuth is not supported. Use Open ID binding.');
      default:
        throw new BadRequestException('Unsupported integration provider');
    }
  }

  private getNotionAuthUrl(userId: string) {
    const clientId = process.env.NOTION_CLIENT_ID?.trim();
    const redirectUri = process.env.NOTION_REDIRECT_URI?.trim();
    if (!clientId || !redirectUri) {
      throw new ServiceUnavailableException('Notion integration is not configured');
    }
    const base = process.env.NOTION_AUTH_URL?.trim() || 'https://api.notion.com/v1/oauth/authorize';
    const state = this.signState(userId, 'notion');
    return this.buildUrl(base, {
      client_id: clientId,
      response_type: 'code',
      owner: 'user',
      redirect_uri: redirectUri,
      state,
    });
  }

  private getGoogleDriveAuthUrl(userId: string) {
    const clientId = process.env.GOOGLE_DRIVE_CLIENT_ID?.trim();
    const redirectUri = process.env.GOOGLE_DRIVE_REDIRECT_URI?.trim();
    if (!clientId || !redirectUri) {
      throw new ServiceUnavailableException('Google Drive integration is not configured');
    }
    const base = process.env.GOOGLE_DRIVE_AUTH_URL?.trim() || 'https://accounts.google.com/o/oauth2/v2/auth';
    const state = this.signState(userId, 'google-drive');
    const scopes = this.parseScopes(process.env.GOOGLE_DRIVE_SCOPES);
    const scopeValue = scopes.length > 0 ? scopes.join(' ') : 'https://www.googleapis.com/auth/drive.readonly';
    return this.buildUrl(base, {
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      access_type: 'offline',
      prompt: 'consent',
      scope: scopeValue,
      state,
    });
  }

  private getFeishuAuthUrl(userId: string) {
    const appId = process.env.FEISHU_APP_ID?.trim();
    const redirectUri = process.env.FEISHU_REDIRECT_URI?.trim();
    if (!appId || !redirectUri) {
      throw new ServiceUnavailableException('Feishu integration is not configured');
    }
    const base = process.env.FEISHU_AUTH_URL?.trim() || 'https://open.feishu.cn/open-apis/authen/v1/index';
    const state = this.signState(userId, 'feishu');
    return this.buildUrl(base, {
      app_id: appId,
      redirect_uri: redirectUri,
      state,
    });
  }

  private getNotionSecret() {
    const secret = process.env.NOTION_CLIENT_SECRET?.trim();
    if (!secret) throw new ServiceUnavailableException('Notion integration is missing client secret');
    return secret;
  }

  private getGoogleDriveSecret() {
    const secret = process.env.GOOGLE_DRIVE_CLIENT_SECRET?.trim();
    if (!secret) throw new ServiceUnavailableException('Google Drive integration is missing client secret');
    return secret;
  }

  private async exchangeNotionCode(code: string): Promise<TokenExchangeResult> {
    const clientId = process.env.NOTION_CLIENT_ID?.trim();
    const redirectUri = process.env.NOTION_REDIRECT_URI?.trim();
    if (!clientId || !redirectUri) throw new ServiceUnavailableException('Notion integration is not configured');
    const clientSecret = this.getNotionSecret();
    const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const res = await fetch('https://api.notion.com/v1/oauth/token', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basic}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
      }),
    });
    const data = (await res.json()) as Record<string, any>;
    if (!res.ok) {
      const message = typeof data?.error === 'string' ? data.error : 'Notion token exchange failed';
      throw new BadRequestException(message);
    }
    const accessToken = String(data.access_token || '');
    if (!accessToken) throw new BadRequestException('Notion token exchange failed');
    const metadata: Prisma.InputJsonValue = {
      workspaceId: data.workspace_id,
      workspaceName: data.workspace_name,
      botId: data.bot_id,
      owner: data.owner,
    };
    return {
      accessToken,
      tokenType: typeof data.token_type === 'string' ? data.token_type : null,
      scope: typeof data.scope === 'string' ? data.scope : null,
      metadata,
    };
  }

  private async exchangeGoogleDriveCode(code: string): Promise<TokenExchangeResult> {
    const clientId = process.env.GOOGLE_DRIVE_CLIENT_ID?.trim();
    const redirectUri = process.env.GOOGLE_DRIVE_REDIRECT_URI?.trim();
    if (!clientId || !redirectUri) throw new ServiceUnavailableException('Google Drive integration is not configured');
    const clientSecret = this.getGoogleDriveSecret();
    const body = new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    });
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });
    const data = (await res.json()) as Record<string, any>;
    if (!res.ok) {
      const message = typeof data?.error === 'string' ? data.error : 'Google token exchange failed';
      throw new BadRequestException(message);
    }
    const accessToken = String(data.access_token || '');
    if (!accessToken) throw new BadRequestException('Google token exchange failed');
    const expiresAt = typeof data.expires_in === 'number'
      ? new Date(Date.now() + data.expires_in * 1000)
      : null;
    return {
      accessToken,
      refreshToken: typeof data.refresh_token === 'string' ? data.refresh_token : null,
      tokenType: typeof data.token_type === 'string' ? data.token_type : null,
      scope: typeof data.scope === 'string' ? data.scope : null,
      expiresAt,
    };
  }

  private async exchangeCode(provider: IntegrationProvider, code: string): Promise<TokenExchangeResult> {
    if (provider === 'notion') return this.exchangeNotionCode(code);
    if (provider === 'google-drive') return this.exchangeGoogleDriveCode(code);
    throw new BadRequestException('Feishu OAuth is not supported in this flow');
  }

  private async upsertConnection(userId: string, provider: IntegrationProvider, tokens: TokenExchangeResult) {
    const prismaProvider = this.toPrismaProvider(provider);
    return this.prisma.integrationConnection.upsert({
      where: { userId_provider: { userId, provider: prismaProvider } },
      create: {
        userId,
        provider: prismaProvider,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken ?? null,
        tokenType: tokens.tokenType ?? null,
        scope: tokens.scope ?? null,
        expiresAt: tokens.expiresAt ?? null,
        metadata: tokens.metadata ?? null,
        connectedAt: new Date(),
        revokedAt: null,
      },
      update: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken ?? null,
        tokenType: tokens.tokenType ?? null,
        scope: tokens.scope ?? null,
        expiresAt: tokens.expiresAt ?? null,
        metadata: tokens.metadata ?? null,
        connectedAt: new Date(),
        revokedAt: null,
      },
    });
  }

  private async clearConnection(userId: string, provider: IntegrationProvider) {
    const prismaProvider = this.toPrismaProvider(provider);
    await this.prisma.integrationConnection.deleteMany({
      where: { userId, provider: prismaProvider },
    });
  }

  async bindFeishuOpenId(userId: string, openId: string) {
    return this.authService.updateProfile(userId, {
      integrations: { feishuOpenId: openId, feishu: true },
    });
  }

  async disconnect(provider: IntegrationProvider, userId: string) {
    if (provider === 'feishu') {
      return this.authService.updateProfile(userId, {
        integrations: { feishu: false, feishuOpenId: '' },
      });
    }
    await this.clearConnection(userId, provider);
    const integrations: Record<string, boolean> = {};
    if (provider === 'notion') integrations.notion = false;
    if (provider === 'google-drive') integrations.drive = false;
    return this.authService.updateProfile(userId, { integrations });
  }

  private buildSuccessRedirect(provider: IntegrationProvider) {
    const base = process.env.INTEGRATIONS_SUCCESS_REDIRECT?.trim();
    const fallback = `/profile?tab=integrations&connected=${provider}`;
    if (!base) return fallback;
    try {
      const url = new URL(base);
      url.searchParams.set('tab', 'integrations');
      url.searchParams.set('connected', provider);
      return url.toString();
    } catch {
      return fallback;
    }
  }

  private buildErrorRedirect(provider: IntegrationProvider, message: string) {
    const base = process.env.INTEGRATIONS_SUCCESS_REDIRECT?.trim();
    const fallback = `/profile?tab=integrations&error=${encodeURIComponent(message)}&provider=${provider}`;
    if (!base) return fallback;
    try {
      const url = new URL(base);
      url.searchParams.set('tab', 'integrations');
      url.searchParams.set('provider', provider);
      url.searchParams.set('error', message);
      return url.toString();
    } catch {
      return fallback;
    }
  }

  async handleCallback(
    provider: IntegrationProvider,
    query: { code?: string; state?: string; error?: string },
  ) {
    try {
      if (provider === 'feishu') {
        return this.buildErrorRedirect(provider, 'Feishu OAuth is not supported. Use Open ID binding.');
      }
      if (query.error) {
        throw new BadRequestException(query.error);
      }
      if (!query.state) {
        throw new BadRequestException('Missing OAuth state');
      }
      const decoded = this.verifyState(query.state);
      if (!decoded || decoded.provider !== provider) {
        throw new BadRequestException('Invalid OAuth state');
      }
      if (!query.code) {
        throw new BadRequestException('Missing OAuth code');
      }

      const tokens = await this.exchangeCode(provider, query.code);
      await this.upsertConnection(decoded.sub, provider, tokens);

      const integrations: Record<string, boolean> = {};
      if (provider === 'notion') integrations.notion = true;
      if (provider === 'google-drive') integrations.drive = true;

      await this.authService.updateProfile(decoded.sub, { integrations });

      return this.buildSuccessRedirect(provider);
    } catch (error: any) {
      const message = error?.message || 'Integration failed';
      return this.buildErrorRedirect(provider, message);
    }
  }
}
