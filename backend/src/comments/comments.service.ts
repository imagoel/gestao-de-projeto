import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import { ProjectAccessService } from '../common/services/project-access.service';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { PrismaService } from '../prisma/prisma.service';
import { publicUserSelect } from '../users/user-select';
import { CreateCommentDto } from './dto/create-comment.dto';

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
}
