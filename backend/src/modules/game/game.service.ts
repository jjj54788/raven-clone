import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SaveGameDto } from './dto/save-game.dto';

@Injectable()
export class GameService {
  private readonly MAX_SAVES_PER_USER = 10;

  private readonly SAVE_LIST_SELECT = {
    id: true,
    name: true,
    daysSurvived: true,
    score: true,
    isAutosave: true,
    isCompleted: true,
    createdAt: true,
    updatedAt: true,
  };

  constructor(private readonly prisma: PrismaService) {}

  async saveGame(userId: string, dto: SaveGameDto) {
    // If saveId provided, update existing save (must be owned by user)
    if (dto.saveId) {
      const existing = await this.prisma.gameSave.findFirst({
        where: { id: dto.saveId, userId },
      });
      if (!existing) throw new NotFoundException('Save not found');

      return this.prisma.gameSave.update({
        where: { id: dto.saveId },
        data: {
          name: dto.name ?? existing.name,
          gameState: dto.gameState as unknown as Prisma.InputJsonValue,
          daysSurvived: dto.daysSurvived,
          score: dto.score,
          isCompleted: dto.isCompleted ?? false,
        },
      });
    }

    // For autosave, upsert: find existing autosave and update, or create new
    if (dto.isAutosave) {
      const existing = await this.prisma.gameSave.findFirst({
        where: { userId, isAutosave: true },
        orderBy: { updatedAt: 'desc' },
      });
      if (existing) {
        return this.prisma.gameSave.update({
          where: { id: existing.id },
          data: {
            gameState: dto.gameState as unknown as Prisma.InputJsonValue,
            daysSurvived: dto.daysSurvived,
            score: dto.score,
            isCompleted: dto.isCompleted ?? false,
          },
        });
      }
    }

    // Count existing saves; if at limit, delete oldest non-autosave
    const count = await this.prisma.gameSave.count({ where: { userId } });
    if (count >= this.MAX_SAVES_PER_USER) {
      const oldest = await this.prisma.gameSave.findFirst({
        where: { userId, isAutosave: false },
        orderBy: { updatedAt: 'asc' },
      });
      if (oldest) {
        await this.prisma.gameSave.delete({ where: { id: oldest.id } });
      }
    }

    return this.prisma.gameSave.create({
      data: {
        userId,
        name: dto.name || (dto.isAutosave ? 'Autosave' : 'Manual Save'),
        gameState: dto.gameState as unknown as Prisma.InputJsonValue,
        daysSurvived: dto.daysSurvived,
        score: dto.score,
        isAutosave: dto.isAutosave ?? false,
        isCompleted: dto.isCompleted ?? false,
      },
    });
  }

  async listSaves(userId: string) {
    return this.prisma.gameSave.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      select: this.SAVE_LIST_SELECT,
    });
  }

  async loadSave(userId: string, id: string) {
    const save = await this.prisma.gameSave.findFirst({
      where: { id, userId },
    });
    if (!save) throw new NotFoundException('Save not found');
    return save;
  }

  async deleteSave(userId: string, id: string) {
    const save = await this.prisma.gameSave.findFirst({
      where: { id, userId },
      select: { id: true },
    });
    if (!save) throw new NotFoundException('Save not found');
    await this.prisma.gameSave.delete({ where: { id } });
    return { deleted: true };
  }

  async getLeaderboard(limit: number) {
    const take = Math.min(Math.max(1, limit), 50);
    return this.prisma.gameSave.findMany({
      where: { isCompleted: true },
      orderBy: { score: 'desc' },
      take,
      select: {
        id: true,
        daysSurvived: true,
        score: true,
        updatedAt: true,
        user: { select: { id: true, name: true, avatarUrl: true } },
      },
    });
  }
}
