import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ChatKitService } from './chatkit.service';

@Controller('api/v1/chatkit')
@UseGuards(JwtAuthGuard)
export class ChatKitController {
  constructor(private readonly chatKitService: ChatKitService) {}

  @Post('session')
  async createSession(@CurrentUser() userId: string) {
    return this.chatKitService.createSession(userId);
  }

  @Get('status')
  async getStatus() {
    return this.chatKitService.getStatus();
  }
}
