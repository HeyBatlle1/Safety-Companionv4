'use client';

// File: components/jha/NewJHAWizard.tsx
// Progressive 4-card wizard for JHA data collection
// Designed to collect rich context for V1 agent pipeline

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { JHA_FORM_SCHEMA, Question, FormField } from './FormSchema';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, CheckCircle, ChevronLeft, ChevronRight, Shield, Loader2 } from 'lucide-react';
import { useAnalyzeJHA } from '@/lib/api/use-api';

export function NewJHAWizard() {
    const router = useRouter();
    const [currentCard, setCurrentCard] = useState(0);
    const [formData, setFormData] = useState<Record<string, any>>({});
    const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    const analyzeJHA = useAnalyzeJHA();

    const card = JHA_FORM_SCHEMA.cards[currentCard];
    const progress = ((currentCard + 1) / JHA_FORM_SCHEMA.cards.length) * 100;

    const validateCard = (): boolean => {
        const errors: Record<string, string> = {};

        card.questions.forEach(question => {
            const value = formData[question.id];

            // Required check
            if (question.required) {
                if (question.type === 'structured') {
                    // Check each required field in structured questions
                    const hasAllRequired = question.fields?.every(field =>
                        !field.required || (value && value[field.name])
                    );
                    if (!hasAllRequired) {
                        errors[question.id] = 'All required fields must be filled';
                    }
                } else if (!value || (typeof value === 'string' && value.trim() === '')) {
                    errors[question.id] = 'This field is required';
                }
            }

            // Min length check for textarea
            if (question.minLength && typeof value === 'string' && value.length < question.minLength) {
                errors[question.id] = `Minimum ${question.minLength} characters required for quality analysis (current: ${value.length})`;
            }

            // Validation rules (only check if we have a value and no other errors)
            if (value && !errors[question.id] && question.validationRules) {
                for (const rule of question.validationRules) {
                    if (rule.keyword) {
                        const regex = new RegExp(rule.keyword, 'i');
                        if (!regex.test(value)) {
                            // Show as warning, not blocking error
                            // errors[question.id] = rule.message;
                        }
                    }
                }
            }
        });

        setValidationErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleNext = () => {
        if (validateCard()) {
            setCurrentCard(c => c + 1);
            setValidationErrors({});
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const handleBack = () => {
        setCurrentCard(c => c - 1);
        setValidationErrors({});
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleSubmit = async () => {
        if (!validateCard()) return;

        setIsSubmitting(true);

        try {
            // Transform form data to match backend schema
            const projectDetails = formData.project_details || {};

            const requestData = {
                jobInfo: {
                    projectName: projectDetails.projectName || 'Untitled Project',
                    location: projectDetails.location || '',
                    workType: projectDetails.workType || 'General Construction',
                    crewSize: projectDetails.crewSize || 1,
                    date: new Date().toISOString().split('T')[0],
                    supervisor: projectDetails.supervisor || '',
                    buildingHeight: projectDetails.buildingHeight,
                    duration: projectDetails.duration,
                },
                hazards: [
                    {
                        category: 'Fall Hazards',
                        description: formData.top_three_hazards || '',
                        controls: formData.existing_controls || '',
                        severity: 'HIGH'
                    }
                ],
                controlMeasures: {
                    ppe: formData.ppe_requirements?.split(',').map((s: string) => s.trim()) || [],
                    procedures: [
                        formData.emergency_response || '',
                        formData.safety_meetings_jha || '',
                        formData.weather_monitoring || '',
                    ].filter(Boolean),
                    emergencyPlan: formData.emergency_response || '',
                    additionalNotes: ''
                },
                // Include all form data for rich context
                extendedData: {
                    card1_project_safety: {
                        emergency_response: formData.emergency_response,
                        competent_persons: formData.competent_persons,
                        safety_meetings_jha: formData.safety_meetings_jha,
                        permits_compliance: formData.permits_compliance,
                    },
                    card2_equipment_materials: {
                        major_equipment: formData.major_equipment,
                        fall_protection_pfas: formData.fall_protection_pfas,
                        materials_storage: formData.materials_storage,
                        ppe_requirements: formData.ppe_requirements,
                        equipment_certifications: formData.equipment_certifications,
                    },
                    card3_hazards_controls: {
                        top_three_hazards: formData.top_three_hazards,
                        existing_controls: formData.existing_controls,
                        work_environment: formData.work_environment,
                        weather_monitoring: formData.weather_monitoring,
                        ground_protection: formData.ground_protection,
                    },
                    card4_crew_schedule: {
                        crew_experience: formData.crew_experience,
                        schedule_pressure: formData.schedule_pressure,
                        supervision_oversight: formData.supervision_oversight,
                        incident_history: formData.incident_history,
                        communication_coordination: formData.communication_coordination,
                    }
                }
            };

            const response = await analyzeJHA.mutateAsync(requestData);

            // Navigate to results page
            if (response?.id) {
                router.push(`/jha/${response.id}`);
            }
        } catch (error) {
            console.error('Analysis submission failed:', error);
            setValidationErrors({
                _form: 'Failed to submit analysis. Please try again.'
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const renderField = (field: FormField, questionId: string) => {
        const value = formData[questionId]?.[field.name] || '';

        const handleChange = (newValue: string | number) => {
            setFormData({
                ...formData,
                [questionId]: {
                    ...formData[questionId],
                    [field.name]: newValue
                }
            });
        };

        return (
            <div key={field.name} className="space-y-2">
                <Label htmlFor={`${questionId}-${field.name}`}>
                    {field.label}
                    {field.required && <span className="text-red-500 ml-1">*</span>}
                </Label>

                {field.type === 'text' && (
                    <Input
                        id={`${questionId}-${field.name}`}
                        value={value}
                        onChange={(e) => handleChange(e.target.value)}
                        className="bg-background"
                    />
                )}

                {field.type === 'number' && (
                    <Input
                        type="number"
                        id={`${questionId}-${field.name}`}
                        value={value}
                        onChange={(e) => handleChange(parseInt(e.target.value) || 0)}
                        className="bg-background"
                    />
                )}

                {field.type === 'select' && field.options && (
                    <Select
                        value={value}
                        onValueChange={(v) => handleChange(v)}
                    >
                        <SelectTrigger className="bg-background">
                            <SelectValue placeholder="Select..." />
                        </SelectTrigger>
                        <SelectContent>
                            {field.options.map(opt => (
                                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )}
            </div>
        );
    };

    const renderQuestion = (question: Question) => {
        const value = formData[question.id] || '';
        const charCount = typeof value === 'string' ? value.length : 0;
        const meetsMinLength = !question.minLength || charCount >= question.minLength;

        return (
            <div key={question.id} className="space-y-3 p-4 bg-card/50 rounded-lg border border-border/50">
                <Label htmlFor={question.id} className="text-base font-medium">
                    {question.label}
                    {question.required && <span className="text-red-500 ml-1">*</span>}
                </Label>

                {question.type === 'textarea' && (
                    <>
                        <Textarea
                            id={question.id}
                            placeholder={question.placeholder}
                            value={value}
                            onChange={(e) => setFormData({ ...formData, [question.id]: e.target.value })}
                            rows={5}
                            className={`bg-background resize-none ${validationErrors[question.id] ? 'border-red-500' : ''}`}
                        />
                        <div className="flex justify-between items-center text-xs text-muted-foreground">
                            <span className={charCount >= (question.minLength || 0) ? 'text-primary' : ''}>
                                {charCount} / {question.minLength || 0} characters
                            </span>
                            {meetsMinLength && question.minLength && (
                                <span className="text-primary flex items-center gap-1">
                                    <CheckCircle className="h-3 w-3" />
                                    Sufficient detail
                                </span>
                            )}
                        </div>
                    </>
                )}

                {question.type === 'structured' && question.fields && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {question.fields.map(field => renderField(field, question.id))}
                    </div>
                )}

                {question.hint && (
                    <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded border-l-2 border-primary/50">
                        💡 {question.hint}
                    </div>
                )}

                {validationErrors[question.id] && (
                    <p className="text-xs text-red-500 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {validationErrors[question.id]}
                    </p>
                )}
            </div>
        );
    };

    return (
        <div className="max-w-4xl mx-auto p-4 md:p-6 pb-32">
            {/* Header */}
            <div className="mb-6">
                <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-2">
                        <Shield className="h-5 w-5 text-primary" />
                        <span className="font-medium">New JHA Analysis</span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                        Step {currentCard + 1} of {JHA_FORM_SCHEMA.cards.length}
                    </span>
                </div>
                <Progress value={progress} className="h-2" />
                <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                    <span>{card.title}</span>
                    <span>{card.agentMapping}</span>
                </div>
            </div>

            {/* Card */}
            <Card className="border-border/50">
                <CardHeader className="border-b border-border/50">
                    <CardTitle className="flex items-center gap-2">
                        <span className="bg-primary/20 text-primary px-2 py-1 rounded text-sm">
                            {currentCard + 1}
                        </span>
                        {card.title}
                    </CardTitle>
                    <CardDescription>{card.description}</CardDescription>
                </CardHeader>

                <CardContent className="space-y-6 pt-6">
                    {card.questions.map(renderQuestion)}
                </CardContent>

                <CardFooter className="flex justify-between border-t border-border/50 pt-6">
                    <Button
                        variant="outline"
                        onClick={handleBack}
                        disabled={currentCard === 0 || isSubmitting}
                        className="gap-2"
                    >
                        <ChevronLeft className="h-4 w-4" />
                        Back
                    </Button>

                    {currentCard < JHA_FORM_SCHEMA.cards.length - 1 ? (
                        <Button onClick={handleNext} className="gap-2">
                            Next: {JHA_FORM_SCHEMA.cards[currentCard + 1].title.split(' ')[0]}
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    ) : (
                        <Button
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                            className="bg-primary hover:bg-primary/90 gap-2"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Analyzing...
                                </>
                            ) : (
                                <>
                                    <Shield className="h-4 w-4" />
                                    Analyze Safety Plan
                                </>
                            )}
                        </Button>
                    )}
                </CardFooter>
            </Card>

            {/* Form-level errors */}
            {validationErrors._form && (
                <div className="mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-500 text-sm flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    {validationErrors._form}
                </div>
            )}

            {/* Card indicator dots */}
            <div className="flex justify-center gap-2 mt-6">
                {JHA_FORM_SCHEMA.cards.map((c, idx) => (
                    <button
                        key={c.id}
                        onClick={() => {
                            if (idx < currentCard) {
                                setCurrentCard(idx);
                                setValidationErrors({});
                            }
                        }}
                        disabled={idx > currentCard}
                        className={`w-3 h-3 rounded-full transition-colors ${idx === currentCard
                                ? 'bg-primary'
                                : idx < currentCard
                                    ? 'bg-primary/50 cursor-pointer hover:bg-primary/70'
                                    : 'bg-muted cursor-not-allowed'
                            }`}
                    />
                ))}
            </div>
        </div>
    );
}
