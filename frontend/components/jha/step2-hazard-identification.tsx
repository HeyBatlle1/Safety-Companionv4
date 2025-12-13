'use client';

import { useState } from 'react';
import { useJHAStore } from '@/stores/jha-store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Plus, X, Zap, Flame, Droplets, Wind } from 'lucide-react';
import { AIHazardSuggestions } from './AIHazardSuggestions';

const HAZARD_CATEGORIES = [
    { value: 'fall', label: 'Fall Hazards', icon: AlertTriangle },
    { value: 'electrical', label: 'Electrical', icon: Zap },
    { value: 'fire', label: 'Fire/Explosion', icon: Flame },
    { value: 'chemical', label: 'Chemical', icon: Droplets },
    { value: 'weather', label: 'Weather', icon: Wind },
    { value: 'equipment', label: 'Equipment', icon: AlertTriangle },
    { value: 'other', label: 'Other', icon: AlertTriangle },
];

const SEVERITY_COLORS = {
    low: 'secondary',
    medium: 'default',
    high: 'destructive',
    critical: 'destructive',
} as const;

export function Step2HazardIdentification() {
    const { hazards, addHazard, removeHazard, nextStep, previousStep, jobInfo } = useJHAStore();
    const [newHazard, setNewHazard] = useState<{
        categories: string[];
        description: string;
        severity: 'low' | 'medium' | 'high' | 'critical';
    }>({
        categories: [],
        description: '',
        severity: 'medium',
    });

    const toggleCategory = (category: string) => {
        setNewHazard(prev => ({
            ...prev,
            categories: prev.categories.includes(category)
                ? prev.categories.filter(c => c !== category)
                : [...prev.categories, category]
        }));
    };

    const handleAddHazard = () => {
        if (newHazard.categories.length > 0 && newHazard.description) {
            addHazard({
                id: Date.now().toString(),
                category: newHazard.categories.join(', '),  // Join for display
                description: newHazard.description,
                severity: newHazard.severity,
            });
            setNewHazard({ categories: [], description: '', severity: 'medium' });
        }
    };

    const handleSelectAISuggestion = (suggestions: string[]) => {
        // Add each AI suggestion as a hazard
        suggestions.forEach(suggestion => {
            addHazard({
                id: Date.now().toString() + Math.random(),
                category: newHazard.categories.join(', '),
                description: suggestion,
                severity: 'high', // AI suggestions are typically high severity
            });
        });
    };

    const isValid = hazards.length > 0;
    const showAISuggestions = newHazard.categories.length > 0 && jobInfo.workType && jobInfo.location;

    return (
        <div className="space-y-6">
            {/* Add Hazard Card */}
            <Card className="card-highlight">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-accent" />
                        Identify Hazards
                    </CardTitle>
                    <CardDescription>
                        Select one or more hazard categories, then describe the specific hazard. Add at least one hazard to continue.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Category Selection - Multiple */}
                    <div className="space-y-2">
                        <Label>Hazard Categories * (Select all that apply)</Label>
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                            {HAZARD_CATEGORIES.map((cat) => {
                                const Icon = cat.icon;
                                const isSelected = newHazard.categories.includes(cat.value);
                                return (
                                    <Button
                                        key={cat.value}
                                        type="button"
                                        variant={isSelected ? 'default' : 'outline'}
                                        className="h-auto flex-col gap-2 py-3 touch-target"
                                        onClick={() => toggleCategory(cat.value)}
                                    >
                                        <Icon className="h-4 w-4" />
                                        <span className="text-xs">{cat.label}</span>
                                    </Button>
                                );
                            })}
                        </div>
                        {newHazard.categories.length > 0 && (
                            <p className="text-xs text-muted-foreground">
                                Selected: {newHazard.categories.map(c =>
                                    HAZARD_CATEGORIES.find(cat => cat.value === c)?.label
                                ).join(', ')}
                            </p>
                        )}
                    </div>

                    {/* AI Suggestions - Show after categories selected */}
                    {showAISuggestions && (
                        <AIHazardSuggestions
                            workType={jobInfo.workType}
                            location={jobInfo.location}
                            selectedCategories={newHazard.categories}
                            onSelect={handleSelectAISuggestion}
                        />
                    )}

                    {/* Description */}
                    <div className="space-y-2">
                        <Label htmlFor="hazardDesc">Hazard Description *</Label>
                        <Input
                            id="hazardDesc"
                            value={newHazard.description}
                            onChange={(e) => setNewHazard({ ...newHazard, description: e.target.value })}
                            placeholder="Describe the specific hazard..."
                            className="touch-target"
                        />
                    </div>

                    {/* Severity */}
                    <div className="space-y-2">
                        <Label>Severity Level *</Label>
                        <div className="grid grid-cols-4 gap-2">
                            {(['low', 'medium', 'high', 'critical'] as const).map((sev) => (
                                <Button
                                    key={sev}
                                    type="button"
                                    variant={newHazard.severity === sev ? 'default' : 'outline'}
                                    className="touch-target capitalize"
                                    onClick={() => setNewHazard({ ...newHazard, severity: sev })}
                                >
                                    {sev}
                                </Button>
                            ))}
                        </div>
                    </div>

                    {/* Add Button */}
                    <Button
                        type="button"
                        onClick={handleAddHazard}
                        disabled={newHazard.categories.length === 0 || !newHazard.description}
                        className="w-full touch-target-lg"
                        variant="outline"
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Hazard
                    </Button>
                </CardContent>
            </Card>

            {/* Hazards List */}
            {hazards.length > 0 && (
                <Card className="card-highlight">
                    <CardHeader>
                        <CardTitle>Identified Hazards ({hazards.length})</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {hazards.map((hazard) => (
                            <div
                                key={hazard.id}
                                className="flex items-start justify-between gap-3 rounded-lg border border-border p-3"
                            >
                                <div className="flex-1 space-y-1">
                                    <div className="flex items-center gap-2">
                                        <Badge variant="secondary" className="capitalize">
                                            {hazard.category}
                                        </Badge>
                                        <Badge variant={SEVERITY_COLORS[hazard.severity]} className="capitalize">
                                            {hazard.severity}
                                        </Badge>
                                    </div>
                                    <p className="text-sm">{hazard.description}</p>
                                </div>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => removeHazard(hazard.id)}
                                    className="touch-target"
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        ))}
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
                    Continue to Control Measures →
                </Button>
            </div>
        </div>
    );
}
