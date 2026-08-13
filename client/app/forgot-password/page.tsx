'use client';
import { Mail, Send } from 'lucide-react';

import { useState } from 'react';
import { authClient } from '@/lib/auth-client';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { FiMail, FiArrowLeft } from 'react-icons/fi';
import GoldParticles from '@/components/beast/GoldParticles';
import FireSparkles from '@/components/beast/FireSparkles';
import BeastLogo from '@/components/beast/BeastLogo';

export default function ForgotPasswordPage() {
  const [email,   setEmail]   = useState('');
  const [sent,    setSent]    = useState(false);
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      // Use authClient for correct Better Auth endpoint handling
      const { error: apiError } = await (authClient as any).forgetPassword({
        email: email.trim().toLowerCase(),
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (apiError) {
        console.error(' Forgot password error:', apiError);
        // Only show error for server-side failures, not "email not found" (security)
        if (apiError.status && apiError.status >= 500) {
          setError('Server error. Please try again in a moment.');
          return;
        }
      }
      // Always show success — prevents email enumeration
      setSent(true);
    } catch (err: any) {
      console.error(' Forgot password exception:', err);
      setError('Unable to connect. Please check your connection and try again.');
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

          {sent ? (
            <div className="text-center py-4">
              <div className="flex justify-center mb-4"><Mail size={48} className="text-primary" /></div>
              <h2 className="font-heading text-2xl uppercase tracking-wider text-foreground mb-3">Check Your Inbox!</h2>
              <p className="font-display text-muted-foreground text-sm mb-6">
                If <strong className="text-foreground">{email}</strong> has an account, you&apos;ll receive a password reset link shortly.
              </p>
              <p className="font-display text-muted-foreground text-xs mb-6">
                Don&apos;t see it? Check your spam folder or wait a minute.
              </p>
              <Link href="/login"
                className="inline-block px-8 py-3 rounded-lg bg-primary text-primary-foreground font-heading uppercase tracking-wider text-xs glow-gold hover:scale-[1.02] transition-all">
                ← Back to Login
              </Link>
            </div>
          ) : (
            <>
              <h2 className="font-heading text-2xl uppercase tracking-wider text-center mb-1 text-foreground">Forgot Password</h2>
              <p className="text-center text-muted-foreground text-sm mb-6 font-display">We&apos;ll send you a reset link</p>

              {error && (
                <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                  className="mb-5 text-destructive text-xs font-heading bg-destructive/10 rounded-lg px-3 py-2.5 border border-destructive/20">
                  {error}
                </motion.div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-[10px] font-heading uppercase tracking-wider text-muted-foreground mb-1.5">Email Address</label>
                  <div className="relative">
                    <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={e => { setEmail(e.target.value); setError(''); }}
                      placeholder="your@email.com"
                      className="input-beast pl-9"
                    />
                  </div>
                </div>
                <button type="submit" disabled={loading}
                  className="w-full py-3.5 rounded-lg bg-primary text-primary-foreground font-heading uppercase tracking-wider text-sm glow-gold hover:scale-[1.02] transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                  {loading
                    ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Sending...</>
                    : <><Send size={14} className="inline mr-1.5" />Send Reset Link</>}
                </button>
              </form>

              <p className="mt-5 text-center font-display text-muted-foreground text-sm">
                Remember your password?{' '}
                <Link href="/login" className="text-primary hover:text-primary/80 font-heading transition-colors">Login here</Link>
              </p>
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
}
