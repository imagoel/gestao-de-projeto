import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';

import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { CommentsService } from './comments.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Get('cards/:cardId/comments')
  findAll(@CurrentUser() user: AuthenticatedUser, @Param('cardId') cardId: string) {
    return this.commentsService.findAll(user, cardId);
  }

  @Post('cards/:cardId/comments')
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Param('cardId') cardId: string,
    @Body() createCommentDto: CreateCommentDto,
  ) {
    return this.commentsService.create(user, cardId, createCommentDto);
  }

  @Patch('comments/:id')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() updateCommentDto: UpdateCommentDto,
  ) {
    return this.commentsService.update(user, id, updateCommentDto);
  }

  @Delete('comments/:id')
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.commentsService.remove(user, id);
  }
}
