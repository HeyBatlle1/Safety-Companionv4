'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Loader2, AlertTriangle, Sparkles } from 'lucide-react';

interface Suggestion {
    hazard: string;
    severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
    category: string;
}

interface AIHazardSuggestionsProps {
    workType: string;
    location: string;
    selectedCategories: string[];
    onSelect: (hazards: string[]) => void;
}

const severityColors = {
    CRITICAL: 'destructive',
    HIGH: 'destructive',
    MEDIUM: 'secondary',
    LOW: 'outline'
} as const;

export function AIHazardSuggestions({
    workType,
    location,
    selectedCategories,
    onSelect
}: AIHazardSuggestionsProps) {
    const [loading, setLoading] = useState(false);
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [selected, setSelected] = useState<string[]>([]);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (workType && location && selectedCategories.length > 0) {
            fetchSuggestions();
        }
    }, [workType, location, selectedCategories]);

    const fetchSuggestions = async () => {
        setLoading(true);
        setError(null);

        try {
            const response = await fetch('http://localhost:8000/api/v1/jha/ai-suggestions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    work_type: workType,
                    location,
                    hazard_categories: selectedCategories
                })
            });

            if (!response.ok) {
                throw new Error('Failed to fetch suggestions');
            }

            const data = await response.json();
            setSuggestions(data.suggestions || []);
        } catch (error) {
            console.error('Failed to fetch AI suggestions:', error);
            setError('Unable to generate AI suggestions. Please continue manually.');
            setSuggestions([]);
        } finally {
            setLoading(false);
        }
    };

    const handleToggle = (hazard: string) => {
        const newSelected = selected.includes(hazard)
            ? selected.filter(h => h !== hazard)
            : [...selected, hazard];
        setSelected(newSelected);
        onSelect(newSelected);
    };

    if (loading) {
        return (
            <Card className="border-accent/50 bg-accent/5">
                <CardContent className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-accent mr-2" />
                    <span className="text-sm">Generating AI suggestions...</span>
                </CardContent>
            </Card>
        );
    }

    if (error) {
        return (
            <Card className="border-yellow-500/50 bg-yellow-500/5">
                <CardContent className="py-4">
                    <p className="text-sm text-yellow-600 dark:text-yellow-400">
                        ⚠️ {error}
                    </p>
                </CardContent>
            </Card>
        );
    }

    if (suggestions.length === 0) return null;

    return (
        <Card className="border-accent/50 bg-accent/5">
            <CardHeader>
                <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-accent" />
                    <CardTitle className="text-lg">AI-Suggested Hazards</CardTitle>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                    Based on <strong>{workType}</strong> in <strong>{location}</strong>
                </p>
            </CardHeader>
            <CardContent className="space-y-3">
                {suggestions.map((suggestion, index) => (
                    <div
                        key={index}
                        className="flex items-start gap-3 p-3 rounded-lg hover:bg-accent/10 transition-colors cursor-pointer"
                        onClick={() => handleToggle(suggestion.hazard)}
                    >
                        <Checkbox
                            checked={selected.includes(suggestion.hazard)}
                            onCheckedChange={() => handleToggle(suggestion.hazard)}
                            className="mt-0.5"
                        />
                        <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm leading-relaxed">
                                {suggestion.hazard}
                            </p>
                            <div className="flex items-center gap-2 mt-1.5">
                                <Badge
                                    variant={severityColors[suggestion.severity]}
                                    className="text-xs"
                                >
                                    {suggestion.severity}
                                </Badge>
                                <span className="text-xs text-muted-foreground capitalize">
                                    {suggestion.category}
                                </span>
                            </div>
                        </div>
                    </div>
                ))}

                {selected.length > 0 && (
                    <div className="pt-3 border-t">
                        <p className="text-sm text-muted-foreground">
                            ✓ {selected.length} hazard{selected.length !== 1 ? 's' : ''} selected
                        </p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
