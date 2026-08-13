'use client';
import { useState, useEffect } from 'react';
import { useGuide } from '@/lib/GuideContext';
import { HelpCircle, X, ChevronLeft, ChevronRight, RotateCcw, Power, CheckCircle2, Lock, ListChecks, Loader2, Search } from 'lucide-react';
import { FAQS } from '@/lib/guideSteps';

export default function GuideButton() {
  const g = useGuide();
  const [view, setView] = useState<'step' | 'overview' | 'help'>('step');
  const [faqQuery, setFaqQuery] = useState('');

  // Real, global keyboard shortcuts — documented in the Help Center.
  // "?" opens the assistant straight to the Help Center (ignored while
  // typing in an input/textarea so it doesn't hijack normal typing).
  // "Esc" closes the assistant panel if it's open.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
      if (e.key === '?' && !typing && g.role) {
        e.preventDefault();
        setView('help');
        g.openGuide();
      } else if (e.key === 'Escape' && g.open) {
        g.closeGuide();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [g.role, g.open]);

  if (!g.role) return null; // not logged in / no role yet — nothing to guide

  const step = g.steps[g.currentIndex];
  const totalDone = g.steps.filter(s => g.isStepComplete(s)).length;
  const progressPct = g.steps.length ? Math.round((totalDone / g.steps.length) * 100) : 0;
  const planRank: Record<string, number> = { starter: 0, pro: 1, elite: 2 };
  const requiredRank: Record<string, number> = { pro: 1, elite: 2 };
  // Real plan-aware lock check: a step requiring 'pro'/'elite' is genuinely
  // locked only if the organizer's ACTUAL detected plan doesn't cover it —
  // not just a label shown regardless of plan.
  const isLockedForPlan = (s: typeof step) => {
    if (!s?.requiresPlan) return false;
    const myRank = planRank[g.packageType || 'starter'] ?? 0;
    return myRank < requiredRank[s.requiresPlan];
  };

  const filteredFaqs = FAQS.filter(f =>
    (!g.role || f.roles.includes(g.role)) &&
    (!faqQuery.trim() || f.question.toLowerCase().includes(faqQuery.toLowerCase()) || f.tags.some(t => t.includes(faqQuery.toLowerCase())))
  );

  return (
    <>
      {/* Floating launcher */}
      {!g.open && g.enabled && (
        <button
          onClick={() => { setView('step'); g.openGuide(); }}
          aria-label="Open guided assistant"
          className="fixed bottom-5 right-5 z-[200] w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-105"
          style={{ background: 'linear-gradient(135deg,hsl(45,100%,51%),hsl(40,100%,38%))', boxShadow: '0 4px 24px hsla(45,100%,51%,0.4)' }}
        >
          <HelpCircle size={26} className="text-black" aria-hidden="true" />
          {g.role === 'organizer' && progressPct < 100 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center border-2 border-background">
              {Math.max(g.steps.length - totalDone, 0)}
            </span>
          )}
        </button>
      )}

      {!g.open && !g.enabled && (
        <button onClick={g.enable} aria-label="Enable guided assistant"
          className="fixed bottom-5 right-5 z-[200] w-10 h-10 rounded-full flex items-center justify-center border border-border bg-secondary/60 text-muted-foreground hover:text-foreground transition-all">
          <HelpCircle size={18} aria-hidden="true" />
        </button>
      )}

      {g.open && (
        <div className="fixed bottom-5 right-5 z-[200] w-[360px] max-w-[92vw] rounded-2xl overflow-hidden shadow-2xl border border-border/40"
          style={{ background: 'hsl(222 40% 9%)', maxHeight: '78vh', display: 'flex', flexDirection: 'column' }}>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/30" style={{ background: 'hsl(222 40% 12%)' }}>
            <div className="flex items-center gap-2">
              <HelpCircle size={18} className="text-primary" aria-hidden="true" />
              <span className="font-heading text-xs uppercase tracking-wider text-foreground">Guided Assistant</span>
            </div>
            <div className="flex items-center gap-1.5">
              <button onClick={() => setView(view === 'help' ? 'step' : 'help')} aria-label="Help center" title="Help Center / FAQ"
                className={`p-1.5 rounded-lg transition-all ${view === 'help' ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground'}`}>
                <Search size={15} aria-hidden="true" />
              </button>
              <button onClick={() => setView(view === 'overview' ? 'step' : 'overview')} aria-label="All steps" title="View all steps"
                className={`p-1.5 rounded-lg transition-all ${view === 'overview' ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground'}`}>
                <ListChecks size={15} aria-hidden="true" />
              </button>
              <button onClick={g.disable} aria-label="Disable guide" title="Turn off guide"
                className="p-1.5 rounded-lg text-muted-foreground hover:text-red-400 transition-all">
                <Power size={15} aria-hidden="true" />
              </button>
              <button onClick={g.closeGuide} aria-label="Close" className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground transition-all">
                <X size={15} aria-hidden="true" />
              </button>
            </div>
          </div>

          {/* Progress bar */}
          {g.steps.length > 0 && view !== 'help' && (
            <div className="px-4 pt-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-heading uppercase tracking-wider text-muted-foreground">{totalDone}/{g.steps.length} steps</span>
                {g.loadingSignals && <Loader2 size={11} className="animate-spin text-muted-foreground" aria-hidden="true" />}
              </div>
              <div className="h-1.5 rounded-full bg-secondary/40 overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${progressPct}%`, background: 'linear-gradient(90deg,hsl(45,100%,51%),hsl(40,100%,38%))' }} />
              </div>
            </div>
          )}

          <div className="px-4 py-3 overflow-y-auto flex-1">
            {/* ── STEP VIEW ── */}
            {view === 'step' && step && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  {g.isStepComplete(step) ? <CheckCircle2 size={16} className="text-green-400 flex-shrink-0" aria-hidden="true" /> : <span className="w-4 h-4 rounded-full border border-border flex-shrink-0" />}
                  <h3 className="font-heading text-sm uppercase tracking-wider text-foreground">{step.title}</h3>
                  {isLockedForPlan(step) && <Lock size={12} className="text-yellow-400 flex-shrink-0" aria-hidden="true" />}
                </div>
                <p className="text-muted-foreground text-sm font-display leading-relaxed mb-4">{step.body}</p>
                {isLockedForPlan(step) && (
                  <div className="mb-3 px-3 py-2.5 rounded-lg border border-yellow-500/30 bg-yellow-500/10">
                    <p className="text-yellow-400 text-xs font-display flex items-center gap-1.5 mb-1.5"><Lock size={11} aria-hidden="true" /> Not available on your current plan ({(g.packageType || 'starter').toUpperCase()})</p>
                    <p className="text-muted-foreground text-[11px] font-display mb-2">This feature needs {step.requiresPlan === 'elite' ? 'Elite' : 'Pro'} or higher to unlock.</p>
                    <button onClick={() => g.goTo('/dashboard/organizer?tab=package')} className="text-[11px] font-heading uppercase tracking-wider text-yellow-400 underline">Compare plans &amp; upgrade</button>
                  </div>
                )}
                <div className="flex gap-2 mb-3">
                  {step.href && (
                    <button onClick={() => g.goTo(step.href)} className="flex-1 py-2 rounded-lg text-xs font-heading uppercase tracking-wider bg-primary text-primary-foreground hover:scale-[1.02] transition-all">Take Me There</button>
                  )}
                  {!step.autoCheck && !g.isStepComplete(step) && (
                    <button onClick={() => g.markDone(step.id)} className="py-2 px-3 rounded-lg text-xs font-heading uppercase tracking-wider border border-green-500/40 text-green-400 hover:bg-green-500/10 transition-all">Mark Done</button>
                  )}
                </div>
              </div>
            )}
            {view === 'step' && !step && (
              <p className="text-muted-foreground text-sm font-display">No guide steps for this role yet.</p>
            )}

            {/* ── OVERVIEW VIEW ── */}
            {view === 'overview' && (
              <div className="space-y-1.5">
                {g.steps.map((s, i) => (
                  <button key={s.id} onClick={() => { g.goToStep(i); setView('step'); }}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-all ${i === g.currentIndex ? 'bg-primary/10 border border-primary/30' : 'hover:bg-secondary/30 border border-transparent'}`}>
                    {g.isStepComplete(s) ? <CheckCircle2 size={14} className="text-green-400 flex-shrink-0" aria-hidden="true" /> : <span className="w-3.5 h-3.5 rounded-full border border-border flex-shrink-0" />}
                    <span className="text-xs font-display text-foreground flex-1 truncate">{s.title}</span>
                    {s.requiresPlan && <Lock size={11} className="text-yellow-400 flex-shrink-0" aria-hidden="true" />}
                  </button>
                ))}
              </div>
            )}

            {/* ── HELP CENTER / FAQ VIEW ── */}
            {view === 'help' && (
              <div>
                <div className="relative mb-3">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                  <input value={faqQuery} onChange={e => setFaqQuery(e.target.value)} placeholder="Search help articles…"
                    className="w-full pl-9 pr-3 py-2 rounded-lg text-sm bg-secondary/30 border border-border/40 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/40" />
                </div>
                <div className="space-y-2">
                  {filteredFaqs.length === 0 && <p className="text-muted-foreground text-sm font-display">No matching help articles.</p>}
                  {filteredFaqs.map(f => (
                    <details key={f.id} className="group rounded-lg border border-border/30 px-3 py-2">
                      <summary className="text-xs font-display font-semibold text-foreground cursor-pointer list-none flex items-center justify-between">
                        {f.question}
                        <ChevronRight size={13} className="text-muted-foreground transition-transform group-open:rotate-90" aria-hidden="true" />
                      </summary>
                      <p className="text-muted-foreground text-xs font-display mt-2 leading-relaxed">{f.answer}</p>
                    </details>
                  ))}
                </div>
                <a href="/help" className="block mt-3 text-center text-[11px] font-heading uppercase tracking-wider text-primary hover:underline">
                  Open Full Help Center (feature docs, troubleshooting, tutorials, package comparison, shortcuts) →
                </a>
              </div>
            )}
          </div>

          {/* Footer nav — only in step view */}
          {view === 'step' && g.steps.length > 0 && (
            <div className="flex items-center justify-between px-4 py-2.5 border-t border-border/30" style={{ background: 'hsl(222 40% 12%)' }}>
              <button onClick={g.prev} disabled={g.currentIndex === 0} aria-label="Previous step"
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground disabled:opacity-30 transition-all"><ChevronLeft size={16} aria-hidden="true" /></button>
              <button onClick={g.restart} aria-label="Restart guide" title="Restart from the beginning"
                className="flex items-center gap-1 text-[10px] font-heading uppercase tracking-wider text-muted-foreground hover:text-foreground transition-all"><RotateCcw size={11} aria-hidden="true" /> Restart</button>
              <button onClick={g.next} disabled={g.currentIndex >= g.steps.length - 1} aria-label="Next step"
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground disabled:opacity-30 transition-all"><ChevronRight size={16} aria-hidden="true" /></button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
