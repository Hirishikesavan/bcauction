'use client';
import { useEffect } from 'react';
import { ArrowRight, Sparkles, PartyPopper } from 'lucide-react';
import { useGuide } from '@/lib/GuideContext';

/**
 * Drop this at the top of any dashboard. It reads the SAME live signals the
 * Guided Assistant uses (real backend data — package/auction/players/teams/
 * etc, depending on role) and surfaces the next thing the user should
 * actually do, or a "you're all caught up" state if every detectable step
 * is done. Never shown if the role has no guide steps, or while signals are
 * still loading (avoids flashing a wrong suggestion).
 */
export default function NextStepBanner() {
  const g = useGuide();

  useEffect(() => {
    if (g.role) g.refreshSignals();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [g.role]);

  if (!g.role || !g.steps.length || g.loadingSignals) return null;

  if (!g.nextAction) {
    return (
      <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-green-500/25 bg-green-500/5 mb-4">
        <PartyPopper size={15} className="text-green-400 flex-shrink-0" aria-hidden="true" />
        <p className="text-xs font-display text-foreground">You're all caught up — every step the assistant can detect is done.</p>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl border border-primary/25 bg-primary/5 mb-4 flex-wrap">
      <div className="flex items-center gap-2 min-w-0">
        <Sparkles size={15} className="text-primary flex-shrink-0" aria-hidden="true" />
        <p className="text-xs font-display text-foreground truncate">
          <span className="text-muted-foreground">Next up:</span> {g.nextAction.title}
        </p>
      </div>
      {g.nextAction.href && (
        <button
          onClick={() => g.goTo(g.nextAction!.href)}
          className="flex items-center gap-1 text-[11px] font-heading uppercase tracking-wider text-primary hover:underline flex-shrink-0"
        >
          Go <ArrowRight size={12} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
