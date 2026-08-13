'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Trophy } from 'lucide-react';
import { motion } from 'framer-motion';
import GoldParticles from '@/components/beast/GoldParticles';
import FireSparkles from '@/components/beast/FireSparkles';
import BeastLogo from '@/components/beast/BeastLogo';

export default function LoginPage() {
  useEffect(() => {
    // Redirect directly to team owner dashboard
    window.location.href = '/dashboard/team-owner';
  }, []);

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

        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="flex justify-center mb-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border-gold-subtle"
            style={{ background: 'hsla(45,100%,51%,0.08)' }}>
            <span className="text-lg"><Trophy size={20} /></span>
            <span className="font-heading text-sm uppercase tracking-[0.15em] text-primary">Team Owner</span>
            <span className="text-muted-foreground text-xs font-display">— War Room</span>
          </div>
        </motion.div>

        <div className="bg-glass-premium rounded-xl p-7 gold-edge opacity-0 animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <h2 className="font-heading text-2xl uppercase tracking-wider text-center mb-1 text-foreground">Welcome</h2>
          <p className="text-center text-muted-foreground text-sm mb-6 font-display">
            Redirecting to your dashboard...
          </p>

          <div className="flex justify-center">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        </div>
      </div>
    </div>
  );
}
