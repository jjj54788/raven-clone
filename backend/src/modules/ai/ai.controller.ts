import { Controller, Get, Post, Body, Req, Res } from '@nestjs/common';
import OpenAI from 'openai';
import { getUserIdFromReq } from '../auth/auth.controller';
import prisma from '../prisma/prisma.service';

// --- 模型注册表 ---
interface ModelConfig {
  id: string;
  name: string;
  provider: string;
  client: OpenAI | 'gemini';
  modelId: string;
}

export const modelRegistry: ModelConfig[] = [];

export function registerModels() {
  modelRegistry.length = 0; // clear

  if (process.env.OPENAI_API_KEY) {
    const c = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    modelRegistry.push(
      { id: 'gpt-4.1-mini', name: 'GPT 4.1 Mini', provider: 'OpenAI', client: c, modelId: 'gpt-4.1-mini' },
      { id: 'gpt-4.1-nano', name: 'GPT 4.1 Nano', provider: 'OpenAI', client: c, modelId: 'gpt-4.1-nano' },
    );
  }

  if (process.env.DEEPSEEK_API_KEY) {
    const c = new OpenAI({ apiKey: process.env.DEEPSEEK_API_KEY, baseURL: 'https://api.deepseek.com/v1' });
    modelRegistry.push(
      { id: 'deepseek-chat', name: 'DeepSeek V3', provider: 'DeepSeek', client: c, modelId: 'deepseek-chat' },
      { id: 'deepseek-reasoner', name: 'DeepSeek R1', provider: 'DeepSeek', client: c, modelId: 'deepseek-reasoner' },
    );
  }

  if (process.env.GOOGLE_AI_API_KEY) {
    modelRegistry.push(
      { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', provider: 'Google', client: 'gemini', modelId: 'gemini-2.5-flash' },
    );
  }
}

async function callGemini(modelId: string, msgs: Array<{ role: string; content: string }>) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${process.env.GOOGLE_AI_API_KEY}`;
  const contents = msgs.filter(m => m.role !== 'system').map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));
  const sysMsg = msgs.find(m => m.role === 'system');
  const reqBody: any = { contents };
  if (sysMsg) reqBody.systemInstruction = { parts: [{ text: sysMsg.content }] };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(reqBody),
  });
  const data: any = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response from Gemini';
}

@Controller('api/v1/ai')
export class AiController {
  @Get('models')
  getModels() {
    return modelRegistry.map(m => ({ id: m.id, name: m.name, provider: m.provider }));
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
    @Res() res: any,
  ) {
    if (modelRegistry.length === 0) {
      return res.json({
        content: 'Error: No AI API Key configured. Add keys to backend/.env',
        model: 'none',
        provider: 'none',
      });
    }

    const selectedModel = body.model
      ? modelRegistry.find(m => m.id === body.model) || modelRegistry[0]
      : modelRegistry[0];

    // 构建消息
    const msgs: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: 'You are Raven AI, a helpful assistant. Reply in the same language as the user.' },
    ];

    // 如果有 sessionId，从数据库加载历史消息
    if (body.sessionId) {
      const userId = getUserIdFromReq(req);
      if (userId) {
        const dbMessages = await prisma.message.findMany({
          where: { sessionId: body.sessionId },
          orderBy: { createdAt: 'asc' },
          take: 50,
        });
        for (const m of dbMessages) {
          msgs.push({ role: m.role as any, content: m.content });
        }
      }
    } else if (body.messages) {
      for (const m of body.messages) {
        msgs.push({ role: m.role as any, content: m.content });
      }
    }

    msgs.push({ role: 'user', content: body.message });

    try {
      let content: string;

      if (selectedModel.client === 'gemini') {
        content = await callGemini(selectedModel.modelId, msgs);
      } else {
        const response = await selectedModel.client.chat.completions.create({
          model: selectedModel.modelId,
          messages: msgs,
          temperature: 0.7,
          max_tokens: 2048,
        });
        content = response.choices[0]?.message?.content || 'No response';
      }

      // 如果有 sessionId，保存消息到数据库
      if (body.sessionId) {
        const userId = getUserIdFromReq(req);
        if (userId) {
          await prisma.message.createMany({
            data: [
              { role: 'user', content: body.message, model: selectedModel.id, sessionId: body.sessionId },
              { role: 'assistant', content, model: selectedModel.id, sessionId: body.sessionId },
            ],
          });
          // 如果是会话的第一条消息，用用户消息的前30字作为标题
          const msgCount = await prisma.message.count({ where: { sessionId: body.sessionId } });
          if (msgCount <= 2) {
            await prisma.session.update({
              where: { id: body.sessionId },
              data: { title: body.message.slice(0, 30) + (body.message.length > 30 ? '...' : '') },
            });
          }
        }
      }

      return res.json({ content, model: selectedModel.id, provider: selectedModel.provider });
    } catch (err: any) {
      return res.json({
        content: `AI Error (${selectedModel.provider} ${selectedModel.name}): ${err.message}`,
        model: selectedModel.id,
        provider: selectedModel.provider,
      });
    }
  }
}
