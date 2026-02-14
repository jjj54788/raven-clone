import { Controller, Get, Post, Body, Req, Res } from '@nestjs/common';
import { Response } from 'express';
import { AiService } from './ai.service';
import { AuthService } from '../auth/auth.service';

const DEFAULT_SYSTEM_PROMPT = 'You are Raven AI, a helpful assistant. Reply in the same language as the user.';

const WEB_SEARCH_SYSTEM_PROMPT = `You are Raven AI, a helpful assistant with web search capabilities. When answering:
1. Act as if you have access to real-time web search results.
2. Present information in a well-structured format with sources.
3. Use markdown formatting: headers, bullet points, and bold for key terms.
4. Include "[Source: ...]" references to make responses look like they include web citations.
5. Provide up-to-date, comprehensive answers as if you searched the web.
6. Reply in the same language as the user.`;

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
      webSearch?: boolean;
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

    const systemPrompt = body.webSearch ? WEB_SEARCH_SYSTEM_PROMPT : DEFAULT_SYSTEM_PROMPT;

    // Build message history
    const msgs: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: systemPrompt },
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
      webSearch?: boolean;
    },
    @Req() req: any,
    @Res() res: Response,
  ) {
    console.log(`[stream-chat] Received: message="${body.message?.slice(0, 30)}", model=${body.model}, sessionId=${body.sessionId}, webSearch=${body.webSearch}`);

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

    const systemPrompt = body.webSearch ? WEB_SEARCH_SYSTEM_PROMPT : DEFAULT_SYSTEM_PROMPT;

    // Build message history
    const msgs: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: systemPrompt },
    ];

    if (body.sessionId) {
      const userId = this.authService.getUserIdFromRequest(req);
      console.log(`[stream-chat] userId from token: ${userId}`);
      if (userId) {
        const history = await this.aiService.loadSessionHistory(body.sessionId);
        console.log(`[stream-chat] Loaded ${history.length} history messages`);
        msgs.push(...history);
      }
    }

    msgs.push({ role: 'user', content: body.message });

    try {
      const fullContent = await this.aiService.chatStream(selectedModel, msgs, res);
      console.log(`[stream-chat] Stream complete, content length: ${fullContent.length}`);

      // Save messages to database if session exists
      if (body.sessionId) {
        const userId = this.authService.getUserIdFromRequest(req);
        if (userId) {
          console.log(`[stream-chat] Saving messages to session ${body.sessionId}`);
          await this.aiService.saveMessages(body.sessionId, body.message, fullContent, selectedModel.id);
          console.log(`[stream-chat] Messages saved successfully`);
        } else {
          console.log(`[stream-chat] No userId, skipping save`);
        }
      } else {
        console.log(`[stream-chat] No sessionId, skipping save`);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.error(`[stream-chat] Error:`, message);
      if (!res.headersSent) {
        res.setHeader('Content-Type', 'text/event-stream');
        res.flushHeaders();
      }
      res.write(`data: ${JSON.stringify({ error: message, done: true })}\n\n`);
      res.end();
    }
  }
}
