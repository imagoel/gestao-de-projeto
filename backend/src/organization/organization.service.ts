import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { CreateSecretariatDto } from './dto/create-secretariat.dto';
import { CreateSectorDto } from './dto/create-sector.dto';
import { UpdateSecretariatDto } from './dto/update-secretariat.dto';
import { UpdateSectorDto } from './dto/update-sector.dto';

const secretariatInclude = {
  sectors: {
    orderBy: { name: 'asc' },
  },
} satisfies Prisma.SecretariatInclude;

@Injectable()
export class OrganizationService {
  constructor(private readonly prisma: PrismaService) {}

  findAllSecretariats() {
    return this.prisma.secretariat.findMany({
      include: secretariatInclude,
      orderBy: { name: 'asc' },
    });
  }

  async createSecretariat(dto: CreateSecretariatDto) {
    await this.ensureSecretariatNameAvailable(dto.name);
    return this.prisma.secretariat.create({
      data: { name: dto.name.trim() },
      include: secretariatInclude,
    });
  }

  async updateSecretariat(id: string, dto: UpdateSecretariatDto) {
    await this.ensureSecretariatExists(id);
    await this.ensureSecretariatNameAvailable(dto.name, id);
    return this.prisma.secretariat.update({
      where: { id },
      data: { name: dto.name.trim() },
      include: secretariatInclude,
    });
  }

  async deleteSecretariat(id: string) {
    const secretariat = await this.prisma.secretariat.findUnique({
      where: { id },
      select: {
        id: true,
        sectors: {
          select: {
            _count: {
              select: {
                folders: true,
                userMemberships: true,
              },
            },
          },
        },
      },
    });

    if (!secretariat) {
      throw new NotFoundException('Secretaria nao encontrada.');
    }

    const hasUsage = secretariat.sectors.some(
      (sector) =>
        sector._count.folders > 0 || sector._count.userMemberships > 0,
    );

    if (hasUsage) {
      throw new BadRequestException(
        'Nao e possivel apagar uma secretaria com setores em uso.',
      );
    }

    await this.prisma.secretariat.delete({ where: { id } });
    return { success: true };
  }

  async createSector(dto: CreateSectorDto) {
    await this.ensureSecretariatExists(dto.secretariatId);
    await this.ensureSectorNameAvailable(dto.secretariatId, dto.name);
    return this.prisma.sector.create({
      data: {
        name: dto.name.trim(),
        secretariatId: dto.secretariatId,
      },
      include: { secretariat: true },
    });
  }

  async updateSector(id: string, dto: UpdateSectorDto) {
    const sector = await this.ensureSectorExists(id);
    const targetSecretariatId = dto.secretariatId ?? sector.secretariatId;

    if (dto.secretariatId) {
      await this.ensureSecretariatExists(dto.secretariatId);
    }

    if (dto.name) {
      await this.ensureSectorNameAvailable(targetSecretariatId, dto.name, id);
    }

    return this.prisma.sector.update({
      where: { id },
      data: {
        name: dto.name?.trim(),
        secretariatId: dto.secretariatId,
      },
      include: { secretariat: true },
    });
  }

  async deleteSector(id: string) {
    const sector = await this.prisma.sector.findUnique({
      where: { id },
      select: {
        id: true,
        _count: {
          select: {
            folders: true,
            userMemberships: true,
          },
        },
      },
    });

    if (!sector) {
      throw new NotFoundException('Setor nao encontrado.');
    }

    if (sector._count.folders > 0 || sector._count.userMemberships > 0) {
      throw new BadRequestException(
        'Nao e possivel apagar um setor vinculado a pastas ou usuarios.',
      );
    }

    await this.prisma.sector.delete({ where: { id } });
    return { success: true };
  }

  private async ensureSecretariatExists(id: string) {
    const secretariat = await this.prisma.secretariat.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!secretariat) {
      throw new NotFoundException('Secretaria nao encontrada.');
    }

    return secretariat;
  }

  private async ensureSectorExists(id: string) {
    const sector = await this.prisma.sector.findUnique({
      where: { id },
      select: { id: true, secretariatId: true },
    });

    if (!sector) {
      throw new NotFoundException('Setor nao encontrado.');
    }

    return sector;
  }

  private async ensureSecretariatNameAvailable(name: string, ignoreId?: string) {
    const existing = await this.prisma.secretariat.findUnique({
      where: { name: name.trim() },
      select: { id: true },
    });

    if (existing && existing.id !== ignoreId) {
      throw new ConflictException('Ja existe uma secretaria com este nome.');
    }
  }

  private async ensureSectorNameAvailable(
    secretariatId: string,
    name: string,
    ignoreId?: string,
  ) {
    const existing = await this.prisma.sector.findUnique({
      where: {
        secretariatId_name: {
          secretariatId,
          name: name.trim(),
        },
      },
      select: { id: true },
    });

    if (existing && existing.id !== ignoreId) {
      throw new ConflictException('Ja existe um setor com este nome nesta secretaria.');
    }
  }
}
