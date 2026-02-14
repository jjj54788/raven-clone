// ============================================================
// Phase 3: Full Backend - Auth + AI + Ask (Sessions)
// ============================================================

import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AuthController } from './modules/auth/auth.controller';
import { AiController, registerModels, modelRegistry } from './modules/ai/ai.controller';
import { AskController } from './modules/ask/ask.controller';

@Module({
  controllers: [AuthController, AiController, AskController],
})
class AppModule {}

async function bootstrap() {
  require('dotenv').config();
  registerModels();

  const app = await NestFactory.create(AppModule);
  app.enableCors();
  await app.listen(3001);

  console.log('');
  console.log('🚀 Phase 3 Backend running on http://localhost:3001');
  console.log('📦 Database: PostgreSQL via Prisma');
  console.log('🔐 Auth: JWT (register/login/me)');
  if (modelRegistry.length === 0) {
    console.log('⚠️  No AI models configured! Add API keys to backend/.env');
  } else {
    console.log(`🤖 Available models (${modelRegistry.length}):`);
    for (const m of modelRegistry) {
      console.log(`   - ${m.name} (${m.provider}) → ${m.id}`);
    }
  }
  console.log('');
  console.log('API Endpoints:');
  console.log('  POST /api/v1/auth/register  { email, name, password }');
  console.log('  POST /api/v1/auth/login     { email, password }');
  console.log('  GET  /api/v1/auth/me        [Bearer token]');
  console.log('  GET  /api/v1/ai/models');
  console.log('  POST /api/v1/ai/simple-chat { message, model?, sessionId? }');
  console.log('  GET  /api/v1/ask/sessions   [Bearer token]');
  console.log('  POST /api/v1/ask/sessions   [Bearer token]');
  console.log('  GET  /api/v1/ask/sessions/:id/messages');
  console.log('  DELETE /api/v1/ask/sessions/:id');
  console.log('');
}
bootstrap();
