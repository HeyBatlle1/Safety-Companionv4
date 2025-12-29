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
        icon: 'text-blue-400',
        glow: 'shadow-blue-500/20',
        bg: 'from-blue-500/10 to-blue-500/5'
    },
    success: {
        icon: 'text-emerald-400',
        glow: 'shadow-emerald-500/20',
        bg: 'from-emerald-500/10 to-emerald-500/5'
    },
    warning: {
        icon: 'text-amber-400',
        glow: 'shadow-amber-500/20',
        bg: 'from-amber-500/10 to-amber-500/5'
    },
    danger: {
        icon: 'text-red-400',
        glow: 'shadow-red-500/20',
        bg: 'from-red-500/10 to-red-500/5'
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
        <Card className={cn(
            "relative overflow-hidden",
            "bg-gray-800/50 border-gray-700",
            "hover:border-gray-600 transition-all duration-200",
            "group"
        )}>
            {/* Gradient background */}
            <div className={cn(
                "absolute inset-0 bg-gradient-to-br opacity-50",
                styles.bg
            )} />

            <CardHeader className="relative z-10 flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-400">{title}</CardTitle>
                <div className={cn(
                    "p-2 rounded-lg transition-all",
                    "bg-gray-700/50 group-hover:bg-gray-700",
                    styles.glow
                )}>
                    <Icon weight="bold" size={18} className={styles.icon} />
                </div>
            </CardHeader>
            <CardContent className="relative z-10">
                <div className="text-3xl font-bold text-white tabular-nums">{value}</div>
                {trendValue && (
                    <p className={cn(
                        'text-xs mt-1 flex items-center gap-1',
                        trend === 'up' ? 'text-emerald-400' : trend === 'down' ? 'text-red-400' : 'text-gray-400'
                    )}>
                        {trend === 'up' && <TrendUp weight="bold" size={14} />}
                        {trend === 'down' && <TrendDown weight="bold" size={14} />}
                        <span>{trendValue}</span>
                    </p>
                )}
            </CardContent>
        </Card>
    );
}
