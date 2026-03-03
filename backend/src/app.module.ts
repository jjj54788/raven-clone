import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './modules/prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { AiModule } from './modules/ai/ai.module';
import { AskModule } from './modules/ask/ask.module';
import { StoreModule } from './modules/store/store.module';
import { TodoModule } from './modules/todo/todo.module';
import { AdminModule } from './modules/admin/admin.module';
import { CheckInModule } from './modules/checkin/checkin.module';
import { ExploreModule } from './modules/explore/explore.module';
import { IntegrationsModule } from './modules/integrations/integrations.module';
import { AiseModule } from './modules/aise/aise.module';
import { DebateModule } from './modules/debate/debate.module';
import { OpenClawModule } from './modules/openclaw/openclaw.module';
import { KnowledgeModule } from './modules/knowledge/knowledge.module';
import { TeamsModule } from './modules/teams/teams.module';
import { InsightsModule } from './modules/insights/insights.module';
import { GameModule } from './modules/game/game.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    AiModule,
    AskModule,
    StoreModule,
    TodoModule,
    AdminModule,
    CheckInModule,
    ExploreModule,
    IntegrationsModule,
    AiseModule,
    DebateModule,
    OpenClawModule,
    KnowledgeModule,
    TeamsModule,
    InsightsModule,
    GameModule,
  ],
})
export class AppModule {}
