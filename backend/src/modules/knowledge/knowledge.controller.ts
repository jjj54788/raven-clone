import { Controller, Get, Post, Patch, Delete, Query, Body, Param, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { KnowledgeService } from './knowledge.service';
import { ListKnowledgeNotesQueryDto } from './dto/list-notes.dto';
import { CreateKnowledgeNoteDto } from './dto/create-note.dto';
import { UpdateKnowledgeNoteDto } from './dto/update-note.dto';
import { SearchKnowledgeNotesDto } from './dto/search-notes.dto';

@Controller('api/v1/knowledge')
@UseGuards(JwtAuthGuard)
export class KnowledgeController {
  constructor(private readonly knowledgeService: KnowledgeService) {}

  @Get('notes')
  listNotes(@CurrentUser() userId: string, @Query() query: ListKnowledgeNotesQueryDto) {
    return this.knowledgeService.listNotes(userId, query);
  }

  @Post('notes')
  createNote(@CurrentUser() userId: string, @Body() body: CreateKnowledgeNoteDto) {
    return this.knowledgeService.createNote(userId, body);
  }

  @Patch('notes/:id')
  updateNote(
    @CurrentUser() userId: string,
    @Param('id') noteId: string,
    @Body() body: UpdateKnowledgeNoteDto,
  ) {
    return this.knowledgeService.updateNote(userId, noteId, body);
  }

  @Delete('notes/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteNote(@CurrentUser() userId: string, @Param('id') noteId: string) {
    return this.knowledgeService.deleteNote(userId, noteId);
  }

  // ---- RAG ----

  @Post('search')
  semanticSearch(@CurrentUser() userId: string, @Body() body: SearchKnowledgeNotesDto) {
    return this.knowledgeService.semanticSearch(userId, body.q, body.take);
  }

  @Get('embed-status')
  embedStatus(@CurrentUser() userId: string) {
    return this.knowledgeService.getEmbedStats(userId);
  }

  @Post('notes/:id/embed')
  embedNote(@CurrentUser() userId: string, @Param('id') noteId: string) {
    return this.knowledgeService.embedNote(userId, noteId);
  }
}
