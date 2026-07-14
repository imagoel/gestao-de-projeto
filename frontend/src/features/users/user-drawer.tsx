import { type FormEvent } from 'react';

import type { ApiUser, Secretariat, UserRole } from '../../types/api';
import type { UserFormState } from './users-types';

type UserDrawerProps = {
  editingUser: ApiUser | null;
  error: string | null;
  form: UserFormState;
  isOpen: boolean;
  isSaving: boolean;
  isSecretariatsLoading: boolean;
  onChange: (updates: Partial<UserFormState>) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onToggleSector: (sectorId: string) => void;
  secretariats: Secretariat[];
};

export function UserDrawer({
  editingUser,
  error,
  form,
  isOpen,
  isSaving,
  isSecretariatsLoading,
  onChange,
  onClose,
  onSubmit,
  onToggleSector,
  secretariats,
}: UserDrawerProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="drawer-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <aside aria-modal="true" className="drawer-panel" role="dialog">
        <header className="drawer-header">
          <div>
            <h2 className="drawer-title">
              {editingUser ? 'Editar acessos' : 'Novo usuario'}
            </h2>
            <p className="drawer-copy">
              Dados principais, status e vinculos por secretaria/setor.
            </p>
          </div>
          <button className="icon-button" onClick={onClose} type="button">
            x
          </button>
        </header>

        <form className="drawer-body form-grid" id="user-form" onSubmit={onSubmit}>
          <section className="drawer-section">
            <h3>Identificacao</h3>
            <div className="form-row">
              <div className="field-group">
                <label className="field-label" htmlFor="user-name">
                  Nome
                </label>
                <input
                  className="field-input"
                  id="user-name"
                  minLength={2}
                  onChange={(event) => onChange({ name: event.target.value })}
                  required
                  type="text"
                  value={form.name}
                />
              </div>

              <div className="field-group">
                <label className="field-label" htmlFor="user-email">
                  Usuario
                </label>
                <input
                  autoComplete="username"
                  className="field-input"
                  id="user-email"
                  onChange={(event) => onChange({ email: event.target.value })}
                  placeholder="Login de acesso"
                  required
                  type="text"
                  value={form.email}
                />
              </div>
            </div>

            <div className="field-group">
              <label className="field-label" htmlFor="user-avatar">
                Avatar URL
              </label>
              <input
                className="field-input"
                id="user-avatar"
                onChange={(event) => onChange({ avatarUrl: event.target.value })}
                placeholder="Opcional"
                type="url"
                value={form.avatarUrl}
              />
            </div>
          </section>

          <section className="drawer-section">
            <h3>Acesso</h3>
            <div className="form-row">
              <div className="field-group">
                <label className="field-label" htmlFor="user-role">
                  Perfil
                </label>
                <select
                  className="field-input"
                  id="user-role"
                  onChange={(event) => onChange({ role: event.target.value as UserRole })}
                  value={form.role}
                >
                  <option value="MEMBER">Membro</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>

              <div className="field-group">
                <label className="field-label" htmlFor="user-status">
                  Status
                </label>
                <select
                  className="field-input"
                  id="user-status"
                  onChange={(event) =>
                    onChange({ isActive: event.target.value === 'ACTIVE' })
                  }
                  value={form.isActive ? 'ACTIVE' : 'INACTIVE'}
                >
                  <option value="ACTIVE">Ativo</option>
                  <option value="INACTIVE">Inativo</option>
                </select>
              </div>
            </div>

            <div className="field-group">
              <label className="field-label" htmlFor="user-password">
                {editingUser ? 'Nova senha' : 'Senha'}
              </label>
              <input
                className="field-input"
                id="user-password"
                minLength={editingUser ? undefined : 8}
                onChange={(event) => onChange({ password: event.target.value })}
                placeholder={
                  editingUser ? 'Deixe em branco para manter a atual' : 'Minimo de 8 caracteres'
                }
                required={!editingUser}
                type="password"
                value={form.password}
              />
            </div>
          </section>

          <section className="drawer-section">
            <h3>Vinculos</h3>
            <p className="field-helper">
              Estes setores definem quais pastas o membro consegue visualizar.
            </p>
            <div className="sector-picker">
              {isSecretariatsLoading ? (
                <p className="field-helper">Carregando setores...</p>
              ) : null}
              {secretariats.length > 0 ? (
                secretariats.map((secretariat) => (
                  <div className="sector-picker-group" key={secretariat.id}>
                    <p>{secretariat.name}</p>
                    <div className="checkbox-list checkbox-list-compact">
                      {secretariat.sectors.length > 0 ? (
                        secretariat.sectors.map((sector) => (
                          <label className="checkbox-item" key={sector.id}>
                            <input
                              checked={form.sectorIds.includes(sector.id)}
                              onChange={() => onToggleSector(sector.id)}
                              type="checkbox"
                            />
                            <span>{sector.name}</span>
                          </label>
                        ))
                      ) : (
                        <span className="muted-text">Sem setores cadastrados.</span>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="field-helper">Nenhuma secretaria cadastrada ainda.</p>
              )}
            </div>
          </section>

          {error ? <p className="form-error">{error}</p> : null}
        </form>

        <footer className="drawer-footer">
          <button className="secondary-button" onClick={onClose} type="button">
            Cancelar
          </button>
          <button
            className="primary-button"
            disabled={isSaving}
            form="user-form"
            type="submit"
          >
            {isSaving
              ? 'Salvando...'
              : editingUser
                ? 'Salvar acessos'
                : 'Criar usuario'}
          </button>
        </footer>
      </aside>
    </div>
  );
}
