import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AskService } from './ask.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('api/v1/ask')
@UseGuards(JwtAuthGuard)
export class AskController {
  constructor(private readonly askService: AskService) {}

  @Get('sessions')
  async getSessions(@CurrentUser() userId: string) {
    return this.askService.getSessions(userId);
  }

  @Post('sessions')
  async createSession(@CurrentUser() userId: string) {
    return this.askService.createSession(userId);
  }

  @Get('sessions/:id/messages')
  async getMessages(@Param('id') id: string, @CurrentUser() userId: string) {
    return this.askService.getMessages(id, userId);
  }

  @Patch('sessions/:id')
  async renameSession(
    @Param('id') id: string,
    @Body('title') title: string,
    @CurrentUser() userId: string,
  ) {
    if (!title?.trim()) throw new BadRequestException('Title is required');
    return this.askService.renameSession(id, userId, title);
  }

  @Delete('sessions/:id')
  async deleteSession(@Param('id') id: string, @CurrentUser() userId: string) {
    return this.askService.deleteSession(id, userId);
  }
}
