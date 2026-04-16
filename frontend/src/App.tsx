import { RouterProvider } from 'react-router-dom';

import { AuthProvider } from './app/auth-provider';
import { router } from './app/router';

export default function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  );
}
