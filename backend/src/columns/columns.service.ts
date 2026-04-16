import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { ProjectAccessService } from '../common/services/project-access.service';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { PrismaService } from '../prisma/prisma.service';
import { CreateColumnDto } from './dto/create-column.dto';
import { UpdateColumnDto } from './dto/update-column.dto';
import { ReorderColumnDto } from './dto/reorder-column.dto';

@Injectable()
export class ColumnsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly projectAccessService: ProjectAccessService,
  ) {}

  async create(
    user: AuthenticatedUser,
    boardId: string,
    createColumnDto: CreateColumnDto,
  ) {
    const board = await this.prisma.board.findUnique({
      where: { id: boardId },
      select: { id: true, projectId: true },
    });

    if (!board) {
      throw new NotFoundException('Board nao encontrado.');
    }

    await this.projectAccessService.ensureProjectWriteAccess(user, board.projectId);

    const maxPosition = await this.prisma.column.aggregate({
      where: { boardId },
      _max: { position: true },
    });

    const nextPosition = (maxPosition._max.position ?? -1) + 1;

    return this.prisma.column.create({
      data: {
        boardId,
        title: createColumnDto.title,
        position: nextPosition,
      },
    });
  }

  async update(
    user: AuthenticatedUser,
    columnId: string,
    updateColumnDto: UpdateColumnDto,
  ) {
    const column = await this.findColumnWithProject(columnId);

    await this.projectAccessService.ensureProjectWriteAccess(
      user,
      column.board.projectId,
    );

    return this.prisma.column.update({
      where: { id: columnId },
      data: { title: updateColumnDto.title },
    });
  }

  async reorder(
    user: AuthenticatedUser,
    columnId: string,
    reorderColumnDto: ReorderColumnDto,
  ) {
    const column = await this.findColumnWithProject(columnId);

    await this.projectAccessService.ensureProjectWriteAccess(
      user,
      column.board.projectId,
    );

    const allColumns = await this.prisma.column.findMany({
      where: { boardId: column.boardId },
      orderBy: { position: 'asc' },
      select: { id: true, position: true },
    });

    const targetPosition = Math.min(
      reorderColumnDto.targetPosition,
      allColumns.length - 1,
    );

    if (column.position === targetPosition) {
      return this.prisma.column.findUniqueOrThrow({ where: { id: columnId } });
    }

    const reordered = allColumns.filter((c) => c.id !== columnId);
    reordered.splice(targetPosition, 0, { id: columnId, position: targetPosition });

    await this.prisma.$transaction(
      reordered.map((c, index) =>
        this.prisma.column.update({
          where: { id: c.id },
          data: { position: index },
        }),
      ),
    );

    return this.prisma.column.findUniqueOrThrow({ where: { id: columnId } });
  }

  async remove(user: AuthenticatedUser, columnId: string) {
    const column = await this.findColumnWithProject(columnId);

    await this.projectAccessService.ensureProjectWriteAccess(
      user,
      column.board.projectId,
    );

    const cardCount = await this.prisma.card.count({
      where: { columnId, archived: false },
    });

    if (cardCount > 0) {
      throw new BadRequestException(
        'Nao e possivel remover uma coluna com cards ativos. Mova ou arquive os cards primeiro.',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.card.deleteMany({ where: { columnId, archived: true } });
      await tx.column.delete({ where: { id: columnId } });

      const remaining = await tx.column.findMany({
        where: { boardId: column.boardId },
        orderBy: { position: 'asc' },
        select: { id: true },
      });

      for (let i = 0; i < remaining.length; i++) {
        await tx.column.update({
          where: { id: remaining[i].id },
          data: { position: i },
        });
      }
    });

    return { success: true };
  }

  private async findColumnWithProject(columnId: string) {
    const column = await this.prisma.column.findUnique({
      where: { id: columnId },
      include: {
        board: {
          select: { id: true, projectId: true },
        },
      },
    });

    if (!column) {
      throw new NotFoundException('Coluna nao encontrada.');
    }

    return column;
  }
}
