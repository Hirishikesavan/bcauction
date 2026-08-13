'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

interface ForgeTransitionContextType {
  isLogoAnimating: boolean;
  setLogoAnimating: (animating: boolean) => void;
}

const ForgeTransitionContext = createContext<ForgeTransitionContextType | undefined>(undefined);

export function ForgeTransitionProvider({ children }: { children: ReactNode }) {
  const [isLogoAnimating, setIsLogoAnimating] = useState(false);

  return (
    <ForgeTransitionContext.Provider value={{ isLogoAnimating, setLogoAnimating: setIsLogoAnimating }}>
      {children}
    </ForgeTransitionContext.Provider>
  );
}

export function useForgeTransition() {
  const context = useContext(ForgeTransitionContext);
  if (!context) {
    throw new Error('useForgeTransition must be used within ForgeTransitionProvider');
  }
  return context;
}
