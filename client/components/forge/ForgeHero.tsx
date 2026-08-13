'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Embers, ForgeButton } from './atoms';
import { useForgeTransition } from './ForgeTransitionContext';

export function ForgeHero() {
  const [isVisible, setIsVisible] = useState(false);
  const { isLogoAnimating } = useForgeTransition();

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.2 }
    );

    const el = document.getElementById('forge-hero');
    // Only observe if logo is not animating
    if (el && !isLogoAnimating) observer.observe(el);
    return () => observer.disconnect();
  }, [isLogoAnimating]);

  const goldFire = 'oklch(0.81 0.163 78)';
  const goldAncient = 'oklch(0.63 0.115 78)';
  const gradientMolten = `linear-gradient(135deg, oklch(0.48 0.1 72) 0%, oklch(0.81 0.163 78) 42%, oklch(0.63 0.115 78) 62%, oklch(0.66 0.213 42) 100%)`;
  const gradientForge = 'radial-gradient(circle at 50% 100%, color-mix(in oklab, oklch(0.66 0.213 42) 30%, transparent) 0%, transparent 62%)';

  // Hide hero completely during logo animation
  if (isLogoAnimating) {
    return (
      <div
        id="forge-hero"
        className="relative min-h-screen flex flex-col overflow-hidden"
        style={{ 
          background: 'oklch(0.06 0.004 60)',
          visibility: 'hidden',
          opacity: 0,
        }}
      />
    );
  }

  return (
    <div
      id="forge-hero"
      className="relative min-h-screen flex flex-col overflow-hidden"
      style={{ background: 'oklch(0.06 0.004 60)' }}
    >
      {/* Background */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/forge/ball.jpg"
          alt="Carbon-fibre cricket ball with molten gold seam"
          fill
          style={{
            objectFit: 'cover',
            opacity: 0.7,
            animation: 'forge-slow-push 26s ease-out both',
          }}
          priority
          sizes="100vw"
        />
        {/* Vignette overlay */}
        <div
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(circle at 50% 45%, transparent 0%, oklch(0.06 0.004 60) 72%)',
          }}
        />
        {/* Forge gradient overlay */}
        <div
          className="absolute inset-0"
          style={{
            background: gradientForge,
            opacity: 0.7,
          }}
        />
      </div>

      {/* Embers */}
      <Embers count={54} className="z-10" />

      {/* Copy block */}
      <div
        className="relative z-20 flex-1 flex flex-col items-center justify-center text-center px-6 pt-28 pb-20 min-h-screen"
        style={{
          opacity: isVisible ? 1 : 0,
          transform: isVisible ? 'translateY(0)' : 'translateY(40px)',
          transition: 'opacity 1400ms ease-out, transform 1400ms ease-out',
        }}
      >
        {/* Eyebrow */}
        <div className="mb-6">
          <div className="h-px w-16 mx-auto mb-4" style={{ background: goldAncient }} />
          <p
            className="text-xs uppercase tracking-[0.55em]"
            style={{
              fontFamily: "'Barlow Semi Condensed', monospace",
              color: goldAncient,
            }}
          >
            FORGED IN FIRE · BUILT FOR CHAMPIONS
          </p>
        </div>

        {/* Headline */}
        <h1
          className="leading-[0.82] mb-8"
          style={{
            fontFamily: "'Anton', system-ui, sans-serif",
            fontSize: 'clamp(3rem, 16vw, 13rem)',
            letterSpacing: '0.01em',
            color: 'oklch(0.93 0.012 85)',
          }}
        >
          <span
            style={{
              backgroundImage: gradientMolten,
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              color: 'transparent',
            }}
          >
            BEAST
          </span>
          <br />
          <span
            className="block"
            style={{
              fontSize: 'clamp(1.5rem, 4.2vw, 3.4rem)',
              letterSpacing: '0.16em',
              color: 'oklch(0.93 0.012 85)',
            }}
          >
            FORGE
          </span>
        </h1>

        {/* Buttons */}
        <div className="flex flex-wrap gap-4 justify-center mb-16">
          <ForgeButton href="#live">Enter the auction</ForgeButton>
          <ForgeButton href="#cta" variant="ghost">
            Create your auction
          </ForgeButton>
        </div>

        {/* Stats strip */}
        <div
          className="grid grid-cols-2 sm:grid-cols-4 gap-px w-full max-w-4xl"
          style={{
            background: 'oklch(0.28 0.045 78 / 45%)',
          }}
        >
          {[
            ['₹4,280 CR', 'LOTS SETTLED'],
            ['38', 'COUNTRIES'],
            ['1,900+', 'FRANCHISES'],
            ['99.99%', 'LIVE UPTIME'],
          ].map(([value, label]) => (
            <div
              key={label}
              className="p-6 text-center"
              style={{
                background: 'linear-gradient(180deg, oklch(0.16 0.006 70) 0%, oklch(0.09 0.004 70) 100%)',
              }}
            >
              <div
                className="text-2xl sm:text-3xl font-bold mb-1"
                style={{
                  fontFamily: "'Anton', system-ui, sans-serif",
                  backgroundImage: gradientMolten,
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  color: 'transparent',
                }}
              >
                {value}
              </div>
              <div
                className="text-xs uppercase tracking-wider"
                style={{
                  fontFamily: "'Barlow Semi Condensed', monospace",
                  color: 'oklch(0.93 0.012 85)',
                }}
              >
                {label}
              </div>
            </div>
          ))}
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 hidden lg:block">
          <div className="flex flex-col items-center gap-2 text-muted-foreground/40 text-xs font-heading uppercase tracking-widest">
            <span>SCROLL — 02 / 09</span>
            <span className="animate-bounce">↓</span>
          </div>
        </div>
      </div>
    </div>
  );
}
