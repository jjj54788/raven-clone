import { PrismaClient } from '@prisma/client';

// 全局单例 Prisma Client
const prisma = new PrismaClient();

export default prisma;
