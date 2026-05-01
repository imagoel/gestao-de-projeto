import { Prisma } from '@prisma/client';

export const publicUserSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  isActive: true,
  avatarUrl: true,
  createdAt: true,
  updatedAt: true,
  sectorMemberships: {
    select: {
      id: true,
      sector: {
        select: {
          id: true,
          name: true,
          secretariat: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
    orderBy: {
      sector: {
        name: 'asc',
      },
    },
  },
} satisfies Prisma.UserSelect;

export type PublicUser = Prisma.UserGetPayload<{
  select: typeof publicUserSelect;
}>;
