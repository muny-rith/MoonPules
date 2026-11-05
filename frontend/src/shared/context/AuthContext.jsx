import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';

const AuthContext = createContext(null);

const TOKEN_KEY = 'moonpulse.auth.token';
const USER_KEY = 'moonpulse.auth.user';

export const AuthProvider = ({ children }) => {
  const queryClient = useQueryClient();

  const [token, setToken] = useState(() => {
    try {
      return localStorage.getItem(TOKEN_KEY) || null;
    } catch {
      return null;
    }
  });

  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  const login = useCallback((newToken, newUser) => {
    try {
      localStorage.setItem(TOKEN_KEY, newToken);
      if (newUser) {
        localStorage.setItem(USER_KEY, JSON.stringify(newUser));
      }
    } catch (e) {
      console.warn('Failed to store auth token in localStorage:', e);
    }
    setToken(newToken);
    setUser(newUser || null);
  }, []);

  const logout = useCallback(() => {
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    } catch (e) {
      // ignore
    }
    setToken(null);
    setUser(null);
    // Clear all TanStack Query caches so sensitive data is never leaked between sessions
    queryClient.clear();
  }, [queryClient]);

  const value = useMemo(
    () => ({
      token,
      user,
      isAuthenticated: Boolean(token),
      login,
      logout,
    }),
    [token, user, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

