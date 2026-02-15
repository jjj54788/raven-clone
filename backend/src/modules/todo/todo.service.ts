import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, TodoStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTodoListDto } from './dto/create-list.dto';
import { UpdateTodoListDto } from './dto/update-list.dto';
import { CreateTodoTaskDto } from './dto/create-task.dto';
import { UpdateTodoTaskDto } from './dto/update-task.dto';
import { ListTodoTasksQueryDto } from './dto/list-tasks-query.dto';

@Injectable()
export class TodoService {
  constructor(private readonly prisma: PrismaService) {}

  private normalizeText(value: string): string {
    return value.trim().replace(/\s+/g, ' ');
  }

  private async getOrCreateInboxList(userId: string) {
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

  async listLists(userId: string) {
    await this.getOrCreateInboxList(userId);
    return this.prisma.todoList.findMany({
      where: { userId },
      orderBy: [{ isInbox: 'desc' }, { updatedAt: 'desc' }],
      select: {
        id: true,
        name: true,
        color: true,
        isInbox: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { tasks: true } },
      },
    });
  }

  async createList(userId: string, dto: CreateTodoListDto) {
    const name = this.normalizeText(dto.name);
    if (!name) throw new BadRequestException('List name is required');

    return this.prisma.todoList.create({
      data: {
        userId,
        name,
        color: dto.color?.trim() || null,
        isInbox: false,
      },
      select: {
        id: true,
        name: true,
        color: true,
        isInbox: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async updateList(userId: string, listId: string, dto: UpdateTodoListDto) {
    const list = await this.prisma.todoList.findFirst({ where: { id: listId, userId } });
    if (!list) throw new NotFoundException('List not found');

    const data: Prisma.TodoListUpdateInput = {};
    if (dto.name !== undefined) {
      const name = this.normalizeText(dto.name);
      if (!name) throw new BadRequestException('List name is required');
      data.name = name;
    }
    if (dto.color !== undefined) {
      data.color = dto.color === null ? null : dto.color?.trim() || null;
    }

    return this.prisma.todoList.update({
      where: { id: listId },
      data,
      select: {
        id: true,
        name: true,
        color: true,
        isInbox: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async deleteList(userId: string, listId: string) {
    const list = await this.prisma.todoList.findFirst({ where: { id: listId, userId } });
    if (!list) throw new NotFoundException('List not found');
    if (list.isInbox) throw new BadRequestException('Inbox list cannot be deleted');

    await this.prisma.todoList.delete({ where: { id: listId } });
    return { message: 'Deleted' };
  }

  async listTasks(userId: string, query: ListTodoTasksQueryDto) {
    await this.getOrCreateInboxList(userId);

    const where: Prisma.TodoTaskWhereInput = { list: { userId } };

    if (query.listId) {
      where.listId = query.listId;
    }

    const status = query.status ?? 'open';
    if (status === 'open') {
      where.status = { in: [TodoStatus.TODO, TodoStatus.IN_PROGRESS] };
    } else if (status === 'done') {
      where.status = TodoStatus.DONE;
    } else if (status === 'archived') {
      where.status = TodoStatus.ARCHIVED;
    }

    if (query.q) {
      const q = query.q.trim();
      if (q) {
        where.OR = [
          { title: { contains: q, mode: 'insensitive' } },
          { description: { contains: q, mode: 'insensitive' } },
        ];
      }
    }

    if (query.dueAfter || query.dueBefore) {
      const dueAt: Prisma.DateTimeNullableFilter = {};
      if (query.dueAfter) {
        dueAt.gte = new Date(query.dueAfter);
      }
      if (query.dueBefore) {
        dueAt.lte = new Date(query.dueBefore);
      }
      where.dueAt = dueAt;
    }

    const take = query.take ?? 20;

    return this.prisma.todoTask.findMany({
      where,
      take,
      orderBy: [{ dueAt: 'asc' }, { priority: 'desc' }, { updatedAt: 'desc' }],
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        priority: true,
        dueAt: true,
        completedAt: true,
        position: true,
        createdAt: true,
        updatedAt: true,
        list: { select: { id: true, name: true, color: true, isInbox: true } },
      },
    });
  }

  async getOverview(userId: string) {
    await this.getOrCreateInboxList(userId);

    const whereOpen: Prisma.TodoTaskWhereInput = {
      list: { userId },
      status: { in: [TodoStatus.TODO, TodoStatus.IN_PROGRESS] },
    };

    const [openCount, topTasks] = await this.prisma.$transaction([
      this.prisma.todoTask.count({ where: whereOpen }),
      this.prisma.todoTask.findMany({
        where: whereOpen,
        take: 3,
        orderBy: [{ dueAt: 'asc' }, { priority: 'desc' }, { updatedAt: 'desc' }],
        select: {
          id: true,
          title: true,
          description: true,
          status: true,
          priority: true,
          dueAt: true,
          completedAt: true,
          position: true,
          createdAt: true,
          updatedAt: true,
          list: { select: { id: true, name: true, color: true, isInbox: true } },
        },
      }),
    ]);

    return { openCount, topTasks };
  }

  async createTask(userId: string, dto: CreateTodoTaskDto) {
    const title = this.normalizeText(dto.title);
    if (!title) throw new BadRequestException('Title is required');

    const list = dto.listId
      ? await this.prisma.todoList.findFirst({ where: { id: dto.listId, userId } })
      : await this.getOrCreateInboxList(userId);

    if (!list) throw new NotFoundException('List not found');

    const dueAt = dto.dueAt ? new Date(dto.dueAt) : null;

    return this.prisma.todoTask.create({
      data: {
        listId: list.id,
        title,
        description: dto.description?.trim() || null,
        priority: dto.priority ?? 0,
        dueAt,
        status: TodoStatus.TODO,
        completedAt: null,
      },
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        priority: true,
        dueAt: true,
        completedAt: true,
        position: true,
        createdAt: true,
        updatedAt: true,
        list: { select: { id: true, name: true, color: true, isInbox: true } },
      },
    });
  }

  async updateTask(userId: string, taskId: string, dto: UpdateTodoTaskDto) {
    const existing = await this.prisma.todoTask.findFirst({
      where: { id: taskId, list: { userId } },
      select: { id: true, status: true },
    });
    if (!existing) throw new NotFoundException('Task not found');

    const data: Prisma.TodoTaskUpdateInput = {};

    if (dto.title !== undefined) {
      const title = this.normalizeText(dto.title);
      if (!title) throw new BadRequestException('Title is required');
      data.title = title;
    }

    if (dto.description !== undefined) {
      data.description = dto.description === null ? null : dto.description.trim() || null;
    }

    if (dto.priority !== undefined) {
      data.priority = dto.priority;
    }

    if (dto.dueAt !== undefined) {
      data.dueAt = dto.dueAt === null ? null : new Date(dto.dueAt);
    }

    if (dto.listId !== undefined) {
      const list = await this.prisma.todoList.findFirst({ where: { id: dto.listId, userId } });
      if (!list) throw new NotFoundException('List not found');
      data.list = { connect: { id: list.id } };
    }

    if (dto.status !== undefined) {
      data.status = dto.status;
      if (dto.status === TodoStatus.DONE) {
        data.completedAt = new Date();
      } else if (dto.status === TodoStatus.TODO || dto.status === TodoStatus.IN_PROGRESS) {
        data.completedAt = null;
      }
    }

    return this.prisma.todoTask.update({
      where: { id: taskId },
      data,
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        priority: true,
        dueAt: true,
        completedAt: true,
        position: true,
        createdAt: true,
        updatedAt: true,
        list: { select: { id: true, name: true, color: true, isInbox: true } },
      },
    });
  }

  async deleteTask(userId: string, taskId: string) {
    const existing = await this.prisma.todoTask.findFirst({ where: { id: taskId, list: { userId } } });
    if (!existing) throw new NotFoundException('Task not found');

    await this.prisma.todoTask.delete({ where: { id: taskId } });
    return { message: 'Deleted' };
  }
}
