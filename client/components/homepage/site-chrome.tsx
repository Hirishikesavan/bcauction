'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { Menu, X } from 'lucide-react';
import { TermsModal } from '@/components/beast/TermsModal';

type Role = 'organizer' | 'team-owner' | 'admin' | 'viewer';

const DASHBOARD_PATH: Record<Role, string> = {
  organizer: '/dashboard/organizer',
  'team-owner': '/dashboard/team-owner',
  admin: '/dashboard/admin',
  viewer: '/dashboard/viewer',
};

const HOME_PATH: Record<Role, string> = {
  organizer: '/organizer-home',
  'team-owner': '/team-owner-home',
  admin: '/admin-home',
  viewer: '/viewer-home',
};

export function HomeHeader({
  role,
  links,
}: {
  role: Role;
  links: { label: string; hash: string }[];
}) {
  const pathname = usePathname();
  const home = HOME_PATH[role];
  const dashboard = DASHBOARD_PATH[role];
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="absolute top-0 left-0 right-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between gap-4">
        <Link href={home} className="flex items-center gap-2 shrink-0">
          <img
            src="/homepage/shared/logo.png"
            alt="Beast Cricket logo"
            className="h-14 w-auto drop-shadow-[0_2px_10px_rgba(0,0,0,0.6)]"
          />
        </Link>
        <nav className="hidden lg:flex items-center gap-7 text-sm font-semibold tracking-wide">
          <a
            href={home}
            className={`uppercase ${pathname === home ? 'text-[var(--gold)] border-b-2 border-[var(--gold)] pb-1' : 'text-white/90 hover:text-[var(--gold)]'}`}
          >
            Home
          </a>
          {links.map((l) => (
            <a key={l.hash} href={`${home}${l.hash}`} className="uppercase text-white/90 hover:text-[var(--gold)] transition">
              {l.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <Link href={dashboard} className="btn-gold btn-gold-hover px-5 py-2 text-sm">
            Dashboard
          </Link>
          <button className="lg:hidden text-white" onClick={() => setMobileOpen((v) => !v)} aria-label="Menu">
            {mobileOpen ? <X /> : <Menu />}
          </button>
        </div>
      </div>
      {mobileOpen && (
        <div className="lg:hidden card-navy mx-4 p-4 space-y-2">
          <a href={home} className="block py-2 font-semibold uppercase text-sm">Home</a>
          {links.map((l) => (
            <a
              key={l.hash}
              href={`${home}${l.hash}`}
              className="block py-2 font-semibold uppercase text-sm"
              onClick={() => setMobileOpen(false)}
            >
              {l.label}
            </a>
          ))}
          <Link href={dashboard} className="btn-gold w-full py-2 text-sm justify-center">
            Dashboard
          </Link>
        </div>
      )}
    </header>
  );
}

export function HomeFooter() {
  return (
    <footer className="mt-16 border-t border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 grid grid-cols-2 md:grid-cols-5 gap-8 text-sm">
        <div className="col-span-2">
          <img src="/homepage/shared/logo.png" alt="Beast Cricket" className="h-12 w-auto mb-3" />
          <p className="text-white/60 max-w-xs">
            Beast Cricket is the most advanced cricket auction platform for organizers &amp; team owners.
          </p>
        </div>
        <div>
          <h4 className="text-[var(--gold)] font-bold mb-3 uppercase text-xs">Platform</h4>
          <ul className="space-y-2 text-white/60">
            <li><a href="#features">Features</a></li>
            <li><a href="#how">How It Works</a></li>
            <li><a href="#">Auction Rules</a></li>
            <li><a href="#">Security</a></li>
          </ul>
        </div>
        <div>
          <h4 className="text-[var(--gold)] font-bold mb-3 uppercase text-xs">Legal</h4>
          <ul className="space-y-2 text-white/60">
            <li>
              <TermsModal trigger={<span className="hover:text-[var(--gold)] transition cursor-pointer">Terms &amp; Conditions</span>} />
            </li>
          </ul>
        </div>
        <div>
          <h4 className="text-[var(--gold)] font-bold mb-3 uppercase text-xs">Contact</h4>
          <ul className="space-y-2 text-white/60">
            <li>beastcricketofficialauction@gmail.com</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10 py-4 text-center text-xs text-white/60">
        © 2026 Beast Cricket. All Rights Reserved.
      </div>
    </footer>
  );
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center justify-center gap-4 mb-10">
      <span className="h-px w-10 bg-[var(--gold)]/60" />
      <h2 className="text-2xl md:text-3xl font-bold tracking-wide text-white text-center uppercase">{children}</h2>
      <span className="h-px w-10 bg-[var(--gold)]/60" />
    </div>
  );
}
