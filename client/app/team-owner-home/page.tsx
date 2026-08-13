'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import AuthGuard from '@/components/shared/AuthGuard';
import { HomeHeader, HomeFooter, SectionTitle } from '@/components/homepage/site-chrome';
import { TermsModal } from '@/components/beast/TermsModal';
import {
  Gavel, Users, FileBarChart, Hand, LogIn, KeyRound, UserPlus, Upload,
  CheckCircle2, Trophy, Coins, BarChart3, Share2, Shield,
} from 'lucide-react';
import '@/app/homepage-theme.css';

const NAV = [
  { label: 'Features', hash: '#features' },
  { label: 'How It Works', hash: '#how' },
  { label: 'Squad Reports', hash: '#reports' },
  { label: 'Team Posters', hash: '#posters' },
  { label: 'Contact', hash: '#contact' },
];

const IMG = '/homepage/team-owner';

const POWERFUL_FEATURES = [
  { img: `${IMG}/live-bidding.png`, t: 'Live Bidding', d: 'Real-time bidding experience' },
  { img: `${IMG}/purse-tracking.png`, t: 'Purse Tracking', d: 'Track your remaining purse in real-time' },
  { img: `${IMG}/my-squad.png`, t: 'My Squad', d: 'Manage your players and squad details' },
  { img: `${IMG}/squad-report.png`, t: 'Squad Reports', d: 'Download detailed squad reports' },
  { img: `${IMG}/team-poster.png`, t: 'Team Posters', d: 'Generate posters & share easily' },
  { img: `${IMG}/social-kit.png`, t: 'Social Media Kit', d: 'Ready-to-share designs for every platform' },
  { img: `${IMG}/auction-history.png`, t: 'Auction History', d: 'View past auctions & performance' },
] as const;

export default function TeamOwnerHomePage() {
  return (
    <AuthGuard roles={['team_owner']}>
      <TeamOwnerHome />
    </AuthGuard>
  );
}

function TeamOwnerHome() {
  useEffect(() => {
    document.title = 'Beast Cricket for Team Owners — Join Auctions, Build Squads';
  }, []);

  return (
    <div className="bc-homepage min-h-screen">
      <HomeHeader role="team-owner" links={NAV} />

      <section className="relative flex min-h-[640px] items-center overflow-hidden">
        <img src={`${IMG}/hero.jpg`} alt="" className="absolute inset-0 h-full w-full object-cover opacity-70" />
        <div className="absolute inset-0 bg-gradient-to-r from-[var(--navy-deep)] via-[var(--navy-deep)]/60 to-[var(--navy-deep)]/30" />
        <div className="relative mx-auto grid w-full max-w-7xl items-center gap-10 px-4 pb-20 pt-32 sm:px-6 lg:grid-cols-2 lg:px-8">
          <div>
            <h1 className="text-4xl font-bold uppercase italic leading-tight md:text-6xl">
              Beast Cricket<br /><span className="text-[var(--gold)]">for Team Owners</span>
            </h1>
            <p className="mt-5 text-lg text-white/90">Join Auctions. Build Your Team.<br />Win Championships.</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/dashboard/team-owner" className="btn-gold btn-gold-hover inline-flex items-center gap-2 px-6 py-3 text-sm">
                Go to Dashboard <Users className="h-4 w-4" />
              </Link>
              <a href="#how" className="btn-outline-gold inline-flex items-center gap-2 px-6 py-3 text-sm">How It Works ▶</a>
            </div>
          </div>
          <div className="card-navy ml-auto w-full max-w-sm p-4">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold uppercase tracking-wider">Live Auction</span>
              <span className="rounded bg-red-600 px-2 py-0.5 font-bold text-white">● LIVE</span>
            </div>
            <div className="mt-3 text-xs text-white/60">Current Player</div>
            <div className="text-lg font-bold">Rashid Khan</div>
            <div className="text-xs text-white/60">All Rounder</div>
            <div className="mt-3 text-xs text-white/60">Current Bid</div>
            <div className="text-2xl font-bold text-[var(--gold)]">₹75,000</div>
            <div className="mt-3 border-t border-white/10 pt-3 text-xs text-white/60">Leading Team</div>
            <div className="font-semibold">Chennai Super Kings</div>
          </div>
        </div>
      </section>

      <section className="relative -mt-12 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="card-navy grid items-center gap-5 p-5 md:grid-cols-5">
          <div>
            <div className="text-xs font-bold uppercase text-[var(--gold)]">My Team Dashboard</div>
            <div className="mt-2 text-xs text-white/60">Manage your team, purse &amp; squad</div>
          </div>
          <Stat label="Remaining Purse" value="₹5,00,000" />
          <Stat label="Players Bought" value="12 / 20" />
          <Stat label="Upcoming Auction" value="TNPL 2026" sub="20 May, 7:00 PM" />
          <Link href="/dashboard/team-owner" className="btn-outline-gold py-3 text-sm flex items-center justify-center">Go to Dashboard</Link>
        </div>
      </section>

      <section id="how" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <SectionTitle>How It Works for Team Owners</SectionTitle>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          {[
            { i: LogIn, t: 'Login', d: 'Login to your account' },
            { i: KeyRound, t: 'Enter Auction Code', d: 'Enter code shared by organizer' },
            { i: UserPlus, t: 'Create Team', d: 'Create your team name & details' },
            { i: Upload, t: 'Upload Logo', d: 'Upload your team logo & banner' },
            { i: Hand, t: 'Participate in Auction', d: 'Join live auction and bid players' },
            { i: FileBarChart, t: 'Download Reports', d: 'View & download your squad report' },
          ].map((s, idx) => (
            <div key={s.t} className="card-navy relative p-4 text-center">
              <div className="absolute -top-3 left-1/2 flex h-7 w-7 -translate-x-1/2 items-center justify-center rounded-full bg-[var(--gold)] text-xs font-bold text-[var(--navy-deep)]">
                {idx + 1}
              </div>
              <s.i className="mx-auto mt-3 h-8 w-8 text-[var(--gold)]" />
              <div className="mt-2 text-sm font-semibold">{s.t}</div>
              <div className="mt-1 text-xs text-white/60">{s.d}</div>
            </div>
          ))}
        </div>
      </section>

      <section id="features" className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <SectionTitle>Powerful Features for Team Owners</SectionTitle>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-7">
          {POWERFUL_FEATURES.map((f) => (
            <div key={f.t} className="card-navy p-3 text-center">
              <div className="aspect-video rounded overflow-hidden border border-white/10 mb-2 bg-[var(--navy-deep)]">
                <img src={f.img} alt={f.t} loading="lazy" className="w-full h-full object-cover" />
              </div>
              <div className="text-[11px] font-bold text-[var(--gold)] uppercase tracking-wide">{f.t}</div>
              <p className="mt-1 text-[10px] text-white/60">{f.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <SectionTitle>Live Auction Experience</SectionTitle>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="card-navy p-4">
            <div className="mb-2 border-b border-white/10 pb-2 text-xs font-bold uppercase text-[var(--gold)]">Upcoming Players</div>
            {['Virat Kohli', 'Jasprit Bumrah', 'Ben Stokes'].map((p) => (
              <div key={p} className="flex items-center gap-2 py-2 text-xs">
                <div className="h-8 w-8 rounded-full bg-[var(--gold)]/20" />
                <div className="flex-1">
                  {p}
                  <div className="text-[10px] text-white/60">Base Price: ₹50,000</div>
                </div>
              </div>
            ))}
          </div>
          <div className="card-navy p-4">
            <div className="text-xs text-white/60">Current Player</div>
            <div className="font-bold">Rashid Khan</div>
            <div className="text-xs text-white/60">All Rounder</div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div>
                <div className="text-xs text-white/60">Current Bid</div>
                <div className="font-bold text-[var(--gold)]">₹75,000</div>
              </div>
              <div>
                <div className="text-xs text-white/60">Next Min Bid</div>
                <div className="font-bold">₹80,000</div>
              </div>
            </div>
            <div className="mt-3 text-xs text-white/60">Leading Team</div>
            <div className="font-semibold">Chennai Super Kings</div>
            <Link href="/dashboard/team-owner" className="btn-gold btn-gold-hover mt-3 w-full py-2 text-sm flex items-center justify-center">
              Go to Dashboard
            </Link>
          </div>
          <div className="card-navy p-4">
            <div className="mb-2 border-b border-white/10 pb-2 text-xs font-bold uppercase text-[var(--gold)]">Teams</div>
            {[['CSK', '₹75,000'], ['MI', '₹70,000'], ['RCB', '₹65,000'], ['KKR', '₹60,000']].map(([t, v]) => (
              <div key={t} className="flex justify-between py-2 text-xs">
                <span className="font-semibold">{t}</span>
                <span className="text-[var(--gold)]">{v}</span>
              </div>
            ))}
          </div>
          <div className="card-navy p-4">
            <div className="mb-2 border-b border-white/10 pb-2 text-xs font-bold uppercase text-[var(--gold)]">Purse Tracking</div>
            <div
              className="relative mx-auto h-32 w-32 rounded-full"
              style={{ background: 'conic-gradient(var(--gold) 0 47%, hsl(220 30% 35%) 47% 100%)' }}
            >
              <div className="absolute inset-3 flex flex-col items-center justify-center rounded-full bg-[var(--navy)]">
                <div className="text-[10px] text-white/60">Total Purse</div>
                <div className="font-bold">₹5,00,000</div>
              </div>
            </div>
            <div className="mt-3 space-y-1 text-xs">
              <div className="flex justify-between"><span className="text-white/60">Spent</span><span className="font-bold">₹2,35,000</span></div>
              <div className="flex justify-between"><span className="text-white/60">Remaining</span><span className="font-bold text-[var(--gold)]">₹2,65,000</span></div>
            </div>
          </div>
        </div>
      </section>

      <section id="reports" className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <SectionTitle>Premium Team Owner Features</SectionTitle>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[
            { img: `${IMG}/squad-report.png`, t: 'Squad PDF Report', d: 'Complete squad report with photos, roles & prices' },
            { img: `${IMG}/team-poster.png`, t: 'Team Poster', d: 'Create stunning team posters in one click' },
            { img: `${IMG}/social-kit.png`, t: 'Social Media Kit', d: 'Ready to share on Instagram, WhatsApp & Facebook' },
            { img: `${IMG}/auction-history.png`, t: 'Auction History', d: 'View all your past auctions & performance' },
          ].map((f) => (
            <div key={f.t} className="card-navy flex flex-col p-4 text-center">
              <div className="mb-3 aspect-square overflow-hidden rounded-md border border-white/10 bg-[var(--navy-deep)] p-2">
                <div className="h-full w-full overflow-hidden rounded-sm bg-[var(--navy)]">
                  <img src={f.img} alt={f.t} loading="lazy" className="h-full w-full object-cover object-center" />
                </div>
              </div>
              <div className="mt-2 text-xs font-bold uppercase tracking-wide text-[var(--gold)]">{f.t}</div>
              <p className="mt-1 text-xs text-white/60">{f.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="posters" className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <SectionTitle>Why Team Owners Love Beast Cricket</SectionTitle>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          {[
            { i: Gavel, t: 'Real-Time Bidding', d: 'Never miss a bid' },
            { i: Coins, t: 'Smart Purse Tracking', d: 'Spend wisely' },
            { i: BarChart3, t: 'Detailed Squad Reports', d: 'Download anytime' },
            { i: Trophy, t: 'Team Branding', d: 'Upload logo & banner' },
            { i: Share2, t: 'Share & Celebrate', d: 'Post on social media' },
            { i: Shield, t: 'Secure & Reliable', d: '100% Safe Platform' },
          ].map((f) => (
            <div key={f.t} className="card-navy p-4 text-center">
              <f.i className="mx-auto h-7 w-7 text-[var(--gold)]" />
              <div className="mt-2 text-sm font-semibold">{f.t}</div>
              <div className="text-xs text-white/60">{f.d}</div>
            </div>
          ))}
        </div>
      </section>

      <section id="contact" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="card-navy flex flex-col items-center justify-between gap-6 p-6 md:flex-row md:p-8">
          <div className="flex items-center gap-4">
            <img src="/homepage/shared/logo.png" alt="" className="h-16 w-auto" />
            <div>
              <h3 className="text-xl font-bold uppercase">Ready to Build Your Champion Team?</h3>
              <p className="text-sm text-white/60">Join thousands of team owners who trust Beast Cricket.</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Link href="/dashboard/team-owner" className="btn-gold btn-gold-hover inline-flex items-center gap-2 px-6 py-3 text-sm">
              Go to Dashboard <CheckCircle2 className="h-4 w-4" />
            </Link>
            <p className="text-xs text-white/50">
              By using Beast Cricket, you agree to our{' '}
              <TermsModal trigger={<span className="text-[var(--gold)] underline cursor-pointer hover:text-[var(--gold)]/80">Terms &amp; Conditions</span>} />
            </p>
          </div>
        </div>
      </section>

      <HomeFooter />
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div>
      <div className="text-xs uppercase text-white/60">{label}</div>
      <div className="text-lg font-bold">{value}</div>
      {sub && <div className="text-[10px] text-white/60">{sub}</div>}
    </div>
  );
}
