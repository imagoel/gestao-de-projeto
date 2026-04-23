import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';

import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { CreateCardDto } from './dto/create-card.dto';
import { MoveCardDto } from './dto/move-card.dto';
import { UpdateCardDto } from './dto/update-card.dto';
import { CardsService } from './cards.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class CardsController {
  constructor(private readonly cardsService: CardsService) {}

  @Post('columns/:columnId/cards')
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Param('columnId') columnId: string,
    @Body() createCardDto: CreateCardDto,
  ) {
    return this.cardsService.create(user, columnId, createCardDto);
  }

  @Get('cards/:id')
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.cardsService.findOne(user, id);
  }

  @Get('projects/:projectId/archived-cards')
  findArchivedByProject(
    @CurrentUser() user: AuthenticatedUser,
    @Param('projectId') projectId: string,
  ) {
    return this.cardsService.findArchivedByProject(user, projectId);
  }

  @Patch('cards/:id')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() updateCardDto: UpdateCardDto,
  ) {
    return this.cardsService.update(user, id, updateCardDto);
  }

  @Patch('cards/:id/move')
  move(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() moveCardDto: MoveCardDto,
  ) {
    return this.cardsService.move(user, id, moveCardDto);
  }

  @Patch('cards/:id/archive')
  archive(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.cardsService.archive(user, id);
  }

  @Patch('cards/:id/restore')
  restore(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.cardsService.restore(user, id);
  }
}
