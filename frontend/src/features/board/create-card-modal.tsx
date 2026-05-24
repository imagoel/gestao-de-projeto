import type { FormEvent } from "react";

import { formatPriority } from "../../app/formatters";
import { Modal } from "../../components/modal";
import type { ApiUser, BoardColumn, CardPriority } from "../../types/api";
import type { CreateCardFormState } from "./board-form-state";

type CreateCardModalProps = {
  columns: BoardColumn[];
  errorMessage?: string | null;
  form: CreateCardFormState;
  isSaving: boolean;
  memberOptions: ApiUser[];
  open: boolean;
  priorityOptions: CardPriority[];
  onChangeForm: (form: CreateCardFormState) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function CreateCardModal({
  columns,
  errorMessage,
  form,
  isSaving,
  memberOptions,
  open,
  priorityOptions,
  onChangeForm,
  onClose,
  onSubmit,
}: CreateCardModalProps) {
  return (
    <Modal
      description="O card pode ser criado com titulo, responsavel e prioridade. O prazo agora e opcional."
      footer={
        <>
          <button className="secondary-button" onClick={onClose} type="button">
            Cancelar
          </button>
          <button
            className="primary-button"
            disabled={isSaving}
            form="create-card-form"
            type="submit"
          >
            {isSaving ? "Salvando..." : "Criar card"}
          </button>
        </>
      }
      onClose={onClose}
      open={open}
      title="Novo card"
    >
      <form className="form-grid" id="create-card-form" onSubmit={onSubmit}>
        <div className="field-group">
          <label className="field-label" htmlFor="create-card-title">
            Titulo
          </label>
          <input
            className="field-input"
            id="create-card-title"
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

        <div className="form-row form-row-3">
          <div className="field-group">
            <label className="field-label" htmlFor="create-card-column">
              Coluna
            </label>
            <select
              className="field-input"
              id="create-card-column"
              onChange={(event) =>
                onChangeForm({
                  ...form,
                  columnId: event.target.value,
                })
              }
              required
              value={form.columnId}
            >
              <option value="">Selecione</option>
              {columns.map((column) => (
                <option key={column.id} value={column.id}>
                  {column.title}
                </option>
              ))}
            </select>
          </div>

          <div className="field-group">
            <label className="field-label" htmlFor="create-card-assignee">
              Responsavel
            </label>
            <select
              className="field-input"
              id="create-card-assignee"
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
            <label className="field-label" htmlFor="create-card-priority">
              Prioridade
            </label>
            <select
              className="field-input"
              id="create-card-priority"
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
        </div>

        <div className="field-group">
          <label className="field-label" htmlFor="create-card-due-date">
            Prazo (opcional)
          </label>
          <input
            className="field-input"
            id="create-card-due-date"
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

        {errorMessage ? <p className="form-error">{errorMessage}</p> : null}
      </form>
    </Modal>
  );
}
