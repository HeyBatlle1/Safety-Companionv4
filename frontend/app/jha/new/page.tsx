'use client';

import { NewJHAWizard } from '@/components/jha';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function NewJHAPage() {
    return (
        <div className="min-h-screen">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b border-border/50 p-4">
                <div className="max-w-4xl mx-auto flex items-center gap-4">
                    <Link href="/">
                        <Button variant="ghost" size="icon" className="touch-target">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-xl font-bold tracking-tight text-high-contrast">
                            Create New JHA
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            4-Part Safety Analysis • 20 Questions
                        </p>
                    </div>
                </div>
            </div>

            {/* Wizard */}
            <NewJHAWizard />
        </div>
    );
}
