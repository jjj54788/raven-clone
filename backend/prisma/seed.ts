import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash('admin123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@raven.local' },
    update: {},
    create: {
      email: 'admin@raven.local',
      name: 'Admin',
      password: hash,
      credits: 9999,
    },
  });

  console.log('✅ Seed complete. Default user:', admin.email, '/ admin123');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
