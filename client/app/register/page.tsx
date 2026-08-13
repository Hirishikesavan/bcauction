'use client';
import { Mail, RefreshCw, CheckCircle, XCircle, Gavel } from 'lucide-react';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { FiMail, FiLock, FiUser, FiEye, FiEyeOff } from 'react-icons/fi';
import { authClient } from '@/lib/auth-client';
import GoldParticles from '@/components/beast/GoldParticles';
import FireSparkles from '@/components/beast/FireSparkles';
import BeastLogo from '@/components/beast/BeastLogo';
import { TermsCheckbox } from '@/components/beast/TermsModal';

const FRONTEND_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001';

export default function RegisterPage() {
  const [name,          setName]          = useState('');
  const [email,         setEmail]         = useState('');
  const [password,      setPassword]      = useState('');
  const [confirm,       setConfirm]       = useState('');
  const [showPwd,       setShowPwd]       = useState(false);
  const [error,         setError]         = useState('');
  const [success,       setSuccess]       = useState(false);
  const [regEmail,      setRegEmail]      = useState('');
  const [loading,       setLoading]       = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMsg,     setResendMsg]     = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!termsAccepted) { setError('Please read and accept the Terms & Conditions to continue'); return; }
    if (password !== confirm) { setError('Passwords do not match'); return; }
    if (password.length < 6)  { setError('Password must be at least 6 characters'); return; }
    setLoading(true);
    try {
      const res = await authClient.signUp.email({ name, email: email.trim().toLowerCase(), password });
      if (res.error) { 
        console.error('Registration error:', res.error);
        setError(res.error.message || 'Registration failed'); 
        return; 
      }
      console.log(' Registration successful for:', email.trim().toLowerCase());
      setRegEmail(email.trim().toLowerCase());
      setSuccess(true);
    } catch (err: any) {
      console.error('Registration exception:', err);
      setError(err?.message || 'Registration failed. Please try again.');
    } finally { setLoading(false); }
  };

  const handleGoogle = async () => {
    setError(''); setGoogleLoading(true);
    try {
      // Store a flag to indicate this is a new user from registration
      // They will be redirected to select-role after OAuth
      localStorage.setItem('pending_google_signup', 'true');
      
      // callbackURL MUST be absolute — relative URLs resolve to backend port 5000
      await authClient.signIn.social({
        provider:    'google',
        callbackURL: `${FRONTEND_URL}/auth/callback`,
      });
    } catch (err: any) {
      setError(err?.message || 'Google sign-up failed. Try again.');
      setGoogleLoading(false);
    }
  };

  const handleResend = async () => {
    if (!regEmail) return;
    setResendLoading(true); setResendMsg('');
    try {
      // Use direct API call to Better Auth resend verification endpoint
      const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api').replace(/\/api$/, '');
      const res = await fetch(`${API_BASE}/api/auth/send-verification-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: regEmail, callbackURL: '/login' }),
      });
      const data = await res.json();
      if (!res.ok) {
        setResendMsg('Failed to resend. Please try again.');
        return;
      }
      setResendMsg('Verification email resent! Check your inbox.');
    } catch (err: any) {
      setResendMsg('Failed to resend. Please try again.');
    } finally { setResendLoading(false); }
  };

  // ── SUCCESS SCREEN ─────────────────────────────────────────
  if (success) {
    return (
      <div className="relative min-h-screen flex items-center justify-center bg-background overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center opacity-15" style={{ backgroundImage: "url('/stadium-bg.jpg')" }} />
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at center,transparent 20%,hsl(0 0% 0% / 0.95) 70%)' }} />
        <GoldParticles /><FireSparkles />
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
          className="relative z-10 text-center p-10 max-w-md mx-4 bg-glass-premium rounded-xl gold-edge">
          <div className="flex justify-center mb-4"><Mail size={56} className="text-primary" /></div>
          <h2 className="font-heading text-3xl uppercase tracking-wider text-foreground mb-3">
            Check Your <span className="text-gradient-gold">Email</span>
          </h2>
          <p className="font-display text-muted-foreground mb-2">We sent a verification link to:</p>
          <p className="font-heading text-primary text-sm mb-4 break-all">{regEmail}</p>
          <p className="font-display text-muted-foreground text-sm mb-6">
            Click the link in your email to verify your account before logging in.
            The link expires in <strong className="text-foreground">24 hours</strong>.
            <br/><br/>
            <strong className="text-foreground">Important:</strong> You must verify your email before you can login.
          </p>
          <div className="space-y-3">
            <button onClick={handleResend} disabled={resendLoading}
              className="w-full py-3 rounded-lg border border-border/40 font-heading text-xs uppercase tracking-wider text-muted-foreground hover:text-primary hover:border-primary/40 transition-all disabled:opacity-50"
              style={{ background: 'hsla(222,30%,16%,0.5)' }}>
              {resendLoading ? 'Sending...' : <><RefreshCw size={14} className="inline mr-1.5" />Resend Verification Email</>}
            </button>
            {resendMsg && <p className={`text-xs font-display ${resendMsg.startsWith('Done') || resendMsg.includes('resent') ? 'text-green-400' : 'text-destructive'}`}>{resendMsg}</p>}
            <Link href="/login" className="block w-full py-3 rounded-lg bg-primary text-primary-foreground font-heading uppercase tracking-wider text-sm text-center glow-gold hover:scale-[1.02] transition-all">
              Go to Login
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-background overflow-hidden py-10">
      <div className="absolute inset-0 bg-cover bg-center opacity-15" style={{ backgroundImage: "url('/stadium-bg.jpg')" }} />
      <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at center,transparent 20%,hsl(0 0% 0% / 0.95) 70%)' }} />
      {[{ left: '8%', rotate: '-12deg' }, { left: '92%', rotate: '12deg' }].map((b, i) => (
        <div key={i} className="absolute top-0 pointer-events-none"
          style={{ left: b.left, width: 120, height: '60vh',
            background: 'linear-gradient(180deg,hsla(45,100%,90%,0.8) 0%,transparent 100%)',
            transform: `rotate(${b.rotate})`, transformOrigin: 'top center',
            filter: 'blur(25px)', opacity: 0.06 }} />
      ))}
      <GoldParticles /><FireSparkles />

      <div className="relative z-10 w-full max-w-md mx-4">
        <div className="mb-4">
          <Link href="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors text-sm font-display group">
            <span className="w-8 h-8 rounded-lg bg-secondary/40 border border-border/40 flex items-center justify-center group-hover:border-primary/40 transition-all">←</span>
            Back to Home
          </Link>
        </div>

        <div className="flex justify-center mb-5 opacity-0 animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <BeastLogo size={90} glow float3d href="/" />
        </div>

        <div className="bg-glass-premium rounded-xl p-7 gold-edge opacity-0 animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <h2 className="font-heading text-2xl uppercase tracking-wider text-center mb-1 text-foreground">Create Account</h2>
          <p className="text-center text-muted-foreground text-sm mb-6 font-display">Join Beast Cricket Auction</p>

          {error && (
            <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
              className="mb-5 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-xs font-heading">
              {error}
            </motion.div>
          )}

          <button onClick={handleGoogle} disabled={loading || googleLoading}
            className="w-full py-3 px-4 rounded-lg bg-white text-gray-900 font-semibold hover:bg-gray-100 transition-all disabled:opacity-50 mb-5 flex items-center justify-center gap-3 shadow-md">
            {googleLoading
              ? <><span className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />Redirecting...</>
              : <><svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Sign up with Google</>}
          </button>

          <div className="relative mb-5">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border/40" /></div>
            <div className="relative flex justify-center text-xs">
              <span className="px-3 font-heading uppercase tracking-wider text-muted-foreground" style={{ background: 'hsl(0 0% 8%)' }}>Or register with email</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] font-heading uppercase tracking-wider text-muted-foreground mb-1.5">Full Name *</label>
              <div className="relative">
                <FiUser className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                <input type="text" required value={name} onChange={e => setName(e.target.value)}
                  placeholder="Your full name" className="input-beast pl-9" />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-heading uppercase tracking-wider text-muted-foreground mb-1.5">Email Address *</label>
              <div className="relative">
                <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="you@gmail.com" className="input-beast pl-9" />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-heading uppercase tracking-wider text-muted-foreground mb-1.5">Password *</label>
              <div className="relative">
                <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                <input type={showPwd ? 'text' : 'password'} required value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="Min 6 characters" className="input-beast pl-9 pr-10" />
                <button type="button" onClick={() => setShowPwd(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                  {showPwd ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-heading uppercase tracking-wider text-muted-foreground mb-1.5">Confirm Password *</label>
              <div className="relative">
                <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                <input type="password" required value={confirm} onChange={e => setConfirm(e.target.value)}
                  placeholder="Repeat password" className="input-beast pl-9" />
              </div>
            </div>

            <TermsCheckbox accepted={termsAccepted} onChange={setTermsAccepted} />

            <button type="submit" disabled={loading || googleLoading || !termsAccepted}
              className="w-full py-3.5 rounded-lg bg-primary text-primary-foreground font-heading uppercase tracking-wider text-sm glow-gold hover:scale-[1.02] transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-2">
              {loading
                ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Creating Account...</>
                : <><Gavel size={14} className="inline mr-1.5" />Create Account</>}
            </button>
          </form>

          <p className="mt-5 text-center font-display text-muted-foreground text-sm">
            Already have an account?{' '}
            <Link href="/login" className="text-primary hover:text-primary/80 font-heading transition-colors">Login</Link>
          </p>
        </div>
      </div>
    </div>
  );
}