import { Controller, Post, Get, Body, Req, Res, HttpCode } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import prisma from '../prisma/prisma.service';

const JWT_SECRET = () => process.env.JWT_SECRET || 'raven-secret';

// 生成 token 对
function generateTokens(userId: string) {
  const accessToken = jwt.sign({ sub: userId }, JWT_SECRET(), { expiresIn: '7d' });
  const refreshToken = jwt.sign({ sub: userId, type: 'refresh' }, JWT_SECRET(), { expiresIn: '30d' });
  return { accessToken, refreshToken };
}

// JWT 验证中间件（供其他模块使用）
export function verifyToken(token: string): string | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET()) as any;
    return decoded.sub;
  } catch {
    return null;
  }
}

// 从请求头提取 userId
export function getUserIdFromReq(req: any): string | null {
  const auth = req.headers?.authorization;
  if (!auth?.startsWith('Bearer ')) return null;
  return verifyToken(auth.slice(7));
}

@Controller('api/v1/auth')
export class AuthController {
  @Post('register')
  async register(@Body() body: { email: string; name: string; password: string }, @Res() res: any) {
    try {
      const existing = await prisma.user.findUnique({ where: { email: body.email } });
      if (existing) {
        return res.status(400).json({ message: 'Email already registered' });
      }

      const hash = await bcrypt.hash(body.password, 10);
      const user = await prisma.user.create({
        data: { email: body.email, name: body.name, password: hash },
      });

      const tokens = generateTokens(user.id);
      return res.json({
        user: { id: user.id, email: user.email, name: user.name, credits: user.credits },
        ...tokens,
      });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  }

  @Post('login')
  async login(@Body() body: { email: string; password: string }, @Res() res: any) {
    try {
      const user = await prisma.user.findUnique({ where: { email: body.email } });
      if (!user) {
        return res.status(401).json({ message: 'Invalid email or password' });
      }

      const valid = await bcrypt.compare(body.password, user.password);
      if (!valid) {
        return res.status(401).json({ message: 'Invalid email or password' });
      }

      const tokens = generateTokens(user.id);
      return res.json({
        user: { id: user.id, email: user.email, name: user.name, credits: user.credits },
        ...tokens,
      });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  }

  @Get('me')
  async me(@Req() req: any, @Res() res: any) {
    const userId = getUserIdFromReq(req);
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    return res.json({ id: user.id, email: user.email, name: user.name, credits: user.credits });
  }
}
