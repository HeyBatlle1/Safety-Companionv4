'use client';

import { useState } from 'react';
import {
    CheckCircle2, AlertTriangle, XOctagon, ChevronDown, ChevronUp,
    Shield, Clock, FileText, Camera, MapPin, Wrench, HardHat, Package,
    AlertCircle, Ban
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
// DECISION BANNER - OSHA SIGNAGE STYLE
// This is THE most critical visual element. Unmissable.
// ════════════════════════════════════════════════════════════════════════════════

function DecisionBanner({ decision }: { decision: string }) {
    const config: Record<string, {
        className: string;
        icon: React.ReactNode;
        label: string;
        sublabel: string;
    }> = {
        'GO': {
            className: 'decision-go',
            icon: <CheckCircle2 className="h-10 w-10 md:h-12 md:w-12" strokeWidth={2.5} />,
            label: 'GO',
            sublabel: 'Safe to Proceed'
        },
        'GO_WITH_CONDITIONS': {
            className: 'decision-caution',
            icon: <AlertTriangle className="h-10 w-10 md:h-12 md:w-12" strokeWidth={2.5} />,
            label: 'GO WITH CONDITIONS',
            sublabel: 'Address Items Before Work'
        },
        'NO_GO': {
            className: 'decision-stop',
            icon: <XOctagon className="h-10 w-10 md:h-12 md:w-12" strokeWidth={2.5} />,
            label: 'NO GO',
            sublabel: 'Do Not Proceed'
        },
        'STOP_WORK': {
            className: 'decision-stop',
            icon: <Ban className="h-10 w-10 md:h-12 md:w-12" strokeWidth={2.5} />,
            label: 'STOP WORK',
            sublabel: 'Immediate Hazard - Evacuate'
        },
        'ERROR': {
            className: 'bg-slate-700 border-2 border-slate-500',
            icon: <AlertCircle className="h-10 w-10 md:h-12 md:w-12" />,
            label: 'ANALYSIS ERROR',
            sublabel: 'Try Again'
        },
        'PENDING': {
            className: 'bg-slate-700 border-2 border-slate-500',
            icon: <Clock className="h-10 w-10 md:h-12 md:w-12 animate-pulse" />,
            label: 'ANALYZING',
            sublabel: 'Please Wait'
        }
    };

    const { className, icon, label, sublabel } = config[decision] || config['PENDING'];

    return (
        <div className={cn(
            "relative flex items-center gap-4 md:gap-6 p-6 md:p-8 rounded-xl text-white font-bold",
            "transition-all duration-300",
            className
        )}>
            {/* Icon with glow */}
            <div className="flex-shrink-0">
                {icon}
            </div>

            {/* Text */}
            <div className="flex-1">
                <div className="text-2xl md:text-4xl font-black tracking-tight uppercase">
                    {label}
                </div>
                <div className="text-sm md:text-lg font-semibold opacity-90 mt-1">
                    {sublabel}
                </div>
            </div>

            {/* Accessibility: Screen reader announcement */}
            <span className="sr-only">
                Safety decision: {label}. {sublabel}
            </span>
        </div>
    );
}

// ════════════════════════════════════════════════════════════════════════════════
// HAZARD COUNT SUMMARY
// Visual bar showing severity distribution
// ════════════════════════════════════════════════════════════════════════════════

function HazardSummary({ counts }: { counts: VisionAnalysisResult['hazard_count'] }) {
    const total = (counts.critical || 0) + (counts.high || 0) + (counts.medium || 0) + (counts.low || 0);

    if (total === 0) {
        return (
            <div className="flex items-center gap-3 p-4 bg-green-500/10 rounded-lg border-2 border-green-500/30">
                <CheckCircle2 className="h-6 w-6 icon-pass" />
                <span className="text-green-400 font-semibold text-lg">No Hazards Detected</span>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <span className="font-semibold text-lg text-foreground">Hazards Found</span>
                <span className="text-2xl font-bold text-foreground">{total}</span>
            </div>

            {/* Severity badges - large, clear, with icons */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {(counts.critical || 0) > 0 && (
                    <div className="flex items-center gap-2 p-3 rounded-lg priority-critical">
                        <XOctagon className="h-5 w-5 text-red-500" />
                        <div>
                            <div className="text-xl font-bold text-red-400">{counts.critical}</div>
                            <div className="text-xs font-semibold uppercase text-red-400/80">Critical</div>
                        </div>
                    </div>
                )}
                {(counts.high || 0) > 0 && (
                    <div className="flex items-center gap-2 p-3 rounded-lg priority-high">
                        <AlertTriangle className="h-5 w-5 text-orange-500" />
                        <div>
                            <div className="text-xl font-bold text-orange-400">{counts.high}</div>
                            <div className="text-xs font-semibold uppercase text-orange-400/80">High</div>
                        </div>
                    </div>
                )}
                {(counts.medium || 0) > 0 && (
                    <div className="flex items-center gap-2 p-3 rounded-lg priority-medium">
                        <AlertCircle className="h-5 w-5 text-yellow-500" />
                        <div>
                            <div className="text-xl font-bold text-yellow-400">{counts.medium}</div>
                            <div className="text-xs font-semibold uppercase text-yellow-400/80">Medium</div>
                        </div>
                    </div>
                )}
                {(counts.low || 0) > 0 && (
                    <div className="flex items-center gap-2 p-3 rounded-lg priority-low">
                        <AlertCircle className="h-5 w-5 text-sky-500" />
                        <div>
                            <div className="text-xl font-bold text-sky-400">{counts.low}</div>
                            <div className="text-xs font-semibold uppercase text-sky-400/80">Low</div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// ════════════════════════════════════════════════════════════════════════════════
// ACTION ITEM - Prioritized with OSHA signage style
// ════════════════════════════════════════════════════════════════════════════════

function ActionItem({ action, index }: { action: CriticalAction; index: number }) {
    const priorityConfig: Record<string, {
        className: string;
        icon: React.ReactNode;
        label: string;
        textColor: string;
    }> = {
        'IMMEDIATE': {
            className: 'priority-critical',
            icon: <XOctagon className="h-5 w-5 text-red-500" />,
            label: 'IMMEDIATE',
            textColor: 'text-red-400'
        },
        'BEFORE_WORK': {
            className: 'priority-high',
            icon: <AlertTriangle className="h-5 w-5 text-orange-500" />,
            label: 'BEFORE WORK',
            textColor: 'text-orange-400'
        },
        'HOURS': {
            className: 'priority-medium',
            icon: <Clock className="h-5 w-5 text-yellow-500" />,
            label: 'WITHIN HOURS',
            textColor: 'text-yellow-400'
        },
        'DAYS': {
            className: 'priority-low',
            icon: <Clock className="h-5 w-5 text-sky-500" />,
            label: 'WITHIN DAYS',
            textColor: 'text-sky-400'
        }
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
            "flex gap-4 p-4 rounded-lg",
            config.className
        )}>
            {/* Large action number */}
            <div className={cn(
                "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-lg font-black",
                "bg-white/10 border-2",
                action.priority === 'IMMEDIATE' ? 'border-red-500 text-red-400' :
                    action.priority === 'BEFORE_WORK' ? 'border-orange-500 text-orange-400' :
                        action.priority === 'HOURS' ? 'border-yellow-500 text-yellow-400' :
                            'border-sky-500 text-sky-400'
            )}>
                {index + 1}
            </div>

            <div className="flex-1 min-w-0">
                {/* Priority badge and category */}
                <div className="flex items-center gap-2 mb-2">
                    {config.icon}
                    <Badge
                        variant="outline"
                        className={cn("font-bold text-xs uppercase tracking-wide", config.textColor)}
                    >
                        {config.label}
                    </Badge>
                    {categoryIcon[action.category] && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            {categoryIcon[action.category]}
                            {action.category}
                        </span>
                    )}
                </div>

                {/* Action text - clear and prominent */}
                <p className="font-semibold text-foreground">{action.action}</p>

                {/* Additional details */}
                {action.details && (
                    <p className="text-sm text-muted-foreground mt-1">{action.details}</p>
                )}
            </div>
        </div>
    );
}

// ════════════════════════════════════════════════════════════════════════════════
// FINDINGS SECTION - Collapsible detailed info
// ════════════════════════════════════════════════════════════════════════════════

function FindingsSection({
    title,
    icon: Icon,
    findings,
    status,
    defaultOpen = false
}: {
    title: string;
    icon: React.ComponentType<{ className?: string }>;
    findings: any;
    status?: 'PASS' | 'CONCERN' | 'FAIL';
    defaultOpen?: boolean;
}) {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    if (!findings || Object.keys(findings).length === 0) return null;

    // Auto-detect status from findings if not provided
    if (!status) {
        if (findings.overall_status === 'FAIL' || findings.overall_site_status === 'STOP_WORK') {
            status = 'FAIL';
        } else if (findings.overall_status === 'CONCERN' || findings.overall_site_status === 'CONCERN') {
            status = 'CONCERN';
        } else {
            status = 'PASS';
        }
    }

    const statusConfig = {
        'PASS': {
            border: 'border-green-500/30',
            bg: 'bg-green-500/5',
            icon: <CheckCircle2 className="h-5 w-5 icon-pass" />,
            label: 'PASS'
        },
        'CONCERN': {
            border: 'border-yellow-500/30',
            bg: 'bg-yellow-500/5',
            icon: <AlertTriangle className="h-5 w-5 icon-caution" />,
            label: 'CONCERN'
        },
        'FAIL': {
            border: 'border-red-500/30',
            bg: 'bg-red-500/5',
            icon: <XOctagon className="h-5 w-5 icon-fail" />,
            label: 'FAIL'
        }
    };

    const config = statusConfig[status];

    return (
        <div className={cn(
            "rounded-lg border-2 overflow-hidden",
            config.border,
            config.bg
        )}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <Icon className="h-5 w-5" />
                    <span className="font-semibold">{title}</span>
                </div>
                <div className="flex items-center gap-3">
                    <Badge variant="outline" className="font-bold">
                        {config.icon}
                        <span className="ml-1">{config.label}</span>
                    </Badge>
                    {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </div>
            </button>

            {isOpen && (
                <div className="p-4 pt-0 border-t border-white/10">
                    <pre className="text-xs overflow-auto p-3 bg-slate-900/50 rounded-lg text-slate-300">
                        {JSON.stringify(findings, null, 2)}
                    </pre>
                </div>
            )}
        </div>
    );
}

// ════════════════════════════════════════════════════════════════════════════════
// LOADING STATE
// ════════════════════════════════════════════════════════════════════════════════

function LoadingState() {
    return (
        <Card className="border-2 border-slate-600">
            <CardContent className="p-8">
                <div className="flex flex-col items-center justify-center space-y-6">
                    {/* Animated scanner effect */}
                    <div className="relative">
                        <div className="w-20 h-20 border-4 border-sky-500/30 rounded-full" />
                        <div className="absolute top-0 left-0 w-20 h-20 border-4 border-sky-500 border-t-transparent rounded-full animate-spin" />
                        <Camera className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 h-8 w-8 text-sky-500" />
                    </div>

                    <div className="text-center">
                        <p className="font-bold text-xl text-foreground">Analyzing Images...</p>
                        <p className="text-muted-foreground mt-1">
                            AI is inspecting for safety hazards
                        </p>
                    </div>

                    {/* Status indicators */}
                    <div className="grid grid-cols-3 gap-4 text-xs text-center">
                        <div className="flex flex-col items-center gap-1">
                            <div className="w-2 h-2 rounded-full bg-sky-500 animate-pulse" />
                            <span className="text-muted-foreground">Detecting</span>
                        </div>
                        <div className="flex flex-col items-center gap-1">
                            <div className="w-2 h-2 rounded-full bg-sky-500 animate-pulse delay-150" />
                            <span className="text-muted-foreground">Analyzing</span>
                        </div>
                        <div className="flex flex-col items-center gap-1">
                            <div className="w-2 h-2 rounded-full bg-sky-500 animate-pulse delay-300" />
                            <span className="text-muted-foreground">Assessing</span>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

// ════════════════════════════════════════════════════════════════════════════════
// MAIN RESULTS COMPONENT
// Visual hierarchy: Decision > Critical Actions > Risk Summary > Details
// ════════════════════════════════════════════════════════════════════════════════

export function VisionResults({ result, isLoading }: VisionResultsProps) {
    if (isLoading) {
        return <LoadingState />;
    }

    if (!result.success) {
        return (
            <Card className="border-2 border-red-500/30 bg-red-500/5">
                <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                        <XOctagon className="h-8 w-8 text-red-500 flex-shrink-0" />
                        <div>
                            <p className="font-bold text-lg text-red-400">Analysis Failed</p>
                            <p className="text-red-300/80 mt-1">{result.error || 'Unknown error. Please try again.'}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            {/* 1. DECISION BANNER - Biggest, boldest, first */}
            <DecisionBanner decision={result.recommended_decision} />

            {/* 2. HAZARD SUMMARY - Quick visual overview */}
            <Card className="border-2 border-slate-600">
                <CardContent className="p-4 md:p-6">
                    <HazardSummary counts={result.hazard_count} />
                </CardContent>
            </Card>

            {/* 3. CRITICAL ACTIONS - What to do, prioritized */}
            {result.critical_actions.length > 0 && (
                <Card className="border-2 border-slate-600">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xl flex items-center gap-3">
                            <Shield className="h-6 w-6 text-red-500" />
                            Required Actions
                            <Badge variant="destructive" className="ml-auto text-base px-3">
                                {result.critical_actions.length}
                            </Badge>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {result.critical_actions.map((action, index) => (
                            <ActionItem key={index} action={action} index={index} />
                        ))}
                    </CardContent>
                </Card>
            )}

            {/* 4. DETAILED FINDINGS - Collapsible for power users */}
            <Card className="border-2 border-slate-600">
                <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Detailed Inspection Results
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
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

            {/* Analysis metadata - small, non-intrusive */}
            <div className="flex items-center justify-between text-xs text-muted-foreground px-2">
                <span>Analyzed {new Date(result.analyzed_at).toLocaleTimeString()}</span>
                <span>{result.provider} / {result.model}</span>
            </div>
        </div>
    );
}

export type { VisionAnalysisResult, CriticalAction, HazardFinding };
