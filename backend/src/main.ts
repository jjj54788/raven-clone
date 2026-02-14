// ============================================================
// Phase 2: 最小后端 - 只有一个聊天接口
// 无数据库、无认证，纯粹跑通 AI 调用链路
// ============================================================

import { Controller, Get, Post, Body, Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import OpenAI from 'openai';

// --- 自动检测可用的 AI Provider ---
let client: OpenAI | null = null;
let model = '';
let provider = '';

if (process.env.OPENAI_API_KEY) {
  client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  model = 'gpt-4.1-mini';
  provider = 'OpenAI';
} else if (process.env.DEEPSEEK_API_KEY) {
  client = new OpenAI({
    apiKey: process.env.DEEPSEEK_API_KEY,
    baseURL: 'https://api.deepseek.com/v1',
  });
  model = 'deepseek-chat';
  provider = 'DeepSeek';
}

@Controller('api/v1')
class AppController {
  @Get('health')
  getHealth() {
    return { status: 'ok', provider: provider || 'none', model };
  }

  @Post('ai/simple-chat')
  async simpleChat(
    @Body()
    body: {
      message: string;
      messages?: Array<{ role: string; content: string }>;
    },
  ) {
    if (!client && !process.env.GOOGLE_AI_API_KEY) {
      return { content: 'Error: No AI API Key configured. Add OPENAI_API_KEY, DEEPSEEK_API_KEY, or GOOGLE_AI_API_KEY to .env', model: 'none', provider: 'none' };
    }

    const msgs: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: 'You are Raven AI, a helpful assistant. Reply in the same language as the user.' },
    ];

    if (body.messages) {
      for (const m of body.messages) {
        msgs.push({ role: m.role as any, content: m.content });
      }
    }
    msgs.push({ role: 'user', content: body.message });

    // Gemini 走 REST API
    if (process.env.GOOGLE_AI_API_KEY && !client) {
      const geminiModel = 'gemini-2.5-flash';
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${process.env.GOOGLE_AI_API_KEY}`;
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
      const data = await res.json();
      return {
        content: data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response',
        model: geminiModel,
        provider: 'Google',
      };
    }

    // OpenAI / DeepSeek
    const response = await client!.chat.completions.create({
      model,
      messages: msgs,
      temperature: 0.7,
      max_tokens: 2048,
    });

    return {
      content: response.choices[0]?.message?.content || 'No response',
      model,
      provider,
    };
  }
}

@Module({ controllers: [AppController] })
class AppModule {}

async function bootstrap() {
  // 加载 .env
  require('dotenv').config();

  // 重新检测 (dotenv 加载后)
  if (!client && !provider) {
    if (process.env.OPENAI_API_KEY) {
      client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      model = 'gpt-4.1-mini';
      provider = 'OpenAI';
    } else if (process.env.DEEPSEEK_API_KEY) {
      client = new OpenAI({
        apiKey: process.env.DEEPSEEK_API_KEY,
        baseURL: 'https://api.deepseek.com/v1',
      });
      model = 'deepseek-chat';
      provider = 'DeepSeek';
    } else if (process.env.GOOGLE_AI_API_KEY) {
      provider = 'Google';
      model = 'gemini-2.5-flash';
    }
  }

  const app = await NestFactory.create(AppModule);
  app.enableCors();
  await app.listen(3001);
  console.log('');
  console.log('🚀 Phase 2 Backend running on http://localhost:3001');
  console.log(`🤖 AI Provider: ${provider || 'NONE - add API key to .env!'} (${model})`);
  console.log('');
}
bootstrap();
