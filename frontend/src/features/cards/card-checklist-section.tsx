import { useMemo, useState, type DragEvent } from "react";

import type { ChecklistItem } from "../../types/api";

type CardChecklistSectionProps = {
  items: ChecklistItem[];
  isBusy: boolean;
  isLoading: boolean;
  errorMessage?: string | null;
  readOnly?: boolean;
  onCreate: (title: string) => Promise<unknown>;
  onDelete: (item: ChecklistItem) => Promise<unknown>;
  onMove: (item: ChecklistItem, targetPosition: number) => Promise<unknown>;
  onToggle: (item: ChecklistItem) => Promise<unknown>;
  onRename: (item: ChecklistItem, title: string) => Promise<unknown>;
};

export function CardChecklistSection({
  items,
  isBusy,
  isLoading,
  errorMessage,
  readOnly = false,
  onCreate,
  onDelete,
  onMove,
  onToggle,
  onRename,
}: CardChecklistSectionProps) {
  const [draftTitle, setDraftTitle] = useState("");
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [dragItemId, setDragItemId] = useState<string | null>(null);
  const [dropPosition, setDropPosition] = useState<number | null>(null);

  const completedCount = useMemo(
    () => items.filter((item) => item.done).length,
    [items],
  );

  async function handleCreate() {
    const nextTitle = draftTitle.trim();

    if (!nextTitle) {
      return;
    }

    await onCreate(nextTitle);
    setDraftTitle("");
  }

  function getDropPositionFromPointer(event: DragEvent<HTMLDivElement>) {
    const currentTarget = event.currentTarget;
    const visibleItems = items.filter((item) => item.id !== dragItemId);
    const itemElements = Array.from(
      currentTarget.querySelectorAll<HTMLElement>("[data-checklist-item-id]"),
    ).filter((element) => element.dataset.checklistItemId !== dragItemId);

    if (visibleItems.length === 0 || itemElements.length === 0) {
      return 0;
    }

    const targetIndex = itemElements.findIndex((element) => {
      const bounds = element.getBoundingClientRect();
      return event.clientY < bounds.top + bounds.height / 2;
    });

    return targetIndex === -1 ? visibleItems.length : targetIndex;
  }

  function handleDragStart(itemId: string) {
    if (isBusy || readOnly) {
      return;
    }

    setDragItemId(itemId);
    setDropPosition(null);
  }

  function handleDragEnd() {
    setDragItemId(null);
    setDropPosition(null);
  }

  function handleListDragOver(event: DragEvent<HTMLDivElement>) {
    if (!dragItemId || isBusy || readOnly) {
      return;
    }

    event.preventDefault();
    const nextPosition = getDropPositionFromPointer(event);

    if (dropPosition !== nextPosition) {
      setDropPosition(nextPosition);
    }
  }

  async function handleListDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();

    if (!dragItemId || isBusy || readOnly) {
      return;
    }

    const draggedItem = items.find((item) => item.id === dragItemId);

    if (!draggedItem) {
      handleDragEnd();
      return;
    }

    const targetPosition = getDropPositionFromPointer(event);

    if (targetPosition === draggedItem.position) {
      handleDragEnd();
      return;
    }

    try {
      await onMove(draggedItem, targetPosition);
    } finally {
      handleDragEnd();
    }
  }

  return (
    <section className="card-section">
      <div className="card-section-header">
        <h3 className="card-section-title">
          Checklist <span>{completedCount} / {items.length}</span>
        </h3>
      </div>

      {isLoading ? <p className="field-helper">Carregando checklist...</p> : null}
      {errorMessage ? <p className="form-error">{errorMessage}</p> : null}

      <div
        className={
          dragItemId ? "checklist-list checklist-list-dragging" : "checklist-list"
        }
        onDragOver={handleListDragOver}
        onDrop={(event) => void handleListDrop(event)}
      >
        {items.map((item) => {
          const isEditing = editingItemId === item.id;
          const visibleIndex = items
            .filter((candidate) => candidate.id !== dragItemId)
            .findIndex((candidate) => candidate.id === item.id);
          const checklistItemClassName = [
            "checklist-item",
            dragItemId === item.id ? "checklist-item-dragging" : "",
            visibleIndex !== -1 && dropPosition === visibleIndex
              ? "checklist-item-drop-before"
              : "",
            visibleIndex !== -1 && dropPosition === visibleIndex + 1
              ? "checklist-item-drop-after"
              : "",
          ]
            .filter(Boolean)
            .join(" ");

          return (
            <div
              className={checklistItemClassName}
              data-checklist-item-id={item.id}
              draggable={!isBusy && !readOnly && !isEditing}
              key={item.id}
              onDragEnd={handleDragEnd}
              onDragStart={() => handleDragStart(item.id)}
            >
              <label className="checklist-main">
                <input
                  checked={item.done}
                  disabled={isBusy || readOnly}
                  onChange={() => void onToggle(item)}
                  type="checkbox"
                />
                {isEditing ? (
                  <input
                    className="field-input checklist-inline-input"
                    onChange={(event) => setEditingTitle(event.target.value)}
                    value={editingTitle}
                  />
                ) : (
                  <span
                    className={
                      item.done
                        ? "checklist-title checklist-title-done"
                        : "checklist-title"
                    }
                  >
                    {item.title}
                  </span>
                )}
              </label>

              <div className="checklist-actions">
                {isEditing ? (
                  <>
                    <button
                      className="text-button"
                      disabled={isBusy || readOnly}
                      onClick={() => {
                        setEditingItemId(null);
                        setEditingTitle("");
                      }}
                      type="button"
                    >
                      Cancelar
                    </button>
                    <button
                      className="text-button"
                      disabled={isBusy || readOnly}
                      onClick={() =>
                        void onRename(item, editingTitle.trim()).then(() => {
                          setEditingItemId(null);
                          setEditingTitle("");
                        })
                      }
                      type="button"
                    >
                      Salvar
                    </button>
                  </>
                ) : (
                  <>
                    {!readOnly ? (
                      <span className="checklist-drag-hint">Arrastar</span>
                    ) : null}
                    <button
                      className="text-button text-button-danger"
                      disabled={isBusy || readOnly}
                      onClick={() => {
                        const shouldDelete = window.confirm(
                          `Excluir o item "${item.title}" do checklist?`,
                        );

                        if (!shouldDelete) {
                          return;
                        }

                        void onDelete(item);
                      }}
                      type="button"
                    >
                      Excluir
                    </button>
                    <button
                      className="text-button"
                      disabled={isBusy || readOnly}
                      onClick={() => {
                        setEditingItemId(item.id);
                        setEditingTitle(item.title);
                      }}
                      type="button"
                    >
                      Editar
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}

        {!isLoading && items.length === 0 ? (
          <div className="task-empty">
            Nenhum item ainda. Adicione os primeiros passos deste card.
          </div>
        ) : null}
      </div>

      {readOnly ? (
        <p className="field-helper">
          Seu perfil neste projeto e somente leitura. O checklist permanece
          visivel, mas nao pode ser alterado.
        </p>
      ) : null}

      <div className="inline-form">
        <input
          className="field-input"
          disabled={isBusy || readOnly}
          onChange={(event) => setDraftTitle(event.target.value)}
          placeholder="Novo item do checklist"
          type="text"
          value={draftTitle}
        />
        <button
          className="secondary-button"
          disabled={isBusy || readOnly || !draftTitle.trim()}
          onClick={() => void handleCreate()}
          type="button"
        >
          Adicionar
        </button>
      </div>
    </section>
  );
}
