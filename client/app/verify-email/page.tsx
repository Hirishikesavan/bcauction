'use client';
import { Mail, CheckCircle, XCircle } from 'lucide-react';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams }               from 'next/navigation';
import Link                              from 'next/link';
import { motion }                        from 'framer-motion';
import { authClient }                    from '@/lib/auth-client';
import { getRoleRedirect }               from '@/hooks/useAuth';
import GoldParticles                     from '@/components/beast/GoldParticles';
import BeastLogo                         from '@/components/beast/BeastLogo';

function VerifyEmailContent() {
  const params = useSearchParams();
  const [status,  setStatus]  = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const token = params.get('token');
    if (!token) {
      setStatus('error');
      setMessage('No verification token in this link. Please use the link sent to your email.');
      return;
    }

    console.log(' Verifying email with token:', token.slice(0, 20) + '...');

    // Better Auth 1.x verifyEmail accepts { query: { token, callbackURL } }
    authClient.verifyEmail({
      query: { token, callbackURL: '/login' },
    })
      .then(async (res: any) => {
        console.log(' Verification response:', res);

        if (res?.error) {
          setStatus('error');
          const msg = (res.error.message || '').toLowerCase();
          if (msg.includes('expired')) {
            setMessage('This verification link has expired. Please register again to get a new one.');
          } else if (msg.includes('already')) {
            setMessage('Email already verified! Redirecting to login...');
            setTimeout(() => { window.location.href = '/login'; }, 2000);
          } else {
            setMessage(res.error.message || 'Verification failed. The link may have expired or already been used.');
          }
          return;
        }

        setStatus('success');
        await new Promise(r => setTimeout(r, 1200));
        try {
          const s    = await authClient.getSession();
          const user = (s as any)?.data?.user as any;
          if (user?.role && user.role !== 'viewer') {
            window.location.href = getRoleRedirect(user.role) || '/select-role';
          } else {
            window.location.href = '/select-role';
          }
        } catch {
          window.location.href = '/login';
        }
      })
      .catch((err: any) => {
        console.error(' Verification error:', err);
        setStatus('error');
        setMessage('Verification failed. The link may have expired or already been used.');
      });
  }, [params]);

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-background overflow-hidden">
      <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at center,transparent 20%,hsl(0 0% 0% / 0.97) 70%)' }} />
      <GoldParticles />
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
        className="relative z-10 w-full max-w-md mx-4 text-center">
        <div className="flex justify-center mb-6"><BeastLogo size={80} glow href="/" /></div>
        <div className="bg-glass-premium rounded-xl p-10 gold-edge">
          {status === 'loading' && (
            <>
              <div className="relative w-20 h-20 mx-auto mb-6">
                <div className="w-20 h-20 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center"><Mail size={28} className="text-primary" /></div>
              </div>
              <h2 className="font-heading text-2xl uppercase tracking-wider text-foreground mb-2">Verifying Email</h2>
              <p className="font-display text-muted-foreground text-sm">Please wait...</p>
            </>
          )}
          {status === 'success' && (
            <>
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200 }}
                className="mb-5 flex justify-center"><CheckCircle size={64} className="text-green-400" /></motion.div>
              <h2 className="font-heading text-3xl uppercase tracking-wider mb-3">
                <span className="text-gradient-gold">Email Verified!</span>
              </h2>
              <p className="font-display text-muted-foreground text-sm mb-6">Account active. Taking you to your dashboard...</p>
              <div className="w-48 h-1 mx-auto rounded-full overflow-hidden bg-secondary/30">
                <motion.div className="h-full rounded-full bg-primary"
                  initial={{ width: '0%' }} animate={{ width: '100%' }} transition={{ duration: 2, ease: 'linear' }} />
              </div>
            </>
          )}
          {status === 'error' && (
            <>
              <div className="flex justify-center mb-5"><XCircle size={64} className="text-red-400" /></div>
              <h2 className="font-heading text-2xl uppercase tracking-wider text-foreground mb-3">Verification Failed</h2>
              <p className="font-display text-destructive text-sm mb-8 leading-relaxed">{message}</p>
              <div className="flex flex-col gap-3">
                <Link href="/register"
                  className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-heading uppercase tracking-wider text-sm text-center glow-gold hover:scale-[1.02] transition-all">
                  Register Again
                </Link>
                <Link href="/login"
                  className="w-full py-3 rounded-lg border border-border/40 text-muted-foreground font-heading uppercase tracking-wider text-xs text-center hover:border-primary/40 hover:text-primary transition-all"
                  style={{ background: 'hsla(222,30%,16%,0.4)' }}>
                  Back to Login
                </Link>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'hsl(0 0% 0%)' }}>
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}
