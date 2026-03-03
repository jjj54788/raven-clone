import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { TodoService } from './todo.service';
import { CreateTodoListDto } from './dto/create-list.dto';
import { UpdateTodoListDto } from './dto/update-list.dto';
import { CreateTodoTaskDto } from './dto/create-task.dto';
import { UpdateTodoTaskDto } from './dto/update-task.dto';
import { ListTodoTasksQueryDto } from './dto/list-tasks-query.dto';
import { CreateSubTaskDto } from './dto/create-subtask.dto';
import { UpdateSubTaskDto } from './dto/update-subtask.dto';
import { BatchTasksDto } from './dto/batch-tasks.dto';
import { DecomposeTodoDto } from './dto/decompose-todo.dto';
import { AiService } from '../ai/ai.service';

@Controller('api/v1/todos')
@UseGuards(JwtAuthGuard)
export class TodoController {
  constructor(
    private readonly todoService: TodoService,
    private readonly aiService: AiService,
  ) {}

  @Get('overview')
  async getOverview(@CurrentUser() userId: string) {
    return this.todoService.getOverview(userId);
  }

  // ---- Lists ----
  @Get('lists')
  async listLists(@CurrentUser() userId: string) {
    return this.todoService.listLists(userId);
  }

  @Post('lists')
  async createList(@CurrentUser() userId: string, @Body() body: CreateTodoListDto) {
    return this.todoService.createList(userId, body);
  }

  @Patch('lists/:id')
  async updateList(@CurrentUser() userId: string, @Param('id') id: string, @Body() body: UpdateTodoListDto) {
    return this.todoService.updateList(userId, id, body);
  }

  @Delete('lists/:id')
  async deleteList(@CurrentUser() userId: string, @Param('id') id: string) {
    return this.todoService.deleteList(userId, id);
  }

  // ---- Tasks ----
  @Get('tasks')
  async listTasks(@CurrentUser() userId: string, @Query() query: ListTodoTasksQueryDto) {
    return this.todoService.listTasks(userId, query);
  }

  @Post('tasks')
  async createTask(@CurrentUser() userId: string, @Body() body: CreateTodoTaskDto) {
    return this.todoService.createTask(userId, body);
  }

  @Patch('tasks/:id')
  async updateTask(@CurrentUser() userId: string, @Param('id') id: string, @Body() body: UpdateTodoTaskDto) {
    return this.todoService.updateTask(userId, id, body);
  }

  @Delete('tasks/:id')
  async deleteTask(@CurrentUser() userId: string, @Param('id') id: string) {
    return this.todoService.deleteTask(userId, id);
  }

  // ---- Batch Operations ----
  @Patch('tasks/batch')
  async batchTasks(@CurrentUser() userId: string, @Body() body: BatchTasksDto) {
    return this.todoService.batchTasks(userId, body);
  }

  @Post('tasks/postpone-overdue')
  async postponeOverdue(@CurrentUser() userId: string) {
    return this.todoService.postponeOverdue(userId);
  }

  // ---- Subtasks ----
  @Post('tasks/:taskId/subtasks')
  async createSubtask(
    @CurrentUser() userId: string,
    @Param('taskId') taskId: string,
    @Body() body: CreateSubTaskDto,
  ) {
    return this.todoService.createSubtask(userId, taskId, body);
  }

  @Patch('subtasks/:id')
  async updateSubtask(@CurrentUser() userId: string, @Param('id') id: string, @Body() body: UpdateSubTaskDto) {
    return this.todoService.updateSubtask(userId, id, body);
  }

  @Delete('subtasks/:id')
  async deleteSubtask(@CurrentUser() userId: string, @Param('id') id: string) {
    return this.todoService.deleteSubtask(userId, id);
  }

  // ---- AI Decompose ----
  @Post('tasks/decompose')
  async decomposeTasks(@CurrentUser() userId: string, @Body() body: DecomposeTodoDto) {
    const model = this.aiService.getDefaultModel();
    if (!model) throw new BadRequestException('No AI model configured');

    const systemPrompt = `You are a task planning assistant. The user gives you a goal or project description. Decompose it into 3-7 concrete, actionable tasks.

Output ONLY a valid JSON array with NO markdown fences and NO explanation:
[
  {
    "title": "Task title (max 100 characters, concise and actionable)",
    "description": "Optional one-line context",
    "priority": 2,
    "daysFromNow": 3,
    "subtasks": ["Subtask 1", "Subtask 2"]
  }
]

Rules:
- priority: 0=none, 1=low, 2=medium, 3=high
- daysFromNow: integer ≥ 1, or null if no specific deadline applies
- subtasks: 1-4 concrete steps per task; empty array [] if not needed
- Reply in the SAME language as the user's goal`;

    const userPrompt = `Goal: ${body.goal}`;

    let parsed: unknown;
    try {
      const raw = await this.aiService.chat(model, [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ]);
      const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
      parsed = JSON.parse(cleaned);
      if (!Array.isArray(parsed)) throw new Error('Expected array');
    } catch {
      throw new BadRequestException('AI failed to generate a valid task plan. Please try again.');
    }

    const tasks = await this.todoService.createBulkFromDecomposed(userId, body.listId, parsed as any[]);
    return { tasks, count: tasks.length };
  }

  // ---- AI Reschedule ----
  @Post('reschedule')
  async reschedule(@CurrentUser() userId: string) {
    const tasks = await this.todoService.getTasksForReschedule(userId);
    if (tasks.length === 0) return { ordered: [] };

    const model = this.aiService.getDefaultModel();
    if (!model) {
      return { ordered: tasks.map((t) => ({ task: t, reason: '' })) };
    }

    const taskList = tasks
      .map((t, i) => `${i + 1}. [${t.id}] ${t.title}${t.dueAt ? ` (due: ${new Date(t.dueAt).toISOString().slice(0, 10)})` : ''} priority=${t.priority}`)
      .join('\n');

    const systemPrompt = `You are a productivity coach helping the user prioritize their tasks for today.
Output ONLY a valid JSON array (no markdown fences, no explanation):
[{"taskId":"uuid","rank":1,"reason":"One sentence why this should be done first (≤60 chars)"}]
Include ALL tasks. Reply in the same language as the task titles.`;

    const userPrompt = `Please prioritize these tasks for today:\n${taskList}`;

    try {
      const raw = await this.aiService.chat(model, [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ]);
      const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
      const ordered: Array<{ taskId: string; rank: number; reason: string }> = JSON.parse(cleaned);
      if (!Array.isArray(ordered)) throw new Error('Expected array');

      const taskMap = new Map(tasks.map((t) => [t.id, t]));
      const sorted = ordered
        .filter((o) => taskMap.has(o.taskId))
        .sort((a, b) => a.rank - b.rank)
        .map((o) => ({ task: taskMap.get(o.taskId)!, reason: o.reason || '' }));

      return { ordered: sorted };
    } catch {
      return { ordered: tasks.map((t) => ({ task: t, reason: '' })) };
    }
  }

  // ---- Knowledge Link ----
  @Patch('tasks/:id/link-knowledge')
  async linkKnowledge(
    @CurrentUser() userId: string,
    @Param('id') taskId: string,
    @Body() body: { noteId: string | null },
  ) {
    return this.todoService.linkKnowledge(userId, taskId, body.noteId ?? null);
  }

  // ---- AI Summary ----
  @Get('summary')
  async getSummary(
    @CurrentUser() userId: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    if (!from || !to) throw new Error('from and to query params are required');

    const { tasks, stats } = await this.todoService.getSummaryData(
      userId,
      new Date(from),
      new Date(to),
    );

    if (stats.total === 0) {
      return { summary: '', stats };
    }

    // Build task data for AI
    const taskLines = tasks.map((t) => {
      const status = t.status === 'DONE' ? '[x]' : '[ ]';
      const due = t.dueAt ? ` (due: ${t.dueAt.toISOString().slice(0, 10)})` : '';
      const list = t.list?.name ? ` [${t.list.name}]` : '';
      return `${status} ${t.title}${due}${list}`;
    });

    const model = this.aiService.getDefaultModel();
    if (!model) {
      return { summary: 'AI model not available. Stats only.', stats };
    }

    const systemPrompt = `You are a productivity coach. Given the user's task summary for a time period, write a brief, encouraging report in markdown. Include: accomplishments, completion rate, patterns, and 2-3 actionable suggestions. Reply in the same language the user data is presented in. Keep it under 300 words.`;

    const userPrompt = `Period: ${from} to ${to}\nCompletion rate: ${stats.completionRate}%\nTotal: ${stats.total}, Completed: ${stats.completed}, Overdue: ${stats.overdue}\n\nTasks:\n${taskLines.join('\n')}`;

    try {
      const summary = await this.aiService.chat(model, [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ]);
      return { summary, stats };
    } catch {
      return { summary: 'Failed to generate AI summary.', stats };
    }
  }
}
