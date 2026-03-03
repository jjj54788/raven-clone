import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { TodoModule } from '../todo/todo.module';
import { OpenClawController } from './openclaw.controller';
import { OpenClawKeyGuard } from './openclaw.guard';
import { OpenClawService } from './openclaw.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Module({
  imports: [AuthModule, TodoModule],
  controllers: [OpenClawController],
  providers: [OpenClawService, OpenClawKeyGuard, JwtAuthGuard],
})
export class OpenClawModule {}
