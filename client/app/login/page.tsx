'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Clapperboard, Trophy, Eye, Shield, Zap, LogIn } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiMail, FiLock, FiEye, FiEyeOff } from 'react-icons/fi';
import { authClient } from '@/lib/auth-client';
import { getRoleRedirect } from '@/hooks/useAuth';
import GoldParticles from '@/components/beast/GoldParticles';
import FireSparkles from '@/components/beast/FireSparkles';
import BeastLogo from '@/components/beast/BeastLogo';

const FRONTEND_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001';
const ADMIN_EMAIL  = (process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'hirishi2020@gmail.com').toLowerCase();

// Only 3 visible roles — admin is hidden and detected by email
const ROLES = [
  { id: 'organizer',  Icon: Clapperboard, label: 'Organizer',  tagline: 'Command Center' },
  { id: 'team_owner', Icon: Trophy,       label: 'Team Owner', tagline: 'War Room'        },
  { id: 'viewer',     Icon: Eye,          label: 'Viewer',     tagline: 'Live Arena'      },
];

function mapError(msg: string, data?: any) {
  const m = (msg || '').toLowerCase();
  if (m.includes('no account') || m.includes('not found') || m.includes('invalid email') || m.includes('user not found'))
    return { text: 'No account with this email.', hint: 'Check spelling or register first.', link: { label: 'Register →', href: '/register' } };
  if (data?.notVerified || m.includes('not verified') || m.includes('verify') || m.includes('email verification'))
    return { text: 'Email not verified.', hint: 'Check your inbox and click the verification link.', link: { label: 'Resend verification →', href: '/register' } };
  if (m.includes('incorrect') || m.includes('password') || m.includes('wrong') || m.includes('invalid'))
    return { text: 'Wrong password.', hint: 'Check caps lock or reset below.', link: { label: 'Forgot password →', href: '/forgot-password' } };
  return { text: msg || 'Login failed.', hint: 'Please try again or contact support if the issue persists.', link: null };
}

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api').replace(/\/api$/, '');

function LoginPageInner() {
  const [email,         setEmail]         = useState('');
  const [password,      setPassword]      = useState('');
  const [showPwd,       setShowPwd]       = useState(false);
  const [selectedRole,  setSelectedRole]  = useState('');
  const [loading,       setLoading]       = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [formError,     setFormError]     = useState<any>(null);
  const searchParams = useSearchParams();

  // Show helpful error messages from OAuth callback redirects
  useEffect(() => {
    const errorParam = searchParams?.get('error');
    const hint = searchParams?.get('hint');
    if (errorParam === 'account_not_linked') {
      setFormError({
        text: 'Google sign-in could not be linked to your account.',
        hint: hint ? decodeURIComponent(hint) : 'Please sign in with your email and password first. Then you can link Google from your profile.',
        link: null,
      });
    } else if (errorParam === 'try_again') {
      setFormError({
        text: 'Google sign-in failed — please try again.',
        hint: hint ? decodeURIComponent(hint) : 'This can happen due to browser privacy settings. Try disabling third-party cookie blocking for this site.',
        link: null,
      });
    } else if (errorParam === 'session') {
      setFormError({ text: 'Session not found. Please sign in again.', hint: null, link: null });
    }
  }, [searchParams]);

  // Detect admin email as user types — hide role selector
  const isAdminEmail = email.trim().toLowerCase() === ADMIN_EMAIL;

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailClean = email.trim().toLowerCase();
    const isAdmin    = emailClean === ADMIN_EMAIL;

    // Admin doesn't need role selection
    if (!isAdmin && !selectedRole) {
      setFormError({ text: 'Please select your role first.' });
      return;
    }

    setFormError(null);
    setLoading(true);

    try {
      const res = await authClient.signIn.email({ email: emailClean, password });
      if (res.error) {
        setFormError(mapError(res.error.message || 'Login failed'));
        return;
      }

      const user = res.data?.user as any;

      if (isAdmin) {
        // Admin: store admin role, skip set-role API (server keeps admin role), go to admin homepage
        localStorage.setItem(`role_set_${user.id}`, 'admin');
        localStorage.setItem('pending_role', 'admin');
        console.log(' Admin login detected — redirecting straight to admin dashboard');
        window.location.href = '/dashboard/admin';
        return;
      }

      // Regular user: call set-role API
      try {
        console.log(' [Login] Setting role via API:', selectedRole, 'for user:', emailClean);
        console.log(' [Login] User object from login:', user);
        const setRoleRes = await fetch(`${API_BASE}/api/user/set-role`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ role: selectedRole }),
        });

        if (setRoleRes.ok) {
          const responseData = await setRoleRes.json();
          console.log(' [Login] Role set via API:', emailClean, '→', selectedRole);
          console.log(' [Login] API response:', responseData);
          // Store role in localStorage for AuthGuard compatibility
          localStorage.setItem(`role_set_${user.id}`, selectedRole);
          localStorage.setItem('pending_role', selectedRole);
          console.log(' [Login] localStorage updated with role:', selectedRole);
        } else {
          console.error(' [Login] Failed to set role via API, response:', setRoleRes.status);
          const errorData = await setRoleRes.json().catch(() => ({}));
          console.error(' [Login] Error details:', errorData);
          // Still redirect - session may have the role
        }
      } catch (e) {
        console.error(' [Login] Failed to set role:', e);
        // Still redirect - session may have the role
      }

      // Redirect to appropriate homepage based on selected role
      const redirectUrl = getRoleRedirect(selectedRole);
      console.log(' [Login] Redirecting to:', redirectUrl, 'for role:', selectedRole);
      console.log(' [Login] Current localStorage before redirect:');
      console.log('  - role_set_' + user.id + ':', localStorage.getItem(`role_set_${user.id}`));
      console.log('  - pending_role:', localStorage.getItem('pending_role'));
      window.location.href = redirectUrl;

    } catch (err: any) {
      setFormError(mapError(err?.message || 'Login failed'));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    const emailClean = email.trim().toLowerCase();
    const isAdmin    = emailClean === ADMIN_EMAIL;

    if (!isAdmin && !selectedRole) {
      setFormError({ text: 'Please select your role first.' });
      return;
    }

    setFormError(null);
    setGoogleLoading(true);
    try {
      localStorage.setItem('pending_google_role', isAdmin ? 'admin' : selectedRole);
      await authClient.signIn.social({
        provider:    'google',
        callbackURL: `${FRONTEND_URL}/auth/callback`,
      });
    } catch (err: any) {
      setFormError({ text: err?.message || 'Google sign-in failed. Try again.' });
      setGoogleLoading(false);
    }
  };

  const chosen = ROLES.find(r => r.id === selectedRole);

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-background overflow-hidden">
      <div className="absolute inset-0 bg-cover bg-center opacity-20" style={{ backgroundImage: "url('/stadium-bg.jpg')" }} />
      <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at center,transparent 20%,hsl(0 0% 0% / 0.95) 70%)' }} />
      {[{ left: '8%', rotate: '-12deg' }, { left: '92%', rotate: '12deg' }].map((b, i) => (
        <div key={i} className="absolute top-0 pointer-events-none"
          style={{ left: b.left, width: 120, height: '60vh',
            background: 'linear-gradient(180deg,hsla(45,100%,90%,0.8) 0%,transparent 100%)',
            transform: `rotate(${b.rotate})`, transformOrigin: 'top center',
            filter: 'blur(25px)', opacity: 0.06 }} />
      ))}
      <GoldParticles />
      <FireSparkles />

      <div className="relative z-10 w-full max-w-md mx-4 py-10">
        <div className="mb-4">
          <Link href="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors text-sm font-display group">
            <span className="w-8 h-8 rounded-lg bg-secondary/40 border border-border/40 flex items-center justify-center group-hover:border-primary/40 group-hover:bg-primary/5 transition-all">←</span>
            Back to Home
          </Link>
        </div>

        <div className="flex justify-center mb-5 opacity-0 animate-slide-up">
          <BeastLogo size={100} glow float3d href="/" />
        </div>

        <AnimatePresence>
          {chosen && !isAdminEmail && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="flex justify-center mb-4">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border-gold-subtle"
                style={{ background: 'hsla(45,100%,51%,0.08)' }}>
                <span className="text-lg">{chosen.Icon && <chosen.Icon size={20} />}</span>
                <span className="font-heading text-sm uppercase tracking-[0.15em] text-primary">{chosen.label}</span>
                <span className="text-muted-foreground text-xs font-display">— {chosen.tagline}</span>
              </div>
            </motion.div>
          )}
          {isAdminEmail && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
              className="flex justify-center mb-4">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full"
                style={{ background: 'hsla(270,100%,60%,0.12)', border: '1px solid hsla(270,100%,60%,0.3)' }}>
                <Shield size={18} className="inline" />
                <span className="font-heading text-sm uppercase tracking-[0.15em] text-purple-400">Administrator Access</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="bg-glass-premium rounded-xl p-7 gold-edge opacity-0 animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <h2 className="font-heading text-2xl uppercase tracking-wider text-center mb-1 text-foreground">Welcome Back</h2>
          <p className="text-center text-muted-foreground text-sm mb-6 font-display">
            {isAdminEmail ? 'Administrator login detected' : 'Select your role to continue'}
          </p>

          {/* Role selector — hidden for admin email */}
          {!isAdminEmail && (
            <div className="grid grid-cols-3 gap-2 mb-6">
              {ROLES.map(r => (
                <button key={r.id} type="button"
                  onClick={() => { setSelectedRole(r.id); setFormError(null); }}
                  className={`relative rounded-lg p-3 text-center transition-all duration-200 border ${
                    selectedRole === r.id
                      ? 'border-primary bg-primary/10 shadow-[0_0_12px_hsla(45,100%,51%,0.2)]'
                      : 'border-border/40 bg-secondary/20 hover:border-primary/40 hover:bg-primary/5'
                  }`}>
                  <div className="text-2xl mb-1"><r.Icon size={22} /></div>
                  <div className="font-heading text-[10px] uppercase tracking-wider text-foreground">{r.label}</div>
                </button>
              ))}
            </div>
          )}

          <button onClick={handleGoogleLogin} disabled={loading || googleLoading}
            className="w-full py-3 px-4 rounded-lg bg-white text-gray-900 font-semibold hover:bg-gray-100 transition-all disabled:opacity-50 mb-5 flex items-center justify-center gap-3 shadow-md">
            {googleLoading
              ? <><span className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />Redirecting to Google...</>
              : <><svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Sign in with Google</>}
          </button>

          <div className="relative mb-5">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border/40" /></div>
            <div className="relative flex justify-center text-xs">
              <span className="px-3 font-heading uppercase tracking-wider text-muted-foreground" style={{ background: 'hsl(0 0% 8%)' }}>Or continue with email</span>
            </div>
          </div>

          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div>
              <label className="block text-[10px] font-heading uppercase tracking-wider text-muted-foreground mb-1.5">Email Address</label>
              <div className="relative">
                <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                <input type="email" required value={email} onChange={e => { setEmail(e.target.value); setFormError(null); }}
                  placeholder="you@gmail.com" className="input-beast pl-9" />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-heading uppercase tracking-wider text-muted-foreground mb-1.5">Password</label>
              <div className="relative">
                <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                <input type={showPwd ? 'text' : 'password'} required value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="Enter password" className="input-beast pl-9 pr-10" />
                <button type="button" onClick={() => setShowPwd(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                  {showPwd ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                </button>
              </div>
            </div>

            <div className="flex justify-end">
              <Link href="/forgot-password" className="text-xs text-primary hover:text-primary/80 font-heading transition-colors">Forgot password?</Link>
            </div>

            {formError && (
              <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                className="text-destructive text-xs font-heading bg-destructive/10 rounded-lg px-3 py-2.5 space-y-1 border border-destructive/20">
                <p>{formError.text}</p>
                {formError.hint && <p className="text-muted-foreground font-display">{formError.hint}</p>}
                {formError.link && (
                  <Link href={formError.link.href} className="text-primary underline font-heading inline-block mt-0.5">{formError.link.label}</Link>
                )}
              </motion.div>
            )}

            <button type="submit" disabled={loading || googleLoading}
              className="w-full py-3.5 rounded-lg bg-primary text-primary-foreground font-heading uppercase tracking-wider text-sm glow-gold hover:scale-[1.02] transition-all disabled:opacity-50 flex items-center justify-center gap-2">
              {loading
                ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Signing In...</>
                : isAdminEmail ? <><Shield size={14} className="inline mr-1" />Admin Login</> : <><LogIn size={14} className="inline mr-1" />Login</>}
            </button>
          </form>

          <p className="mt-5 text-center font-display text-muted-foreground text-sm">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="text-primary hover:text-primary/80 font-heading transition-colors">Register here</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>}>
      <LoginPageInner />
    </Suspense>
  );
}
