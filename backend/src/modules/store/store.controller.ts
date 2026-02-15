import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { StoreService } from './store.service';
import { ListStoreItemsQueryDto } from './dto/list-store-items-query.dto';
import { CreateCustomStoreItemDto } from './dto/create-custom-store-item.dto';
import type { StoreItemType } from './store.types';

@Controller('api/v1/store')
@UseGuards(JwtAuthGuard)
export class StoreController {
  constructor(private readonly storeService: StoreService) {}

  @Get('items')
  async listItems(@CurrentUser() userId: string, @Query() query: ListStoreItemsQueryDto) {
    return this.storeService.listItems(userId, query);
  }

  @Get('items/:id')
  async getItem(@CurrentUser() userId: string, @Param('id') id: string) {
    return this.storeService.getItemById(userId, id);
  }

  @Get('categories')
  async listCategories(@CurrentUser() userId: string, @Query('type') type?: StoreItemType) {
    return this.storeService.listCategories(userId, type);
  }

  @Post('custom-items')
  async createCustomItem(@CurrentUser() userId: string, @Body() body: CreateCustomStoreItemDto) {
    return this.storeService.createCustomItem(userId, body);
  }

  @Delete('custom-items/:id')
  async deleteCustomItem(@CurrentUser() userId: string, @Param('id') id: string) {
    await this.storeService.deleteCustomItem(userId, id);
    return { ok: true };
  }
}
