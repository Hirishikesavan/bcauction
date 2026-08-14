'use client';

import React, { createContext, useContext, useCallback, useEffect, useState } from 'react';

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
  const [loading, setLoading] = useState(false); // No-auth mode - no loading state

  const fetchUser = useCallback(async () => {
    // No-auth mode - do not fetch user from backend
    // User role is determined by localStorage selected_role
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const logout = useCallback(async () => {
    // No-auth mode - clear localStorage and redirect to role selection
    localStorage.removeItem('selected_role');
    window.location.href = '/select-role';
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
      loading: false,
      logout: async () => {
        localStorage.removeItem('selected_role');
        window.location.href = '/select-role';
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
