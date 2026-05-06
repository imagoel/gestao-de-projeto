import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { FolderVisibility, Prisma, ProjectRole, UserRole } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../interfaces/authenticated-user.interface';

@Injectable()
export class ProjectAccessService {
  constructor(private readonly prisma: PrismaService) {}

  async ensureProjectAccess(user: AuthenticatedUser, projectId: string) {
    const project = await this.prisma.project.findFirst({
      where: this.buildProjectAccessWhere(user, projectId),
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            avatarUrl: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
                avatarUrl: true,
                createdAt: true,
                updatedAt: true,
              },
            },
          },
          orderBy: {
            joinedAt: 'asc',
          },
        },
        folder: {
          include: {
            sector: {
              include: {
                secretariat: true,
              },
            },
          },
        },
      },
    });

    if (!project) {
      throw new ForbiddenException('Projeto indisponivel para este usuario.');
    }

    return project;
  }

  async ensureProjectExists(projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('Projeto nao encontrado.');
    }

    return project;
  }

  async ensureProjectWriteAccess(user: AuthenticatedUser, projectId: string) {
    const project = await this.prisma.project.findFirst({
      where: this.buildProjectAccessWhere(user, projectId),
      select: {
        ownerId: true,
        members: {
          where: {
            userId: user.id,
          },
          select: {
            role: true,
          },
          take: 1,
        },
      },
    });

    if (!project) {
      throw new ForbiddenException('Projeto indisponivel para este usuario.');
    }

    if (user.role === UserRole.ADMIN) {
      return;
    }

    if (project.ownerId === user.id) {
      return;
    }

    const membershipRole = project.members[0]?.role;

    if (membershipRole === ProjectRole.MANAGER || membershipRole === ProjectRole.MEMBER) {
      return;
    }

    throw new ForbiddenException(
      'Apenas participantes do projeto podem editar cards e informacoes.',
    );
  }

  async ensureProjectManageAccess(user: AuthenticatedUser, projectId: string) {
    const project = await this.prisma.project.findFirst({
      where: this.buildProjectAccessWhere(user, projectId),
      select: {
        ownerId: true,
        members: {
          where: {
            userId: user.id,
          },
          select: {
            role: true,
          },
          take: 1,
        },
      },
    });

    if (!project) {
      throw new ForbiddenException('Projeto indisponivel para este usuario.');
    }

    if (user.role === UserRole.ADMIN) {
      return;
    }

    if (project.ownerId === user.id) {
      return;
    }

    if (project.members[0]?.role === ProjectRole.MANAGER) {
      return;
    }

    throw new ForbiddenException(
      'Apenas admins, donos ou gestores do projeto podem gerenciar este projeto.',
    );
  }

  async ensureProjectDeleteAccess(user: AuthenticatedUser, projectId: string) {
    const project = await this.prisma.project.findFirst({
      where: this.buildProjectAccessWhere(user, projectId),
      select: {
        ownerId: true,
        members: {
          where: {
            userId: user.id,
          },
          select: {
            role: true,
          },
          take: 1,
        },
      },
    });

    if (!project) {
      throw new ForbiddenException('Projeto indisponivel para este usuario.');
    }

    if (user.role === UserRole.ADMIN) {
      return;
    }

    if (project.ownerId === user.id) {
      return;
    }

    const membershipRole = project.members[0]?.role;

    if (membershipRole === ProjectRole.MANAGER) {
      return;
    }

    throw new ForbiddenException(
      'Apenas admins com acesso, donos ou gestores do projeto podem apagar este projeto.',
    );
  }

  async ensureAssignableUser(projectId: string, userId: string) {
    const participantCount = await this.prisma.project.count({
      where: {
        id: projectId,
        OR: [
          { ownerId: userId },
          {
            members: {
              some: {
                userId,
                role: {
                  in: [ProjectRole.MANAGER, ProjectRole.MEMBER],
                },
              },
            },
          },
        ],
      },
    });

    if (participantCount === 0) {
      throw new BadRequestException(
        'O responsavel principal do card precisa participar do projeto.',
      );
    }
  }

  buildProjectAccessWhere(
    user: AuthenticatedUser,
    projectId?: string,
  ): Prisma.ProjectWhereInput {
    const restrictedWhere: Prisma.ProjectWhereInput = {
      OR: [
        { ownerId: user.id },
        {
          members: {
            some: {
              userId: user.id,
            },
          },
        },
        {
          folder: {
            is: this.buildFolderAccessWhere(user),
          },
        },
      ],
    };

    if (!projectId) {
      return restrictedWhere;
    }

    return {
      AND: [{ id: projectId }, restrictedWhere],
    };
  }

  buildFolderAccessWhere(user: AuthenticatedUser): Prisma.ProjectFolderWhereInput {
    return {
      OR: [
        {
          visibility: FolderVisibility.SECTOR,
          sector: {
            userMemberships: {
              some: {
                userId: user.id,
              },
            },
          },
        },
        {
          visibility: FolderVisibility.SECRETARIAT,
          sector: {
            secretariat: {
              sectors: {
                some: {
                  userMemberships: {
                    some: {
                      userId: user.id,
                    },
                  },
                },
              },
            },
          },
        },
      ],
    };
  }

  async ensureFolderAccess(user: AuthenticatedUser, folderId: string) {
    const existingFolder = await this.prisma.projectFolder.findUnique({
      where: { id: folderId },
      include: {
        sector: {
          include: {
            secretariat: true,
          },
        },
      },
    });

    if (!existingFolder) {
      throw new NotFoundException('Pasta nao encontrada.');
    }

    const accessibleFolder = await this.prisma.projectFolder.findFirst({
      where: {
        AND: [{ id: folderId }, this.buildFolderAccessWhere(user)],
      },
      select: {
        id: true,
      },
    });

    if (!accessibleFolder) {
      throw new ForbiddenException('Pasta indisponivel para este usuario.');
    }

    return existingFolder;
  }
}
