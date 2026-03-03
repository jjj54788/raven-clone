import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OpenClawKeyGuard } from './openclaw.guard';
import { OpenClawService } from './openclaw.service';
import { CreateOpenClawNoteDto } from './dto/create-note.dto';
import { CreateOpenClawTodoDto } from './dto/create-todo.dto';
import { ListOpenClawNotesQueryDto } from './dto/list-notes.dto';

@Controller('api/v1/openclaw')
export class OpenClawController {
  constructor(private readonly openclawService: OpenClawService) {}

  /** Public status for logged-in Gewu users — uses JWT, not bridge key */
  @Get('bridge-status')
  @UseGuards(JwtAuthGuard)
  bridgeStatus() {
    const bridgeConfigured = Boolean(process.env.OPENCLAW_BRIDGE_KEY?.trim());
    const hasBridgeUser = Boolean(
      process.env.OPENCLAW_BRIDGE_USER_EMAIL?.trim() ||
      process.env.OPENCLAW_BRIDGE_USER_ID?.trim(),
    );
    return { bridgeConfigured, hasBridgeUser };
  }

  @Get('health')
  @UseGuards(OpenClawKeyGuard)
  health() {
    return { status: 'ok' };
  }

  @Post('notes')
  @UseGuards(OpenClawKeyGuard)
  createNote(@Body() body: CreateOpenClawNoteDto) {
    return this.openclawService.createNote(body);
  }

  @Get('notes')
  @UseGuards(OpenClawKeyGuard)
  listNotes(@Query() query: ListOpenClawNotesQueryDto) {
    return this.openclawService.listNotes(query);
  }

  @Post('todos')
  @UseGuards(OpenClawKeyGuard)
  createTodo(@Body() body: CreateOpenClawTodoDto) {
    return this.openclawService.createTodo(body);
  }
}
