'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { HomeHeader, HomeFooter, SectionTitle } from '@/components/homepage/site-chrome';
import {
  Shield, Users, Package, FileBarChart, TrendingUp, Settings,
  Activity, CreditCard, AlertTriangle, CheckCircle2, Lock,
  Database, Globe, Headphones,
} from 'lucide-react';
import '@/app/homepage-theme.css';

const NAV = [
  { label: 'Dashboard', hash: '#dashboard' },
  { label: 'Users', hash: '#users' },
  { label: 'Analytics', hash: '#analytics' },
  { label: 'Reports', hash: '#reports' },
  { label: 'Contact', hash: '#contact' },
];

const IMG = '/homepage/admin';

export default function AdminHomePage() {
  return <AdminHome />;
}

function AdminHome() {
  useEffect(() => {
    document.title = 'Beast Cricket Admin — Platform Management';
  }, []);

  return (
    <div className="bc-homepage min-h-screen">
      <HomeHeader role="admin" links={NAV} />

      <section className="relative min-h-[640px] flex items-center overflow-hidden">
        <img src={`${IMG}/hero.jpg`} alt="" className="absolute inset-0 w-full h-full object-cover opacity-60" />
        <div className="absolute inset-0 bg-gradient-to-r from-[var(--navy-deep)] via-[var(--navy-deep)]/70 to-transparent" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-20 w-full">
          <div className="max-w-2xl">
            <h1 className="text-4xl md:text-6xl font-bold italic uppercase leading-tight">
              Beast Cricket<br /><span className="text-[var(--gold)]">Admin Portal</span>
            </h1>
            <p className="mt-5 text-lg text-white/90 max-w-md">Manage Users, Packages<br />Analytics & Platform Settings</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/dashboard/admin" className="btn-gold btn-gold-hover px-6 py-3 text-sm inline-flex items-center gap-2">Go to Admin Dashboard →</Link>
              <a href="#dashboard" className="btn-outline-gold px-6 py-3 text-sm">View Overview</a>
            </div>
          </div>
        </div>
      </section>

      <section className="relative -mt-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="card-navy px-6 py-6 grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { icon: Users, k: '10,000+', v: 'Total Users' },
            { icon: Package, k: '500+', v: 'Active Packages' },
            { icon: Activity, k: '1,000+', v: 'Auctions Hosted' },
            { icon: Globe, k: '24/7', v: 'System Uptime' },
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

      <section id="dashboard" className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionTitle>Admin Dashboard Overview</SectionTitle>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {[
            { i: Users, t: 'User Management', d: 'Manage all platform users' },
            { i: Package, t: 'Package Management', d: 'Configure subscription plans' },
            { i: FileBarChart, t: 'Reports', d: 'View detailed reports' },
            { i: TrendingUp, t: 'Analytics', d: 'Platform usage analytics' },
            { i: Settings, t: 'System Settings', d: 'Configure platform settings' },
            { i: Activity, t: 'Activity Log', d: 'Track system activities' },
          ].map((s, idx) => (
            <div key={s.t} className="card-navy p-4 text-center relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-7 h-7 rounded-full bg-[var(--gold)] text-[var(--navy-deep)] text-xs font-bold flex items-center justify-center">{idx + 1}</div>
              <s.i className="w-8 h-8 text-[var(--gold)] mx-auto mt-3" />
              <div className="mt-2 text-sm font-semibold">{s.t}</div>
              <div className="text-xs text-white/60 mt-1">{s.d}</div>
            </div>
          ))}
        </div>
      </section>

      <section id="users" className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionTitle>User Management</SectionTitle>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { t: 'Organizers', d: 'Manage organizer accounts and permissions', img: `${IMG}/organizers.png` },
            { t: 'Team Owners', d: 'View and manage team owner accounts', img: `${IMG}/team-owners.png` },
            { t: 'Viewers', d: 'Manage viewer accounts and access', img: `${IMG}/viewers.png` },
            { t: 'Admins', d: 'Manage admin access and roles', img: `${IMG}/admins.png` },
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

      <section id="analytics" className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionTitle>Analytics & Insights</SectionTitle>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            { i: TrendingUp, t: 'User Growth', d: 'Track user registration trends' },
            { i: Activity, t: 'Platform Activity', d: 'Monitor real-time activity' },
            { i: Package, t: 'Revenue Analytics', d: 'Track subscription revenue' },
            { i: FileBarChart, t: 'Auction Statistics', d: 'Auction performance metrics' },
            { i: Database, t: 'Storage Usage', d: 'Monitor database storage' },
            { i: Globe, t: 'Geographic Data', d: 'User location analytics' },
          ].map((f) => (
            <div key={f.t} className="card-navy p-4 text-center">
              <f.i className="w-8 h-8 text-[var(--gold)] mx-auto mb-2" />
              <div className="text-sm font-semibold">{f.t}</div>
              <div className="text-xs text-white/60 mt-1">{f.d}</div>
            </div>
          ))}
        </div>
      </section>

      <section id="reports" className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionTitle>System Reports</SectionTitle>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { t: 'User Activity Report', d: 'Comprehensive user activity logs and statistics', img: `${IMG}/user-activity.png` },
            { t: 'Revenue Report', d: 'Detailed revenue breakdown by packages and periods', img: `${IMG}/revenue.png` },
            { t: 'Auction Performance', d: 'Analysis of auction success rates and engagement', img: `${IMG}/auction-performance.png` },
            { t: 'System Health', d: 'Platform performance and system health metrics', img: `${IMG}/system-health.png` },
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
            { i: Shield, t: 'Secure Access', d: 'Role-based permissions' },
            { i: Lock, t: 'Data Protection', d: 'Encrypted user data' },
            { i: Activity, t: 'Real-Time Monitoring', d: 'Live system tracking' },
            { i: Headphones, t: 'Priority Support', d: 'Dedicated admin support' },
            { i: CheckCircle2, t: 'Automated Backups', d: 'Daily data backups' },
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
              <h3 className="text-xl font-bold uppercase">Admin Control Center</h3>
              <p className="text-sm text-white/60">Manage the entire Beast Cricket platform from here.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Link href="/dashboard/admin" className="btn-gold btn-gold-hover px-6 py-3 text-sm">Go to Admin Dashboard</Link>
          </div>
        </div>
      </section>

      <HomeFooter />
    </div>
  );
}
