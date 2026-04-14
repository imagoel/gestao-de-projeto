import type { PropsWithChildren } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { useAuth } from '../app/auth-provider';
import { StatusState } from './status-state';

type ProtectedRouteProps = PropsWithChildren<{
  requireAdmin?: boolean;
}>;

export function ProtectedRoute({ requireAdmin = false, children }: ProtectedRouteProps) {
  const location = useLocation();
  const { isHydrating, user } = useAuth();

  if (isHydrating) {
    return (
      <div className="standalone-state">
        <StatusState
          tone="loading"
          title="Validando a sessao"
          copy="Estamos conferindo seu acesso antes de abrir o sistema."
        />
      </div>
    );
  }

  if (!user) {
    return (
      <Navigate
        replace
        state={{ from: `${location.pathname}${location.search}` }}
        to="/login"
      />
    );
  }

  if (requireAdmin && user.role !== 'ADMIN') {
    return <Navigate replace to="/projetos" />;
  }

  return children ? <>{children}</> : <Outlet />;
}
