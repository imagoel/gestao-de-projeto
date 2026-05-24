import { Modal } from '../../components/modal';
import type { AvailableSector, FolderFormState } from './projects-types';

type CreateFolderModalProps = {
  availableSectors: AvailableSector[];
  error: string | null;
  form: FolderFormState;
  isPending: boolean;
  onChange: (form: FolderFormState) => void;
  onClose: () => void;
  onCreate: (form: FolderFormState) => void;
  open: boolean;
};

export function CreateFolderModal({
  availableSectors,
  error,
  form,
  isPending,
  onChange,
  onClose,
  onCreate,
  open,
}: CreateFolderModalProps) {
  function submitForm() {
    onCreate({
      ...form,
      name: form.name.trim(),
    });
  }

  return (
    <Modal
      title="Nova pasta"
      description="Pastas pertencem a um setor. Membros criam pastas apenas nos setores vinculados ao proprio usuario."
      open={open}
      onClose={onClose}
      footer={
        <>
          <button className="secondary-button" onClick={onClose} type="button">
            Cancelar
          </button>
          <button
            className="primary-button"
            disabled={isPending || !form.name.trim() || !form.sectorId}
            onClick={submitForm}
            type="button"
          >
            {isPending ? 'Criando...' : 'Criar pasta'}
          </button>
        </>
      }
    >
      <div className="form-grid">
        <div className="field-group">
          <label className="field-label" htmlFor="new-folder-name">
            Nome da pasta
          </label>
          <input
            autoFocus
            className="field-input"
            id="new-folder-name"
            onChange={(event) => onChange({ ...form, name: event.target.value })}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && form.name.trim() && form.sectorId) {
                event.preventDefault();
                submitForm();
              }
            }}
            type="text"
            value={form.name}
          />
        </div>
        <div className="form-row">
          <div className="field-group">
            <label className="field-label" htmlFor="new-folder-sector">
              Setor
            </label>
            <select
              className="field-input"
              id="new-folder-sector"
              onChange={(event) => onChange({ ...form, sectorId: event.target.value })}
              required
              value={form.sectorId}
            >
              <option value="">Selecione</option>
              {availableSectors.map((sector) => (
                <option key={sector.id} value={sector.id}>
                  {sector.secretariat.name} / {sector.name}
                </option>
              ))}
            </select>
          </div>

          <div className="field-group">
            <label className="field-label" htmlFor="new-folder-visibility">
              Visibilidade
            </label>
            <select
              className="field-input"
              id="new-folder-visibility"
              onChange={(event) =>
                onChange({
                  ...form,
                  visibility: event.target.value as FolderFormState['visibility'],
                })
              }
              value={form.visibility}
            >
              <option value="SECTOR">Privada do setor</option>
              <option value="SECRETARIAT">Publica da secretaria</option>
            </select>
          </div>
        </div>
        {error ? <p className="form-error">{error}</p> : null}
      </div>
    </Modal>
  );
}
