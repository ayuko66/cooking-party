import React from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface InkButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'accent' | 'danger';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  isLoading?: boolean;
}

const InkButton = React.forwardRef<HTMLButtonElement, InkButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, children, ...props }, ref) => {
    
    const variants = {
      primary: 'text-ink-base bg-gradient-to-b from-ink-magenta via-[#ff3bf2] to-[#d700d4] border-ink-magenta hover:from-[#ff5cf6] hover:via-[#ff3bf2] hover:to-[#d700d4] shadow-[0_10px_30px_rgba(240,0,255,0.4)] hover:shadow-[0_12px_36px_rgba(240,0,255,0.5)]',
      secondary: 'text-ink-base bg-gradient-to-b from-ink-cyan via-[#3cffff] to-[#00e0e0] border-ink-cyan hover:from-[#64ffff] hover:via-[#3cffff] hover:to-[#00e0e0] shadow-[0_10px_30px_rgba(0,255,255,0.4)] hover:shadow-[0_12px_36px_rgba(0,255,255,0.5)]',
      accent: 'text-ink-base bg-gradient-to-b from-ink-lime via-[#e2ff52] to-[#c0ff1a] border-ink-lime hover:from-[#ebff74] hover:via-[#e2ff52] hover:to-[#c0ff1a] shadow-[0_10px_30px_rgba(204,255,0,0.4)] hover:shadow-[0_12px_36px_rgba(204,255,0,0.5)]',
      danger: 'text-white bg-gradient-to-b from-red-500 via-[#f25f5f] to-[#d81b60] border-red-500 hover:from-[#f87171] hover:via-[#f25f5f] hover:to-[#d81b60] shadow-[0_10px_30px_rgba(239,68,68,0.4)] hover:shadow-[0_12px_36px_rgba(239,68,68,0.5)]',
    };

    const sizes = {
      sm: 'px-4 py-2 text-sm border-2',
      md: 'px-6 py-3 text-base border-4',
      lg: 'px-8 py-3.5 text-lg font-bold border-4',
      xl: 'px-12 py-4 text-xl font-black border-[5px]',
    };

    return (
      <button
        ref={ref}
        className={cn(
          'relative inline-flex items-center justify-center rounded-full font-display font-bold transition-all duration-200 ease-out',
          'box-shadow-sticker hover:box-shadow-sticker-hover active:box-shadow-sticker-active',
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:box-shadow-none disabled:transform-none',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-ink-cyan focus-visible:ring-offset-ink-base',
          'active:translate-y-[1px]',
          variants[variant],
          sizes[size],
          className
        )}
        disabled={isLoading || props.disabled}
        {...props}
      >
        {isLoading && <Loader2 className="w-5 h-5 mr-2 animate-spin" />}
        <span className="relative z-10 flex items-center gap-2 filter drop-shadow-sm">
          {children}
        </span>
      </button>
    );
  }
);

InkButton.displayName = 'InkButton';

export { InkButton };
