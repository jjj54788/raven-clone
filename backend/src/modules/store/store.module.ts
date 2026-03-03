import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { StoreController } from './store.controller';
import { StoreService } from './store.service';
import { GithubSyncService } from './github-sync.service';
import { AuthModule } from '../auth/auth.module';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [AuthModule, AiModule, ScheduleModule],
  controllers: [StoreController],
  providers: [StoreService, GithubSyncService],
})
export class StoreModule {}

