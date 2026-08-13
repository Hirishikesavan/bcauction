'use client';
import React from 'react';
import { Lock, ChevronUp, CheckCircle, XCircle, Medal, Sparkles } from 'lucide-react';

// ── Package definitions (mirrors server/middleware/subscription.js) ───────────
export const PLAN_FEATURES: Record<string, Record<string, boolean>> = {
  starter: {
    rtm: false, feeCollection: false, pdfExport: false,
    excelExport: false, bulkImport: false, advancedAnalytics: false,
    auctionReplay: false, whatsappNotifications: false, squadReports: false,
    broadcastScreen: false, audienceScreen: false, customBranding: false,
    sponsorAds: false, aiFeatures: false, obsIntegration: false,
    youtubeLive: false, zoomIntegration: false, teamPoster: false,
    premiumPDF: false, socialPosters: false,
  },
  pro: {
    rtm: true, feeCollection: true, pdfExport: true,
    excelExport: true, bulkImport: true, advancedAnalytics: true,
    auctionReplay: true, whatsappNotifications: true, squadReports: true,
    broadcastScreen: false, audienceScreen: false, customBranding: false,
    sponsorAds: false, aiFeatures: false, obsIntegration: false,
    youtubeLive: false, zoomIntegration: false, teamPoster: false,
    premiumPDF: false, socialPosters: false,
  },
  elite: {
    rtm: true, feeCollection: true, pdfExport: true,
    excelExport: true, bulkImport: true, advancedAnalytics: true,
    auctionReplay: true, whatsappNotifications: true, squadReports: true,
    broadcastScreen: true, audienceScreen: true, customBranding: true,
    sponsorAds: true, aiFeatures: true, obsIntegration: true,
    youtubeLive: true, zoomIntegration: true, teamPoster: true,
    premiumPDF: true, socialPosters: true,
  },
};

const ELITE_ONLY = new Set([
  'broadcastScreen','audienceScreen','customBranding','sponsorAds','aiFeatures',
  'obsIntegration','youtubeLive','zoomIntegration','teamPoster','premiumPDF','socialPosters',
]);

export const requiredPlanFor = (feature: string) =>
  ELITE_ONLY.has(feature) ? 'Elite' : 'Pro';

const PKG_COLORS: Record<string, string> = {
  starter: '#60a5fa',
  pro:     '#f59e0b',
  elite:   '#a78bfa',
};
const PKG_NAMES: Record<string, string> = {
  starter: 'Starter',
  pro:     'Pro',
  elite:   'Elite',
};

// ── Readable feature labels ───────────────────────────────────
const FEATURE_LABELS: Record<string, string> = {
  rtm: 'Right to Match (RTM)',
  feeCollection: 'Team Registration Fees',
  pdfExport: 'PDF Export',
  excelExport: 'Excel Export',
  bulkImport: 'Bulk Player Import',
  advancedAnalytics: 'Advanced Analytics',
  auctionReplay: 'Auction Replay',
  whatsappNotifications: 'WhatsApp Notifications',
  squadReports: 'Squad Reports',
  broadcastScreen: 'Broadcast Screen',
  audienceScreen: 'Audience Screen',
  customBranding: 'Custom Branding',
  sponsorAds: 'Sponsor Ads',
  aiFeatures: 'AI Assistant',
  obsIntegration: 'OBS Integration',
  youtubeLive: 'YouTube Live',
  zoomIntegration: 'Zoom Integration',
  teamPoster: 'Team Poster',
  premiumPDF: 'Premium PDF',
  socialPosters: 'Social Media Posters',
};

// ── PackageBanner: shows at top of organizer dashboard on login ───────────────
interface PackageBannerProps {
  orgPackage: any;      // the OrganizerPackage document
  onUpgrade: () => void;
  onDismiss?: () => void;
}

export function PackageBanner({ orgPackage, onUpgrade, onDismiss }: PackageBannerProps) {
  // Admin bypass - don't show package banner for admins
  if (typeof window !== 'undefined') {
    const userRole = localStorage.getItem('pending_role');
    if (userRole === 'admin') return null;
  }
  if (!orgPackage) return null;
  const pkgType = (orgPackage.packageType || 'starter') as string;
  const plan = PLAN_FEATURES[pkgType] || PLAN_FEATURES.starter;
  const color = PKG_COLORS[pkgType] || '#60a5fa';
  const name  = PKG_NAMES[pkgType] || 'Starter';

  const available = Object.entries(FEATURE_LABELS)
    .filter(([k]) => plan[k])
    .map(([, v]) => v);
  const locked = Object.entries(FEATURE_LABELS)
    .filter(([k]) => !plan[k])
    .map(([, v]) => v);

  const nextPlan = pkgType === 'starter' ? 'Pro' : pkgType === 'pro' ? 'Elite' : null;

  return (
    <div
      role="status"
      aria-label={`${name} Package Banner`}
      style={{ background: `${color}10`, border: `1px solid ${color}30` }}
      className="rounded-2xl p-5 mb-5 relative"
    >
      {onDismiss && (
        <button
          onClick={onDismiss}
          aria-label="Dismiss banner"
          className="absolute top-3 right-3 text-muted-foreground hover:text-foreground text-xs"
        >×</button>
      )}
      <div className="flex items-center gap-3 mb-3">
        <Medal size={22} style={{ color }} aria-hidden="true" />
        <div>
          <span className="font-heading text-sm uppercase tracking-wider" style={{ color }}>
            {name} Plan Active
          </span>
          <span className="ml-2 text-xs text-muted-foreground font-display">
            {orgPackage.auctionsAllowed >= 999
              ? 'Unlimited auctions'
              : `${Math.max(0, orgPackage.auctionsAllowed - (orgPackage.auctionsUsed || 0))} auctions remaining`}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
        <div>
          <div className="text-green-400 font-heading uppercase tracking-widest mb-1.5 flex items-center gap-1">
            <CheckCircle size={11} aria-hidden="true" /> Available Features
          </div>
          <ul className="space-y-0.5 text-muted-foreground font-display">
            {available.slice(0, 8).map(f => (
              <li key={f} className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" />
                {f}
              </li>
            ))}
            {available.length > 8 && (
              <li className="text-muted-foreground/60">+{available.length - 8} more…</li>
            )}
          </ul>
        </div>
        {locked.length > 0 && (
          <div>
            <div className="text-muted-foreground font-heading uppercase tracking-widest mb-1.5 flex items-center gap-1">
              <XCircle size={11} aria-hidden="true" /> Locked Features
            </div>
            <ul className="space-y-0.5 text-muted-foreground/60 font-display">
              {locked.slice(0, 6).map(f => (
                <li key={f} className="flex items-center gap-1.5">
                  <Lock size={9} aria-hidden="true" className="flex-shrink-0" />
                  {f}
                </li>
              ))}
              {locked.length > 6 && (
                <li className="text-muted-foreground/40">+{locked.length - 6} more…</li>
              )}
            </ul>
          </div>
        )}
      </div>

      {nextPlan && (
        <div className="mt-4 flex items-center justify-between">
          <span className="text-xs text-muted-foreground font-display">
            Upgrade to <strong>{nextPlan}</strong> to unlock more features
          </span>
          <button
            onClick={onUpgrade}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-heading uppercase tracking-wider border transition-all hover:scale-[1.02]"
            style={{ borderColor: color, color, background: `${color}15` }}
          >
            <ChevronUp size={12} aria-hidden="true" /> Upgrade to {nextPlan}
          </button>
        </div>
      )}
      {!nextPlan && (
        <div className="mt-3 flex items-center gap-2 text-xs text-purple-400 font-display">
          <Sparkles size={12} aria-hidden="true" />
          You have access to every feature — Elite plan active!
        </div>
      )}
    </div>
  );
}

// ── AuctionPackageNotice: shown inside Create/Edit Auction workflow ────────────
interface AuctionPackageNoticeProps {
  pkgType: string | undefined;
  onUpgrade: () => void;
}

export function AuctionPackageNotice({ pkgType, onUpgrade }: AuctionPackageNoticeProps) {
  if (!pkgType) return null;
  const color = PKG_COLORS[pkgType] || '#60a5fa';
  const name  = PKG_NAMES[pkgType] || 'Starter';

  const notices: Record<string, string[]> = {
    starter: [
      'Basic auction with up to 3 auctions/year',
      'Up to 20 teams and 300 players',
      'Live bidding and squad management',
      'Pro/Elite features like Broadcast, Reports, AI are locked',
    ],
    pro: [
      'Up to 15 auctions/year · Unlimited teams & players',
      'Excel export, PDF reports, Bulk import',
      'WhatsApp notifications and RTM',
      'Elite features like Broadcast and AI are locked',
    ],
    elite: [
      'Unlimited auctions · All features enabled',
      'Broadcast Screen, AI Assistant, Sponsor Ads',
      'OBS/YouTube/Zoom streaming, Social Posters',
      'Full analytics and custom branding',
    ],
  };

  const lines = notices[pkgType] || notices.starter;

  return (
    <div
      style={{ background: `${color}08`, border: `1px solid ${color}25` }}
      className="rounded-xl p-3 mb-4"
      role="note"
      aria-label={`You are using the ${name} Package`}
    >
      <div className="flex items-center gap-2 mb-2">
        <Medal size={14} style={{ color }} aria-hidden="true" />
        <span className="text-xs font-heading uppercase tracking-wider" style={{ color }}>
          You are using the {name} Package
        </span>
      </div>
      <ul className="text-[11px] text-muted-foreground font-display space-y-1">
        {lines.map((l, i) => (
          <li key={i} className="flex items-start gap-1.5">
            <span className="mt-0.5 w-1 h-1 rounded-full flex-shrink-0" style={{ background: color }} />
            {l}
          </li>
        ))}
      </ul>
      {pkgType !== 'elite' && (
        <button
          onClick={onUpgrade}
          className="mt-2.5 text-[10px] font-heading uppercase tracking-wider flex items-center gap-1 hover:underline"
          style={{ color }}
        >
          <ChevronUp size={10} aria-hidden="true" />
          Upgrade for more features
        </button>
      )}
    </div>
  );
}

// ── LockedFeatureOverlay: wrap any section that's locked ──────────────────────
interface LockedFeatureProps {
  feature: string;
  pkgType: string | undefined;
  onUpgrade: () => void;
  children?: React.ReactNode;
}

export function LockedFeatureOverlay({ feature, pkgType, onUpgrade, children }: LockedFeatureProps) {
  // Admin bypass - admins have access to all features
  if (typeof window !== 'undefined') {
    const userRole = localStorage.getItem('pending_role');
    if (userRole === 'admin') return <>{children}</>;
  }
  
  const plan = PLAN_FEATURES[pkgType || 'starter'] || PLAN_FEATURES.starter;
  if (plan[feature]) return <>{children}</>;          // not locked — render normally

  const needed = requiredPlanFor(feature);
  const label  = FEATURE_LABELS[feature] || feature;

  return (
    <div className="relative rounded-xl overflow-hidden">
      <div className="opacity-30 pointer-events-none select-none" aria-hidden="true">
        {children}
      </div>
      <div
        className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-xl"
        style={{ background: 'rgba(4,4,10,0.82)', backdropFilter: 'blur(2px)' }}
      >
        <Lock size={28} className="text-yellow-400" aria-hidden="true" />
        <div className="text-center px-4">
          <p className="font-heading text-sm uppercase tracking-wider text-white mb-1">{label} Locked</p>
          <p className="text-xs text-slate-400 font-display">
            This feature is available only in the{' '}
            <strong className="text-yellow-400">{needed}</strong> or Elite package.
          </p>
        </div>
        <button
          onClick={onUpgrade}
          className="px-4 py-2 rounded-lg text-xs font-heading uppercase tracking-wider bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 hover:bg-yellow-500/30 transition-all"
          aria-label={`Upgrade to ${needed} to unlock ${label}`}
        >
          <ChevronUp size={11} className="inline mr-1" aria-hidden="true" />
          Upgrade to {needed}
        </button>
      </div>
    </div>
  );
}
