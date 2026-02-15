import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CheckInService } from './checkin.service';
import { CreateCheckInDto } from './dto/create-checkin.dto';
import { ListCheckInsQueryDto } from './dto/list-checkins-query.dto';

@Controller('api/v1/checkins')
@UseGuards(JwtAuthGuard)
export class CheckInController {
  constructor(private readonly checkInService: CheckInService) {}

  @Get()
  async list(@CurrentUser() userId: string, @Query() query: ListCheckInsQueryDto) {
    return this.checkInService.list(userId, query);
  }

  @Post()
  async checkIn(@CurrentUser() userId: string, @Body() body: CreateCheckInDto) {
    return this.checkInService.checkIn(userId, body);
  }
}

