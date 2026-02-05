'use client';

import { useState } from 'react';
import {
    CheckCircle,
    Warning,
    XCircle,
    CaretDown,
    CaretUp,
    MapPin,
    Wrench,
    HardHat,
    WarningCircle,
    Prohibit,
    Lightning,
    Target,
    Pulse,
    Info
} from '@phosphor-icons/react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// ════════════════════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════════════════════

interface CriticalAction {
    category: string;
    action: string;
    priority: 'IMMEDIATE' | 'BEFORE_WORK' | 'HOURS' | 'DAYS';
    coordinates?: [number, number, number, number];
}

interface HazardFinding {
    category?: string;
    description?: string;
    severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
    coordinates?: [number, number, number, number];
    osha_reference?: string;
    immediate_action?: string;
}

interface SiteFindings {
    overall_site_status: string;
    hazards_identified?: HazardFinding[];
}

interface PPEInspection {
    status: string;
    type: string;
    owner_visible: string;
}

interface PPEFindings {
    summary?: { fail: number };
    inspections?: PPEInspection[];
}

interface ConditionFinding {
    component: string;
    condition: string;
}

interface EquipmentFindings {
    overall_status: string;
    equipment_identified?: string;
    immediate_hazards?: string[];
    condition_findings?: ConditionFinding[];
}

interface AnalysisFindings {
    site?: SiteFindings;
    ppe?: PPEFindings;
    equipment?: EquipmentFindings;
}

interface VisionAnalysisResult {
    success: boolean;
    analysis_type: string;
    provider: string;
    model: string;
    analyzed_at: string;
    findings: AnalysisFindings;
    executive_summary?: string;
    critical_actions: CriticalAction[];
    hazard_count: {
        critical?: number;
        high?: number;
        medium?: number;
        low?: number;
    };
    recommended_decision: 'GO' | 'GO_WITH_CONDITIONS' | 'NO_GO' | 'STOP_WORK' | 'ERROR' | 'PENDING';
    overall_status?: string;
    error?: string;
}

interface VisionResultsProps {
    result: VisionAnalysisResult;
    isLoading?: boolean;
}

// ════════════════════════════════════════════════════════════════════════════════
// DECISION MODULE - PREMIUM HUD STYLE
// ════════════════════════════════════════════════════════════════════════════════

function DecisionModule({ decision }: { decision: string }) {
    const config: Record<string, {
        gradient: string;
        icon: React.ReactNode;
        label: string;
        sublabel: string;
        glow: string;
    }> = {
        'GO': {
            gradient: 'from-emerald-600/20 to-emerald-900/40 border-emerald-500/30',
            icon: <CheckCircle weight="fill" className="h-12 w-12 text-emerald-400" />,
            label: 'SAFE TO PROCEED',
            sublabel: 'SYSTEM STATUS: NOMINAL',
            glow: 'shadow-emerald-500/20'
        },
        'GO_WITH_CONDITIONS': {
            gradient: 'from-amber-600/20 to-amber-900/40 border-amber-500/30',
            icon: <Warning weight="fill" className="h-12 w-12 text-amber-400" />,
            label: 'CAUTION ADVISED',
            sublabel: 'MITIGATION REQUIRED',
            glow: 'shadow-amber-500/20'
        },
        'NO_GO': {
            gradient: 'from-red-600/20 to-red-900/40 border-red-500/30',
            icon: <Prohibit weight="fill" className="h-12 w-12 text-red-400" />,
            label: 'DO NOT PROCEED',
            sublabel: 'FATAL FIVE RISKS DETECTED',
            glow: 'shadow-red-500/20'
        },
        'STOP_WORK': {
            gradient: 'from-red-700 to-red-950 border-red-500 shadow-2xl animate-pulse',
            icon: <XCircle weight="fill" className="h-14 w-14 text-white" />,
            label: 'STOP WORK',
            sublabel: 'IMMEDIATE LIFE THREAT',
            glow: 'shadow-red-600/40'
        },
        'ERROR': {
            gradient: 'from-gray-700/20 to-gray-900/40 border-gray-500/30',
            icon: <WarningCircle weight="fill" className="h-12 w-12 text-gray-400" />,
            label: 'ANALYSIS FAILED',
            sublabel: 'RE-SCAN REQUIRED',
            glow: 'shadow-gray-500/10'
        }
    };

    const { gradient, icon, label, sublabel, glow } = config[decision] || config['ERROR'];

    return (
        <div className={cn(
            "relative p-6 rounded-3xl border backdrop-blur-xl shadow-xl transition-all duration-700 overflow-hidden",
            gradient,
            glow
        )}>
            {/* Background elements */}
            <div className="absolute top-0 right-0 p-2 opacity-10">
                <Pulse size={80} />
            </div>

            <div className="flex items-center gap-6 relative z-10">
                <div className="flex-shrink-0 p-3 rounded-2xl bg-white/5 border border-white/10">
                    {icon}
                </div>
                <div>
                    <h2 className="text-3xl font-black text-white tracking-tighter leading-none mb-1">
                        {label}
                    </h2>
                    <p className="text-sm font-mono opacity-60 tracking-widest">{sublabel}</p>
                </div>
            </div>

            {/* HUD Scan Line */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent h-full w-20 -skew-x-12 animate-[shimmer_3s_infinite]" />
        </div>
    );
}

// ════════════════════════════════════════════════════════════════════════════════
// HAZARD GRID - DASHBOARD STYLE
// ════════════════════════════════════════════════════════════════════════════════

function HazardDashboard({ counts, summary }: { counts: VisionAnalysisResult['hazard_count']; summary?: string }) {
    // const total = (counts.critical || 0) + (counts.high || 0) + (counts.medium || 0) + (counts.low || 0);

    return (
        <div className="space-y-4">
            {/* Executive Summary Mini-card */}
            {summary && (
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
                    <p className="text-sm text-gray-300 leading-relaxed italic">
                        <span className="text-violet-400 font-bold mr-2">ANALYSIS_SYNTHESIS:</span>
                        {summary}
                    </p>
                </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-center">
                    <p className="text-2xl font-black text-red-500">{counts.critical || 0}</p>
                    <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest">Critical</p>
                </div>
                <div className="p-4 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-center">
                    <p className="text-2xl font-black text-orange-500">{counts.high || 0}</p>
                    <p className="text-[10px] font-bold text-orange-400 uppercase tracking-widest">High</p>
                </div>
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-center">
                    <p className="text-2xl font-black text-amber-500">{counts.medium || 0}</p>
                    <p className="text-[10px] font-bold text-amber-400 uppercase tracking-widest">Medium</p>
                </div>
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                    <p className="text-2xl font-black text-emerald-500">{counts.low || 0}</p>
                    <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Low</p>
                </div>
            </div>
        </div>
    );
}

// ════════════════════════════════════════════════════════════════════════════════
// ACTION MODULE
// ════════════════════════════════════════════════════════════════════════════════

function ActionModule({ action, index }: { action: CriticalAction; index: number }) {
    return (
        <div className="group relative">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-violet-600/20 to-fuchsia-600/20 rounded-2xl blur opacity-0 group-hover:opacity-100 transition duration-500" />
            <div className="relative flex items-start gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-white/20 transition-all duration-300">
                <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center font-black text-violet-400">
                    {index + 1}
                </div>
                <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between">
                        <Badge className="bg-white/10 text-gray-300 border-white/10 px-2 py-0 text-[10px] uppercase font-mono tracking-tighter">
                            {action.category}
                        </Badge>
                        {action.priority === 'IMMEDIATE' && (
                            <div className="flex items-center gap-1 text-[10px] font-black text-red-500 animate-pulse">
                                <Lightning weight="fill" />
                                IMMEDIATE
                            </div>
                        )}
                    </div>
                    <p className="text-sm font-bold text-white leading-tight">{action.action}</p>

                    {/* Spatial Marker if present */}
                    {action.coordinates && (
                        <div className="flex items-center gap-1 text-[9px] font-mono text-violet-400/60 uppercase">
                            <Target size={12} weight="fill" />
                            SPATIAL_SYNC: [{action.coordinates.join(', ')}]
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ════════════════════════════════════════════════════════════════════════════════
// FINDINGS MODULE - HUD STYLE COLLAPSIBLE
// ════════════════════════════════════════════════════════════════════════════════

function FindingsModule({ title, icon: Icon, children, count, isOpen: defaultOpen }: { title: string; icon: React.ComponentType<{ weight?: string; size?: number; className?: string }>; children: React.ReactNode; count: number; isOpen: boolean }) {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <div className="rounded-2xl bg-white/5 border border-white/5 overflow-hidden">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <div className="p-1.5 rounded-lg bg-white/5">
                        <Icon weight="bold" size={20} className="text-gray-400" />
                    </div>
                    <span className="font-bold text-sm text-gray-200 uppercase tracking-widest">{title}</span>
                    {count > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-400 text-[10px] font-black">
                            {count}
                        </span>
                    )}
                </div>
                {isOpen ? <CaretUp weight="bold" /> : <CaretDown weight="bold" />}
            </button>
            {isOpen && (
                <div className="p-4 bg-black/20 space-y-3">
                    {children}
                </div>
            )}
        </div>
    );
}

// ════════════════════════════════════════════════════════════════════════════════
// MAIN RESULTS COMPONENT
// ════════════════════════════════════════════════════════════════════════════════

export function VisionResults({ result, isLoading }: VisionResultsProps) {
    if (isLoading) return null; // Handled by ScanningHUD in page.tsx

    if (!result.success) {
        return (
            <div className="p-8 rounded-3xl bg-red-950/20 border border-red-500/40 text-center space-y-4">
                <Warning size={48} className="text-red-500 mx-auto" />
                <div>
                    <h3 className="text-xl font-black text-white">ANALYSIS_FAILURE</h3>
                    <p className="text-sm text-red-400/60 font-mono mt-1">{result.error || 'UNEXPECTED_CORE_EXCEPTION'}</p>
                </div>
            </div>
        );
    }

    const decision = result.recommended_decision || result.overall_status || 'ERROR';

    return (
        <div className="space-y-6 animate-in slide-in-from-bottom-8 duration-1000">
            <style jsx>{`
                @keyframes shimmer {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(500%); }
                }
            `}</style>

            {/* 1. DECISION MODULE */}
            <DecisionModule decision={decision} />

            {/* 2. HAZARD DASHBOARD */}
            <HazardDashboard counts={result.hazard_count} summary={result.executive_summary} />

            {/* 3. CRITICAL ACTIONS */}
            {result.critical_actions.length > 0 && (
                <div className="space-y-3">
                    <div className="flex items-center gap-2 pl-1 mb-2">
                        <Lightning weight="fill" className="text-violet-500" />
                        <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest">Primary Actions</h3>
                    </div>
                    <div className="grid grid-cols-1 gap-3">
                        {result.critical_actions.map((action, index) => (
                            <ActionModule key={index} action={action} index={index} />
                        ))}
                    </div>
                </div>
            )}

            {/* 4. DETAILED FINDINGS */}
            <div className="space-y-3 border-t border-white/5 pt-6">
                <div className="flex items-center gap-2 pl-1 mb-2">
                    <Info weight="fill" className="text-gray-600" />
                    <h3 className="text-xs font-black text-gray-600 uppercase tracking-widest">Inspection Modules</h3>
                </div>

                {result.findings.site && (
                    <FindingsModule
                        title="Site Conditions"
                        icon={MapPin}
                        count={result.findings.site.hazards_identified?.length || 0}
                        isOpen={result.findings.site.overall_site_status !== 'SAFE'}
                    >
                        {result.findings.site.hazards_identified?.map((h: HazardFinding, i: number) => (
                            <div key={i} className="p-3 rounded-xl bg-white/5 border border-white/5">
                                <p className="text-xs font-bold text-white mb-1">{h.description}</p>
                                <div className="flex justify-between items-center">
                                    <Badge className="bg-amber-500/10 text-amber-500 text-[9px]">{h.severity}</Badge>
                                    <span className="text-[9px] font-mono text-gray-600">{h.osha_reference}</span>
                                </div>
                            </div>
                        ))}
                    </FindingsModule>
                )}

                {result.findings.ppe && (
                    <FindingsModule
                        title="PPE Mapping"
                        icon={HardHat}
                        count={result.findings.ppe.summary?.fail || 0}
                        isOpen={(result.findings.ppe.summary?.fail ?? 0) > 0}
                    >
                        {result.findings.ppe.inspections?.map((p: { status: string; type: string; owner_visible: string }, i: number) => (
                            <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-white/5">
                                <div className="flex items-center gap-2">
                                    <div className={cn("w-2 h-2 rounded-full", p.status === 'PASS' ? 'bg-emerald-500' : 'bg-red-500')} />
                                    <p className="text-xs text-gray-300 font-mono">{p.type} <span className="opacity-40">- {p.owner_visible}</span></p>
                                </div>
                                <Badge className={p.status === 'PASS' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}>
                                    {p.status}
                                </Badge>
                            </div>
                        ))}
                    </FindingsModule>
                )}

                {result.findings.equipment && (
                    <FindingsModule
                        title="Equipment Diagnostics"
                        icon={Wrench}
                        count={result.findings.equipment.immediate_hazards?.length || 0}
                        isOpen={result.findings.equipment.overall_status !== 'PASS'}
                    >
                        <p className="text-[10px] text-gray-500 font-mono mb-2">IDENTIFIED: {result.findings.equipment.equipment_identified}</p>
                        {result.findings.equipment.condition_findings?.map((f: { component: string; condition: string }, i: number) => (
                            <div key={i} className="p-3 rounded-xl bg-white/5 border border-white/5">
                                <p className="text-xs font-bold text-white">{f.component}</p>
                                <p className="text-[10px] text-gray-400 mt-1">{f.condition}</p>
                            </div>
                        ))}
                    </FindingsModule>
                )}
            </div>

            {/* Footer metadata */}
            <div className="pt-4 border-t border-white/5 flex items-center justify-between font-mono text-[9px] text-gray-600 uppercase tracking-widest">
                <span>Node: {result.provider} / {result.model.slice(0, 10)}</span>
                <span>Stamp: {new Date(result.analyzed_at).toLocaleTimeString()}</span>
            </div>
        </div>
    );
}

export type { VisionAnalysisResult, CriticalAction, HazardFinding };
