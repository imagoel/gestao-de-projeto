import { type FormEvent } from 'react';

import { formatLongDate } from '../../app/formatters';
import { Modal } from '../../components/modal';
import type { ProjectFolder } from '../../types/api';
import type { ProjectFormState, ProjectFormUser } from './projects-types';

type CreateProjectModalProps = {
  availableUsers: ProjectFormUser[];
  error: string | null;
  folderOptions: ProjectFolder[];
  form: ProjectFormState;
  isAdmin: boolean;
  isPending: boolean;
  onChange: (updates: Partial<ProjectFormState>) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onToggleMember: (userId: string) => void;
  open: boolean;
  usersLoading: boolean;
};

export function CreateProjectModal({
  availableUsers,
  error,
  folderOptions,
  form,
  isAdmin,
  isPending,
  onChange,
  onClose,
  onSubmit,
  onToggleMember,
  open,
  usersLoading,
}: CreateProjectModalProps) {
  function formatFolderOption(folder: ProjectFolder) {
    const basePath = `${folder.sector.secretariat.name} / ${folder.sector.name}`;
    return folder.parent
      ? `${basePath} / ${folder.parent.name} / ${folder.name}`
      : `${basePath} / ${folder.name}`;
  }

  return (
    <Modal
      description="Cada projeto do MVP nasce com um board unico e as colunas fixas A fazer, Em andamento e Concluido."
      footer={
        <>
          <button className="secondary-button" onClick={onClose} type="button">
            Cancelar
          </button>
          <button
            className="primary-button"
            disabled={isPending || !form.folderId}
            form="create-project-form"
            type="submit"
          >
            {isPending ? 'Salvando...' : 'Criar projeto'}
          </button>
        </>
      }
      onClose={onClose}
      open={open}
      title="Novo projeto"
    >
      <form className="form-grid" id="create-project-form" onSubmit={onSubmit}>
        <div className="field-group">
          <label className="field-label" htmlFor="project-name">
            Nome
          </label>
          <input
            className="field-input"
            id="project-name"
            minLength={2}
            onChange={(event) => onChange({ name: event.target.value })}
            required
            type="text"
            value={form.name}
          />
        </div>

        <div className="field-group">
          <label className="field-label" htmlFor="project-description">
            Descricao
          </label>
          <textarea
            className="field-input field-textarea"
            id="project-description"
            onChange={(event) => onChange({ description: event.target.value })}
            rows={4}
            value={form.description}
          />
        </div>

        <div className="field-group">
          <label className="field-label" htmlFor="project-folder">
            Pasta
          </label>
          <select
            className="field-input"
            id="project-folder"
            onChange={(event) => onChange({ folderId: event.target.value })}
            required
            value={form.folderId}
          >
            <option value="">Selecione</option>
            {folderOptions.map((folder) => (
              <option key={folder.id} value={folder.id}>
                {formatFolderOption(folder)}
              </option>
            ))}
          </select>
          <p className="field-helper">
            A pasta define a secretaria/setor que podera visualizar este projeto.
          </p>
        </div>

        <div className="form-row">
          <div className="field-group">
            <label className="field-label" htmlFor="project-deadline">
              Prazo (opcional)
            </label>
            <input
              className="field-input"
              id="project-deadline"
              onChange={(event) => onChange({ deadline: event.target.value })}
              type="date"
              value={form.deadline}
            />
            <p className="field-helper">Voce pode deixar este campo em branco no projeto.</p>
          </div>

          {isAdmin ? (
            <div className="field-group">
              <label className="field-label" htmlFor="project-owner">
                Dono
              </label>
              <select
                className="field-input"
                id="project-owner"
                onChange={(event) => onChange({ ownerId: event.target.value })}
                required
                value={form.ownerId}
              >
                <option value="">Selecione</option>
                {availableUsers.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name} ({option.email})
                  </option>
                ))}
              </select>
            </div>
          ) : null}
        </div>

        {isAdmin ? (
          <div className="field-group">
            <span className="field-label">Membros iniciais</span>
            <div className="checkbox-list">
              {usersLoading ? <p className="field-helper">Carregando usuarios...</p> : null}
              {availableUsers.map((availableUser) => (
                <label className="checkbox-item" key={availableUser.id}>
                  <input
                    checked={form.memberIds.includes(availableUser.id)}
                    onChange={() => onToggleMember(availableUser.id)}
                    type="checkbox"
                  />
                  <span>
                    {availableUser.name} <small>{availableUser.email}</small>
                  </span>
                </label>
              ))}
            </div>
            <p className="field-helper">O dono sempre sera incluido como gestor do projeto.</p>
          </div>
        ) : (
          <p className="field-helper">
            Voce sera registrado como gestor do projeto. Adicione participantes depois pela
            tela de detalhes.
          </p>
        )}

        {error ? <p className="form-error">{error}</p> : null}
        {form.deadline ? (
          <p className="field-helper">Prazo previsto: {formatLongDate(form.deadline)}</p>
        ) : null}
      </form>
    </Modal>
  );
}
