'use client';

import React, { createContext, useContext, useCallback } from 'react';

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
  // Authentication removed - return dummy values
  const logout = useCallback(async () => {
    window.location.href = '/';
  }, []);

  const refetch = useCallback(() => {
    // No-op
  }, []);

  return (
    <Ctx.Provider value={{ user: null, loading: false, logout, refetch }}>
      {children}
    </Ctx.Provider>
  );
};

export const useAuth = () => {
  const c = useContext(Ctx);
  // Return dummy auth when not in provider (authentication removed)
  if (!c) {
    return {
      user: null,
      loading: false,
      logout: async () => {
        window.location.href = '/';
      },
      refetch: () => {},
    };
  }
  return c;
};

export const getRoleRedirect = (role?: string | null): string => {
  // Use localStorage to get the selected role from role selection page
  const selectedRole = typeof window !== 'undefined' ? localStorage.getItem('selected_role') : null;
  
  // If a role was explicitly selected, use that for redirect
  if (selectedRole) {
    return {
      organizer:  '/organizer-home',
      team_owner: '/team-owner-home',
      viewer:     '/viewer-home',
      admin:      '/admin-home',
    }[selectedRole] || '/select-role';
  }
  
  // Fallback to the role parameter if provided
  return {
    admin:      '/admin-home',
    organizer:  '/organizer-home',
    team_owner: '/team-owner-home',
    viewer:     '/viewer-home',
  }[role || ''] || '/select-role';
};
