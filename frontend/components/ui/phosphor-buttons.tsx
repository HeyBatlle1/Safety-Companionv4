'use client';

import { cn } from '@/lib/utils';
import { Icon as PhosphorIcon } from '@phosphor-icons/react';
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
                "relative overflow-hidden",
                "bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700",
                "px-8 py-4 rounded-xl",
                "font-bold text-white text-lg",
                "shadow-lg hover:shadow-2xl",
                "transform hover:-translate-y-0.5",
                "transition-all duration-200",
                "before:absolute before:inset-0",
                "before:bg-white/20",
                "before:translate-y-full",
                "hover:before:translate-y-0",
                "before:transition-transform before:duration-300",
                "group",
                "disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none",
                fullWidth && "w-full",
                className
            )}
            {...props}
        >
            <span className="relative z-10 flex items-center justify-center gap-3">
                {loading ? (
                    <svg className="animate-spin h-6 w-6" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                ) : (
                    Icon && <Icon weight="bold" size={24} className="group-hover:rotate-12 transition-transform" />
                )}
                {children}
            </span>
        </button>
    )
);
PrimaryButton.displayName = 'PrimaryButton';

/**
 * Secondary Button
 * 
 * Use for: Alternative actions, cancel, back
 * Features: Outlined style, subtle hover
 */
export const SecondaryButton = forwardRef<HTMLButtonElement, ButtonProps>(
    ({ children, icon: Icon, loading, fullWidth, className, disabled, ...props }, ref) => (
        <button
            ref={ref}
            disabled={disabled || loading}
            className={cn(
                "px-6 py-3 rounded-xl",
                "bg-gray-800",
                "border-2 border-gray-600",
                "hover:border-blue-500 hover:bg-gray-750",
                "text-gray-200 font-semibold",
                "transition-all duration-200",
                "group",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                fullWidth && "w-full",
                className
            )}
            {...props}
        >
            <span className="flex items-center justify-center gap-2">
                {loading ? (
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                ) : (
                    Icon && <Icon weight="bold" size={20} className="group-hover:translate-y-0.5 transition-transform" />
                )}
                {children}
            </span>
        </button>
    )
);
SecondaryButton.displayName = 'SecondaryButton';

/**
 * Danger Button
 * 
 * Use for: Delete, cancel subscription, destructive actions
 * Features: Red gradient, glow effect
 */
export const DangerButton = forwardRef<HTMLButtonElement, ButtonProps>(
    ({ children, icon: Icon, loading, fullWidth, className, disabled, ...props }, ref) => (
        <button
            ref={ref}
            disabled={disabled || loading}
            className={cn(
                "px-6 py-3 rounded-xl",
                "bg-gradient-to-br from-red-500 to-red-700",
                "border-2 border-red-400",
                "text-white font-bold",
                "shadow-lg shadow-red-500/30",
                "hover:shadow-xl hover:shadow-red-500/50",
                "transition-all duration-200",
                "group",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                fullWidth && "w-full",
                className
            )}
            {...props}
        >
            <span className="flex items-center justify-center gap-2">
                {loading ? (
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                ) : (
                    Icon && <Icon weight="bold" size={20} className="group-hover:scale-110 transition-transform" />
                )}
                {children}
            </span>
        </button>
    )
);
DangerButton.displayName = 'DangerButton';

/**
 * Success Button
 * 
 * Use for: Confirm, approve, GO decisions
 * Features: Green gradient, check animation
 */
export const SuccessButton = forwardRef<HTMLButtonElement, ButtonProps>(
    ({ children, icon: Icon, loading, fullWidth, className, disabled, ...props }, ref) => (
        <button
            ref={ref}
            disabled={disabled || loading}
            className={cn(
                "px-6 py-3 rounded-xl",
                "bg-gradient-to-br from-emerald-500 to-emerald-700",
                "border-2 border-emerald-400",
                "text-white font-bold",
                "shadow-lg shadow-emerald-500/30",
                "hover:shadow-xl hover:shadow-emerald-500/50",
                "transition-all duration-200",
                "group",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                fullWidth && "w-full",
                className
            )}
            {...props}
        >
            <span className="flex items-center justify-center gap-2">
                {loading ? (
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                ) : (
                    Icon && <Icon weight="bold" size={20} className="group-hover:scale-110 transition-transform" />
                )}
                {children}
            </span>
        </button>
    )
);
SuccessButton.displayName = 'SuccessButton';

/**
 * Ghost Button
 * 
 * Use for: Tertiary actions, links, minimal UI
 * Features: Transparent with hover effect
 */
export const GhostButton = forwardRef<HTMLButtonElement, ButtonProps>(
    ({ children, icon: Icon, loading, fullWidth, className, disabled, ...props }, ref) => (
        <button
            ref={ref}
            disabled={disabled || loading}
            className={cn(
                "px-4 py-2 rounded-lg",
                "bg-transparent",
                "text-gray-300 font-medium",
                "hover:bg-white/10 hover:text-white",
                "transition-all duration-200",
                "group",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                fullWidth && "w-full",
                className
            )}
            {...props}
        >
            <span className="flex items-center justify-center gap-2">
                {loading ? (
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                ) : (
                    Icon && <Icon weight="bold" size={20} />
                )}
                {children}
            </span>
        </button>
    )
);
GhostButton.displayName = 'GhostButton';
