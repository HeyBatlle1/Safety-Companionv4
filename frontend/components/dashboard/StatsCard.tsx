'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { Icon as PhosphorIcon } from '@phosphor-icons/react';
import { TrendUp, TrendDown } from '@phosphor-icons/react';

interface StatsCardProps {
    title: string;
    value: number | string;
    icon: PhosphorIcon;
    variant?: 'primary' | 'success' | 'warning' | 'danger';
    trend?: 'up' | 'down';
    trendValue?: string;
}

const variantStyles = {
    primary: {
        icon: 'text-primary',
        bg: 'bg-primary/5',
        border: 'border-primary/20'
    },
    success: {
        icon: 'text-success',
        bg: 'bg-success/5',
        border: 'border-success/20'
    },
    warning: {
        icon: 'text-warning',
        bg: 'bg-warning/5',
        border: 'border-warning/20'
    },
    danger: {
        icon: 'text-destructive',
        bg: 'bg-destructive/5',
        border: 'border-destructive/20'
    },
};

export function StatsCard({
    title,
    value,
    icon: Icon,
    variant = 'primary',
    trend,
    trendValue
}: StatsCardProps) {
    const styles = variantStyles[variant];

    return (
        <div className={cn(
            "relative group overflow-hidden rounded-xl border border-white/5 bg-card px-4 py-5 transition-all duration-300",
            "hover:border-white/10"
        )}>
            {/* Contextual Technical Hub */}
            <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">{title}</span>
                <div className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-lg border transition-all",
                    styles.bg,
                    styles.border,
                    "group-hover:scale-110"
                )}>
                    <Icon weight="bold" size={16} className={styles.icon} />
                </div>
            </div>

            {/* Precision Value Display */}
            <div className="flex flex-col">
                <div className="text-3xl font-bold text-foreground font-mono tracking-tighter tabular-nums drop-shadow-sm">
                    {value}
                </div>
                {trendValue && (
                    <div className={cn(
                        'text-[10px] uppercase font-bold tracking-wider mt-2 flex items-center gap-1.5',
                        trend === 'up' ? 'text-success' : trend === 'down' ? 'text-destructive' : 'text-muted-foreground'
                    )}>
                        {trend === 'up' && <TrendUp weight="bold" size={12} />}
                        {trend === 'down' && <TrendDown weight="bold" size={12} />}
                        <span>{trendValue}</span>
                    </div>
                )}
            </div>

            {/* Technical Detail Corner (Visual Decoration) */}
            <div className="absolute bottom-0 right-0 p-1 opacity-5">
                <div className="w-4 h-4 border-r border-b border-foreground rounded-br-sm" />
            </div>
        </div>
    );
}
