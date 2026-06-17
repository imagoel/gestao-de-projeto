import { type DragEvent } from 'react';
import { Link } from 'react-router-dom';

import {
  formatProjectStatus,
  formatShortDate,
  getProjectStatusTone,
} from '../../app/formatters';
import type { Project, ProjectFolder } from '../../types/api';
import { ProjectCard } from './project-card';

type SubfolderGroup = {
  folder: ProjectFolder;
  projects: Project[];
};

type ProjectFolderSectionProps = {
  canManageFolder: (folder: ProjectFolder) => boolean;
  canMoveProject: (project: Project) => boolean;
  deleteFolderDisabled: boolean;
  dragOverKey: string | null;
  draggedProjectId: string | null;
  folder: ProjectFolder;
  isAdmin: boolean;
  isOpen: boolean;
  onClearDragOver: () => void;
  onCreateSubfolder: (folder: ProjectFolder) => void;
  onDelete: (folder: ProjectFolder) => void;
  onDropProject: (projectId: string, folderId: string) => void;
  onFolderDragOver: (folderId: string) => void;
  onOpenBoard: (projectId: string) => void;
  onProjectDragEnd: () => void;
  onProjectDragStart: (projectId: string, event: DragEvent<HTMLElement>) => void;
  onRename: (folder: ProjectFolder) => void;
  onRenameProject: (project: Project) => void;
  onToggle: (folderId: string) => void;
  projects: Project[];
  subfolders: SubfolderGroup[];
};

export function ProjectFolderSection({
  canManageFolder,
  canMoveProject,
  deleteFolderDisabled,
  dragOverKey,
  draggedProjectId,
  folder,
  isAdmin,
  isOpen,
  onClearDragOver,
  onCreateSubfolder,
  onDelete,
  onDropProject,
  onFolderDragOver,
  onOpenBoard,
  onProjectDragEnd,
  onProjectDragStart,
  onRename,
  onRenameProject,
  onToggle,
  projects,
  subfolders,
}: ProjectFolderSectionProps) {
  const totalNestedProjects =
    projects.length +
    subfolders.reduce((total, group) => total + group.projects.length, 0);
  const isDragOver = dragOverKey === folder.id;
  const canManage = canManageFolder(folder);

  function formatCount() {
    if (subfolders.length > 0) {
      return `${subfolders.length} subpasta${subfolders.length === 1 ? '' : 's'} / ${totalNestedProjects} projeto${totalNestedProjects === 1 ? '' : 's'}`;
    }

    return `${totalNestedProjects} projeto${totalNestedProjects === 1 ? '' : 's'}`;
  }

  function handleDrop(event: DragEvent<HTMLElement>, targetFolderId: string) {
    event.preventDefault();
    onClearDragOver();
    const projectId = event.dataTransfer.getData('text/plain');
    if (!projectId) return;
    onDropProject(projectId, targetFolderId);
  }

  function handleDragOver(event: DragEvent<HTMLElement>, targetFolderId: string) {
    if (!draggedProjectId) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    if (dragOverKey !== targetFolderId) onFolderDragOver(targetFolderId);
  }

  function handleDragLeave(event: DragEvent<HTMLElement>) {
    if (!event.currentTarget.contains(event.relatedTarget as Node)) {
      onClearDragOver();
    }
  }

  function renderProjectListItem(project: Project) {
    const canMove = canMoveProject(project);

    return (
      <article
        className="project-compact-row"
        draggable={canMove}
        key={project.id}
        onDragEnd={onProjectDragEnd}
        onDragStart={(event) => {
          if (!canMove) {
            event.preventDefault();
            return;
          }

          onProjectDragStart(project.id, event);
        }}
      >
        <button
          className="project-compact-main"
          onClick={() => onOpenBoard(project.id)}
          type="button"
        >
          <span className={`badge ${getProjectStatusTone(project.status)}`}>
            {formatProjectStatus(project.status)}
          </span>
          <strong>{project.name}</strong>
          <span>{project.owner.name}</span>
          <span>{formatShortDate(project.deadline)}</span>
        </button>
        <div className="project-compact-actions">
          <Link className="text-button" to={`/projetos/${project.id}`}>
            Detalhes
          </Link>
          {canMove ? (
            <button
              className="text-button"
              onClick={() => onRenameProject(project)}
              type="button"
            >
              Editar
            </button>
          ) : null}
        </div>
      </article>
    );
  }

  function renderSubfolder(group: SubfolderGroup) {
    const canManageSubfolder = canManageFolder(group.folder);
    const isSubfolderDragOver = dragOverKey === group.folder.id;

    return (
      <section
        className={`subfolder-section${isSubfolderDragOver ? ' subfolder-section-drop' : ''}`}
        key={group.folder.id}
        onDragLeave={handleDragLeave}
        onDragOver={(event) => handleDragOver(event, group.folder.id)}
        onDrop={(event) => handleDrop(event, group.folder.id)}
      >
        <header className="subfolder-header">
          <div className="subfolder-title">
            <span className="subfolder-icon" aria-hidden="true" />
            <strong>{group.folder.name}</strong>
            <span className="folder-count">
              {group.projects.length} projeto{group.projects.length === 1 ? '' : 's'}
            </span>
          </div>
          {canManageSubfolder ? (
            <div className="folder-actions">
              <button className="text-button" onClick={() => onRename(group.folder)} type="button">
                Renomear
              </button>
              <button
                className="text-button text-button-danger"
                disabled={deleteFolderDisabled}
                onClick={() => onDelete(group.folder)}
                type="button"
              >
                Excluir
              </button>
            </div>
          ) : null}
        </header>

        {group.projects.length > 0 ? (
          <div className="subfolder-project-grid" role="list">
            {group.projects.map((project) => (
              <ProjectCard
                canMove={canMoveProject(project)}
                canRename={canMoveProject(project)}
                key={project.id}
                onDragEnd={onProjectDragEnd}
                onDragStart={onProjectDragStart}
                onOpenBoard={onOpenBoard}
                onRename={onRenameProject}
                project={project}
              />
            ))}
          </div>
        ) : (
          <p className="field-helper folder-empty">
            {isAdmin ? 'Subpasta vazia. Arraste projetos ate aqui.' : 'Subpasta vazia.'}
          </p>
        )}
      </section>
    );
  }

  return (
    <section
      className={`folder-section${isDragOver ? ' folder-section-drop' : ''}`}
      onDragLeave={handleDragLeave}
      onDragOver={(event) => handleDragOver(event, folder.id)}
      onDrop={(event) => handleDrop(event, folder.id)}
    >
      <header className="folder-header">
        <button
          aria-expanded={isOpen}
          className="folder-toggle"
          onClick={() => onToggle(folder.id)}
          type="button"
        >
          <span className="folder-caret">{isOpen ? '▾' : '▸'}</span>
          <span className="folder-title">
            <span className="folder-emoji" aria-hidden="true">
              📁
            </span>
            {folder.name}
          </span>
          <span className="folder-count">{formatCount()}</span>
          <span className="badge badge-gray">
            {folder.visibility === 'SECRETARIAT' ? 'Secretaria' : 'Setor'}
          </span>
        </button>
        {canManage ? (
          <div className="folder-actions">
            <button className="text-button" onClick={() => onCreateSubfolder(folder)} type="button">
              Nova subpasta
            </button>
            <button className="text-button" onClick={() => onRename(folder)} type="button">
              Renomear
            </button>
            <button
              className="text-button text-button-danger"
              disabled={deleteFolderDisabled}
              onClick={() => onDelete(folder)}
              type="button"
            >
              Apagar pasta
            </button>
          </div>
        ) : null}
      </header>

      {isOpen ? (
        totalNestedProjects > 0 || subfolders.length > 0 ? (
          <div className="folder-body">
            {subfolders.map((group) => renderSubfolder(group))}

            {projects.length > 0 ? (
              <section className="loose-project-section">
                <header className="loose-project-header">
                  <span>Projetos sem subpasta</span>
                  <span className="folder-count">
                    {projects.length} projeto{projects.length === 1 ? '' : 's'}
                  </span>
                </header>
                <div className="project-compact-list" role="list">
                  {projects.map((project) => renderProjectListItem(project))}
                </div>
              </section>
            ) : null}
          </div>
        ) : (
          <p className="field-helper folder-empty">
            {isAdmin
              ? 'Pasta vazia. Crie uma subpasta ou arraste projetos ate aqui.'
              : 'Pasta vazia.'}
          </p>
        )
      ) : null}
    </section>
  );
}
