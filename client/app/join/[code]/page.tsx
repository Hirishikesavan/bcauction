'use client';
import { Search, Radio, Trophy } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import api from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import BeastLogo from '@/components/beast/BeastLogo';
import { fmt } from '@/lib/utils';

// Public landing page for an auction's join link / join code.
// Two states depending on the auction's status:
//   - active/draft/scheduled  → invite card, "Join as Team Owner" CTA
//   - completed               → final results summary
// Previously this route did not exist at all, so every shared join link
// and every "Auction Complete — check results" WhatsApp message 404'd.

export default function JoinByCodePage() {
  const { code } = useParams<{ code: string }>();
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [auction, setAuction] = useState<any>(null);
  const [results, setResults] = useState<any>(null);

  useEffect(() => {
    if (!code) return;
    api.get(`/auctions/by-code/${code}`)
      .then(async (r) => {
        const a = r.data.auction;
        setAuction(a);
        if (a.status === 'completed') {
          try {
            const res = await api.get(`/auctions/${a._id}/results`);
            setResults(res.data);
          } catch { /* show basic card without full results */ }
        }
      })
      .catch((e) => setError(e.response?.data?.error || 'Invalid or expired join code'))
      .finally(() => setLoading(false));
  }, [code]);

  const handleJoin = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('pending_join_code', String(code).toUpperCase());
    }
    if (!user) {
      window.location.href = '/login';
    } else {
      window.location.href = '/dashboard/team-owner';
    }
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#04040a' }}>
        <div className="text-center">
          <img src="/logo.png" alt="Beast Cricket" className="w-16 h-16 object-contain mx-auto mb-4 animate-pulse" />
          <p className="text-slate-500 text-xs uppercase tracking-widest animate-pulse">Loading...</p>
        </div>
      </div>
    );
  }

  if (error || !auction) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="text-center max-w-sm">
          <div className="flex justify-center mb-4"><Search size={56} className="text-primary" /></div>
          <h1 className="font-heading text-2xl uppercase tracking-wider text-foreground mb-2">Code Not Found</h1>
          <p className="text-muted-foreground font-display text-sm mb-6">{error || 'This join code doesn\'t match any auction.'}</p>
          <a href="/" className="inline-block px-6 py-2.5 rounded-lg bg-primary text-primary-foreground font-heading uppercase tracking-wider text-xs glow-gold">Go Home</a>
        </div>
      </div>
    );
  }

  // ── COMPLETED — show results ──────────────────────────────────────────
  if (auction.status === 'completed') {
    const summary = results?.summary;
    const teams = (results?.teams || []).slice().sort((a: any, b: any) => b.soldCount - a.soldCount);
    return (
      <div className="min-h-screen bg-background px-4 py-10">
        <div className="max-w-3xl mx-auto">
          <div className="flex justify-center mb-6"><BeastLogo size={64} glow href="/" /></div>
          <div className="text-center mb-8">
            <span className="inline-block px-3 py-1 rounded-full text-[10px] font-heading uppercase tracking-widest bg-green-500/15 text-green-400 border border-green-500/30 mb-3">Auction Complete</span>
            <h1 className="font-heading text-3xl sm:text-4xl uppercase tracking-[0.1em] text-foreground">{auction.name}</h1>
          </div>

          {summary && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
              {[
                { label: 'Players Sold', value: summary.soldPlayers },
                { label: 'Total Bids', value: summary.totalBids },
                { label: 'Total Spent', value: fmt(summary.totalRevenue) },
                { label: 'Top Team', value: summary.topTeam || '—' },
              ].map(s => (
                <div key={s.label} className="bg-secondary/20 rounded-xl p-4 text-center border border-border/30">
                  <div className="font-heading text-lg font-bold text-foreground truncate">{s.value}</div>
                  <div className="text-[10px] font-heading uppercase tracking-wider text-muted-foreground mt-1">{s.label}</div>
                </div>
              ))}
            </div>
          )}

          {teams.length > 0 && (
            <div className="space-y-3">
              {teams.map((t: any, i: number) => (
                <motion.div key={t._id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                  className="flex items-center gap-4 p-4 rounded-xl border border-border/30 bg-secondary/10">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center font-heading text-sm" style={{ background: t.primaryColor || '#f59e0b', color: '#000' }}>{i + 1}</div>
                  <div className="flex-1">
                    <div className="font-heading text-sm uppercase tracking-wider text-foreground">{t.name}</div>
                    <div className="text-muted-foreground text-xs font-display">{t.soldCount} players · {fmt(t.spent)} spent</div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {!results && <p className="text-center text-muted-foreground text-sm font-display">Detailed results aren't available right now — check back soon.</p>}

          <div className="text-center mt-10">
            <a href="/" className="inline-block px-6 py-2.5 rounded-lg border border-border text-muted-foreground font-heading uppercase tracking-wider text-xs hover:text-foreground hover:border-primary/40 transition-all">Beast Cricket Home</a>
          </div>
        </div>
      </div>
    );
  }

  // ── ACTIVE / DRAFT / SCHEDULED — invite to join ───────────────────────
  const full = auction.teamCount >= auction.maxTeams;
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="max-w-md w-full text-center">
        <div className="flex justify-center mb-6"><BeastLogo size={72} glow href="/" /></div>
        <p className="text-muted-foreground font-display text-xs uppercase tracking-widest mb-2">You're Invited To</p>
        <h1 className="font-heading text-3xl uppercase tracking-[0.1em] text-foreground mb-4">{auction.name}</h1>
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-secondary/20 border border-border/30 mb-6">
          <span className="text-muted-foreground text-xs font-heading uppercase tracking-wider">Join Code</span>
          <span className="font-mono text-lg font-bold text-primary tracking-widest">{auction.joinCode}</span>
        </div>
        <p className="text-muted-foreground font-display text-sm mb-1">{auction.teamCount}/{auction.maxTeams} teams joined</p>
        {auction.status === 'active' && <p className="text-yellow-400 font-display text-xs mb-6"><Radio size={11} className="inline mr-1 text-red-400" />Auction is live right now!</p>}

        {full ? (
          <div className="px-5 py-3 rounded-xl border border-yellow-500/30 bg-yellow-500/10 text-yellow-400 text-sm font-display">This auction is full — all team slots are taken.</div>
        ) : (
          <button onClick={handleJoin} className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-heading uppercase tracking-widest text-sm glow-gold hover:scale-[1.02] transition-all">
            <Trophy size={14} className="inline mr-1.5" />Join as Team Owner
          </button>
        )}
        <p className="text-muted-foreground text-[10px] font-display mt-4">{user ? 'You\'ll be taken to your dashboard to register your team.' : 'Sign in (or create an account) to register your team.'}</p>
      </motion.div>
    </div>
  );
}
