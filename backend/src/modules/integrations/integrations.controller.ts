import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Query, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { IntegrationsService, IntegrationProvider } from './integrations.service';
import { FeishuOpenIdDto } from './dto/feishu-open-id.dto';

@Controller('api/v1/integrations')
export class IntegrationsController {
  constructor(private readonly integrationsService: IntegrationsService) {}

  @Get(':provider/auth-url')
  @UseGuards(JwtAuthGuard)
  async getAuthUrl(@Param('provider') provider: IntegrationProvider, @CurrentUser() userId: string) {
    return { url: this.integrationsService.getAuthUrl(provider, userId) };
  }

  @Patch('feishu/open-id')
  @UseGuards(JwtAuthGuard)
  async bindFeishuOpenId(@CurrentUser() userId: string, @Body() body: FeishuOpenIdDto) {
    const openId = body.openId.trim();
    if (!openId) {
      throw new BadRequestException('Feishu Open ID is required');
    }
    return this.integrationsService.bindFeishuOpenId(userId, openId);
  }

  @Delete(':provider')
  @UseGuards(JwtAuthGuard)
  async disconnect(@Param('provider') provider: IntegrationProvider, @CurrentUser() userId: string) {
    return this.integrationsService.disconnect(provider, userId);
  }

  @Get('callback/:provider')
  async handleCallback(
    @Param('provider') provider: IntegrationProvider,
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Query('error') error: string | undefined,
    @Res() res: Response,
  ) {
    const redirectUrl = await this.integrationsService.handleCallback(provider, { code, state, error });
    return res.redirect(redirectUrl);
  }
}
