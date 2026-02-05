'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface ComplianceGaugeProps {
    score: number; // 0-100
}

export function ComplianceGauge({ score }: ComplianceGaugeProps) {
    const getColorClass = (score: number) => {
        if (score >= 80) return 'text-success';
        if (score >= 60) return 'text-warning';
        return 'text-destructive';
    };

    return (
        <div className="bg-card border border-white/5 rounded-xl p-6 h-full flex flex-col items-center">
            <div className="w-full mb-6">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary mb-1 block text-center">Protocol Adherence</span>
                <h3 className="text-lg font-semibold text-foreground tracking-tight text-center">Safety Index</h3>
            </div>

            <div className="relative w-40 h-40">
                {/* Precision Segment Indicators */}
                <div className="absolute inset-0 flex items-center justify-center rotate-[135deg]">
                    <svg viewBox="0 0 100 100" className="w-full h-full">
                        <circle
                            cx="50"
                            cy="50"
                            r="45"
                            fill="none"
                            stroke="rgba(255,255,255,0.05)"
                            strokeWidth="4"
                            strokeDasharray="212 283"
                            strokeLinecap="round"
                        />
                        <circle
                            cx="50"
                            cy="50"
                            r="45"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="5"
                            strokeDasharray={`${(score / 100) * 212} 283`}
                            strokeLinecap="round"
                            className={cn("transition-all duration-1000 ease-in-out", getColorClass(score))}
                        />
                    </svg>
                </div>

                {/* Technical Value Center */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className={cn('text-4xl font-bold font-mono tracking-tighter', getColorClass(score))}>
                        {score}
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-1">Score Matrix</span>
                </div>

                {/* Technical Index Markers */}
                <div className="absolute -inset-2 pointer-events-none">
                    {[0, 25, 50, 75, 100].map((marker) => (
                        <div
                            key={marker}
                            className="absolute w-full h-full flex items-start justify-center"
                            style={{ transform: `rotate(${(marker * 2.7) - 135}deg)` }}
                        >
                            <div className="h-1.5 w-[1px] bg-white/10" />
                        </div>
                    ))}
                </div>
            </div>

            {/* Technical Calibration Data */}
            <div className="mt-8 w-full grid grid-cols-2 gap-4 border-t border-white/5 pt-4">
                <div className="flex flex-col">
                    <span className="text-[9px] uppercase tracking-widest text-muted-foreground font-bold">Health Level</span>
                    <span className={cn("text-xs font-bold uppercase tracking-wide", getColorClass(score))}>
                        {score >= 80 ? 'Optimal' : score >= 60 ? 'Standard' : 'Substandard'}
                    </span>
                </div>
                <div className="flex flex-col text-right">
                    <span className="text-[9px] uppercase tracking-widest text-muted-foreground font-bold">Calibration</span>
                    <span className="text-xs font-bold text-foreground">Verified</span>
                </div>
            </div>
        </div>
    );
}
