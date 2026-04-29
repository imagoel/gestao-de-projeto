import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { useAuth } from '../app/auth-provider';
import {
  formatLongDate,
  formatProjectStatus,
  getProjectStatusTone,
} from '../app/formatters';
import { AppShell } from '../components/app-shell';
import { Modal } from '../components/modal';
import { StatusState } from '../components/status-state';
import { ApiError, api } from '../services/api';
import type { ProjectRole } from '../types/api';

export function ProjectDetailPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { token, user } = useAuth();
  const { projectId = 'projeto' } = useParams();
  const [isEditDescriptionOpen, setIsEditDescriptionOpen] = useState(false);
  const [descriptionDraft, setDescriptionDraft] = useState('');
  const [descriptionError, setDescriptionError] = useState<string | null>(null);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [addMemberUserId, setAddMemberUserId] = useState('');
  const [addMemberRole, setAddMemberRole] = useState<ProjectRole>('MEMBER');
  const [memberError, setMemberError] = useState<string | null>(null);

  const projectQuery = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => api.getProject(token!, projectId),
    enabled: Boolean(token && projectId),
  });

  const usersQuery = useQuery({
    queryKey: ['users'],
    queryFn: () => api.getUsers(token!),
    enabled: Boolean(token && user?.role === 'ADMIN' && isAddMemberOpen),
  });

  const deleteProjectMutation = useMutation({
    mutationFn: () => api.deleteProject(token!, projectId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.removeQueries({ queryKey: ['project', projectId] });
      navigate('/projetos');
    },
  });

  const updateDescriptionMutation = useMutation({
    mutationFn: () =>
      api.updateProject(token!, projectId, {
        description: descriptionDraft.trim(),
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['project', projectId] }),
        queryClient.invalidateQueries({ queryKey: ['projects'] }),
      ]);
      setIsEditDescriptionOpen(false);
      setDescriptionError(null);
    },
    onError: (error) => {
      setDescriptionError(
        error instanceof ApiError
          ? error.message
          : 'Nao foi possivel atualizar a descricao do projeto.',
      );
    },
  });

  const addMemberMutation = useMutation({
    mutationFn: () =>
      api.addProjectMember(token!, projectId, {
        userId: addMemberUserId,
        role: addMemberRole,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      setIsAddMemberOpen(false);
      setAddMemberUserId('');
      setAddMemberRole('MEMBER');
      setMemberError(null);
    },
    onError: (error) => {
      setMemberError(
        error instanceof ApiError
          ? error.message
          : 'Nao foi possivel adicionar o membro.',
      );
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: (userId: string) =>
      api.removeProjectMember(token!, projectId, userId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['project', projectId] });
    },
  });

  const project = projectQuery.data;
  const currentProjectMember = project?.members.find(
    (member) => member.user.id === user?.id,
  );
  const canEditProject = Boolean(
    user &&
      project &&
      (user.role === 'ADMIN' ||
        project.ownerId === user.id ||
        currentProjectMember?.role === 'MANAGER' ||
        currentProjectMember?.role === 'MEMBER'),
  );
  const canDeleteProject = Boolean(
    user &&
      project &&
      (user.role === 'ADMIN' ||
        project.ownerId === user.id ||
        currentProjectMember?.role === 'MANAGER'),
  );

  async function handleDeleteProject() {
    if (!project) {
      return;
    }

    const confirmed = window.confirm(
      `Deseja apagar o projeto "${project.name}"? Esta acao remove o board e os cards vinculados a ele.`,
    );

    if (!confirmed) {
      return;
    }

    await deleteProjectMutation.mutateAsync();
  }

  function openEditDescriptionModal() {
    if (!project) {
      return;
    }

    setDescriptionDraft(project.description ?? '');
    setDescriptionError(null);
    setIsEditDescriptionOpen(true);
  }

  const action = project ? (
    <div className="page-header-actions">
      <Link className="secondary-button" to="/projetos">
        Voltar aos projetos
      </Link>
      {canEditProject ? (
        <button
          className="secondary-button"
          onClick={openEditDescriptionModal}
          type="button"
        >
          Editar descricao
        </button>
      ) : null}
      {canDeleteProject ? (
        <button
          className="button-danger"
          disabled={deleteProjectMutation.isPending}
          onClick={() => void handleDeleteProject()}
          type="button"
        >
          {deleteProjectMutation.isPending ? 'Apagando...' : 'Apagar projeto'}
        </button>
      ) : null}
      <Link className="primary-button" to={`/projetos/${projectId}/quadro`}>
        Abrir quadro
      </Link>
    </div>
  ) : null;

  return (
    <AppShell
      title={project?.name ?? 'Detalhe do projeto'}
      subtitle="Projetos / detalhe"
      copy="Painel rapido do projeto, com contexto essencial e acesso secundario ao quadro."
      action={action}
    >
      {projectQuery.isLoading ? (
        <StatusState
          tone="loading"
          title="Carregando projeto"
          copy="Estamos buscando os dados detalhados deste projeto."
        />
      ) : null}

      {projectQuery.isError ? (
        <StatusState
          tone="error"
          title="Nao foi possivel carregar o projeto"
          copy={
            projectQuery.error instanceof Error
              ? projectQuery.error.message
              : 'Tente novamente em instantes.'
          }
          action={
            <button className="secondary-button" onClick={() => void projectQuery.refetch()} type="button">
              Recarregar
            </button>
          }
        />
      ) : null}

      {deleteProjectMutation.isError ? (
        <StatusState
          tone="error"
          title="Nao foi possivel apagar o projeto"
          copy={
            deleteProjectMutation.error instanceof ApiError
              ? deleteProjectMutation.error.message
              : 'Tente novamente em instantes.'
          }
        />
      ) : null}

      <Modal
        title="Editar descricao do projeto"
        description="Atualize o resumo exibido na tela de detalhes deste projeto."
        open={isEditDescriptionOpen}
        onClose={() => {
          setIsEditDescriptionOpen(false);
          setDescriptionError(null);
        }}
        footer={
          <>
            <button
              className="secondary-button"
              onClick={() => {
                setIsEditDescriptionOpen(false);
                setDescriptionError(null);
              }}
              type="button"
            >
              Cancelar
            </button>
            <button
              className="primary-button"
              disabled={updateDescriptionMutation.isPending}
              onClick={() => void updateDescriptionMutation.mutateAsync()}
              type="button"
            >
              {updateDescriptionMutation.isPending ? 'Salvando...' : 'Salvar descricao'}
            </button>
          </>
        }
      >
        <div className="form-grid">
          <div className="field-group">
            <label className="field-label" htmlFor="project-description">
              Descricao
            </label>
            <textarea
              className="field-input field-textarea"
              id="project-description"
              onChange={(event) => setDescriptionDraft(event.target.value)}
              placeholder="Descreva rapidamente o objetivo, contexto ou observacoes do projeto."
              value={descriptionDraft}
            />
          </div>
          <p className="field-helper">
            Deixe vazio se quiser remover a descricao atual.
          </p>
          {descriptionError ? <p className="form-error">{descriptionError}</p> : null}
        </div>
      </Modal>

      <Modal
        title="Adicionar membro"
        description="Selecione o usuario e o papel no projeto."
        open={isAddMemberOpen}
        onClose={() => setIsAddMemberOpen(false)}
        footer={
          <>
            <button
              className="secondary-button"
              onClick={() => setIsAddMemberOpen(false)}
              type="button"
            >
              Cancelar
            </button>
            <button
              className="primary-button"
              disabled={addMemberMutation.isPending || !addMemberUserId}
              onClick={() => void addMemberMutation.mutateAsync()}
              type="button"
            >
              {addMemberMutation.isPending ? 'Adicionando...' : 'Adicionar'}
            </button>
          </>
        }
      >
        <div className="form-grid">
          <div className="field-group">
            <label className="field-label" htmlFor="add-member-user">
              Usuario
            </label>
            <select
              className="field-input"
              id="add-member-user"
              onChange={(e) => setAddMemberUserId(e.target.value)}
              value={addMemberUserId}
            >
              <option value="">Selecione</option>
              {(usersQuery.data ?? [])
                .filter(
                  (u) =>
                    !project?.members.some((m) => m.user.id === u.id),
                )
                .map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.email})
                  </option>
                ))}
            </select>
          </div>
          <div className="field-group">
            <label className="field-label" htmlFor="add-member-role">
              Papel no projeto
            </label>
            <select
              className="field-input"
              id="add-member-role"
              onChange={(e) => setAddMemberRole(e.target.value as ProjectRole)}
              value={addMemberRole}
            >
              <option value="MANAGER">Manager</option>
              <option value="MEMBER">Member</option>
              <option value="VIEWER">Viewer</option>
            </select>
          </div>
          {memberError ? <p className="form-error">{memberError}</p> : null}
        </div>
      </Modal>

      {project ? (
        <div className="detail-grid">
          <section className="panel info-list">
            <div className="info-row">
              <div className="info-label-row">
                <span className="info-label">Descricao</span>
                {canEditProject ? (
                  <button
                    className="text-button inline-edit-button"
                    onClick={openEditDescriptionModal}
                    type="button"
                  >
                    Editar
                  </button>
                ) : null}
              </div>
              <span className="info-value">
                {project.description || 'Projeto sem descricao cadastrada.'}
              </span>
            </div>
            <div className="info-row">
              <span className="info-label">Owner</span>
              <span className="info-value">{project.owner.name}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Prazo</span>
              <span className="info-value">{formatLongDate(project.deadline)}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Participantes</span>
              <div className="member-list">
                {project.members.map((member) => (
                  <span className="member-pill" key={member.id}>
                    {member.user.name}
                    <small style={{ marginLeft: 4, color: '#6f6b63' }}>
                      ({member.role})
                    </small>
                    {user?.role === 'ADMIN' &&
                    member.user.id !== project.ownerId ? (
                      <button
                        className="text-button"
                        disabled={removeMemberMutation.isPending}
                        onClick={() => {
                          if (
                            window.confirm(
                              `Remover ${member.user.name} do projeto?`,
                            )
                          ) {
                            void removeMemberMutation.mutateAsync(
                              member.user.id,
                            );
                          }
                        }}
                        style={{ marginLeft: 4, color: '#8c2f25', fontSize: '0.8rem' }}
                        type="button"
                      >
                        remover
                      </button>
                    ) : null}
                  </span>
                ))}
              </div>
              {user?.role === 'ADMIN' ? (
                <button
                  className="secondary-button"
                  onClick={() => {
                    setMemberError(null);
                    setIsAddMemberOpen(true);
                  }}
                  style={{ marginTop: 8, justifySelf: 'start' }}
                  type="button"
                >
                  Adicionar membro
                </button>
              ) : null}
            </div>
          </section>

          <aside className="panel info-list">
            <div className="info-row">
              <span className="info-label">Acoes rapidas</span>
              <div className="panel-actions">
                <Link className="primary-button" to={`/projetos/${projectId}/quadro`}>
                  Abrir quadro
                </Link>
                <Link className="secondary-button" to="/projetos">
                  Voltar
                </Link>
                {canEditProject ? (
                  <button
                    className="secondary-button"
                    onClick={openEditDescriptionModal}
                    type="button"
                  >
                    Editar descricao
                  </button>
                ) : null}
                {canDeleteProject ? (
                  <button
                    className="button-danger"
                    disabled={deleteProjectMutation.isPending}
                    onClick={() => void handleDeleteProject()}
                    type="button"
                  >
                    {deleteProjectMutation.isPending ? 'Apagando...' : 'Apagar projeto'}
                  </button>
                ) : null}
              </div>
            </div>
            <div className="info-row">
              <span className="info-label">Status</span>
              <span className="info-value">
                <span className={`badge ${getProjectStatusTone(project.status)}`}>
                  {formatProjectStatus(project.status)}
                </span>
              </span>
            </div>
            <div className="info-row">
              <span className="info-label">Board</span>
              <span className="info-value">
                {project.board ? `${project.board.columns.length} colunas fixas no MVP` : 'Board em preparacao'}
              </span>
            </div>
            <div className="info-row">
              <span className="info-label">Colunas</span>
              <div className="member-list">
                {project.board?.columns.map((column) => (
                  <span className="member-pill" key={column.id}>
                    {column.title}
                  </span>
                )) ?? <span className="info-value">Sem colunas</span>}
              </div>
            </div>
          </aside>
        </div>
      ) : null}
    </AppShell>
  );
}
