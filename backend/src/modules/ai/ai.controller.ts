import { Controller, Get, Post, Body, Req, Res } from '@nestjs/common';
import { Response } from 'express';
import { tavily } from '@tavily/core';
import { AiService } from './ai.service';
import { AuthService } from '../auth/auth.service';

const DEFAULT_SYSTEM_PROMPT = 'You are Raven AI, a helpful assistant. Reply in the same language as the user.';

function buildWebSearchPrompt(searchResults: string): string {
  return `You are Raven AI, a helpful assistant with web search capabilities. You have just performed a web search and obtained the following results:

<search_results>
${searchResults}
</search_results>

Instructions:
1. Answer the user's question based on the search results above.
2. Use markdown formatting: headers, bullet points, and bold for key terms.
3. Cite sources using [Source Title](URL) format when referencing specific information.
4. If the search results don't fully answer the question, say so and provide what you can.
5. Reply in the same language as the user.`;
}

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

    // Web search if enabled
    let systemPrompt = DEFAULT_SYSTEM_PROMPT;
    if (body.webSearch) {
      const searchResults = await this.performWebSearch(body.message);
      systemPrompt = buildWebSearchPrompt(searchResults);
    }

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

    // Web search if enabled
    let systemPrompt = DEFAULT_SYSTEM_PROMPT;
    if (body.webSearch) {
      console.log(`[stream-chat] Performing web search for: "${body.message.slice(0, 50)}"`);
      const searchResults = await this.performWebSearch(body.message);
      systemPrompt = buildWebSearchPrompt(searchResults);
      console.log(`[stream-chat] Web search complete, results length: ${searchResults.length}`);
    }

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

  /**
   * Perform web search using Tavily API
   */
  private async performWebSearch(query: string): Promise<string> {
    const apiKey = process.env.TAVILY_API_KEY;
    if (!apiKey) {
      console.warn('[webSearch] TAVILY_API_KEY not configured, returning fallback');
      return 'Web search is not available. TAVILY_API_KEY is not configured in backend/.env';
    }

    try {
      const tvly = tavily({ apiKey });
      const response = await tvly.search(query, {
        maxResults: 5,
        searchDepth: 'basic',
      });

      const results = response.results.map((r, i) =>
        `[${i + 1}] ${r.title}\nURL: ${r.url}\nContent: ${r.content}`
      ).join('\n\n');

      return results || 'No search results found.';
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.error('[webSearch] Tavily search failed:', message);
      return `Web search failed: ${message}`;
    }
  }
}
