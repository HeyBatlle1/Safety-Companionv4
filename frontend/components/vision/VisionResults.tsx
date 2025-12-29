'use client';

import { useState } from 'react';
import {
    CheckCircle, AlertTriangle, XCircle, ChevronDown, ChevronUp,
    Shield, Clock, FileText, Camera, MapPin, Wrench, HardHat, Package
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// ════════════════════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════════════════════

interface CriticalAction {
    category: string;
    action: string;
    priority: 'IMMEDIATE' | 'BEFORE_WORK' | 'HOURS' | 'DAYS';
    details?: string;
}

interface HazardFinding {
    category?: string;
    description?: string;
    severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
    location_in_image?: string;
    osha_reference?: string;
    immediate_action?: string;
}

interface VisionAnalysisResult {
    success: boolean;
    analysis_type: string;
    provider: string;
    model: string;
    analyzed_at: string;
    findings: Record<string, any>;
    critical_actions: CriticalAction[];
    hazard_count: {
        critical?: number;
        high?: number;
        medium?: number;
        low?: number;
    };
    recommended_decision: 'GO' | 'GO_WITH_CONDITIONS' | 'NO_GO' | 'STOP_WORK' | 'ERROR' | 'PENDING';
    error?: string;
}

interface VisionResultsProps {
    result: VisionAnalysisResult;
    isLoading?: boolean;
}

// ════════════════════════════════════════════════════════════════════════════════
// DECISION BADGE
// ════════════════════════════════════════════════════════════════════════════════

function DecisionBadge({ decision }: { decision: string }) {
    const config: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
        'GO': {
            color: 'bg-green-500',
            icon: <CheckCircle className="h-5 w-5" />,
            label: 'GO - Safe to Proceed'
        },
        'GO_WITH_CONDITIONS': {
            color: 'bg-yellow-500',
            icon: <AlertTriangle className="h-5 w-5" />,
            label: 'GO - With Conditions'
        },
        'NO_GO': {
            color: 'bg-red-500',
            icon: <XCircle className="h-5 w-5" />,
            label: 'NO GO - Address Issues'
        },
        'STOP_WORK': {
            color: 'bg-red-700',
            icon: <XCircle className="h-5 w-5" />,
            label: 'STOP WORK - Critical Hazards'
        },
        'ERROR': {
            color: 'bg-gray-500',
            icon: <AlertTriangle className="h-5 w-5" />,
            label: 'Error - Try Again'
        },
        'PENDING': {
            color: 'bg-gray-400',
            icon: <Clock className="h-5 w-5" />,
            label: 'Pending Analysis'
        }
    };

    const { color, icon, label } = config[decision] || config['PENDING'];

    return (
        <div className={cn(
            "flex items-center gap-3 px-4 py-3 rounded-xl text-white font-semibold",
            color
        )}>
            {icon}
            <span className="text-lg">{label}</span>
        </div>
    );
}

// ════════════════════════════════════════════════════════════════════════════════
// HAZARD SUMMARY BAR
// ════════════════════════════════════════════════════════════════════════════════

function HazardSummaryBar({ counts }: { counts: VisionAnalysisResult['hazard_count'] }) {
    const total = (counts.critical || 0) + (counts.high || 0) + (counts.medium || 0) + (counts.low || 0);

    if (total === 0) {
        return (
            <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg border border-green-200">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span className="text-green-700 font-medium">No hazards detected</span>
            </div>
        );
    }

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-muted-foreground">Hazards Detected</span>
                <span className="font-bold">{total} total</span>
            </div>
            <div className="flex gap-2">
                {(counts.critical || 0) > 0 && (
                    <Badge variant="destructive" className="bg-red-600">
                        {counts.critical} Critical
                    </Badge>
                )}
                {(counts.high || 0) > 0 && (
                    <Badge className="bg-orange-500 hover:bg-orange-600">
                        {counts.high} High
                    </Badge>
                )}
                {(counts.medium || 0) > 0 && (
                    <Badge className="bg-yellow-500 hover:bg-yellow-600 text-black">
                        {counts.medium} Medium
                    </Badge>
                )}
                {(counts.low || 0) > 0 && (
                    <Badge variant="secondary">
                        {counts.low} Low
                    </Badge>
                )}
            </div>
        </div>
    );
}

// ════════════════════════════════════════════════════════════════════════════════
// ACTION ITEM
// ════════════════════════════════════════════════════════════════════════════════

function ActionItem({ action, index }: { action: CriticalAction; index: number }) {
    const priorityConfig: Record<string, { color: string; icon: string; label: string }> = {
        'IMMEDIATE': { color: 'border-red-500 bg-red-50', icon: '🔴', label: 'Immediate' },
        'BEFORE_WORK': { color: 'border-orange-500 bg-orange-50', icon: '🟠', label: 'Before Work' },
        'HOURS': { color: 'border-yellow-500 bg-yellow-50', icon: '🟡', label: 'Within Hours' },
        'DAYS': { color: 'border-blue-500 bg-blue-50', icon: '🔵', label: 'Within Days' }
    };

    const config = priorityConfig[action.priority] || priorityConfig['BEFORE_WORK'];

    const categoryIcon: Record<string, React.ReactNode> = {
        'Equipment': <Wrench className="h-4 w-4" />,
        'PPE': <HardHat className="h-4 w-4" />,
        'Site': <MapPin className="h-4 w-4" />,
        'Materials': <Package className="h-4 w-4" />
    };

    return (
        <div className={cn(
            "flex gap-3 p-3 rounded-lg border-l-4",
            config.color
        )}>
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-white border flex items-center justify-center text-sm font-bold">
                {index + 1}
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                    {categoryIcon[action.category]}
                    <span className="text-xs font-medium uppercase text-muted-foreground">
                        {action.category}
                    </span>
                    <Badge variant="outline" className="text-xs px-1.5 py-0">
                        {config.icon} {config.label}
                    </Badge>
                </div>
                <p className="font-medium text-sm">{action.action}</p>
                {action.details && (
                    <p className="text-xs text-muted-foreground mt-1">{action.details}</p>
                )}
            </div>
        </div>
    );
}

// ════════════════════════════════════════════════════════════════════════════════
// FINDINGS SECTION
// ════════════════════════════════════════════════════════════════════════════════

function FindingsSection({
    title,
    icon: Icon,
    findings,
    defaultOpen = false
}: {
    title: string;
    icon: React.ComponentType<{ className?: string }>;
    findings: any;
    defaultOpen?: boolean;
}) {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    if (!findings || Object.keys(findings).length === 0) return null;

    // Determine status from findings
    let status = 'PASS';
    if (findings.overall_status === 'FAIL' || findings.overall_site_status === 'STOP_WORK') {
        status = 'FAIL';
    } else if (findings.overall_status === 'CONCERN' || findings.overall_site_status === 'CONCERN') {
        status = 'CONCERN';
    }

    const statusColors = {
        'PASS': 'bg-green-100 border-green-200',
        'CONCERN': 'bg-yellow-100 border-yellow-200',
        'FAIL': 'bg-red-100 border-red-200'
    };

    const statusIcons = {
        'PASS': <CheckCircle className="h-5 w-5 text-green-500" />,
        'CONCERN': <AlertTriangle className="h-5 w-5 text-yellow-500" />,
        'FAIL': <XCircle className="h-5 w-5 text-red-500" />
    };

    return (
        <div className={cn(
            "rounded-lg border overflow-hidden",
            statusColors[status as keyof typeof statusColors]
        )}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between p-3 hover:bg-black/5 transition-colors"
            >
                <div className="flex items-center gap-2">
                    <Icon className="h-5 w-5" />
                    <span className="font-medium">{title}</span>
                </div>
                <div className="flex items-center gap-2">
                    {statusIcons[status as keyof typeof statusIcons]}
                    {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </div>
            </button>

            {isOpen && (
                <div className="p-3 pt-0 border-t bg-white/50">
                    <pre className="text-xs overflow-auto p-2 bg-white rounded">
                        {JSON.stringify(findings, null, 2)}
                    </pre>
                </div>
            )}
        </div>
    );
}

// ════════════════════════════════════════════════════════════════════════════════
// MAIN RESULTS COMPONENT
// ════════════════════════════════════════════════════════════════════════════════

export function VisionResults({ result, isLoading }: VisionResultsProps) {
    if (isLoading) {
        return (
            <Card>
                <CardContent className="p-8">
                    <div className="flex flex-col items-center justify-center space-y-4">
                        <div className="relative">
                            <div className="w-16 h-16 border-4 border-primary/20 rounded-full" />
                            <div className="absolute top-0 left-0 w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                        </div>
                        <div className="text-center">
                            <p className="font-semibold text-lg">Analyzing Images...</p>
                            <p className="text-sm text-muted-foreground">
                                AI is inspecting equipment, PPE, and site conditions
                            </p>
                        </div>
                        <div className="flex gap-2 text-xs text-muted-foreground">
                            <span className="animate-pulse">🔍 Detecting hazards</span>
                            <span>•</span>
                            <span className="animate-pulse delay-150">📋 Checking compliance</span>
                            <span>•</span>
                            <span className="animate-pulse delay-300">🦺 Inspecting PPE</span>
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (!result.success) {
        return (
            <Card className="border-red-200 bg-red-50">
                <CardContent className="p-6">
                    <div className="flex items-start gap-3">
                        <XCircle className="h-6 w-6 text-red-500 flex-shrink-0" />
                        <div>
                            <p className="font-semibold text-red-700">Analysis Failed</p>
                            <p className="text-sm text-red-600">{result.error || 'Unknown error occurred'}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            {/* Decision Banner */}
            <DecisionBadge decision={result.recommended_decision} />

            {/* Hazard Summary */}
            <Card>
                <CardContent className="p-4">
                    <HazardSummaryBar counts={result.hazard_count} />
                </CardContent>
            </Card>

            {/* Critical Actions */}
            {result.critical_actions.length > 0 && (
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Shield className="h-5 w-5 text-red-500" />
                            Required Actions ({result.critical_actions.length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {result.critical_actions.map((action, index) => (
                            <ActionItem key={index} action={action} index={index} />
                        ))}
                    </CardContent>
                </Card>
            )}

            {/* Detailed Findings */}
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Detailed Findings
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                    {result.findings.equipment && (
                        <FindingsSection
                            title="Equipment Inspection"
                            icon={Wrench}
                            findings={result.findings.equipment}
                            defaultOpen={result.findings.equipment.overall_status !== 'PASS'}
                        />
                    )}
                    {result.findings.ppe && (
                        <FindingsSection
                            title="PPE Inspection"
                            icon={HardHat}
                            findings={result.findings.ppe}
                            defaultOpen={result.findings.ppe.summary?.fail > 0}
                        />
                    )}
                    {result.findings.site && (
                        <FindingsSection
                            title="Site Conditions"
                            icon={MapPin}
                            findings={result.findings.site}
                            defaultOpen={result.findings.site.overall_site_status !== 'SAFE'}
                        />
                    )}
                    {result.findings.materials && (
                        <FindingsSection
                            title="Material Storage"
                            icon={Package}
                            findings={result.findings.materials}
                            defaultOpen={result.findings.materials.storage_status === 'UNSAFE'}
                        />
                    )}
                    {result.findings.documents && result.findings.documents.length > 0 && (
                        <FindingsSection
                            title="Document Analysis"
                            icon={FileText}
                            findings={result.findings.documents[0]}
                        />
                    )}
                </CardContent>
            </Card>

            {/* Analysis Metadata */}
            <div className="flex items-center justify-between text-xs text-muted-foreground px-2">
                <span>Analyzed at {new Date(result.analyzed_at).toLocaleTimeString()}</span>
                <span>Model: {result.model}</span>
            </div>
        </div>
    );
}

export type { VisionAnalysisResult, CriticalAction, HazardFinding };
