import { Injectable, Logger } from '@nestjs/common';
import type { Response } from 'express';

type StreamEventPayload = {
  event: string;
  data: unknown;
};

@Injectable()
export class DebateStreamService {
  private readonly logger = new Logger(DebateStreamService.name);
  private readonly streams = new Map<string, Set<Response>>();

  addStream(sessionId: string, res: Response) {
    res.status(200);
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    const set = this.streams.get(sessionId) ?? new Set<Response>();
    set.add(res);
    this.streams.set(sessionId, set);

    res.write(`event: ready\ndata: ${JSON.stringify({ ok: true })}\n\n`);

    res.on('close', () => {
      this.removeStream(sessionId, res);
    });
  }

  emit(sessionId: string, event: string, data: unknown) {
    const set = this.streams.get(sessionId);
    if (!set || set.size === 0) return;
    const payload = this.formatPayload({ event, data });
    for (const res of set) {
      try {
        res.write(payload);
      } catch (err) {
        this.logger.warn(`Failed to write SSE event ${event}: ${String(err)}`);
      }
    }
  }

  private removeStream(sessionId: string, res: Response) {
    const set = this.streams.get(sessionId);
    if (!set) return;
    set.delete(res);
    if (set.size === 0) {
      this.streams.delete(sessionId);
    }
  }

  private formatPayload(payload: StreamEventPayload) {
    const safe = JSON.stringify(payload.data ?? {});
    return `event: ${payload.event}\ndata: ${safe}\n\n`;
  }
}
