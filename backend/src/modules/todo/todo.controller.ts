import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { TodoService } from './todo.service';
import { CreateTodoListDto } from './dto/create-list.dto';
import { UpdateTodoListDto } from './dto/update-list.dto';
import { CreateTodoTaskDto } from './dto/create-task.dto';
import { UpdateTodoTaskDto } from './dto/update-task.dto';
import { ListTodoTasksQueryDto } from './dto/list-tasks-query.dto';

@Controller('api/v1/todos')
@UseGuards(JwtAuthGuard)
export class TodoController {
  constructor(private readonly todoService: TodoService) {}

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
}
