import { Controller, Get, Post, Body, Res, UseGuards, ServiceUnavailableException } from '@nestjs/common';
import { Response } from 'express';
import { tavily } from '@tavily/core';
import { AiService } from './ai.service';
import { SimpleChatDto } from './dto/simple-chat.dto';
import { StreamChatDto } from './dto/stream-chat.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AiUsageService } from './ai-usage.service';

const AI_DEBUG = process.env.AI_DEBUG === '1';
function debugLog(...args: unknown[]) {
  if (AI_DEBUG) console.log(...args);
}

function getCurrentDate(): string {
  return new Date().toISOString().split('T')[0]; // e.g. "2026-02-14"
}

function getDefaultSystemPrompt(): string {
  return `You are Raven AI, a helpful assistant. Today's date is ${getCurrentDate()}. Reply in the same language as the user.`;
}

function buildWebSearchPrompt(searchResults: string): string {
  return `You are Raven AI, a helpful assistant with web search capabilities. Today's date is ${getCurrentDate()}.

You have just performed a web search and obtained the following results:

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
    private readonly aiUsageService: AiUsageService,
  ) {
    // Log Tavily status on startup
    if (process.env.TAVILY_API_KEY) {
      console.log('[AI] Tavily Web Search: ENABLED');
    } else {
      console.warn('[AI] Tavily Web Search: DISABLED (TAVILY_API_KEY not set in .env)');
    }
  }

  @Get('models')
  getModels() {
    return this.aiService.getModels();
  }

  @Post('simple-chat')
  @UseGuards(JwtAuthGuard)
  async simpleChat(
    @Body() body: SimpleChatDto,
    @CurrentUser() userId: string,
  ) {
    const apiKey = body.apiKey?.trim();
    const provider = body.provider?.trim();
    const defaultModel = this.aiService.getDefaultModel();
    let selectedModel = body.model ? this.aiService.getModelById(body.model) : undefined;

    if (!selectedModel && apiKey) {
      selectedModel = this.aiService.buildUserModel({ modelId: body.model, provider, apiKey }) || defaultModel;
    }

    if (!selectedModel) {
      throw new ServiceUnavailableException('No AI API Key configured. Add keys to backend/.env or provide your own API key.');
    }

    this.aiUsageService.assertChatRateLimit(userId, { webSearch: body.webSearch });

    const history = body.sessionId
      ? await this.aiService.loadSessionHistory(body.sessionId, userId)
      : null;

    const useOwnKey = !!apiKey;
    const cost = useOwnKey ? 0 : this.aiUsageService.getChatCreditCost({ webSearch: body.webSearch });
    const creditsRemaining = cost > 0 ? await this.aiUsageService.consumeCreditsOrThrow(userId, cost) : null;

    // Web search if enabled
    let systemPrompt = getDefaultSystemPrompt();
    if (body.webSearch) {
      const searchResults = await this.performWebSearch(body.message);
      systemPrompt = buildWebSearchPrompt(searchResults);
    }

    // Build message history
    const msgs: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: systemPrompt },
    ];

    if (history) {
      msgs.push(...history);
    } else if (body.messages) {
      for (const m of body.messages) {
        msgs.push({ role: m.role, content: m.content });
      }
    }

    msgs.push({ role: 'user', content: body.message });

    const content = await this.aiService.chat(selectedModel, msgs, apiKey);

    // Save messages to database if session exists
    if (body.sessionId) {
      try {
        await this.aiService.saveMessages(body.sessionId, userId, body.message, content, selectedModel.id);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        console.warn('[simple-chat] Failed to save messages:', message);
      }
    }

    return { content, model: selectedModel.id, provider: selectedModel.provider, creditsRemaining };
  }

  /**
   * SSE streaming chat endpoint
   */
  @Post('stream-chat')
  @UseGuards(JwtAuthGuard)
  async streamChat(
    @Body() body: StreamChatDto,
    @CurrentUser() userId: string,
    @Res() res: Response,
  ) {
    debugLog(
      `[stream-chat] Received`,
      JSON.stringify({
        messagePreview: body.message?.slice(0, 30),
        model: body.model,
        sessionId: body.sessionId,
        webSearch: body.webSearch,
      }),
    );

    const apiKey = body.apiKey?.trim();
    const provider = body.provider?.trim();
    const defaultModel = this.aiService.getDefaultModel();
    let selectedModel = body.model ? this.aiService.getModelById(body.model) : undefined;

    if (!selectedModel && apiKey) {
      selectedModel = this.aiService.buildUserModel({ modelId: body.model, provider, apiKey }) || defaultModel;
    }

    if (!selectedModel) {
      throw new ServiceUnavailableException('No AI API Key configured. Add keys to backend/.env or provide your own API key.');
    }

    this.aiUsageService.assertChatRateLimit(userId, { webSearch: body.webSearch });
    const release = this.aiUsageService.reserveStreamSlot(userId);

    let released = false;
    const releaseOnce = () => {
      if (released) return;
      released = true;
      release();
    };

    res.on('close', releaseOnce);
    res.on('finish', releaseOnce);

    try {
      const history = body.sessionId
        ? await this.aiService.loadSessionHistory(body.sessionId, userId)
        : null;

      const useOwnKey = !!apiKey;
      const cost = useOwnKey ? 0 : this.aiUsageService.getChatCreditCost({ webSearch: body.webSearch });
      if (cost > 0) {
        await this.aiUsageService.consumeCreditsOrThrow(userId, cost);
      }

    // Web search if enabled
    let systemPrompt = getDefaultSystemPrompt();
    if (body.webSearch) {
      debugLog(`[stream-chat] Performing web search`);
      const searchResults = await this.performWebSearch(body.message);
      systemPrompt = buildWebSearchPrompt(searchResults);
      debugLog(`[stream-chat] Web search complete, results length: ${searchResults.length}`);
    }

    // Build message history
    const msgs: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: systemPrompt },
    ];

    if (history) {
      debugLog(`[stream-chat] Loaded ${history.length} history messages`);
      msgs.push(...history);
    }

    msgs.push({ role: 'user', content: body.message });

    // Always respond as SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    try {
      const fullContent = await this.aiService.chatStream(selectedModel, msgs, res, apiKey);
      debugLog(`[stream-chat] Stream complete, content length: ${fullContent.length}`);

      // Save messages to database if session exists
      if (body.sessionId) {
        debugLog(`[stream-chat] Saving messages to session ${body.sessionId}`);
        try {
          await this.aiService.saveMessages(body.sessionId, userId, body.message, fullContent, selectedModel.id);
          debugLog(`[stream-chat] Messages saved successfully`);
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Unknown error';
          console.warn(`[stream-chat] Failed to save messages: ${message}`);
        }
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
    } finally {
      releaseOnce();
    }
  }

  /**
   * Perform web search using Tavily API
   */
  private async performWebSearch(query: string): Promise<string> {
    const apiKey = process.env.TAVILY_API_KEY;
    debugLog(`[webSearch] API key present: ${!!apiKey}`);

    if (!apiKey) {
      console.warn('[webSearch] TAVILY_API_KEY not configured');
      return 'Web search is not available. TAVILY_API_KEY is not configured in backend/.env';
    }

    try {
      debugLog(`[webSearch] Searching Tavily`);
      const tvly = tavily({ apiKey });
      const response = await tvly.search(query, {
        maxResults: 5,
        searchDepth: 'basic',
      });

      debugLog(`[webSearch] Got ${response.results?.length || 0} results`);

      if (!response.results || response.results.length === 0) {
        debugLog('[webSearch] No results returned');
        return 'No search results found.';
      }

      const results = response.results.map((r, i) => (
        `[${i + 1}] ${r.title}\nURL: ${r.url}\nContent: ${r.content}`
      )).join('\n\n');

      debugLog(`[webSearch] Final results length: ${results.length} chars`);
      return results;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.error('[webSearch] Tavily search failed:', message);
      debugLog('[webSearch] Full error:', err);
      return `Web search failed: ${message}`;
    }
  }
}
