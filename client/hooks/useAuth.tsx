'use client';

import React, { createContext, useContext, useCallback, useEffect, useState } from 'react';
import { useSession } from '@/lib/auth-client';
import { authClient } from '@/lib/auth-client';

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

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api').replace(/\/api$/, '');

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const { data: session, isPending, refetch: sessionRefetch } = useSession();
  const [freshRole, setFreshRole] = useState<string | null>(null);
  const [roleLoading, setRoleLoading] = useState(false);

  const sessionUser = (session?.user as BAUser | null) ?? null;

  // Fetch fresh role from DB via /api/user/me on every session change.
  // IMPORTANT: We do NOT blindly overwrite localStorage here.
  // localStorage (role_set_${id}) is set by the login page when the user
  // explicitly selects a role — that selection must take priority over
  // the DB role to avoid the race condition where:
  //   1. User selects "organizer" → set-role API called → DB updated
  //   2. Redirect to /organizer-home
  //   3. /api/user/me fires with OLD DB role (set-role hasn't committed yet)
  //   4. Without this guard, stale DB role would overwrite localStorage
  //      causing AuthGuard to redirect organizer → /team-owner-home
  useEffect(() => {
    if (!sessionUser?.id) {
      setFreshRole(null);
      return;
    }
    setRoleLoading(true);
    fetch(`${API_BASE}/api/user/me`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.user?.role) {
          const dbRole = data.user.role;
          const localRole = sessionUser.id
            ? localStorage.getItem(`role_set_${sessionUser.id}`)
            : null;

          // Only update localStorage with DB role if localStorage has no explicit
          // role set for this user (i.e., user hasn't just selected a role at login).
          // This prevents the race condition where a stale DB role overwrites the
          // freshly-selected role before set-role API has fully committed.
          if (!localRole || localRole === '' || localRole === '1') {
            // No localStorage role — safe to use DB role
            setFreshRole(dbRole);
            if (sessionUser.id) {
              localStorage.setItem(`role_set_${sessionUser.id}`, dbRole);
              localStorage.setItem('pending_role', dbRole);
            }
          } else {
            // localStorage has an explicit role — this was set at login time.
            // Use localStorage role as freshRole so the merged user object is consistent.
            // The DB will catch up after set-role completes; on next page load
            // both will agree.
            setFreshRole(localRole);
          }
        }
      })
      .catch(() => {})
      .finally(() => setRoleLoading(false));
  }, [sessionUser?.id]);

  // Merge fresh role into user object
  // Priority: freshRole (which respects localStorage) > session role
  const user: BAUser | null = sessionUser
    ? { ...sessionUser, role: freshRole || sessionUser.role }
    : null;

  const loading = isPending || (!!sessionUser && roleLoading && !freshRole);

  const refetch = useCallback(() => {
    if (sessionRefetch) sessionRefetch();
    if (sessionUser?.id) {
      fetch(`${API_BASE}/api/user/me`, { credentials: 'include' })
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (data?.user?.role) {
            setFreshRole(data.user.role);
            if (sessionUser.id) {
              localStorage.setItem(`role_set_${sessionUser.id}`, data.user.role);
              localStorage.setItem('pending_role', data.user.role);
            }
          }
        })
        .catch(() => {});
    }
  }, [sessionRefetch, sessionUser?.id]);

  const logout = useCallback(async () => {
    if (typeof window !== 'undefined') {
      Object.keys(localStorage)
        .filter(k => k.startsWith('role_set_'))
        .forEach(k => localStorage.removeItem(k));
      localStorage.removeItem('pending_role');
    }
    setFreshRole(null);
    await authClient.signOut();
    window.location.href = '/login';
  }, []);

  return (
    <Ctx.Provider value={{ user, loading, logout, refetch }}>
      {children}
    </Ctx.Provider>
  );
};

export const useAuth = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error('useAuth must be used inside AuthProvider');
  return c;
};

export const getRoleRedirect = (role?: string | null): string =>
  ({
    admin:      '/admin-home',
    organizer:  '/organizer-home',
    team_owner: '/team-owner-home',
    viewer:     '/viewer-home',
  }[role || ''] || '/select-role');
