import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import { ProjectAccessService } from '../common/services/project-access.service';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { PrismaService } from '../prisma/prisma.service';
import { publicUserSelect } from '../users/user-select';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';

@Injectable()
export class CommentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly projectAccessService: ProjectAccessService,
  ) {}

  async findAll(user: AuthenticatedUser, cardId: string) {
    const card = await this.findCardContext(cardId);
    await this.projectAccessService.ensureProjectAccess(user, card.column.board.projectId);

    return this.prisma.comment.findMany({
      where: { cardId },
      include: {
        author: {
          select: publicUserSelect,
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  async create(user: AuthenticatedUser, cardId: string, createCommentDto: CreateCommentDto) {
    const card = await this.findCardContext(cardId);
    await this.projectAccessService.ensureProjectAccess(user, card.column.board.projectId);
    await this.projectAccessService.ensureProjectWriteAccess(user, card.column.board.projectId);

    if (card.archived) {
      throw new BadRequestException('Cards arquivados nao podem receber novos comentarios.');
    }

    const content = createCommentDto.content.trim();

    if (!content) {
      throw new BadRequestException('Comentario nao pode ficar vazio.');
    }

    return this.prisma.comment.create({
      data: {
        cardId,
        authorId: user.id,
        content,
      },
      include: {
        author: {
          select: publicUserSelect,
        },
      },
    });
  }

  async update(user: AuthenticatedUser, id: string, updateCommentDto: UpdateCommentDto) {
    const comment = await this.findCommentContext(id);
    const projectId = comment.card.column.board.projectId;

    await this.projectAccessService.ensureProjectAccess(user, projectId);
    await this.projectAccessService.ensureProjectWriteAccess(user, projectId);

    if (comment.card.archived) {
      throw new BadRequestException('Descricoes de cards arquivados nao podem ser editadas.');
    }

    const content = updateCommentDto.content.trim();

    if (!content) {
      throw new BadRequestException('Descricao nao pode ficar vazia.');
    }

    return this.prisma.comment.update({
      where: { id },
      data: { content },
      include: {
        author: {
          select: publicUserSelect,
        },
      },
    });
  }

  async remove(user: AuthenticatedUser, id: string) {
    const comment = await this.findCommentContext(id);
    const projectId = comment.card.column.board.projectId;

    await this.projectAccessService.ensureProjectAccess(user, projectId);
    await this.projectAccessService.ensureProjectWriteAccess(user, projectId);

    if (comment.card.archived) {
      throw new BadRequestException('Descricoes de cards arquivados nao podem ser apagadas.');
    }

    await this.prisma.comment.delete({
      where: { id },
    });

    return { success: true };
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

  private async findCommentContext(id: string) {
    const comment = await this.prisma.comment.findUnique({
      where: { id },
      select: {
        id: true,
        card: {
          select: {
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

    if (!comment) {
      throw new NotFoundException('Descricao nao encontrada.');
    }

    return comment;
  }
}
