'use client';

/**
 * Agent3Card - Incident Prediction (Swiss Cheese Model)
 * Displays Agent 3's causal chain, leading indicators, and interventions
 */

import React, { useState } from 'react';
import {
    ChevronDown,
    AlertTriangle,
    Eye,
    Shield,
    Clock,
    Target,
    Zap
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Agent3CardProps {
    data: any;
    defaultExpanded?: boolean;
}

interface CausalStage {
    stage: string;
    description: string;
    evidence?: string;
    why?: string;
    errorType?: string;
    timeToIntervene?: string;
    severity?: string;
}

interface Indicator {
    type: string;
    indicator: string;
    whereToLook?: string;
    whatToSee?: string;
    threshold?: string;
    actionRequired?: string;
}

interface Intervention {
    action: string;
    tier?: string;
    timeToImplement?: string;
    timeframe?: string;
    cost?: string;
    feasibility?: string;
    effectivenessReduction?: string;
    breaksChainAt?: string;
    reducesHarm?: string;
}

export function Agent3Card({ data, defaultExpanded = true }: Agent3CardProps) {
    const [isExpanded, setIsExpanded] = useState(defaultExpanded);

    // Handle different data structures from V3
    const incidentPrediction = data?.incidentPrediction || data;
    const incidentName = incidentPrediction?.incidentName || incidentPrediction?.scenario || 'Unknown Incident';
    const probability = incidentPrediction?.probabilityNext4Hours
        ? incidentPrediction.probabilityNext4Hours * 100
        : incidentPrediction?.probability || 0;
    const confidence = incidentPrediction?.confidence || 'MEDIUM';
    const timeframe = incidentPrediction?.timeframe || 'Next 4 hours';
    const severity = incidentPrediction?.severity || incidentPrediction?.projectedSeverity || 'Unknown';

    const causalChain: CausalStage[] = data?.causalChain?.defenseFailures?.map((d: any, i: number) => ({
        stage: d.barrier || `Stage ${i + 1}`,
        description: d.failureMode || '',
        evidence: d.evidence
    })) || incidentPrediction?.causalChain || [];

    const leadingIndicators: Indicator[] = data?.leadingIndicators || data?.swissCheeseAlignment?.leadingIndicators || [];
    const interventions = data?.interventions || incidentPrediction?.interventions || { preventive: [], mitigative: [] };

    const confidenceColor: Record<string, { text: string; bg: string; border: string }> = {
        HIGH: { text: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/30' },
        MEDIUM: { text: 'text-yellow-500', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30' },
        LOW: { text: 'text-green-500', bg: 'bg-green-500/10', border: 'border-green-500/30' }
    };

    const config = confidenceColor[confidence] || confidenceColor['MEDIUM'];

    return (
        <Card className="overflow-hidden border-slate-200 dark:border-slate-700/50 hover:border-red-500/30 transition-all duration-300">
            {/* Card Header */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full p-6 flex items-center justify-between cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
            >
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center">
                        <span className="text-2xl">🔮</span>
                    </div>

                    <div className="text-left">
                        <h3 className="text-lg font-bold flex items-center gap-2">
                            Agent 3: Incident Predictor
                            <span className="text-xs text-muted-foreground font-normal">Gemini 2.5 Flash</span>
                        </h3>
                        <div className="flex items-center gap-3 mt-1">
                            <span className={`text-sm font-semibold ${config.text}`}>
                                Probability: {probability.toFixed(0)}%
                            </span>
                            <Badge variant="outline" className={`${config.bg} ${config.text} ${config.border}`}>
                                {confidence} CONFIDENCE
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
                    {/* Incident Overview */}
                    <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6">
                        <div className="flex items-start gap-4 mb-4">
                            <AlertTriangle className="w-8 h-8 text-red-500 flex-shrink-0" />
                            <div className="flex-1">
                                <h4 className="text-lg font-bold text-red-500 mb-2">
                                    Predicted Incident
                                </h4>
                                <p className="text-sm leading-relaxed">
                                    {incidentName}
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-red-500/20">
                            <div>
                                <div className="text-xs text-muted-foreground mb-1">Timeframe</div>
                                <div className="text-sm font-semibold flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-red-500" />
                                    {timeframe}
                                </div>
                            </div>
                            <div>
                                <div className="text-xs text-muted-foreground mb-1">Severity</div>
                                <div className="text-sm font-semibold flex items-center gap-2">
                                    <Target className="w-4 h-4 text-red-500" />
                                    <Badge variant={severity === 'Fatal' || severity === 'Critical' ? 'destructive' : 'default'}>
                                        {severity}
                                    </Badge>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Tabs for Causal Chain, Indicators, Interventions */}
                    <Tabs defaultValue="chain" className="w-full">
                        <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="chain" className="text-xs">
                                <Zap className="w-3 h-3 mr-1" />
                                Causal Chain
                            </TabsTrigger>
                            <TabsTrigger value="indicators" className="text-xs">
                                <Eye className="w-3 h-3 mr-1" />
                                Indicators
                            </TabsTrigger>
                            <TabsTrigger value="interventions" className="text-xs">
                                <Shield className="w-3 h-3 mr-1" />
                                Interventions
                            </TabsTrigger>
                        </TabsList>

                        {/* Causal Chain Tab */}
                        <TabsContent value="chain" className="space-y-3 mt-4">
                            <div className="text-sm font-semibold text-muted-foreground mb-4">
                                Swiss Cheese Model: How the incident unfolds
                            </div>

                            {causalChain.length > 0 ? (
                                causalChain.map((stage: CausalStage, idx: number) => (
                                    <div key={idx} className="relative">
                                        {/* Connector Line */}
                                        {idx < causalChain.length - 1 && (
                                            <div className="absolute left-6 top-16 w-0.5 h-8 bg-gradient-to-b from-red-500/50 to-transparent" />
                                        )}

                                        <div className="bg-slate-50 dark:bg-slate-700/30 border border-slate-200 dark:border-slate-600/30 rounded-lg p-4 hover:border-red-500/30 transition-colors">
                                            <div className="flex items-start gap-3">
                                                <div className="flex flex-col items-center gap-2">
                                                    <div className="w-12 h-12 rounded-full bg-red-500/10 border-2 border-red-500/30 flex items-center justify-center flex-shrink-0">
                                                        <span className="text-xl">🧀</span>
                                                    </div>
                                                    <span className="text-xs font-bold text-muted-foreground">#{idx + 1}</span>
                                                </div>

                                                <div className="flex-1">
                                                    <h5 className="text-sm font-bold text-red-500 mb-2">
                                                        {stage.stage}
                                                    </h5>
                                                    <p className="text-sm text-muted-foreground mb-2 leading-relaxed">
                                                        {stage.description}
                                                    </p>

                                                    {stage.evidence && (
                                                        <div className="mt-2 p-2 bg-slate-100 dark:bg-slate-800/50 rounded text-xs text-muted-foreground border-l-2 border-yellow-500/50">
                                                            <span className="font-semibold text-yellow-600 dark:text-yellow-400">Evidence:</span> {stage.evidence}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-sm text-muted-foreground">No causal chain data available</p>
                            )}
                        </TabsContent>

                        {/* Leading Indicators Tab */}
                        <TabsContent value="indicators" className="space-y-4 mt-4">
                            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                                <div className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400 mb-2">
                                    <Eye className="w-5 h-5" />
                                    <h4 className="font-bold">Observable Warning Signs</h4>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    Supervisors can see these conditions RIGHT NOW. Taking action on these indicators can prevent the predicted incident.
                                </p>
                            </div>

                            {leadingIndicators.length > 0 ? (
                                leadingIndicators.map((indicator: Indicator, idx: number) => (
                                    <div key={idx} className="border rounded-lg p-4 bg-slate-50 dark:bg-slate-700/30">
                                        <div className="flex items-start gap-3">
                                            <span className="text-2xl">{getIndicatorIcon(indicator.type)}</span>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Badge variant="outline" className="text-xs uppercase">
                                                        {indicator.type}
                                                    </Badge>
                                                </div>

                                                <h5 className="font-semibold mb-2">
                                                    {indicator.indicator}
                                                </h5>

                                                <div className="space-y-2 text-sm">
                                                    {indicator.whereToLook && (
                                                        <div className="flex gap-2">
                                                            <span className="text-muted-foreground font-medium min-w-[60px]">Where:</span>
                                                            <span>{indicator.whereToLook}</span>
                                                        </div>
                                                    )}

                                                    {indicator.actionRequired && (
                                                        <div className="mt-3 p-3 bg-green-500/10 rounded border-l-2 border-green-500/50">
                                                            <div className="text-xs font-bold text-green-600 dark:text-green-400 mb-1">ACTION REQUIRED:</div>
                                                            <div className="text-xs">{indicator.actionRequired}</div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-sm text-muted-foreground">No leading indicators data available</p>
                            )}
                        </TabsContent>

                        {/* Interventions Tab */}
                        <TabsContent value="interventions" className="space-y-4 mt-4">
                            {/* Array format (from Agent3) */}
                            {Array.isArray(interventions) && interventions.length > 0 ? (
                                <div className="space-y-3">
                                    {interventions.map((intervention: Intervention, idx: number) => (
                                        <div key={idx} className="border rounded-lg p-4 bg-green-500/5 border-green-500/20">
                                            <div className="flex items-start gap-3">
                                                <span className="text-2xl">🛡️</span>
                                                <div className="flex-1">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <Badge variant="outline" className="text-xs">
                                                            {intervention.timeframe || intervention.tier || 'Action'}
                                                        </Badge>
                                                    </div>
                                                    <p className="font-semibold">{intervention.action}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : null}

                            {/* Object format with preventive/mitigative */}
                            {!Array.isArray(interventions) && (
                                <>
                                    {/* Preventive */}
                                    {interventions.preventive?.length > 0 && (
                                        <div>
                                            <h4 className="text-sm font-bold mb-3 flex items-center gap-2">
                                                <Shield className="w-4 h-4 text-green-500" />
                                                Preventive Barriers
                                            </h4>
                                            <div className="space-y-3">
                                                {interventions.preventive.map((intervention: Intervention, idx: number) => (
                                                    <div key={idx} className="border rounded-lg p-4 bg-green-500/5 border-green-500/20">
                                                        <p className="font-semibold">{intervention.action}</p>
                                                        <div className="grid grid-cols-3 gap-3 mt-2 text-xs">
                                                            {intervention.tier && (
                                                                <div>
                                                                    <span className="text-muted-foreground">Tier: </span>
                                                                    <span className="font-medium">{intervention.tier}</span>
                                                                </div>
                                                            )}
                                                            {intervention.timeToImplement && (
                                                                <div>
                                                                    <span className="text-muted-foreground">Time: </span>
                                                                    <span className="font-medium">{intervention.timeToImplement}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Mitigative */}
                                    {interventions.mitigative?.length > 0 && (
                                        <div>
                                            <h4 className="text-sm font-bold mt-4 mb-3 flex items-center gap-2">
                                                <AlertTriangle className="w-4 h-4 text-orange-500" />
                                                Mitigative Barriers
                                            </h4>
                                            <div className="space-y-2">
                                                {interventions.mitigative.map((mitigation: Intervention, idx: number) => (
                                                    <div key={idx} className="bg-orange-500/5 border border-orange-500/20 rounded-lg p-3">
                                                        <div className="text-sm font-medium">{mitigation.action}</div>
                                                        {mitigation.reducesHarm && (
                                                            <div className="text-xs text-muted-foreground mt-1">{mitigation.reducesHarm}</div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Recommended */}
                                    {interventions.recommended && (
                                        <div className="bg-gradient-to-r from-green-500/20 to-blue-500/20 border border-green-500/30 rounded-lg p-4">
                                            <div className="flex items-center gap-2 text-green-500 mb-2">
                                                <Zap className="w-5 h-5" />
                                                <h4 className="font-bold">Recommended Approach</h4>
                                            </div>
                                            <p className="text-sm leading-relaxed">
                                                {interventions.recommended}
                                            </p>
                                        </div>
                                    )}
                                </>
                            )}
                        </TabsContent>
                    </Tabs>
                </CardContent>
            )}
        </Card>
    );
}

function getIndicatorIcon(type: string) {
    const icons: Record<string, string> = {
        'Behavioral': '👥',
        'Environmental': '🌍',
        'Organizational': '🏢',
        'Near-Miss': '⚠️'
    };
    return icons[type] || '📌';
}
