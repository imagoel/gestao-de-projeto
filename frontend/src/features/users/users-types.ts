import type { ApiUser, Secretariat, UserRole } from '../../types/api';

export type UserFormState = {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  isActive: boolean;
  avatarUrl: string;
  sectorIds: string[];
};

export type StatusFilter = 'ALL' | 'ACTIVE' | 'INACTIVE';
export type RoleFilter = 'ALL' | UserRole;

export type NewSectorFormState = {
  name: string;
  secretariatId: string;
};

export type AvailableSector = Secretariat['sectors'][number] & {
  secretariat: Secretariat;
};

export type SectorMembership = NonNullable<ApiUser['sectorMemberships']>[number];

export const initialUserForm: UserFormState = {
  name: '',
  email: '',
  password: '',
  role: 'MEMBER',
  isActive: true,
  avatarUrl: '',
  sectorIds: [],
};

export const initialNewSectorForm: NewSectorFormState = {
  name: '',
  secretariatId: '',
};
