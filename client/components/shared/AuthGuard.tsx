'use client';
import { Lock } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { useAuth, getRoleRedirect } from '@/hooks/useAuth';

const ADMIN_EMAIL = (process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'hirishi2020@gmail.com').toLowerCase();

function getEffectiveRole(user: any): string {
  // Authentication removed - use localStorage selected_role from role selection page
  const selectedRole = typeof window !== 'undefined' ? localStorage.getItem('selected_role') : null;
  
  // If user explicitly selected a role, use that
  if (selectedRole && selectedRole !== '1' && selectedRole !== '') {
    return selectedRole;
  }

  // Fallback to user role if available
  if (!user) return '';

  // Admin email ALWAYS gets admin role
  if (user.email && user.email.toLowerCase() === ADMIN_EMAIL) {
    if (user.id) {
      localStorage.setItem(`role_set_${user.id}`, 'admin');
    }
    localStorage.setItem('pending_role', 'admin');
    return 'admin';
  }
  if (user.role === 'admin') return 'admin';

  // Check localStorage for stored role
  const storedByUserId = user.id ? localStorage.getItem(`role_set_${user.id}`) : null;
  const pendingRole    = localStorage.getItem('pending_role');

  if (storedByUserId && storedByUserId !== '1' && storedByUserId !== '') {
    return storedByUserId;
  }

  if (user.role && user.role !== '1' && user.role !== '') {
    if (user.id) {
      localStorage.setItem(`role_set_${user.id}`, user.role);
    }
    localStorage.setItem('pending_role', user.role);
    return user.role;
  }

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

    // Authentication removed - no login redirect
    // If no user, check if role was selected via role selection page
    if (!user) {
      const selectedRole = typeof window !== 'undefined' ? localStorage.getItem('selected_role') : null;
      if (selectedRole) {
        // User selected a role but no auth session - allow through
        return;
      }
      // No role selected, redirect to role selection
      didRedirect.current = true;
      window.location.href = '/select-role';
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

    // Wrong role — redirect to correct homepage based on selected role
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

  // Authentication removed - allow through if role is selected in localStorage
  const selectedRole = typeof window !== 'undefined' ? localStorage.getItem('selected_role') : null;
  if (!user && selectedRole) {
    return <>{children}</>;
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
