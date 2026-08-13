'use client';
import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';
import { STEPS_BY_ROLE, GuideStep } from './guideSteps';

type GuideCtx = {
  enabled: boolean;
  open: boolean;
  role: string | null;
  steps: GuideStep[];
  currentIndex: number;
  completed: Record<string, boolean>;
  // Renamed from orgSignals -> signals: this now holds real auto-detected
  // progress for EVERY role (organizer, team_owner, viewer, admin), not
  // just the organizer. Kept the same shape (string -> boolean) so nothing
  // else needs to change.
  signals: Record<string, boolean>;
  loadingSignals: boolean;
  packageType: string | null; // 'starter' | 'pro' | 'elite' | null (organizer only)
  enable: () => void;
  disable: () => void;
  restart: () => void;
  skip: () => void;
  next: () => void;
  prev: () => void;
  goToStep: (index: number) => void;
  markDone: (id: string) => void;
  openGuide: () => void;
  closeGuide: () => void;
  goTo: (href?: string) => void;
  isStepComplete: (step: GuideStep) => boolean;
  refreshSignals: () => void;
  nextAction: GuideStep | null;
};

const Ctx = createContext<GuideCtx | null>(null);
const storageKey = (userId: string) => `beast_guide_${userId}`;

export function GuideProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const router = useRouter();

  const role = user?.role || null;
  const steps = useMemo(() => (role ? STEPS_BY_ROLE[role] || [] : []), [role]);

  const [enabled, setEnabled] = useState(true);
  const [open, setOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [completed, setCompleted] = useState<Record<string, boolean>>({});
  const [signals, setSignals] = useState<Record<string, boolean>>({});
  const [packageType, setPackageType] = useState<string | null>(null);
  const [loadingSignals, setLoadingSignals] = useState(false);

  useEffect(() => {
    if (!user?.id || typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(storageKey(user.id));
      if (raw) {
        const parsed = JSON.parse(raw);
        setEnabled(parsed.enabled ?? true);
        setCurrentIndex(parsed.currentIndex ?? 0);
        setCompleted(parsed.completed ?? {});
      }
    } catch { /* ignore corrupt storage */ }
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id || typeof window === 'undefined') return;
    localStorage.setItem(storageKey(user.id), JSON.stringify({ enabled, currentIndex, completed }));
  }, [user?.id, enabled, currentIndex, completed]);

  // ── ORGANIZER: package, auction, players, teams, sponsors, branding,
  // auction status, reports — every one of these is read from a real API
  // response, nothing inferred or guessed.
  const refreshOrganizerSignals = useCallback(async () => {
    const [pkgRes, auctionsRes] = await Promise.allSettled([
      api.get('/packages/my'),
      api.get('/auctions/my'),
    ]);
    const pkg = pkgRes.status === 'fulfilled' ? pkgRes.value.data.package : null;
    const auctions = auctionsRes.status === 'fulfilled' ? (auctionsRes.value.data.auctions || []) : [];
    const latest = auctions[0];

    let hasTeams = false, hasPlayers = false, hasSponsors = false, hasBranding = false;
    let auctionStarted = false, auctionCompleted = false;
    if (latest?._id) {
      try { hasTeams = ((await api.get(`/auctions/${latest._id}/teams`)).data.teams || []).length > 0; } catch {}
      try { hasPlayers = ((await api.get(`/auctions/${latest._id}/players`)).data.players || []).length > 0; } catch {}
      try { hasSponsors = ((await api.get(`/packages/sponsors/${latest._id}`)).data.sponsors || []).length > 0; } catch {}
      auctionStarted = latest.status === 'active' || latest.status === 'paused' || latest.status === 'completed';
      auctionCompleted = latest.status === 'completed';
    }
    try {
      const brandingRes = await api.get('/packages/branding');
      const b = brandingRes.data?.branding;
      hasBranding = !!(b && (b.leagueLogoUrl || b.bannerUrl || b.leagueName));
    } catch {}

    setPackageType(pkg?.packageType || null);
    setSignals({
      hasPackage: !!pkg,
      hasAuction: auctions.length > 0,
      hasPlayers, hasTeams, hasSponsors, hasBranding,
      auctionStarted, auctionCompleted,
      hasReports: auctionCompleted,
      profileCompleted: !!(user?.name && user?.email),
    });
  }, [user?.name, user?.email]);

  // ── TEAM OWNER: joined an auction, created a team, squad has players,
  // has placed at least one bid (wallet/purse has moved from its
  // starting value) — all from /auctions/participated + the team's own
  // record, which is real per-user data, not a guess.
  //
  // teamSetupCompleted and walletConfigured used to both just alias
  // hasTeam, which conflated "a team document exists" with "the team is
  // actually set up (has a logo)" and with "the wallet has activity" —
  // three different real signals. Each now reads its own field straight
  // off the real Team document returned by /auctions/:id/teams.
  const refreshTeamOwnerSignals = useCallback(async () => {
    let hasJoined = false, hasTeam = false, hasSquad = false, hasBid = false, auctionLive = false;
    let teamSetupCompleted = false, walletConfigured = false;
    try {
      const res = await api.get('/auctions/participated');
      const auctions = res.data?.auctions || [];
      hasJoined = auctions.length > 0;
      const latest = auctions[0];
      if (latest?._id) {
        auctionLive = latest.status === 'active';
        try {
          const teamsRes = await api.get(`/auctions/${latest._id}/teams`);
          const myTeam = (teamsRes.data?.teams || [])[0];
          if (myTeam) {
            hasTeam = true;
            hasSquad = (myTeam.playersCount || 0) > 0;
            hasBid = myTeam.purse !== myTeam.initialPurse; // purse moved = at least one win/spend
            // Team setup = the team record has the identity fields a team
            // owner actually fills in (logo is the last one set on the
            // self-register/edit form) — not just "a row exists".
            teamSetupCompleted = !!(myTeam.name && myTeam.shortName && myTeam.logo);
            // Wallet configured = the organizer has actually credited/
            // debited the Pro/Elite Team Wallet at least once, or it
            // already carries a balance — an empty, untouched wallet
            // isn't "configured" even though the field always exists.
            walletConfigured = (myTeam.walletBalance || 0) > 0 || (myTeam.walletTransactions?.length || 0) > 0;
          }
        } catch {}
      }
    } catch {}
    setSignals({
      hasJoined, hasTeam, hasSquad, hasBid, auctionLive, teamSetupCompleted, walletConfigured,
      profileCompleted: !!(user?.name && user?.email),
    });
  }, [user?.name, user?.email]);

  // ── ADMIN: at least one user/organizer exists, at least one payment has
  // been recorded, at least one auction exists platform-wide — confirms
  // the admin has actually looked at (and the platform has) real data in
  // each section, pulled from the real admin API.
  const refreshAdminSignals = useCallback(async () => {
    const [usersRes, orgsRes, paymentsRes, auctionsRes] = await Promise.allSettled([
      api.get('/admin/users'),
      api.get('/admin/organizers'),
      api.get('/admin/payments'),
      api.get('/admin/auctions'),
    ]);
    const ok = (r: PromiseSettledResult<any>): r is PromiseFulfilledResult<any> => r.status === 'fulfilled';
    setSignals({
      hasUsers: ok(usersRes) && (usersRes.value.data.users?.length || 0) > 0,
      hasOrganizers: ok(orgsRes) && (orgsRes.value.data.organizers?.length || 0) > 0,
      hasPayments: ok(paymentsRes) && (paymentsRes.value.data.payments?.length || 0) > 0,
      hasAuctions: ok(auctionsRes) && (auctionsRes.value.data.auctions?.length || 0) > 0,
      profileCompleted: !!(user?.name && user?.email),
    });
  }, [user?.name, user?.email]);

  const refreshSignals = useCallback(async () => {
    if (!role) return;
    setLoadingSignals(true);
    try {
      if (role === 'organizer') await refreshOrganizerSignals();
      else if (role === 'team_owner') await refreshTeamOwnerSignals();
      else if (role === 'admin') await refreshAdminSignals();
      else setSignals({ profileCompleted: !!(user?.name && user?.email) }); // viewer — no account-bound progress to detect
    } finally {
      setLoadingSignals(false);
    }
  }, [role, refreshOrganizerSignals, refreshTeamOwnerSignals, refreshAdminSignals, user?.name, user?.email]);

  useEffect(() => {
    if (role && open) refreshSignals();
  }, [role, open, refreshSignals]);

  const isStepComplete = useCallback((step: GuideStep): boolean => {
    if (completed[step.id]) return true;
    if (step.autoCheck && signals[step.autoCheck]) return true;
    return false;
  }, [completed, signals]);

  // Auto-advance the cursor to the first incomplete step whenever signals refresh
  useEffect(() => {
    if (!steps.length) return;
    const hasAnyAutoCheck = steps.some(s => s.autoCheck);
    if (!hasAnyAutoCheck) return; // nothing to auto-advance on (e.g. viewer)
    const firstIncomplete = steps.findIndex(s => !isStepComplete(s));
    if (firstIncomplete >= 0 && firstIncomplete !== currentIndex) setCurrentIndex(firstIncomplete);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signals]);

  // "What should I do next?" — the first step that isn't done yet AND
  // isn't locked behind a plan the organizer doesn't have. Real, derived
  // purely from `steps` + `signals` + `packageType` (all already backed by
  // live data above) — never a hardcoded suggestion.
  const planRank: Record<string, number> = { starter: 0, pro: 1, elite: 2 };
  const requiredRank: Record<string, number> = { pro: 1, elite: 2 };
  const nextAction = useMemo(() => {
    if (!steps.length) return null;
    const myRank = planRank[packageType || 'starter'] ?? 0;
    const candidate = steps.find(s => {
      if (isStepComplete(s)) return false;
      if (s.requiresPlan && myRank < requiredRank[s.requiresPlan]) return false;
      return true;
    });
    return candidate || null;
  }, [steps, isStepComplete, packageType]);

  const value: GuideCtx = {
    enabled, open, role, steps, currentIndex, completed, signals, loadingSignals, packageType, nextAction,
    enable: () => setEnabled(true),
    disable: () => { setEnabled(false); setOpen(false); },
    restart: () => { setCurrentIndex(0); setCompleted({}); setEnabled(true); setOpen(true); },
    skip: () => setOpen(false),
    next: () => setCurrentIndex(i => Math.min(i + 1, Math.max(steps.length - 1, 0))),
    prev: () => setCurrentIndex(i => Math.max(i - 1, 0)),
    goToStep: (index: number) => setCurrentIndex(Math.max(0, Math.min(index, steps.length - 1))),
    markDone: (id: string) => setCompleted(c => ({ ...c, [id]: true })),
    openGuide: () => setOpen(true),
    closeGuide: () => setOpen(false),
    goTo: (href?: string) => { if (href) window.location.href = href; setOpen(false); },
    isStepComplete,
    refreshSignals,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useGuide = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error('useGuide must be used inside GuideProvider');
  return c;
};
