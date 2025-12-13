'use client';

import { LucideIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface StatsCardProps {
    title: string;
    value: number | string;
    icon: LucideIcon;
    variant?: 'primary' | 'success' | 'warning' | 'danger';
    trend?: 'up' | 'down';
    trendValue?: string;
}

const variantStyles = {
    primary: 'text-primary',
    success: 'text-green-600',
    warning: 'text-yellow-600',
    danger: 'text-red-600',
};

export function StatsCard({
    title,
    value,
    icon: Icon,
    variant = 'primary',
    trend,
    trendValue
}: StatsCardProps) {
    return (
        <Card className="card-highlight">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                <Icon className={cn('h-4 w-4', variantStyles[variant])} />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{value}</div>
                {trendValue && (
                    <p className={cn(
                        'text-xs mt-1 flex items-center gap-1',
                        trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-muted-foreground'
                    )}>
                        {trend === 'up' && '↑'}
                        {trend === 'down' && '↓'}
                        <span>{trendValue}</span>
                    </p>
                )}
            </CardContent>
        </Card>
    );
}
