import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ExploreService } from './explore.service';
import { YoutubeExploreQueryDto } from './dto/youtube-explore-query.dto';

@Controller('api/v1/explore')
@UseGuards(JwtAuthGuard)
export class ExploreController {
  constructor(private readonly exploreService: ExploreService) {}

  @Get('youtube')
  async getYoutube(@Query() query: YoutubeExploreQueryDto) {
    return this.exploreService.searchYoutube(query);
  }
}
