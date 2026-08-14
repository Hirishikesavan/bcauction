'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { HomeHeader, HomeFooter, SectionTitle } from '@/components/homepage/site-chrome';
import { TermsModal } from '@/components/beast/TermsModal';
import {
  Trophy, Users, Shield, IndianRupee, ClipboardList, CalendarPlus, UserPlus, Wallet,
  Gavel, FileBarChart, Award, Star, CheckCircle2, Lock, MousePointerClick, Headphones,
} from 'lucide-react';
import '@/app/homepage-theme.css';

const NAV = [
  { label: 'Features', hash: '#features' },
  { label: 'Packages', hash: '#packages' },
  { label: 'AI Features', hash: '#ai' },
  { label: 'How It Works', hash: '#how' },
  { label: 'Contact', hash: '#contact' },
];

const IMG = '/homepage/organizer';

export default function OrganizerHomePage() {
  return <OrganizerHome />;
}

function OrganizerHome() {
  const { user } = useAuth();

  useEffect(() => {
    document.title = 'Beast Cricket for Organizers — Run Pro Cricket Auctions';
    console.log(' [OrganizerHome] Component mounted successfully');
  }, []);

  return (
    <div className="bc-homepage min-h-screen">
      <HomeHeader role="organizer" links={NAV} />

      <section className="relative min-h-[640px] flex items-center overflow-hidden">
        <img src={`${IMG}/hero.jpg`} alt="" className="absolute inset-0 w-full h-full object-cover opacity-60" />
        <div className="absolute inset-0 bg-gradient-to-r from-[var(--navy-deep)] via-[var(--navy-deep)]/70 to-transparent" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-20 w-full">
          <div className="max-w-2xl">
            <h1 className="text-4xl md:text-6xl font-bold italic uppercase leading-tight">
              Beast Cricket<br /><span className="text-[var(--gold)]">for Organizers</span>
            </h1>
            <p className="mt-5 text-lg text-white/90 max-w-md">Create, Manage &amp; Broadcast<br />Professional Cricket Auctions</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/dashboard/organizer" className="btn-gold btn-gold-hover px-6 py-3 text-sm inline-flex items-center gap-2">Go to Dashboard →</Link>
              <a href="#packages" className="btn-outline-gold px-6 py-3 text-sm">View Packages</a>
            </div>
          </div>
        </div>
      </section>

      <section className="relative -mt-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="card-navy px-6 py-6 grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { icon: Trophy, k: '500+', v: 'Auctions Hosted' },
            { icon: Users, k: '10,000+', v: 'Players Registered' },
            { icon: Shield, k: '100+', v: 'Leagues Managed' },
            { icon: IndianRupee, k: '100%', v: 'No Commission On Player Fees' },
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
        <SectionTitle>How It Works for Organizers</SectionTitle>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          {[
            { i: ClipboardList, t: 'Choose Package' },
            { i: CalendarPlus, t: 'Create Auction' },
            { i: UserPlus, t: 'Invite Teams' },
            { i: Users, t: 'Register Players' },
            { i: Wallet, t: 'Collect Registration Fees' },
            { i: Gavel, t: 'Run Auction' },
            { i: FileBarChart, t: 'Generate Reports' },
          ].map((s, idx) => (
            <div key={s.t} className="card-navy p-4 text-center relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-7 h-7 rounded-full bg-[var(--gold)] text-[var(--navy-deep)] text-xs font-bold flex items-center justify-center">{idx + 1}</div>
              <s.i className="w-8 h-8 text-[var(--gold)] mx-auto mt-3" />
              <div className="mt-2 text-sm font-semibold">{s.t}</div>
            </div>
          ))}
        </div>
      </section>

      <section id="packages" className="py-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionTitle>Choose Your Perfect Plan</SectionTitle>
        <div className="grid md:grid-cols-3 gap-6">
          <PlanCard name="STARTER" price="2999" tagline="Perfect for Small Tournaments"
            badge={<Badge icon={Award} color="bg-amber-700" />}
            features={['3 Auctions / Year', '20 Teams', '300 Players', 'Live Auction System', 'Team Management', 'Player Management', 'Unsold Player Round', 'Basic Dashboard', 'Email Notifications']}
            cta="Go to Dashboard" ctaStyle="outline" />
          <PlanCard name="PRO" price="5999" tagline="Ideal for Growing Leagues" popular
            badge={<Badge icon={Star} color="bg-slate-400" />}
            heading="Everything in Starter +"
            features={['RTM (Right To Match)', 'Player Registration Form', 'Player Fee Collection', 'Team Wallet', 'Razorpay Payments', 'PDF & Excel Export', 'Bulk Import (Excel)', 'Auction Replay', 'WhatsApp Notifications', 'Organizer Squad PDF Report', 'Team Owner Squad PDF Report', 'Advanced Analytics', 'Budget Utilization Report']}
            cta="Go to Dashboard" ctaStyle="gold" />
          <PlanCard name="ELITE" price="9999" tagline="For Champions"
            badge={<Badge icon={Trophy} color="bg-[var(--gold)]" best />}
            heading="Everything in Pro +"
            features={['Broadcast Screen', 'Auction Audience Screen', 'Custom Branding', 'Sponsor Ads', 'AI Assisted Auction', 'OBS Compatible Broadcast', 'YouTube Live Support', 'Premium Squad PDF Layout', 'Team Poster Generator', 'Social Media Squad Posters', 'Priority Support']}
            cta="Go to Dashboard" ctaStyle="outline" />
        </div>
      </section>

      <section id="ai" className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionTitle>AI Assisted Auction (Elite)</SectionTitle>
        <p className="text-center text-white/60 -mt-6 mb-8">Smart AI tools to help you run data-driven and successful auctions</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {[
            { t: 'AI Suggested Bid', img: `${IMG}/ai-1.png` },
            { t: 'AI Purse Advisor', img: `${IMG}/ai-2.png` },
            { t: 'AI Team Analysis', img: `${IMG}/ai-3.png` },
            { t: 'AI Squad Strength', img: `${IMG}/ai-4.png` },
            { t: 'AI Auction Summary', img: `${IMG}/ai-5.png` },
          ].map((c) => (
            <AICard key={c.t} title={c.t}>
              <img src={c.img} alt={c.t} loading="lazy" className="w-full h-auto rounded-md" />
            </AICard>
          ))}
        </div>
      </section>

      <section id="features" className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        <div>
          <SectionTitle>Starter Features Showcase</SectionTitle>
          <p className="text-center text-white/60 -mt-6 mb-8">Everything you need to launch your first cricket auction — simple, fast &amp; reliable</p>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { t: 'Live Auction System', d: 'Run real-time bidding with timer, hammer & instant updates', img: `${IMG}/starter-auction.png`, objectClass: 'object-top' },
              { t: 'Team Management', d: 'Add up to 20 teams with owners, logos & purse setup', img: `${IMG}/starter-teams.png` },
              { t: 'Player Management', d: 'Register up to 300 players with roles, base price & photos', img: `${IMG}/starter-players.png` },
              { t: 'Unsold Player Round', d: 'Re-auction unsold players in a dedicated round', img: `${IMG}/starter-unsold.png` },
              { t: 'Basic Dashboard', d: 'Track auction progress, teams & spending at a glance', img: `${IMG}/starter-dashboard.png` },
            ].map((f) => (
              <FeatureCard key={f.t} {...f} />
            ))}
          </div>
        </div>

        <div>
          <SectionTitle>Pro Features Showcase</SectionTitle>
          <p className="text-center text-white/60 -mt-6 mb-8">Built for growing leagues — payments, automation &amp; advanced reporting</p>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { t: 'RTM (Right To Match)', d: 'Let teams retain players using Right To Match cards', img: `${IMG}/pro-rtm.png` },
              { t: 'Team Wallet & Razorpay', d: 'Collect player fees & manage team wallets with secure payments', img: `${IMG}/pro-wallet.png` },
              { t: 'PDF & Excel Export', d: 'Export squads, reports & player lists in one click', img: `${IMG}/pro-reports.png` },
              { t: 'Bulk Import + Replay', d: 'Upload players via Excel & replay any past auction', img: `${IMG}/pro-import.png` },
              { t: 'WhatsApp Notifications', d: 'Auto-send updates, fixtures & squad info on WhatsApp', img: `${IMG}/pro-whatsapp.png` },
            ].map((f) => (
              <FeatureCard key={f.t} {...f} />
            ))}
          </div>
        </div>

        <div>
          <SectionTitle>Elite Features Showcase</SectionTitle>
          <p className="text-center text-white/60 -mt-6 mb-8">The complete championship-grade experience — broadcast, branding &amp; AI</p>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { t: 'Broadcast Screen', d: 'Professional broadcast for projector & TV with live stats', img: `${IMG}/elite-broadcast.png` },
              { t: 'Premium Squad PDF', d: 'Beautiful squad reports with photos, roles & prices', img: `${IMG}/elite-pdf.png` },
              { t: 'Team Poster Generator', d: 'Create stunning team posters in one click', img: `${IMG}/elite-poster.png` },
              { t: 'Social Media Kit', d: 'Instagram, Story, WhatsApp & Facebook ready designs', img: `${IMG}/elite-social.png` },
              { t: 'Sponsor Ads', d: 'Display sponsor logos & banners on all screens & reports', img: `${IMG}/elite-sponsor.png` },
            ].map((f) => (
              <FeatureCard key={f.t} {...f} />
            ))}
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8">
        <div className="card-navy p-5 grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
          {[
            { i: Shield, t: 'No Commission', d: 'on player fees' },
            { i: Lock, t: '100% Secure', d: 'Payments with Razorpay' },
            { i: MousePointerClick, t: 'Easy to Use', d: 'Simple & intuitive platform' },
            { i: Headphones, t: '24/7 Support', d: 'We are here for you' },
            { i: Trophy, t: 'Trusted by Leagues', d: 'Across India' },
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
              <h3 className="text-xl font-bold uppercase">Ready to Run Your Next Auction?</h3>
              <p className="text-sm text-white/60">Join hundreds of organizers who trust Beast Cricket.</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Link href="/dashboard/organizer" className="btn-gold btn-gold-hover px-6 py-3 text-sm">Go to Dashboard</Link>
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

function FeatureCard({ t, d, img, objectClass }: { t: string; d: string; img: string; objectClass?: string }) {
  return (
    <div className="card-navy p-4">
      <div className="aspect-video rounded overflow-hidden border border-white/10 mb-3 bg-[var(--navy-deep)]">
        <img src={img} alt={t} loading="lazy" className={`w-full h-full object-cover ${objectClass ?? ''}`} />
      </div>
      <div className="text-xs font-bold text-[var(--gold)] uppercase tracking-wide">{t}</div>
      <p className="mt-1 text-xs text-white/60">{d}</p>
    </div>
  );
}

function AICard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card-navy p-4">
      <div className="text-center text-xs font-bold text-[var(--gold)] uppercase tracking-wider pb-2 border-b border-white/10 mb-3">{title}</div>
      {children}
    </div>
  );
}

function Badge({ icon: Icon, color, best }: { icon: any; color: string; best?: boolean }) {
  return (
    <div className="absolute -top-3 -right-3 flex items-center gap-1">
      <div className={`${color} text-[var(--navy-deep)] w-9 h-9 rounded-full flex items-center justify-center shadow-lg`}>
        <Icon className="w-5 h-5" />
      </div>
      {best && <span className="absolute -top-1 right-9 text-[10px] bg-[var(--gold)] text-[var(--navy-deep)] px-2 py-0.5 font-bold rounded">BEST VALUE</span>}
    </div>
  );
}

function PlanCard({ name, price, tagline, features, cta, ctaStyle, heading, popular, badge }: {
  name: string; price: string; tagline: string; features: string[]; cta: string;
  ctaStyle: 'gold' | 'outline'; heading?: string; popular?: boolean; badge?: React.ReactNode;
}) {
  return (
    <div className={`relative card-navy p-6 ${popular ? 'ring-2 ring-[var(--gold)]' : ''}`}>
      {popular && <span className="absolute top-0 right-0 bg-[var(--gold)] text-[var(--navy-deep)] text-[10px] font-bold px-3 py-1 rounded-bl">POPULAR</span>}
      {badge}
      <div className="text-[var(--gold)] font-bold tracking-wider">{name}</div>
      <div className="flex items-baseline gap-1 mt-2">
        <span className="text-3xl font-bold">₹{price}</span>
        <span className="text-sm text-white/60">/ Year</span>
      </div>
      <p className="text-xs text-white/60 mt-1">{tagline}</p>
      {heading && <div className="mt-4 text-sm font-semibold text-[var(--gold)]">{heading}</div>}
      <ul className="mt-3 space-y-1.5 text-sm">
        {features.map((f) => (
          <li key={f} className="flex gap-2 items-start">
            <CheckCircle2 className="w-4 h-4 text-[var(--gold)] mt-0.5 shrink-0" />
            <span>{f}</span>
          </li>
        ))}
      </ul>
      <Link href="/dashboard/organizer" className={`mt-5 w-full py-3 text-sm flex items-center justify-center ${ctaStyle === 'gold' ? 'btn-gold btn-gold-hover' : 'btn-outline-gold'}`}>{cta}</Link>
    </div>
  );
}
