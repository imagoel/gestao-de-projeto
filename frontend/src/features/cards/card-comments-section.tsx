import { useState } from 'react';

import { formatDateTime } from '../../app/formatters';
import type { CardComment } from '../../types/api';

type CardCommentsSectionProps = {
  comments: CardComment[];
  isBusy: boolean;
  isLoading: boolean;
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
};

export function CardCommentsSection({
  comments,
  isBusy,
  isLoading,
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
}: CardCommentsSectionProps) {
  const [draftComment, setDraftComment] = useState('');

  async function handleCreate() {
    const content = draftComment.trim();

    if (!content) {
      return;
    }

    await onCreate(content);
    setDraftComment('');
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
              <span>{formatDateTime(comment.createdAt)}</span>
            </div>
            <p className="comment-content">{comment.content}</p>
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
