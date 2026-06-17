import { type DragEvent } from 'react';
import { Link } from 'react-router-dom';

import {
  formatProjectStatus,
  formatShortDate,
  getProjectStatusTone,
} from '../../app/formatters';
import folderOpenIcon from '../../assets/folder-open.png';
import folderProjectIcon from '../../assets/folder-project.png';
import folderSubfolderIcon from '../../assets/folder-subfolder.png';
import type { ApiUser, Project, ProjectFolder } from '../../types/api';
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

  function getInitials(name?: string | null) {
    if (!name) return '?';

    const parts = name.trim().split(/\s+/).filter(Boolean);
    const first = parts[0]?.[0] ?? '';
    const second = parts.length > 1 ? parts[parts.length - 1]?.[0] : '';
    return `${first}${second}`.toUpperCase();
  }

  function renderAvatar(user: ApiUser) {
    return (
      <span className="project-horizontal-avatar" key={user.id} title={user.name}>
        {user.avatarUrl ? (
          <img alt="" src={user.avatarUrl} />
        ) : (
          <span>{getInitials(user.name)}</span>
        )}
      </span>
    );
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

  function renderLooseProject(project: Project) {
    const canMove = canMoveProject(project);
    const participantUsers = project.members.map((member) => member.user);
    const visibleParticipants = participantUsers.slice(0, 2);
    const extraParticipants = participantUsers.length - visibleParticipants.length;

    return (
      <article
        className="project-horizontal-card"
        draggable={canMove}
        key={project.id}
        role="listitem"
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
          className="project-horizontal-main"
          onClick={() => onOpenBoard(project.id)}
          type="button"
        >
          <div className="project-horizontal-content">
            <div className="project-horizontal-title-row">
              <span className={`badge ${getProjectStatusTone(project.status)}`}>
                {formatProjectStatus(project.status)}
              </span>
              <strong title={project.name}>{project.name}</strong>
            </div>
            {project.description ? (
              <p className="project-horizontal-copy" title={project.description}>
                {project.description}
              </p>
            ) : null}
            <div className="project-horizontal-meta">
              <span>{project.owner.name}</span>
              <span>{formatShortDate(project.deadline)}</span>
              <span>
                {project.members.length} participante
                {project.members.length === 1 ? '' : 's'}
              </span>
            </div>
          </div>
          {participantUsers.length > 0 ? (
            <div className="project-horizontal-avatars" aria-hidden="true">
              {visibleParticipants.map((participant) => renderAvatar(participant))}
              {extraParticipants > 0 ? (
                <span className="project-horizontal-avatar project-horizontal-avatar-extra">
                  +{extraParticipants}
                </span>
              ) : null}
            </div>
          ) : null}
        </button>
        <div className="project-horizontal-actions">
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
          <button
            className="text-button"
            onClick={() => onOpenBoard(project.id)}
            type="button"
          >
            Abrir quadro
          </button>
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
            <img
              alt=""
              aria-hidden="true"
              className="subfolder-icon"
              src={folderSubfolderIcon}
            />
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
            <img
              alt=""
              aria-hidden="true"
              className="folder-icon"
              src={isOpen ? folderOpenIcon : folderProjectIcon}
            />
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
                <div className="project-horizontal-list" role="list">
                  {projects.map((project) => renderLooseProject(project))}
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
