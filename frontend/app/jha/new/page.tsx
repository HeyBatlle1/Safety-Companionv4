'use client';

import { useJHAStore } from '@/stores/jha-store';
import { Step1JobInfo } from '@/components/jha/step1-job-info';
import { Step2HazardIdentification } from '@/components/jha/step2-hazard-identification';
import { Step3ControlMeasures } from '@/components/jha/step3-control-measures';
import { Step4Review } from '@/components/jha/step4-review';
import { Card } from '@/components/ui/card';
import { CheckCircle2, Circle } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

const STEPS = [
    { number: 1, title: 'Job Info', description: 'Project details' },
    { number: 2, title: 'Hazards', description: 'Identify risks' },
    { number: 3, title: 'Controls', description: 'Safety measures' },
    { number: 4, title: 'Review', description: 'Submit for analysis' },
];

export default function NewJHAPage() {
    const { currentStep } = useJHAStore();

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link href="/">
                    <Button variant="ghost" size="icon" className="touch-target">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-high-contrast">
                        Create New JHA
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Step {currentStep} of 4: {STEPS[currentStep - 1].title}
                    </p>
                </div>
            </div>

            {/* Progress Indicator */}
            <Card className="card-highlight">
                <div className="p-4">
                    <div className="flex items-center justify-between">
                        {STEPS.map((step, index) => (
                            <div key={step.number} className="flex items-center flex-1">
                                {/* Step Circle */}
                                <div className="flex flex-col items-center">
                                    <div
                                        className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors ${currentStep > step.number
                                                ? 'border-accent bg-accent text-accent-foreground'
                                                : currentStep === step.number
                                                    ? 'border-accent bg-background text-accent'
                                                    : 'border-muted-foreground/30 bg-background text-muted-foreground'
                                            }`}
                                    >
                                        {currentStep > step.number ? (
                                            <CheckCircle2 className="h-5 w-5" />
                                        ) : (
                                            <span className="text-sm font-semibold">{step.number}</span>
                                        )}
                                    </div>
                                    <div className="mt-2 text-center hidden sm:block">
                                        <p className="text-xs font-medium">{step.title}</p>
                                        <p className="text-xs text-muted-foreground">{step.description}</p>
                                    </div>
                                </div>

                                {/* Connector Line */}
                                {index < STEPS.length - 1 && (
                                    <div
                                        className={`h-0.5 flex-1 mx-2 transition-colors ${currentStep > step.number ? 'bg-accent' : 'bg-muted-foreground/30'
                                            }`}
                                    />
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </Card>

            {/* Step Content */}
            <div>
                {currentStep === 1 && <Step1JobInfo />}
                {currentStep === 2 && <Step2HazardIdentification />}
                {currentStep === 3 && <Step3ControlMeasures />}
                {currentStep === 4 && <Step4Review />}
            </div>
        </div>
    );
}
