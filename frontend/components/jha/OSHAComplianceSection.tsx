'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface OSHAGap {
    standard: string;
    severity: string;
    action: string;
}

interface OSHAComplianceSectionProps {
    overallStatus: string;
    identifiedGaps: OSHAGap[];
}

export function OSHAComplianceSection({ overallStatus, identifiedGaps }: OSHAComplianceSectionProps) {
    const [expanded, setExpanded] = useState(false);

    // Group gaps by severity
    const criticalGaps = identifiedGaps.filter(g => g.severity === 'High' || g.severity === 'CRITICAL');
    const mediumGaps = identifiedGaps.filter(g => g.severity === 'Medium' || g.severity === 'MEDIUM');
    const lowGaps = identifiedGaps.filter(g => g.severity === 'Low' || g.severity === 'LOW');

    // Extract unique standards (remove duplicates)
    const uniqueStandards = Array.from(new Set(identifiedGaps.map(g => g.standard)));

    if (identifiedGaps.length === 0) {
        return (
            <div>
                <h4 className="mb-2 font-medium flex items-center justify-between">
                    OSHA Compliance
                    <Badge variant="default">COMPLIANT</Badge>
                </h4>
                <p className="text-sm text-green-600 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    No compliance gaps identified.
                </p>
            </div>
        );
    }

    return (
        <div>
            <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-orange-500" />
                    OSHA Compliance
                </h4>
                <Badge variant={overallStatus === 'COMPLIANT' ? 'default' : 'destructive'}>
                    {overallStatus}
                </Badge>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-2 mb-3">
                <Card className="border-red-200 bg-red-50">
                    <CardContent className="p-3 text-center">
                        <div className="text-2xl font-bold text-red-700">{criticalGaps.length}</div>
                        <div className="text-xs text-red-600">Critical</div>
                    </CardContent>
                </Card>
                <Card className="border-orange-200 bg-orange-50">
                    <CardContent className="p-3 text-center">
                        <div className="text-2xl font-bold text-orange-700">{mediumGaps.length}</div>
                        <div className="text-xs text-orange-600">Medium</div>
                    </CardContent>
                </Card>
                <Card className="border-yellow-200 bg-yellow-50">
                    <CardContent className="p-3 text-center">
                        <div className="text-2xl font-bold text-yellow-700">{lowGaps.length}</div>
                        <div className="text-xs text-yellow-600">Low</div>
                    </CardContent>
                </Card>
            </div>

            {/* Standards Summary */}
            <div className="mb-3 p-3 rounded-lg bg-muted/50">
                <div className="text-sm font-medium mb-2">Affected Standards ({uniqueStandards.length})</div>
                <div className="flex flex-wrap gap-1">
                    {uniqueStandards.slice(0, 5).map((standard, i) => (
                        <Badge key={i} variant="outline" className="text-xs">
                            {standard}
                        </Badge>
                    ))}
                    {uniqueStandards.length > 5 && (
                        <Badge variant="outline" className="text-xs">
                            +{uniqueStandards.length - 5} more
                        </Badge>
                    )}
                </div>
            </div>

            {/* Expand/Collapse Button */}
            <Button
                variant="ghost"
                size="sm"
                onClick={() => setExpanded(!expanded)}
                className="w-full mb-2"
            >
                {expanded ? (
                    <>
                        <ChevronUp className="h-4 w-4 mr-2" />
                        Hide Details
                    </>
                ) : (
                    <>
                        <ChevronDown className="h-4 w-4 mr-2" />
                        Show All {identifiedGaps.length} Citations
                    </>
                )}
            </Button>

            {/* Detailed List (Collapsible) */}
            {expanded && (
                <div className="space-y-2 mt-3 max-h-96 overflow-y-auto">
                    {/* Critical First */}
                    {criticalGaps.length > 0 && (
                        <div>
                            <div className="text-xs font-semibold text-red-600 mb-1">CRITICAL</div>
                            {criticalGaps.map((gap, i) => (
                                <div key={i} className="rounded border bg-red-50 p-2 text-sm text-red-900 border-red-200 mb-1">
                                    <div className="font-semibold">{gap.standard}</div>
                                    <div className="text-xs mt-1">{gap.action}</div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Medium */}
                    {mediumGaps.length > 0 && (
                        <div>
                            <div className="text-xs font-semibold text-orange-600 mb-1">MEDIUM</div>
                            {mediumGaps.map((gap, i) => (
                                <div key={i} className="rounded border bg-orange-50 p-2 text-sm text-orange-900 border-orange-200 mb-1">
                                    <div className="font-semibold">{gap.standard}</div>
                                    <div className="text-xs mt-1">{gap.action}</div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Low */}
                    {lowGaps.length > 0 && (
                        <div>
                            <div className="text-xs font-semibold text-yellow-600 mb-1">LOW</div>
                            {lowGaps.map((gap, i) => (
                                <div key={i} className="rounded border bg-yellow-50 p-2 text-sm text-yellow-900 border-yellow-200 mb-1">
                                    <div className="font-semibold">{gap.standard}</div>
                                    <div className="text-xs mt-1">{gap.action}</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
