import { useState } from 'react';

import { formatDateTime } from '../../app/formatters';
import type { CardComment } from '../../types/api';

type CardCommentsSectionProps = {
  comments: CardComment[];
  isBusy: boolean;
  isLoading: boolean;
  errorMessage?: string | null;
  readOnly?: boolean;
  onCreate: (content: string) => Promise<unknown>;
};

export function CardCommentsSection({
  comments,
  isBusy,
  isLoading,
  errorMessage,
  readOnly = false,
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
        <h3 className="card-section-title">Comentarios</h3>
      </div>

      {isLoading ? <p className="field-helper">Carregando comentarios...</p> : null}
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
          <div className="task-empty">Nenhum comentario ainda. Registre contexto e combinados do card aqui.</div>
        ) : null}
      </div>

      {readOnly ? (
        <p className="field-helper">
          Seu perfil neste projeto e somente leitura. Os comentarios seguem visiveis, mas sem nova publicacao.
        </p>
      ) : null}

      <div className="field-group">
        <label className="field-label" htmlFor="new-comment">
          Novo comentario
        </label>
        <textarea
          className="field-input field-textarea comment-textarea"
          disabled={isBusy || readOnly}
          id="new-comment"
          onChange={(event) => setDraftComment(event.target.value)}
          placeholder="Escreva um comentario..."
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
            Comentar
          </button>
        </div>
      </div>
    </section>
  );
}
