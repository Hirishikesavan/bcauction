'use client';
import { Gavel } from 'lucide-react';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams }               from 'next/navigation';
import { authClient }                    from '@/lib/auth-client';
import { getRoleRedirect }               from '@/hooks/useAuth';

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api').replace(/\/api$/, '');
const ADMIN_EMAIL = (process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'hirishi2020@gmail.com').toLowerCase();

function AuthCallbackInner() {
  const [status, setStatus] = useState('Completing sign in...');
  const [dots,   setDots]   = useState('');
  const searchParams = useSearchParams();

  useEffect(() => {
    const t = setInterval(() => setDots(d => d.length >= 3 ? '' : d + '.'), 400);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const handle = async () => {
      try {
        // FIX: Check for error params in the callback URL.
        // Better Auth redirects here with ?error=account_not_linked when
        // a Google account cannot be auto-linked. We handle this gracefully
        // by redirecting to login with a helpful error message.
        const errorParam = searchParams?.get('error');
        if (errorParam) {
          console.error('OAuth callback error:', errorParam);
          
          if (errorParam === 'account_not_linked') {
            // This happens when:
            // 1. User signed up with email/password
            // 2. Their email wasn't verified (emailVerified=false)
            // 3. They tried to login with Google (same email)
            // 4. Better Auth refused to auto-link without emailVerified=true
            //
            // The server startup now auto-patches emailVerified=true for all
            // existing users, so this should not occur after the fix.
            // If it still occurs, show a helpful message.
            setStatus('Account linking required — redirecting...');
            setTimeout(() => {
              window.location.href = '/login?error=account_not_linked&hint=Please+sign+in+with+your+original+email+and+password+first%2C+then+link+Google+from+your+profile.';
            }, 2000);
            return;
          }

          if (errorParam === 'state_mismatch' || errorParam === 'oauth_state_mismatch') {
            // Chrome blocks cookies during OAuth; stored state in DB should prevent this.
            // If it still occurs, retry once.
            setStatus('Security check failed — please try again...');
            setTimeout(() => {
              window.location.href = '/login?error=try_again&hint=Please+try+signing+in+with+Google+again.';
            }, 2000);
            return;
          }

          // Generic OAuth error
          setStatus('Sign in failed — redirecting...');
          setTimeout(() => {
            window.location.href = `/login?error=${encodeURIComponent(errorParam)}`;
          }, 1500);
          return;
        }

        await new Promise(r => setTimeout(r, 1500));

        let user: any = null;
        for (let i = 0; i < 6; i++) {
          const s = await authClient.getSession();
          if (s?.data?.user) { user = s.data.user; break; }
          await new Promise(r => setTimeout(r, 600));
        }

        if (!user) {
          setStatus('Sign in failed — redirecting...');
          setTimeout(() => { window.location.href = '/login?error=session'; }, 1500);
          return;
        }

        // FIX: After successful Google login, force-verify the email
        // so future Google logins (and account linking) work correctly.
        // This is a no-op if already verified.
        try {
          await fetch(`${API_BASE}/api/user/force-verify-email`, {
            method: 'POST',
            credentials: 'include',
          });
        } catch (e) { /* non-fatal */ }

        // Check for pending role from Google login flow
        const pendingRole = localStorage.getItem('pending_google_role');
        
        // Check if this is a new user from registration
        const pendingSignup = localStorage.getItem('pending_google_signup');
        
        // Check localStorage for previously stored role (most reliable)
        const storedRole = localStorage.getItem(`role_set_${user.id}`);

        // Admin email always gets admin role — check first before anything else
        if (user.email && user.email.toLowerCase() === ADMIN_EMAIL) {
          localStorage.setItem(`role_set_${user.id}`, 'admin');
          localStorage.setItem('pending_role', 'admin');
          localStorage.removeItem('pending_google_role');
          setStatus('Admin access granted — redirecting...');
          setTimeout(() => { window.location.href = '/dashboard/admin'; }, 800);
          return;
        }

        let finalRole = user.role;

        // If user selected a role before Google login, use it
        if (pendingRole && pendingRole !== 'viewer') {
          finalRole = pendingRole;
          // Set the role via API
          try {
            await fetch(`${API_BASE}/api/user/set-role`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({ role: pendingRole }),
            });
            // Store role in localStorage for future use (both keys for compatibility)
            localStorage.setItem(`role_set_${user.id}`, pendingRole);
            localStorage.setItem('pending_role', pendingRole);
            console.log(' Role set from Google login:', user.email, '→', pendingRole);
          } catch (e) {
            console.error('Failed to set role:', e);
          }
          // Clear the pending role
          localStorage.removeItem('pending_google_role');
        } else if (storedRole && storedRole !== '1') {
          finalRole = storedRole;
          // Also set pending_role for AuthGuard compatibility
          localStorage.setItem('pending_role', storedRole);
        } else if (user.role && user.role !== 'viewer' && user.role !== '1') {
          // Use the role from the user object if it's not viewer
          finalRole = user.role;
          // Also set pending_role for AuthGuard compatibility
          localStorage.setItem('pending_role', user.role);
        }

        // Clear the signup flag
        if (pendingSignup) {
          localStorage.removeItem('pending_google_signup');
        }

        if (!finalRole || finalRole === 'viewer') {
          // New Google user — pick a role first
          setStatus('Setting up your account...');
          window.location.href = '/select-role';
          return;
        }

        setStatus(`Welcome back, ${user.name?.split(' ')[0] || ''}!`);
        setTimeout(() => { window.location.href = getRoleRedirect(finalRole); }, 600);
      } catch (err) {
        console.error('Callback error:', err);
        setStatus('Something went wrong — redirecting...');
        setTimeout(() => { window.location.href = '/login?error=callback'; }, 2000);
      }
    };
    handle();
  }, [searchParams]);

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden" style={{ background: 'hsl(0 0% 4%)' }}>
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at center, hsla(45,100%,51%,0.06) 0%, transparent 70%)' }} />
      <div className="relative z-10 text-center px-6">
        <div className="relative w-20 h-20 mx-auto mb-8">
          <div className="w-20 h-20 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center"><Gavel size={28} className="text-primary" /></div>
        </div>
        <h2 className="font-heading text-2xl uppercase tracking-[0.15em] text-foreground mb-3">Signing You In</h2>
        <p className="text-muted-foreground font-display text-base">{status}{dots}</p>
        <div className="mt-8 w-48 h-1 mx-auto rounded-full overflow-hidden bg-secondary/30">
          <div className="h-full rounded-full animate-pulse" style={{ background: 'linear-gradient(90deg, transparent, hsl(45 100% 51%), transparent)' }} />
        </div>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="relative min-h-screen flex items-center justify-center" style={{ background: 'hsl(0 0% 4%)' }}>
        <div className="w-20 h-20 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
      </div>
    }>
      <AuthCallbackInner />
    </Suspense>
  );
}
