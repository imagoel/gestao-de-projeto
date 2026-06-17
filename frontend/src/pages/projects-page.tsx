import {
  useMemo,
  useState,
  type DragEvent,
  type FormEvent,
} from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../app/auth-provider';
import { AppShell } from '../components/app-shell';
import { ConfirmModal } from '../components/confirm-modal';
import { StatusState } from '../components/status-state';
import {
  CreateFolderModal,
  CreateProjectModal,
  RenameFolderModal,
  RenameProjectModal,
} from '../features/projects/project-modals';
import { ProjectFolderSection } from '../features/projects/project-folder-section';
import {
  initialFolderForm,
  initialProjectForm,
  type FolderFormState,
  type ProjectFormState,
} from '../features/projects/projects-types';
import { useProjectRowScroll } from '../features/projects/use-project-row-scroll';
import { ApiError, api } from '../services/api';
import type { Project, ProjectFolder } from '../types/api';

export function ProjectsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { token, user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [projectForm, setProjectForm] = useState<ProjectFormState>(initialProjectForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
  const [newFolderForm, setNewFolderForm] = useState<FolderFormState>(initialFolderForm);
  const [folderError, setFolderError] = useState<string | null>(null);
  const [openFolders, setOpenFolders] = useState<Set<string>>(() => new Set());
  const [dragOverKey, setDragOverKey] = useState<string | null>(null);
  const [draggedProjectId, setDraggedProjectId] = useState<string | null>(null);

  function toggleFolder(key: string) {
    setOpenFolders((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const projectsQuery = useQuery({
    queryKey: ['projects'],
    queryFn: () => api.getProjects(token!),
    enabled: Boolean(token),
  });

  const foldersQuery = useQuery({
    queryKey: ['folders'],
    queryFn: () => api.getFolders(token!),
    enabled: Boolean(token),
  });

  const usersQuery = useQuery({
    queryKey: ['users', 'project-form'],
    queryFn: () => api.getUsers(token!),
    enabled: Boolean(token && user?.role === 'ADMIN' && isCreateModalOpen),
  });

  const [renamingFolder, setRenamingFolder] = useState<ProjectFolder | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [renameError, setRenameError] = useState<string | null>(null);
  const [renamingProject, setRenamingProject] = useState<Project | null>(null);
  const [renameProjectValue, setRenameProjectValue] = useState('');
  const [renameProjectError, setRenameProjectError] = useState<string | null>(null);
  const [folderPendingDelete, setFolderPendingDelete] =
    useState<ProjectFolder | null>(null);

  const renameFolderMutation = useMutation({
    mutationFn: (payload: { folderId: string; name: string }) =>
      api.updateFolder(token!, payload.folderId, { name: payload.name }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['folders'] });
      setRenamingFolder(null);
      setRenameValue('');
      setRenameError(null);
    },
    onError: (error) => {
      setRenameError(
        error instanceof ApiError ? error.message : 'Nao foi possivel renomear a pasta.',
      );
    },
  });

  const renameProjectMutation = useMutation({
    mutationFn: (payload: { projectId: string; name: string }) =>
      api.updateProject(token!, payload.projectId, { name: payload.name }),
    onSuccess: async (project) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['projects'] }),
        queryClient.invalidateQueries({ queryKey: ['project', project.id] }),
      ]);
      setRenamingProject(null);
      setRenameProjectValue('');
      setRenameProjectError(null);
    },
    onError: (error) => {
      setRenameProjectError(
        error instanceof ApiError ? error.message : 'Nao foi possivel renomear o projeto.',
      );
    },
  });

  const availableUsers = usersQuery.data ?? [];
  const folderOptions = foldersQuery.data ?? [];
  const availableSectors =
    user?.sectorMemberships?.map((membership) => ({
      id: membership.sector.id,
      name: membership.sector.name,
      secretariat: membership.sector.secretariat,
    })) ?? [];
  const userSectorIds = new Set(availableSectors.map((sector) => sector.id));
  const canCreateFolder = availableSectors.length > 0;
  const hasAvailableFolders = folderOptions.length > 0;
  const isProjectCreationBlocked =
    !foldersQuery.isLoading && !hasAvailableFolders;

  const visibleFolders = useMemo(() => {
    const foldersById = new Map<string, ProjectFolder>();
    folderOptions.forEach((folder) => foldersById.set(folder.id, folder));
    (projectsQuery.data ?? []).forEach((project) => {
      if (project.folder) {
        foldersById.set(project.folder.id, project.folder);
      }
    });
    return Array.from(foldersById.values());
  }, [folderOptions, projectsQuery.data]);

  const groupedProjects = useMemo(() => {
    const projects = projectsQuery.data ?? [];
    const groups = new Map<string, Project[]>();
    visibleFolders.forEach((folder) => groups.set(folder.id, []));
    projects.forEach((project) => {
      const key = project.folderId;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(project);
    });
    return groups;
  }, [projectsQuery.data, visibleFolders]);

  const organizationGroups = useMemo(() => {
    const secretariatGroups = new Map<
      string,
      {
        id: string;
        name: string;
        sectors: Map<string, { id: string; name: string; folders: ProjectFolder[] }>;
      }
    >();

    visibleFolders.forEach((folder) => {
      const secretariat = folder.sector.secretariat;
      if (!secretariatGroups.has(secretariat.id)) {
        secretariatGroups.set(secretariat.id, {
          id: secretariat.id,
          name: secretariat.name,
          sectors: new Map(),
        });
      }

      const secretariatGroup = secretariatGroups.get(secretariat.id)!;
      if (!secretariatGroup.sectors.has(folder.sector.id)) {
        secretariatGroup.sectors.set(folder.sector.id, {
          id: folder.sector.id,
          name: folder.sector.name,
          folders: [],
        });
      }

      secretariatGroup.sectors.get(folder.sector.id)!.folders.push(folder);
    });

    return Array.from(secretariatGroups.values()).map((secretariat) => ({
      ...secretariat,
      sectors: Array.from(secretariat.sectors.values()),
    }));
  }, [visibleFolders]);

  const projectRowRefreshSignal = useMemo(
    () => ({ groupedProjects, openFolders }),
    [groupedProjects, openFolders],
  );
  const {
    getProjectRowShellClassName,
    handleProjectRowScroll,
    registerProjectRow,
  } = useProjectRowScroll(projectRowRefreshSignal);

  const createProjectMutation = useMutation({
    mutationFn: () =>
      api.createProject(token!, {
        name: projectForm.name,
        description: projectForm.description || undefined,
        deadline: projectForm.deadline || undefined,
        ownerId: isAdmin ? projectForm.ownerId : (user?.id ?? ''),
        folderId: projectForm.folderId,
        memberIds: isAdmin ? projectForm.memberIds : [],
      }),
    onSuccess: async (project) => {
      await queryClient.invalidateQueries({ queryKey: ['projects'] });
      setIsCreateModalOpen(false);
      setProjectForm({
        ...initialProjectForm,
        ownerId: user?.id ?? '',
        folderId: folderOptions[0]?.id ?? '',
      });
      setFormError(null);
      navigate(`/projetos/${project.id}`);
    },
    onError: (error) => {
      setFormError(
        error instanceof ApiError ? error.message : 'Nao foi possivel criar o projeto.',
      );
    },
  });

  const createFolderMutation = useMutation({
    mutationFn: (payload: FolderFormState) =>
      api.createFolder(token!, {
        name: payload.name,
        sectorId: payload.sectorId,
        visibility: payload.visibility,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['folders'] });
      setIsCreateFolderOpen(false);
      setNewFolderForm(initialFolderForm);
      setFolderError(null);
    },
    onError: (error) => {
      setFolderError(
        error instanceof ApiError ? error.message : 'Nao foi possivel criar a pasta.',
      );
    },
  });

  const deleteFolderMutation = useMutation({
    mutationFn: (folderId: string) => api.deleteFolder(token!, folderId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['folders'] }),
        queryClient.invalidateQueries({ queryKey: ['projects'] }),
      ]);
    },
  });

  const moveProjectMutation = useMutation({
    mutationFn: (payload: { projectId: string; folderId: string }) =>
      api.updateProject(token!, payload.projectId, { folderId: payload.folderId }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });

  function openCreateModal() {
    if (!hasAvailableFolders) {
      setFormError('Crie uma pasta antes de cadastrar projetos.');
      return;
    }

    setProjectForm({
      ...initialProjectForm,
      ownerId: user?.id ?? '',
      folderId: folderOptions[0]?.id ?? '',
    });
    setFormError(null);
    setIsCreateModalOpen(true);
  }

  function toggleMember(userId: string) {
    setProjectForm((currentForm) => ({
      ...currentForm,
      memberIds: currentForm.memberIds.includes(userId)
        ? currentForm.memberIds.filter((id) => id !== userId)
        : [...currentForm.memberIds, userId],
    }));
  }

  function updateProjectForm(updates: Partial<ProjectFormState>) {
    setProjectForm((currentForm) => ({
      ...currentForm,
      ...updates,
    }));
  }

  async function handleCreateProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    await createProjectMutation.mutateAsync();
  }

  function canManageFolder(folder: ProjectFolder) {
    return folder.createdById === user?.id || (isAdmin && userSectorIds.has(folder.sectorId));
  }

  function canMoveProject(project: Project) {
    if (!user) {
      return false;
    }

    if (isAdmin || project.ownerId === user.id) {
      return true;
    }

    return project.members.some(
      (member) => member.user.id === user.id && member.role === 'MANAGER',
    );
  }

  function handleProjectDragStart(projectId: string, event: DragEvent<HTMLElement>) {
    setDraggedProjectId(projectId);
    event.dataTransfer.setData('text/plain', projectId);
    event.dataTransfer.effectAllowed = 'move';
  }

  function handleProjectDragEnd() {
    setDraggedProjectId(null);
    setDragOverKey(null);
  }

  function handleProjectDrop(projectId: string, folderId: string) {
    void moveProjectMutation.mutateAsync({ projectId, folderId });
    setDraggedProjectId(null);
  }

  function handleRenameFolder(folder: ProjectFolder) {
    setRenamingFolder(folder);
    setRenameValue(folder.name);
    setRenameError(null);
  }

  function handleRenameProject(project: Project) {
    setRenamingProject(project);
    setRenameProjectValue(project.name);
    setRenameProjectError(null);
  }

  function handleDeleteFolder(folder: ProjectFolder) {
    setFolderPendingDelete(folder);
  }

  const action = (
    <div className="page-header-actions">
      {canCreateFolder ? (
        <button
          className="secondary-button"
          onClick={() => {
            setNewFolderForm({
              ...initialFolderForm,
              sectorId: availableSectors[0]?.id ?? '',
            });
            setFolderError(null);
            setIsCreateFolderOpen(true);
          }}
          type="button"
        >
          Nova pasta
        </button>
      ) : null}
      <button
        className="primary-button"
        disabled={foldersQuery.isLoading || isProjectCreationBlocked}
        onClick={openCreateModal}
        title={
          isProjectCreationBlocked
            ? 'Crie uma pasta antes de cadastrar projetos.'
            : undefined
        }
        type="button"
      >
        Novo projeto
      </button>
    </div>
  );

  function renderFolderSection(folder: ProjectFolder) {
    const key = folder.id;
    const projects = groupedProjects.get(key) ?? [];
    const isOpen = openFolders.has(key);

    return (
      <ProjectFolderSection
        canManage={canManageFolder(folder)}
        canMoveProject={canMoveProject}
        deleteFolderDisabled={deleteFolderMutation.isPending}
        dragOverKey={dragOverKey}
        draggedProjectId={draggedProjectId}
        folder={folder}
        getRowShellClassName={getProjectRowShellClassName}
        isAdmin={isAdmin}
        isOpen={isOpen}
        key={key}
        onClearDragOver={() => setDragOverKey(null)}
        onDelete={handleDeleteFolder}
        onDropProject={handleProjectDrop}
        onFolderDragOver={setDragOverKey}
        onOpenBoard={(projectId) => navigate(`/projetos/${projectId}/quadro`)}
        onProjectDragEnd={handleProjectDragEnd}
        onProjectDragStart={handleProjectDragStart}
        onRename={handleRenameFolder}
        onRenameProject={handleRenameProject}
        onRowScroll={handleProjectRowScroll}
        onToggle={toggleFolder}
        projects={projects}
        registerProjectRow={registerProjectRow}
      />
    );
  }

  return (
    <AppShell
      title="Projetos"
      action={action}
    >
      {projectsQuery.isLoading ? (
        <StatusState
          tone="loading"
          title="Carregando projetos"
          copy="Estamos buscando os projetos que voce pode acessar."
        />
      ) : null}

      {projectsQuery.isError ? (
        <StatusState
          tone="error"
          title="Nao foi possivel carregar os projetos"
          copy={projectsQuery.error instanceof Error ? projectsQuery.error.message : 'Tente novamente em instantes.'}
          action={
            <button className="secondary-button" onClick={() => void projectsQuery.refetch()} type="button">
              Tentar de novo
            </button>
          }
        />
      ) : null}

      {!projectsQuery.isLoading && !projectsQuery.isError ? (
        visibleFolders.length > 0 ? (
          <div className="organization-list">
            {organizationGroups.map((secretariat) => (
              <div className="secretariat-section" key={secretariat.id}>
                {secretariat.sectors.map((sector) => (
                  <section className="sector-section" key={sector.id}>
                    <div className="organization-path">
                      <span>{secretariat.name}</span>
                      <span className="organization-path-separator">&gt;</span>
                      <span>{sector.name}</span>
                    </div>
                    {sector.folders.map((folder) => renderFolderSection(folder))}
                  </section>
                ))}
              </div>
            ))}
          </div>
        ) : (
          <StatusState
            title="Nenhum projeto disponivel"
            copy={
              isProjectCreationBlocked
                ? canCreateFolder
                  ? 'Crie uma pasta antes de cadastrar projetos.'
                  : 'Nenhuma pasta disponivel. Seu usuario precisa estar vinculado a um setor para criar pastas e projetos.'
                : isAdmin
                  ? 'Crie o primeiro projeto para iniciar o quadro Kanban do MVP.'
                  : 'Voce ainda nao participa de nenhum projeto.'
            }
            action={action}
          />
        )
      ) : null}

      <RenameFolderModal
        error={renameError}
        folder={renamingFolder}
        isPending={renameFolderMutation.isPending}
        onClose={() => setRenamingFolder(null)}
        onSave={(folderId, name) =>
          void renameFolderMutation.mutateAsync({
            folderId,
            name,
          })
        }
        onValueChange={setRenameValue}
        value={renameValue}
      />

      <RenameProjectModal
        error={renameProjectError}
        isPending={renameProjectMutation.isPending}
        onClose={() => {
          setRenamingProject(null);
          setRenameProjectError(null);
        }}
        onSave={(projectId, name) =>
          void renameProjectMutation.mutateAsync({
            projectId,
            name,
          })
        }
        onValueChange={setRenameProjectValue}
        project={renamingProject}
        value={renameProjectValue}
      />

      <ConfirmModal
        confirmLabel="Apagar pasta"
        description={
          folderPendingDelete
            ? `Apagar a pasta "${folderPendingDelete.name}"? Apenas pastas vazias podem ser apagadas.`
            : 'Apagar esta pasta?'
        }
        isConfirming={deleteFolderMutation.isPending}
        onClose={() => setFolderPendingDelete(null)}
        onConfirm={async () => {
          if (!folderPendingDelete) {
            return;
          }

          await deleteFolderMutation.mutateAsync(folderPendingDelete.id);
          setFolderPendingDelete(null);
        }}
        open={Boolean(folderPendingDelete)}
        title="Apagar pasta"
      />

      <CreateFolderModal
        availableSectors={availableSectors}
        error={folderError}
        form={newFolderForm}
        isPending={createFolderMutation.isPending}
        onChange={setNewFolderForm}
        onClose={() => setIsCreateFolderOpen(false)}
        onCreate={(form) => void createFolderMutation.mutateAsync(form)}
        open={isCreateFolderOpen}
      />

      <CreateProjectModal
        availableUsers={availableUsers}
        error={formError}
        folderOptions={folderOptions}
        form={projectForm}
        isAdmin={isAdmin}
        isPending={createProjectMutation.isPending}
        onChange={updateProjectForm}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateProject}
        onToggleMember={toggleMember}
        open={isCreateModalOpen}
        usersLoading={usersQuery.isLoading}
      />
    </AppShell>
  );
}
