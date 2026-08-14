'use client';
import { Clapperboard, Trophy, Eye, Check } from 'lucide-react';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import GoldParticles from '@/components/beast/GoldParticles';
import FireSparkles  from '@/components/beast/FireSparkles';
import BeastLogo     from '@/components/beast/BeastLogo';
import api from '@/lib/api';

const ROLES = [
  { id: 'organizer',  label: 'Organizer',  Icon: Clapperboard, desc: 'Create and manage cricket auctions', color: '#f59e0b' },
  { id: 'team_owner', label: 'Team Owner', Icon: Trophy,       desc: 'Bid and buy players for your team',  color: '#60a5fa' },
  { id: 'viewer',     label: 'Viewer',     Icon: Eye,          desc: 'Watch auctions live in real-time',   color: '#34d399' },
];

// Route mapping for each role
const ROLE_ROUTES: Record<string, string> = {
  organizer: '/organizer-home',
  team_owner: '/team-owner-home',
  viewer: '/viewer-home',
};

export default function SelectRolePage() {
  const router = useRouter();
  const [selected, setSelected] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  const handleContinue = async () => {
    if (!selected) { setError('Please select a role to continue'); return; }
    setLoading(true); setError('');

    try {
      console.log('[AUTH] Creating session for role:', selected);

      // Generate unique guest email and password for this session
      const guestId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      const guestEmail = `guest-${guestId}@beastcricket.local`;
      const guestPassword = guestId;

      // Use Better Auth's standard sign-up endpoint
      const signUpResponse = await api.post('/auth/sign-up/email', {
        email: guestEmail,
        password: guestPassword,
        name: `${selected.charAt(0).toUpperCase() + selected.slice(1)} User`,
      });

      if (signUpResponse.data) {
        console.log('[AUTH] Sign up successful:', signUpResponse.data);

        // Update role in database via direct API call
        try {
          await api.post('/auth/update-role', { role: selected });
        } catch (roleErr) {
          console.log('[AUTH] Role update failed, will try sign-in:', roleErr);
        }

        // Sign in to create session
        const signInResponse = await api.post('/auth/sign-in/email', {
          email: guestEmail,
          password: guestPassword,
        });

        if (signInResponse.data) {
          console.log('[AUTH] Sign in successful:', signInResponse.data);
          
          // Store selected role in localStorage for reference
          localStorage.setItem('selected_role', selected);

          // Navigate to the appropriate dashboard based on role
          const redirectUrl = ROLE_ROUTES[selected];
          console.log('[AUTH] Redirecting to:', redirectUrl);
          router.push(redirectUrl);
        } else {
          throw new Error('Sign in failed');
        }
      } else {
        throw new Error('Sign up failed');
      }
    } catch (err: any) {
      console.error('[AUTH] Session creation error:', err);
      setError(err.response?.data?.error || err.message || 'Failed to create session. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-background overflow-hidden">
      <div className="absolute inset-0 bg-cover bg-center opacity-20" style={{ backgroundImage: "url('/stadium-bg.jpg')" }} />
      <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at center,transparent 20%,hsl(0 0% 0% / 0.95) 70%)' }} />
      <GoldParticles /><FireSparkles />

      <div className="relative z-10 w-full max-w-md mx-4 py-10">
        <div className="flex justify-center mb-6"><BeastLogo size={80} glow href="/" /></div>

        <div className="text-center mb-8">
          <h1 className="font-heading text-3xl uppercase tracking-[0.12em] text-foreground mb-2">
            Choose Your <span className="text-gradient-gold">Role</span>
          </h1>
          <p className="font-display text-muted-foreground text-sm">How will you use Beast Cricket Auction?</p>
        </div>

        <div className="bg-glass-premium rounded-xl p-7 gold-edge">
          {error && (
            <div className="mb-5 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-xs font-heading">{error}</div>
          )}
          <div className="space-y-3 mb-6">
            {ROLES.map((r, i) => (
              <motion.button key={r.id}
                initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08 }}
                onClick={() => { setSelected(r.id); setError(''); }}
                className={`w-full p-4 rounded-xl border-2 text-left transition-all ${selected === r.id ? '' : 'border-border/40 hover:border-border/70 bg-secondary/10'}`}
                style={selected === r.id ? { borderColor: r.color, background: r.color + '14' } : {}}>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                    style={{ background: selected === r.id ? r.color + '25' : 'hsla(222,30%,16%,0.5)' }}>
                    <r.Icon size={28} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-heading text-base uppercase tracking-wider text-foreground">{r.label}</div>
                    <div className="font-display text-muted-foreground text-xs mt-0.5">{r.desc}</div>
                  </div>
                  {selected === r.id && (
                    <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: r.color, color: '#000' }}>
                      <Check size={12} />
                    </div>
                  )}
                </div>
              </motion.button>
            ))}
          </div>
          <button onClick={handleContinue} disabled={!selected || loading}
            className="w-full py-3.5 rounded-lg bg-primary text-primary-foreground font-heading uppercase tracking-wider text-sm glow-gold hover:scale-[1.02] transition-all disabled:opacity-50 flex items-center justify-center gap-2">
            {loading ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Setting up...</> : ' Continue →'}
          </button>
        </div>
      </div>
    </div>
  );
}
