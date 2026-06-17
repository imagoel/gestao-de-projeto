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
  parent: {
    include: {
      sector: {
        include: {
          secretariat: true,
        },
      },
    },
  },
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
    const parentFolder = dto.parentId
      ? await this.ensureParentFolderForSubfolder(user, dto.parentId)
      : null;

    if (!parentFolder && !dto.sectorId) {
      throw new BadRequestException('Informe o setor da pasta.');
    }

    const sectorId = parentFolder?.sectorId ?? dto.sectorId!;
    const visibility = parentFolder?.visibility ?? dto.visibility ?? FolderVisibility.SECTOR;

    if (!parentFolder) {
      await this.ensureSectorCreateAccess(user, sectorId);
    }

    return this.prisma.projectFolder.create({
      data: {
        name: dto.name.trim(),
        sectorId,
        visibility,
        parentId: parentFolder?.id,
        createdById: user.id,
      },
      include: folderInclude,
    });
  }

  async update(user: AuthenticatedUser, id: string, dto: UpdateFolderDto) {
    await this.ensureFolderManageAccess(user, id);

    const folder = await this.prisma.projectFolder.findUnique({
      where: { id },
      select: {
        id: true,
        parentId: true,
        sectorId: true,
        visibility: true,
      },
    });

    if (!folder) {
      throw new NotFoundException('Pasta nao encontrada.');
    }

    if (folder.parentId && (dto.sectorId || dto.visibility)) {
      throw new BadRequestException(
        'Subpastas herdam setor e visibilidade da pasta principal.',
      );
    }

    if (dto.sectorId) {
      await this.ensureSectorCreateAccess(user, dto.sectorId);
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.projectFolder.update({
        where: { id },
        data: {
          name: dto.name?.trim(),
          sectorId: dto.sectorId,
          visibility: dto.visibility,
        },
      });

      if (!folder.parentId && (dto.sectorId || dto.visibility)) {
        await tx.projectFolder.updateMany({
          where: { parentId: id },
          data: {
            sectorId: dto.sectorId ?? folder.sectorId,
            visibility: dto.visibility ?? folder.visibility,
          },
        });
      }
    });

    return this.prisma.projectFolder.findUniqueOrThrow({
      where: { id },
      include: folderInclude,
    });
  }

  async remove(user: AuthenticatedUser, id: string) {
    await this.ensureFolderManageAccess(user, id);
    const [projectCount, childCount] = await Promise.all([
      this.prisma.project.count({
        where: { folderId: id },
      }),
      this.prisma.projectFolder.count({
        where: { parentId: id },
      }),
    ]);

    if (childCount > 0) {
      throw new BadRequestException(
        'Nao e possivel apagar uma pasta que ainda possui subpastas.',
      );
    }

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
      select: {
        id: true,
        secretariat: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!sector) {
      throw new NotFoundException('Setor nao encontrado.');
    }

    return sector;
  }

  private async ensureParentFolderForSubfolder(
    user: AuthenticatedUser,
    parentId: string,
  ) {
    await this.ensureFolderManageAccess(user, parentId);

    const parentFolder = await this.prisma.projectFolder.findUnique({
      where: { id: parentId },
      select: {
        id: true,
        parentId: true,
        sectorId: true,
        visibility: true,
      },
    });

    if (!parentFolder) {
      throw new NotFoundException('Pasta principal nao encontrada.');
    }

    if (parentFolder.parentId) {
      throw new BadRequestException(
        'Subpastas podem ser criadas apenas dentro de pastas principais.',
      );
    }

    return parentFolder;
  }

  private async ensureSectorCreateAccess(user: AuthenticatedUser, sectorId: string) {
    const sector = await this.ensureSectorExists(sectorId);

    if (user.role === UserRole.ADMIN && sector.secretariat.name === 'GTI') {
      return;
    }

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
        sector: {
          select: {
            secretariat: {
              select: {
                name: true,
              },
            },
          },
        },
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

    if (folder.sector.secretariat.name === 'GTI') {
      return;
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
