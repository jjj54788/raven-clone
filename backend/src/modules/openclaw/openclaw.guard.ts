import { CanActivate, ExecutionContext, Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';

@Injectable()
export class OpenClawKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const expected = process.env.OPENCLAW_BRIDGE_KEY?.trim();
    if (!expected) {
      throw new ServiceUnavailableException('OpenClaw bridge key is not configured');
    }

    const req = context.switchToHttp().getRequest<Request>();
    const headerKey = (req.headers['x-openclaw-key'] as string | undefined)?.trim();
    const auth = req.headers.authorization?.trim();
    const bearer = auth?.startsWith('Bearer ') ? auth.slice(7).trim() : undefined;
    const provided = headerKey || bearer;

    if (!provided || provided !== expected) {
      throw new UnauthorizedException('Invalid OpenClaw key');
    }

    return true;
  }
}
