'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to role selection page
    router.push('/select-role');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <div className="w-16 h-16 rounded-2xl bg-primary text-primary-foreground font-heading uppercase tracking-wider mx-auto mb-4 animate-pulse flex items-center justify-center" style={{fontSize:'28px',fontFamily:'Oswald,sans-serif'}}>B</div>
        <p className="text-foreground text-sm uppercase tracking-widest animate-pulse">Loading...</p>
      </div>
    </div>
  );
}
