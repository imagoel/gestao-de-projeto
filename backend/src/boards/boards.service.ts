import { Injectable, NotFoundException } from '@nestjs/common';

import { ProjectAccessService } from '../common/services/project-access.service';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { PrismaService } from '../prisma/prisma.service';
import { publicUserSelect } from '../users/user-select';

@Injectable()
export class BoardsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly projectAccessService: ProjectAccessService,
  ) {}

  async findProjectBoard(user: AuthenticatedUser, projectId: string) {
    await this.projectAccessService.ensureProjectAccess(user, projectId);

    const board = await this.prisma.board.findUnique({
      where: {
        projectId,
      },
      include: {
        columns: {
          orderBy: {
            position: 'asc',
          },
          include: {
            cards: {
              where: {
                archived: false,
              },
              orderBy: {
                position: 'asc',
              },
              include: {
                assignee: {
                  select: publicUserSelect,
                },
              },
            },
          },
        },
      },
    });

    if (!board) {
      throw new NotFoundException('Board do projeto nao encontrado.');
    }

    return board;
  }
}
