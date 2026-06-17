import {
  useState,
  type DragEvent,
  type FormEvent,
  type UIEvent,
  type WheelEvent,
} from "react";

import {
  formatPriority,
  formatShortDate,
  getDueDateTone,
  getPriorityTone,
} from "../../app/formatters";
import { Modal } from "../../components/modal";
import type { BoardCard, BoardColumn as BoardColumnType } from "../../types/api";
import { TaskCardAvatar } from "./task-card-avatar";

type BoardColumnProps = {
  canWriteProject: boolean;
  column: BoardColumnType;
  columnCount: number;
  dragCardId?: string | null;
  editingColumnId: string | null;
  editingColumnTitle: string;
  isColumnActionPending: boolean;
  isCompletedColumn: boolean;
  showColumnManagement: boolean;
  getColumnBodyClassName: (columnId: string) => string;
  getDropZoneClassName: (columnId: string, position: number) => string;
  onCancelEditingColumn: () => void;
  onChangeEditingColumnTitle: (title: string) => void;
  onColumnDragOver: (
    event: DragEvent<HTMLDivElement>,
    column: BoardColumnType,
  ) => void;
  onColumnDrop: (
    event: DragEvent<HTMLDivElement>,
    column: BoardColumnType,
  ) => void;
  onColumnScroll: (event: UIEvent<HTMLDivElement>, columnId: string) => void;
  onColumnWheel: (event: WheelEvent<HTMLDivElement>, columnId: string) => void;
  onDeleteColumn: (column: BoardColumnType) => void;
  onDrop: (
    event: DragEvent<HTMLElement>,
    columnId: string,
    position: number,
  ) => void;
  onDropZoneDragOver: (
    event: DragEvent<HTMLElement>,
    columnId: string,
    position: number,
  ) => void;
  onOpenCard: (cardId: string) => void;
  onOpenCreateCard: (columnId: string) => void;
  onRenameCard: (card: BoardCard, title: string) => void;
  onRenameColumn: (columnId: string, title: string) => void;
  onReorderColumn: (columnId: string, targetPosition: number) => void;
  onStartEditingColumn: (column: BoardColumnType) => void;
  onStartCardDrag: (
    cardId: string,
    sourceColumnId: string,
    sourcePosition: number,
  ) => void;
  onCardDragEnd: () => void;
  registerColumnBody: (columnId: string, element: HTMLDivElement | null) => void;
};

export function BoardColumn({
  canWriteProject,
  column,
  columnCount,
  dragCardId,
  editingColumnId,
  editingColumnTitle,
  isColumnActionPending,
  isCompletedColumn,
  showColumnManagement,
  getColumnBodyClassName,
  getDropZoneClassName,
  onCancelEditingColumn,
  onChangeEditingColumnTitle,
  onColumnDragOver,
  onColumnDrop,
  onColumnScroll,
  onColumnWheel,
  onDeleteColumn,
  onDrop,
  onDropZoneDragOver,
  onOpenCard,
  onOpenCreateCard,
  onRenameCard,
  onRenameColumn,
  onReorderColumn,
  onStartEditingColumn,
  onStartCardDrag,
  onCardDragEnd,
  registerColumnBody,
}: BoardColumnProps) {
  const [renamingCard, setRenamingCard] = useState<BoardCard | null>(null);
  const [renameCardTitle, setRenameCardTitle] = useState("");

  function handleRenameColumnSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextTitle = editingColumnTitle.trim();
    if (nextTitle) {
      onRenameColumn(column.id, nextTitle);
    }
  }

  function openRenameCardModal(card: BoardCard) {
    setRenamingCard(card);
    setRenameCardTitle(card.title);
  }

  function closeRenameCardModal() {
    setRenamingCard(null);
    setRenameCardTitle("");
  }

  function handleRenameCardSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!renamingCard) {
      return;
    }

    const trimmed = renameCardTitle.trim();

    if (!trimmed) {
      return;
    }

    if (trimmed !== renamingCard.title) {
      onRenameCard(renamingCard, trimmed);
    }

    closeRenameCardModal();
  }

  return (
    <article
      className={
        isCompletedColumn
          ? "board-column board-column-completed"
          : "board-column"
      }
    >
      <div className="board-column-header">
        {editingColumnId === column.id ? (
          <form
            className="inline-form board-column-title-form"
            onSubmit={handleRenameColumnSubmit}
          >
            <input
              autoFocus
              className="field-input board-column-title-input"
              onChange={(event) => onChangeEditingColumnTitle(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  onCancelEditingColumn();
                }
              }}
              type="text"
              value={editingColumnTitle}
            />
            <button className="text-button" type="submit">
              OK
            </button>
          </form>
        ) : (
          <span
            className={
              canWriteProject
                ? "board-column-title board-column-title-editable"
                : "board-column-title"
            }
            onDoubleClick={() => {
              if (canWriteProject) {
                onStartEditingColumn(column);
              }
            }}
            title={canWriteProject ? "Duplo clique para renomear" : ""}
          >
            {column.title}
          </span>
        )}

        <div className="board-column-header-actions">
          {showColumnManagement && canWriteProject && columnCount > 1 ? (
            <>
              {column.position > 0 ? (
                <button
                  className="text-button"
                  disabled={isColumnActionPending}
                  onClick={() => onReorderColumn(column.id, column.position - 1)}
                  title="Mover para esquerda"
                  type="button"
                >
                  &larr;
                </button>
              ) : null}
              {column.position < columnCount - 1 ? (
                <button
                  className="text-button"
                  disabled={isColumnActionPending}
                  onClick={() => onReorderColumn(column.id, column.position + 1)}
                  title="Mover para direita"
                  type="button"
                >
                  &rarr;
                </button>
              ) : null}
            </>
          ) : null}

          <span className="board-column-count">{column.cards.length}</span>
          <button
            className="text-button"
            disabled={!canWriteProject}
            onClick={() => onOpenCreateCard(column.id)}
            type="button"
          >
            + Card
          </button>
          {canWriteProject ? (
            <button
              className="text-button text-button-danger"
              disabled={isColumnActionPending}
              onClick={() => onDeleteColumn(column)}
              title="Remover coluna"
              type="button"
            >
              x
            </button>
          ) : null}
        </div>
      </div>

      <div
        className={getColumnBodyClassName(column.id)}
        onDragOver={(event) => onColumnDragOver(event, column)}
        onDrop={(event) => onColumnDrop(event, column)}
        onScroll={(event) => onColumnScroll(event, column.id)}
        onWheel={(event) => onColumnWheel(event, column.id)}
        ref={(element) => registerColumnBody(column.id, element)}
      >
        {column.cards.length > 0 ? (
          <>
            <div
              className={getDropZoneClassName(column.id, 0)}
              onDragOver={(event) => onDropZoneDragOver(event, column.id, 0)}
              onDrop={(event) => onDrop(event, column.id, 0)}
            />
            {column.cards.map((card, index) => (
              <div key={card.id}>
                <button
                  className={`${
                    dragCardId === card.id
                      ? "task-card task-card-button task-card-dragging"
                      : "task-card task-card-button"
                  }${isCompletedColumn ? " task-card-completed" : ""}`}
                  data-board-card-id={card.id}
                  draggable={canWriteProject}
                  onClick={() => onOpenCard(card.id)}
                  onDragEnd={onCardDragEnd}
                  onDragStart={() => onStartCardDrag(card.id, column.id, index)}
                  type="button"
                >
                  <div className="task-card-top">
                    <span className={`badge ${getPriorityTone(card.priority)}`}>
                      {formatPriority(card.priority)}
                    </span>
                    <div className="task-card-top-actions">
                      {card.dueDate && !isCompletedColumn ? (
                        <span className={getDueDateTone(card.dueDate)}>
                          {formatShortDate(card.dueDate)}
                        </span>
                      ) : null}
                      {canWriteProject ? (
                        <span
                          aria-label="Renomear card"
                          className="task-card-rename"
                          onClick={(event) => {
                            event.stopPropagation();
                            openRenameCardModal(card);
                          }}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              event.stopPropagation();
                              openRenameCardModal(card);
                            }
                          }}
                          role="button"
                          tabIndex={0}
                          title="Renomear card"
                        >
                          ✎
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div className="task-card-main">
                    <h2 className="task-card-title">{card.title}</h2>
                    {!isCompletedColumn ? (
                      <div className="task-card-assignees">
                        <div
                          className="task-card-avatar"
                          title={card.assignee?.name ?? "Sem responsavel"}
                        >
                          <TaskCardAvatar
                            avatarUrl={card.assignee?.avatarUrl}
                            name={card.assignee?.name}
                          />
                        </div>
                      </div>
                    ) : null}
                  </div>
                </button>
                <div
                  className={getDropZoneClassName(column.id, index + 1)}
                  onDragOver={(event) =>
                    onDropZoneDragOver(event, column.id, index + 1)
                  }
                  onDrop={(event) => onDrop(event, column.id, index + 1)}
                />
              </div>
            ))}
          </>
        ) : (
          <div className="task-empty">
            Nenhum card nesta coluna ainda. Use o botao acima para cadastrar o
            primeiro.
          </div>
        )}
      </div>

      <Modal
        footer={
          <>
            <button
              className="secondary-button"
              onClick={closeRenameCardModal}
              type="button"
            >
              Cancelar
            </button>
            <button
              className="primary-button"
              form={`rename-card-form-${column.id}`}
              type="submit"
            >
              Salvar
            </button>
          </>
        }
        onClose={closeRenameCardModal}
        open={Boolean(renamingCard)}
        title="Renomear card"
      >
        <form
          className="form-grid"
          id={`rename-card-form-${column.id}`}
          onSubmit={handleRenameCardSubmit}
        >
          <div className="field-group">
            <label
              className="field-label"
              htmlFor={`rename-card-title-${column.id}`}
            >
              Novo nome do card
            </label>
            <input
              autoFocus
              className="field-input"
              id={`rename-card-title-${column.id}`}
              minLength={2}
              onChange={(event) => setRenameCardTitle(event.target.value)}
              required
              type="text"
              value={renameCardTitle}
            />
          </div>
        </form>
      </Modal>
    </article>
  );
}
