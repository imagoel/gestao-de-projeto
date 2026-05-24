import { Modal } from '../../components/modal';
import type { ProjectFolder } from '../../types/api';

type RenameFolderModalProps = {
  error: string | null;
  folder: ProjectFolder | null;
  isPending: boolean;
  onClose: () => void;
  onSave: (folderId: string, name: string) => void;
  onValueChange: (value: string) => void;
  value: string;
};

export function RenameFolderModal({
  error,
  folder,
  isPending,
  onClose,
  onSave,
  onValueChange,
  value,
}: RenameFolderModalProps) {
  return (
    <Modal
      title="Renomear pasta"
      description="Atualize o nome da pasta. Os projetos contidos sao mantidos."
      open={Boolean(folder)}
      onClose={onClose}
      footer={
        <>
          <button className="secondary-button" onClick={onClose} type="button">
            Cancelar
          </button>
          <button
            className="primary-button"
            disabled={isPending || !value.trim() || !folder}
            onClick={() => folder && onSave(folder.id, value.trim())}
            type="button"
          >
            {isPending ? 'Salvando...' : 'Salvar'}
          </button>
        </>
      }
    >
      <div className="form-grid">
        <div className="field-group">
          <label className="field-label" htmlFor="rename-folder-name">
            Nome da pasta
          </label>
          <input
            autoFocus
            className="field-input"
            id="rename-folder-name"
            onChange={(event) => onValueChange(event.target.value)}
            type="text"
            value={value}
          />
        </div>
        {error ? <p className="form-error">{error}</p> : null}
      </div>
    </Modal>
  );
}
