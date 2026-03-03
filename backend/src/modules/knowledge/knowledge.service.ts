import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { KnowledgeEmbeddingService } from './knowledge-embedding.service';
import { ListKnowledgeNotesQueryDto } from './dto/list-notes.dto';
import { CreateKnowledgeNoteDto } from './dto/create-note.dto';
import { UpdateKnowledgeNoteDto } from './dto/update-note.dto';

// NOTE: embeddedAt is a new field; run `prisma generate` after migration to get full types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const NOTE_SELECT: any = {
  id: true,
  title: true,
  content: true,
  source: true,
  sourceUrl: true,
  tags: true,
  metadata: true,
  embeddedAt: true,
  createdAt: true,
  updatedAt: true,
};

@Injectable()
export class KnowledgeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly embedding: KnowledgeEmbeddingService,
  ) {}

  async listNotes(userId: string, query: ListKnowledgeNotesQueryDto) {
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
      select: NOTE_SELECT,
    });
  }

  async createNote(userId: string, dto: CreateKnowledgeNoteDto) {
    const note = await this.prisma.knowledgeNote.create({
      data: {
        userId,
        title: dto.title,
        content: dto.content,
        source: dto.source,
        sourceUrl: dto.sourceUrl,
        tags: dto.tags ?? [],
      },
      select: NOTE_SELECT,
    });
    // Fire-and-forget: embed in background
    this.embedding.embedNoteAsync((note as any).id);
    return note;
  }

  async updateNote(userId: string, noteId: string, dto: UpdateKnowledgeNoteDto) {
    await this.assertOwnership(userId, noteId);
    const updated = await this.prisma.knowledgeNote.update({
      where: { id: noteId },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.content !== undefined && { content: dto.content }),
        ...(dto.source !== undefined && { source: dto.source }),
        ...(dto.sourceUrl !== undefined && { sourceUrl: dto.sourceUrl }),
        ...(dto.tags !== undefined && { tags: dto.tags }),
        // Reset embedding when content changes
        ...((dto.title !== undefined || dto.content !== undefined) && {
          embedding: [],
          embeddedAt: null,
        }),
      },
      select: NOTE_SELECT,
    });
    // Re-embed if content changed
    if (dto.title !== undefined || dto.content !== undefined) {
      this.embedding.embedNoteAsync(noteId);
    }
    return updated;
  }

  async deleteNote(userId: string, noteId: string) {
    await this.assertOwnership(userId, noteId);
    await this.prisma.knowledgeNote.delete({ where: { id: noteId } });
  }

  async embedNote(userId: string, noteId: string) {
    await this.assertOwnership(userId, noteId);
    const success = await this.embedding.embedNote(noteId);
    return { success };
  }

  async semanticSearch(userId: string, query: string, take = 10) {
    const results = await this.embedding.semanticSearch(userId, query, take);
    if (results.length === 0) return [];

    const noteIds = results.map((r) => r.noteId);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const notes: any[] = await this.prisma.knowledgeNote.findMany({
      where: { id: { in: noteIds } },
      select: NOTE_SELECT,
    });

    // Preserve order by score
    const noteMap = new Map<string, any>(notes.map((n) => [n.id, n]));
    return results
      .map((r) => {
        const note = noteMap.get(r.noteId);
        if (!note) return null;
        return { ...note, score: r.score };
      })
      .filter(Boolean);
  }

  async getEmbedStats(userId: string) {
    return this.embedding.getEmbedStats(userId);
  }

  private async assertOwnership(userId: string, noteId: string) {
    const note = await this.prisma.knowledgeNote.findUnique({
      where: { id: noteId },
      select: { userId: true },
    });
    if (!note) throw new NotFoundException('Note not found');
    if (note.userId !== userId) throw new NotFoundException('Note not found');
  }
}
