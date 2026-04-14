import { Injectable, NotFoundException } from '@nestjs/common';

import { DEFAULT_BOARD_COLUMNS } from '../common/constants/default-board-columns';
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
    await this.ensureProjectBoard(projectId);

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

  private async ensureProjectBoard(projectId: string) {
    const existingBoard = await this.prisma.board.findUnique({
      where: { projectId },
      select: { id: true },
    });

    if (existingBoard) {
      return existingBoard.id;
    }

    const board = await this.prisma.$transaction(async (tx) => {
      const createdBoard = await tx.board.create({
        data: {
          projectId,
        },
      });

      await tx.column.createMany({
        data: DEFAULT_BOARD_COLUMNS.map((title, position) => ({
          boardId: createdBoard.id,
          title,
          position,
        })),
      });

      return createdBoard;
    });

    return board.id;
  }
}
