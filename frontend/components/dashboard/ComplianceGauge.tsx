'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface ComplianceGaugeProps {
    score: number; // 0-100
}

export function ComplianceGauge({ score }: ComplianceGaugeProps) {
    const getColor = (score: number) => {
        if (score >= 80) return 'text-green-600';
        if (score >= 60) return 'text-yellow-600';
        return 'text-red-600';
    };

    return (
        <Card className="card-highlight">
            <CardHeader>
                <CardTitle>Compliance Score</CardTitle>
                <CardDescription>OSHA standards compliance</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center py-8">
                {/* Circular Progress */}
                <div className="relative w-48 h-48">
                    {/* Background Circle */}
                    <svg className="w-full h-full transform -rotate-90">
                        <circle
                            cx="96"
                            cy="96"
                            r="88"
                            stroke="hsl(var(--border))"
                            strokeWidth="12"
                            fill="none"
                        />
                        {/* Progress Circle */}
                        <circle
                            cx="96"
                            cy="96"
                            r="88"
                            stroke="url(#gradient)"
                            strokeWidth="12"
                            fill="none"
                            strokeDasharray={`${(score / 100) * 553} 553`}
                            strokeLinecap="round"
                            className="transition-all duration-1000 ease-out"
                        />
                        <defs>
                            <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                {score >= 80 ? (
                                    <>
                                        <stop offset="0%" stopColor="#16a34a" />
                                        <stop offset="100%" stopColor="#4ade80" />
                                    </>
                                ) : score >= 60 ? (
                                    <>
                                        <stop offset="0%" stopColor="#ca8a04" />
                                        <stop offset="100%" stopColor="#facc15" />
                                    </>
                                ) : (
                                    <>
                                        <stop offset="0%" stopColor="#dc2626" />
                                        <stop offset="100%" stopColor="#f87171" />
                                    </>
                                )}
                            </linearGradient>
                        </defs>
                    </svg>

                    {/* Score Text */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className={cn('text-5xl font-bold', getColor(score))}>
                            {score}%
                        </span>
                        <span className="text-sm text-muted-foreground mt-1">
                            {score >= 80 ? 'Excellent' : score >= 60 ? 'Good' : 'Needs Improvement'}
                        </span>
                    </div>
                </div>

                {/* Legend */}
                <div className="mt-6 grid grid-cols-3 gap-4 text-center text-xs">
                    <div>
                        <div className="w-3 h-3 rounded-full bg-red-600 mx-auto mb-1" />
                        <span className="text-muted-foreground">&lt;60%</span>
                    </div>
                    <div>
                        <div className="w-3 h-3 rounded-full bg-yellow-600 mx-auto mb-1" />
                        <span className="text-muted-foreground">60-79%</span>
                    </div>
                    <div>
                        <div className="w-3 h-3 rounded-full bg-green-600 mx-auto mb-1" />
                        <span className="text-muted-foreground">80%+</span>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
