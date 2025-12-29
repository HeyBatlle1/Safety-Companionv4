'use client';

import { CheckCircle, XCircle, Warning, Clock, Spinner } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

type StatusType = 'GO' | 'NO_GO' | 'CONDITIONS' | 'PENDING' | 'LOADING';

interface StatusBadgeProps {
    status: StatusType;
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}

const statusConfig = {
    GO: {
        label: 'GO',
        icon: CheckCircle,
        bgGradient: 'bg-gradient-to-r from-emerald-500 to-emerald-600',
        textColor: 'text-white',
        glowColor: 'shadow-emerald-500/50',
        ringColor: 'ring-emerald-400/30',
    },
    NO_GO: {
        label: 'NO GO',
        icon: XCircle,
        bgGradient: 'bg-gradient-to-r from-red-500 to-red-600',
        textColor: 'text-white',
        glowColor: 'shadow-red-500/50',
        ringColor: 'ring-red-400/30',
    },
    CONDITIONS: {
        label: 'CONDITIONS',
        icon: Warning,
        bgGradient: 'bg-gradient-to-r from-amber-500 to-amber-600',
        textColor: 'text-white',
        glowColor: 'shadow-amber-500/50',
        ringColor: 'ring-amber-400/30',
    },
    PENDING: {
        label: 'PENDING',
        icon: Clock,
        bgGradient: 'bg-gradient-to-r from-gray-500 to-gray-600',
        textColor: 'text-white',
        glowColor: 'shadow-gray-500/30',
        ringColor: 'ring-gray-400/30',
    },
    LOADING: {
        label: 'ANALYZING',
        icon: Spinner,
        bgGradient: 'bg-gradient-to-r from-blue-500 to-blue-600',
        textColor: 'text-white',
        glowColor: 'shadow-blue-500/30',
        ringColor: 'ring-blue-400/30',
    },
};

const sizeClasses = {
    sm: {
        padding: 'px-2.5 py-1',
        text: 'text-xs',
        icon: 14,
        gap: 'gap-1',
    },
    md: {
        padding: 'px-4 py-2',
        text: 'text-sm',
        icon: 18,
        gap: 'gap-2',
    },
    lg: {
        padding: 'px-6 py-3',
        text: 'text-base',
        icon: 24,
        gap: 'gap-2',
    },
};

export function StatusBadge({ status, size = 'md', className }: StatusBadgeProps) {
    const config = statusConfig[status];
    const sizeConfig = sizeClasses[size];
    const Icon = config.icon;
    const isLoading = status === 'LOADING';

    return (
        <span
            className={cn(
                "inline-flex items-center justify-center",
                "rounded-full font-bold uppercase tracking-wide",
                "shadow-lg ring-2",
                sizeConfig.padding,
                sizeConfig.text,
                sizeConfig.gap,
                config.bgGradient,
                config.textColor,
                config.glowColor,
                config.ringColor,
                "transition-all duration-200",
                "hover:scale-105",
                className
            )}
        >
            <Icon
                weight="bold"
                size={sizeConfig.icon}
                className={isLoading ? 'animate-spin' : ''}
            />
            {config.label}
        </span>
    );
}

// Simplified decision badge for inline use
interface DecisionBadgeProps {
    decision: 'GO' | 'NO_GO' | 'GO_WITH_CONDITIONS' | 'STOP_WORK' | string;
    className?: string;
}

export function DecisionBadge({ decision, className }: DecisionBadgeProps) {
    const normalizedDecision = decision.toUpperCase().replace(/\s+/g, '_');

    let status: StatusType = 'PENDING';
    if (normalizedDecision === 'GO') status = 'GO';
    else if (normalizedDecision === 'NO_GO' || normalizedDecision === 'STOP_WORK') status = 'NO_GO';
    else if (normalizedDecision.includes('CONDITION')) status = 'CONDITIONS';

    return <StatusBadge status={status} size="sm" className={className} />;
}

// Risk score badge
interface RiskBadgeProps {
    score: number;
    className?: string;
}

export function RiskBadge({ score, className }: RiskBadgeProps) {
    let bgClass = 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
    if (score >= 70) {
        bgClass = 'bg-red-500/20 text-red-400 border-red-500/30';
    } else if (score >= 40) {
        bgClass = 'bg-amber-500/20 text-amber-400 border-amber-500/30';
    }

    return (
        <span className={cn(
            "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border",
            "tabular-nums",
            bgClass,
            className
        )}>
            Risk: {score}%
        </span>
    );
}
