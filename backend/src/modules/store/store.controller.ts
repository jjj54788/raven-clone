import { Body, Controller, Delete, Get, HttpCode, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { StoreService } from './store.service';
import { GithubSyncService } from './github-sync.service';
import { ListStoreItemsQueryDto } from './dto/list-store-items-query.dto';
import { CreateCustomStoreItemDto } from './dto/create-custom-store-item.dto';
import type { StoreItemType } from './store.types';

@Controller('api/v1/store')
@UseGuards(JwtAuthGuard)
export class StoreController {
  constructor(
    private readonly storeService: StoreService,
    private readonly githubSyncService: GithubSyncService,
  ) {}

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

  @Get('bookmarks')
  async getBookmarks(@CurrentUser() userId: string) {
    return this.storeService.getBookmarks(userId);
  }

  @Post('bookmarks/:itemId')
  @HttpCode(204)
  async addBookmark(@CurrentUser() userId: string, @Param('itemId') itemId: string) {
    await this.storeService.addBookmark(userId, itemId);
  }

  @Delete('bookmarks/:itemId')
  @HttpCode(204)
  async removeBookmark(@CurrentUser() userId: string, @Param('itemId') itemId: string) {
    await this.storeService.removeBookmark(userId, itemId);
  }

  @Get('recommendations')
  async getRecommendations(@CurrentUser() userId: string) {
    return this.storeService.getRecommendations(userId);
  }

  // ---- GitHub Trending ----

  @Get('github-trending')
  async getTrendingRepos(
    @Query('sort') sort?: string,
    @Query('language') language?: string,
    @Query('limit') limit?: string,
  ) {
    return this.storeService.getTrendingRepos({
      sort,
      language,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get('github-trending/:id')
  async getTrendingRepo(@Param('id') id: string) {
    return this.storeService.getTrendingRepo(id);
  }

  @Post('github-trending/sync')
  @HttpCode(202)
  async triggerGithubSync() {
    void this.githubSyncService.triggerSync();
    return { ok: true, message: 'Sync started' };
  }
}
