import { Controller, Get, Param, UseGuards } from '@nestjs/common';

import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { BoardsService } from './boards.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('projects')
export class BoardsController {
  constructor(private readonly boardsService: BoardsService) {}

  @Get(':projectId/board')
  findProjectBoard(
    @CurrentUser() user: AuthenticatedUser,
    @Param('projectId') projectId: string,
  ) {
    return this.boardsService.findProjectBoard(user, projectId);
  }
}
