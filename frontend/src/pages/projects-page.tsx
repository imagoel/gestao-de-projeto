import { useEffect, useMemo, useState, type DragEvent, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';

import { useAuth } from '../app/auth-provider';
import {
  formatLongDate,
  formatProjectStatus,
  formatShortDate,
  getProjectStatusTone,
} from '../app/formatters';
import { AppShell } from '../components/app-shell';
import { Modal } from '../components/modal';
import { StatusState } from '../components/status-state';
import { ApiError, api } from '../services/api';
import type { Project, ProjectFolder } from '../types/api';

type ProjectFormState = {
  name: string;
  description: string;
  deadline: string;
  ownerId: string;
  folderId: string;
  memberIds: string[];
};

const initialProjectForm: ProjectFormState = {
  name: '',
  description: '',
  deadline: '',
  ownerId: '',
  folderId: '',
  memberIds: [],
};

type FolderFormState = {
  name: string;
  sectorId: string;
  visibility: 'SECTOR' | 'SECRETARIAT';
};

const initialFolderForm: FolderFormState = {
  name: '',
  sectorId: '',
  visibility: 'SECTOR',
};

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

  const secretariatsQuery = useQuery({
    queryKey: ['secretariats'],
    queryFn: () => api.getSecretariats(token!),
    enabled: Boolean(token && isAdmin),
  });

  const usersQuery = useQuery({
    queryKey: ['users', 'project-form'],
    queryFn: () => api.getUsers(token!),
    enabled: Boolean(token && user?.role === 'ADMIN' && isCreateModalOpen),
  });

  const [renamingFolder, setRenamingFolder] = useState<ProjectFolder | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [renameError, setRenameError] = useState<string | null>(null);

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

  const availableUsers = usersQuery.data ?? [];
  const folderOptions = foldersQuery.data ?? [];
  const availableSectors = (secretariatsQuery.data ?? []).flatMap((secretariat) =>
    secretariat.sectors.map((sector) => ({
      ...sector,
      secretariat,
    })),
  );

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

  useEffect(() => {
    if (visibleFolders.length === 0) return;
    setOpenFolders((current) => {
      const next = new Set(current);
      visibleFolders.forEach((folder) => next.add(folder.id));
      return next;
    });
  }, [visibleFolders]);

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

  async function handleCreateProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    await createProjectMutation.mutateAsync();
  }

  function renderProjectCard(project: Project) {
    return (
      <article
        className="project-card"
        draggable={isAdmin}
        key={project.id}
        onDragStart={(e) => {
          e.dataTransfer.setData('text/plain', project.id);
          e.dataTransfer.effectAllowed = 'move';
        }}
      >
        <button
          className="project-card-main"
          onClick={() => navigate(`/projetos/${project.id}/quadro`)}
          type="button"
        >
          <div className="stack">
            <div className="badge-row">
              <span className={`badge ${getProjectStatusTone(project.status)}`}>
                {formatProjectStatus(project.status)}
              </span>
              <span className="badge badge-gray">
                {project.members.length} participante{project.members.length === 1 ? '' : 's'}
              </span>
            </div>
            <h2 className="project-card-title">{project.name}</h2>
            {project.description ? (
              <p className="project-card-copy">{project.description}</p>
            ) : null}
          </div>
          <div className="project-meta">
            <span>{project.owner.name}</span>
            <span>{formatShortDate(project.deadline)}</span>
          </div>
        </button>
        <div className="project-card-actions">
          <Link className="text-button" to={`/projetos/${project.id}`}>
            Ver detalhes
          </Link>
          <Link className="secondary-button project-card-board-link" to={`/projetos/${project.id}/quadro`}>
            Abrir quadro
          </Link>
        </div>
      </article>
    );
  }

  const action = (
    <div className="page-header-actions">
      {isAdmin ? (
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
      <button className="primary-button" onClick={openCreateModal} type="button">
        Novo projeto
      </button>
    </div>
  );

  function renderFolderSection(folder: ProjectFolder) {
    const key = folder.id;
    const projects = groupedProjects.get(key) ?? [];
    const isOpen = openFolders.has(key);
    const isDragOver = dragOverKey === key;
    const targetFolderId = folder.id;

    function handleDrop(e: DragEvent) {
      e.preventDefault();
      setDragOverKey(null);
      const projectId = e.dataTransfer.getData('text/plain');
      if (!projectId) return;
      void moveProjectMutation.mutateAsync({ projectId, folderId: targetFolderId });
    }

    return (
      <section
        key={key}
        className={`folder-section${isDragOver ? ' folder-section-drop' : ''}`}
        onDragOver={(e) => {
          if (!isAdmin) return;
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
          if (dragOverKey !== key) setDragOverKey(key);
        }}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOverKey(null);
        }}
        onDrop={isAdmin ? handleDrop : undefined}
      >
        <header className="folder-header">
          <button
            className="folder-toggle"
            onClick={() => toggleFolder(key)}
            type="button"
            aria-expanded={isOpen}
          >
            <span className="folder-caret">{isOpen ? '▾' : '▸'}</span>
            <span className="folder-title">
              {folder.name}
            </span>
            <span className="folder-count">({projects.length})</span>
            <span className="badge badge-gray">
              {folder.visibility === 'SECRETARIAT' ? 'Secretaria' : 'Setor'}
            </span>
          </button>
          {isAdmin ? (
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className="text-button"
                onClick={() => {
                  setRenamingFolder(folder);
                  setRenameValue(folder.name);
                  setRenameError(null);
                }}
                type="button"
              >
                Renomear
              </button>
              <button
                className="text-button"
                disabled={deleteFolderMutation.isPending}
                onClick={() => {
                  if (window.confirm(`Apagar a pasta "${folder.name}"? Apenas pastas vazias podem ser apagadas.`)) {
                    void deleteFolderMutation.mutateAsync(folder.id);
                  }
                }}
                style={{ color: '#8c2f25' }}
                type="button"
              >
                Apagar pasta
              </button>
            </div>
          ) : null}
        </header>
        {isOpen ? (
          projects.length > 0 ? (
            <div className="project-grid">{projects.map(renderProjectCard)}</div>
          ) : (
            <p className="field-helper folder-empty">
              {isAdmin ? 'Pasta vazia. Arraste projetos ate aqui para mover.' : 'Pasta vazia.'}
            </p>
          )
        ) : null}
      </section>
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
        projectsQuery.data && projectsQuery.data.length > 0 ? (
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
              isAdmin
                ? 'Crie o primeiro projeto para iniciar o quadro Kanban do MVP.'
                : 'Voce ainda nao participa de nenhum projeto.'
            }
            action={action}
          />
        )
      ) : null}

      <Modal
        title="Renomear pasta"
        description="Atualize o nome da pasta. Os projetos contidos sao mantidos."
        open={Boolean(renamingFolder)}
        onClose={() => setRenamingFolder(null)}
        footer={
          <>
            <button
              className="secondary-button"
              onClick={() => setRenamingFolder(null)}
              type="button"
            >
              Cancelar
            </button>
            <button
              className="primary-button"
              disabled={renameFolderMutation.isPending || !renameValue.trim() || !renamingFolder}
              onClick={() =>
                renamingFolder &&
                void renameFolderMutation.mutateAsync({
                  folderId: renamingFolder.id,
                  name: renameValue.trim(),
                })
              }
              type="button"
            >
              {renameFolderMutation.isPending ? 'Salvando...' : 'Salvar'}
            </button>
          </>
        }
      >
        <div className="form-grid">
          <div className="field-group">
            <label className="field-label" htmlFor="rename-folder-name">Nome da pasta</label>
            <input
              autoFocus
              className="field-input"
              id="rename-folder-name"
              onChange={(e) => setRenameValue(e.target.value)}
              type="text"
              value={renameValue}
            />
          </div>
          {renameError ? <p className="form-error">{renameError}</p> : null}
        </div>
      </Modal>

      <Modal
        title="Nova pasta"
        description="Pastas agora pertencem a um setor e controlam quem consegue visualizar os projetos."
        open={isCreateFolderOpen}
        onClose={() => setIsCreateFolderOpen(false)}
        footer={
          <>
            <button
              className="secondary-button"
              onClick={() => setIsCreateFolderOpen(false)}
              type="button"
            >
              Cancelar
            </button>
            <button
              className="primary-button"
              disabled={
                createFolderMutation.isPending ||
                !newFolderForm.name.trim() ||
                !newFolderForm.sectorId
              }
              onClick={() =>
                void createFolderMutation.mutateAsync({
                  ...newFolderForm,
                  name: newFolderForm.name.trim(),
                })
              }
              type="button"
            >
              {createFolderMutation.isPending ? 'Criando...' : 'Criar pasta'}
            </button>
          </>
        }
      >
        <div className="form-grid">
          <div className="field-group">
            <label className="field-label" htmlFor="new-folder-name">Nome da pasta</label>
            <input
              autoFocus
              className="field-input"
              id="new-folder-name"
              onChange={(e) =>
                setNewFolderForm((current) => ({ ...current, name: e.target.value }))
              }
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newFolderForm.name.trim() && newFolderForm.sectorId) {
                  e.preventDefault();
                  void createFolderMutation.mutateAsync({
                    ...newFolderForm,
                    name: newFolderForm.name.trim(),
                  });
                }
              }}
              type="text"
              value={newFolderForm.name}
            />
          </div>
          <div className="form-row">
            <div className="field-group">
              <label className="field-label" htmlFor="new-folder-sector">
                Setor
              </label>
              <select
                className="field-input"
                id="new-folder-sector"
                onChange={(event) =>
                  setNewFolderForm((current) => ({
                    ...current,
                    sectorId: event.target.value,
                  }))
                }
                required
                value={newFolderForm.sectorId}
              >
                <option value="">Selecione</option>
                {availableSectors.map((sector) => (
                  <option key={sector.id} value={sector.id}>
                    {sector.secretariat.name} / {sector.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="field-group">
              <label className="field-label" htmlFor="new-folder-visibility">
                Visibilidade
              </label>
              <select
                className="field-input"
                id="new-folder-visibility"
                onChange={(event) =>
                  setNewFolderForm((current) => ({
                    ...current,
                    visibility: event.target.value as FolderFormState['visibility'],
                  }))
                }
                value={newFolderForm.visibility}
              >
                <option value="SECTOR">Privada do setor</option>
                <option value="SECRETARIAT">Publica da secretaria</option>
              </select>
            </div>
          </div>
          {folderError ? <p className="form-error">{folderError}</p> : null}
        </div>
      </Modal>

      <Modal
        description="Cada projeto do MVP nasce com um board unico e as colunas fixas A fazer, Em andamento e Concluido."
        footer={
          <>
            <button
              className="secondary-button"
              onClick={() => setIsCreateModalOpen(false)}
              type="button"
            >
              Cancelar
            </button>
            <button
              className="primary-button"
              disabled={createProjectMutation.isPending || !projectForm.folderId}
              form="create-project-form"
              type="submit"
            >
              {createProjectMutation.isPending ? 'Salvando...' : 'Criar projeto'}
            </button>
          </>
        }
        onClose={() => setIsCreateModalOpen(false)}
        open={isCreateModalOpen}
        title="Novo projeto"
      >
        <form className="form-grid" id="create-project-form" onSubmit={handleCreateProject}>
          <div className="field-group">
            <label className="field-label" htmlFor="project-name">Nome</label>
            <input
              className="field-input"
              id="project-name"
              minLength={2}
              onChange={(event) =>
                setProjectForm((currentForm) => ({ ...currentForm, name: event.target.value }))
              }
              required
              type="text"
              value={projectForm.name}
            />
          </div>

          <div className="field-group">
            <label className="field-label" htmlFor="project-description">Descricao</label>
            <textarea
              className="field-input field-textarea"
              id="project-description"
              onChange={(event) =>
                setProjectForm((currentForm) => ({ ...currentForm, description: event.target.value }))
              }
              rows={4}
              value={projectForm.description}
            />
          </div>

          <div className="field-group">
            <label className="field-label" htmlFor="project-folder">Pasta</label>
            <select
              className="field-input"
              id="project-folder"
              onChange={(event) =>
                setProjectForm((currentForm) => ({
                  ...currentForm,
                  folderId: event.target.value,
                }))
              }
              required
              value={projectForm.folderId}
            >
              <option value="">Selecione</option>
              {folderOptions.map((folder) => (
                <option key={folder.id} value={folder.id}>
                  {folder.sector.secretariat.name} / {folder.sector.name} / {folder.name}
                </option>
              ))}
            </select>
            <p className="field-helper">
              A pasta define a secretaria/setor que podera visualizar este projeto.
            </p>
          </div>

          <div className="form-row">
            <div className="field-group">
              <label className="field-label" htmlFor="project-deadline">Prazo (opcional)</label>
              <input
                className="field-input"
                id="project-deadline"
                onChange={(event) =>
                  setProjectForm((currentForm) => ({ ...currentForm, deadline: event.target.value }))
                }
                type="date"
                value={projectForm.deadline}
              />
              <p className="field-helper">Voce pode deixar este campo em branco no projeto.</p>
            </div>

            {isAdmin ? (
              <div className="field-group">
                <label className="field-label" htmlFor="project-owner">Owner</label>
                <select
                  className="field-input"
                  id="project-owner"
                  onChange={(event) =>
                    setProjectForm((currentForm) => ({ ...currentForm, ownerId: event.target.value }))
                  }
                  required
                  value={projectForm.ownerId}
                >
                  <option value="">Selecione</option>
                  {availableUsers.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.name} ({option.email})
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
          </div>

          {isAdmin ? (
            <div className="field-group">
              <span className="field-label">Membros iniciais</span>
              <div className="checkbox-list">
                {usersQuery.isLoading ? <p className="field-helper">Carregando usuarios...</p> : null}
                {availableUsers.map((availableUser) => (
                  <label className="checkbox-item" key={availableUser.id}>
                    <input
                      checked={projectForm.memberIds.includes(availableUser.id)}
                      onChange={() => toggleMember(availableUser.id)}
                      type="checkbox"
                    />
                    <span>
                      {availableUser.name} <small>{availableUser.email}</small>
                    </span>
                  </label>
                ))}
              </div>
              <p className="field-helper">O owner sempre sera incluido como gerente do projeto.</p>
            </div>
          ) : (
            <p className="field-helper">
              Voce sera registrado como owner do projeto. Adicione membros depois pela tela de detalhes.
            </p>
          )}

          {formError ? <p className="form-error">{formError}</p> : null}
          {projectForm.deadline ? (
            <p className="field-helper">Prazo previsto: {formatLongDate(projectForm.deadline)}</p>
          ) : null}
        </form>
      </Modal>
    </AppShell>
  );
}
