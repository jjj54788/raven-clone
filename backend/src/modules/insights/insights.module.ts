import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AiModule } from '../ai/ai.module';
import { KnowledgeModule } from '../knowledge/knowledge.module';
import { InsightsController } from './insights.controller';
import { InsightsService } from './insights.service';
import { InsightsResearchService } from './insights-research.service';
import { InsightStreamService } from './insights-stream.service';

@Module({
  imports: [AuthModule, AiModule, KnowledgeModule],
  controllers: [InsightsController],
  providers: [InsightsService, InsightsResearchService, InsightStreamService],
  exports: [InsightsService, InsightsResearchService],
})
export class InsightsModule {}
