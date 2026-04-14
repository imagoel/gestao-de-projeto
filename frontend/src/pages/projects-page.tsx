import { useState, type FormEvent } from 'react';
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

type ProjectFormState = {
  name: string;
  description: string;
  deadline: string;
  ownerId: string;
  memberIds: string[];
};

const initialProjectForm: ProjectFormState = {
  name: '',
  description: '',
  deadline: '',
  ownerId: '',
  memberIds: [],
};

export function ProjectsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { token, user } = useAuth();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [projectForm, setProjectForm] = useState<ProjectFormState>(initialProjectForm);
  const [formError, setFormError] = useState<string | null>(null);

  const projectsQuery = useQuery({
    queryKey: ['projects'],
    queryFn: () => api.getProjects(token!),
    enabled: Boolean(token),
  });

  const usersQuery = useQuery({
    queryKey: ['users', 'project-form'],
    queryFn: () => api.getUsers(token!),
    enabled: Boolean(token && user?.role === 'ADMIN' && isCreateModalOpen),
  });

  const availableUsers = usersQuery.data ?? [];

  const createProjectMutation = useMutation({
    mutationFn: () =>
      api.createProject(token!, {
        name: projectForm.name,
        description: projectForm.description || undefined,
        deadline: projectForm.deadline || undefined,
        ownerId: projectForm.ownerId,
        memberIds: projectForm.memberIds,
      }),
    onSuccess: async (project) => {
      await queryClient.invalidateQueries({ queryKey: ['projects'] });
      setIsCreateModalOpen(false);
      setProjectForm({
        ...initialProjectForm,
        ownerId: user?.id ?? '',
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

  function openCreateModal() {
    setProjectForm({
      ...initialProjectForm,
      ownerId: user?.id ?? '',
    });
    setFormError(null);
    setIsCreateModalOpen(true);
  }

  function toggleMember(userId: string) {
    setProjectForm((currentForm) => ({
      ...currentForm,
      memberIds: currentForm.memberIds.includes(userId)
        ? currentForm.memberIds.filter((memberId) => memberId !== userId)
        : [...currentForm.memberIds, userId],
    }));
  }

  async function handleCreateProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    await createProjectMutation.mutateAsync();
  }

  const action =
    user?.role === 'ADMIN' ? (
      <button className="primary-button" onClick={openCreateModal} type="button">
        Novo projeto
      </button>
    ) : null;

  return (
    <AppShell
      title="Projetos"
      copy="Lista central de projetos do MVP, com acesso filtrado por permissao e criacao restrita ao perfil admin."
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
          copy={
            projectsQuery.error instanceof Error
              ? projectsQuery.error.message
              : 'Tente novamente em instantes.'
          }
          action={
            <button className="secondary-button" onClick={() => void projectsQuery.refetch()} type="button">
              Tentar de novo
            </button>
          }
        />
      ) : null}

      {!projectsQuery.isLoading && !projectsQuery.isError ? (
        projectsQuery.data && projectsQuery.data.length > 0 ? (
          <section className="project-grid">
            {projectsQuery.data.map((project) => (
              <article className="project-card" key={project.id}>
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
                    <p className="project-card-copy">
                      {project.description || 'Projeto sem descricao cadastrada.'}
                    </p>
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
            ))}
          </section>
        ) : (
          <StatusState
            title="Nenhum projeto disponivel"
            copy={
              user?.role === 'ADMIN'
                ? 'Crie o primeiro projeto para iniciar o quadro Kanban do MVP.'
                : 'Voce ainda nao participa de nenhum projeto.'
            }
            action={action}
          />
        )
      ) : null}

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
              disabled={createProjectMutation.isPending}
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
            <label className="field-label" htmlFor="project-name">
              Nome
            </label>
            <input
              className="field-input"
              id="project-name"
              minLength={2}
              onChange={(event) =>
                setProjectForm((currentForm) => ({
                  ...currentForm,
                  name: event.target.value,
                }))
              }
              required
              type="text"
              value={projectForm.name}
            />
          </div>

          <div className="field-group">
            <label className="field-label" htmlFor="project-description">
              Descricao
            </label>
            <textarea
              className="field-input field-textarea"
              id="project-description"
              onChange={(event) =>
                setProjectForm((currentForm) => ({
                  ...currentForm,
                  description: event.target.value,
                }))
              }
              rows={4}
              value={projectForm.description}
            />
          </div>

          <div className="form-row">
            <div className="field-group">
              <label className="field-label" htmlFor="project-deadline">
                Prazo (opcional)
              </label>
              <input
                className="field-input"
                id="project-deadline"
                onChange={(event) =>
                  setProjectForm((currentForm) => ({
                    ...currentForm,
                    deadline: event.target.value,
                  }))
                }
                type="date"
                value={projectForm.deadline}
              />
              <p className="field-helper">Voce pode deixar este campo em branco no projeto.</p>
            </div>

            <div className="field-group">
              <label className="field-label" htmlFor="project-owner">
                Owner
              </label>
              <select
                className="field-input"
                id="project-owner"
                onChange={(event) =>
                  setProjectForm((currentForm) => ({
                    ...currentForm,
                    ownerId: event.target.value,
                  }))
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
          </div>

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
            <p className="field-helper">
              O owner sempre sera incluido como gerente do projeto.
            </p>
          </div>

          {formError ? <p className="form-error">{formError}</p> : null}
          {projectForm.deadline ? (
            <p className="field-helper">Prazo previsto: {formatLongDate(projectForm.deadline)}</p>
          ) : null}
        </form>
      </Modal>
    </AppShell>
  );
}
