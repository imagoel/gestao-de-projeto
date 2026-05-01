import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { hash } from 'bcryptjs';

import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { publicUserSelect } from './user-select';

type UserWithPassword = Prisma.UserGetPayload<{
  select: typeof publicUserSelect & {
    passwordHash: true;
  };
}>;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.user.findMany({
      select: publicUserSelect,
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  async create(createUserDto: CreateUserDto) {
    await this.ensureEmailAvailable(createUserDto.email);
    const sectorIds = createUserDto.sectorIds ?? [];
    await this.ensureSectorsExist(sectorIds);

    const passwordHash = await hash(createUserDto.password, 10);

    const user = await this.prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          name: createUserDto.name,
          email: createUserDto.email,
          passwordHash,
          role: createUserDto.role,
          avatarUrl: createUserDto.avatarUrl,
        },
        select: { id: true },
      });

      if (sectorIds.length > 0) {
        await tx.userSector.createMany({
          data: sectorIds.map((sectorId) => ({
            userId: createdUser.id,
            sectorId,
          })),
          skipDuplicates: true,
        });
      }

      return tx.user.findUniqueOrThrow({
        where: { id: createdUser.id },
        select: publicUserSelect,
      });
    });

    return user;
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    await this.ensureUserExists(id);

    if (updateUserDto.email) {
      await this.ensureEmailAvailable(updateUserDto.email, id);
    }

    if (updateUserDto.sectorIds) {
      await this.ensureSectorsExist(updateUserDto.sectorIds);
    }

    const data: Prisma.UserUpdateInput = {
      name: updateUserDto.name,
      email: updateUserDto.email,
      role: updateUserDto.role,
      avatarUrl: updateUserDto.avatarUrl,
    };

    if (updateUserDto.password) {
      data.passwordHash = await hash(updateUserDto.password, 10);
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id },
        data,
        select: { id: true },
      });

      if (updateUserDto.sectorIds !== undefined) {
        await tx.userSector.deleteMany({ where: { userId: id } });

        if (updateUserDto.sectorIds.length > 0) {
          await tx.userSector.createMany({
            data: updateUserDto.sectorIds.map((sectorId) => ({
              userId: id,
              sectorId,
            })),
            skipDuplicates: true,
          });
        }
      }

      return tx.user.findUniqueOrThrow({
        where: { id },
        select: publicUserSelect,
      });
    });
  }

  async findByEmailWithPassword(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      select: {
        ...publicUserSelect,
        passwordHash: true,
      },
    }) as Promise<UserWithPassword | null>;
  }

  async findPublicById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: publicUserSelect,
    });

    if (!user) {
      throw new NotFoundException('Usuario nao encontrado.');
    }

    return user;
  }

  async ensureUsersExist(userIds: string[]) {
    if (userIds.length === 0) {
      return;
    }

    const count = await this.prisma.user.count({
      where: {
        id: {
          in: userIds,
        },
      },
    });

    if (count !== userIds.length) {
      throw new NotFoundException('Um ou mais usuarios informados nao existem.');
    }
  }

  toPublicUser(user: UserWithPassword) {
    const { passwordHash: _passwordHash, ...publicUser } = user;
    return publicUser;
  }

  private async ensureEmailAvailable(email: string, ignoreUserId?: string) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existingUser && existingUser.id !== ignoreUserId) {
      throw new ConflictException('Ja existe um usuario com este e-mail.');
    }
  }

  private async ensureUserExists(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException('Usuario nao encontrado.');
    }
  }

  private async ensureSectorsExist(sectorIds: string[]) {
    if (sectorIds.length === 0) {
      return;
    }

    const count = await this.prisma.sector.count({
      where: {
        id: {
          in: sectorIds,
        },
      },
    });

    if (count !== sectorIds.length) {
      throw new NotFoundException('Um ou mais setores informados nao existem.');
    }
  }
}
