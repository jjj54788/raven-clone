import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, TodoStatus, RepeatRule } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTodoListDto } from './dto/create-list.dto';
import { UpdateTodoListDto } from './dto/update-list.dto';
import { CreateTodoTaskDto } from './dto/create-task.dto';
import { UpdateTodoTaskDto } from './dto/update-task.dto';
import { ListTodoTasksQueryDto } from './dto/list-tasks-query.dto';
import { CreateSubTaskDto } from './dto/create-subtask.dto';
import { UpdateSubTaskDto } from './dto/update-subtask.dto';
import { BatchTasksDto } from './dto/batch-tasks.dto';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const TASK_SELECT: any = {
  id: true,
  title: true,
  description: true,
  status: true,
  priority: true,
  dueAt: true,
  completedAt: true,
  position: true,
  color: true,
  repeatRule: true,
  repeatEndAt: true,
  knowledgeNoteId: true,
  createdAt: true,
  updatedAt: true,
  list: { select: { id: true, name: true, color: true, isInbox: true } },
  subtasks: {
    select: { id: true, title: true, done: true, position: true },
    orderBy: { position: 'asc' as const },
  },
  knowledgeNote: { select: { id: true, title: true } },
};

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

  // ---- Lists ----

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

  // ---- Tasks ----

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
      select: TASK_SELECT,
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
        select: TASK_SELECT,
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
        color: dto.color?.trim() || null,
        repeatRule: dto.repeatRule ?? RepeatRule.NONE,
        repeatEndAt: dto.repeatEndAt ? new Date(dto.repeatEndAt) : null,
      },
      select: TASK_SELECT,
    });
  }

  async updateTask(userId: string, taskId: string, dto: UpdateTodoTaskDto) {
    const existing = await this.prisma.todoTask.findFirst({
      where: { id: taskId, list: { userId } },
      select: { id: true, status: true, title: true, description: true, priority: true, dueAt: true, listId: true, color: true, repeatRule: true, repeatEndAt: true },
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

    if (dto.color !== undefined) {
      data.color = dto.color === null ? null : dto.color.trim() || null;
    }

    if (dto.repeatRule !== undefined) {
      data.repeatRule = dto.repeatRule;
    }

    if (dto.repeatEndAt !== undefined) {
      data.repeatEndAt = dto.repeatEndAt === null ? null : new Date(dto.repeatEndAt);
    }

    if (dto.status !== undefined) {
      data.status = dto.status;
      if (dto.status === TodoStatus.DONE) {
        data.completedAt = new Date();
      } else if (dto.status === TodoStatus.TODO || dto.status === TodoStatus.IN_PROGRESS) {
        data.completedAt = null;
      }
    }

    const updated = await this.prisma.todoTask.update({
      where: { id: taskId },
      data,
      select: TASK_SELECT,
    });

    // Recurring task: when marked DONE, auto-create next occurrence
    if (dto.status === TodoStatus.DONE && existing.repeatRule !== RepeatRule.NONE) {
      await this.createNextRecurrence(existing);
    }

    return updated;
  }

  private async createNextRecurrence(task: {
    title: string;
    description: string | null;
    priority: number;
    dueAt: Date | null;
    listId: string;
    color: string | null;
    repeatRule: RepeatRule;
    repeatEndAt: Date | null;
  }) {
    if (task.repeatRule === RepeatRule.NONE) return;

    const baseDate = task.dueAt ?? new Date();
    const nextDate = new Date(baseDate);

    switch (task.repeatRule) {
      case RepeatRule.DAILY:
        nextDate.setDate(nextDate.getDate() + 1);
        break;
      case RepeatRule.WEEKLY:
        nextDate.setDate(nextDate.getDate() + 7);
        break;
      case RepeatRule.MONTHLY:
        nextDate.setMonth(nextDate.getMonth() + 1);
        break;
    }

    // Use max(nextDate, today) to avoid creating already-overdue occurrences
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const finalDate = nextDate > today ? nextDate : today;

    // Respect repeatEndAt boundary
    if (task.repeatEndAt && finalDate > task.repeatEndAt) return;

    await this.prisma.todoTask.create({
      data: {
        listId: task.listId,
        title: task.title,
        description: task.description,
        priority: task.priority,
        dueAt: finalDate,
        status: TodoStatus.TODO,
        completedAt: null,
        color: task.color,
        repeatRule: task.repeatRule,
        repeatEndAt: task.repeatEndAt,
      },
    });
  }

  async deleteTask(userId: string, taskId: string) {
    const existing = await this.prisma.todoTask.findFirst({ where: { id: taskId, list: { userId } } });
    if (!existing) throw new NotFoundException('Task not found');

    await this.prisma.todoTask.delete({ where: { id: taskId } });
    return { message: 'Deleted' };
  }

  // ---- Subtasks ----

  async createSubtask(userId: string, taskId: string, dto: CreateSubTaskDto) {
    const task = await this.prisma.todoTask.findFirst({
      where: { id: taskId, list: { userId } },
      select: { id: true },
    });
    if (!task) throw new NotFoundException('Task not found');

    const maxPos = await this.prisma.subTask.aggregate({
      where: { taskId },
      _max: { position: true },
    });

    return this.prisma.subTask.create({
      data: {
        taskId,
        title: this.normalizeText(dto.title),
        done: false,
        position: (maxPos._max.position ?? -1) + 1,
      },
      select: { id: true, title: true, done: true, position: true },
    });
  }

  async updateSubtask(userId: string, subtaskId: string, dto: UpdateSubTaskDto) {
    const subtask = await this.prisma.subTask.findFirst({
      where: { id: subtaskId, task: { list: { userId } } },
      select: { id: true },
    });
    if (!subtask) throw new NotFoundException('Subtask not found');

    const data: Prisma.SubTaskUpdateInput = {};
    if (dto.title !== undefined) data.title = this.normalizeText(dto.title);
    if (dto.done !== undefined) data.done = dto.done;
    if (dto.position !== undefined) data.position = dto.position;

    return this.prisma.subTask.update({
      where: { id: subtaskId },
      data,
      select: { id: true, title: true, done: true, position: true },
    });
  }

  async deleteSubtask(userId: string, subtaskId: string) {
    const subtask = await this.prisma.subTask.findFirst({
      where: { id: subtaskId, task: { list: { userId } } },
      select: { id: true },
    });
    if (!subtask) throw new NotFoundException('Subtask not found');

    await this.prisma.subTask.delete({ where: { id: subtaskId } });
    return { message: 'Deleted' };
  }

  // ---- Batch Operations ----

  async batchTasks(userId: string, dto: BatchTasksDto) {
    // Verify all tasks belong to this user
    const tasks = await this.prisma.todoTask.findMany({
      where: { id: { in: dto.ids }, list: { userId } },
      select: { id: true },
    });
    const ownedIds = tasks.map((t) => t.id);
    if (ownedIds.length === 0) throw new NotFoundException('No matching tasks found');

    if (dto.action === 'delete') {
      const result = await this.prisma.todoTask.deleteMany({ where: { id: { in: ownedIds } } });
      return { affected: result.count };
    }

    const status = dto.action === 'done' ? TodoStatus.DONE : TodoStatus.TODO;
    const now = new Date();

    const result = await this.prisma.todoTask.updateMany({
      where: { id: { in: ownedIds } },
      data: {
        status,
        completedAt: status === TodoStatus.DONE ? now : null,
      },
    });

    return { affected: result.count };
  }

  // ---- Auto-Postpone ----

  async postponeOverdue(userId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const result = await this.prisma.todoTask.updateMany({
      where: {
        list: { userId },
        status: { in: [TodoStatus.TODO, TodoStatus.IN_PROGRESS] },
        dueAt: { lt: today },
      },
      data: { dueAt: today },
    });

    return { affected: result.count };
  }

  // ---- AI Decompose ----

  async createBulkFromDecomposed(
    userId: string,
    listId: string | undefined,
    items: Array<{
      title: string;
      description?: string;
      priority?: number;
      daysFromNow?: number | null;
      subtasks?: string[];
    }>,
  ) {
    const list = listId
      ? await this.prisma.todoList.findFirst({ where: { id: listId, userId } })
      : await this.getOrCreateInboxList(userId);
    if (!list) throw new NotFoundException('List not found');

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const createdIds: string[] = [];

    for (const item of items.slice(0, 10)) {
      const title = this.normalizeText(item.title).slice(0, 200);
      if (!title) continue;

      const daysFromNow = typeof item.daysFromNow === 'number' && item.daysFromNow > 0 ? item.daysFromNow : null;
      const dueAt = daysFromNow
        ? new Date(today.getFullYear(), today.getMonth(), today.getDate() + daysFromNow)
        : null;

      const task = await this.prisma.todoTask.create({
        data: {
          listId: list.id,
          title,
          description: item.description?.trim() || null,
          priority: Math.max(0, Math.min(3, item.priority ?? 1)),
          dueAt,
          status: TodoStatus.TODO,
          completedAt: null,
          color: null,
          repeatRule: RepeatRule.NONE,
        },
      });
      createdIds.push(task.id);

      if (Array.isArray(item.subtasks)) {
        for (let i = 0; i < item.subtasks.slice(0, 8).length; i++) {
          const subTitle = this.normalizeText(item.subtasks[i]).slice(0, 200);
          if (!subTitle) continue;
          await this.prisma.subTask.create({
            data: { taskId: task.id, title: subTitle, done: false, position: i },
          });
        }
      }
    }

    return this.prisma.todoTask.findMany({
      where: { id: { in: createdIds } },
      select: TASK_SELECT,
      orderBy: [{ dueAt: 'asc' }, { priority: 'desc' }],
    });
  }

  // ---- AI Summary (data aggregation only; AI call is in controller/caller) ----

  async getSummaryData(userId: string, from: Date, to: Date) {
    const where: Prisma.TodoTaskWhereInput = {
      list: { userId },
      OR: [
        { dueAt: { gte: from, lte: to } },
        { completedAt: { gte: from, lte: to } },
        { createdAt: { gte: from, lte: to } },
      ],
    };

    const tasks = await this.prisma.todoTask.findMany({
      where,
      select: {
        title: true,
        status: true,
        priority: true,
        dueAt: true,
        completedAt: true,
        createdAt: true,
        list: { select: { name: true } },
      },
      take: 200,
      orderBy: { dueAt: 'asc' },
    });

    const total = tasks.length;
    const completed = tasks.filter((t) => t.status === TodoStatus.DONE).length;
    const overdue = tasks.filter(
      (t) => t.dueAt && t.dueAt < new Date() && t.status !== TodoStatus.DONE && t.status !== TodoStatus.ARCHIVED,
    ).length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { tasks, stats: { total, completed, overdue, completionRate } };
  }

  // ---- Knowledge Link ----

  async linkKnowledge(userId: string, taskId: string, noteId: string | null) {
    const task = await this.prisma.todoTask.findFirst({
      where: { id: taskId, list: { userId } },
      select: { id: true },
    });
    if (!task) throw new NotFoundException('Task not found');

    if (noteId) {
      const note = await this.prisma.knowledgeNote.findFirst({
        where: { id: noteId, userId },
        select: { id: true },
      });
      if (!note) throw new NotFoundException('Knowledge note not found');
    }

    return this.prisma.todoTask.update({
      where: { id: taskId },
      data: { knowledgeNoteId: noteId },
      select: TASK_SELECT,
    });
  }

  // ---- AI Reschedule ----

  async getTasksForReschedule(userId: string): Promise<any[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Prefer tasks due today, fall back to any open tasks
    let tasks = await this.prisma.todoTask.findMany({
      where: {
        list: { userId },
        status: { in: [TodoStatus.TODO, TodoStatus.IN_PROGRESS] },
        dueAt: { gte: today, lt: tomorrow },
      },
      select: TASK_SELECT,
      take: 20,
      orderBy: [{ priority: 'desc' }, { updatedAt: 'desc' }],
    });

    if (tasks.length < 3) {
      tasks = await this.prisma.todoTask.findMany({
        where: {
          list: { userId },
          status: { in: [TodoStatus.TODO, TodoStatus.IN_PROGRESS] },
        },
        select: TASK_SELECT,
        take: 20,
        orderBy: [{ dueAt: 'asc' }, { priority: 'desc' }, { updatedAt: 'desc' }],
      });
    }

    return tasks;
  }
}
