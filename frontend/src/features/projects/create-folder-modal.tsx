import { Modal } from '../../components/modal';
import type { ProjectFolder } from '../../types/api';
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
  parentFolder?: ProjectFolder | null;
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
  parentFolder,
}: CreateFolderModalProps) {
  const isSubfolder = Boolean(parentFolder);

  function submitForm() {
    onCreate({
      ...form,
      name: form.name.trim(),
    });
  }

  return (
    <Modal
      title={isSubfolder ? 'Nova subpasta' : 'Nova pasta'}
      description={
        isSubfolder
          ? 'Subpastas herdam setor e visibilidade da pasta principal.'
          : 'Pastas pertencem a um setor. Membros criam pastas apenas nos setores vinculados ao proprio usuario.'
      }
      open={open}
      onClose={onClose}
      footer={
        <>
          <button className="secondary-button" onClick={onClose} type="button">
            Cancelar
          </button>
          <button
            className="primary-button"
            disabled={isPending || !form.name.trim() || (!isSubfolder && !form.sectorId)}
            onClick={submitForm}
            type="button"
          >
            {isPending ? 'Criando...' : isSubfolder ? 'Criar subpasta' : 'Criar pasta'}
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
              if (
                event.key === 'Enter' &&
                form.name.trim() &&
                (isSubfolder || form.sectorId)
              ) {
                event.preventDefault();
                submitForm();
              }
            }}
            type="text"
            value={form.name}
          />
        </div>
        {parentFolder ? (
          <p className="field-helper">
            Esta subpasta ficara dentro de {parentFolder.name} e usara{' '}
            {parentFolder.sector.secretariat.name} / {parentFolder.sector.name}.
          </p>
        ) : null}
        {!isSubfolder ? (
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
        ) : null}
        {error ? <p className="form-error">{error}</p> : null}
      </div>
    </Modal>
  );
}
