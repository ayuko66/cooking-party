'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

export const DevModeContext = createContext<boolean>(false);

export function useDevMode() {
  return useContext(DevModeContext);
}

export function DevModeProvider({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams();
  const [isDev, setIsDev] = useState(false);

  useEffect(() => {
    // Check URL
    const devParam = searchParams.get('dev');
    const decParam = searchParams.get('dec');
    const isUrlDev = devParam?.toLowerCase() === 'true' || decParam?.toLowerCase() === 'true';

    // Check Storage
    // Check if window is defined (client-side)
    if (typeof window !== 'undefined') {
      const isStorageDev = sessionStorage.getItem('cooking-party-dev-mode') === 'true';

      if (isUrlDev) {
        setIsDev(true);
        sessionStorage.setItem('cooking-party-dev-mode', 'true');
      } else if (isStorageDev) {
        setIsDev(true);
      }
    }
  }, [searchParams]);

  return (
    <DevModeContext.Provider value={isDev}>
      {isDev && (
        <div className="fixed right-4 bottom-4 z-[100] pointer-events-none md:right-6 md:bottom-6">
          <div className="bg-neutral-900 text-white font-black text-xs uppercase tracking-wider px-[3px] py-[3px] rounded-md shadow-lg border-2 border-white/30">
            DEVモード中
          </div>
        </div>
      )}
      {children}
    </DevModeContext.Provider>
  );
}
