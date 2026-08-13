'use client';
import { CheckCircle, LogIn, TriangleAlert, KeyRound, Zap } from 'lucide-react';

import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { FiLock, FiArrowLeft, FiEye, FiEyeOff } from 'react-icons/fi';
import { authClient } from '@/lib/auth-client';
import GoldParticles from '@/components/beast/GoldParticles';
import FireSparkles from '@/components/beast/FireSparkles';
import BeastLogo from '@/components/beast/BeastLogo';

function ResetContent() {
  const params = useSearchParams();
  const router = useRouter();
  const [password,  setPassword]  = useState('');
  const [confirm,   setConfirm]   = useState('');
  const [showPwd,   setShowPwd]   = useState(false);
  const [showConf,  setShowConf]  = useState(false);
  const [done,      setDone]      = useState(false);
  const [error,     setError]     = useState('');
  const [loading,   setLoading]   = useState(false);

  // Extract token — handle both raw token string and full URL
  const rawToken = params.get('token') || '';
  let token = rawToken;
  if (rawToken.startsWith('http')) {
    try {
      const u = new URL(rawToken);
      token = u.searchParams.get('token') || rawToken;
    } catch { token = rawToken; }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirm) { setError('Passwords do not match'); return; }
    if (password.length < 6)  { setError('Password must be at least 6 characters'); return; }
    setLoading(true);
    try {
      const res = await authClient.resetPassword({ newPassword: password, token });
      if (res.error) {
        setError(res.error.message || 'Reset failed. The link may have expired — please request a new one.');
        return;
      }
      setDone(true);
      setTimeout(() => router.push('/login'), 3000);
    } catch (err: any) {
      setError(err?.message || 'Reset failed. Please try again or request a new link.');
    } finally { setLoading(false); }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-background overflow-hidden">
      {/* Background effects matching login page */}
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
          <Link href="/login" className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors text-sm font-display group">
            <span className="w-8 h-8 rounded-lg bg-secondary/40 border border-border/40 flex items-center justify-center group-hover:border-primary/40 group-hover:bg-primary/5 transition-all">
              <FiArrowLeft className="w-4 h-4" />
            </span>
            Back to Login
          </Link>
        </div>

        <div className="flex justify-center mb-5">
          <BeastLogo size={80} glow float3d href="/" />
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="bg-glass-premium rounded-xl p-7 gold-edge">

          {done ? (
            <div className="text-center py-4">
              <div className="flex justify-center mb-4"><CheckCircle size={48} className="text-green-400" /></div>
              <h2 className="font-heading text-2xl uppercase tracking-wider text-foreground mb-3">Password Reset!</h2>
              <p className="font-display text-muted-foreground text-sm mb-6">Your password has been updated. Redirecting to login...</p>
              <Link href="/login"
                className="inline-block px-8 py-3 rounded-lg bg-primary text-primary-foreground font-heading uppercase tracking-wider text-xs glow-gold hover:scale-[1.02] transition-all">
                <LogIn size={14} className="inline mr-1.5" />Go to Login
              </Link>
            </div>
          ) : (
            <>
              <h2 className="font-heading text-2xl uppercase tracking-wider text-center mb-1 text-foreground">Reset Password</h2>
              <p className="text-center text-muted-foreground text-sm mb-6 font-display">Enter your new password below</p>

              {!token && (
                <div className="mb-5 text-destructive text-xs font-heading bg-destructive/10 rounded-lg px-3 py-2.5 border border-destructive/20">
                  <TriangleAlert size={14} className="inline mr-1.5 text-yellow-400" />Invalid or missing reset link. Please{' '}
                  <Link href="/forgot-password" className="text-primary underline">request a new one</Link>.
                </div>
              )}
              {error && (
                <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                  className="mb-5 text-destructive text-xs font-heading bg-destructive/10 rounded-lg px-3 py-2.5 border border-destructive/20">
                  {error}
                </motion.div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-heading uppercase tracking-wider text-muted-foreground mb-1.5">New Password</label>
                  <div className="relative">
                    <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                    <input
                      type={showPwd ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={e => { setPassword(e.target.value); setError(''); }}
                      placeholder="At least 6 characters"
                      disabled={!token}
                      className="input-beast pl-9 pr-10"
                    />
                    <button type="button" onClick={() => setShowPwd(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                      {showPwd ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-heading uppercase tracking-wider text-muted-foreground mb-1.5">Confirm New Password</label>
                  <div className="relative">
                    <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                    <input
                      type={showConf ? 'text' : 'password'}
                      required
                      value={confirm}
                      onChange={e => { setConfirm(e.target.value); setError(''); }}
                      placeholder="Repeat password"
                      disabled={!token}
                      className="input-beast pl-9 pr-10"
                    />
                    <button type="button" onClick={() => setShowConf(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                      {showConf ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                    </button>
                  </div>
                  {confirm && password !== confirm && (
                    <p className="text-destructive text-xs mt-1 font-heading">Passwords do not match</p>
                  )}
                </div>
                <button type="submit" disabled={loading || !token || (!!confirm && password !== confirm)}
                  className="w-full py-3.5 rounded-lg bg-primary text-primary-foreground font-heading uppercase tracking-wider text-sm glow-gold hover:scale-[1.02] transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                  {loading
                    ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Resetting...</>
                    : <><KeyRound size={14} className="inline mr-1.5" />Reset Password</>}
                </button>
              </form>

              <p className="mt-5 text-center font-display text-muted-foreground text-sm">
                Didn&apos;t request this?{' '}
                <Link href="/forgot-password" className="text-primary hover:text-primary/80 font-heading transition-colors">Request new link</Link>
              </p>
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="relative min-h-screen flex items-center justify-center bg-background">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <ResetContent />
    </Suspense>
  );
}
