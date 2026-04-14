import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, ProjectRole, UserRole } from '@prisma/client';

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
    if (user.role === UserRole.ADMIN) {
      return;
    }

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

    if (project.ownerId === user.id) {
      return;
    }

    const membershipRole = project.members[0]?.role;

    if (membershipRole === ProjectRole.VIEWER) {
      throw new ForbiddenException('Participantes com perfil VIEWER possuem acesso somente leitura.');
    }
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
    if (user.role === UserRole.ADMIN) {
      return projectId ? { id: projectId } : {};
    }

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
      ],
    };

    if (!projectId) {
      return restrictedWhere;
    }

    return {
      AND: [{ id: projectId }, restrictedWhere],
    };
  }
}
