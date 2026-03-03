import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { GameService } from './game.service';
import { SaveGameDto } from './dto/save-game.dto';

@Controller('api/v1/game')
@UseGuards(JwtAuthGuard)
export class GameController {
  constructor(private readonly gameService: GameService) {}

  @Post('saves')
  async saveGame(
    @CurrentUser() userId: string,
    @Body() dto: SaveGameDto,
  ) {
    return this.gameService.saveGame(userId, dto);
  }

  @Get('saves')
  async listSaves(@CurrentUser() userId: string) {
    return this.gameService.listSaves(userId);
  }

  @Get('saves/:id')
  async loadSave(
    @CurrentUser() userId: string,
    @Param('id') id: string,
  ) {
    return this.gameService.loadSave(userId, id);
  }

  @Delete('saves/:id')
  async deleteSave(
    @CurrentUser() userId: string,
    @Param('id') id: string,
  ) {
    return this.gameService.deleteSave(userId, id);
  }

  @Get('leaderboard')
  async getLeaderboard(@Query('limit') limit?: string) {
    return this.gameService.getLeaderboard(parseInt(limit || '20', 10));
  }
}
