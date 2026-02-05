'use client';

import {
    CheckCircle,
    Circle,
    ShieldCheck,
    WarningCircle,
    Lightbulb,
    FileText,
    Cpu,
    Target,
    Pulse,
    Globe
} from '@phosphor-icons/react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface ProgressTrackerProps {
    currentAgent: string;
    agentStatus: string;
    progress: number;
    elapsedMs: number;
}

export function ProgressTracker({ currentAgent, agentStatus, progress, elapsedMs }: ProgressTrackerProps) {
    const steps = [
        {
            id: 'agent1_validation',
            label: 'DATA VALIDATION',
            description: 'OSHA 1926 COMPLIANCE CHECK',
            icon: ShieldCheck,
        },
        {
            id: 'agent2_risk',
            label: 'RISK ASSESSMENT',
            description: 'NEURAL CLASSIFICATION',
            icon: WarningCircle,
        },
        {
            id: 'agent3_prediction',
            label: 'INCIDENT PREDICTION',
            description: 'SWISS CHEESE PROBABILITY',
            icon: Target,
        },
        {
            id: 'agent4_synthesis',
            label: 'REPORT SYNTHESIS',
            description: 'FINALIZING TECHNICAL DOCUMENT',
            icon: FileText,
        },
    ];

    const getStepStatus = (stepId: string) => {
        const stepIndex = steps.findIndex(s => s.id === stepId);
        const currentIndex = steps.findIndex(s => s.id === currentAgent);

        if (currentAgent === 'completed') return 'completed';
        if (currentIndex === -1) {
            return stepIndex === 0 && agentStatus !== 'queued' ? 'running' : 'pending';
        }
        if (stepIndex < currentIndex) return 'completed';
        if (stepIndex === currentIndex) return 'running';
        return 'pending';
    };

    const elapsedTime = (elapsedMs / 1000).toFixed(1);

    return (
        <div className="w-full max-w-2xl mx-auto space-y-8 animate-in fade-in zoom-in-95 duration-700">
            {/* HUD Header Telemetry */}
            <div className="flex items-end justify-between px-2">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-primary">
                        <Cpu weight="bold" size={18} className="animate-pulse" />
                        <span className="text-[10px] uppercase font-black tracking-[0.2em]">Core Analysis Active</span>
                    </div>
                    <h2 className="text-3xl font-bold tracking-tighter text-foreground flex items-center gap-3">
                        Scanning JHA
                        <motion.span
                            animate={{ opacity: [1, 0.4, 1] }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                            className="h-1.5 w-1.5 rounded-full bg-primary"
                        />
                    </h2>
                </div>
                <div className="text-right font-mono">
                    <div className="text-[10px] text-muted-foreground uppercase tracking-widest">Latency / Elapsed</div>
                    <div className="text-sm font-semibold text-foreground">{elapsedTime}s</div>
                </div>
            </div>

            {/* Main HUD Card */}
            <Card className="relative overflow-hidden border-white/5 bg-slate-950/40 backdrop-blur-2xl shadow-2xl">
                {/* HUD Scan Line Effect */}
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent h-20 w-full animate-[scan_4s_linear_infinite] pointer-events-none" />

                <CardContent className="p-6 space-y-8 relative z-10">
                    {/* High Precision Progress */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                            <span>Pipeline Progress</span>
                            <span className="text-primary font-bold">{Math.round(progress)}%</span>
                        </div>
                        <div className="relative h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                            <motion.div
                                className="absolute top-0 left-0 h-full bg-primary shadow-[0_0_12px_rgba(56,189,248,0.5)]"
                                initial={{ width: 0 }}
                                animate={{ width: `${progress}%` }}
                                transition={{ duration: 0.5, ease: "easeOut" }}
                            />
                        </div>
                    </div>

                    {/* Agent Steps Grid */}
                    <div className="grid gap-3">
                        {steps.map((step, idx) => {
                            const status = getStepStatus(step.id);
                            const isRunning = status === 'running';
                            const isCompleted = status === 'completed';

                            return (
                                <motion.div
                                    key={step.id}
                                    initial={false}
                                    animate={{
                                        opacity: isRunning ? 1 : isCompleted ? 0.8 : 0.3,
                                        scale: isRunning ? 1.01 : 1,
                                        backgroundColor: isRunning ? 'rgba(56, 189, 248, 0.05)' : 'rgba(255, 255, 255, 0)'
                                    }}
                                    className={cn(
                                        "group flex items-center gap-4 p-4 rounded-xl border transition-all duration-500",
                                        isRunning ? "border-primary/20 shadow-lg shadow-primary/5" : "border-white/5"
                                    )}
                                >
                                    {/* Precision Indicator Icon */}
                                    <div className={cn(
                                        "relative flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg border transition-colors duration-500",
                                        isRunning ? "bg-primary/20 border-primary/40 text-primary" :
                                            isCompleted ? "bg-success/10 border-success/20 text-success" : "bg-white/5 border-white/5 text-muted-foreground"
                                    )}>
                                        {isCompleted ? (
                                            <CheckCircle weight="fill" size={20} />
                                        ) : isRunning ? (
                                            <>
                                                <step.icon weight="bold" size={20} className="relative z-10" />
                                                <div className="absolute inset-0 rounded-lg animate-ping bg-primary/20" />
                                            </>
                                        ) : (
                                            <Circle weight="bold" size={20} />
                                        )}
                                    </div>

                                    {/* Text Content */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <h4 className={cn(
                                                "text-[11px] font-black uppercase tracking-[0.15em]",
                                                isRunning ? "text-primary" : "text-foreground/80"
                                            )}>
                                                {step.label}
                                            </h4>
                                            {isRunning && (
                                                <div className="h-1 w-1 rounded-full bg-primary animate-pulse" />
                                            )}
                                        </div>
                                        <p className="text-[10px] text-muted-foreground font-mono truncate uppercase tracking-tighter mt-0.5">
                                            {step.description}
                                        </p>
                                    </div>

                                    {/* Status Badge */}
                                    <AnimatePresence mode="wait">
                                        {isRunning ? (
                                            <motion.div
                                                key="running"
                                                initial={{ opacity: 0, x: 10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                exit={{ opacity: 0, x: -10 }}
                                                className="flex items-center gap-2 text-[9px] font-black text-primary px-2 py-1 rounded-md bg-primary/10 border border-primary/20"
                                            >
                                                <Pulse size={12} className="animate-pulse" />
                                                BUSY
                                            </motion.div>
                                        ) : isCompleted ? (
                                            <motion.div
                                                key="done"
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                className="text-[9px] font-black text-success/60 flex items-center gap-1"
                                            >
                                                DONE
                                            </motion.div>
                                        ) : null}
                                    </AnimatePresence>
                                </motion.div>
                            );
                        })}
                    </div>
                </CardContent>

                {/* Footer Telemetry Bar */}
                <div className="bg-white/5 border-t border-white/5 p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Globe size={14} className="text-muted-foreground opacity-50" />
                        <span className="text-[9px] font-mono text-muted-foreground uppercase tracking-widest leading-none">
                            Region: US-EAST-1 // Model: Gemini-2.0-Flash
                        </span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="h-1.5 w-1.5 rounded-full bg-success shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
                        <span className="text-[9px] font-black text-muted-foreground uppercase tracking-tighter">System Link Stable</span>
                    </div>
                </div>
            </Card>

            <style jsx global>{`
                @keyframes scan {
                    0% { transform: translateY(-100%); opacity: 0; }
                    10% { opacity: 0.5; }
                    90% { opacity: 0.5; }
                    100% { transform: translateY(500%); opacity: 0; }
                }
            `}</style>
        </div>
    );
}
