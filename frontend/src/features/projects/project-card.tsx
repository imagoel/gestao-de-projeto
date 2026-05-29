import { type DragEvent } from 'react';
import { Link } from 'react-router-dom';

import {
  formatProjectStatus,
  formatShortDate,
  getProjectStatusTone,
} from '../../app/formatters';
import type { Project } from '../../types/api';

type ProjectCardProps = {
  canRename: boolean;
  project: Project;
  canMove: boolean;
  onDragEnd: () => void;
  onDragStart: (projectId: string, event: DragEvent<HTMLElement>) => void;
  onOpenBoard: (projectId: string) => void;
  onRename: (project: Project) => void;
};

export function ProjectCard({
  canRename,
  project,
  canMove,
  onDragEnd,
  onDragStart,
  onOpenBoard,
  onRename,
}: ProjectCardProps) {
  const hasDescription = Boolean(project.description?.trim());
  const classNames = [
    'project-card',
    canMove ? 'project-card-draggable' : '',
    hasDescription ? 'project-card-with-description' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <article
      className={classNames}
      draggable={canMove}
      role="listitem"
      onDragStart={(event) => {
        if (!canMove) {
          event.preventDefault();
          return;
        }

        onDragStart(project.id, event);
      }}
      onDragEnd={onDragEnd}
    >
      <button
        className="project-card-main"
        onClick={() => onOpenBoard(project.id)}
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
          {hasDescription ? (
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
        {canRename ? (
          <button
            aria-label={`Renomear projeto ${project.name}`}
            className="text-button"
            onClick={() => onRename(project)}
            title="Renomear projeto"
            type="button"
          >
            Editar
          </button>
        ) : null}
        <Link
          className="secondary-button project-card-board-link"
          to={`/projetos/${project.id}/quadro`}
        >
          Abrir quadro
        </Link>
      </div>
    </article>
  );
}
