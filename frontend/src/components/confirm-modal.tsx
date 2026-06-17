import { Modal } from "./modal";

type ConfirmModalProps = {
  cancelLabel?: string;
  confirmLabel?: string;
  description: string;
  isConfirming?: boolean;
  open: boolean;
  title: string;
  onClose: () => void;
  onConfirm: () => void | Promise<unknown>;
};

export function ConfirmModal({
  cancelLabel = "Cancelar",
  confirmLabel = "Confirmar",
  description,
  isConfirming = false,
  open,
  title,
  onClose,
  onConfirm,
}: ConfirmModalProps) {
  return (
    <Modal
      footer={
        <>
          <button
            className="secondary-button"
            disabled={isConfirming}
            onClick={onClose}
            type="button"
          >
            {cancelLabel}
          </button>
          <button
            className="button-danger"
            disabled={isConfirming}
            onClick={() => void onConfirm()}
            type="button"
          >
            {isConfirming ? "Processando..." : confirmLabel}
          </button>
        </>
      }
      onClose={onClose}
      open={open}
      title={title}
    >
      <p className="modal-copy">{description}</p>
    </Modal>
  );
}
