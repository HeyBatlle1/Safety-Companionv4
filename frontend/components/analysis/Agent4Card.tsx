'use client';

/**
 * Agent4Card - Actions & Compliance Summary
 * Displays Agent 4's synthesized action items, compliance gaps, and approvals
 */

import React, { useState } from 'react';
import {
    ChevronDown,
    CheckCircle2,
    XCircle,
    AlertTriangle,
    Shield,
    FileText,
    Users,
    Clipboard
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';

interface Agent4CardProps {
    data: any;
    defaultExpanded?: boolean;
}

interface ActionItem {
    priority: string;
    action: string;
    timeframe?: string;
    responsibleParty?: string;
    reason?: string;
}

interface ComplianceGap {
    gap: string;
    source?: string;
    severity?: string;
    citation?: string;
    standard?: string;
    description?: string;
    correctiveAction?: string;
}

export function Agent4Card({ data, defaultExpanded = true }: Agent4CardProps) {
    const [isExpanded, setIsExpanded] = useState(defaultExpanded);

    // Extract data from various structures
    const actionItems: ActionItem[] = data?.actionItems || [];
    const complianceGaps: ComplianceGap[] = data?.complianceGaps || data?.complianceStatus?.identifiedGaps || [];
    const emergencyReadiness = data?.emergencyReadiness || {};
    const approvals = data?.approvals || {};
    const goNoGo = data?.goNoGo || data?.executiveSummary || {};

    // Count action items by priority
    const criticalCount = actionItems.filter(a => a.priority === 'CRITICAL').length;
    const highCount = actionItems.filter(a => a.priority === 'HIGH').length;
    const totalCount = actionItems.length;

    // Emergency readiness status
    const readinessLevel = emergencyReadiness.readinessLevel ||
        (emergencyReadiness.rescueCapability === 'ADEQUATE' && emergencyReadiness.firstAid ? 'ADEQUATE' : 'PARTIAL');

    return (
        <Card className="overflow-hidden border-slate-200 dark:border-slate-700/50 hover:border-blue-500/30 transition-all duration-300">
            {/* Card Header */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full p-6 flex items-center justify-between cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
            >
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center">
                        <span className="text-2xl">✅</span>
                    </div>

                    <div className="text-left">
                        <h3 className="text-lg font-bold flex items-center gap-2">
                            Agent 4: Synthesis & Actions
                            <span className="text-xs text-muted-foreground font-normal">Gemini 2.5 Flash</span>
                        </h3>
                        <div className="flex items-center gap-3 mt-1">
                            <span className="text-sm font-semibold">
                                {totalCount} Action Items
                            </span>
                            {criticalCount > 0 && (
                                <Badge variant="destructive" className="text-xs">
                                    {criticalCount} Critical
                                </Badge>
                            )}
                            {highCount > 0 && (
                                <Badge variant="outline" className="text-xs bg-orange-500/10 text-orange-500 border-orange-500/30">
                                    {highCount} High
                                </Badge>
                            )}
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
                    {/* Go/No-Go Decision Banner */}
                    {goNoGo.decision && (
                        <div className={`rounded-xl p-4 border ${goNoGo.decision === 'GO' ? 'bg-green-500/10 border-green-500/30' :
                                goNoGo.decision === 'NO_GO' ? 'bg-red-500/10 border-red-500/30' :
                                    'bg-yellow-500/10 border-yellow-500/30'
                            }`}>
                            <div className="flex items-center gap-3">
                                {goNoGo.decision === 'GO' ? (
                                    <CheckCircle2 className="w-8 h-8 text-green-500" />
                                ) : goNoGo.decision === 'NO_GO' ? (
                                    <XCircle className="w-8 h-8 text-red-500" />
                                ) : (
                                    <AlertTriangle className="w-8 h-8 text-yellow-500" />
                                )}
                                <div>
                                    <h4 className="font-bold text-lg">
                                        {goNoGo.decision === 'GO' ? '✅ GO - Work May Proceed' :
                                            goNoGo.decision === 'NO_GO' ? '❌ NO GO - Work Cannot Proceed' :
                                                '⚠️ GO WITH CONDITIONS'}
                                    </h4>
                                    {goNoGo.conditions?.length > 0 && (
                                        <p className="text-sm text-muted-foreground mt-1">
                                            {goNoGo.conditions.length} condition(s) must be met
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Conditions */}
                            {goNoGo.conditions?.length > 0 && (
                                <div className="mt-4 pt-4 border-t border-current/20">
                                    <h5 className="text-sm font-bold mb-2">Conditions Required:</h5>
                                    <ul className="space-y-1">
                                        {goNoGo.conditions.map((condition: string, idx: number) => (
                                            <li key={idx} className="text-sm flex items-start gap-2">
                                                <span className="text-yellow-500 mt-0.5">→</span>
                                                {condition}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Action Items by Priority */}
                    <div>
                        <h4 className="font-bold mb-4 flex items-center gap-2">
                            <Clipboard className="w-5 h-5 text-primary" />
                            Action Items
                        </h4>

                        {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(priority => {
                            const items = actionItems.filter(a => a.priority === priority);
                            if (items.length === 0) return null;

                            const priorityConfig = getPriorityConfig(priority);

                            return (
                                <div key={priority} className="mb-4">
                                    <div className={`flex items-center gap-2 mb-3 ${priorityConfig.text}`}>
                                        <span className="text-lg">{priorityConfig.emoji}</span>
                                        <span className="font-bold text-sm">{priority} Priority ({items.length} items)</span>
                                    </div>
                                    <div className="space-y-2 pl-4 border-l-2 border-current/20">
                                        {items.map((item, idx) => (
                                            <div
                                                key={idx}
                                                className={`rounded-lg p-3 ${priorityConfig.bg} border ${priorityConfig.border}`}
                                            >
                                                <p className="font-medium text-sm">{item.action}</p>
                                                <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                                                    {item.timeframe && (
                                                        <span><strong>When:</strong> {item.timeframe}</span>
                                                    )}
                                                    {item.responsibleParty && (
                                                        <span><strong>Who:</strong> {item.responsibleParty}</span>
                                                    )}
                                                </div>
                                                {item.reason && (
                                                    <p className="text-xs text-muted-foreground mt-1 italic">
                                                        {item.reason}
                                                    </p>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}

                        {actionItems.length === 0 && (
                            <p className="text-sm text-muted-foreground">No action items generated</p>
                        )}
                    </div>

                    {/* Compliance Gaps */}
                    {complianceGaps.length > 0 && (
                        <div>
                            <h4 className="font-bold mb-4 flex items-center gap-2">
                                <Shield className="w-5 h-5 text-orange-500" />
                                Compliance Gaps ({complianceGaps.length})
                            </h4>
                            <div className="space-y-3">
                                {complianceGaps.map((gap, idx) => (
                                    <div
                                        key={idx}
                                        className="rounded-lg p-4 bg-orange-500/5 border border-orange-500/20"
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <p className="font-semibold text-sm">
                                                    {gap.standard || gap.citation || 'Compliance Gap'}
                                                </p>
                                                <p className="text-sm text-muted-foreground mt-1">
                                                    {gap.gap || gap.description}
                                                </p>
                                            </div>
                                            {gap.severity && (
                                                <Badge variant="outline" className={`text-xs ${gap.severity === 'CRITICAL' || gap.severity === 'HIGH'
                                                        ? 'bg-red-500/10 text-red-500 border-red-500/30'
                                                        : 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30'
                                                    }`}>
                                                    {gap.severity}
                                                </Badge>
                                            )}
                                        </div>
                                        {gap.correctiveAction && (
                                            <div className="mt-2 pt-2 border-t border-orange-500/20 text-xs">
                                                <strong className="text-green-600 dark:text-green-400">Fix: </strong>
                                                {gap.correctiveAction}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Emergency Readiness */}
                    <div>
                        <h4 className="font-bold mb-4 flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-red-500" />
                            Emergency Readiness
                            <Badge variant="outline" className={`ml-2 text-xs ${readinessLevel === 'ADEQUATE' ? 'bg-green-500/10 text-green-500 border-green-500/30' :
                                    readinessLevel === 'INADEQUATE' ? 'bg-red-500/10 text-red-500 border-red-500/30' :
                                        'bg-yellow-500/10 text-yellow-500 border-yellow-500/30'
                                }`}>
                                {readinessLevel}
                            </Badge>
                        </h4>

                        <div className="grid grid-cols-2 gap-3">
                            <ReadinessItem
                                label="Rescue Capability"
                                status={emergencyReadiness.rescueCapability === 'ADEQUATE'}
                            />
                            <ReadinessItem
                                label="First Aid Present"
                                status={emergencyReadiness.firstAidPresent || emergencyReadiness.firstAid}
                            />
                            <ReadinessItem
                                label="Emergency Contacts"
                                status={emergencyReadiness.emergencyContactsPresent}
                            />
                            <ReadinessItem
                                label="Evacuation Plan"
                                status={emergencyReadiness.evacuationPlanPresent}
                            />
                        </div>

                        {emergencyReadiness.gaps?.length > 0 && (
                            <div className="mt-4 rounded border border-red-500/20 bg-red-500/5 p-3">
                                <span className="text-xs font-bold text-red-500 block mb-2">Missing Components:</span>
                                <ul className="list-disc list-inside text-xs space-y-1">
                                    {emergencyReadiness.gaps.map((gap: string, i: number) => (
                                        <li key={i}>{gap}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>

                    {/* Required Approvals */}
                    {approvals.requiredSignatures?.length > 0 && (
                        <div>
                            <h4 className="font-bold mb-4 flex items-center gap-2">
                                <Users className="w-5 h-5 text-purple-500" />
                                Required Approvals
                            </h4>
                            <div className="space-y-2">
                                {approvals.requiredSignatures.map((sig: string, idx: number) => (
                                    <div key={idx} className="flex items-center gap-3 p-2 rounded border">
                                        <Checkbox id={`sig-${idx}`} disabled />
                                        <label htmlFor={`sig-${idx}`} className="text-sm">
                                            {sig}
                                        </label>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-3 flex gap-4 text-xs">
                                {approvals.competentPersonReview && (
                                    <span className="text-purple-500">✓ Competent Person Review Required</span>
                                )}
                                {approvals.managementReview && (
                                    <span className="text-purple-500">✓ Management Review Required</span>
                                )}
                            </div>
                        </div>
                    )}
                </CardContent>
            )}
        </Card>
    );
}

// Helper Components
function ReadinessItem({ label, status }: { label: string; status: boolean | undefined }) {
    return (
        <div className="flex items-center gap-2 text-sm">
            {status ? (
                <CheckCircle2 className="w-4 h-4 text-green-500" />
            ) : (
                <XCircle className="w-4 h-4 text-red-500" />
            )}
            <span className={status ? '' : 'text-muted-foreground'}>{label}</span>
        </div>
    );
}

function getPriorityConfig(priority: string) {
    const configs: Record<string, { emoji: string; text: string; bg: string; border: string }> = {
        'CRITICAL': {
            emoji: '🔴',
            text: 'text-red-500',
            bg: 'bg-red-500/5',
            border: 'border-red-500/20'
        },
        'HIGH': {
            emoji: '🟠',
            text: 'text-orange-500',
            bg: 'bg-orange-500/5',
            border: 'border-orange-500/20'
        },
        'MEDIUM': {
            emoji: '🟡',
            text: 'text-yellow-500',
            bg: 'bg-yellow-500/5',
            border: 'border-yellow-500/20'
        },
        'LOW': {
            emoji: '🟢',
            text: 'text-green-500',
            bg: 'bg-green-500/5',
            border: 'border-green-500/20'
        }
    };
    return configs[priority] || configs['MEDIUM'];
}
