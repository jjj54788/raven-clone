import { Controller, Get, Post, Delete, Param, Req, Res } from '@nestjs/common';
import { getUserIdFromReq } from '../auth/auth.controller';
import prisma from '../prisma/prisma.service';

@Controller('api/v1/ask')
export class AskController {
  // 获取当前用户的所有会话
  @Get('sessions')
  async getSessions(@Req() req: any, @Res() res: any) {
    const userId = getUserIdFromReq(req);
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const sessions = await prisma.session.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        title: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { messages: true } },
      },
    });

    return res.json(sessions);
  }

  // 创建新会话
  @Post('sessions')
  async createSession(@Req() req: any, @Res() res: any) {
    const userId = getUserIdFromReq(req);
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const session = await prisma.session.create({
      data: { userId, title: 'New Chat' },
    });

    return res.json(session);
  }

  // 获取某个会话的消息
  @Get('sessions/:id/messages')
  async getMessages(@Param('id') id: string, @Req() req: any, @Res() res: any) {
    const userId = getUserIdFromReq(req);
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    // 验证会话属于当前用户
    const session = await prisma.session.findFirst({ where: { id, userId } });
    if (!session) return res.status(404).json({ message: 'Session not found' });

    const messages = await prisma.message.findMany({
      where: { sessionId: id },
      orderBy: { createdAt: 'asc' },
    });

    return res.json(messages);
  }

  // 删除会话
  @Delete('sessions/:id')
  async deleteSession(@Param('id') id: string, @Req() req: any, @Res() res: any) {
    const userId = getUserIdFromReq(req);
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const session = await prisma.session.findFirst({ where: { id, userId } });
    if (!session) return res.status(404).json({ message: 'Session not found' });

    await prisma.session.delete({ where: { id } });
    return res.json({ message: 'Deleted' });
  }
}
