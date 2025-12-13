'use client';

import { CheckCircle2, Circle, Loader2, ArrowRight, ShieldCheck, AlertTriangle, Lightbulb, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

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
            label: 'Data Validation',
            description: 'Checking against OSHA standards',
            icon: ShieldCheck,
        },
        {
            id: 'agent2_risk',
            label: 'Risk Assessment',
            description: 'Calculating risk scores',
            icon: AlertTriangle,
        },
        {
            id: 'agent3_prediction',
            label: 'Incident Prediction',
            description: 'Applying Swiss Cheese Model',
            icon: Lightbulb,
        },
        {
            id: 'agent4_synthesis',
            label: 'Report Generation',
            description: 'Synthesizing final document',
            icon: FileText,
        },
    ];

    const getStepStatus = (stepId: string) => {
        // Find index of current step and this step
        const stepIndex = steps.findIndex(s => s.id === stepId);
        const currentIndex = steps.findIndex(s => s.id === currentAgent);

        // If completed or finalizing
        if (currentAgent === 'completed') return 'completed';

        if (currentIndex === -1) {
            // "system" or unknown
            return stepIndex === 0 && agentStatus !== 'queued' ? 'running' : 'pending';
        }

        if (stepIndex < currentIndex) return 'completed';
        if (stepIndex === currentIndex) return 'running';
        return 'pending';
    };

    const elapsedTime = (elapsedMs / 1000).toFixed(1);

    return (
        <Card className="w-full max-w-2xl mx-auto border-blue-500/20 shadow-lg animate-in fade-in zoom-in-95 duration-300">
            <CardHeader className="text-center pb-2">
                <CardTitle className="flex items-center justify-center gap-2 text-2xl">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    Analyzing JHA
                </CardTitle>
                <CardDescription>
                    Multi-agent pipeline active • {elapsedTime}s elapsed
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <Progress value={progress} className="h-2" />

                <div className="space-y-2">
                    {steps.map((step, index) => {
                        const status = getStepStatus(step.id);
                        const isRunning = status === 'running';
                        const isCompleted = status === 'completed';

                        return (
                            <div
                                key={step.id}
                                className={`flex items-center gap-4 p-3 rounded-lg transition-all duration-300 ${isRunning ? 'bg-primary/5 border border-primary/20 scale-[1.02]' :
                                        isCompleted ? 'bg-muted/30' : 'opacity-50'
                                    }`}
                            >
                                <div className={`p-2 rounded-full ${isRunning ? 'bg-primary text-primary-foreground' :
                                        isCompleted ? 'bg-green-500 text-white' : 'bg-muted text-muted-foreground'
                                    }`}>
                                    {isCompleted ? (
                                        <CheckCircle2 className="h-5 w-5" />
                                    ) : isRunning ? (
                                        <step.icon className="h-5 w-5 animate-pulse" />
                                    ) : (
                                        <Circle className="h-5 w-5" />
                                    )}
                                </div>
                                <div className="flex-1">
                                    <h4 className={`font-medium ${isRunning ? 'text-primary' : ''}`}>
                                        {step.label}
                                    </h4>
                                    <p className="text-xs text-muted-foreground">{step.description}</p>
                                </div>
                                {isRunning && (
                                    <div className="text-xs font-mono text-primary animate-pulse">
                                        Processing...
                                    </div>
                                )}
                                {isCompleted && (
                                    <div className="text-xs font-mono text-green-600 dark:text-green-400 flex items-center gap-1">
                                        Done
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
}
