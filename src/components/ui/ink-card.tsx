import React from 'react';
import { cn } from '@/lib/utils';

interface InkCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'glass' | 'solid' | 'neon';
  decoration?: 'none' | 'splat';
}

const InkCard = React.forwardRef<HTMLDivElement, InkCardProps>(
  ({ className, variant = 'glass', decoration = 'none', children, ...props }, ref) => {
    
    const variants = {
      glass: 'bg-ink-surface/80 backdrop-blur-md border-2 border-white/10 shadow-xl',
      solid: 'bg-ink-surface border-4 border-ink-base box-shadow-sticker',
      neon: 'bg-ink-base/90 border-2 border-ink-magenta/50 shadow-[0_0_15px_rgba(240,0,255,0.3)]',
    };

    return (
      <div
        ref={ref}
        className={cn(
          'relative rounded-3xl overflow-hidden',
          variants[variant],
          className
        )}
        {...props}
      >
        {decoration === 'splat' && (
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-ink-cyan/20 blur-2xl rounded-full pointer-events-none" />
        )}
        <div className="relative z-10 p-6">
          {children}
        </div>
      </div>
    );
  }
);

InkCard.displayName = 'InkCard';

export { InkCard };
