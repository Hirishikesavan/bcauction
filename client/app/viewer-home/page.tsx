'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { HomeHeader, HomeFooter, SectionTitle } from '@/components/homepage/site-chrome';
import {
  Eye, Radio, BarChart3, Search, Users, Trophy, PlayCircle,
  Calendar, TrendingUp, Star, Lock, Headphones,
} from 'lucide-react';
import '@/app/homepage-theme.css';

const NAV = [
  { label: 'Live Auctions', hash: '#live' },
  { label: 'Statistics', hash: '#stats' },
  { label: 'Broadcast', hash: '#broadcast' },
  { label: 'How It Works', hash: '#how' },
  { label: 'Contact', hash: '#contact' },
];

const IMG = '/homepage/viewer';

export default function ViewerHomePage() {
  return <ViewerHome />;
}

function ViewerHome() {
  useEffect(() => {
    document.title = 'Beast Cricket for Viewers — Watch Live Auctions';
  }, []);

  return (
    <div className="bc-homepage min-h-screen">
      <HomeHeader role="viewer" links={NAV} />

      <section className="relative min-h-[640px] flex items-center overflow-hidden">
        <img src={`${IMG}/hero.jpg`} alt="" className="absolute inset-0 w-full h-full object-cover opacity-60" />
        <div className="absolute inset-0 bg-gradient-to-r from-[var(--navy-deep)] via-[var(--navy-deep)]/70 to-transparent" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-20 w-full">
          <div className="max-w-2xl">
            <h1 className="text-4xl md:text-6xl font-bold italic uppercase leading-tight">
              Beast Cricket<br /><span className="text-[var(--gold)]">for Viewers</span>
            </h1>
            <p className="mt-5 text-lg text-white/90 max-w-md">Watch Live Cricket Auctions<br />Real-Time Player Bidding & Statistics</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/dashboard/viewer" className="btn-gold btn-gold-hover px-6 py-3 text-sm inline-flex items-center gap-2">Go to Live Auctions →</Link>
              <a href="#how" className="btn-outline-gold px-6 py-3 text-sm">How It Works</a>
            </div>
          </div>
        </div>
      </section>

      <section className="relative -mt-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="card-navy px-6 py-6 grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { icon: Radio, k: '100+', v: 'Live Auctions' },
            { icon: Users, k: '50,000+', v: 'Players Tracked' },
            { icon: Trophy, k: '500+', v: 'Leagues Covered' },
            { icon: TrendingUp, k: '24/7', v: 'Real-Time Updates' },
          ].map((s) => (
            <div key={s.v} className="flex items-center gap-3">
              <s.icon className="w-9 h-9 text-[var(--gold)]" />
              <div>
                <div className="text-2xl font-bold">{s.k}</div>
                <div className="text-xs text-white/60 uppercase tracking-wide">{s.v}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="how" className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionTitle>How It Works for Viewers</SectionTitle>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {[
            { i: Eye, t: 'Browse Auctions' },
            { i: PlayCircle, t: 'Watch Live' },
            { i: BarChart3, t: 'View Statistics' },
            { i: Search, t: 'Search Players' },
            { i: Calendar, t: 'Check Schedule' },
          ].map((s, idx) => (
            <div key={s.t} className="card-navy p-4 text-center relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-7 h-7 rounded-full bg-[var(--gold)] text-[var(--navy-deep)] text-xs font-bold flex items-center justify-center">{idx + 1}</div>
              <s.i className="w-8 h-8 text-[var(--gold)] mx-auto mt-3" />
              <div className="mt-2 text-sm font-semibold">{s.t}</div>
            </div>
          ))}
        </div>
      </section>

      <section id="live" className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionTitle>Live Auction Experience</SectionTitle>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { t: 'Live Bidding', d: 'Watch real-time bidding action', img: `${IMG}/live-bidding.png` },
            { t: 'Player Stats', d: 'View detailed player statistics', img: `${IMG}/player-stats.png` },
            { t: 'Team Purse', d: 'Track team purse in real-time', img: `${IMG}/team-purse.png` },
            { t: 'Auction Replay', d: 'Watch past auction replays', img: `${IMG}/auction-replay.png` },
          ].map((f) => (
            <div key={f.t} className="card-navy p-4 text-center">
              <div className="aspect-video rounded overflow-hidden border border-white/10 mb-3 bg-[var(--navy-deep)]">
                <img src={f.img} alt={f.t} loading="lazy" className="w-full h-full object-cover" />
              </div>
              <div className="text-xs font-bold text-[var(--gold)] uppercase tracking-wide">{f.t}</div>
              <p className="mt-1 text-xs text-white/60">{f.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="stats" className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionTitle>Statistics & Analytics</SectionTitle>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            { i: BarChart3, t: 'Player Performance', d: 'Detailed stats for every player' },
            { i: TrendingUp, t: 'Market Trends', d: 'Track player value trends' },
            { i: Users, t: 'Team Analysis', d: 'Analyze team compositions' },
            { i: Trophy, t: 'Auction History', d: 'View past auction results' },
            { i: Star, t: 'Top Performers', d: 'Discover rising stars' },
            { i: Calendar, t: 'Schedule', d: 'Upcoming auction schedule' },
          ].map((f) => (
            <div key={f.t} className="card-navy p-4 text-center">
              <f.i className="w-8 h-8 text-[var(--gold)] mx-auto mb-2" />
              <div className="text-sm font-semibold">{f.t}</div>
              <div className="text-xs text-white/60 mt-1">{f.d}</div>
            </div>
          ))}
        </div>
      </section>

      <section id="broadcast" className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionTitle>Broadcast Features</SectionTitle>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { t: 'Live Broadcast Screen', d: 'Professional broadcast with live stats and player information', img: `${IMG}/broadcast.png` },
            { t: 'Audience Screen', d: 'Dedicated viewer screen with enhanced statistics', img: `${IMG}/audience.png` },
          ].map((f) => (
            <div key={f.t} className="card-navy p-4">
              <div className="aspect-video rounded overflow-hidden border border-white/10 mb-3 bg-[var(--navy-deep)]">
                <img src={f.img} alt={f.t} loading="lazy" className="w-full h-full object-cover" />
              </div>
              <div className="text-sm font-bold text-[var(--gold)] uppercase tracking-wide">{f.t}</div>
              <p className="mt-1 text-sm text-white/60">{f.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8">
        <div className="card-navy p-5 grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
          {[
            { i: Lock, t: 'Free Access', d: 'No subscription required' },
            { i: Radio, t: 'Real-Time', d: 'Live updates every second' },
            { i: Search, t: 'Easy Search', d: 'Find players instantly' },
            { i: Headphones, t: '24/7 Support', d: 'We are here for you' },
            { i: Trophy, t: 'Trusted Platform', d: 'Used by leagues nationwide' },
          ].map((t) => (
            <div key={t.t} className="flex items-start gap-3">
              <t.i className="w-7 h-7 text-[var(--gold)] shrink-0" />
              <div>
                <div className="font-bold">{t.t}</div>
                <div className="text-xs text-white/60">{t.d}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="contact" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="card-navy p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <img src="/homepage/shared/logo.png" alt="" className="h-16 w-auto" />
            <div>
              <h3 className="text-xl font-bold uppercase">Ready to Watch Live Auctions?</h3>
              <p className="text-sm text-white/60">Join thousands of viewers watching live cricket auctions.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Link href="/dashboard/viewer" className="btn-gold btn-gold-hover px-6 py-3 text-sm">Go to Live Auctions</Link>
          </div>
        </div>
      </section>

      <HomeFooter />
    </div>
  );
}
