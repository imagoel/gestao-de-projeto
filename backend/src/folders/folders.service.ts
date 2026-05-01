import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { FolderVisibility, Prisma } from '@prisma/client';

import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { ProjectAccessService } from '../common/services/project-access.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFolderDto } from './dto/create-folder.dto';
import { UpdateFolderDto } from './dto/update-folder.dto';

const folderInclude = {
  sector: {
    include: {
      secretariat: true,
    },
  },
} satisfies Prisma.ProjectFolderInclude;

@Injectable()
export class FoldersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly projectAccessService: ProjectAccessService,
  ) {}

  findAll(user: AuthenticatedUser) {
    return this.prisma.projectFolder.findMany({
      where: this.projectAccessService.buildFolderAccessWhere(user),
      include: folderInclude,
      orderBy: [
        { sector: { secretariat: { name: 'asc' } } },
        { sector: { name: 'asc' } },
        { name: 'asc' },
      ],
    });
  }

  async create(dto: CreateFolderDto) {
    await this.ensureSectorExists(dto.sectorId);
    return this.prisma.projectFolder.create({
      data: {
        name: dto.name.trim(),
        sectorId: dto.sectorId,
        visibility: dto.visibility ?? FolderVisibility.SECTOR,
      },
      include: folderInclude,
    });
  }

  async update(id: string, dto: UpdateFolderDto) {
    await this.ensureExists(id);
    if (dto.sectorId) {
      await this.ensureSectorExists(dto.sectorId);
    }

    return this.prisma.projectFolder.update({
      where: { id },
      data: {
        name: dto.name?.trim(),
        sectorId: dto.sectorId,
        visibility: dto.visibility,
      },
      include: folderInclude,
    });
  }

  async remove(id: string) {
    await this.ensureExists(id);
    const projectCount = await this.prisma.project.count({
      where: { folderId: id },
    });

    if (projectCount > 0) {
      throw new BadRequestException(
        'Nao e possivel apagar uma pasta que ainda possui projetos.',
      );
    }

    await this.prisma.projectFolder.delete({ where: { id } });
    return { success: true };
  }

  private async ensureExists(id: string) {
    const folder = await this.prisma.projectFolder.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!folder) throw new NotFoundException('Pasta nao encontrada.');
  }

  private async ensureSectorExists(id: string) {
    const sector = await this.prisma.sector.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!sector) {
      throw new NotFoundException('Setor nao encontrado.');
    }
  }
}
