import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AiseService } from './aise.service';
import { UpdateAiseOverviewDto } from './dto/update-overview.dto';

@Controller('api/v1/aise')
@UseGuards(JwtAuthGuard)
export class AiseController {
  constructor(private readonly aiseService: AiseService) {}

  @Get('overview')
  getOverview(@CurrentUser() userId: string) {
    return this.aiseService.getOverview(userId);
  }

  @Put('overview')
  updateOverview(@CurrentUser() userId: string, @Body() body: UpdateAiseOverviewDto) {
    return this.aiseService.updateOverview(userId, body);
  }

  @Get('requirements')
  listRequirements(@CurrentUser() userId: string) {
    return this.aiseService.listRequirements(userId);
  }

  @Get('requirements/:id')
  getRequirement(@CurrentUser() userId: string, @Param('id') id: string) {
    return this.aiseService.getRequirement(userId, id);
  }
}
