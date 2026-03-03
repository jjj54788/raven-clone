import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import OpenAI from 'openai';
import { PrismaService } from '../prisma/prisma.service';
import { Response } from 'express';

const AI_DEBUG = process.env.AI_DEBUG === '1';

export interface ModelConfig {
  id: string;
  name: string;
  provider: string;
  client: OpenAI | 'gemini' | 'anthropic';
  modelId: string;
}

@Injectable()
export class AiService implements OnModuleInit {
  private readonly models: ModelConfig[] = [];
  private readonly providerDefaultModels: Record<string, string> = {
    openai: 'gpt-4.1-mini',
    deepseek: 'deepseek-chat',
    google: 'gemini-2.5-flash',
    gemini: 'gemini-2.5-flash',
    groq: 'llama-3.3-70b-versatile',
    qwen: 'qwen-plus',
    anthropic: 'claude-sonnet-4-6',
    xai: 'grok-3-mini',
    zhipu: 'glm-4-plus',
    moonshot: 'moonshot-v1-128k',
    yi: 'yi-large',
    stepfun: 'step-2-16k',
  };

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit() {
    this.registerModels();
  }

  private registerModels() {
    this.models.length = 0;

    if (process.env.OPENAI_API_KEY) {
      const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      this.models.push(
        { id: 'gpt-4.1', name: 'GPT 4.1', provider: 'OpenAI', client, modelId: 'gpt-4.1' },
        { id: 'gpt-4.1-mini', name: 'GPT 4.1 Mini', provider: 'OpenAI', client, modelId: 'gpt-4.1-mini' },
        { id: 'gpt-4.1-nano', name: 'GPT 4.1 Nano', provider: 'OpenAI', client, modelId: 'gpt-4.1-nano' },
        { id: 'gpt-4o', name: 'GPT 4o', provider: 'OpenAI', client, modelId: 'gpt-4o' },
        { id: 'gpt-4o-mini', name: 'GPT 4o Mini', provider: 'OpenAI', client, modelId: 'gpt-4o-mini' },
        { id: 'o3-mini', name: 'o3 Mini', provider: 'OpenAI', client, modelId: 'o3-mini' },
      );
    }

    if (process.env.DEEPSEEK_API_KEY) {
      const client = new OpenAI({ apiKey: process.env.DEEPSEEK_API_KEY, baseURL: 'https://api.deepseek.com/v1' });
      this.models.push(
        { id: 'deepseek-chat', name: 'DeepSeek V3', provider: 'DeepSeek', client, modelId: 'deepseek-chat' },
        { id: 'deepseek-reasoner', name: 'DeepSeek R1', provider: 'DeepSeek', client, modelId: 'deepseek-reasoner' },
      );
    }

    if (process.env.GOOGLE_AI_API_KEY) {
      this.models.push(
        { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', provider: 'Google', client: 'gemini', modelId: 'gemini-2.5-pro' },
        { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', provider: 'Google', client: 'gemini', modelId: 'gemini-2.5-flash' },
      );
    }

    if (process.env.GROQ_API_KEY) {
      const client = new OpenAI({ apiKey: process.env.GROQ_API_KEY, baseURL: 'https://api.groq.com/openai/v1' });
      this.models.push(
        { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B', provider: 'Groq', client, modelId: 'llama-3.3-70b-versatile' },
        { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B', provider: 'Groq', client, modelId: 'llama-3.1-8b-instant' },
      );
    }

    if (process.env.QWEN_API_KEY) {
      const client = new OpenAI({ apiKey: process.env.QWEN_API_KEY, baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1' });
      this.models.push(
        { id: 'qwen-max', name: 'Qwen Max', provider: 'Qwen', client, modelId: 'qwen-max' },
        { id: 'qwen-plus', name: 'Qwen Plus', provider: 'Qwen', client, modelId: 'qwen-plus' },
        { id: 'qwen-turbo', name: 'Qwen Turbo', provider: 'Qwen', client, modelId: 'qwen-turbo' },
      );
    }

    if (process.env.ANTHROPIC_API_KEY) {
      this.models.push(
        { id: 'claude-opus-4-6', name: 'Claude Opus 4.6', provider: 'Anthropic', client: 'anthropic', modelId: 'claude-opus-4-6' },
        { id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6', provider: 'Anthropic', client: 'anthropic', modelId: 'claude-sonnet-4-6' },
        { id: 'claude-haiku-4-5', name: 'Claude Haiku 4.5', provider: 'Anthropic', client: 'anthropic', modelId: 'claude-haiku-4-5-20251001' },
      );
    }

    // ---- Chinese AI Providers ----

    if (process.env.ZHIPU_API_KEY) {
      const client = new OpenAI({ apiKey: process.env.ZHIPU_API_KEY, baseURL: 'https://open.bigmodel.cn/api/paas/v4' });
      this.models.push(
        { id: 'glm-4-plus', name: 'GLM-4 Plus', provider: 'Zhipu', client, modelId: 'glm-4-plus' },
        { id: 'glm-4-flash', name: 'GLM-4 Flash', provider: 'Zhipu', client, modelId: 'glm-4-flash' },
      );
    }

    if (process.env.MOONSHOT_API_KEY) {
      const client = new OpenAI({ apiKey: process.env.MOONSHOT_API_KEY, baseURL: 'https://api.moonshot.cn/v1' });
      this.models.push(
        { id: 'moonshot-v1-128k', name: 'Kimi 128K', provider: 'Moonshot', client, modelId: 'moonshot-v1-128k' },
        { id: 'moonshot-v1-32k', name: 'Kimi 32K', provider: 'Moonshot', client, modelId: 'moonshot-v1-32k' },
      );
    }

    if (process.env.YI_API_KEY) {
      const client = new OpenAI({ apiKey: process.env.YI_API_KEY, baseURL: 'https://api.lingyiwanwu.com/v1' });
      this.models.push(
        { id: 'yi-large', name: 'Yi Large', provider: 'Yi', client, modelId: 'yi-large' },
        { id: 'yi-medium', name: 'Yi Medium', provider: 'Yi', client, modelId: 'yi-medium' },
      );
    }

    if (process.env.STEPFUN_API_KEY) {
      const client = new OpenAI({ apiKey: process.env.STEPFUN_API_KEY, baseURL: 'https://api.stepfun.com/v1' });
      this.models.push(
        { id: 'step-2-16k', name: 'Step-2 16K', provider: 'Stepfun', client, modelId: 'step-2-16k' },
        { id: 'step-1-8k', name: 'Step-1 8K', provider: 'Stepfun', client, modelId: 'step-1-8k' },
      );
    }

    if (process.env.DOUBAO_API_KEY) {
      const client = new OpenAI({ apiKey: process.env.DOUBAO_API_KEY, baseURL: 'https://ark.cn-beijing.volces.com/api/v3' });
      this.models.push(
        { id: 'doubao-pro-32k', name: 'Doubao Pro', provider: 'Doubao', client, modelId: process.env.DOUBAO_PRO_ENDPOINT || 'doubao-pro-32k' },
        { id: 'doubao-lite-32k', name: 'Doubao Lite', provider: 'Doubao', client, modelId: process.env.DOUBAO_LITE_ENDPOINT || 'doubao-lite-32k' },
      );
    }

    // ---- American AI Providers ----

    if (process.env.XAI_API_KEY) {
      const client = new OpenAI({ apiKey: process.env.XAI_API_KEY, baseURL: 'https://api.x.ai/v1' });
      this.models.push(
        { id: 'grok-3', name: 'Grok 3', provider: 'xAI', client, modelId: 'grok-3' },
        { id: 'grok-3-mini', name: 'Grok 3 Mini', provider: 'xAI', client, modelId: 'grok-3-mini' },
      );
    }

    if (this.models.length === 0) {
      console.warn('No AI models configured. Add API keys to backend/.env');
    } else {
      console.log(`Registered ${this.models.length} AI model(s):`);
      for (const m of this.models) {
        console.log(`  - ${m.name} (${m.provider}) -> ${m.id}`);
      }
    }
  }

  getModels() {
    return this.models.map(m => ({ id: m.id, name: m.name, provider: m.provider }));
  }

  getModelById(id: string): ModelConfig | undefined {
    return this.models.find(m => m.id === id);
  }

  getDefaultModel(): ModelConfig | undefined {
    return this.models[0];
  }

  private normalizeProvider(provider?: string): string | null {
    if (!provider) return null;
    const normalized = provider.trim().toLowerCase();
    if (!normalized) return null;
    const allowed = new Set([
      'openai', 'deepseek', 'google', 'gemini', 'groq', 'qwen', 'anthropic', 'claude',
      'xai', 'zhipu', 'moonshot', 'kimi', 'yi', 'stepfun', 'doubao',
    ]);
    if (!allowed.has(normalized)) return null;
    if (normalized === 'gemini') return 'google';
    if (normalized === 'claude') return 'anthropic';
    if (normalized === 'kimi') return 'moonshot';
    return normalized;
  }

  private providerLabel(provider: string): string {
    const labels: Record<string, string> = {
      openai: 'OpenAI', deepseek: 'DeepSeek', google: 'Google',
      groq: 'Groq', qwen: 'Qwen', anthropic: 'Anthropic',
      xai: 'xAI', zhipu: 'Zhipu', moonshot: 'Moonshot',
      yi: 'Yi', stepfun: 'Stepfun', doubao: 'Doubao',
    };
    const normalized = this.normalizeProvider(provider);
    return labels[normalized ?? ''] ?? 'OpenAI';
  }

  private buildOpenAiClient(provider: string, apiKey: string): OpenAI | null {
    const normalized = this.normalizeProvider(provider);
    if (!normalized) return null;
    if (normalized === 'google' || normalized === 'anthropic') return null;

    const baseUrls: Record<string, string | undefined> = {
      deepseek: 'https://api.deepseek.com/v1',
      groq: 'https://api.groq.com/openai/v1',
      qwen: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
      xai: 'https://api.x.ai/v1',
      zhipu: 'https://open.bigmodel.cn/api/paas/v4',
      moonshot: 'https://api.moonshot.cn/v1',
      yi: 'https://api.lingyiwanwu.com/v1',
      stepfun: 'https://api.stepfun.com/v1',
      doubao: 'https://ark.cn-beijing.volces.com/api/v3',
    };
    const baseURL = baseUrls[normalized];
    return baseURL ? new OpenAI({ apiKey, baseURL }) : new OpenAI({ apiKey });
  }

  // Some Anthropic model IDs include version date suffixes that differ from
  // the short IDs registered for the model list. Map frontend IDs → Anthropic API IDs.
  private readonly anthropicModelIdMap: Record<string, string> = {
    'claude-haiku-4-5': 'claude-haiku-4-5-20251001',
  };

  buildUserModel(opts: { modelId?: string; provider?: string; apiKey: string }): ModelConfig | null {
    const normalized = this.normalizeProvider(opts.provider);
    if (!normalized) return null;
    const modelId = (opts.modelId?.trim() || this.providerDefaultModels[normalized])?.trim();
    if (!modelId) return null;

    if (normalized === 'google') {
      return { id: modelId, name: modelId, provider: this.providerLabel(normalized), client: 'gemini', modelId };
    }
    if (normalized === 'anthropic') {
      const actualModelId = this.anthropicModelIdMap[modelId] ?? modelId;
      return { id: modelId, name: modelId, provider: this.providerLabel(normalized), client: 'anthropic', modelId: actualModelId };
    }

    const client = this.buildOpenAiClient(normalized, opts.apiKey);
    if (!client) return null;
    return { id: modelId, name: modelId, provider: this.providerLabel(normalized), client, modelId };
  }

  private async callGemini(modelId: string, msgs: Array<{ role: string; content: string }>, apiKey?: string): Promise<string> {
    const key = apiKey?.trim() || process.env.GOOGLE_AI_API_KEY;
    if (!key) {
      return 'Gemini API key is not configured';
    }
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${key}`;
    const contents = msgs.filter(m => m.role !== 'system').map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));
    const sysMsg = msgs.find(m => m.role === 'system');
    const reqBody: Record<string, unknown> = { contents };
    if (sysMsg) reqBody.systemInstruction = { parts: [{ text: sysMsg.content }] };

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reqBody),
    });
    const data = await res.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
    return data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response from Gemini';
  }

  async chat(
    model: ModelConfig,
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
    apiKey?: string,
  ): Promise<string> {
    if (model.client === 'gemini') {
      return this.callGemini(model.modelId, messages, apiKey);
    }
    if (model.client === 'anthropic') {
      return this.callClaude(model.modelId, messages, apiKey);
    }

    const overrideClient = apiKey ? this.buildOpenAiClient(model.provider, apiKey) : null;
    const client = overrideClient ?? model.client;

    const response = await client.chat.completions.create({
      model: model.modelId,
      messages,
      temperature: 0.7,
      max_tokens: 2048,
    });
    return response.choices[0]?.message?.content || 'No response';
  }

  /**
   * Stream chat response via SSE.
   * NOTE: Does NOT send the final done:true frame or call res.end() —
   * the caller is responsible for that so it can include save warnings etc.
   * Throws on AI provider errors so the caller can handle them cleanly.
   */
  async chatStream(
    model: ModelConfig,
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
    res: Response,
    apiKey?: string,
  ): Promise<string> {
    if (!res.headersSent) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');
      res.flushHeaders();
    }

    if (model.client === 'gemini') {
      return this.callGeminiStream(model.modelId, messages, res, apiKey);
    }
    if (model.client === 'anthropic') {
      return this.callClaudeStream(model.modelId, messages, res, apiKey);
    }

    const overrideClient = apiKey ? this.buildOpenAiClient(model.provider, apiKey) : null;
    const client = overrideClient ?? model.client;
    const stream = await client.chat.completions.create({
      model: model.modelId,
      messages,
      temperature: 0.7,
      max_tokens: 4096,
      stream: true,
    });

    let fullContent = '';
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content || '';
      if (delta) {
        fullContent += delta;
        res.write(`data: ${JSON.stringify({ content: delta, done: false })}\n\n`);
      }
    }

    return fullContent;
  }

  /**
   * Stream Gemini response via the streamGenerateContent REST SSE endpoint.
   * Writes content chunks to res but does NOT send done:true or call res.end().
   */
  private async callGeminiStream(
    modelId: string,
    msgs: Array<{ role: string; content: string }>,
    res: Response,
    apiKey?: string,
  ): Promise<string> {
    const key = apiKey?.trim() || process.env.GOOGLE_AI_API_KEY;
    if (!key) {
      throw new Error('Gemini API key is not configured');
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:streamGenerateContent?alt=sse&key=${key}`;
    const contents = msgs.filter(m => m.role !== 'system').map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));
    const sysMsg = msgs.find(m => m.role === 'system');
    const reqBody: Record<string, unknown> = { contents };
    if (sysMsg) reqBody.systemInstruction = { parts: [{ text: sysMsg.content }] };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reqBody),
    });

    if (!response.ok || !response.body) {
      const errText = await response.text().catch(() => `HTTP ${response.status}`);
      throw new Error(`Gemini streaming error: ${errText}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let fullContent = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const raw = line.slice(6).trim();
        if (!raw) continue;
        try {
          const parsed = JSON.parse(raw) as {
            candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
          };
          const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            fullContent += text;
            res.write(`data: ${JSON.stringify({ content: text, done: false })}\n\n`);
          }
        } catch {
          // skip malformed SSE event
        }
      }
    }

    return fullContent;
  }

  // ---- Anthropic Claude API ----

  /**
   * Build auth headers for Anthropic API.
   * Supports two key formats:
   * - Standard API key (sk-ant-...): uses x-api-key header
   * - Claude Code OAuth token: uses Authorization: Bearer header
   */
  private buildClaudeAuthHeaders(key: string): Record<string, string> {
    const isStandardApiKey = key.startsWith('sk-ant-');
    if (isStandardApiKey) {
      return {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
      };
    }
    // OAuth token (from claude setup-token or similar)
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key}`,
      'anthropic-version': '2023-06-01',
    };
  }

  private async callClaude(
    modelId: string,
    msgs: Array<{ role: string; content: string }>,
    apiKey?: string,
  ): Promise<string> {
    const key = apiKey?.trim() || process.env.ANTHROPIC_API_KEY;
    if (!key) return 'Anthropic API key is not configured';

    const systemMsg = msgs.find(m => m.role === 'system');
    const chatMsgs = msgs.filter(m => m.role !== 'system').map(m => ({ role: m.role, content: m.content }));

    const reqBody: Record<string, unknown> = {
      model: modelId,
      max_tokens: 4096,
      messages: chatMsgs,
    };
    if (systemMsg) reqBody.system = systemMsg.content;

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: this.buildClaudeAuthHeaders(key),
      body: JSON.stringify(reqBody),
    });

    if (!res.ok) {
      const errMsg = await this.parseClaudeError(res);
      throw new Error(errMsg);
    }
    const data = await res.json() as { content?: Array<{ type: string; text?: string }>; error?: { message?: string } };
    if (data.error) throw new Error(`Claude: ${data.error.message || 'Unknown error'}`);
    return data.content?.find(b => b.type === 'text')?.text || 'No response from Claude';
  }

  private async parseClaudeError(response: globalThis.Response): Promise<string> {
    try {
      const body = await response.json() as { error?: { type?: string; message?: string } };
      const errType = body?.error?.type || '';
      const errMsg = body?.error?.message || `HTTP ${response.status}`;
      if (errType === 'authentication_error') {
        return 'Claude: Invalid API key. Please use either a standard Anthropic API key (sk-ant-...) from console.anthropic.com, or an OAuth token from `claude setup-token`.';
      }
      if (errType === 'not_found_error') {
        return `Claude: Model not found. Please check the model ID is correct.`;
      }
      return `Claude: ${errMsg}`;
    } catch {
      return `Claude: HTTP ${response.status}`;
    }
  }

  private async callClaudeStream(
    modelId: string,
    msgs: Array<{ role: string; content: string }>,
    res: Response,
    apiKey?: string,
  ): Promise<string> {
    const key = apiKey?.trim() || process.env.ANTHROPIC_API_KEY;
    if (!key) throw new Error('Anthropic API key is not configured');

    const systemMsg = msgs.find(m => m.role === 'system');
    const chatMsgs = msgs.filter(m => m.role !== 'system').map(m => ({ role: m.role, content: m.content }));

    const reqBody: Record<string, unknown> = {
      model: modelId,
      max_tokens: 4096,
      messages: chatMsgs,
      stream: true,
    };
    if (systemMsg) reqBody.system = systemMsg.content;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: this.buildClaudeAuthHeaders(key),
      body: JSON.stringify(reqBody),
    });

    if (!response.ok || !response.body) {
      const errMsg = await this.parseClaudeError(response);
      throw new Error(errMsg);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let fullContent = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const raw = line.slice(6).trim();
        if (!raw) continue;
        try {
          const parsed = JSON.parse(raw) as { type?: string; delta?: { type?: string; text?: string } };
          if (parsed.type === 'content_block_delta' && parsed.delta?.type === 'text_delta' && parsed.delta.text) {
            fullContent += parsed.delta.text;
            res.write(`data: ${JSON.stringify({ content: parsed.delta.text, done: false })}\n\n`);
          }
        } catch {
          // skip malformed SSE event
        }
      }
    }

    return fullContent;
  }

  // ---- Mix Chat (parallel multi-model) ----

  async mixChat(
    models: ModelConfig[],
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  ): Promise<Array<{ modelId: string; modelName: string; provider: string; content: string; error?: string }>> {
    const results = await Promise.allSettled(
      models.map(async (model) => {
        const content = await this.chat(model, messages);
        return { modelId: model.id, modelName: model.name, provider: model.provider, content };
      }),
    );

    return results.map((r, i) => {
      if (r.status === 'fulfilled') return r.value;
      const errMsg = r.reason instanceof Error ? r.reason.message : 'Unknown error';
      return { modelId: models[i].id, modelName: models[i].name, provider: models[i].provider, content: '', error: errMsg };
    });
  }

  async synthesize(
    synthModel: ModelConfig,
    question: string,
    answers: Array<{ modelName: string; content: string }>,
  ): Promise<string> {
    const answerBlock = answers
      .map(a => `【${a.modelName}】:\n${a.content}`)
      .join('\n\n---\n\n');

    const systemPrompt = `You are a multi-model synthesis expert. You receive answers from multiple AI models to the same question. Your job:

1. **Consensus** — Identify core points all models agree on (highest confidence)
2. **Complementary** — Unique insights each model contributed
3. **Disagreements** — Where models conflict (flag for user judgment)
4. **Final Answer** — Synthesize the best combined answer
5. **Confidence** — Rate as High / Medium / Low based on agreement level

Use markdown formatting. Reply in the same language as the user's question.`;

    const userPrompt = `**User's question:**\n${question}\n\n**Model answers:**\n\n${answerBlock}`;

    return this.chat(synthModel, [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ]);
  }

  private async assertSessionOwnership(sessionId: string, userId: string) {
    const session = await this.prisma.session.findFirst({
      where: { id: sessionId, userId },
      select: { id: true },
    });
    if (!session) {
      // Return "not found" for both non-existent and non-owned sessions (prevents enumeration)
      throw new NotFoundException('Session not found');
    }
  }

  async loadSessionHistory(
    sessionId: string,
    userId: string,
  ): Promise<Array<{ role: 'user' | 'assistant'; content: string }>> {
    await this.assertSessionOwnership(sessionId, userId);
    const contextLimit = parseInt(process.env.AI_CONTEXT_MSG_LIMIT ?? '100', 10);
    const dbMessages = await this.prisma.message.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
      take: contextLimit,
    });
    return dbMessages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }));
  }

  async saveMessages(sessionId: string, userId: string, userContent: string, aiContent: string, modelId: string) {
    await this.assertSessionOwnership(sessionId, userId);

    if (AI_DEBUG) {
      console.log(`[saveMessages] Saving to session ${sessionId}, model: ${modelId}`);
    }

    await this.prisma.message.createMany({
      data: [
        { role: 'user', content: userContent, model: modelId, sessionId },
        { role: 'assistant', content: aiContent, model: modelId, sessionId },
      ],
    });

    // Always update session updatedAt and auto-name based on first message
    const msgCount = await this.prisma.message.count({ where: { sessionId } });
    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (msgCount <= 2) {
      updateData.title = userContent.slice(0, 30) + (userContent.length > 30 ? '...' : '');
    }
    await this.prisma.session.update({
      where: { id: sessionId },
      data: updateData,
    });

    if (AI_DEBUG) {
      console.log(`[saveMessages] Success. Total messages in session: ${msgCount}`);
    }
  }
}
