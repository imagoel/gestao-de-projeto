import { UserRole } from '@prisma/client';
import { hash } from 'bcryptjs';

import { PrismaService } from '../src/prisma/prisma.service';

const INITIAL_ORGANIZATION: Record<string, string[]> = {
  GTI: ['GTI', 'Infra', 'Redes'],
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
  SEAFI: [
    'AJU',
    'ASS. JURIDICA',
    'CCO',
    'CDL',
    'COARQ',
    'COAV',
    'COCAD',
    'COCAI',
    'COCAM',
    'CODIN',
    'COMP',
    'COPAG',
    'COPAT',
    'COREP',
    'DIQUAV',
    'DIREC',
    'DTRIB',
    'DOP',
    'GELIC',
    'GEPLAN',
    'GERAM',
    'GTI',
    'PUBLICO',
    'SIMP',
    'SUCONT',
    'SUCONV',
    'SUDV',
    'SUFIN',
    'SUGEP',
    'SUPLAN',
  ],
  SEAMA: [
    'ASSGABINETE',
    'Assistente T. II',
    'Assistente T.I',
    'CODES',
    'COES',
    'COFISC',
    'COPA',
    'COPAI',
    'COPAN',
    'COPLAC',
    'CORED',
    'COSIM',
    'COVEG',
    'DATER',
    'DIFEL',
    'DIMA',
    'DINFRA',
    'DIPAC',
    'DIPAI',
    'DSIM',
    'PUBLICO',
    'SUAGRO',
    'SUINFRA',
    'SUMA',
    'SUPAC',
  ],
  SECAC: [
    'CASA',
    'CCULT',
    'COEC',
    'COESP',
    'COLAZ',
    'COPES',
    'DASO',
    'DICON',
    'DIEC',
    'DIJU',
    'DIPON',
    'DIRAC',
    'GABINETE',
    'GCM',
    'PUBLICO',
    'SUDEF',
    'SULEG',
    'SUPAR',
    'SUPAT',
    'SUPEL',
    'SUPET',
    'SUPRIN',
    'SUTUR',
  ],
  SEMED: [
    'ACOLHER',
    'AFIN',
    'AGEP',
    'ASSESSORIA JURIDICA',
    'CCONT',
    'CHEPAT',
    'COBIB',
    'COCESP',
    'COCOMP',
    'COCON',
    'COEER',
    'COEJA',
    'COGIE',
    'COINT',
    'COMP',
    'COMUM',
    'CONSELHOS',
    'COPCRE',
    'COPEAF',
    'COPEF-CAM',
    'COPEF-CID',
    'COPEIN',
    'COPI',
    'COPLAM',
    'COPEM',
    'COPRES',
    'COSEC',
    'COTEC',
    'COTRAN',
    'DIAER',
    'DIEJA',
    'DIGESC',
    'DIGIE',
    'DIPI',
    'DIRAD',
    'DIREAF',
    'DIREF-CAM',
    'DIREF-CID',
    'DIREIN',
    'DIRPDDE',
    'DITEG',
    'DITRAN',
    'DIVAP',
    'GAE',
    'PRALER',
    'PUBLICO',
    'RECEPCAO',
    'SUDEF',
    'SUDEIA',
    'SUDEIN',
    'SUGESC',
    'SUPOF',
  ],
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
