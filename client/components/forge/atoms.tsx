'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';

/* ── Slow-motion gold ember field ── */
export function Embers({ count = 46, className = '' }: { count?: number; className?: string }) {
  const embers = Array.from({ length: count }, (_, i) => {
    const seed = (i * 9301 + 49297) % 233280;
    const r = seed / 233280;
    return {
      left: `${(r * 100).toFixed(2)}%`,
      size: 1 + ((i * 7) % 4),
      delay: `${-(r * 24).toFixed(2)}s`,
      duration: `${16 + ((i * 5) % 18)}s`,
      drift: `${((i % 7) - 3) * 26}px`,
      opacity: 0.25 + (i % 5) / 8,
    };
  });

  return (
    <div aria-hidden className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}>
      {embers.map((e, i) => (
        <span
          key={i}
          className="absolute bottom-[-10vh] rounded-full"
          style={{
            left: e.left,
            width: e.size,
            height: e.size,
            opacity: e.opacity,
            background: 'oklch(0.81 0.163 78)',
            filter: 'blur(0.4px)',
            boxShadow: '0 0 10px 2px rgba(220,170,50,0.4)',
            animation: `forge-ember-rise ${e.duration} linear ${e.delay} infinite`,
            ['--forge-drift' as string]: e.drift,
          }}
        />
      ))}
    </div>
  );
}

/* ── Scroll reveal ── */
export function Reveal({
  children,
  delay = 0,
  className = '',
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.12 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={className}
      style={
        shown
          ? { animation: `forge-rise-in 900ms cubic-bezier(.16,.84,.3,1) ${delay}ms both` }
          : { opacity: 0 }
      }
    >
      {children}
    </div>
  );
}

/* ── Section mark ── */
export function SectionMark({ index, label }: { index: string; label: string }) {
  return (
    <div className="mb-8 flex items-center gap-4">
      <span style={{ fontFamily: "'Barlow Semi Condensed', monospace", fontSize: '11px', letterSpacing: '0.5em', color: 'oklch(0.48 0.1 72)' }}>{index}</span>
      <span style={{ height: 1, width: 56, background: 'linear-gradient(to right, oklch(0.63 0.115 78), transparent)', display: 'block' }} />
      <span style={{ fontFamily: "'Barlow Semi Condensed', monospace", fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.42em', color: 'hsl(var(--muted-foreground))' }}>
        {label}
      </span>
    </div>
  );
}

/* ── Forge button (supports Next Link for internal, <a> for anchor) ── */
export function ForgeButton({
  children,
  variant = 'primary',
  href = '#',
}: {
  children: ReactNode;
  variant?: 'primary' | 'ghost';
  href?: string;
}) {
  const isInternal = href.startsWith('/');
  const base: React.CSSProperties = {
    position: 'relative',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    padding: '14px 36px',
    fontFamily: "'Barlow Semi Condensed', monospace",
    fontSize: '11px',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.32em',
    transition: 'all 0.5s',
    cursor: 'pointer',
    textDecoration: 'none',
  };

  if (variant === 'ghost') {
    const style: React.CSSProperties = {
      ...base,
      border: '1px solid rgba(200,170,80,0.4)',
      color: 'oklch(0.93 0.012 85)',
    };
    if (isInternal) {
      return (
        <Link href={href} style={style} className="forge-btn-ghost">
          {children}
        </Link>
      );
    }
    return <a href={href} style={style} className="forge-btn-ghost">{children}</a>;
  }

  const style: React.CSSProperties = {
    ...base,
    background: 'linear-gradient(180deg, oklch(0.16 0.006 70) 0%, oklch(0.09 0.004 70) 100%)',
    border: '1px solid rgba(200,160,50,0.55)',
    color: 'oklch(0.81 0.163 78)',
    boxShadow: '0 30px 80px -30px rgba(200,140,30,0.45)',
  };

  if (isInternal) {
    return (
      <Link href={href} style={style} className="forge-btn-primary">
        {children}
      </Link>
    );
  }
  return <a href={href} style={style} className="forge-btn-primary">{children}</a>;
}

/* ── Animated counting bid value ── */
export function useTicker(from: number, to: number, ms = 2400) {
  const [v, setV] = useState(from);
  useEffect(() => {
    const start = performance.now();
    let raf = 0;
    const step = (t: number) => {
      const p = Math.min(1, (t - start) / ms);
      setV(from + (to - from) * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [from, to, ms]);
  return v;
}
