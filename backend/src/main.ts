import 'dotenv/config';
import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

async function bootstrap() {
  if (!process.env.JWT_SECRET) {
    throw new Error('Missing JWT_SECRET. Set it in backend/.env (see backend/.env.example).');
  }

  const app = await NestFactory.create(AppModule);
  const allowedOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map((o) => o.trim())
    : ['http://localhost:3000'];
  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(new TransformInterceptor());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  // Health check endpoint (no auth, used by start script)
  app.getHttpAdapter().get('/health', (_req: any, res: any) => {
    res.status(200).json({ status: 'ok' });
  });

  const port = process.env.PORT || 3001;
  await app.listen(port);

  console.log('');
  console.log(`Gewu Backend running on http://localhost:${port}`);
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
