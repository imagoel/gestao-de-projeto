import {
  Body,
  Controller,
  Delete,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';

import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { ColumnsService } from './columns.service';
import { CreateColumnDto } from './dto/create-column.dto';
import { ReorderColumnDto } from './dto/reorder-column.dto';
import { UpdateColumnDto } from './dto/update-column.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class ColumnsController {
  constructor(private readonly columnsService: ColumnsService) {}

  @Post('boards/:boardId/columns')
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Param('boardId') boardId: string,
    @Body() createColumnDto: CreateColumnDto,
  ) {
    return this.columnsService.create(user, boardId, createColumnDto);
  }

  @Patch('columns/:id')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() updateColumnDto: UpdateColumnDto,
  ) {
    return this.columnsService.update(user, id, updateColumnDto);
  }

  @Patch('columns/:id/reorder')
  reorder(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() reorderColumnDto: ReorderColumnDto,
  ) {
    return this.columnsService.reorder(user, id, reorderColumnDto);
  }

  @Delete('columns/:id')
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.columnsService.remove(user, id);
  }
}
