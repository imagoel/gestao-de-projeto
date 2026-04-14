import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';

import { useAuth } from '../app/auth-provider';
import {
  formatLongDate,
  formatProjectStatus,
  getProjectStatusTone,
} from '../app/formatters';
import { AppShell } from '../components/app-shell';
import { StatusState } from '../components/status-state';
import { api } from '../services/api';

export function ProjectDetailPage() {
  const { token } = useAuth();
  const { projectId = 'projeto' } = useParams();
  const projectQuery = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => api.getProject(token!, projectId),
    enabled: Boolean(token && projectId),
  });

  const project = projectQuery.data;
  const action = project ? (
    <div className="page-header-actions">
      <Link className="secondary-button" to="/projetos">
        Voltar aos projetos
      </Link>
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

      {project ? (
        <div className="detail-grid">
          <section className="panel info-list">
            <div className="info-row">
              <span className="info-label">Descricao</span>
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
                  </span>
                ))}
              </div>
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
