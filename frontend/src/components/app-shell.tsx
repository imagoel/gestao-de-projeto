import type { PropsWithChildren, ReactNode } from 'react';
import { NavLink, type NavLinkRenderProps } from 'react-router-dom';

import { useAuth } from '../app/auth-provider';

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
  const { logout, user } = useAuth();

  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <div className="app-brand">
          <p className="app-brand-title">Gestao</p>
          <p className="app-brand-copy">Sistema interno de projetos</p>
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
          <button className="secondary-button app-logout-button" onClick={logout} type="button">
            Sair
          </button>
        </div>
      </aside>

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
