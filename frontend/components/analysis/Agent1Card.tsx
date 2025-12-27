'use client';

/**
 * Agent1Card - Data Quality Assessment
 * Displays Agent 1's validation output with quality scores and gaps
 */

import React, { useState } from 'react';
import {
    ChevronDown,
    CheckCircle2,
    XCircle,
    AlertCircle,
    CloudRain,
    Thermometer,
    Wind
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface Agent1CardProps {
    data: any;
    defaultExpanded?: boolean;
}

export function Agent1Card({ data, defaultExpanded = true }: Agent1CardProps) {
    const [isExpanded, setIsExpanded] = useState(defaultExpanded);

    const qualityScore = data?.qualityScore || data?.validation?.qualityScore || 0;
    const dataQuality = data?.dataQuality || data?.validation?.dataQuality || 'UNKNOWN';
    const missingCritical = data?.missingCritical || [];
    const weatherRisks = data?.weatherRisks || data?.weatherData?.alerts || [];
    const concerns = data?.concerns || {};
    const weatherData = data?.weatherData || {};

    const qualityConfig: Record<string, { color: string; bg: string; border: string }> = {
        HIGH: { color: 'text-green-500', bg: 'bg-green-500/10', border: 'border-green-500/30' },
        MEDIUM: { color: 'text-yellow-500', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30' },
        LOW: { color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/30' }
    };

    const config = qualityConfig[dataQuality] || qualityConfig['MEDIUM'];

    return (
        <Card className="overflow-hidden border-slate-200 dark:border-slate-700/50 hover:border-cyan-500/30 transition-all duration-300">
            {/* Card Header - Always Visible */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full p-6 flex items-center justify-between cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
            >
                <div className="flex items-center gap-4">
                    {/* Agent Icon */}
                    <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
                        <span className="text-2xl">🔍</span>
                    </div>

                    {/* Agent Info */}
                    <div className="text-left">
                        <h3 className="text-lg font-bold flex items-center gap-2">
                            Agent 1: Data Validator
                            <span className="text-xs text-muted-foreground font-normal">Gemini 2.5 Flash</span>
                        </h3>
                        <div className="flex items-center gap-3 mt-1">
                            <span className={`text-sm font-semibold ${config.color}`}>
                                Quality Score: {qualityScore}/10
                            </span>
                            <Badge variant="outline" className={`${config.bg} ${config.color} ${config.border}`}>
                                {dataQuality}
                            </Badge>
                        </div>
                    </div>
                </div>

                {/* Expand Icon */}
                <ChevronDown
                    className={`w-6 h-6 text-muted-foreground transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
                />
            </button>

            {/* Expanded Content */}
            {isExpanded && (
                <CardContent className="border-t p-6 space-y-6">
                    {/* Quality Score Visualization */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-muted-foreground">Data Completeness</span>
                            <span className="text-sm font-semibold">{qualityScore * 10}%</span>
                        </div>
                        <Progress value={qualityScore * 10} className="h-3" />
                    </div>

                    {/* Missing Critical Fields */}
                    {missingCritical.length > 0 && (
                        <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-4">
                            <h4 className="text-sm font-bold text-red-500 mb-3 flex items-center gap-2">
                                <XCircle className="w-4 h-4" />
                                Critical Gaps ({missingCritical.length})
                            </h4>
                            <ul className="space-y-2">
                                {missingCritical.map((field: string, idx: number) => (
                                    <li key={idx} className="flex items-start gap-2 text-sm">
                                        <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 flex-shrink-0" />
                                        {field}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Weather Conditions */}
                    {(weatherData.temperature || weatherData.windSpeed) && (
                        <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-4">
                            <h4 className="text-sm font-bold text-blue-500 mb-3 flex items-center gap-2">
                                <CloudRain className="w-4 h-4" />
                                Weather Conditions
                            </h4>
                            <div className="grid grid-cols-3 gap-4 text-sm">
                                <div className="flex items-center gap-2">
                                    <Thermometer className="w-4 h-4 text-blue-400" />
                                    <span>{weatherData.temperature || 'N/A'}°F</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Wind className="w-4 h-4 text-blue-400" />
                                    <span>{weatherData.windSpeed || 'N/A'} mph</span>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Humidity: </span>
                                    <span>{weatherData.humidity || 'N/A'}%</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Weather Risks */}
                    {weatherRisks.length > 0 && (
                        <div className="bg-orange-500/5 border border-orange-500/20 rounded-lg p-4">
                            <h4 className="text-sm font-bold text-orange-500 mb-3">Weather Risks</h4>
                            <ul className="space-y-2">
                                {weatherRisks.map((risk: string, idx: number) => (
                                    <li key={idx} className="text-sm flex items-start gap-2">
                                        <span className="text-orange-500">⚠️</span>
                                        {risk}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Concerns by Priority */}
                    {Object.keys(concerns).length > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {concerns.CRITICAL?.length > 0 && (
                                <ConcernBadge level="CRITICAL" items={concerns.CRITICAL} color="red" />
                            )}
                            {concerns.HIGH?.length > 0 && (
                                <ConcernBadge level="HIGH" items={concerns.HIGH} color="orange" />
                            )}
                            {concerns.MEDIUM?.length > 0 && (
                                <ConcernBadge level="MEDIUM" items={concerns.MEDIUM} color="yellow" />
                            )}
                            {concerns.LOW?.length > 0 && (
                                <ConcernBadge level="LOW" items={concerns.LOW} color="green" />
                            )}
                        </div>
                    )}
                </CardContent>
            )}
        </Card>
    );
}

// Helper Component
function ConcernBadge({ level, items, color }: { level: string; items: string[]; color: string }) {
    const colorMap: Record<string, string> = {
        red: 'bg-red-500/10 border-red-500/30 text-red-500',
        orange: 'bg-orange-500/10 border-orange-500/30 text-orange-500',
        yellow: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-500',
        green: 'bg-green-500/10 border-green-500/30 text-green-500'
    };

    return (
        <div className={`p-3 rounded-lg border ${colorMap[color]}`}>
            <div className="text-xs font-bold mb-2">{level}</div>
            <div className="text-xs text-muted-foreground">{items.length} issue{items.length > 1 ? 's' : ''}</div>
        </div>
    );
}
