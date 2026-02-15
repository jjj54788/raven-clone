import { Module } from '@nestjs/common';
import { PrismaModule } from './modules/prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { AiModule } from './modules/ai/ai.module';
import { AskModule } from './modules/ask/ask.module';
import { StoreModule } from './modules/store/store.module';
import { TodoModule } from './modules/todo/todo.module';
import { AdminModule } from './modules/admin/admin.module';
import { CheckInModule } from './modules/checkin/checkin.module';
import { ExploreModule } from './modules/explore/explore.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    AiModule,
    AskModule,
    StoreModule,
    TodoModule,
    AdminModule,
    CheckInModule,
    ExploreModule,
  ],
})
export class AppModule {}
