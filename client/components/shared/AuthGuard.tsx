'use client';
import { Lock } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { getRoleRedirect } from '@/hooks/useAuth';

function getEffectiveRole(): string {
  // No-auth mode - use localStorage selected_role for routing
  const selectedRole = localStorage.getItem('selected_role');
  if (selectedRole) {
    return selectedRole;
  }
  
  // Fallback to viewer if no role selected
  return 'viewer';
}

export default function AuthGuard({
  children,
  roles,
}: {
  children: React.ReactNode;
  roles?: (string | 'admin' | 'organizer' | 'team_owner' | 'viewer')[];
}) {
  const didRedirect = useRef(false);

  useEffect(() => {
    if (didRedirect.current) return;

    const effectiveRole = getEffectiveRole();

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
  }, [roles]);

  const effectiveRole = getEffectiveRole();

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
