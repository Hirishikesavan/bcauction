'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useForgeTransition } from './ForgeTransitionContext';

export function ForgeLogoReveal() {
  const [stage, setStage] = useState(0);
  const [shouldUnmount, setShouldUnmount] = useState(false);
  const { setLogoAnimating } = useForgeTransition();

  useEffect(() => {
    // Start animation immediately on page load
    setLogoAnimating(true);
    // Stage 1: Logo forged at 700ms
    setTimeout(() => setStage(1), 700);
    // Stage 2: Full reveal at 2600ms
    setTimeout(() => setStage(2), 2600);
    // Stage 3: Start fade out at 4000ms
    setTimeout(() => setStage(3), 4000);
    // Stage 4: Complete fade out at 5000ms - unmount the overlay and scroll to Forge Hero
    setTimeout(() => {
      setShouldUnmount(true);
      setLogoAnimating(false);
      // Auto-scroll to Beast Forge Hero section
      const forgeHero = document.getElementById('forge-hero');
      if (forgeHero) {
        forgeHero.scrollIntoView({ behavior: 'smooth' });
      }
    }, 5000);
  }, [setLogoAnimating]);

  if (shouldUnmount) {
    return null;
  }

  return (
    <>
      {/* Fixed full-screen overlay */}
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden"
        style={{ 
          background: 'oklch(0.06 0.004 60)',
          opacity: stage === 3 ? 0 : 1,
          transition: 'opacity 1000ms ease-out',
          pointerEvents: stage === 3 ? 'none' : 'auto',
        }}
      >
        {/* Background gradient */}
        <div
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(circle at 50% 100%, color-mix(in oklab, oklch(0.66 0.213 42) 30%, transparent) 0%, transparent 62%)',
            opacity: 0.7,
          }}
        />

        {/* Embers */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {Array.from({ length: 32 }, (_, i) => {
            const seed = (i * 9301 + 49297) % 233280;
            const r = seed / 233280;
            return (
              <span
                key={i}
                className="absolute bottom-[-10vh] rounded-full"
                style={{
                  left: `${(r * 100).toFixed(2)}%`,
                  width: 1 + ((i * 7) % 4),
                  height: 1 + ((i * 7) % 4),
                  opacity: 0.25 + (i % 5) / 8,
                  background: 'oklch(0.81 0.163 78)',
                  filter: 'blur(0.4px)',
                  boxShadow: '0 0 10px 2px rgba(220,170,50,0.4)',
                  animation: `forge-ember-rise ${16 + ((i * 5) % 18)}s linear ${-(r * 24).toFixed(2)}s infinite`,
                  ['--forge-drift' as string]: `${((i % 7) - 3) * 26}px`,
                }}
              />
            );
          })}
        </div>

        {/* Blackout curtain */}
        <div
          className="absolute inset-0 z-30 transition-opacity duration-[1600ms] ease-out"
          style={{
            background: 'oklch(0.06 0.004 60)',
            opacity: stage === 2 ? 0 : 1,
          }}
        />

        {/* Logo layer */}
        <div
          className="relative z-40 transition-all duration-1000"
          style={{
            opacity: stage >= 1 && stage < 3 ? 1 : 0,
            transform: stage >= 2 && stage < 3 ? 'scale(1.35)' : 'scale(1)',
            filter: stage === 0 ? 'blur(24px)' : 'blur(0)',
            transition: 'opacity 1000ms ease-out, transform 1000ms ease-out, filter 1000ms ease-out',
          }}
        >
          <div
            className="relative"
            style={{
              filter: 'drop-shadow(0 0 60px color-mix(in oklab, oklch(0.81 0.163 78) 45%, transparent))',
            }}
          >
            <Image
              src="/beast-logo.png"
              alt="BEAST Logo"
              width={224}
              height={224}
              className="h-56 w-auto"
              priority
            />
          </div>
        </div>
      </div>
    </>
  );
}
