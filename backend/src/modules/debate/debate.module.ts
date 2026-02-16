import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AiModule } from '../ai/ai.module';
import { AuthModule } from '../auth/auth.module';
import { DebateController } from './debate.controller';
import { DebateService } from './debate.service';
import { DebateStreamService } from './debate.stream';

@Module({
  imports: [PrismaModule, AiModule, AuthModule],
  controllers: [DebateController],
  providers: [DebateService, DebateStreamService],
})
export class DebateModule {}
