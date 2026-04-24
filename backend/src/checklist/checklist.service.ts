import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import { ProjectAccessService } from '../common/services/project-access.service';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { PrismaService } from '../prisma/prisma.service';
import { reorderWithinList } from '../cards/utils/reorder.util';
import { CreateChecklistItemDto } from './dto/create-checklist-item.dto';
import { ReorderChecklistItemDto } from './dto/reorder-checklist-item.dto';
import { UpdateChecklistItemDto } from './dto/update-checklist-item.dto';

@Injectable()
export class ChecklistService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly projectAccessService: ProjectAccessService,
  ) {}

  async findAll(user: AuthenticatedUser, cardId: string) {
    const card = await this.findCardContext(cardId);
    await this.projectAccessService.ensureProjectAccess(user, card.column.board.projectId);

    return this.prisma.checklistItem.findMany({
      where: { cardId },
      orderBy: {
        position: 'asc',
      },
    });
  }

  async create(
    user: AuthenticatedUser,
    cardId: string,
    createChecklistItemDto: CreateChecklistItemDto,
  ) {
    const card = await this.findCardContext(cardId);
    await this.projectAccessService.ensureProjectAccess(user, card.column.board.projectId);
    await this.projectAccessService.ensureProjectWriteAccess(user, card.column.board.projectId);
    this.ensureCardIsActive(card.archived);

    const title = createChecklistItemDto.title.trim();

    if (!title) {
      throw new BadRequestException('Item do checklist nao pode ficar vazio.');
    }

    const position = await this.prisma.checklistItem.count({
      where: { cardId },
    });

    return this.prisma.checklistItem.create({
      data: {
        cardId,
        title,
        position,
      },
    });
  }

  async update(user: AuthenticatedUser, id: string, updateChecklistItemDto: UpdateChecklistItemDto) {
    const checklistItem = await this.findChecklistItemContext(id);
    await this.projectAccessService.ensureProjectAccess(
      user,
      checklistItem.card.column.board.projectId,
    );
    await this.projectAccessService.ensureProjectWriteAccess(
      user,
      checklistItem.card.column.board.projectId,
    );
    this.ensureCardIsActive(checklistItem.card.archived);

    if (
      typeof updateChecklistItemDto.title === 'undefined' &&
      typeof updateChecklistItemDto.done === 'undefined'
    ) {
      throw new BadRequestException(
        'Informe ao menos um campo para atualizar o item do checklist.',
      );
    }

    const title =
      typeof updateChecklistItemDto.title === 'string'
        ? updateChecklistItemDto.title.trim()
        : undefined;

    if (typeof updateChecklistItemDto.title === 'string' && !title) {
      throw new BadRequestException('Item do checklist nao pode ficar vazio.');
    }

    return this.prisma.checklistItem.update({
      where: { id },
      data: {
        ...(typeof title === 'string' ? { title } : {}),
        ...(typeof updateChecklistItemDto.done === 'boolean'
          ? { done: updateChecklistItemDto.done }
          : {}),
      },
    });
  }

  async reorder(
    user: AuthenticatedUser,
    id: string,
    reorderChecklistItemDto: ReorderChecklistItemDto,
  ) {
    const checklistItem = await this.findChecklistItemContext(id);
    await this.projectAccessService.ensureProjectAccess(
      user,
      checklistItem.card.column.board.projectId,
    );
    await this.projectAccessService.ensureProjectWriteAccess(
      user,
      checklistItem.card.column.board.projectId,
    );
    this.ensureCardIsActive(checklistItem.card.archived);

    await this.prisma.$transaction(async (tx) => {
      const itemIds = (
        await tx.checklistItem.findMany({
          where: {
            cardId: checklistItem.cardId,
          },
          orderBy: {
            position: 'asc',
          },
          select: {
            id: true,
          },
        })
      ).map((item) => item.id);

      const reorderedIds = reorderWithinList(
        itemIds,
        checklistItem.id,
        reorderChecklistItemDto.targetPosition,
      );

      await Promise.all(
        reorderedIds.map((itemId, position) =>
          tx.checklistItem.update({
            where: { id: itemId },
            data: { position },
          }),
        ),
      );
    });

    return this.prisma.checklistItem.findUniqueOrThrow({
      where: { id },
    });
  }

  async remove(user: AuthenticatedUser, id: string) {
    const checklistItem = await this.findChecklistItemContext(id);
    await this.projectAccessService.ensureProjectAccess(
      user,
      checklistItem.card.column.board.projectId,
    );
    await this.projectAccessService.ensureProjectWriteAccess(
      user,
      checklistItem.card.column.board.projectId,
    );
    this.ensureCardIsActive(checklistItem.card.archived);

    await this.prisma.$transaction(async (tx) => {
      await tx.checklistItem.delete({
        where: { id },
      });

      const remainingItemIds = (
        await tx.checklistItem.findMany({
          where: {
            cardId: checklistItem.cardId,
          },
          orderBy: {
            position: 'asc',
          },
          select: {
            id: true,
          },
        })
      ).map((item) => item.id);

      await Promise.all(
        remainingItemIds.map((itemId, position) =>
          tx.checklistItem.update({
            where: { id: itemId },
            data: { position },
          }),
        ),
      );
    });

    return { success: true };
  }

  private ensureCardIsActive(archived: boolean) {
    if (archived) {
      throw new BadRequestException('Cards arquivados nao podem alterar checklist.');
    }
  }

  private async findCardContext(cardId: string) {
    const card = await this.prisma.card.findUnique({
      where: { id: cardId },
      select: {
        id: true,
        archived: true,
        column: {
          select: {
            board: {
              select: {
                projectId: true,
              },
            },
          },
        },
      },
    });

    if (!card) {
      throw new NotFoundException('Card nao encontrado.');
    }

    return card;
  }

  private async findChecklistItemContext(id: string) {
    const checklistItem = await this.prisma.checklistItem.findUnique({
      where: { id },
      include: {
        card: {
          select: {
            id: true,
            archived: true,
            column: {
              select: {
                board: {
                  select: {
                    projectId: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!checklistItem) {
      throw new NotFoundException('Item do checklist nao encontrado.');
    }

    return checklistItem;
  }
}
