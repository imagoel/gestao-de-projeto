import type { ApiUser, ProjectFolder } from '../../types/api';

export type ProjectFormState = {
  name: string;
  description: string;
  deadline: string;
  ownerId: string;
  folderId: string;
  memberIds: string[];
};

export const initialProjectForm: ProjectFormState = {
  name: '',
  description: '',
  deadline: '',
  ownerId: '',
  folderId: '',
  memberIds: [],
};

export type FolderFormState = {
  name: string;
  sectorId: string;
  visibility: 'SECTOR' | 'SECRETARIAT';
};

export const initialFolderForm: FolderFormState = {
  name: '',
  sectorId: '',
  visibility: 'SECTOR',
};

export type AvailableSector = {
  id: string;
  name: string;
  secretariat: {
    id: string;
    name: string;
  };
};

export type OrganizationGroup = {
  id: string;
  name: string;
  sectors: Array<{
    id: string;
    name: string;
    folders: ProjectFolder[];
  }>;
};

export type ProjectFormUser = Pick<ApiUser, 'id' | 'name' | 'email'>;
