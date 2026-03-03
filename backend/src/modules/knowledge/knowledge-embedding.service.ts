import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const EMBEDDING_MODEL = 'text-embedding-3-small';
const EMBEDDING_DIMS = 1536;
// Max characters to embed (avoid token limit issues; ~4 chars ≈ 1 token, limit 8192 tokens)
const MAX_EMBED_CHARS = 24_000;

@Injectable()
export class KnowledgeEmbeddingService {
  private readonly logger = new Logger(KnowledgeEmbeddingService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ---- Public API ----

  /** Generate an embedding vector for the given text. Returns null if API is unavailable. */
  async generateEmbedding(text: string): Promise<number[] | null> {
    const apiKey = process.env.OPENAI_API_KEY?.trim();
    if (!apiKey) return null;

    const truncated = text.slice(0, MAX_EMBED_CHARS).replace(/\n+/g, ' ').trim();
    if (!truncated) return null;

    try {
      const res = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ model: EMBEDDING_MODEL, input: truncated }),
        signal: AbortSignal.timeout(30_000),
      });

      if (!res.ok) {
        const body = await res.text().catch(() => '');
        this.logger.warn(`Embedding API error ${res.status}: ${body.slice(0, 200)}`);
        return null;
      }

      const data = (await res.json()) as { data: Array<{ embedding: number[] }> };
      return data?.data?.[0]?.embedding ?? null;
    } catch (err) {
      this.logger.warn(`Embedding generation failed: ${String(err)}`);
      return null;
    }
  }

  /** Embed a single note and persist the vector. Returns true if embedded. */
  async embedNote(noteId: string): Promise<boolean> {
    const note = await this.prisma.knowledgeNote.findUnique({
      where: { id: noteId },
      select: { id: true, title: true, content: true },
    });
    if (!note) return false;

    const text = `${note.title}\n\n${note.content}`;
    const embedding = await this.generateEmbedding(text);
    if (!embedding) return false;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (this.prisma.knowledgeNote.update as any)({
      where: { id: noteId },
      data: { embedding, embeddedAt: new Date() },
    });
    return true;
  }

  /** Embed a note in the background (fire-and-forget, no throw). */
  embedNoteAsync(noteId: string): void {
    this.embedNote(noteId).catch((err) =>
      this.logger.warn(`Background embedding failed for note ${noteId}: ${String(err)}`),
    );
  }

  /** Semantic search: returns noteIds sorted by cosine similarity, top-k. */
  async semanticSearch(
    userId: string,
    queryText: string,
    take = 10,
    threshold = 0.3,
  ): Promise<{ noteId: string; score: number }[]> {
    const queryVec = await this.generateEmbedding(queryText);
    if (!queryVec) return [];

    // Load all embedded notes for this user
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const notes: Array<{ id: string; embedding: number[] }> = await (this.prisma.knowledgeNote.findMany as any)({
      where: { userId, NOT: { embeddedAt: null } },
      select: { id: true, embedding: true },
    });

    if (notes.length === 0) return [];

    const scored = notes
      .map((n) => ({
        noteId: n.id,
        score: this.cosineSimilarity(queryVec, n.embedding),
      }))
      .filter((r) => r.score >= threshold)
      .sort((a, b) => b.score - a.score)
      .slice(0, take);

    return scored;
  }

  /** Get embedding statistics for a user. */
  async getEmbedStats(userId: string): Promise<{ total: number; embedded: number; ready: boolean }> {
    const [total, embedded] = await Promise.all([
      this.prisma.knowledgeNote.count({ where: { userId } }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (this.prisma.knowledgeNote.count as any)({ where: { userId, NOT: { embeddedAt: null } } }),
    ]);
    return { total, embedded, ready: process.env.OPENAI_API_KEY ? true : false };
  }

  // ---- Math Helpers ----

  cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length || a.length === 0) return 0;
    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    const denom = Math.sqrt(normA) * Math.sqrt(normB);
    return denom === 0 ? 0 : dot / denom;
  }
}
