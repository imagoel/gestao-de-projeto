import {
  formatDateTime,
  formatPriority,
  formatShortDate,
  getDueDateTone,
  getPriorityTone,
} from "../../app/formatters";
import { Modal } from "../../components/modal";
import { StatusState } from "../../components/status-state";
import type { CardDetail } from "../../types/api";

type ArchivedCardsModalProps = {
  cards: CardDetail[];
  canEditProject: boolean;
  errorMessage?: string | null;
  isLoading: boolean;
  isRestoring: boolean;
  open: boolean;
  onClose: () => void;
  onRestore: (cardId: string) => void;
};

export function ArchivedCardsModal({
  cards,
  canEditProject,
  errorMessage,
  isLoading,
  isRestoring,
  open,
  onClose,
  onRestore,
}: ArchivedCardsModalProps) {
  return (
    <Modal
      title="Cards arquivados"
      description="Cards concluidos ou retirados do fluxo atual ficam guardados aqui para consulta e restauracao."
      footer={
        <button className="secondary-button" onClick={onClose} type="button">
          Fechar
        </button>
      }
      onClose={onClose}
      open={open}
    >
      <div className="card-detail-stack">
        {isLoading ? (
          <StatusState
            tone="loading"
            title="Carregando arquivados"
            copy="Estamos reunindo os cards arquivados deste projeto."
          />
        ) : null}

        {errorMessage ? (
          <StatusState
            tone="error"
            title="Nao foi possivel carregar os arquivados"
            copy={errorMessage}
          />
        ) : null}

        {!isLoading && !errorMessage ? (
          cards.length > 0 ? (
            <div className="archived-card-list">
              {cards.map((card) => (
                <article className="archived-card-item" key={card.id}>
                  <div className="archived-card-main">
                    <div className="badge-row">
                      <span className={`badge ${getPriorityTone(card.priority)}`}>
                        {formatPriority(card.priority)}
                      </span>
                      <span className="badge badge-gray">
                        Coluna original: {card.column.title ?? "Sem coluna"}
                      </span>
                    </div>
                    <h3 className="archived-card-title">{card.title}</h3>
                    <div className="archived-card-meta">
                      <span>
                        Responsavel: {card.assignee?.name ?? "Sem responsavel"}
                      </span>
                      <span className={getDueDateTone(card.dueDate)}>
                        {formatShortDate(card.dueDate)}
                      </span>
                      <span>Arquivado em {formatDateTime(card.updatedAt)}</span>
                    </div>
                  </div>
                  <div className="archived-card-actions">
                    <button
                      className="secondary-button"
                      disabled={!canEditProject || isRestoring}
                      onClick={() => onRestore(card.id)}
                      type="button"
                    >
                      {isRestoring ? "Restaurando..." : "Restaurar"}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="task-empty">
              Nenhum card arquivado neste projeto no momento.
            </div>
          )
        ) : null}

        {!canEditProject ? (
          <p className="field-helper">
            Seu perfil neste projeto e somente leitura. Os cards arquivados seguem
            visiveis, mas sem restauracao.
          </p>
        ) : null}
      </div>
    </Modal>
  );
}

