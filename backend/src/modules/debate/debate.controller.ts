import { BadRequestException, Body, Controller, Get, Param, Post, Query, Res, UnauthorizedException, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { DebateService } from './debate.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CreateDebateDto } from './dto/create-debate.dto';
import { AuthService } from '../auth/auth.service';

@Controller('api/v1/debate')
export class DebateController {
  constructor(
    private readonly debateService: DebateService,
    private readonly authService: AuthService,
  ) {}

  @Get('agents')
  @UseGuards(JwtAuthGuard)
  async listAgents() {
    return this.debateService.listAgents();
  }

  @Get('sessions')
  @UseGuards(JwtAuthGuard)
  async listSessions(@CurrentUser() userId: string) {
    return this.debateService.listSessions(userId);
  }

  @Post('sessions')
  @UseGuards(JwtAuthGuard)
  async createSession(@CurrentUser() userId: string, @Body() body: CreateDebateDto) {
    return this.debateService.createSession(userId, body);
  }

  @Get('sessions/:id')
  @UseGuards(JwtAuthGuard)
  async getSession(@Param('id') id: string, @CurrentUser() userId: string) {
    return this.debateService.getSession(id, userId);
  }

  @Get('sessions/:id/messages')
  @UseGuards(JwtAuthGuard)
  async getMessages(@Param('id') id: string, @CurrentUser() userId: string) {
    return this.debateService.getMessages(id, userId);
  }

  @Post('sessions/:id/start')
  @UseGuards(JwtAuthGuard)
  async startSession(@Param('id') id: string, @CurrentUser() userId: string) {
    return this.debateService.startSession(id, userId);
  }

  @Get('sessions/:id/stream')
  async streamSession(
    @Param('id') id: string,
    @Query('token') token: string,
    @Res() res: Response,
  ) {
    if (!token) {
      throw new BadRequestException('Missing token');
    }
    const userId = this.authService.getUserIdFromRequest({
      headers: { authorization: `Bearer ${token}` },
    });
    if (!userId) {
      throw new UnauthorizedException('Invalid token');
    }
    await this.debateService.openStream(id, userId, res);
  }
}
