import { useMemo, useState } from 'react';

import type { ChecklistItem } from '../../types/api';

type CardChecklistSectionProps = {
  items: ChecklistItem[];
  isBusy: boolean;
  isLoading: boolean;
  errorMessage?: string | null;
  readOnly?: boolean;
  onCreate: (title: string) => Promise<unknown>;
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
  onMove,
  onToggle,
  onRename,
}: CardChecklistSectionProps) {
  const [draftTitle, setDraftTitle] = useState('');
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');

  const completedCount = useMemo(() => items.filter((item) => item.done).length, [items]);

  async function handleCreate() {
    const nextTitle = draftTitle.trim();

    if (!nextTitle) {
      return;
    }

    await onCreate(nextTitle);
    setDraftTitle('');
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

      <div className="checklist-list">
        {items.map((item) => {
          const isEditing = editingItemId === item.id;

          return (
            <div className="checklist-item" key={item.id}>
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
                  <span className={item.done ? 'checklist-title checklist-title-done' : 'checklist-title'}>
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
                        setEditingTitle('');
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
                          setEditingTitle('');
                        })
                      }
                      type="button"
                    >
                      Salvar
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      className="text-button"
                      disabled={isBusy || readOnly || item.position === 0}
                      onClick={() => void onMove(item, item.position - 1)}
                      type="button"
                    >
                      ↑
                    </button>
                    <button
                      className="text-button"
                      disabled={isBusy || readOnly || item.position === items.length - 1}
                      onClick={() => void onMove(item, item.position + 1)}
                      type="button"
                    >
                      ↓
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
          <div className="task-empty">Nenhum item ainda. Adicione os primeiros passos deste card.</div>
        ) : null}
      </div>

      {readOnly ? (
        <p className="field-helper">
          Seu perfil neste projeto e somente leitura. O checklist permanece visivel, mas nao pode ser alterado.
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
