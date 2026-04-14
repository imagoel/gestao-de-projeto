import { createBrowserRouter, Navigate } from 'react-router-dom';

import { ProtectedRoute } from '../components/protected-route';
import { LoginPage } from '../pages/login-page';
import { ProjectBoardPage } from '../pages/project-board-page';
import { ProjectDetailPage } from '../pages/project-detail-page';
import { ProjectsPage } from '../pages/projects-page';
import { UsersPage } from '../pages/users-page';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/login" replace />,
  },
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/projetos',
    element: (
      <ProtectedRoute>
        <ProjectsPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/projetos/:projectId',
    element: (
      <ProtectedRoute>
        <ProjectDetailPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/projetos/:projectId/quadro',
    element: (
      <ProtectedRoute>
        <ProjectBoardPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/usuarios',
    element: (
      <ProtectedRoute requireAdmin>
        <UsersPage />
      </ProtectedRoute>
    ),
  },
]);
