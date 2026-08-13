'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { Embers, ForgeButton, Reveal, SectionMark, useTicker } from './atoms';

/* ── shared CSS variable shorthands ── */
const goldFire = 'oklch(0.81 0.163 78)';
const goldAncient = 'oklch(0.63 0.115 78)';
const goldBurnished = 'oklch(0.48 0.1 72)';
const ember = 'oklch(0.66 0.213 42)';
const gradientMolten = `linear-gradient(135deg, ${goldBurnished} 0%, ${goldFire} 42%, ${goldAncient} 62%, ${ember} 100%)`;
const gradientMetal = 'linear-gradient(180deg, oklch(0.16 0.006 70) 0%, oklch(0.09 0.004 70) 100%)';
const gradientForge = 'radial-gradient(circle at 50% 100%, rgba(180,110,30,0.30) 0%, transparent 62%)';
const borderGold = '1px solid rgba(180,145,60,0.28)';
const glassBg = 'rgba(35,30,25,0.55)';

/* ── Arena Section ── */
export function Arena() {
  return (
    <section id="auctions" style={{ position: 'relative', overflow: 'hidden', borderTop: '1px solid rgba(180,145,60,0.18)' }}>
      <div style={{ position: 'relative', height: '86vh', minHeight: 560, width: '100%', overflow: 'hidden' }}>
        <Image
          src="/forge/arena.jpg"
          alt="Circular cricket auction arena in black marble and dark gold"
          fill
          style={{ objectFit: 'cover' }}
          loading="lazy"
          sizes="100vw"
        />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, hsl(var(--background)) 0%, rgba(0,0,0,0.45) 50%, rgba(0,0,0,0.85) 100%)' }} />
        <Embers count={30} />
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'flex-end' }}>
          <div style={{ margin: '0 auto', width: '100%', maxWidth: 1500, padding: '0 24px 96px' }}>
            <Reveal>
              <SectionMark index="02" label="The auction arena" />
              <h2 style={{ maxWidth: 900, fontSize: 'clamp(2.4rem, 6vw, 5.5rem)', lineHeight: 0.92, color: 'oklch(0.93 0.012 85)', fontFamily: "'Anton', system-ui, sans-serif" }}>
                A THEATRE BUILT FOR <span style={{ backgroundImage: gradientMolten, backgroundClip: 'text', WebkitBackgroundClip: 'text', color: 'transparent' }}>BILLION-RUPEE MOMENTS</span>
              </h2>
              <div style={{ marginTop: 40, display: 'grid', maxWidth: 900, gap: 32, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
                {[
                  ['CENTRE PODIUM', 'Black titanium, carbon fibre and brushed gold with the BEAST mark engraved into metal.'],
                  ['8K CURVED WALL', 'Player profile, live bid, franchise competition and statistics rendered broadcast-clean.'],
                  ['PRODUCTION FLOOR', 'Team cabins, media positions, VIP boxes and a full broadcast control chain.'],
                ].map(([t, d]) => (
                  <div key={t}>
                    <p style={{ fontFamily: "'Barlow Semi Condensed', monospace", fontSize: 11, letterSpacing: '0.3em', color: goldFire, marginBottom: 8 }}>{t}</p>
                    <p style={{ fontSize: 14, lineHeight: 1.7, color: 'hsl(var(--muted-foreground))' }}>{d}</p>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── Live Bidding Section ── */
const BIDDING_TEAMS = [
  { name: 'MUMBAI TITANS', bid: 14.5, purse: 38.2 },
  { name: 'DELHI FORGE', bid: 13.75, purse: 27.4 },
  { name: 'CHENNAI IRON', bid: 12.0, purse: 44.1 },
];

export function LiveBidding() {
  const bid = useTicker(9.25, 14.5, 3000);
  const [secs, setSecs] = useState(18);

  useEffect(() => {
    const id = window.setInterval(() => setSecs((s) => (s <= 0 ? 18 : s - 1)), 1000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <section id="live" style={{ position: 'relative', borderTop: '1px solid rgba(180,145,60,0.18)', background: 'oklch(0.06 0.004 60)', padding: '7rem 0' }}>
      <div style={{ margin: '0 auto', maxWidth: 1500, padding: '0 24px' }}>
        <Reveal>
          <SectionMark index="03" label="Live bidding experience" />
          <h2 style={{ maxWidth: 780, fontSize: 'clamp(2.2rem, 5.5vw, 5rem)', lineHeight: 0.95, color: 'oklch(0.93 0.012 85)', fontFamily: "'Anton', system-ui, sans-serif" }}>
            BROADCAST-GRADE <span style={{ backgroundImage: gradientMolten, backgroundClip: 'text', WebkitBackgroundClip: 'text', color: 'transparent' }}>BIDDING TELEMETRY</span>
          </h2>
        </Reveal>

        <div style={{ marginTop: 56, display: 'grid', gap: 24, gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
          <Reveal delay={120}>
            <div style={{ background: glassBg, backdropFilter: 'blur(18px)', border: borderGold, padding: '28px 40px', position: 'relative', overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 12, fontFamily: "'Barlow Semi Condensed', monospace", fontSize: 11, letterSpacing: '0.35em', color: ember }}>
                  <span style={{ display: 'inline-block', height: 8, width: 8, borderRadius: '50%', background: ember, animation: 'forge-pulse-live 1.6s ease-in-out infinite' }} />
                  LIVE NOW · LOT 47
                </span>
                <span style={{ fontFamily: "'Barlow Semi Condensed', monospace", fontSize: 11, letterSpacing: '0.3em', color: 'hsl(var(--muted-foreground))' }}>MEGA AUCTION · DAY 2</span>
              </div>

              <div style={{ marginTop: 36, display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: 32 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                  <div style={{ position: 'relative', height: 112, width: 112, overflow: 'hidden', border: '1px solid rgba(200,160,50,0.4)', flexShrink: 0, background: 'oklch(0.12 0.008 70)' }}>
                    <div style={{ position: 'absolute', inset: 0, background: gradientForge, opacity: 0.6 }} />
                    <Image 
                      src="/forge/player.jpg?v=2" 
                      alt="Herschel Gibbs" 
                      fill 
                      style={{ objectFit: 'cover' }}
                      sizes="112px"
                    />
                  </div>
                  <div>
                    <p style={{ fontFamily: "'Barlow Semi Condensed', monospace", fontSize: 11, letterSpacing: '0.34em', color: 'hsl(var(--muted-foreground))' }}>PLAYER</p>
                    <p style={{ marginTop: 8, fontFamily: "'Anton', system-ui, sans-serif", fontSize: 'clamp(1.4rem, 3vw, 2.2rem)', letterSpacing: '0.04em', color: 'oklch(0.93 0.012 85)' }}>HERSCHELLE GIBBS</p>
                    <p style={{ marginTop: 8, fontFamily: "'Barlow Semi Condensed', monospace", fontSize: 11, letterSpacing: '0.3em', color: goldAncient }}>RIGHT-HAND TOP ORDER · SA · CAP 07</p>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontFamily: "'Barlow Semi Condensed', monospace", fontSize: 11, letterSpacing: '0.34em', color: 'hsl(var(--muted-foreground))' }}>CURRENT BID</p>
                  <p style={{ fontFamily: "'Anton', system-ui, sans-serif", fontSize: 'clamp(2.8rem, 5vw, 4.5rem)', backgroundImage: gradientMolten, backgroundClip: 'text', WebkitBackgroundClip: 'text', color: 'transparent' }}>
                    ₹{bid.toFixed(2)}
                  </p>
                  <p style={{ fontFamily: "'Barlow Semi Condensed', monospace", fontSize: 11, letterSpacing: '0.34em', color: goldAncient }}>CRORE</p>
                </div>
              </div>

              <div style={{ marginTop: 40, display: 'grid', gap: 1, gridTemplateColumns: 'repeat(4, 1fr)' }}>
                {[['MATCHES','142'],['RUNS','5,318'],['STRIKE RATE','151.8'],['BASE PRICE','₹2.00 CR']].map(([k,v]) => (
                  <div key={k} style={{ background: gradientMetal, border: '1px solid rgba(180,145,60,0.18)', padding: '16px' }}>
                    <div style={{ fontFamily: "'Barlow Semi Condensed', monospace", fontSize: 10, letterSpacing: '0.28em', color: 'hsl(var(--muted-foreground))' }}>{k}</div>
                    <div style={{ marginTop: 8, fontFamily: "'Anton', system-ui, sans-serif", fontSize: '1.4rem', color: 'oklch(0.93 0.012 85)' }}>{v}</div>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: 32, display: 'flex', alignItems: 'center', gap: 16 }}>
                <span style={{ fontFamily: "'Barlow Semi Condensed', monospace", fontSize: 11, letterSpacing: '0.34em', color: 'hsl(var(--muted-foreground))' }}>TIME REMAINING</span>
                <span style={{ fontFamily: "'Anton', system-ui, sans-serif", fontSize: '1.8rem', color: ember }}>00:{secs.toString().padStart(2,'0')}</span>
                <span style={{ position: 'relative', height: 1, flex: 1, overflow: 'hidden', background: 'rgba(180,145,60,0.2)' }}>
                  <span style={{ position: 'absolute', inset: '0 auto 0 0', background: gradientMolten, transition: 'width 1s linear', width: `${(secs / 18) * 100}%` }} />
                </span>
              </div>
            </div>
          </Reveal>

          <Reveal delay={240}>
            <div style={{ display: 'flex', height: '100%', flexDirection: 'column', gap: 24 }}>
              <div style={{ background: glassBg, backdropFilter: 'blur(18px)', border: borderGold, padding: 28 }}>
                <p style={{ fontFamily: "'Barlow Semi Condensed', monospace", fontSize: 11, letterSpacing: '0.34em', color: 'hsl(var(--muted-foreground))' }}>TOP CONTENDERS</p>
                <ul style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
                  {BIDDING_TEAMS.map((t, i) => (
                    <li key={t.name} style={{ borderBottom: '1px solid rgba(180,145,60,0.15)', paddingBottom: 16 }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                        <span style={{ fontFamily: "'Anton', system-ui, sans-serif", fontSize: '1.15rem', letterSpacing: '0.04em', color: 'oklch(0.93 0.012 85)' }}>{t.name}</span>
                        <span style={{ fontFamily: "'Barlow Semi Condensed', monospace", fontSize: 13, color: goldFire }}>₹{t.bid.toFixed(2)} CR</span>
                      </div>
                      <div style={{ marginTop: 12, height: 1, width: '100%', background: 'rgba(180,145,60,0.12)' }}>
                        <div style={{ height: 1, background: gradientMolten, width: `${100 - i * 22}%` }} />
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              <div style={{ background: gradientMetal, border: borderGold, flex: 1, padding: 28 }}>
                <p style={{ fontFamily: "'Barlow Semi Condensed', monospace", fontSize: 11, letterSpacing: '0.34em', color: 'hsl(var(--muted-foreground))' }}>BID FEED</p>
                <ul style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {['14.50 CR — MUMBAI TITANS','13.75 CR — DELHI FORGE','12.00 CR — CHENNAI IRON','10.25 CR — MUMBAI TITANS','09.25 CR — KOLKATA VANGUARD'].map((r, i) => (
                    <li key={r} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(180,145,60,0.10)', paddingBottom: 8, fontFamily: "'Barlow Semi Condensed', monospace", fontSize: 12, color: 'hsl(var(--muted-foreground))', opacity: 1 - i * 0.14 }}>
                      <span>{r}</span>
                      <span style={{ color: goldBurnished }}>↑</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ── Player Marketplace ── */
export function PlayerMarketplace() {
  return (
    <section id="players" style={{ position: 'relative', borderTop: '1px solid rgba(180,145,60,0.18)', padding: '7rem 0' }}>
      <div style={{ margin: '0 auto', display: 'grid', maxWidth: 1500, alignItems: 'center', gap: 56, padding: '0 24px', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
        <Reveal>
          <div style={{ position: 'relative' }}>
            <div style={{ position: 'absolute', inset: -24, background: gradientForge, opacity: 0.7, filter: 'blur(32px)' }} />
            <div style={{ position: 'relative', overflow: 'hidden', background: gradientMetal, border: borderGold, aspectRatio: '3/4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Image src="/forge/player.jpg" alt="Cricket batsman lit with gold rim light" fill style={{ objectFit: 'cover', filter: 'grayscale(15%)' }} loading="lazy" sizes="(max-width:768px) 100vw, 50vw" />
            </div>
            <div style={{ position: 'absolute', bottom: -24, right: -8, width: 224, padding: 20, background: glassBg, backdropFilter: 'blur(18px)', border: borderGold }}>
              <p style={{ fontFamily: "'Barlow Semi Condensed', monospace", fontSize: 10, letterSpacing: '0.3em', color: 'hsl(var(--muted-foreground))' }}>CURRENT VALUE</p>
              <p style={{ fontFamily: "'Anton', system-ui, sans-serif", fontSize: '1.8rem', backgroundImage: gradientMolten, backgroundClip: 'text', WebkitBackgroundClip: 'text', color: 'transparent' }}>₹14.50 CR</p>
              <p style={{ fontFamily: "'Barlow Semi Condensed', monospace", fontSize: 10, letterSpacing: '0.28em', color: goldAncient }}>+625% VS BASE</p>
            </div>
          </div>
        </Reveal>

        <Reveal delay={140}>
          <SectionMark index="04" label="Player marketplace" />
          <h2 style={{ fontSize: 'clamp(2rem, 5vw, 4.5rem)', lineHeight: 0.94, color: 'oklch(0.93 0.012 85)', fontFamily: "'Anton', system-ui, sans-serif" }}>
            EVERY PLAYER, <span style={{ backgroundImage: gradientMolten, backgroundClip: 'text', WebkitBackgroundClip: 'text', color: 'transparent' }}>A HEADLINE</span>
          </h2>
          <p style={{ marginTop: 24, maxWidth: 520, fontSize: 15, lineHeight: 1.75, color: 'hsl(var(--muted-foreground))' }}>
            Profiles engineered like championship posters. Verified career data, form curves and valuation models surface as holographic telemetry the instant a lot opens.
          </p>
          <div style={{ marginTop: 40, display: 'grid', gap: 1, gridTemplateColumns: '1fr 1fr' }}>
            {[['MATCHES','142'],['RUNS','5,318'],['STRIKE RATE','151.8'],['BASE PRICE','₹2.00 CR']].map(([k,v]) => (
              <div key={k} style={{ background: gradientMetal, border: borderGold, padding: '24px' }}>
                <div style={{ fontFamily: "'Barlow Semi Condensed', monospace", fontSize: 10, letterSpacing: '0.3em', color: 'hsl(var(--muted-foreground))' }}>{k}</div>
                <div style={{ marginTop: 8, fontFamily: "'Anton', system-ui, sans-serif", fontSize: '1.8rem', color: goldFire }}>{v}</div>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ── Teams / Franchise War Rooms ── */
const FRANCHISES = [
  { name: 'MUMBAI TITANS', purse: '₹38.2 CR', squad: '17 / 25', spend: 62 },
  { name: 'DELHI FORGE',   purse: '₹27.4 CR', squad: '19 / 25', spend: 74 },
  { name: 'CHENNAI IRON',  purse: '₹44.1 CR', squad: '14 / 25', spend: 48 },
];

export function Teams() {
  return (
    <section id="teams" style={{ position: 'relative', borderTop: '1px solid rgba(180,145,60,0.18)', background: 'rgba(35,28,18,0.4)', padding: '7rem 0' }}>
      <div style={{ margin: '0 auto', maxWidth: 1500, padding: '0 24px' }}>
        <Reveal>
          <SectionMark index="05" label="Team management" />
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: 32 }}>
            <h2 style={{ maxWidth: 640, fontSize: 'clamp(2rem, 5vw, 4.5rem)', lineHeight: 0.94, color: 'oklch(0.93 0.012 85)', fontFamily: "'Anton', system-ui, sans-serif" }}>
              FRANCHISE <span style={{ backgroundImage: gradientMolten, backgroundClip: 'text', WebkitBackgroundClip: 'text', color: 'transparent' }}>WAR ROOMS</span>
            </h2>
            <p style={{ maxWidth: 340, fontSize: 14, lineHeight: 1.75, color: 'hsl(var(--muted-foreground))' }}>
              Purse control, squad composition and spend analytics in one terminal — transfer market discipline with trading-desk precision.
            </p>
          </div>
        </Reveal>

        <div style={{ marginTop: 56, display: 'grid', gap: 24, gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
          {FRANCHISES.map((f, i) => (
            <Reveal key={f.name} delay={i * 120}>
              <article style={{ background: glassBg, backdropFilter: 'blur(18px)', border: borderGold, padding: 32, height: '100%', boxSizing: 'border-box', transition: 'box-shadow 0.5s', cursor: 'default' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <h3 style={{ fontFamily: "'Anton', system-ui, sans-serif", fontSize: '1.5rem', letterSpacing: '0.04em', color: 'oklch(0.93 0.012 85)' }}>{f.name}</h3>
                  <span style={{ height: 40, width: 40, border: '1px solid rgba(180,140,60,0.6)', background: gradientMetal, flexShrink: 0, display: 'block' }} />
                </div>
                <dl style={{ marginTop: 32, display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(180,145,60,0.12)', paddingBottom: 12 }}>
                    <dt style={{ fontFamily: "'Barlow Semi Condensed', monospace", fontSize: 11, letterSpacing: '0.24em', color: 'hsl(var(--muted-foreground))' }}>PURSE REMAINING</dt>
                    <dd style={{ color: goldFire, fontFamily: "'Barlow Semi Condensed', monospace", fontSize: 11, letterSpacing: '0.24em' }}>{f.purse}</dd>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(180,145,60,0.12)', paddingBottom: 12 }}>
                    <dt style={{ fontFamily: "'Barlow Semi Condensed', monospace", fontSize: 11, letterSpacing: '0.24em', color: 'hsl(var(--muted-foreground))' }}>SQUAD</dt>
                    <dd style={{ color: 'oklch(0.93 0.012 85)', fontFamily: "'Barlow Semi Condensed', monospace", fontSize: 11, letterSpacing: '0.24em' }}>{f.squad}</dd>
                  </div>
                </dl>
                <div style={{ marginTop: 32 }}>
                  <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', fontFamily: "'Barlow Semi Condensed', monospace", fontSize: 10, letterSpacing: '0.28em', color: 'hsl(var(--muted-foreground))' }}>
                    <span>SPEND</span><span>{f.spend}%</span>
                  </div>
                  <div style={{ height: 1, width: '100%', background: 'rgba(180,145,60,0.15)' }}>
                    <div style={{ height: 1, background: gradientMolten, width: `${f.spend}%`, transition: 'width 0.7s' }} />
                  </div>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Intelligence Section ── */
export function Intelligence() {
  return (
    <section style={{ position: 'relative', overflow: 'hidden', borderTop: '1px solid rgba(180,145,60,0.18)', padding: '7rem 0' }}>
      <Embers count={26} />
      <div style={{ margin: '0 auto', display: 'grid', maxWidth: 1500, alignItems: 'center', gap: 56, padding: '0 24px', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
        <Reveal>
          <SectionMark index="06" label="AI auction intelligence" />
          <h2 style={{ fontSize: 'clamp(2rem, 5vw, 4.5rem)', lineHeight: 0.94, color: 'oklch(0.93 0.012 85)', fontFamily: "'Anton', system-ui, sans-serif" }}>
            THE HAMMER <span style={{ backgroundImage: gradientMolten, backgroundClip: 'text', WebkitBackgroundClip: 'text', color: 'transparent' }}>KNOWS MORE</span>
          </h2>
          <p style={{ marginTop: 24, maxWidth: 520, fontSize: 15, lineHeight: 1.75, color: 'hsl(var(--muted-foreground))' }}>
            Valuation engines read form, scarcity, role balance and rival purse pressure in real time — so every paddle raise is a calculated strike, not a guess.
          </p>
          <ul style={{ marginTop: 40, display: 'flex', flexDirection: 'column', gap: 20 }}>
            {[
              'Fair-value bands modelled per role and per market',
              'Rival purse pressure and squad-gap forecasting',
              'Anti-collusion and bid-integrity monitoring',
              'Post-lot valuation reports for owners and boards',
            ].map((t) => (
              <li key={t} style={{ display: 'flex', gap: 16, borderBottom: '1px solid rgba(180,145,60,0.12)', paddingBottom: 16, fontSize: 14, color: 'hsl(var(--muted-foreground))' }}>
                <span style={{ fontFamily: "'Barlow Semi Condensed', monospace", fontSize: 11, color: goldFire, marginTop: 2 }}>◆</span>
                {t}
              </li>
            ))}
          </ul>
        </Reveal>

        <Reveal delay={140}>
          <div style={{ position: 'relative' }}>
            <div style={{ position: 'relative', overflow: 'hidden', border: borderGold, aspectRatio: '3/2' }}>
              <Image src="/forge/bat-gavel.jpg" alt="Black cricket bat beside a gold auction gavel" fill style={{ objectFit: 'cover' }} loading="lazy" sizes="(max-width:768px) 100vw, 50vw" />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(8,6,4,0.8), transparent)' }} />
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ── Features Section ── */
const FEAT_LIST = [
  ['LIVE AUCTION ENGINE', 'Sub-second bid propagation across continents with deterministic lot ordering.'],
  ['BROADCAST GRAPHICS', 'Native overlay pack for LED walls, streams and stadium screens.'],
  ['PLAYER DATABASE', 'Verified records, scouting notes and career telemetry in one registry.'],
  ['PURSE COMPLIANCE', 'Hard caps, retention rules and rule-book enforcement by tournament.'],
  ['MULTI-FORMAT', 'Mega, mini, accelerated, silent and closed-room auction formats.'],
  ['RTM CARDS SYSTEM', 'Right-to-Match lets teams retain players by matching the winning bid.'],
];

export function ForgeFeatures() {
  return (
    <section id="features" style={{ position: 'relative', borderTop: '1px solid rgba(180,145,60,0.18)', padding: '7rem 0' }}>
      <div style={{ margin: '0 auto', maxWidth: 1500, padding: '0 24px' }}>
        <Reveal>
          <SectionMark index="07" label="Features" />
          <h2 style={{ maxWidth: 780, fontSize: 'clamp(2rem, 5vw, 4.5rem)', lineHeight: 0.94, color: 'oklch(0.93 0.012 85)', fontFamily: "'Anton', system-ui, sans-serif" }}>
            THE COMPLETE <span style={{ backgroundImage: gradientMolten, backgroundClip: 'text', WebkitBackgroundClip: 'text', color: 'transparent' }}>AUCTION MACHINE</span>
          </h2>
        </Reveal>
        <div style={{ marginTop: 56, display: 'grid', gap: 1, gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
          {FEAT_LIST.map(([t, d], i) => (
            <Reveal key={t} delay={i * 80}>
              <div style={{ background: gradientMetal, border: borderGold, padding: 36, height: '100%', boxSizing: 'border-box', transition: 'border-color 0.5s', cursor: 'default' }}>
                <span style={{ fontFamily: "'Barlow Semi Condensed', monospace", fontSize: 10, letterSpacing: '0.36em', color: goldBurnished }}>{String(i + 1).padStart(2, '0')}</span>
                <h3 style={{ marginTop: 20, fontFamily: "'Anton', system-ui, sans-serif", fontSize: '1.25rem', letterSpacing: '0.04em', color: 'oklch(0.93 0.012 85)' }}>{t}</h3>
                <p style={{ marginTop: 12, fontSize: 14, lineHeight: 1.75, color: 'hsl(var(--muted-foreground))' }}>{d}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Pricing Section ── */
const PLANS = [
  { name: 'STARTER', price: '₹2,999', note: 'PER YEAR', items: ['3 auctions / year', 'Up to 20 teams', 'Player photo uploads', 'Shareable reg link', 'Real-time bidding', 'Basic analytics'], hero: false },
  { name: 'PRO', price: '₹5,999', note: 'PER YEAR', items: ['10 auctions / year', 'Unlimited teams', 'Cloudinary CDN photos', 'RTM cards system', 'Collect player fees', 'Advanced analytics', 'Priority support'], hero: true },
  { name: 'ELITE', price: '₹9,999', note: 'PER YEAR', items: ['Unlimited auctions', 'Unlimited teams', 'Cloudinary CDN photos', 'RTM cards system', 'Collect player fees', 'Custom branding', 'Broadcast viewer mode', 'Dedicated support'], hero: false },
];

export function ForgePricing() {
  return (
    <section id="pricing" style={{ position: 'relative', borderTop: '1px solid rgba(180,145,60,0.18)', background: 'rgba(35,28,18,0.4)', padding: '7rem 0' }}>
      <div style={{ margin: '0 auto', maxWidth: 1500, padding: '0 24px' }}>
        <Reveal>
          <SectionMark index="08" label="Pricing" />
          <h2 style={{ maxWidth: 780, fontSize: 'clamp(2rem, 5vw, 4.5rem)', lineHeight: 0.94, color: 'oklch(0.93 0.012 85)', fontFamily: "'Anton', system-ui, sans-serif" }}>
            CHOOSE YOUR <span style={{ backgroundImage: gradientMolten, backgroundClip: 'text', WebkitBackgroundClip: 'text', color: 'transparent' }}>WEIGHT CLASS</span>
          </h2>
        </Reveal>
        <div style={{ marginTop: 56, display: 'grid', gap: 24, gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
          {PLANS.map((p, i) => (
            <Reveal key={p.name} delay={i * 120}>
              <article style={{
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                padding: 36,
                boxSizing: 'border-box',
                background: p.hero ? glassBg : gradientMetal,
                backdropFilter: p.hero ? 'blur(18px)' : undefined,
                border: p.hero ? '1px solid rgba(200,160,50,0.4)' : borderGold,
                boxShadow: p.hero ? '0 0 0 1px rgba(180,140,50,0.45), 0 24px 60px -34px rgba(220,170,50,0.6)' : undefined,
              }}>
                {p.hero && (
                  <span style={{ position: 'absolute', top: -12, left: 36, background: gradientMolten, padding: '4px 12px', fontFamily: "'Barlow Semi Condensed', monospace", fontSize: 9, letterSpacing: '0.3em', color: 'oklch(0.06 0.004 60)' }}>
                    MOST POPULAR
                  </span>
                )}
                <h3 style={{ fontFamily: "'Anton', system-ui, sans-serif", fontSize: '1.5rem', letterSpacing: '0.14em', color: 'oklch(0.93 0.012 85)' }}>{p.name}</h3>
                <p style={{ marginTop: 24, fontFamily: "'Anton', system-ui, sans-serif", fontSize: '3rem', backgroundImage: gradientMolten, backgroundClip: 'text', WebkitBackgroundClip: 'text', color: 'transparent' }}>{p.price}</p>
                <p style={{ marginTop: 4, fontFamily: "'Barlow Semi Condensed', monospace", fontSize: 10, letterSpacing: '0.3em', color: 'hsl(var(--muted-foreground))' }}>{p.note}</p>
                <ul style={{ marginTop: 32, flex: 1, display: 'flex', flexDirection: 'column', gap: 12, fontSize: 14, color: 'hsl(var(--muted-foreground))' }}>
                  {p.items.map((it) => (
                    <li key={it} style={{ display: 'flex', gap: 12, borderBottom: '1px solid rgba(180,145,60,0.12)', paddingBottom: 12 }}>
                      <span style={{ color: goldFire, flexShrink: 0 }}>—</span>{it}
                    </li>
                  ))}
                </ul>
                <div style={{ marginTop: 36 }}>
                  <ForgeButton href="/register" variant={p.hero ? 'primary' : 'ghost'}>
                    Get Started
                  </ForgeButton>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Global CTA ── */
export function GlobalCta() {
  return (
    <section id="cta" style={{ position: 'relative', overflow: 'hidden', borderTop: '1px solid rgba(180,145,60,0.18)', padding: '8rem 0', textAlign: 'center' }}>
      <div style={{ position: 'absolute', inset: 0, background: gradientForge, opacity: 0.9 }} />
      <Embers count={48} />
      <div style={{ position: 'relative', margin: '0 auto', maxWidth: 900, padding: '0 24px' }}>
        <Reveal>
          <p style={{ fontFamily: "'Barlow Semi Condensed', monospace", fontSize: 11, letterSpacing: '0.5em', color: goldAncient }}>09 — GLOBAL</p>
          <h2 style={{ marginTop: 32, fontSize: 'clamp(2.8rem, 8vw, 6.5rem)', lineHeight: 0.88, color: 'oklch(0.93 0.012 85)', fontFamily: "'Anton', system-ui, sans-serif" }}>
            FORGED IN FIRE.
            <span style={{ display: 'block', marginTop: 8, backgroundImage: gradientMolten, backgroundClip: 'text', WebkitBackgroundClip: 'text', color: 'transparent' }}>BUILT FOR CHAMPIONS.</span>
          </h2>
          <p style={{ margin: '32px auto 0', maxWidth: 520, fontSize: 15, lineHeight: 1.75, color: 'hsl(var(--muted-foreground))' }}>
            Bring your league, franchise or tournament onto the auction floor the world is watching.
          </p>
          <div style={{ marginTop: 48, display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 16 }}>
            <ForgeButton href="/register">Create Your Auction</ForgeButton>
            <ForgeButton href="/auctions" variant="ghost">View Live Auctions</ForgeButton>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
