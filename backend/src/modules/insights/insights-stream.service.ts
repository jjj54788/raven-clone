import { Injectable, Logger } from '@nestjs/common';
import type { Response } from 'express';

@Injectable()
export class InsightStreamService {
  private readonly logger = new Logger(InsightStreamService.name);
  private readonly streams = new Map<string, Set<Response>>();

  addStream(topicId: string, res: Response) {
    res.status(200);
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    const set = this.streams.get(topicId) ?? new Set<Response>();
    set.add(res);
    this.streams.set(topicId, set);

    res.write(`event: ready\ndata: ${JSON.stringify({ ok: true })}\n\n`);

    res.on('close', () => {
      this.removeStream(topicId, res);
    });
  }

  emit(topicId: string, event: string, data: unknown) {
    const set = this.streams.get(topicId);
    if (!set || set.size === 0) return;
    const payload = `event: ${event}\ndata: ${JSON.stringify(data ?? {})}\n\n`;
    for (const res of set) {
      try {
        res.write(payload);
      } catch (err) {
        this.logger.warn(`Failed to write SSE event ${event}: ${String(err)}`);
      }
    }
  }

  private removeStream(topicId: string, res: Response) {
    const set = this.streams.get(topicId);
    if (!set) return;
    set.delete(res);
    if (set.size === 0) this.streams.delete(topicId);
  }
}
