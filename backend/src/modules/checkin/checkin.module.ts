import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CheckInController } from './checkin.controller';
import { CheckInService } from './checkin.service';

@Module({
  imports: [AuthModule],
  controllers: [CheckInController],
  providers: [CheckInService],
})
export class CheckInModule {}

