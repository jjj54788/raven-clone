import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import OpenAI from 'openai';
import { PrismaService } from '../prisma/prisma.service';
import { Response } from 'express';

const AI_DEBUG = process.env.AI_DEBUG === '1';

export interface ModelConfig {
  id: string;
  name: string;
  provider: string;
  client: OpenAI | 'gemini';
  modelId: string;
}

@Injectable()
export class AiService implements OnModuleInit {
  private readonly models: ModelConfig[] = [];

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit() {
    this.registerModels();
  }

  private registerModels() {
    this.models.length = 0;

    if (process.env.OPENAI_API_KEY) {
      const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      this.models.push(
        { id: 'gpt-4.1-mini', name: 'GPT 4.1 Mini', provider: 'OpenAI', client, modelId: 'gpt-4.1-mini' },
        { id: 'gpt-4.1-nano', name: 'GPT 4.1 Nano', provider: 'OpenAI', client, modelId: 'gpt-4.1-nano' },
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
        { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', provider: 'Google', client: 'gemini', modelId: 'gemini-2.5-flash' },
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

  private async callGemini(modelId: string, msgs: Array<{ role: string; content: string }>): Promise<string> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${process.env.GOOGLE_AI_API_KEY}`;
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
  ): Promise<string> {
    if (model.client === 'gemini') {
      return this.callGemini(model.modelId, messages);
    }

    const response = await model.client.chat.completions.create({
      model: model.modelId,
      messages,
      temperature: 0.7,
      max_tokens: 2048,
    });
    return response.choices[0]?.message?.content || 'No response';
  }

  /**
   * Stream chat response via SSE
   */
  async chatStream(
    model: ModelConfig,
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
    res: Response,
  ): Promise<string> {
    if (!res.headersSent) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');
      res.flushHeaders();
    }

    let fullContent = '';

    if (model.client === 'gemini') {
      // Gemini doesn't support streaming via OpenAI SDK, fall back to non-stream
      fullContent = await this.callGemini(model.modelId, messages);
      res.write(`data: ${JSON.stringify({ content: fullContent, done: false })}\n\n`);
      res.write(`data: ${JSON.stringify({ content: '', done: true })}\n\n`);
      res.end();
      return fullContent;
    }

    try {
      const stream = await model.client.chat.completions.create({
        model: model.modelId,
        messages,
        temperature: 0.7,
        max_tokens: 4096,
        stream: true,
      });

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content || '';
        if (delta) {
          fullContent += delta;
          res.write(`data: ${JSON.stringify({ content: delta, done: false })}\n\n`);
        }
      }

      res.write(`data: ${JSON.stringify({ content: '', done: true })}\n\n`);
      res.end();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      res.write(`data: ${JSON.stringify({ error: message, done: true })}\n\n`);
      res.end();
    }

    return fullContent;
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
    const dbMessages = await this.prisma.message.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
      take: 50,
    });
    return dbMessages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }));
  }

  async saveMessages(sessionId: string, userId: string, userContent: string, aiContent: string, modelId: string) {
    await this.assertSessionOwnership(sessionId, userId);

    if (AI_DEBUG) {
      console.log(`[saveMessages] Saving to session ${sessionId}, model: ${modelId}`);
    }

    try {
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
    } catch (err) {
      console.error(`[saveMessages] Failed:`, err);
    }
  }
}
