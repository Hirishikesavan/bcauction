'use client';
import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Search, ChevronRight, BookOpen, Wrench, ListChecks, LayoutGrid, Keyboard, HelpCircle, Check, X, TriangleAlert,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';
import BackButton from '@/components/shared/BackButton';
import { FAQS, FEATURE_DOCS, TROUBLESHOOTING, KEYBOARD_SHORTCUTS, STEPS_BY_ROLE } from '@/lib/guideSteps';

type TabId = 'faq' | 'features' | 'troubleshooting' | 'tutorials' | 'packages' | 'shortcuts';

const TABS: { id: TabId; label: string; icon: any }[] = [
  { id: 'faq', label: 'FAQ', icon: HelpCircle },
  { id: 'features', label: 'Feature Docs', icon: BookOpen },
  { id: 'troubleshooting', label: 'Troubleshooting', icon: Wrench },
  { id: 'tutorials', label: 'Workflow Tutorials', icon: ListChecks },
  { id: 'packages', label: 'Package Comparison', icon: LayoutGrid },
  { id: 'shortcuts', label: 'Keyboard Shortcuts', icon: Keyboard },
];

export default function HelpCenterPage() {
  const { user } = useAuth();
  const role = user?.role || null;
  const [tab, setTab] = useState<TabId>('faq');
  const [query, setQuery] = useState('');
  const [plans, setPlans] = useState<any[]>([]);
  const [plansLoading, setPlansLoading] = useState(false);

  useEffect(() => {
    if (tab !== 'packages' || plans.length) return;
    setPlansLoading(true);
    // Real package data, fetched live from the same endpoint the pricing/
    // package-purchase pages use — never duplicated/hardcoded here.
    api.get('/packages/plans')
      .then(res => setPlans(res.data?.packages || []))
      .catch(() => setPlans([]))
      .finally(() => setPlansLoading(false));
  }, [tab, plans.length]);

  const q = query.trim().toLowerCase();

  const filteredFaqs = useMemo(() => FAQS.filter(f =>
    (!role || f.roles.includes(role)) &&
    (!q || f.question.toLowerCase().includes(q) || f.answer.toLowerCase().includes(q) || f.tags.some(t => t.includes(q)))
  ), [role, q]);

  const filteredFeatures = useMemo(() => FEATURE_DOCS.filter(f =>
    (!role || f.roles.includes(role)) &&
    (!q || f.title.toLowerCase().includes(q) || f.body.toLowerCase().includes(q) || f.tags.some(t => t.includes(q)))
  ), [role, q]);

  const filteredTroubleshooting = useMemo(() => TROUBLESHOOTING.filter(t =>
    (!role || t.roles.includes(role)) &&
    (!q || t.problem.toLowerCase().includes(q) || t.solution.toLowerCase().includes(q) || t.tags.some(tag => tag.includes(q)))
  ), [role, q]);

  const tutorialSteps = role && STEPS_BY_ROLE[role] ? STEPS_BY_ROLE[role] : [];

  // Cross-content search count, shown next to the search box so people know
  // whether to switch tabs to find more results.
  const totalMatches = q
    ? filteredFaqs.length + filteredFeatures.length + filteredTroubleshooting.length
    : null;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="mb-4"><BackButton href="/" label="Home" /></div>

        <div className="mb-6">
          <h1 className="font-heading text-3xl uppercase tracking-[0.1em] text-foreground mb-1">Help Center</h1>
          <p className="font-display text-muted-foreground text-sm">
            FAQ, feature documentation, troubleshooting, workflow tutorials, package comparison, and keyboard shortcuts
            {role && <> — tailored to your role (<span className="text-foreground">{role.replace('_', ' ')}</span>)</>}.
          </p>
        </div>

        {/* Search */}
        <div className="relative mb-5">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search FAQ, feature docs, troubleshooting…"
            className="w-full pl-10 pr-3 py-3 rounded-xl text-sm bg-secondary/30 border border-border/40 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/40"
          />
          {totalMatches !== null && (
            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[10px] font-heading uppercase tracking-wider text-muted-foreground">
              {totalMatches} match{totalMatches === 1 ? '' : 'es'}
            </span>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1.5 mb-6 overflow-x-auto pb-1">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-heading uppercase tracking-wider whitespace-nowrap transition-all ${
                tab === t.id ? 'bg-primary/15 text-primary border border-primary/30' : 'text-muted-foreground border border-transparent hover:bg-secondary/30'
              }`}>
              <t.icon size={14} aria-hidden="true" /> {t.label}
            </button>
          ))}
        </div>

        {/* FAQ */}
        {tab === 'faq' && (
          <div className="space-y-2">
            {filteredFaqs.length === 0 && <EmptyState text="No matching FAQ entries." />}
            {filteredFaqs.map(f => (
              <details key={f.id} className="group rounded-xl border border-border/30 px-4 py-3">
                <summary className="text-sm font-display font-semibold text-foreground cursor-pointer list-none flex items-center justify-between gap-2">
                  {f.question}
                  <ChevronRight size={14} className="text-muted-foreground flex-shrink-0 transition-transform group-open:rotate-90" aria-hidden="true" />
                </summary>
                <p className="text-muted-foreground text-sm font-display mt-2 leading-relaxed">{f.answer}</p>
              </details>
            ))}
          </div>
        )}

        {/* Feature Docs */}
        {tab === 'features' && (
          <div className="grid sm:grid-cols-2 gap-3">
            {filteredFeatures.length === 0 && <EmptyState text="No matching feature docs." />}
            {filteredFeatures.map(f => (
              <div key={f.id} className="rounded-xl border border-border/30 px-4 py-3.5">
                <h3 className="text-sm font-heading uppercase tracking-wider text-foreground mb-1.5">{f.title}</h3>
                <p className="text-muted-foreground text-xs font-display leading-relaxed">{f.body}</p>
              </div>
            ))}
          </div>
        )}

        {/* Troubleshooting */}
        {tab === 'troubleshooting' && (
          <div className="space-y-2">
            {filteredTroubleshooting.length === 0 && <EmptyState text="No matching troubleshooting entries." />}
            {filteredTroubleshooting.map(t => (
              <div key={t.id} className="rounded-xl border border-border/30 px-4 py-3.5">
                <p className="text-sm font-display font-semibold text-foreground mb-1.5 flex items-center gap-1"><TriangleAlert size={14} className="text-yellow-400 flex-shrink-0" />{t.problem}</p>
                <p className="text-muted-foreground text-xs font-display leading-relaxed">{t.solution}</p>
              </div>
            ))}
          </div>
        )}

        {/* Workflow Tutorials — reuses the exact same step content the
            Guided Assistant uses, so the tutorial never drifts out of sync
            with what the floating assistant actually shows. */}
        {tab === 'tutorials' && (
          <div>
            {!role && <EmptyState text="Log in to see your role's step-by-step workflow tutorial." />}
            {role && tutorialSteps.length === 0 && <EmptyState text="No tutorial available for this role yet." />}
            {role && tutorialSteps.length > 0 && (
              <ol className="space-y-2">
                {tutorialSteps.map((s, i) => (
                  <li key={s.id} className="flex gap-3 rounded-xl border border-border/30 px-4 py-3.5">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-heading flex items-center justify-center">{i + 1}</span>
                    <div className="min-w-0">
                      <p className="text-sm font-display font-semibold text-foreground">{s.title}</p>
                      <p className="text-muted-foreground text-xs font-display mt-0.5 leading-relaxed">{s.body}</p>
                      {s.href && (
                        <Link href={s.href} className="inline-block mt-1.5 text-[11px] font-heading uppercase tracking-wider text-primary hover:underline">Take me there →</Link>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>
        )}

        {/* Package Comparison — live data from /packages/plans */}
        {tab === 'packages' && (
          <div>
            {plansLoading && <EmptyState text="Loading packages…" />}
            {!plansLoading && plans.length === 0 && <EmptyState text="Couldn't load package data right now." />}
            {!plansLoading && plans.length > 0 && (
              <div className="grid sm:grid-cols-3 gap-4">
                {plans.map((p: any) => (
                  <div key={p.key} className="rounded-xl border px-4 py-4" style={{ borderColor: (p.color || '#888') + '40', background: (p.color || '#888') + '08' }}>
                    <div className="flex items-center gap-1.5 mb-1">
                      <span>{p.emoji}</span>
                      <h3 className="text-sm font-heading uppercase tracking-wider text-foreground">{p.name}</h3>
                    </div>
                    <p className="text-lg font-heading text-foreground mb-2">₹{(p.price / 100).toLocaleString('en-IN')}<span className="text-xs text-muted-foreground font-display"> /{p.validityDays}d</span></p>
                    <ul className="space-y-1">
                      {(p.features || []).map((feat: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-1.5 text-xs font-display text-muted-foreground">
                          <Check size={12} className="text-green-400 flex-shrink-0 mt-0.5" aria-hidden="true" /> {feat}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Keyboard Shortcuts — only real, implemented shortcuts */}
        {tab === 'shortcuts' && (
          <div className="space-y-2">
            {KEYBOARD_SHORTCUTS.map((s, i) => (
              <div key={i} className="flex items-center gap-3 rounded-xl border border-border/30 px-4 py-3">
                <kbd className="px-2.5 py-1 rounded-md text-xs font-heading bg-secondary/40 border border-border/40 text-foreground flex-shrink-0">{s.keys}</kbd>
                <span className="text-xs font-display text-muted-foreground">{s.description}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2 px-4 py-6 rounded-xl border border-dashed border-border/30 text-muted-foreground text-sm font-display justify-center">
      <X size={14} aria-hidden="true" /> {text}
    </div>
  );
}
