import { BadRequestException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { Prisma, TodoList } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TodoService } from '../todo/todo.service';
import { CreateOpenClawNoteDto } from './dto/create-note.dto';
import { CreateOpenClawTodoDto } from './dto/create-todo.dto';
import { ListOpenClawNotesQueryDto } from './dto/list-notes.dto';

@Injectable()
export class OpenClawService {
  private cachedUserId: string | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly todoService: TodoService,
  ) {}

  private async resolveBridgeUserId(): Promise<string> {
    if (this.cachedUserId) return this.cachedUserId;

    const userId = process.env.OPENCLAW_BRIDGE_USER_ID?.trim();
    const userEmail = process.env.OPENCLAW_BRIDGE_USER_EMAIL?.trim().toLowerCase();

    if (!userId && !userEmail) {
      throw new ServiceUnavailableException('OpenClaw bridge user is not configured');
    }

    const user = userId
      ? await this.prisma.user.findUnique({ where: { id: userId }, select: { id: true } })
      : await this.prisma.user.findUnique({ where: { email: userEmail! }, select: { id: true } });

    if (!user) {
      throw new NotFoundException('OpenClaw bridge user not found');
    }

    this.cachedUserId = user.id;
    return user.id;
  }

  private normalizeTags(tags?: string[]): string[] {
    if (!tags || !Array.isArray(tags)) return [];
    const unique = new Set<string>();
    for (const tag of tags) {
      if (typeof tag !== 'string') continue;
      const trimmed = tag.trim();
      if (!trimmed) continue;
      unique.add(trimmed.slice(0, 32));
      if (unique.size >= 20) break;
    }
    return Array.from(unique);
  }

  async createNote(dto: CreateOpenClawNoteDto) {
    const userId = await this.resolveBridgeUserId();
    const title = dto.title.trim();
    const content = dto.content.trim();
    if (!title || !content) {
      throw new BadRequestException('Title and content are required');
    }

    return this.prisma.knowledgeNote.create({
      data: {
        userId,
        title: title.slice(0, 200),
        content: content.slice(0, 20000),
        source: dto.source?.trim().slice(0, 200) || null,
        sourceUrl: dto.sourceUrl?.trim().slice(0, 500) || null,
        tags: this.normalizeTags(dto.tags),
        metadata: dto.metadata ?? undefined,
      },
      select: {
        id: true,
        title: true,
        content: true,
        source: true,
        sourceUrl: true,
        tags: true,
        metadata: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async listNotes(query: ListOpenClawNotesQueryDto) {
    const userId = await this.resolveBridgeUserId();
    const take = query.take ?? 20;
    const where: Prisma.KnowledgeNoteWhereInput = { userId };

    if (query.q) {
      const q = query.q.trim();
      if (q) {
        where.OR = [
          { title: { contains: q, mode: 'insensitive' } },
          { content: { contains: q, mode: 'insensitive' } },
          { tags: { has: q } },
        ];
      }
    }

    return this.prisma.knowledgeNote.findMany({
      where,
      take,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        content: true,
        source: true,
        sourceUrl: true,
        tags: true,
        metadata: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async createTodo(dto: CreateOpenClawTodoDto) {
    const userId = await this.resolveBridgeUserId();
    const list = await this.resolveTargetList(userId, dto.listId, dto.listName);

    return this.todoService.createTask(userId, {
      title: dto.title,
      description: dto.description,
      dueAt: dto.dueAt,
      priority: dto.priority,
      listId: list?.id,
    });
  }

  private async resolveTargetList(userId: string, listId?: string, listName?: string): Promise<TodoList | null> {
    if (listId) {
      const found = await this.prisma.todoList.findFirst({ where: { id: listId, userId } });
      if (!found) throw new NotFoundException('Todo list not found');
      return found;
    }

    const normalizedName = listName?.trim();
    if (normalizedName) {
      const existing = await this.prisma.todoList.findFirst({
        where: {
          userId,
          name: { equals: normalizedName, mode: 'insensitive' },
        },
      });
      if (existing) return existing;

      return this.prisma.todoList.create({
        data: {
          userId,
          name: normalizedName.slice(0, 120),
          isInbox: false,
        },
      });
    }

    return this.getOrCreateInboxList(userId);
  }

  private async getOrCreateInboxList(userId: string): Promise<TodoList> {
    const existing = await this.prisma.todoList.findFirst({
      where: { userId, isInbox: true },
      orderBy: { createdAt: 'asc' },
    });
    if (existing) return existing;

    return this.prisma.todoList.create({
      data: {
        userId,
        name: 'Inbox',
        isInbox: true,
      },
    });
  }
}
