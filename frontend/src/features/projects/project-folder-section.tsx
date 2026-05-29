import { type DragEvent, type UIEvent } from 'react';

import type { Project, ProjectFolder } from '../../types/api';
import { ProjectCard } from './project-card';

type ProjectFolderSectionProps = {
  canManage: boolean;
  canMoveProject: (project: Project) => boolean;
  deleteFolderDisabled: boolean;
  dragOverKey: string | null;
  draggedProjectId: string | null;
  folder: ProjectFolder;
  getRowShellClassName: (folderId: string) => string;
  isAdmin: boolean;
  isOpen: boolean;
  onClearDragOver: () => void;
  onDelete: (folder: ProjectFolder) => void;
  onDropProject: (projectId: string, folderId: string) => void;
  onFolderDragOver: (folderId: string) => void;
  onOpenBoard: (projectId: string) => void;
  onProjectDragEnd: () => void;
  onProjectDragStart: (projectId: string, event: DragEvent<HTMLElement>) => void;
  onRename: (folder: ProjectFolder) => void;
  onRenameProject: (project: Project) => void;
  onRowScroll: (event: UIEvent<HTMLDivElement>, folderId: string) => void;
  onToggle: (folderId: string) => void;
  projects: Project[];
  registerProjectRow: (folderId: string, element: HTMLDivElement | null) => void;
};

export function ProjectFolderSection({
  canManage,
  canMoveProject,
  deleteFolderDisabled,
  dragOverKey,
  draggedProjectId,
  folder,
  getRowShellClassName,
  isAdmin,
  isOpen,
  onClearDragOver,
  onDelete,
  onDropProject,
  onFolderDragOver,
  onOpenBoard,
  onProjectDragEnd,
  onProjectDragStart,
  onRename,
  onRenameProject,
  onRowScroll,
  onToggle,
  projects,
  registerProjectRow,
}: ProjectFolderSectionProps) {
  const isDragOver = dragOverKey === folder.id;

  function handleDrop(event: DragEvent) {
    event.preventDefault();
    onClearDragOver();
    const projectId = event.dataTransfer.getData('text/plain');
    if (!projectId) return;
    onDropProject(projectId, folder.id);
  }

  return (
    <section
      className={`folder-section${isDragOver ? ' folder-section-drop' : ''}`}
      onDragOver={(event) => {
        if (!draggedProjectId) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
        if (dragOverKey !== folder.id) onFolderDragOver(folder.id);
      }}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node)) onClearDragOver();
      }}
      onDrop={draggedProjectId ? handleDrop : undefined}
    >
      <header className="folder-header">
        <button
          className="folder-toggle"
          onClick={() => onToggle(folder.id)}
          type="button"
          aria-expanded={isOpen}
        >
          <span className="folder-caret">{isOpen ? '▾' : '▸'}</span>
          <span className="folder-title">
            <span className="folder-emoji" aria-hidden="true">
              📁
            </span>
            {folder.name}
          </span>
          <span className="folder-count">({projects.length})</span>
          <span className="badge badge-gray">
            {folder.visibility === 'SECRETARIAT' ? 'Secretaria' : 'Setor'}
          </span>
        </button>
        {canManage ? (
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="text-button" onClick={() => onRename(folder)} type="button">
              Renomear
            </button>
            <button
              className="text-button"
              disabled={deleteFolderDisabled}
              onClick={() => onDelete(folder)}
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
          <div className={getRowShellClassName(folder.id)}>
            <div
              aria-label={`Projetos da pasta ${folder.name}`}
              className="project-row-scroll"
              onScroll={(event) => onRowScroll(event, folder.id)}
              ref={(element) => registerProjectRow(folder.id, element)}
              role="list"
            >
              {projects.map((project) => (
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
          </div>
        ) : (
          <p className="field-helper folder-empty">
            {isAdmin ? 'Pasta vazia. Arraste projetos ate aqui para mover.' : 'Pasta vazia.'}
          </p>
        )
      ) : null}
    </section>
  );
}
