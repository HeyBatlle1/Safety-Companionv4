'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useJHAStore } from '@/stores/jha-store';
import { useAnalyzeJHA } from '@/hooks/use-api';
import { useSSEProgress } from '@/hooks/use-sse-progress';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Building2, AlertTriangle, Shield, Loader2, AlertCircle } from 'lucide-react';
import { ProgressTracker } from './progress-tracker';

export function Step4Review() {
    const router = useRouter();
    const { jobInfo, hazards, controlMeasures, previousStep, resetForm } = useJHAStore();
    const analyzeJHA = useAnalyzeJHA();
    const [analysisId, setAnalysisId] = useState<string | null>(null);

    // Handle completion - navigate to results
    const handleComplete = useCallback(() => {
        if (analysisId) {
            resetForm();
            router.push(`/jha/${analysisId}`);
        }
    }, [analysisId, router, resetForm]);

    // Handle error - still navigate to see error details
    const handleError = useCallback((error: string) => {
        console.error('Analysis error:', error);
        if (analysisId) {
            resetForm();
            router.push(`/jha/${analysisId}`);
        }
    }, [analysisId, router, resetForm]);

    // SSE streaming for real-time progress (replaces polling)
    const { progress, isConnected, error: sseError } = useSSEProgress(analysisId, {
        onComplete: handleComplete,
        onError: handleError
    });

    const handleSubmit = async () => {
        console.log('Submit button clicked!');
        console.log('Job Info:', jobInfo);
        console.log('Hazards:', hazards);
        console.log('Control Measures:', controlMeasures);

        try {
            // Submit to backend API (now returns immediately with queued status)
            console.log('Calling analyzeJHA mutation...');
            const response: any = await analyzeJHA.mutateAsync({
                jobInfo,
                hazards,
                controlMeasures,
            });

            console.log('Analysis response:', response);
            // Start SSE streaming by setting the analysis ID
            setAnalysisId(response.id);
        } catch (error) {
            console.error('Failed to submit JHA:', error);
            // Error is handled by mutation state
        }
    };

    const isSubmitting = analyzeJHA.isPending;
    const isStreaming = !!analysisId;

    // Show progress tracker during analysis
    if (isStreaming) {
        return (
            <div className="py-12">
                <ProgressTracker
                    currentAgent={progress?.current_agent || 'system'}
                    agentStatus={progress?.agent_status || (isConnected ? 'connecting' : 'queued')}
                    progress={progress?.progress || 0}
                    elapsedMs={progress?.elapsed_ms || 0}
                />
                {sseError && (
                    <p className="text-center text-sm text-muted-foreground mt-4">
                        {sseError}
                    </p>
                )}
            </div>
        );
    }


    return (
        <div className="space-y-6">
            {/* Job Info Summary */}
            <Card className="card-highlight">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Building2 className="h-5 w-5 text-accent" />
                        Job Information
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <span className="text-muted-foreground">Project:</span>
                            <p className="font-medium">{jobInfo.projectName}</p>
                        </div>
                        <div>
                            <span className="text-muted-foreground">Location:</span>
                            <p className="font-medium">{jobInfo.location}</p>
                        </div>
                        <div>
                            <span className="text-muted-foreground">Work Type:</span>
                            <p className="font-medium">{jobInfo.workType}</p>
                        </div>
                        <div>
                            <span className="text-muted-foreground">Crew Size:</span>
                            <p className="font-medium">{jobInfo.crewSize} workers</p>
                        </div>
                        <div>
                            <span className="text-muted-foreground">Date:</span>
                            <p className="font-medium">{new Date(jobInfo.date).toLocaleDateString()}</p>
                        </div>
                        {jobInfo.supervisor && (
                            <div>
                                <span className="text-muted-foreground">Supervisor:</span>
                                <p className="font-medium">{jobInfo.supervisor}</p>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Hazards Summary */}
            <Card className="card-highlight">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-accent" />
                        Identified Hazards ({hazards.length})
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                    {hazards.map((hazard) => (
                        <div key={hazard.id} className="flex items-start gap-2 text-sm">
                            <Badge variant="secondary" className="capitalize">
                                {hazard.category}
                            </Badge>
                            <Badge variant={hazard.severity === 'critical' || hazard.severity === 'high' ? 'destructive' : 'default'} className="capitalize">
                                {hazard.severity}
                            </Badge>
                            <span className="flex-1">{hazard.description}</span>
                        </div>
                    ))}
                </CardContent>
            </Card>

            {/* Control Measures Summary */}
            <Card className="card-highlight">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Shield className="h-5 w-5 text-accent" />
                        Control Measures
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* PPE */}
                    <div>
                        <p className="text-sm font-medium mb-2">Required PPE:</p>
                        <div className="flex flex-wrap gap-2">
                            {controlMeasures.ppe.map((item) => (
                                <Badge key={item} variant="secondary">
                                    {item}
                                </Badge>
                            ))}
                        </div>
                    </div>

                    {/* Procedures */}
                    <div>
                        <p className="text-sm font-medium mb-2">Safety Procedures:</p>
                        <div className="flex flex-wrap gap-2">
                            {controlMeasures.procedures.map((item) => (
                                <Badge key={item} variant="secondary">
                                    {item}
                                </Badge>
                            ))}
                        </div>
                    </div>

                    {/* Emergency Plan */}
                    {controlMeasures.emergencyPlan && (
                        <div>
                            <p className="text-sm font-medium mb-2">Emergency Plan:</p>
                            <p className="text-sm text-muted-foreground">{controlMeasures.emergencyPlan}</p>
                        </div>
                    )}

                    {/* Additional Notes */}
                    {controlMeasures.additionalNotes && (
                        <div>
                            <p className="text-sm font-medium mb-2">Additional Notes:</p>
                            <p className="text-sm text-muted-foreground">{controlMeasures.additionalNotes}</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Error Display */}
            {analyzeJHA.isError && (
                <Card className="card-highlight border-destructive/50">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-destructive">
                            <AlertCircle className="h-5 w-5" />
                            Submission Failed
                        </CardTitle>
                        <CardDescription>
                            {analyzeJHA.error?.message || 'An error occurred while submitting your JHA. Please try again.'}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground">
                            Make sure the backend server is running at <code className="text-xs bg-muted px-1 py-0.5 rounded">http://localhost:8000</code>
                        </p>
                    </CardContent>
                </Card>
            )}

            {/* Submit Card */}
            <Card className="card-highlight border-accent/50">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5 text-accent" />
                        Ready to Submit
                    </CardTitle>
                    <CardDescription>
                        Your JHA will be analyzed by our AI safety experts for risk assessment and OSHA compliance
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex justify-between">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={previousStep}
                            disabled={isSubmitting}
                            className="touch-target-lg"
                        >
                            ← Back
                        </Button>
                        <Button
                            type="button"
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                            className="touch-target-lg"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Analyzing...
                                </>
                            ) : (
                                <>
                                    <CheckCircle2 className="mr-2 h-4 w-4" />
                                    Submit for Analysis
                                </>
                            )}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
