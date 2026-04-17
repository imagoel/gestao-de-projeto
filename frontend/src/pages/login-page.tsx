import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';

import { useAuth } from '../app/auth-provider';
import prefeituraLogo from '../assets/logo-prefeitura-amargosa.png';
import gtiLogo from '../assets/gti-logo.png';
import minhaLogo from '../assets/minha-logo.png';
import { ApiError } from '../services/api';

export function LoginPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { login, user } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const redirectTo =
    typeof location.state?.from === 'string' ? location.state.from : '/projetos';

  if (user) {
    return <Navigate replace to="/projetos" />;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      await login(email, password);
      navigate(redirectTo, { replace: true });
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError ? error.message : 'Nao foi possivel iniciar a sessao.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-stack">
        <img
          alt="Prefeitura de Amargosa"
          className="login-logo"
          src={prefeituraLogo}
        />

        <form className="login-card" onSubmit={handleSubmit}>
          <h1 className="login-title">Gestao de projetos</h1>

          <div className="field-group">
            <label className="field-label" htmlFor="email">
              E-mail
            </label>
            <input
              autoComplete="email"
              className="field-input"
              id="email"
              onChange={(event) => setEmail(event.target.value)}
              placeholder="seu@empresa.com"
              type="email"
              value={email}
            />
          </div>

          <div className="field-group">
            <label className="field-label" htmlFor="password">
              Senha
            </label>
            <input
              autoComplete="current-password"
              className="field-input"
              id="password"
              onChange={(event) => setPassword(event.target.value)}
              placeholder="********"
              type="password"
              value={password}
            />
          </div>

          {errorMessage ? <p className="form-error">{errorMessage}</p> : null}

          <button className="primary-button" disabled={isSubmitting} type="submit">
            {isSubmitting ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>

      <footer className="login-footer">
        <div className="login-footer-logos">
          <img
            alt="GTI - Gestao de Tecnologia da Informacao"
            className="login-footer-logo login-footer-logo-gti"
            src={gtiLogo}
          />
          <img
            alt="Immanuel Vicente"
            className="login-footer-logo login-footer-logo-immanuel"
            src={minhaLogo}
          />
        </div>
      </footer>
    </div>
  );
}
