import { RouterProvider } from 'react-router-dom';

import { AuthProvider } from './app/auth-provider';
import { router } from './app/router';
import minhaLogo from './assets/minha-logo.png';

export default function App() {
  return (
    <AuthProvider>
      <>
        <RouterProvider router={router} />
        <div aria-hidden="true" className="system-corner-brand">
          <img alt="" className="system-corner-brand-image" src={minhaLogo} />
        </div>
      </>
    </AuthProvider>
  );
}
