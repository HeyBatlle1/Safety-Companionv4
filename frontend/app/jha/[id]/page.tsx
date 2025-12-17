'use client';

import { useParams, useRouter } from 'next/navigation';
import { useJHADetails } from '@/hooks/use-api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, CheckCircle2, AlertTriangle, XCircle, Shield, FileText, Download } from 'lucide-react';
import { format } from 'date-fns';
import { OSHAComplianceSection } from '@/components/jha/OSHAComplianceSection';
import { ActionPlanSection } from '@/components/jha/ActionPlanSection';

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
    if (jha.status === 'processing' || jha.status === 'error' || jha.status === 'failed' || jha.status === 'broken') {
        return (
            <div className="flex h-[50vh] flex-col items-center justify-center gap-4">
                {/* @ts-ignore */}
                {jha.status === 'processing' ? (
                    <>
                        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                        <h2 className="text-xl font-semibold">Analysis in Progress</h2>
                        <p className="text-muted-foreground">Please wait while agents complete their assessment...</p>
                    </>
                ) : (
                    <>
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
                    </>
                )}
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

                        {/* Executive Summary Prose */}
                        {jha.agent_outputs?.agent4_final_report?.executiveSummary && (
                            <div className="mt-6 pt-6 border-t">
                                <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                                    {jha.agent_outputs.agent4_final_report.executiveSummary}
                                </p>
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

            {/* Agent 1: Validation Results */}
            {jha.agent_outputs?.agent1_validation && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <CheckCircle2 className="h-5 w-5 text-accent" />
                            Validation Analysis
                        </CardTitle>
                        <CardDescription>Data quality and completeness check</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4 rounded-lg bg-muted/50 p-4">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Quality Score</p>
                                <p className="text-lg font-semibold">{jha.agent_outputs.agent1_validation.validation?.qualityScore}/10</p>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Status</p>
                                <Badge variant={jha.agent_outputs.agent1_validation.validation?.reviewStatus === 'APPROVED' ? 'default' : 'destructive'}>
                                    {jha.agent_outputs.agent1_validation.validation?.reviewStatus}
                                </Badge>
                            </div>
                        </div>

                        {jha.agent_outputs.agent1_validation.missingCritical?.length > 0 && (
                            <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-4">
                                <h4 className="mb-2 font-medium text-destructive">Missing Critical Items</h4>
                                <ul className="list-inside list-disc space-y-1 text-sm">
                                    {jha.agent_outputs.agent1_validation.missingCritical.map((item: string, i: number) => (
                                        <li key={i}>{item}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Agent 2: Risk Assessment */}
            {jha.agent_outputs?.agent2_risk_assessment && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-orange-500" />
                            Risk Assessment
                        </CardTitle>
                        <CardDescription>Identified hazards and risk levels</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-4">
                            {jha.agent_outputs.agent2_risk_assessment.riskProfile?.hazards?.map((hazard: any, i: number) => (
                                <div key={i} className="rounded-lg border bg-card p-4">
                                    <div className="mb-2 flex items-start justify-between">
                                        <div>
                                            <h4 className="font-semibold">{hazard.name}</h4>
                                            <p className="text-sm text-muted-foreground">{hazard.category}</p>
                                        </div>
                                        <Badge variant={hazard.riskLevel === 'EXTREME' || hazard.riskLevel === 'HIGH' ? 'destructive' : 'secondary'}>
                                            {hazard.riskLevel}
                                        </Badge>
                                    </div>
                                    <div className="grid gap-2 text-sm sm:grid-cols-2">
                                        <div>
                                            <span className="font-medium">Problem: </span>
                                            {hazard.inadequateControls?.[0]}
                                        </div>
                                        <div>
                                            <span className="font-medium">Recommendation: </span>
                                            {hazard.recommendedControls?.[0]}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Agent 3: Swiss Cheese & OSHA Analysis */}
            {jha.agent_outputs?.agent3_swiss_cheese && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Shield className="h-5 w-5 text-purple-600" />
                            Swiss Cheese & OSHA Analysis
                        </CardTitle>
                        <CardDescription>Incident prediction and barrier analysis</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Incident Prediction */}
                        <div className="rounded-lg bg-muted/50 p-4">
                            <h4 className="font-semibold text-lg">{jha.agent_outputs.agent3_swiss_cheese.incidentPrediction?.incidentName}</h4>
                            <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                <div>Prediction: <span className="font-bold">{(jha.agent_outputs.agent3_swiss_cheese.incidentPrediction?.probabilityNext4Hours || 0) * 100}%</span> probability in next 4h</div>
                                <div className="flex items-center gap-2">
                                    Severity:
                                    <Badge variant={jha.agent_outputs.agent3_swiss_cheese.incidentPrediction?.severity === 'Fatal' || jha.agent_outputs.agent3_swiss_cheese.incidentPrediction?.severity === 'Critical' ? 'destructive' : 'default'}>
                                        {jha.agent_outputs.agent3_swiss_cheese.incidentPrediction?.severity}
                                    </Badge>
                                </div>
                            </div>
                        </div>

                        {/* Holes Alignment */}
                        <div>
                            <h4 className="mb-2 font-medium">Swiss Cheese Model Alignment</h4>
                            <div className="grid gap-2 text-sm border-l-2 border-purple-200 pl-4">
                                <p><span className="font-semibold">Organizational:</span> {jha.agent_outputs.agent3_swiss_cheese.swissCheeseAlignment?.organizationalHole}</p>
                                <p><span className="font-semibold">Supervision:</span> {jha.agent_outputs.agent3_swiss_cheese.swissCheeseAlignment?.supervisionHole}</p>
                                <p><span className="font-semibold">Unsafe Act:</span> {jha.agent_outputs.agent3_swiss_cheese.swissCheeseAlignment?.actHole}</p>
                            </div>
                        </div>

                        {/* Defense Failures (OSHA Gaps) */}
                        <div>
                            <h4 className="mb-2 font-medium flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-orange-500" /> Defense Failures (OSHA Gaps)</h4>
                            <div className="space-y-2">
                                {jha.agent_outputs.agent3_swiss_cheese.causalChain?.defenseFailures?.map((fail: any, i: number) => (
                                    <div key={i} className="rounded border p-3 text-sm bg-card">
                                        <div className="font-semibold">{fail.barrier}</div>
                                        <div className="text-destructive font-medium">{fail.failureMode}</div>
                                        <div className="text-xs text-muted-foreground mt-1">"{fail.evidence}"</div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Interventions */}
                        <div>
                            <h4 className="mb-2 font-medium">Recommended Interventions</h4>
                            <div className="space-y-2">
                                {jha.agent_outputs.agent3_swiss_cheese.interventions?.map((action: any, i: number) => (
                                    <div key={i} className="flex items-start gap-2 text-sm">
                                        <CheckCircle2 className="mt-0.5 h-4 w-4 text-green-500 shrink-0" />
                                        <span><span className="font-semibold">{action.timeframe}:</span> {action.action}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}
            {/* Agent 4: Synthesized Plan (Action Items & Compliance) */}
            {jha.agent_outputs?.agent4_final_report && (
                <div className="grid gap-6 md:grid-cols-2">
                    {/* Compliance & Emergency */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Shield className="h-5 w-5 text-blue-600" />
                                Compliance & Readiness
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Compliance Status */}
                            <OSHAComplianceSection
                                overallStatus={jha.agent_outputs.agent4_final_report.complianceStatus?.overallStatus || 'UNKNOWN'}
                                identifiedGaps={jha.agent_outputs.agent4_final_report.complianceStatus?.identifiedGaps || []}
                            />

                            {/* Emergency Readiness */}
                            <div>
                                <h4 className="mb-2 font-medium">Emergency Readiness</h4>
                                <div className="grid grid-cols-2 gap-2 text-sm mb-2">
                                    <div className="flex items-center gap-2">
                                        <span className={jha.agent_outputs.agent4_final_report.emergencyReadiness?.rescueCapability === 'ADEQUATE' ? "text-green-600" : "text-red-600"}>
                                            {jha.agent_outputs.agent4_final_report.emergencyReadiness?.rescueCapability === 'ADEQUATE' ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                                        </span>
                                        Rescue Capable
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className={jha.agent_outputs.agent4_final_report.emergencyReadiness?.firstAid ? "text-green-600" : "text-red-600"}>
                                            {jha.agent_outputs.agent4_final_report.emergencyReadiness?.firstAid ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                                        </span>
                                        First Aid
                                    </div>
                                </div>
                                {jha.agent_outputs.agent4_final_report.emergencyReadiness?.gaps?.length > 0 && (
                                    <div className="rounded border border-orange-200 bg-orange-50 p-2 text-xs text-orange-800">
                                        <span className="font-semibold block mb-1">Missing Components:</span>
                                        <ul className="list-disc list-inside">
                                            {jha.agent_outputs.agent4_final_report.emergencyReadiness.gaps.map((gap: string, i: number) => (
                                                <li key={i}>{gap}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Prioritized Action Plan */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <FileText className="h-5 w-5 text-primary" />
                                Action Plan
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ActionPlanSection actionItems={jha.agent_outputs.agent4_final_report.actionItems || []} />
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
