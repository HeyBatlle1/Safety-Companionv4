'use client';

/**
 * Agent2Card - Risk Assessment
 * Displays Agent 2's hazard analysis with risk scores and controls
 */

import React, { useState } from 'react';
import {
    ChevronDown,
    TrendingUp,
    Shield,
    AlertTriangle
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface Agent2CardProps {
    data: any;
    defaultExpanded?: boolean;
}

interface Hazard {
    name: string;
    category?: string;
    riskScore: number;
    riskLevel: string;
    probability?: number;
    consequence?: string;
    existingControls?: string[];
    inadequateControls?: string[];
    recommendedControls?: string[];
    oshaContext?: string;
    regulatoryRequirement?: string;
}

export function Agent2Card({ data, defaultExpanded = true }: Agent2CardProps) {
    const [isExpanded, setIsExpanded] = useState(defaultExpanded);

    const hazards: Hazard[] = data?.hazards || data?.riskProfile?.hazards || [];
    const topHazard = hazards[0] || { riskScore: 0, riskLevel: 'UNKNOWN' };
    const industryContext = data?.riskSummary?.industryContext || '';
    const overallRiskLevel = data?.riskSummary?.overallRiskLevel || topHazard.riskLevel;

    const riskColor = getRiskLevelColor(topHazard.riskLevel);

    return (
        <Card className="overflow-hidden border-slate-200 dark:border-slate-700/50 hover:border-purple-500/30 transition-all duration-300">
            {/* Card Header */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full p-6 flex items-center justify-between cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
            >
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center">
                        <span className="text-2xl">📊</span>
                    </div>

                    <div className="text-left">
                        <h3 className="text-lg font-bold flex items-center gap-2">
                            Agent 2: Risk Assessor
                            <span className="text-xs text-muted-foreground font-normal">Gemini 2.5 Flash</span>
                        </h3>
                        <div className="flex items-center gap-3 mt-1">
                            <span className={`text-sm font-semibold ${riskColor.text}`}>
                                Top Risk: {topHazard.riskScore}/100
                            </span>
                            <Badge variant="outline" className={`${riskColor.bg} ${riskColor.text} ${riskColor.border}`}>
                                {overallRiskLevel}
                            </Badge>
                        </div>
                    </div>
                </div>

                <ChevronDown
                    className={`w-6 h-6 text-muted-foreground transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
                />
            </button>

            {/* Expanded Content */}
            {isExpanded && (
                <CardContent className="border-t p-6 space-y-6">
                    {/* Risk Score Gauge */}
                    <div className="flex items-center gap-6">
                        <RiskGauge score={topHazard.riskScore} />

                        <div className="flex-1">
                            <h4 className="font-bold mb-2">Risk Overview</h4>
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Overall Risk</span>
                                    <span className="font-semibold">{topHazard.riskScore}/100</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Hazards Identified</span>
                                    <span>{hazards.length}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Risk Level</span>
                                    <span className={`font-semibold ${riskColor.text}`}>{overallRiskLevel}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Hazard Details */}
                    {hazards.map((hazard, idx) => (
                        <HazardCard key={idx} hazard={hazard} index={idx} />
                    ))}

                    {/* Industry Context */}
                    {industryContext && (
                        <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-4">
                            <h4 className="text-sm font-bold text-blue-500 mb-2 flex items-center gap-2">
                                <TrendingUp className="w-4 h-4" />
                                Industry Context
                            </h4>
                            <p className="text-sm text-muted-foreground">
                                {industryContext}
                            </p>
                        </div>
                    )}
                </CardContent>
            )}
        </Card>
    );
}

// Risk Gauge Component
function RiskGauge({ score }: { score: number }) {
    const getColor = (s: number) => {
        if (s >= 95) return '#ef4444'; // red-500
        if (s >= 75) return '#f97316'; // orange-500
        if (s >= 50) return '#eab308'; // yellow-500
        return '#22c55e'; // green-500
    };

    const circumference = 2 * Math.PI * 40;
    const strokeDashoffset = circumference - (score / 100) * circumference;
    const color = getColor(score);

    return (
        <div className="relative w-28 h-28">
            <svg className="transform -rotate-90 w-28 h-28">
                {/* Background circle */}
                <circle
                    cx="56"
                    cy="56"
                    r="40"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="transparent"
                    className="text-slate-200 dark:text-slate-700"
                />
                {/* Progress circle */}
                <circle
                    cx="56"
                    cy="56"
                    r="40"
                    stroke={color}
                    strokeWidth="8"
                    fill="transparent"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dashoffset 1s ease-out' }}
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold">{score}</span>
                <span className="text-xs text-muted-foreground">/ 100</span>
            </div>
        </div>
    );
}

// Hazard Card Component
function HazardCard({ hazard, index }: { hazard: Hazard; index: number }) {
    const riskColor = getRiskLevelColor(hazard.riskLevel);

    return (
        <div className={`bg-slate-50 dark:bg-slate-700/30 border ${riskColor.border} rounded-lg p-4`}>
            {/* Hazard Header */}
            <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                    <h5 className="font-bold mb-1">Hazard #{index + 1}</h5>
                    <p className="text-sm text-muted-foreground">{hazard.name}</p>
                    {hazard.category && (
                        <Badge variant="outline" className="mt-1 text-xs">{hazard.category}</Badge>
                    )}
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${riskColor.bg} ${riskColor.text}`}>
                    {hazard.riskScore}
                </span>
            </div>

            {/* Probability & Consequence */}
            {(hazard.probability || hazard.consequence) && (
                <div className="grid grid-cols-2 gap-4 mb-3">
                    {hazard.probability && (
                        <div>
                            <div className="text-xs text-muted-foreground mb-1">Probability</div>
                            <div className="text-sm font-semibold">
                                {typeof hazard.probability === 'number' && hazard.probability <= 1
                                    ? `${(hazard.probability * 100).toFixed(1)}%`
                                    : `${hazard.probability}%`}
                            </div>
                        </div>
                    )}
                    {hazard.consequence && (
                        <div>
                            <div className="text-xs text-muted-foreground mb-1">Consequence</div>
                            <div className={`text-sm font-semibold ${hazard.consequence === 'Fatal' ? 'text-red-500' :
                                    hazard.consequence === 'Critical' ? 'text-orange-500' :
                                        hazard.consequence === 'Serious' ? 'text-yellow-500' :
                                            'text-green-500'
                                }`}>
                                {hazard.consequence}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Existing Controls */}
            {hazard.existingControls && hazard.existingControls.length > 0 && (
                <div className="mb-3">
                    <div className="text-xs font-bold text-green-600 dark:text-green-400 mb-2 flex items-center gap-1">
                        <Shield className="w-3 h-3" />
                        Existing Controls:
                    </div>
                    <ul className="space-y-1">
                        {hazard.existingControls.slice(0, 3).map((control, idx) => (
                            <li key={idx} className="text-xs flex items-start gap-2">
                                <span className="text-green-500">✓</span>
                                {control}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Inadequate Controls */}
            {hazard.inadequateControls && hazard.inadequateControls.length > 0 && (
                <div className="mb-3">
                    <div className="text-xs font-bold text-red-600 dark:text-red-400 mb-2">Inadequate Controls:</div>
                    <ul className="space-y-1">
                        {hazard.inadequateControls.map((control, idx) => (
                            <li key={idx} className="text-xs flex items-start gap-2">
                                <span className="text-red-500">✗</span>
                                {control}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Recommended Controls */}
            {hazard.recommendedControls && hazard.recommendedControls.length > 0 && (
                <div>
                    <div className="text-xs font-bold text-blue-600 dark:text-blue-400 mb-2 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        Recommended Controls:
                    </div>
                    <ul className="space-y-1">
                        {hazard.recommendedControls.slice(0, 3).map((control, idx) => (
                            <li key={idx} className="text-xs flex items-start gap-2">
                                <span className="text-blue-500">→</span>
                                {control}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Regulatory Requirement */}
            {hazard.regulatoryRequirement && (
                <div className="mt-3 pt-3 border-t text-xs text-muted-foreground">
                    <span className="font-medium">Regulatory: </span>
                    {hazard.regulatoryRequirement}
                </div>
            )}
        </div>
    );
}

// Helper function
function getRiskLevelColor(level: string) {
    const colorMap: Record<string, { text: string; bg: string; border: string }> = {
        'EXTREME': {
            text: 'text-red-500',
            bg: 'bg-red-500/10',
            border: 'border-red-500/30'
        },
        'HIGH': {
            text: 'text-orange-500',
            bg: 'bg-orange-500/10',
            border: 'border-orange-500/30'
        },
        'MEDIUM': {
            text: 'text-yellow-500',
            bg: 'bg-yellow-500/10',
            border: 'border-yellow-500/30'
        },
        'LOW': {
            text: 'text-green-500',
            bg: 'bg-green-500/10',
            border: 'border-green-500/30'
        }
    };
    return colorMap[level] || colorMap['MEDIUM'];
}
