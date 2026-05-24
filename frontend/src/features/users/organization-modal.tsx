import { type FormEvent } from 'react';

import { Modal } from '../../components/modal';
import type { Secretariat } from '../../types/api';
import type { NewSectorFormState } from './users-types';

type OrganizationModalProps = {
  error: string | null;
  isCreatingSecretariat: boolean;
  isCreatingSector: boolean;
  newSecretariatName: string;
  newSectorForm: NewSectorFormState;
  onClose: () => void;
  onCreateSecretariat: () => void;
  onCreateSector: () => void;
  onSecretariatNameChange: (value: string) => void;
  onSectorFormChange: (form: NewSectorFormState) => void;
  open: boolean;
  secretariats: Secretariat[];
};

export function OrganizationModal({
  error,
  isCreatingSecretariat,
  isCreatingSector,
  newSecretariatName,
  newSectorForm,
  onClose,
  onCreateSecretariat,
  onCreateSector,
  onSecretariatNameChange,
  onSectorFormChange,
  open,
  secretariats,
}: OrganizationModalProps) {
  function handleCreateSecretariat(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (newSecretariatName.trim()) {
      onCreateSecretariat();
    }
  }

  function handleCreateSector(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (newSectorForm.name.trim() && newSectorForm.secretariatId) {
      onCreateSector();
    }
  }

  return (
    <Modal
      description="Cadastro rapido da arvore organizacional usada nas pastas e nos vinculos dos usuarios."
      footer={
        <button className="secondary-button" onClick={onClose} type="button">
          Fechar
        </button>
      }
      onClose={onClose}
      open={open}
      title="Secretarias e setores"
    >
      <div className="organization-manager">
        <form
          className="inline-form organization-inline-form"
          onSubmit={handleCreateSecretariat}
        >
          <div className="field-group">
            <label className="field-label" htmlFor="secretariat-name">
              Nova secretaria
            </label>
            <input
              className="field-input"
              id="secretariat-name"
              onChange={(event) => onSecretariatNameChange(event.target.value)}
              placeholder="Ex: SEMED"
              value={newSecretariatName}
            />
          </div>
          <button
            className="secondary-button"
            disabled={isCreatingSecretariat || !newSecretariatName.trim()}
            type="submit"
          >
            Adicionar
          </button>
        </form>

        <form
          className="inline-form organization-inline-form"
          onSubmit={handleCreateSector}
        >
          <div className="field-group">
            <label className="field-label" htmlFor="sector-secretariat">
              Secretaria
            </label>
            <select
              className="field-input"
              id="sector-secretariat"
              onChange={(event) =>
                onSectorFormChange({
                  ...newSectorForm,
                  secretariatId: event.target.value,
                })
              }
              value={newSectorForm.secretariatId}
            >
              <option value="">Selecione</option>
              {secretariats.map((secretariat) => (
                <option key={secretariat.id} value={secretariat.id}>
                  {secretariat.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field-group">
            <label className="field-label" htmlFor="sector-name">
              Novo setor
            </label>
            <input
              className="field-input"
              id="sector-name"
              onChange={(event) =>
                onSectorFormChange({ ...newSectorForm, name: event.target.value })
              }
              placeholder="Ex: ASCOM"
              value={newSectorForm.name}
            />
          </div>
          <button
            className="secondary-button"
            disabled={
              isCreatingSector ||
              !newSectorForm.name.trim() ||
              !newSectorForm.secretariatId
            }
            type="submit"
          >
            Adicionar setor
          </button>
        </form>

        {error ? <p className="form-error">{error}</p> : null}

        <div className="organization-admin-list">
          {secretariats.map((secretariat) => (
            <section className="organization-admin-card" key={secretariat.id}>
              <strong>{secretariat.name}</strong>
              <div className="badge-row">
                {secretariat.sectors.length > 0 ? (
                  secretariat.sectors.map((sector) => (
                    <span className="badge badge-gray" key={sector.id}>
                      {sector.name}
                    </span>
                  ))
                ) : (
                  <span className="muted-text">Sem setores</span>
                )}
              </div>
            </section>
          ))}
        </div>
      </div>
    </Modal>
  );
}
