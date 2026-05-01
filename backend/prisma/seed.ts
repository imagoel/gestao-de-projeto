import { UserRole } from '@prisma/client';
import { hash } from 'bcryptjs';

import { PrismaService } from '../src/prisma/prisma.service';

const INITIAL_ORGANIZATION: Record<string, string[]> = {
  GTI: ['GTI'],
  PREFEITO: [
    'ASCOM',
    'ASSES',
    'CGB',
    'CGM',
    'CGP',
    'Conselhos Municipais',
    'Gab V. Prefeito',
    'PIM',
    'RECEP',
  ],
  SADS: [
    'AFIN',
    'COMP',
    'CONT',
    'DEMAS',
    'DIHAB',
    'DPSAC',
    'DPSB',
    'DPSE',
    'GEPAT',
    'GETRAB',
    'GEVIS',
    'PBF',
    'PUBLICO',
    'SAS',
    'SUDES',
    'SUHAB',
  ],
  SEAFI: [],
  SEAMA: [],
  SECAC: [],
  SEMED: [],
  SEMOP: [],
  SESAU: [],
};

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

  const admin = await prisma.user.upsert({
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

  for (const [secretariatName, sectorNames] of Object.entries(INITIAL_ORGANIZATION)) {
    const secretariat = await prisma.secretariat.upsert({
      where: { name: secretariatName },
      update: {},
      create: { name: secretariatName },
    });

    for (const sectorName of sectorNames) {
      const sector = await prisma.sector.upsert({
        where: {
          secretariatId_name: {
            secretariatId: secretariat.id,
            name: sectorName,
          },
        },
        update: {},
        create: {
          name: sectorName,
          secretariatId: secretariat.id,
        },
      });

      if (secretariatName === 'GTI' && sectorName === 'GTI') {
        await prisma.userSector.upsert({
          where: {
            userId_sectorId: {
              userId: admin.id,
              sectorId: sector.id,
            },
          },
          update: {},
          create: {
            userId: admin.id,
            sectorId: sector.id,
          },
        });
      }
    }
  }

  await prisma.$disconnect();
}

void main();
