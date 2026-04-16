import { useState, type PropsWithChildren, type ReactNode } from 'react';
import { useMutation } from '@tanstack/react-query';
import { NavLink, type NavLinkRenderProps } from 'react-router-dom';

import { useAuth } from '../app/auth-provider';
import gtiLogo from '../assets/gti-logo.png';
import minhaLogo from '../assets/minha-logo.png';
import { ApiError, api } from '../services/api';
import { Modal } from './modal';

type AppShellProps = PropsWithChildren<{
  title: string;
  subtitle?: string;
  copy?: string;
  action?: ReactNode;
}>;

function navClassName({ isActive }: NavLinkRenderProps) {
  return isActive ? 'app-nav-item app-nav-item-active' : 'app-nav-item';
}

function getInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

export function AppShell({
  title,
  subtitle,
  copy,
  action,
  children,
}: AppShellProps) {
  const { logout, user, token } = useAuth();
  const [isPasswordOpen, setIsPasswordOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  const changePasswordMutation = useMutation({
    mutationFn: () =>
      api.changePassword(token!, { currentPassword, newPassword }),
    onSuccess: () => {
      setPasswordSuccess(true);
      setPasswordError(null);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    },
    onError: (error) => {
      setPasswordSuccess(false);
      setPasswordError(
        error instanceof ApiError ? error.message : 'Nao foi possivel alterar a senha.',
      );
    },
  });

  function openPasswordModal() {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordError(null);
    setPasswordSuccess(false);
    setIsPasswordOpen(true);
  }

  function submitPassword() {
    setPasswordError(null);
    if (newPassword.length < 6) {
      setPasswordError('A nova senha precisa ter ao menos 6 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('A confirmacao nao confere com a nova senha.');
      return;
    }
    void changePasswordMutation.mutateAsync();
  }

  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <div className="app-brand">
          <img
            alt="GTI - Gestao de Tecnologia da Informacao"
            className="app-brand-logo"
            src={gtiLogo}
          />
          <p className="app-brand-title">Gestao de projetos</p>
        </div>

        <nav className="app-nav" aria-label="Navegacao principal">
          <NavLink className={navClassName} to="/projetos">
            Projetos
          </NavLink>
          {user?.role === 'ADMIN' ? (
            <NavLink className={navClassName} to="/usuarios">
              Usuarios
            </NavLink>
          ) : null}
        </nav>

        <div className="app-sidebar-foot">
          <div className="app-user-chip">
            <span className="app-avatar">{user ? getInitials(user.name) : '--'}</span>
            <div className="app-user-copy">
              <span>{user?.name ?? 'Sessao ativa'}</span>
              <small>{user?.role === 'ADMIN' ? 'Admin' : 'Membro'}</small>
            </div>
          </div>
          <img
            alt=""
            aria-hidden="true"
            className="app-sidebar-brand-mark"
            src={minhaLogo}
          />
          <div className="app-foot-actions">
            <button
              className="secondary-button app-logout-button"
              onClick={openPasswordModal}
              type="button"
            >
              Alterar senha
            </button>
            <button className="secondary-button app-logout-button" onClick={logout} type="button">
              Sair
            </button>
          </div>
        </div>
      </aside>

      <Modal
        title="Alterar senha"
        description="Informe sua senha atual e escolha uma nova com ao menos 6 caracteres."
        open={isPasswordOpen}
        onClose={() => setIsPasswordOpen(false)}
        footer={
          <>
            <button
              className="secondary-button"
              onClick={() => setIsPasswordOpen(false)}
              type="button"
            >
              Fechar
            </button>
            <button
              className="primary-button"
              disabled={
                changePasswordMutation.isPending ||
                !currentPassword ||
                !newPassword ||
                !confirmPassword
              }
              onClick={submitPassword}
              type="button"
            >
              {changePasswordMutation.isPending ? 'Salvando...' : 'Salvar nova senha'}
            </button>
          </>
        }
      >
        <div className="form-grid">
          <div className="field-group">
            <label className="field-label" htmlFor="current-password">Senha atual</label>
            <input
              autoComplete="current-password"
              className="field-input"
              id="current-password"
              onChange={(e) => setCurrentPassword(e.target.value)}
              type="password"
              value={currentPassword}
            />
          </div>
          <div className="field-group">
            <label className="field-label" htmlFor="new-password">Nova senha</label>
            <input
              autoComplete="new-password"
              className="field-input"
              id="new-password"
              onChange={(e) => setNewPassword(e.target.value)}
              type="password"
              value={newPassword}
            />
          </div>
          <div className="field-group">
            <label className="field-label" htmlFor="confirm-password">Confirmar nova senha</label>
            <input
              autoComplete="new-password"
              className="field-input"
              id="confirm-password"
              onChange={(e) => setConfirmPassword(e.target.value)}
              type="password"
              value={confirmPassword}
            />
          </div>
          {passwordError ? <p className="form-error">{passwordError}</p> : null}
          {passwordSuccess ? (
            <p className="field-helper" style={{ color: '#1f7a4d' }}>
              Senha alterada com sucesso.
            </p>
          ) : null}
        </div>
      </Modal>

      <main className="app-main">
        <header className="page-header">
          <div>
            {subtitle ? <p className="page-subtitle">{subtitle}</p> : null}
            <h1 className="page-title">{title}</h1>
            {copy ? <p className="page-copy">{copy}</p> : null}
          </div>
          {action}
        </header>

        {children}
      </main>
    </div>
  );
}
