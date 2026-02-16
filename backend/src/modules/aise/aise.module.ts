import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { AiseController } from './aise.controller';
import { AiseService } from './aise.service';

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [AiseController],
  providers: [AiseService],
})
export class AiseModule {}
