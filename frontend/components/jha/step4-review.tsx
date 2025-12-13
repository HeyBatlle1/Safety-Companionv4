'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useJHAStore } from '@/stores/jha-store';
import { useAnalyzeJHA, useJHADetails } from '@/hooks/use-api';
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

    // Poll for status if we have an analysis ID
    const { data: analysisStatus } = useJHADetails(analysisId ?? '', {
        refetchInterval: (data) => {
            // Keep polling if status is present and indicates processing
            if (data?.status === 'processing' || data?.status === 'queued' || data?.status === 'starting' || data?.status === 'initializing') {
                return 1000;
            }
            return false;
        }
    });

    const isPolling = !!analysisId;

    // Watch for completion (when status field is gone or risk_score exists)
    useEffect(() => {
        if (analysisStatus && analysisId) {
            // If we have a risk_score or summary, analysis is complete
            if (analysisStatus.risk_score !== undefined || analysisStatus.summary) {
                resetForm();
                router.push(`/jha/${analysisId}`);
            }
            // Handle Failure
            if (analysisStatus.status === 'failed' || analysisStatus.error) {
                resetForm();
                router.push(`/jha/${analysisId}`);
            }
        }
    }, [analysisStatus, analysisId, router, resetForm]);

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
            // Start polling
            setAnalysisId(response.id);
        } catch (error) {
            console.error('Failed to submit JHA:', error);
            // Error is handled by mutation state
        }
    };

    const isSubmitting = analyzeJHA.isPending;

    if (isPolling) {
        return (
            <div className="py-12">
                <ProgressTracker
                    currentAgent={analysisStatus?.current_agent || 'system'}
                    agentStatus={analysisStatus?.agent_status || 'queued'}
                    progress={analysisStatus?.progress || 0}
                    elapsedMs={analysisStatus?.elapsed_ms || 0}
                />
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
