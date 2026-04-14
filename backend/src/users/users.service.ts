import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, User } from '@prisma/client';
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

    const passwordHash = await hash(createUserDto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        name: createUserDto.name,
        email: createUserDto.email,
        passwordHash,
        role: createUserDto.role,
        avatarUrl: createUserDto.avatarUrl,
      },
      select: publicUserSelect,
    });

    return user;
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    await this.ensureUserExists(id);

    if (updateUserDto.email) {
      await this.ensureEmailAvailable(updateUserDto.email, id);
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

    return this.prisma.user.update({
      where: { id },
      data,
      select: publicUserSelect,
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

  toPublicUser(user: Pick<User, keyof typeof publicUserSelect> & { [key: string]: unknown }) {
    const { id, name, email, role, avatarUrl, createdAt, updatedAt } = user as User;

    return {
      id,
      name,
      email,
      role,
      avatarUrl,
      createdAt,
      updatedAt,
    };
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
}
