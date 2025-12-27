'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useJHADetails, useJHAProgress } from '@/hooks/use-api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, CheckCircle2, AlertTriangle, XCircle, Shield, FileText, Download } from 'lucide-react';
import { format } from 'date-fns';
import { ProgressTracker } from '@/components/jha/progress-tracker';
import { Agent1Card, Agent2Card, Agent3Card, Agent4Card } from '@/components/analysis';

export default function JHADetailPage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;

    // Check if id is 'new' which would be the wizard route
    if (id === 'new') return null;

    const { data: jha, isLoading, isError } = useJHADetails(id);

    if (isLoading) {
        return (
            <div className="flex h-[50vh] items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                    <p className="text-muted-foreground">Loading analysis...</p>
                </div>
            </div>
        );
    }

    if (isError || !jha) {
        return (
            <div className="flex h-[50vh] flex-col items-center justify-center gap-4">
                <div className="rounded-full bg-destructive/10 p-4">
                    <XCircle className="h-8 w-8 text-destructive" />
                </div>
                <h2 className="text-xl font-semibold">Failed to load JHA</h2>
                <Button variant="outline" onClick={() => router.push('/jha')}>
                    Return to History
                </Button>
            </div>
        );
    }

    // Handle processing/error/failed states
    // @ts-ignore - status field not in strict type definition yet
    if (jha.status === 'processing' || jha.status === 'queued') {
        return <ProcessingView analysisId={id} onComplete={() => window.location.reload()} />;
    }

    // @ts-ignore
    if (jha.status === 'error' || jha.status === 'failed' || jha.status === 'broken') {
        return (
            <div className="flex h-[50vh] flex-col items-center justify-center gap-4">
                <div className="rounded-full bg-orange-500/10 p-4">
                    <AlertTriangle className="h-8 w-8 text-orange-500" />
                </div>
                <h2 className="text-xl font-semibold">Analysis Incomplete</h2>
                <p className="max-w-md text-center text-muted-foreground">
                    The analysis could not be fully completed. Some data may be missing.
                </p>
                {/* @ts-ignore */}
                {jha.error && (
                    <div className="mt-2 rounded bg-muted p-2 text-xs font-mono">
                        {/* @ts-ignore */}
                        {jha.error}
                    </div>
                )}
                <Button variant="outline" onClick={() => router.push('/jha')}>
                    Return to History
                </Button>
            </div>
        );
    }

    const getDecisionIcon = (decision: string) => {
        switch (decision) {
            case 'GO': return <CheckCircle2 className="h-6 w-6 text-green-500" />;
            case 'NO_GO': return <XCircle className="h-6 w-6 text-red-500" />;
            case 'GO_WITH_CONDITIONS': return <AlertTriangle className="h-6 w-6 text-yellow-500" />;
            default: return <Shield className="h-6 w-6 text-muted-foreground" />;
        }
    };

    return (
        <div className="space-y-8 pb-12">
            {/* Header */}
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="mb-2 -ml-2 text-muted-foreground"
                        onClick={() => router.push('/jha')}
                    >
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to History
                    </Button>
                    <h1 className="text-3xl font-bold tracking-tight">{jha.project_name}</h1>
                    <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                            <FileText className="h-4 w-4" />
                            ID: {jha.id.slice(0, 8)}
                        </span>
                        <span>•</span>
                        <span>{format(new Date(jha.created_at), 'PPP p')}</span>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="outline">
                        <Download className="mr-2 h-4 w-4" />
                        Export PDF
                    </Button>
                </div>
            </div>

            {/* Executive Summary */}
            <div className="grid gap-6 md:grid-cols-2">
                <Card className="md:col-span-2">
                    <CardHeader className="pb-2">
                        <CardTitle>Executive Summary</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                            <div className="flex items-center gap-4">
                                {getDecisionIcon(jha.urgency_level)}
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Decision</p>
                                    <h3 className="text-2xl font-bold">
                                        {jha.urgency_level === 'CRITICAL' || jha.urgency_level === 'HIGH' ? 'NO GO' : 'GO'}
                                        <span className="ml-2 text-base font-normal text-muted-foreground">
                                            ({jha.urgency_level})
                                        </span>
                                    </h3>
                                </div>
                            </div>

                            <div className="md:text-right">
                                <p className="text-sm font-medium text-muted-foreground">Risk Score</p>
                                <div className="flex items-center gap-2 md:justify-end">
                                    <h3 className="text-3xl font-bold">{jha.risk_score}</h3>
                                    <span className="text-muted-foreground">/ 100</span>
                                </div>
                            </div>
                        </div>

                        {/* Executive Summary Details */}
                        {jha.agent_outputs?.agent4_final_report?.executiveSummary && (
                            <div className="mt-6 pt-6 border-t">
                                {/* Handle both string and object formats */}
                                {typeof jha.agent_outputs.agent4_final_report.executiveSummary === 'string' ? (
                                    <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                                        {jha.agent_outputs.agent4_final_report.executiveSummary}
                                    </p>
                                ) : (
                                    <div className="space-y-3">
                                        {/* Top Threats */}
                                        {jha.agent_outputs.agent4_final_report.executiveSummary.topThreats?.length > 0 && (
                                            <div>
                                                <h4 className="text-sm font-medium mb-2">Top Threats</h4>
                                                <ul className="space-y-1">
                                                    {jha.agent_outputs.agent4_final_report.executiveSummary.topThreats.map((threat: string, idx: number) => (
                                                        <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                                                            <span className="text-red-500">⚠</span> {threat}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                        {/* Critical Actions */}
                                        {jha.agent_outputs.agent4_final_report.executiveSummary.criticalActions?.length > 0 && (
                                            <div>
                                                <h4 className="text-sm font-medium mb-2">Critical Actions Required</h4>
                                                <ul className="space-y-1">
                                                    {jha.agent_outputs.agent4_final_report.executiveSummary.criticalActions.map((action: string, idx: number) => (
                                                        <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                                                            <span className="text-orange-500">→</span> {action}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                        {/* Incident Probability */}
                                        {jha.agent_outputs.agent4_final_report.executiveSummary.incidentProbability !== undefined && (
                                            <p className="text-sm text-muted-foreground">
                                                <span className="font-medium">Incident Probability (next 4hrs):</span>{' '}
                                                {jha.agent_outputs.agent4_final_report.executiveSummary.incidentProbability}%
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Critical Findings */}
                        {jha.agent_outputs?.agent4_final_report?.criticalFindings?.length > 0 && (
                            <div className="mt-6 pt-6 border-t">
                                <h4 className="font-medium mb-3 flex items-center gap-2">
                                    <AlertTriangle className="h-4 w-4 text-orange-500" />
                                    Critical Findings
                                </h4>
                                <ul className="space-y-2">
                                    {jha.agent_outputs.agent4_final_report.criticalFindings.map((finding: string, idx: number) => (
                                        <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                                            <span className="text-orange-500 mt-1">•</span>
                                            {finding}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Stop Work Conditions */}
                        {jha.agent_outputs?.agent4_final_report?.stopWorkConditions?.length > 0 && (
                            <div className="mt-6 pt-6 border-t">
                                <h4 className="font-medium mb-3 flex items-center gap-2">
                                    <XCircle className="h-4 w-4 text-red-500" />
                                    Stop Work Conditions
                                </h4>
                                <ul className="space-y-2">
                                    {jha.agent_outputs.agent4_final_report.stopWorkConditions.map((condition: string, idx: number) => (
                                        <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                                            <span className="text-red-500 mt-1">•</span>
                                            {condition}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Primary Safety Categories */}
                {jha.safety_categories && jha.safety_categories.length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Safety Categories</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-wrap gap-2">
                                {jha.safety_categories.map((cat: string) => (
                                    <Badge key={cat} variant="secondary" className="capitalize">
                                        {cat.replace(/_/g, ' ')}
                                    </Badge>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Agent 1: Data Quality Assessment */}
            {jha.agent_outputs?.agent1_validation && (
                <Agent1Card data={jha.agent_outputs.agent1_validation} />
            )}

            {/* Agent 2: Risk Assessment */}
            {jha.agent_outputs?.agent2_risk_assessment && (
                <Agent2Card data={jha.agent_outputs.agent2_risk_assessment.riskProfile || jha.agent_outputs.agent2_risk_assessment} />
            )}

            {/* Agent 3: Swiss Cheese & Incident Prediction */}
            {jha.agent_outputs?.agent3_swiss_cheese && (
                <Agent3Card data={jha.agent_outputs.agent3_swiss_cheese} />
            )}
            {/* Agent 4: Synthesized Action Plan & Compliance */}
            {jha.agent_outputs?.agent4_final_report && (
                <Agent4Card data={jha.agent_outputs.agent4_final_report} />
            )}
        </div>
    );
}

// Processing View Component - shows SSE-powered progress tracker
function ProcessingView({ analysisId, onComplete }: { analysisId: string; onComplete: () => void }) {
    const progress = useJHAProgress(analysisId);

    useEffect(() => {
        if (progress.status === 'completed') {
            // Small delay to show completion before reloading
            const timer = setTimeout(onComplete, 1000);
            return () => clearTimeout(timer);
        }
        return undefined;
    }, [progress.status, onComplete]);

    return (
        <div className="flex h-[70vh] flex-col items-center justify-center p-4">
            <ProgressTracker
                currentAgent={progress.currentAgent}
                agentStatus={progress.agentStatus}
                progress={progress.progress}
                elapsedMs={progress.elapsedMs}
            />

            {progress.status === 'error' && progress.error && (
                <div className="mt-4 max-w-md p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-500 text-sm">
                    {progress.error}
                </div>
            )}
        </div>
    );
}
