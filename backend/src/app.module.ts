import { Module } from '@nestjs/common';
import { PrismaModule } from './modules/prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { AiModule } from './modules/ai/ai.module';
import { AskModule } from './modules/ask/ask.module';

@Module({
  imports: [PrismaModule, AuthModule, AiModule, AskModule],
})
export class AppModule {}
