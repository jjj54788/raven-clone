import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../../modules/auth/auth.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const userId = this.authService.getUserIdFromRequest(request);
    if (!userId) {
      throw new UnauthorizedException('Invalid or missing token');
    }
    request.userId = userId;
    return true;
  }
}
