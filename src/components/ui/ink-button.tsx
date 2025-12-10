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
      primary: 'bg-ink-magenta text-white border-ink-magenta hover:bg-[#ff40ff]',
      secondary: 'bg-ink-cyan text-ink-base border-ink-cyan hover:bg-[#40ffff]',
      accent: 'bg-ink-lime text-ink-base border-ink-lime hover:bg-[#dfff40]',
      danger: 'bg-red-500 text-white border-red-500 hover:bg-red-400',
    };

    const sizes = {
      sm: 'px-4 py-1 text-sm border-2',
      md: 'px-6 py-2 text-base border-4',
      lg: 'px-8 py-3 text-lg font-bold border-4',
      xl: 'px-12 py-4 text-xl font-black border-[5px]',
    };

    return (
      <button
        ref={ref}
        className={cn(
          'relative inline-flex items-center justify-center rounded-full font-display font-bold transition-all duration-200 ease-out',
          'box-shadow-sticker hover:box-shadow-sticker-hover active:box-shadow-sticker-active',
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:box-shadow-none disabled:transform-none',
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
