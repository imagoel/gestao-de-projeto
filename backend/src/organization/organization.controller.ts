import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';

import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CreateSecretariatDto } from './dto/create-secretariat.dto';
import { CreateSectorDto } from './dto/create-sector.dto';
import { UpdateSecretariatDto } from './dto/update-secretariat.dto';
import { UpdateSectorDto } from './dto/update-sector.dto';
import { OrganizationService } from './organization.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('organization')
export class OrganizationController {
  constructor(private readonly organizationService: OrganizationService) {}

  @Get('secretariats')
  findAllSecretariats() {
    return this.organizationService.findAllSecretariats();
  }

  @Post('secretariats')
  createSecretariat(@Body() dto: CreateSecretariatDto) {
    return this.organizationService.createSecretariat(dto);
  }

  @Patch('secretariats/:id')
  updateSecretariat(
    @Param('id') id: string,
    @Body() dto: UpdateSecretariatDto,
  ) {
    return this.organizationService.updateSecretariat(id, dto);
  }

  @Delete('secretariats/:id')
  deleteSecretariat(@Param('id') id: string) {
    return this.organizationService.deleteSecretariat(id);
  }

  @Post('sectors')
  createSector(@Body() dto: CreateSectorDto) {
    return this.organizationService.createSector(dto);
  }

  @Patch('sectors/:id')
  updateSector(@Param('id') id: string, @Body() dto: UpdateSectorDto) {
    return this.organizationService.updateSector(id, dto);
  }

  @Delete('sectors/:id')
  deleteSector(@Param('id') id: string) {
    return this.organizationService.deleteSector(id);
  }
}
