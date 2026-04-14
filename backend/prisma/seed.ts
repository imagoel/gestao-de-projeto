import { UserRole } from '@prisma/client';
import { hash } from 'bcryptjs';

import { PrismaService } from '../src/prisma/prisma.service';

async function main() {
  const prisma = new PrismaService();

  await prisma.$connect();

  const adminName = process.env.SEED_ADMIN_NAME;
  const adminEmail = process.env.SEED_ADMIN_EMAIL;
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;

  if (!adminName || !adminEmail || !adminPassword) {
    throw new Error(
      'SEED_ADMIN_NAME, SEED_ADMIN_EMAIL e SEED_ADMIN_PASSWORD precisam estar definidos.',
    );
  }

  const passwordHash = await hash(adminPassword, 10);

  await prisma.user.upsert({
    where: {
      email: adminEmail,
    },
    update: {
      name: adminName,
      passwordHash,
      role: UserRole.ADMIN,
    },
    create: {
      name: adminName,
      email: adminEmail,
      passwordHash,
      role: UserRole.ADMIN,
    },
  });

  await prisma.$disconnect();
}

void main();
