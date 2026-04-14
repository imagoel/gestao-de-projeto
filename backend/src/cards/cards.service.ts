import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { ProjectAccessService } from '../common/services/project-access.service';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { PrismaService } from '../prisma/prisma.service';
import { publicUserSelect } from '../users/user-select';
import { normalizeDateInput } from '../common/utils/normalize-date-input.util';
import { CreateCardDto } from './dto/create-card.dto';
import { MoveCardDto } from './dto/move-card.dto';
import { UpdateCardDto } from './dto/update-card.dto';
import { insertIntoList, reorderWithinList } from './utils/reorder.util';

@Injectable()
export class CardsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly projectAccessService: ProjectAccessService,
  ) {}

  async create(user: AuthenticatedUser, columnId: string, createCardDto: CreateCardDto) {
    const column = await this.getColumnWithProject(columnId);
    await this.projectAccessService.ensureProjectAccess(user, column.board.projectId);
    await this.projectAccessService.ensureProjectWriteAccess(user, column.board.projectId);
    await this.projectAccessService.ensureAssignableUser(
      column.board.projectId,
      createCardDto.assigneeId,
    );

    const position = await this.prisma.card.count({
      where: {
        columnId,
        archived: false,
      },
    });

    return this.prisma.card.create({
      data: {
        title: createCardDto.title,
        description: createCardDto.description,
        assigneeId: createCardDto.assigneeId,
        priority: createCardDto.priority,
        dueDate: normalizeDateInput(createCardDto.dueDate),
        columnId,
        position,
      },
      include: this.cardInclude,
    });
  }

  async findOne(user: AuthenticatedUser, id: string) {
    const card = await this.findCardWithProject(id);
    await this.projectAccessService.ensureProjectAccess(user, card.column.board.projectId);
    return card;
  }

  async update(user: AuthenticatedUser, id: string, updateCardDto: UpdateCardDto) {
    const card = await this.findCardWithProject(id);
    await this.projectAccessService.ensureProjectAccess(user, card.column.board.projectId);
    await this.projectAccessService.ensureProjectWriteAccess(user, card.column.board.projectId);
    await this.projectAccessService.ensureAssignableUser(
      card.column.board.projectId,
      updateCardDto.assigneeId,
    );

    return this.prisma.card.update({
      where: { id },
      data: {
        title: updateCardDto.title,
        description: updateCardDto.description,
        assigneeId: updateCardDto.assigneeId,
        priority: updateCardDto.priority,
        dueDate: normalizeDateInput(updateCardDto.dueDate),
      },
      include: this.cardInclude,
    });
  }

  async move(user: AuthenticatedUser, id: string, moveCardDto: MoveCardDto) {
    const card = await this.findCardWithProject(id);
    await this.projectAccessService.ensureProjectAccess(user, card.column.board.projectId);
    await this.projectAccessService.ensureProjectWriteAccess(user, card.column.board.projectId);

    if (card.archived) {
      throw new BadRequestException('Cards arquivados nao podem ser movidos.');
    }

    const targetColumn = await this.getColumnWithProject(moveCardDto.targetColumnId);

    if (targetColumn.boardId !== card.column.boardId) {
      throw new BadRequestException('O card so pode ser movido dentro do mesmo board.');
    }

    await this.prisma.$transaction(async (tx) => {
      const sourceIds = (
        await tx.card.findMany({
          where: {
            columnId: card.columnId,
            archived: false,
          },
          orderBy: {
            position: 'asc',
          },
          select: {
            id: true,
          },
        })
      ).map((item) => item.id);

      if (card.columnId === targetColumn.id) {
        const reorderedIds = reorderWithinList(sourceIds, card.id, moveCardDto.targetPosition);

        await Promise.all(
          reorderedIds.map((cardId, position) =>
            tx.card.update({
              where: { id: cardId },
              data: { position },
            }),
          ),
        );

        return;
      }

      const targetIds = (
        await tx.card.findMany({
          where: {
            columnId: targetColumn.id,
            archived: false,
          },
          orderBy: {
            position: 'asc',
          },
          select: {
            id: true,
          },
        })
      ).map((item) => item.id);

      const nextSourceIds = sourceIds.filter((cardId) => cardId !== card.id);
      const nextTargetIds = insertIntoList(targetIds, card.id, moveCardDto.targetPosition);

      await Promise.all(
        nextSourceIds.map((cardId, position) =>
          tx.card.update({
            where: { id: cardId },
            data: { position },
          }),
        ),
      );

      await Promise.all(
        nextTargetIds.map((cardId, position) =>
          tx.card.update({
            where: { id: cardId },
            data: {
              position,
              ...(cardId === card.id ? { columnId: targetColumn.id } : {}),
            },
          }),
        ),
      );
    });

    return this.findOne(user, id);
  }

  async archive(user: AuthenticatedUser, id: string) {
    const card = await this.findCardWithProject(id);
    await this.projectAccessService.ensureProjectAccess(user, card.column.board.projectId);
    await this.projectAccessService.ensureProjectWriteAccess(user, card.column.board.projectId);

    if (!card.archived) {
      await this.prisma.$transaction(async (tx) => {
        const sourceIds = (
          await tx.card.findMany({
            where: {
              columnId: card.columnId,
              archived: false,
            },
            orderBy: {
              position: 'asc',
            },
            select: {
              id: true,
            },
          })
        )
          .map((item) => item.id)
          .filter((cardId) => cardId !== card.id);

        await tx.card.update({
          where: { id: card.id },
          data: {
            archived: true,
          },
        });

        await Promise.all(
          sourceIds.map((cardId, position) =>
            tx.card.update({
              where: { id: cardId },
              data: { position },
            }),
          ),
        );
      });
    }

    return this.findOne(user, id);
  }

  private readonly cardInclude = {
    assignee: {
      select: publicUserSelect,
    },
    column: {
      include: {
        board: {
          select: {
            id: true,
            projectId: true,
          },
        },
      },
    },
  } as const;

  private async getColumnWithProject(columnId: string) {
    const column = await this.prisma.column.findUnique({
      where: { id: columnId },
      include: {
        board: {
          select: {
            id: true,
            projectId: true,
          },
        },
      },
    });

    if (!column) {
      throw new NotFoundException('Coluna nao encontrada.');
    }

    return column;
  }

  private async findCardWithProject(id: string) {
    const card = await this.prisma.card.findUnique({
      where: { id },
      include: this.cardInclude,
    });

    if (!card) {
      throw new NotFoundException('Card nao encontrado.');
    }

    return card;
  }
}
