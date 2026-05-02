import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { FolderVisibility, Prisma, UserRole } from '@prisma/client';

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
  createdBy: {
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      avatarUrl: true,
      createdAt: true,
      updatedAt: true,
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

  async create(user: AuthenticatedUser, dto: CreateFolderDto) {
    await this.ensureSectorCreateAccess(user, dto.sectorId);
    return this.prisma.projectFolder.create({
      data: {
        name: dto.name.trim(),
        sectorId: dto.sectorId,
        visibility: dto.visibility ?? FolderVisibility.SECTOR,
        createdById: user.id,
      },
      include: folderInclude,
    });
  }

  async update(user: AuthenticatedUser, id: string, dto: UpdateFolderDto) {
    await this.ensureFolderManageAccess(user, id);
    if (dto.sectorId) {
      await this.ensureSectorCreateAccess(user, dto.sectorId);
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

  async remove(user: AuthenticatedUser, id: string) {
    await this.ensureFolderManageAccess(user, id);
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

  private async ensureSectorExists(id: string) {
    const sector = await this.prisma.sector.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!sector) {
      throw new NotFoundException('Setor nao encontrado.');
    }
  }

  private async ensureSectorCreateAccess(user: AuthenticatedUser, sectorId: string) {
    await this.ensureSectorExists(sectorId);

    const membership = await this.prisma.userSector.findUnique({
      where: {
        userId_sectorId: {
          userId: user.id,
          sectorId,
        },
      },
      select: { id: true },
    });

    if (!membership) {
      throw new ForbiddenException(
        'Voce so pode criar pastas em setores vinculados ao seu usuario.',
      );
    }
  }

  private async ensureFolderManageAccess(user: AuthenticatedUser, folderId: string) {
    const folder = await this.prisma.projectFolder.findUnique({
      where: { id: folderId },
      select: {
        id: true,
        sectorId: true,
        createdById: true,
      },
    });

    if (!folder) {
      throw new NotFoundException('Pasta nao encontrada.');
    }

    if (folder.createdById === user.id) {
      return;
    }

    if (user.role !== UserRole.ADMIN) {
      throw new ForbiddenException(
        'Apenas o criador da pasta pode alterar ou apagar esta pasta.',
      );
    }

    const membership = await this.prisma.userSector.findUnique({
      where: {
        userId_sectorId: {
          userId: user.id,
          sectorId: folder.sectorId,
        },
      },
      select: { id: true },
    });

    if (!membership) {
      throw new ForbiddenException(
        'Admin so pode gerenciar pastas dos setores vinculados ao proprio usuario.',
      );
    }
  }
}
