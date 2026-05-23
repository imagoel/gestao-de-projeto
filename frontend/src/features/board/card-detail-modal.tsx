import type { FormEvent } from "react";

import { formatPriority, getPriorityTone } from "../../app/formatters";
import { Modal } from "../../components/modal";
import { StatusState } from "../../components/status-state";
import { CardChecklistSection } from "../cards/card-checklist-section";
import { CardCommentsSection } from "../cards/card-comments-section";
import type {
  ApiUser,
  CardComment,
  CardDetail,
  CardPriority,
  ChecklistItem,
} from "../../types/api";

type EditCardFormState = {
  assigneeId: string;
  dueDate: string;
  priority: CardPriority;
  title: string;
};

type ChecklistReference = {
  done: boolean;
  id: string;
  number: number;
  title: string;
};

type CardDetailModalProps = {
  canEditProject: boolean;
  card?: CardDetail;
  cardDescriptionErrorMessage?: string | null;
  cardDescriptions: CardComment[];
  checklistErrorMessage?: string | null;
  checklistItems: ChecklistItem[];
  checklistReferences: ChecklistReference[];
  currentCardColumnName?: string;
  editError?: string | null;
  form: EditCardFormState;
  isArchivePending: boolean;
  isChecklistBusy: boolean;
  isChecklistLoading: boolean;
  isCommentsBusy: boolean;
  isCommentsLoading: boolean;
  isLoading: boolean;
  isOpen: boolean;
  isSavePending: boolean;
  loadErrorMessage?: string | null;
  memberOptions: ApiUser[];
  priorityOptions: CardPriority[];
  onArchive: () => void;
  onChangeForm: (form: EditCardFormState) => void;
  onChecklistCreate: (title: string) => Promise<unknown>;
  onChecklistDelete: (item: ChecklistItem) => Promise<unknown>;
  onChecklistMove: (
    item: ChecklistItem,
    targetPosition: number,
  ) => Promise<unknown>;
  onChecklistRename: (item: ChecklistItem, title: string) => Promise<unknown>;
  onChecklistToggle: (item: ChecklistItem) => Promise<unknown>;
  onClose: () => void;
  onCommentCreate: (content: string) => Promise<unknown>;
  onCommentDelete: (commentId: string) => Promise<unknown>;
  onCommentReferenceClick: (referenceId: string) => void;
  onCommentUpdate: (commentId: string, content: string) => Promise<unknown>;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function CardDetailModal({
  canEditProject,
  card,
  cardDescriptionErrorMessage,
  cardDescriptions,
  checklistErrorMessage,
  checklistItems,
  checklistReferences,
  currentCardColumnName,
  editError,
  form,
  isArchivePending,
  isChecklistBusy,
  isChecklistLoading,
  isCommentsBusy,
  isCommentsLoading,
  isLoading,
  isOpen,
  isSavePending,
  loadErrorMessage,
  memberOptions,
  priorityOptions,
  onArchive,
  onChangeForm,
  onChecklistCreate,
  onChecklistDelete,
  onChecklistMove,
  onChecklistRename,
  onChecklistToggle,
  onClose,
  onCommentCreate,
  onCommentDelete,
  onCommentReferenceClick,
  onCommentUpdate,
  onSubmit,
}: CardDetailModalProps) {
  return (
    <Modal
      footer={
        <>
          <button className="secondary-button" onClick={onClose} type="button">
            Fechar
          </button>
          <button
            className="secondary-button button-danger"
            disabled={isArchivePending || !card || !canEditProject}
            onClick={onArchive}
            type="button"
          >
            {isArchivePending ? "Arquivando..." : "Arquivar"}
          </button>
          <button
            className="primary-button"
            disabled={isSavePending || !card || !canEditProject}
            form="edit-card-form"
            type="submit"
          >
            {isSavePending ? "Salvando..." : "Salvar card"}
          </button>
        </>
      }
      onClose={onClose}
      open={isOpen}
      title={card?.title ?? "Detalhe do card"}
    >
      {isLoading ? (
        <StatusState
          tone="loading"
          title="Carregando card"
          copy="Estamos buscando os dados mais recentes deste card."
        />
      ) : null}

      {loadErrorMessage ? (
        <StatusState
          tone="error"
          title="Nao foi possivel carregar o card"
          copy={loadErrorMessage}
        />
      ) : null}

      {card ? (
        <div className="card-detail-stack">
          <form className="form-grid" id="edit-card-form" onSubmit={onSubmit}>
            <div className="badge-row">
              <span className="badge badge-gray">
                Coluna atual: {currentCardColumnName ?? "Sem coluna"}
              </span>
              <span className={`badge ${getPriorityTone(card.priority)}`}>
                {formatPriority(card.priority)}
              </span>
            </div>

            <div className="field-group">
              <label className="field-label" htmlFor="edit-card-title">
                Titulo
              </label>
              <input
                className="field-input"
                disabled={!canEditProject}
                id="edit-card-title"
                minLength={2}
                onChange={(event) =>
                  onChangeForm({
                    ...form,
                    title: event.target.value,
                  })
                }
                required
                type="text"
                value={form.title}
              />
            </div>

            <CardCommentsSection
              checklistReferences={checklistReferences}
              comments={cardDescriptions}
              emptyStateCopy="Nenhuma descricao registrada ainda. Use esta area para contexto, andamento e observacoes do card."
              errorMessage={cardDescriptionErrorMessage}
              fieldLabel="Adicionar descricao"
              inputId="card-description-history"
              isBusy={isCommentsBusy}
              isLoading={isCommentsLoading}
              placeholder="Escreva uma descricao, observacao ou atualizacao..."
              readOnly={!canEditProject}
              readOnlyCopy="Seu perfil neste projeto e somente leitura. As descricoes seguem visiveis, mas sem novos registros."
              submitLabel="Registrar"
              title="Descricao"
              onCreate={onCommentCreate}
              onDelete={onCommentDelete}
              onReferenceClick={onCommentReferenceClick}
              onUpdate={onCommentUpdate}
            />

            <div className="form-row form-row-3">
              <div className="field-group">
                <label className="field-label" htmlFor="edit-card-assignee">
                  Responsavel
                </label>
                <select
                  className="field-input"
                  disabled={!canEditProject}
                  id="edit-card-assignee"
                  onChange={(event) =>
                    onChangeForm({
                      ...form,
                      assigneeId: event.target.value,
                    })
                  }
                  required
                  value={form.assigneeId}
                >
                  <option value="">Selecione</option>
                  {memberOptions.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field-group">
                <label className="field-label" htmlFor="edit-card-priority">
                  Prioridade
                </label>
                <select
                  className="field-input"
                  disabled={!canEditProject}
                  id="edit-card-priority"
                  onChange={(event) =>
                    onChangeForm({
                      ...form,
                      priority: event.target.value as CardPriority,
                    })
                  }
                  value={form.priority}
                >
                  {priorityOptions.map((priority) => (
                    <option key={priority} value={priority}>
                      {formatPriority(priority)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field-group">
                <label className="field-label" htmlFor="edit-card-due-date">
                  Prazo (opcional)
                </label>
                <input
                  className="field-input"
                  disabled={!canEditProject}
                  id="edit-card-due-date"
                  onChange={(event) =>
                    onChangeForm({
                      ...form,
                      dueDate: event.target.value,
                    })
                  }
                  type="date"
                  value={form.dueDate}
                />
              </div>
            </div>

            {editError ? <p className="form-error">{editError}</p> : null}
          </form>

          <CardChecklistSection
            errorMessage={checklistErrorMessage}
            isBusy={isChecklistBusy}
            isLoading={isChecklistLoading}
            items={checklistItems}
            readOnly={!canEditProject}
            onCreate={onChecklistCreate}
            onDelete={onChecklistDelete}
            onMove={onChecklistMove}
            onRename={onChecklistRename}
            onToggle={onChecklistToggle}
          />
        </div>
      ) : null}
    </Modal>
  );
}

