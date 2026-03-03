import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { KnowledgeController } from './knowledge.controller';
import { KnowledgeService } from './knowledge.service';
import { KnowledgeEmbeddingService } from './knowledge-embedding.service';

@Module({
  imports: [AuthModule],
  controllers: [KnowledgeController],
  providers: [KnowledgeService, KnowledgeEmbeddingService],
  exports: [KnowledgeEmbeddingService],
})
export class KnowledgeModule {}

