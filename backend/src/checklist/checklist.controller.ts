import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';

import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { ChecklistService } from './checklist.service';
import { CreateChecklistItemDto } from './dto/create-checklist-item.dto';
import { ReorderChecklistItemDto } from './dto/reorder-checklist-item.dto';
import { UpdateChecklistItemDto } from './dto/update-checklist-item.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class ChecklistController {
  constructor(private readonly checklistService: ChecklistService) {}

  @Get('cards/:cardId/checklist-items')
  findAll(@CurrentUser() user: AuthenticatedUser, @Param('cardId') cardId: string) {
    return this.checklistService.findAll(user, cardId);
  }

  @Post('cards/:cardId/checklist-items')
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Param('cardId') cardId: string,
    @Body() createChecklistItemDto: CreateChecklistItemDto,
  ) {
    return this.checklistService.create(user, cardId, createChecklistItemDto);
  }

  @Patch('checklist-items/:id')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() updateChecklistItemDto: UpdateChecklistItemDto,
  ) {
    return this.checklistService.update(user, id, updateChecklistItemDto);
  }

  @Patch('checklist-items/:id/reorder')
  reorder(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() reorderChecklistItemDto: ReorderChecklistItemDto,
  ) {
    return this.checklistService.reorder(user, id, reorderChecklistItemDto);
  }

  @Delete('checklist-items/:id')
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.checklistService.remove(user, id);
  }
}
