import { Modal } from "../../components/modal";

type NewColumnModalProps = {
  errorMessage?: string | null;
  isCreating: boolean;
  open: boolean;
  title: string;
  onChangeTitle: (title: string) => void;
  onClose: () => void;
  onCreate: (title: string) => void;
};

export function NewColumnModal({
  errorMessage,
  isCreating,
  open,
  title,
  onChangeTitle,
  onClose,
  onCreate,
}: NewColumnModalProps) {
  const trimmedTitle = title.trim();

  return (
    <Modal
      title="Nova coluna"
      description="Adicione uma nova coluna ao quadro Kanban."
      open={open}
      onClose={onClose}
      footer={
        <>
          <button className="secondary-button" onClick={onClose} type="button">
            Cancelar
          </button>
          <button
            className="primary-button"
            disabled={isCreating || !trimmedTitle}
            onClick={() => onCreate(trimmedTitle)}
            type="button"
          >
            {isCreating ? "Criando..." : "Criar coluna"}
          </button>
        </>
      }
    >
      <div className="form-grid">
        <div className="field-group">
          <label className="field-label" htmlFor="new-column-title">
            Nome da coluna
          </label>
          <input
            autoFocus
            className="field-input"
            id="new-column-title"
            onChange={(event) => onChangeTitle(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && trimmedTitle) {
                event.preventDefault();
                onCreate(trimmedTitle);
              }
            }}
            type="text"
            value={title}
          />
        </div>
        {errorMessage ? <p className="form-error">{errorMessage}</p> : null}
      </div>
    </Modal>
  );
}

