import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';
import { hash } from 'bcryptjs';

import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let authService: AuthService;
  let usersService: jest.Mocked<Pick<UsersService, 'findByEmailWithPassword' | 'findPublicById' | 'toPublicUser'>>;
  let jwtService: jest.Mocked<Pick<JwtService, 'signAsync'>>;

  beforeEach(async () => {
    usersService = {
      findByEmailWithPassword: jest.fn(),
      findPublicById: jest.fn(),
      toPublicUser: jest.fn(),
    };

    jwtService = {
      signAsync: jest.fn(),
    };

    authService = new AuthService(
      usersService as unknown as UsersService,
      jwtService as unknown as JwtService,
    );
  });

  it('returns token and public user for valid credentials', async () => {
    const passwordHash = await hash('admin123456', 10);
    const user = {
      id: 'user-1',
      name: 'Admin',
      email: 'admin@empresa.com',
      role: UserRole.ADMIN,
      avatarUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      passwordHash,
    };

    usersService.findByEmailWithPassword.mockResolvedValue(user);
    usersService.toPublicUser.mockReturnValue({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
    jwtService.signAsync.mockResolvedValue('signed-token');
    const publicUser = usersService.toPublicUser(user);

    await expect(
      authService.login({
        email: user.email,
        password: 'admin123456',
      }),
    ).resolves.toEqual({
      accessToken: 'signed-token',
      user: publicUser,
    });
  });

  it('throws for invalid credentials', async () => {
    usersService.findByEmailWithPassword.mockResolvedValue(null);

    await expect(
      authService.login({
        email: 'admin@empresa.com',
        password: 'wrong-pass',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
