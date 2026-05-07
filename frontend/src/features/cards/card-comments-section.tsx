import { useState } from 'react';

import { formatDateTime } from '../../app/formatters';
import type { CardComment } from '../../types/api';

type ChecklistReference = {
  done: boolean;
  number: number;
  title: string;
};

type CardCommentsSectionProps = {
  comments: CardComment[];
  isBusy: boolean;
  isLoading: boolean;
  checklistReferences?: ChecklistReference[];
  errorMessage?: string | null;
  emptyStateCopy?: string;
  fieldLabel?: string;
  inputId?: string;
  placeholder?: string;
  readOnly?: boolean;
  readOnlyCopy?: string;
  submitLabel?: string;
  title?: string;
  onCreate: (content: string) => Promise<unknown>;
  onDelete?: (commentId: string) => Promise<unknown>;
  onReferenceClick?: (referenceNumber: number) => void;
  onUpdate?: (commentId: string, content: string) => Promise<unknown>;
};

export function CardCommentsSection({
  comments,
  isBusy,
  isLoading,
  checklistReferences = [],
  errorMessage,
  emptyStateCopy = 'Nenhum comentario ainda. Registre contexto e combinados do card aqui.',
  fieldLabel = 'Novo comentario',
  inputId = 'new-comment',
  placeholder = 'Escreva um comentario...',
  readOnly = false,
  readOnlyCopy = 'Seu perfil neste projeto e somente leitura. Os comentarios seguem visiveis, mas sem nova publicacao.',
  submitLabel = 'Comentar',
  title = 'Comentarios',
  onCreate,
  onDelete,
  onReferenceClick,
  onUpdate,
}: CardCommentsSectionProps) {
  const [draftComment, setDraftComment] = useState('');
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingDraft, setEditingDraft] = useState('');
  const referencesByNumber = new Map(
    checklistReferences.map((reference) => [reference.number, reference]),
  );

  async function handleCreate() {
    const content = draftComment.trim();

    if (!content) {
      return;
    }

    await onCreate(content);
    setDraftComment('');
  }

  async function handleUpdate(commentId: string) {
    const content = editingDraft.trim();

    if (!content || !onUpdate) {
      return;
    }

    await onUpdate(commentId, content);
    setEditingCommentId(null);
    setEditingDraft('');
  }

  async function handleDelete(commentId: string) {
    if (!onDelete || !window.confirm('Apagar esta descricao?')) {
      return;
    }

    await onDelete(commentId);
  }

  function hasBeenEdited(comment: CardComment) {
    return Math.abs(new Date(comment.updatedAt).getTime() - new Date(comment.createdAt).getTime()) > 1000;
  }

  function renderContent(content: string) {
    return content.split(/(@\d+)/g).map((part, index) => {
      const match = /^@(\d+)$/.exec(part);

      if (!match) {
        return part;
      }

      const reference = referencesByNumber.get(Number(match[1]));

      if (!reference) {
        return part;
      }

      return (
        <button
          className={
            reference.done
              ? 'checklist-reference checklist-reference-done'
              : 'checklist-reference'
          }
          key={`${part}-${index}`}
          onClick={() => onReferenceClick?.(reference.number)}
          title={`Checklist ${reference.number}: ${reference.title}`}
          type="button"
        >
          {part}
        </button>
      );
    });
  }

  return (
    <section className="card-section">
      <div className="card-section-header">
        <h3 className="card-section-title">{title}</h3>
      </div>

      {isLoading ? <p className="field-helper">Carregando {title.toLowerCase()}...</p> : null}
      {errorMessage ? <p className="form-error">{errorMessage}</p> : null}

      <div className="comment-list">
        {comments.map((comment) => (
          <article className="comment-item" key={comment.id}>
            <div className="comment-header">
              <strong>{comment.author.name}</strong>
              <div className="comment-meta">
                <span>{formatDateTime(comment.createdAt)}</span>
                {hasBeenEdited(comment) ? (
                  <span className="comment-edited">
                    Editada em {formatDateTime(comment.updatedAt)}
                  </span>
                ) : null}
              </div>
            </div>
            {editingCommentId === comment.id ? (
              <div className="comment-edit-form">
                <textarea
                  className="field-input field-textarea comment-textarea"
                  disabled={isBusy}
                  onChange={(event) => setEditingDraft(event.target.value)}
                  rows={3}
                  value={editingDraft}
                />
                <div className="inline-form inline-form-end">
                  <button
                    className="secondary-button"
                    disabled={isBusy}
                    onClick={() => {
                      setEditingCommentId(null);
                      setEditingDraft('');
                    }}
                    type="button"
                  >
                    Cancelar
                  </button>
                  <button
                    className="primary-button"
                    disabled={isBusy || !editingDraft.trim()}
                    onClick={() => void handleUpdate(comment.id)}
                    type="button"
                  >
                    Salvar
                  </button>
                </div>
              </div>
            ) : (
              <p className="comment-content">{renderContent(comment.content)}</p>
            )}
            {!readOnly && editingCommentId !== comment.id && (onUpdate || onDelete) ? (
              <div className="comment-actions">
                {onUpdate ? (
                  <button
                    className="text-button"
                    disabled={isBusy}
                    onClick={() => {
                      setEditingCommentId(comment.id);
                      setEditingDraft(comment.content);
                    }}
                    type="button"
                  >
                    Editar
                  </button>
                ) : null}
                {onDelete ? (
                  <button
                    className="text-button text-button-danger"
                    disabled={isBusy}
                    onClick={() => void handleDelete(comment.id)}
                    type="button"
                  >
                    Excluir
                  </button>
                ) : null}
              </div>
            ) : null}
          </article>
        ))}

        {!isLoading && comments.length === 0 ? (
          <div className="task-empty">{emptyStateCopy}</div>
        ) : null}
      </div>

      {readOnly ? <p className="field-helper">{readOnlyCopy}</p> : null}

      <div className="field-group">
        <label className="field-label" htmlFor={inputId}>
          {fieldLabel}
        </label>
        <textarea
          className="field-input field-textarea comment-textarea"
          disabled={isBusy || readOnly}
          id={inputId}
          onChange={(event) => setDraftComment(event.target.value)}
          placeholder={placeholder}
          rows={3}
          value={draftComment}
        />
        {checklistReferences.length > 0 ? (
          <p className="field-helper">
            Use @1, @2, @3... para referenciar itens do checklist.
          </p>
        ) : null}
        <div className="inline-form inline-form-end">
          <button
            className="secondary-button"
            disabled={isBusy || readOnly || !draftComment.trim()}
            onClick={() => void handleCreate()}
            type="button"
          >
            {submitLabel}
          </button>
        </div>
      </div>
    </section>
  );
}
