'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import api from '@/lib/api';
import { useAuth, getRoleRedirect } from '@/hooks/useAuth';
import { fmt } from '@/lib/utils';
import BeastLogo from '@/components/beast/BeastLogo';
import GoldParticles from '@/components/beast/GoldParticles';
import FireSparkles from '@/components/beast/FireSparkles';
import { TermsModal } from '@/components/beast/TermsModal';
import { format } from 'date-fns';
import {
  Gavel, Radio, Trophy, Users, UserRound, Zap, Target, BarChart3, Lock,
  Smartphone, MonitorPlay, Calendar, IndianRupee, Clock, Eye, CheckCircle,
  Clapperboard, Medal, Shield
} from 'lucide-react';

// Beast Forge premium sections
import { Arena, LiveBidding, PlayerMarketplace, Teams, Intelligence, ForgeFeatures, ForgePricing, GlobalCta } from '@/components/forge/sections';
import { ForgeLogoReveal } from '@/components/forge/ForgeLogoReveal';
import { ForgeHero } from '@/components/forge/ForgeHero';

export default function HomePage() {
  const { user, loading } = useAuth();
  const [auctions, setAuctions] = useState<any[]>([]);
  const [stats, setStats] = useState({ total: 0, active: 0, players: 0, teams: 0 });

  useEffect(() => {
    api.get('/auctions')
      .then(r => {
        const list: any[] = r.data.auctions || [];
        setAuctions(list.slice(0, 6));
        setStats({
          total: list.length,
          active: list.filter((a: any) => a.status === 'active').length,
          players: list.reduce((s: number, a: any) => s + (a.playerCount || 0), 0),
          teams: list.reduce((s: number, a: any) => s + (a.teamCount || 0), 0),
        });
      })
      .catch(() => {});
  }, []);

  const STATS = [
    { icon: Gavel,     label: 'Total Auctions',  value: stats.total   || '—' },
    { icon: Radio,     label: 'Live Now',         value: stats.active  || '—' },
    { icon: UserRound, label: 'Players Listed',   value: stats.players || '—' },
    { icon: Trophy,    label: 'Teams Competing',  value: stats.teams   || '—' },
  ];

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">

      {/* ════════════════════════════════════════════════════════
          PART 1: EXISTING HERO — DO NOT MODIFY
          ════════════════════════════════════════════════════════ */}
      <div className="relative min-h-screen flex flex-col overflow-hidden">
        {/* Background */}
        <div
          className="absolute inset-0 bg-cover bg-center opacity-80"
          style={{ backgroundImage: "url('/stadium-bg.jpg')" }}
        />
        <div
          className="absolute inset-0"
          style={{ background: 'radial-gradient(ellipse at 50% 35%, hsla(0,0%,8%,0.3) 0%, hsl(0 0% 0% / 0.85) 70%)' }}
        />
        {/* Beam effects */}
        {[{ left: '8%', rotate: '-14deg' }, { left: '92%', rotate: '14deg' }].map((b, i) => (
          <div key={i} className="absolute top-0 pointer-events-none"
            style={{ left: b.left, width: 100, height: '65vh',
              background: 'linear-gradient(180deg,hsla(45,100%,90%,0.7) 0%,transparent 100%)',
              transform: `rotate(${b.rotate})`, transformOrigin: 'top center',
              filter: 'blur(28px)', opacity: 0.05 }}
          />
        ))}
        <GoldParticles />
        <FireSparkles />

        {/* NAV */}
        <nav className="relative z-20 flex items-center justify-between px-6 py-5 max-w-7xl mx-auto w-full">
          <div className="flex items-center gap-3">
            <BeastLogo size={40} glow href="/" />
            <div>
              <div className="font-heading text-base uppercase tracking-[0.2em] text-gradient-gold leading-none">Beast Cricket</div>
              <div className="text-[10px] font-heading uppercase tracking-widest text-muted-foreground">Auction Platform</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/auctions"
              className="px-4 py-2 rounded-lg text-xs font-heading uppercase tracking-wider text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all border border-border/40 hover:border-primary/30">
              Auctions
            </Link>
            <Link href="/#pricing"
              className="px-4 py-2 rounded-lg text-xs font-heading uppercase tracking-wider text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all border border-border/40 hover:border-primary/30">
              Plans
            </Link>
            {user ? (
              <Link href={getRoleRedirect(user.role || '')}
                className="px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-xs font-heading uppercase tracking-wider glow-gold hover:scale-[1.02] transition-all">
                Dashboard →
              </Link>
            ) : (
              <>
                <Link href="/login"
                  className="px-4 py-2 rounded-lg border border-primary/30 text-xs font-heading uppercase tracking-wider text-primary hover:bg-primary/10 transition-all">
                  Login
                </Link>
                <Link href="/register"
                  className="px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-xs font-heading uppercase tracking-wider glow-gold hover:scale-[1.02] transition-all">
                  Register Free
                </Link>
              </>
            )}
          </div>
        </nav>

        {/* HERO CONTENT */}
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-6 py-20">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
            <div className="flex justify-center mb-6">
              <BeastLogo size={160} glow float3d href="/" />
            </div>

            <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-[11px] font-heading uppercase tracking-[0.2em] mb-5">
              <Radio size={12} className="inline mr-1.5 text-red-400" />Live IPL-Style Cricket Auctions
            </span>

            <h1 className="font-heading text-5xl md:text-7xl xl:text-8xl uppercase tracking-[0.08em] text-foreground mb-4 leading-none">
              Beast<br />
              <span className="text-gradient-gold">Cricket</span><br />
              Auction
            </h1>

            <p className="font-display text-muted-foreground text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
              Real-time IPL-style player auctions with live bidding, RTM cards,
              multi-team support, and a cinematic broadcast experience.
            </p>

            <div className="flex flex-wrap gap-4 justify-center">
              {user ? (
                <Link href={getRoleRedirect(user.role || '')}
                  className="px-10 py-4 rounded-xl bg-primary text-primary-foreground font-heading uppercase tracking-wider text-base glow-gold hover:scale-[1.02] transition-all">
                  Go to Dashboard →
                </Link>
              ) : (
                <>
                  <Link href="/register"
                    className="px-10 py-4 rounded-xl bg-primary text-primary-foreground font-heading uppercase tracking-wider text-base glow-gold hover:scale-[1.02] transition-all">
                    Get Started Free
                  </Link>
                  <Link href="/auctions"
                    className="px-10 py-4 rounded-xl border border-primary/40 text-primary font-heading uppercase tracking-wider text-base hover:bg-primary/10 transition-all">
                    View Live Auctions
                  </Link>
                </>
              )}
            </div>
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <div className="relative z-10 flex justify-center pb-8">
          <motion.div animate={{ y: [0, 8, 0] }} transition={{ duration: 2, repeat: Infinity }}
            className="text-muted-foreground/40 text-xs font-heading uppercase tracking-widest flex flex-col items-center gap-2">
            <span>Scroll</span>
            <span>↓</span>
          </motion.div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════
          PART 2: BEAST FORGE CINEMATIC LOGO REVEAL (Fixed Overlay)
          ════════════════════════════════════════════════════════ */}
      <ForgeLogoReveal />

      {/* ════════════════════════════════════════════════════════
          PART 3: BEAST FORGE HERO SECTION
          ════════════════════════════════════════════════════════ */}
      <div style={{ position: 'relative', minHeight: '100vh' }}>
        <ForgeHero />
      </div>

      {/* ════════════════════════════════════════════════════════
          PART 4: BEAST FORGE PREMIUM HOMEPAGE SECTIONS
          ════════════════════════════════════════════════════════ */}

      {/* Live stats strip — bridges hero to forge sections */}
      <div className="max-w-6xl mx-auto px-6 py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {STATS.map((s, i) => (
            <motion.div key={s.label}
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ delay: i * 0.1 }}
              className="bg-glass-premium rounded-xl p-6 text-center border-gold-subtle">
              <div className="flex justify-center mb-2"><s.icon size={28} className="text-primary" /></div>
              <div className="font-heading text-3xl text-gradient-gold mb-1">{s.value}</div>
              <div className="font-display text-muted-foreground text-xs uppercase tracking-wider">{s.label}</div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* ── Section 02: The Auction Arena ── */}
      <Arena />

      {/* ── Section 03: Live Bidding Telemetry ── */}
      <LiveBidding />

      {/* ── Live Auctions (real data from API) ── */}
      {auctions.length > 0 && (
        <div className="max-w-6xl mx-auto px-6 py-16">
          <div className="flex items-center justify-between mb-8">
            <div>
              <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-[11px] font-heading uppercase tracking-[0.2em] mb-3">
                Featured
              </span>
              <h2 className="font-heading text-4xl uppercase tracking-[0.1em] text-foreground">
                Recent <span className="text-gradient-gold">Auctions</span>
              </h2>
            </div>
            <Link href="/auctions"
              className="px-5 py-2.5 rounded-lg border border-primary/30 text-xs font-heading uppercase tracking-wider text-primary hover:bg-primary/10 transition-all">
              View All →
            </Link>
          </div>
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
            {auctions.map((a, i) => (
              <motion.div key={a._id}
                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.06 }}
                className="bg-glass-premium rounded-xl overflow-hidden border-gold-subtle hover:border-gold transition-all hover:scale-[1.02] group">
                <div className="h-1" style={{
                  background: a.status === 'active'
                    ? 'linear-gradient(90deg,hsl(142 70% 45%),hsl(142 70% 55%))'
                    : 'linear-gradient(90deg,hsl(45 100% 51%),hsl(40 100% 38%))'
                }} />
                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-heading text-xl uppercase tracking-[0.1em] text-foreground flex-1 pr-3">{a.name}</h3>
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-heading uppercase tracking-wider border flex-shrink-0 ${
                      a.status === 'active'
                        ? 'border-green-500/30 bg-green-500/10 text-green-400'
                        : 'border-muted bg-muted/20 text-muted-foreground'
                    }`}>
                      {a.status === 'active' && <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block mr-1" />}
                      {a.status}
                    </span>
                  </div>
                  <div className="space-y-1 text-xs font-display text-muted-foreground mb-4">
                    {a.date && <div><Calendar size={11} className="inline mr-1 opacity-60" />{format(new Date(a.date), 'dd MMM yyyy')}</div>}
                    <div><IndianRupee size={11} className="inline mr-1 opacity-60" />{fmt(a.totalPursePerTeam)} per team · <Clock size={11} className="inline mr-1 opacity-60" />{a.bidTimer}s</div>
                    {a.organizerId?.name && <div>by {a.organizerId.name}</div>}
                  </div>
                  <Link href={`/auctions/${a._id}`}
                    className={`block text-center py-2.5 rounded-lg text-xs font-heading uppercase tracking-wider transition-all ${
                      a.status === 'active'
                        ? 'bg-primary text-primary-foreground glow-gold hover:scale-[1.02]'
                        : 'border border-primary/30 text-primary hover:bg-primary/10'
                    }`}>
                    {a.status === 'active' ? <><Radio size={12} className="inline mr-1.5 text-red-300" />Watch Live</> : <><Eye size={12} className="inline mr-1.5" />View Auction</>}
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* ── Section 04: Player Marketplace ── */}
      <PlayerMarketplace />

      {/* ── Section 05: Franchise War Rooms ── */}
      <Teams />

      {/* ── Section 06: AI Auction Intelligence ── */}
      <Intelligence />

      {/* ── Section 07: Complete Auction Machine Features ── */}
      <ForgeFeatures />

      {/* ── Section 08: Pricing ── */}
      <ForgePricing />

      {/* ── How It Works ── */}
      <div className="max-w-6xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h2 className="font-heading text-4xl md:text-5xl uppercase tracking-[0.1em] text-foreground">
            How It <span className="text-gradient-gold">Works</span>
          </h2>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          {[
            { step: '01', Icon: Clapperboard, role: 'Organizer', title: 'Create & Configure', desc: 'Set up your auction, add players, configure purse and bid settings, then share the join code.' },
            { step: '02', Icon: Trophy,       role: 'Team Owner', title: 'Join & Build',      desc: 'Enter the join code, create your team, and compete in live bidding to build your squad.' },
            { step: '03', Icon: Eye,          role: 'Viewer',     title: 'Watch Live',        desc: 'Follow the action in real time — see bids, sold players, and team standings as they happen.' },
          ].map((item, i) => (
            <motion.div key={item.step}
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ delay: i * 0.15 }}
              className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 mb-4">
                <item.Icon size={32} className="text-primary" />
              </div>
              <div className="font-heading text-5xl text-primary/20 mb-2">{item.step}</div>
              <div className="inline-block px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-heading uppercase tracking-wider mb-3">
                {item.role}
              </div>
              <h3 className="font-heading text-xl uppercase tracking-wider text-foreground mb-2">{item.title}</h3>
              <p className="font-display text-muted-foreground text-sm leading-relaxed">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* ── Section 09: Global CTA ── */}
      <GlobalCta />

      {/* ── Promotional Banner ── */}
      <div className="max-w-6xl mx-auto px-6 py-20">
        <a href="https://beastcricket.com/" target="_blank" rel="noopener noreferrer" className="block w-full">
          <img
            src="/homepage/shared/beast-cricket-english-willow.jpg"
            alt="Beast Cricket English Willow Bats - View All English Willow Bats"
            className="w-full h-auto rounded-lg"
          />
        </a>
      </div>

      {/* ── FOOTER ── */}
      <footer className="border-t border-border/30 py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <BeastLogo size={28} href="/" />
            <span className="font-heading text-sm uppercase tracking-[0.15em] text-gradient-gold">Beast Cricket Auction</span>
          </div>
          <div className="flex items-center gap-6 text-xs font-heading uppercase tracking-wider text-muted-foreground">
            <Link href="/auctions" className="hover:text-primary transition-colors">Auctions</Link>
            <Link href="/#pricing"  className="hover:text-primary transition-colors">Plans</Link>
            <Link href="/login"    className="hover:text-primary transition-colors">Login</Link>
            <Link href="/register" className="hover:text-primary transition-colors">Register</Link>
          </div>
          <div className="flex items-center gap-4">
            <TermsModal trigger={<span className="font-display text-muted-foreground text-xs hover:text-primary cursor-pointer transition-colors">Terms &amp; Conditions</span>} />
            <p className="font-display text-muted-foreground text-xs">
              &copy; {new Date().getFullYear()} Beast Cricket Auction. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
