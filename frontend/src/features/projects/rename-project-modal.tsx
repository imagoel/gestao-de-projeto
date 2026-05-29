import { Modal } from '../../components/modal';
import type { Project } from '../../types/api';

type RenameProjectModalProps = {
  error: string | null;
  isPending: boolean;
  onClose: () => void;
  onSave: (projectId: string, name: string) => void;
  onValueChange: (value: string) => void;
  project: Project | null;
  value: string;
};

export function RenameProjectModal({
  error,
  isPending,
  onClose,
  onSave,
  onValueChange,
  project,
  value,
}: RenameProjectModalProps) {
  const trimmedName = value.trim();

  return (
    <Modal
      title="Renomear projeto"
      description="Atualize o nome exibido na lista de projetos, detalhes e quadro."
      open={Boolean(project)}
      onClose={onClose}
      footer={
        <>
          <button className="secondary-button" onClick={onClose} type="button">
            Cancelar
          </button>
          <button
            className="primary-button"
            disabled={isPending || trimmedName.length < 2 || !project}
            onClick={() => project && onSave(project.id, trimmedName)}
            type="button"
          >
            {isPending ? 'Salvando...' : 'Salvar'}
          </button>
        </>
      }
    >
      <div className="form-grid">
        <div className="field-group">
          <label className="field-label" htmlFor="rename-project-name">
            Nome do projeto
          </label>
          <input
            autoFocus
            className="field-input"
            id="rename-project-name"
            minLength={2}
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
