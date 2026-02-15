import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const adminEmail = (process.env.SEED_ADMIN_EMAIL || 'admin@raven.local').trim();
  const defaultPassword = 'admin123';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD?.trim() || defaultPassword;

  if (process.env.NODE_ENV === 'production' && adminPassword === defaultPassword) {
    throw new Error('Refusing to seed default admin password in production. Set SEED_ADMIN_PASSWORD.');
  }

  const hash = await bcrypt.hash(adminPassword, 10);
  const shouldUpdatePassword = Boolean(process.env.SEED_ADMIN_PASSWORD?.trim());
  const updateData: { isAdmin: true; password?: string } = { isAdmin: true };
  if (shouldUpdatePassword) updateData.password = hash;

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: updateData,
    create: {
      email: adminEmail,
      name: 'Admin',
      password: hash,
      credits: 9999,
      isAdmin: true,
    },
  });

  console.log('Seed complete. Default user:', admin.email);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
