import { Module } from '@nestjs/common';
import { ChatKitController } from './chatkit.controller';
import { ChatKitService } from './chatkit.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [ChatKitController],
  providers: [ChatKitService],
})
export class ChatKitModule {}
