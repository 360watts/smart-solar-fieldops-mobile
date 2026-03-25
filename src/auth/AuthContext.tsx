import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import type { AuthTokens, AuthUser } from './authStorage';
import { clearStoredAuth, getStoredTokens, getStoredUser, storeAuth } from './authStorage';
import { apiRequest } from '../api/http';

type AuthContextType = {
  user: AuthUser | null;
  tokens: AuthTokens | null;
  loading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isStaff: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

type LoginResponse = {
  user: AuthUser;
  tokens: AuthTokens;
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [tokens, setTokens] = useState<AuthTokens | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [storedUser, storedTokens] = await Promise.all([getStoredUser(), getStoredTokens()]);
      setUser(storedUser);
      setTokens(storedTokens);
      setLoading(false);
    })();
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    try {
      const data = await apiRequest<LoginResponse>(
        '/auth/login/',
        {
          method: 'POST',
          body: JSON.stringify({ username, password }),
        },
        { auth: 'none' }
      );
      setUser(data.user);
      setTokens(data.tokens);
      await storeAuth(data.tokens, data.user);
      return true;
    } catch {
      return false;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      if (tokens?.refresh && tokens?.access) {
        await apiRequest(
          '/auth/logout/',
          {
            method: 'POST',
            body: JSON.stringify({ refresh_token: tokens.refresh }),
          },
          { auth: 'required' }
        );
      }
    } finally {
      setUser(null);
      setTokens(null);
      await clearStoredAuth();
    }
  }, [tokens]);

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      tokens,
      loading,
      isAuthenticated: !!user && !!tokens,
      isAdmin: !!user?.is_superuser,
      isStaff: !!user?.is_staff,
      login,
      logout,
    }),
    [user, tokens, loading, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

