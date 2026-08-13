'use client';
import { Lock } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { useAuth, getRoleRedirect } from '@/hooks/useAuth';

const ADMIN_EMAIL = (process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'hirishi2020@gmail.com').toLowerCase();

function getEffectiveRole(user: any): string {
  if (!user) return '';

  // Admin email ALWAYS gets admin role — force it regardless of what session says
  if (user.email && user.email.toLowerCase() === ADMIN_EMAIL) {
    if (user.id) {
      localStorage.setItem(`role_set_${user.id}`, 'admin');
    }
    localStorage.setItem('pending_role', 'admin');
    return 'admin';
  }
  if (user.role === 'admin') return 'admin';

  // ── PRIORITY ORDER FOR ROLE RESOLUTION ──────────────────────────────
  // 1. localStorage role_set_${user.id} — set explicitly at login/role-select
  //    This is the most authoritative source for the current session intent.
  // 2. localStorage pending_role — fallback for Google OAuth flow
  // 3. user.role — DB role from /api/user/me (may lag behind set-role API)
  //
  // localStorage is checked FIRST to avoid a race condition where:
  //   - User selects "organizer" on login page
  //   - set-role API is called → DB updated to "organizer"
  //   - Redirect to /organizer-home happens
  //   - useAuth's /api/user/me fires BEFORE set-role commits → gets OLD DB role
  //   - Without this priority, AuthGuard would see the stale DB role and
  //     redirect the organizer to /team-owner-home

  const storedByUserId = user.id ? localStorage.getItem(`role_set_${user.id}`) : null;
  const pendingRole    = localStorage.getItem('pending_role');

  // localStorage role_set_${id} is the most reliable — set at login time
  if (storedByUserId && storedByUserId !== '1' && storedByUserId !== '') {
    return storedByUserId;
  }

  // DB role from useAuth (via /api/user/me) — may be stale right after login
  if (user.role && user.role !== '1' && user.role !== '') {
    // Sync localStorage so future checks are consistent
    if (user.id) {
      localStorage.setItem(`role_set_${user.id}`, user.role);
    }
    localStorage.setItem('pending_role', user.role);
    return user.role;
  }

  // pending_role fallback (Google OAuth or role-select page)
  if (pendingRole && pendingRole !== '1' && pendingRole !== '') {
    return pendingRole;
  }

  return 'viewer';
}

export default function AuthGuard({
  children,
  roles,
}: {
  children: React.ReactNode;
  roles?: (string | 'admin' | 'organizer' | 'team_owner' | 'viewer')[];
}) {
  const { user, loading } = useAuth();
  const didRedirect = useRef(false);

  useEffect(() => {
    if (loading || didRedirect.current) return;

    if (!user) {
      didRedirect.current = true;
      window.location.href = '/login';
      return;
    }

    const effectiveRole = getEffectiveRole(user);

    // Admin bypasses all role checks
    if (effectiveRole === 'admin') return;

    if (!effectiveRole) {
      didRedirect.current = true;
      window.location.href = '/select-role';
      return;
    }

    if (!roles || roles.includes(effectiveRole)) {
      return;
    }

    // Wrong role — redirect to correct homepage
    didRedirect.current = true;
    window.location.href = getRoleRedirect(effectiveRole);
  }, [user, loading, roles]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#04040a' }}>
        <div className="text-center">
          <img src="/logo.png" alt="Beast Cricket" className="w-16 h-16 object-contain mx-auto mb-4 animate-pulse" />
          <p className="text-slate-500 text-xs uppercase tracking-widest animate-pulse">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const effectiveRole = getEffectiveRole(user);

  // Admin always gets through
  if (effectiveRole === 'admin') return <>{children}</>;

  if (roles && !roles.includes(effectiveRole)) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#04040a' }}>
        <div className="text-center max-w-sm mx-auto px-6">
          <div className="flex justify-center mb-4"><Lock size={48} className="text-primary" /></div>
          <h2 className="font-heading text-xl uppercase tracking-wider text-white mb-2">Redirecting...</h2>
          <p className="text-slate-400 text-sm font-display">Taking you to your dashboard...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
