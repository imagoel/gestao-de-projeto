import {
  createContext,
  useContext,
  useEffect,
  useState,
  type PropsWithChildren,
} from 'react';

import { api } from '../services/api';
import type { ApiUser } from '../types/api';

const STORAGE_KEY = 'gestao-gti:token';

type AuthContextValue = {
  isHydrating: boolean;
  token: string | null;
  user: ApiUser | null;
  login: (email: string, password: string) => Promise<ApiUser>;
  logout: () => void;
  refreshUser: () => Promise<ApiUser | null>;
  syncUser: (nextUser: ApiUser) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(STORAGE_KEY));
  const [user, setUser] = useState<ApiUser | null>(null);
  const [isHydrating, setIsHydrating] = useState(() => Boolean(localStorage.getItem(STORAGE_KEY)));

  useEffect(() => {
    if (!token) {
      setUser(null);
      setIsHydrating(false);
      return;
    }

    let active = true;
    const activeToken = token;

    async function loadCurrentUser() {
      setIsHydrating(true);

      try {
        const nextUser = await api.getMe(activeToken);

        if (active) {
          setUser(nextUser);
        }
      } catch {
        if (active) {
          localStorage.removeItem(STORAGE_KEY);
          setToken(null);
          setUser(null);
        }
      } finally {
        if (active) {
          setIsHydrating(false);
        }
      }
    }

    void loadCurrentUser();

    return () => {
      active = false;
    };
  }, [token]);

  async function login(email: string, password: string) {
    const session = await api.login(email, password);

    localStorage.setItem(STORAGE_KEY, session.accessToken);
    setToken(session.accessToken);
    setUser(session.user);
    setIsHydrating(false);

    return session.user;
  }

  function logout() {
    localStorage.removeItem(STORAGE_KEY);
    setToken(null);
    setUser(null);
    setIsHydrating(false);
  }

  async function refreshUser() {
    if (!token) {
      return null;
    }

    const nextUser = await api.getMe(token);
    setUser(nextUser);
    return nextUser;
  }

  function syncUser(nextUser: ApiUser) {
    setUser((currentUser) => (currentUser?.id === nextUser.id ? nextUser : currentUser));
  }

  return (
    <AuthContext.Provider
      value={{
        isHydrating,
        token,
        user,
        login,
        logout,
        refreshUser,
        syncUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider.');
  }

  return context;
}
