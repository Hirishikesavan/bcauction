'use client';
import { useState, useId } from 'react';
import { Info } from 'lucide-react';

/**
 * Small "i" icon that shows a contextual explanation on hover (desktop) or
 * tap (mobile) without needing to open the full Guided Assistant panel.
 * Use next to any field/button whose purpose, consequence, or best
 * practice isn't obvious from its label alone — e.g. "this can't be
 * changed once teams join" warnings.
 *
 * Usage: <InfoTip text="Bid increment can't be changed once teams join." />
 */
export default function InfoTip({ text, side = 'top' }: { text: string; side?: 'top' | 'bottom' }) {
  const [show, setShow] = useState(false);
  const id = useId();

  return (
    <span className="relative inline-flex items-center" style={{ verticalAlign: 'middle' }}>
      <button
        type="button"
        aria-describedby={id}
        aria-label="More information"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShow(s => !s); }}
        className="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full text-muted-foreground hover:text-primary transition-colors"
      >
        <Info size={13} aria-hidden="true" />
      </button>
      {show && (
        <span
          id={id}
          role="tooltip"
          className={`absolute z-[300] left-1/2 -translate-x-1/2 ${side === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'} w-56 px-3 py-2 rounded-lg text-[11px] leading-relaxed font-display text-foreground shadow-xl border border-border/40`}
          style={{ background: 'hsl(222 40% 12%)' }}
        >
          {text}
        </span>
      )}
    </span>
  );
}
