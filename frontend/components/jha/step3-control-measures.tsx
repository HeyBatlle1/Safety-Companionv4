'use client';

import { useState } from 'react';
import { useJHAStore } from '@/stores/jha-store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Shield, Plus, X, HardHat, AlertCircle } from 'lucide-react';

const COMMON_PPE = [
    'Hard Hat',
    'Safety Glasses',
    'High-Vis Vest',
    'Steel-Toe Boots',
    'Gloves',
    'Hearing Protection',
    'Respirator',
    'Fall Protection Harness',
];

const COMMON_PROCEDURES = [
    'Pre-job safety briefing',
    'Equipment inspection',
    'Lockout/Tagout',
    'Confined space entry permit',
    'Hot work permit',
    'Fall protection plan',
    'Emergency evacuation plan',
    'Weather monitoring',
];

export function Step3ControlMeasures() {
    const { controlMeasures, updateControlMeasures, nextStep, previousStep } = useJHAStore();
    const [customPPE, setCustomPPE] = useState('');
    const [customProcedure, setCustomProcedure] = useState('');

    const togglePPE = (item: string) => {
        const current = controlMeasures.ppe;
        const updated = current.includes(item)
            ? current.filter((p) => p !== item)
            : [...current, item];
        updateControlMeasures({ ppe: updated });
    };

    const addCustomPPE = () => {
        if (customPPE && !controlMeasures.ppe.includes(customPPE)) {
            updateControlMeasures({ ppe: [...controlMeasures.ppe, customPPE] });
            setCustomPPE('');
        }
    };

    const toggleProcedure = (item: string) => {
        const current = controlMeasures.procedures;
        const updated = current.includes(item)
            ? current.filter((p) => p !== item)
            : [...current, item];
        updateControlMeasures({ procedures: updated });
    };

    const addCustomProcedure = () => {
        if (customProcedure && !controlMeasures.procedures.includes(customProcedure)) {
            updateControlMeasures({ procedures: [...controlMeasures.procedures, customProcedure] });
            setCustomProcedure('');
        }
    };

    const removePPE = (item: string) => {
        updateControlMeasures({ ppe: controlMeasures.ppe.filter((p) => p !== item) });
    };

    const removeProcedure = (item: string) => {
        updateControlMeasures({ procedures: controlMeasures.procedures.filter((p) => p !== item) });
    };

    const isValid = controlMeasures.ppe.length > 0 && controlMeasures.procedures.length > 0;

    return (
        <div className="space-y-6">
            {/* PPE Card */}
            <Card className="card-highlight">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <HardHat className="h-5 w-5 text-accent" />
                        Personal Protective Equipment (PPE)
                    </CardTitle>
                    <CardDescription>
                        Select all required PPE for this job
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Common PPE */}
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                        {COMMON_PPE.map((item) => (
                            <Button
                                key={item}
                                type="button"
                                variant={controlMeasures.ppe.includes(item) ? 'default' : 'outline'}
                                className="h-auto py-3 text-xs touch-target"
                                onClick={() => togglePPE(item)}
                            >
                                {item}
                            </Button>
                        ))}
                    </div>

                    {/* Custom PPE */}
                    <div className="flex gap-2">
                        <Input
                            value={customPPE}
                            onChange={(e) => setCustomPPE(e.target.value)}
                            placeholder="Add custom PPE..."
                            className="touch-target"
                            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomPPE())}
                        />
                        <Button
                            type="button"
                            onClick={addCustomPPE}
                            disabled={!customPPE}
                            className="touch-target"
                        >
                            <Plus className="h-4 w-4" />
                        </Button>
                    </div>

                    {/* Selected PPE */}
                    {controlMeasures.ppe.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                            {controlMeasures.ppe.map((item) => (
                                <Badge key={item} variant="secondary" className="gap-1">
                                    {item}
                                    <button
                                        type="button"
                                        onClick={() => removePPE(item)}
                                        className="ml-1 hover:text-destructive"
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                </Badge>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Procedures Card */}
            <Card className="card-highlight">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Shield className="h-5 w-5 text-accent" />
                        Safety Procedures
                    </CardTitle>
                    <CardDescription>
                        Select all safety procedures that will be followed
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Common Procedures */}
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {COMMON_PROCEDURES.map((item) => (
                            <Button
                                key={item}
                                type="button"
                                variant={controlMeasures.procedures.includes(item) ? 'default' : 'outline'}
                                className="h-auto py-3 text-xs text-left justify-start touch-target"
                                onClick={() => toggleProcedure(item)}
                            >
                                {item}
                            </Button>
                        ))}
                    </div>

                    {/* Custom Procedure */}
                    <div className="flex gap-2">
                        <Input
                            value={customProcedure}
                            onChange={(e) => setCustomProcedure(e.target.value)}
                            placeholder="Add custom procedure..."
                            className="touch-target"
                            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomProcedure())}
                        />
                        <Button
                            type="button"
                            onClick={addCustomProcedure}
                            disabled={!customProcedure}
                            className="touch-target"
                        >
                            <Plus className="h-4 w-4" />
                        </Button>
                    </div>

                    {/* Selected Procedures */}
                    {controlMeasures.procedures.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                            {controlMeasures.procedures.map((item) => (
                                <Badge key={item} variant="secondary" className="gap-1">
                                    {item}
                                    <button
                                        type="button"
                                        onClick={() => removeProcedure(item)}
                                        className="ml-1 hover:text-destructive"
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                </Badge>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Emergency Plan */}
            <Card className="card-highlight">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <AlertCircle className="h-5 w-5 text-accent" />
                        Emergency Response Plan
                    </CardTitle>
                    <CardDescription>
                        Describe emergency procedures and contact information
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="emergencyPlan">Emergency Plan</Label>
                        <textarea
                            id="emergencyPlan"
                            value={controlMeasures.emergencyPlan}
                            onChange={(e) => updateControlMeasures({ emergencyPlan: e.target.value })}
                            placeholder="Emergency contacts, evacuation routes, first aid location, etc."
                            className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="additionalNotes">Additional Notes</Label>
                        <textarea
                            id="additionalNotes"
                            value={controlMeasures.additionalNotes}
                            onChange={(e) => updateControlMeasures({ additionalNotes: e.target.value })}
                            placeholder="Any additional safety considerations..."
                            className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Validation Message */}
            {!isValid && (
                <Card className="border-yellow-500/50 bg-yellow-500/5">
                    <CardContent className="py-4">
                        <p className="text-sm text-yellow-600 dark:text-yellow-400 flex items-center gap-2">
                            <AlertCircle className="h-4 w-4" />
                            <span>
                                Please select at least <strong>1 PPE item</strong> and <strong>1 safety procedure</strong> to continue
                            </span>
                        </p>
                    </CardContent>
                </Card>
            )}

            {/* Navigation */}
            <div className="flex justify-between">
                <Button
                    type="button"
                    variant="outline"
                    onClick={previousStep}
                    className="touch-target-lg"
                >
                    ← Back
                </Button>
                <Button
                    type="button"
                    onClick={nextStep}
                    disabled={!isValid}
                    className="touch-target-lg"
                >
                    Review & Submit →
                </Button>
            </div>
        </div>
    );
}
