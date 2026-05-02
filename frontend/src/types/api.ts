export type UserRole = 'ADMIN' | 'MEMBER';
export type ProjectRole = 'MANAGER' | 'MEMBER';
export type ProjectStatus = 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'ARCHIVED';
export type CardPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type FolderVisibility = 'SECTOR' | 'SECRETARIAT';

export interface SecretariatSummary {
  id: string;
  name: string;
}

export interface SectorSummary {
  id: string;
  name: string;
  secretariat: SecretariatSummary;
}

export interface UserSectorMembership {
  id: string;
  sector: SectorSummary;
}

export interface Secretariat extends SecretariatSummary {
  sectors: Array<{
    id: string;
    name: string;
  }>;
}

export interface Sector extends SectorSummary {
  secretariatId: string;
}

export interface ApiUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  avatarUrl?: string | null;
  sectorMemberships?: UserSectorMembership[];
}

export interface ProjectMember {
  id: string;
  role: ProjectRole;
  joinedAt: string;
  user: ApiUser;
}

export interface ProjectColumn {
  id: string;
  title: string;
  position: number;
}

export interface ProjectBoardSummary {
  id: string;
  columns: ProjectColumn[];
}

export interface Project {
  id: string;
  name: string;
  description?: string | null;
  status: ProjectStatus;
  deadline?: string | null;
  ownerId: string;
  folderId: string;
  folder?: ProjectFolder | null;
  owner: ApiUser;
  members: ProjectMember[];
  board?: ProjectBoardSummary | null;
}

export interface ProjectFolder {
  id: string;
  name: string;
  visibility: FolderVisibility;
  sectorId: string;
  sector: SectorSummary;
  createdById?: string | null;
  createdBy?: ApiUser | null;
  createdAt: string;
}

export interface BoardCard {
  id: string;
  title: string;
  description?: string | null;
  priority: CardPriority;
  dueDate?: string | null;
  archived: boolean;
  position: number;
  createdAt: string;
  updatedAt: string;
  assignee?: ApiUser | null;
}

export interface BoardColumn extends ProjectColumn {
  cards: BoardCard[];
}

export interface ProjectBoard {
  id: string;
  projectId: string;
  columns: BoardColumn[];
}

export interface CardDetail extends BoardCard {
  columnId: string;
  column: {
    id: string;
    title?: string;
    board: {
      id: string;
      projectId: string;
    };
  };
}

export interface ChecklistItem {
  id: string;
  title: string;
  done: boolean;
  position: number;
  createdAt: string;
}

export interface CardComment {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  author: ApiUser;
}

export interface AuthResponse {
  accessToken: string;
  user: ApiUser;
}
