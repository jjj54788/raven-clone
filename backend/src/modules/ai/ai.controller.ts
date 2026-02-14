import { Controller, Get, Post, Body, Req, Res } from '@nestjs/common';
import { Response } from 'express';
import { AiService } from './ai.service';
import { AuthService } from '../auth/auth.service';

@Controller('api/v1/ai')
export class AiController {
  constructor(
    private readonly aiService: AiService,
    private readonly authService: AuthService,
  ) {}

  @Get('models')
  getModels() {
    return this.aiService.getModels();
  }

  @Post('simple-chat')
  async simpleChat(
    @Body() body: {
      message: string;
      messages?: Array<{ role: string; content: string }>;
      model?: string;
      sessionId?: string;
    },
    @Req() req: any,
  ) {
    const defaultModel = this.aiService.getDefaultModel();
    if (!defaultModel) {
      return {
        content: 'Error: No AI API Key configured. Add keys to backend/.env',
        model: 'none',
        provider: 'none',
      };
    }

    const selectedModel = body.model
      ? this.aiService.getModelById(body.model) || defaultModel
      : defaultModel;

    // Build message history
    const msgs: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: 'You are Raven AI, a helpful assistant. Reply in the same language as the user.' },
    ];

    // Load history from database if session exists
    if (body.sessionId) {
      const userId = this.authService.getUserIdFromRequest(req);
      if (userId) {
        const history = await this.aiService.loadSessionHistory(body.sessionId);
        msgs.push(...history);
      }
    } else if (body.messages) {
      for (const m of body.messages) {
        msgs.push({ role: m.role as 'system' | 'user' | 'assistant', content: m.content });
      }
    }

    msgs.push({ role: 'user', content: body.message });

    try {
      const content = await this.aiService.chat(selectedModel, msgs);

      // Save messages to database if session exists
      if (body.sessionId) {
        const userId = this.authService.getUserIdFromRequest(req);
        if (userId) {
          await this.aiService.saveMessages(body.sessionId, body.message, content, selectedModel.id);
        }
      }

      return { content, model: selectedModel.id, provider: selectedModel.provider };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return {
        content: `AI Error (${selectedModel.provider} ${selectedModel.name}): ${message}`,
        model: selectedModel.id,
        provider: selectedModel.provider,
      };
    }
  }

  /**
   * SSE streaming chat endpoint
   */
  @Post('stream-chat')
  async streamChat(
    @Body() body: {
      message: string;
      model?: string;
      sessionId?: string;
    },
    @Req() req: any,
    @Res() res: Response,
  ) {
    const defaultModel = this.aiService.getDefaultModel();
    if (!defaultModel) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders();
      res.write(`data: ${JSON.stringify({ error: 'No AI API Key configured', done: true })}\n\n`);
      res.end();
      return;
    }

    const selectedModel = body.model
      ? this.aiService.getModelById(body.model) || defaultModel
      : defaultModel;

    // Build message history
    const msgs: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: 'You are Raven AI, a helpful assistant. Reply in the same language as the user.' },
    ];

    if (body.sessionId) {
      const userId = this.authService.getUserIdFromRequest(req);
      if (userId) {
        const history = await this.aiService.loadSessionHistory(body.sessionId);
        msgs.push(...history);
      }
    }

    msgs.push({ role: 'user', content: body.message });

    try {
      const fullContent = await this.aiService.chatStream(selectedModel, msgs, res);

      // Save messages to database if session exists
      if (body.sessionId) {
        const userId = this.authService.getUserIdFromRequest(req);
        if (userId) {
          await this.aiService.saveMessages(body.sessionId, body.message, fullContent, selectedModel.id);
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      if (!res.headersSent) {
        res.setHeader('Content-Type', 'text/event-stream');
        res.flushHeaders();
      }
      res.write(`data: ${JSON.stringify({ error: message, done: true })}\n\n`);
      res.end();
    }
  }
}
