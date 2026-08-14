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
// DISABLED: All features now unlocked - Beast Cricket operates as a free platform
interface PackageBannerProps {
  orgPackage: any;      // the OrganizerPackage document
  onUpgrade: () => void;
  onDismiss?: () => void;
}

export function PackageBanner({ orgPackage, onUpgrade, onDismiss }: PackageBannerProps) {
  // Package banner disabled - all features now unlocked
  return null;
}

// ── AuctionPackageNotice: shown inside Create/Edit Auction workflow ────────────
// DISABLED: All features now unlocked - Beast Cricket operates as a free platform
interface AuctionPackageNoticeProps {
  pkgType: string | undefined;
  onUpgrade: () => void;
}

export function AuctionPackageNotice({ pkgType, onUpgrade }: AuctionPackageNoticeProps) {
  // Package notice disabled - all features now unlocked
  return null;
}

// ── LockedFeatureOverlay: wrap any section that's locked ──────────────────────
// DISABLED: All features now unlocked - Beast Cricket operates as a free platform
interface LockedFeatureProps {
  feature: string;
  pkgType: string | undefined;
  onUpgrade: () => void;
  children?: React.ReactNode;
}

export function LockedFeatureOverlay({ feature, pkgType, onUpgrade, children }: LockedFeatureProps) {
  // Feature locks disabled - all features now unlocked
  return <>{children}</>;
}
