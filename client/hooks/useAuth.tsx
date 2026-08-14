'use client';

import React, { createContext, useContext, useCallback, useEffect, useState } from 'react';
import api from '@/lib/api';

export interface BAUser {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image?: string | null;
  role?: string;
  isAdmin?: boolean;
}

interface AuthCtx {
  user: BAUser | null;
  loading: boolean;
  logout: () => Promise<void>;
  refetch: () => void;
}

const Ctx = createContext<AuthCtx | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<BAUser | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    try {
      const response = await api.get('/auth/me');
      if (response.data.success && response.data.user) {
        setUser(response.data.user);
      }
    } catch (err) {
      console.log('[AUTH] No session or failed to fetch user:', err);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch (err) {
      console.error('[AUTH] Logout error:', err);
    }
    window.location.href = '/';
  }, []);

  const refetch = useCallback(() => {
    fetchUser();
  }, [fetchUser]);

  return (
    <Ctx.Provider value={{ user, loading, logout, refetch }}>
      {children}
    </Ctx.Provider>
  );
};

export const useAuth = () => {
  const c = useContext(Ctx);
  if (!c) {
    return {
      user: null,
      loading: true,
      logout: async () => {
        window.location.href = '/';
      },
      refetch: () => {},
    };
  }
  return c;
};

export const getRoleRedirect = (role?: string | null): string => {
  return {
    admin:      '/admin-home',
    organizer:  '/organizer-home',
    team_owner: '/team-owner-home',
    viewer:     '/viewer-home',
  }[role || ''] || '/select-role';
};
