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
    const isUrlDev = devParam?.toLowerCase() === 'true';

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
        <div className="fixed top-0 left-0 right-0 z-[100] bg-yellow-400 text-black text-center font-bold px-2 py-1 shadow-md uppercase tracking-wider text-xs pointer-events-none">
          devモードで実行
        </div>
      )}
      {children}
    </DevModeContext.Provider>
  );
}
