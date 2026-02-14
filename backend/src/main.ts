import 'dotenv/config';
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  app.useGlobalFilters(new GlobalExceptionFilter());

  const port = process.env.PORT || 3001;
  await app.listen(port);

  console.log('');
  console.log(`Raven Backend running on http://localhost:${port}`);
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
