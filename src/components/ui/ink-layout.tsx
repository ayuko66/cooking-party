import React from 'react';
import { cn } from '@/lib/utils';

interface InkLayoutProps {
  children: React.ReactNode;
  className?: string;
  showPattern?: boolean;
}

export function InkLayout({ children, className, showPattern = true }: InkLayoutProps) {
  return (
    <div className={cn("min-h-screen relative overflow-hidden flex flex-col", className)}>
      
      {/* Background Ambience */}
      {showPattern && (
        <>
          {/* Floating Blobs */}
          <div className="absolute top-[10%] left-[5%] w-64 h-64 bg-ink-magenta/10 rounded-full blur-[80px] animate-float" />
          <div className="absolute bottom-[20%] right-[10%] w-96 h-96 bg-ink-cyan/10 rounded-full blur-[100px] animate-float [animation-delay:2s]" />
          <div className="absolute top-[40%] right-[30%] w-48 h-48 bg-ink-lime/10 rounded-full blur-[60px] animate-float [animation-delay:4s]" />
        </>
      )}

      {/* Main Content */}
      <main className="relative z-10 flex-1 flex flex-col container mx-auto px-4 py-6 md:py-10 max-w-4xl">
        {children}
      </main>

      {/* Decoration Overlay (optional Vignette) */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_0%,rgba(11,16,33,0.4)_100%)] z-0" />
    </div>
  );
}
