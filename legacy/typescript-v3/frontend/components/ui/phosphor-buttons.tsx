'use client';

import { cn } from '@/lib/utils';
import { Icon as PhosphorIcon } from '@phosphor-icons/react';
import { RefreshCw } from 'lucide-react';
import { forwardRef, ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    icon?: PhosphorIcon;
    loading?: boolean;
    fullWidth?: boolean;
}

/**
 * Primary Action Button
 * 
 * Use for: Main CTAs, form submissions, key actions
 * Features: Gradient background, hover lift, icon animation
 */
export const PrimaryButton = forwardRef<HTMLButtonElement, ButtonProps>(
    ({ children, icon: Icon, loading, fullWidth, className, disabled, ...props }, ref) => (
        <button
            ref={ref}
            disabled={disabled || loading}
            className={cn(
                "relative flex items-center justify-center gap-2 overflow-hidden",
                "bg-primary text-primary-foreground",
                "px-6 py-2.5 rounded-lg",
                "text-sm font-bold uppercase tracking-widest",
                "shadow-lg shadow-primary/10",
                "active:scale-95 transition-all duration-200",
                "group disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none",
                fullWidth && "w-full",
                className
            )}
            {...props}
        >
            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            <span className="relative z-10 flex items-center gap-2">
                {loading ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                    Icon && <Icon weight="bold" size={18} className="transition-transform group-hover:scale-110" />
                )}
                {children}
            </span>
        </button>
    )
);
PrimaryButton.displayName = 'PrimaryButton';

export const SecondaryButton = forwardRef<HTMLButtonElement, ButtonProps>(
    ({ children, icon: Icon, loading, fullWidth, className, disabled, ...props }, ref) => (
        <button
            ref={ref}
            disabled={disabled || loading}
            className={cn(
                "relative flex items-center justify-center gap-2 overflow-hidden",
                "bg-secondary border border-white/10 text-foreground",
                "px-6 py-2.5 rounded-lg",
                "text-sm font-bold uppercase tracking-widest",
                "hover:bg-white/5 hover:border-white/20",
                "active:scale-95 transition-all duration-200",
                "group disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none",
                fullWidth && "w-full",
                className
            )}
            {...props}
        >
            <span className="relative z-10 flex items-center gap-2 text-muted-foreground group-hover:text-foreground transition-colors">
                {loading ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                    Icon && <Icon weight="bold" size={18} className="transition-transform group-hover:scale-110" />
                )}
                {children}
            </span>
        </button>
    )
);
SecondaryButton.displayName = 'SecondaryButton';

export const DangerButton = forwardRef<HTMLButtonElement, ButtonProps>(
    ({ children, icon: Icon, loading, fullWidth, className, disabled, ...props }, ref) => (
        <button
            ref={ref}
            disabled={disabled || loading}
            className={cn(
                "relative flex items-center justify-center gap-2 overflow-hidden",
                "bg-destructive text-destructive-foreground",
                "px-6 py-2.5 rounded-lg",
                "text-sm font-bold uppercase tracking-widest",
                "shadow-lg shadow-destructive/10",
                "active:scale-95 transition-all duration-200",
                "group disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none",
                fullWidth && "w-full",
                className
            )}
            {...props}
        >
            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            <span className="relative z-10 flex items-center gap-2">
                {loading ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                    Icon && <Icon weight="bold" size={18} className="transition-transform group-hover:scale-110" />
                )}
                {children}
            </span>
        </button>
    )
);
DangerButton.displayName = 'DangerButton';

export const SuccessButton = forwardRef<HTMLButtonElement, ButtonProps>(
    ({ children, icon: Icon, loading, fullWidth, className, disabled, ...props }, ref) => (
        <button
            ref={ref}
            disabled={disabled || loading}
            className={cn(
                "relative flex items-center justify-center gap-2 overflow-hidden",
                "bg-success text-success-foreground",
                "px-6 py-2.5 rounded-lg",
                "text-sm font-bold uppercase tracking-widest",
                "shadow-lg shadow-success/10",
                "active:scale-95 transition-all duration-200",
                "group disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none",
                fullWidth && "w-full",
                className
            )}
            {...props}
        >
            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            <span className="relative z-10 flex items-center gap-2">
                {loading ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                    Icon && <Icon weight="bold" size={18} className="transition-transform group-hover:scale-110" />
                )}
                {children}
            </span>
        </button>
    )
);
SuccessButton.displayName = 'SuccessButton';

export const GhostButton = forwardRef<HTMLButtonElement, ButtonProps>(
    ({ children, icon: Icon, loading, fullWidth, className, disabled, ...props }, ref) => (
        <button
            ref={ref}
            disabled={disabled || loading}
            className={cn(
                "relative flex items-center justify-center gap-2",
                "bg-transparent text-muted-foreground hover:text-foreground hover:bg-white/5",
                "px-4 py-2 rounded-lg",
                "text-sm font-bold uppercase tracking-widest",
                "transition-all duration-200",
                "group disabled:opacity-50 disabled:cursor-not-allowed",
                fullWidth && "w-full",
                className
            )}
            {...props}
        >
            <span className="flex items-center justify-center gap-2">
                {loading ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                    Icon && <Icon weight="bold" size={18} className="transition-transform group-hover:scale-110" />
                )}
                {children}
            </span>
        </button>
    )
);
GhostButton.displayName = 'GhostButton';
