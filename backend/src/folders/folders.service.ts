import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { CreateFolderDto } from './dto/create-folder.dto';
import { UpdateFolderDto } from './dto/update-folder.dto';

@Injectable()
export class FoldersService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.projectFolder.findMany({
      orderBy: { name: 'asc' },
    });
  }

  create(dto: CreateFolderDto) {
    return this.prisma.projectFolder.create({ data: { name: dto.name } });
  }

  async update(id: string, dto: UpdateFolderDto) {
    await this.ensureExists(id);
    return this.prisma.projectFolder.update({
      where: { id },
      data: { name: dto.name },
    });
  }

  async remove(id: string) {
    await this.ensureExists(id);
    // onDelete: SetNull will detach projects
    await this.prisma.projectFolder.delete({ where: { id } });
    return { success: true };
  }

  private async ensureExists(id: string) {
    const folder = await this.prisma.projectFolder.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!folder) throw new NotFoundException('Pasta nao encontrada.');
  }
}
