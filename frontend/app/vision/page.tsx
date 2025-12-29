'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Send, Camera, Sparkles, Info } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { VisionCapture, CapturedImage, CapturedDocument } from '@/components/vision/VisionCapture';
import { VisionResults } from '@/components/vision/VisionResults';
import { useVisionAnalysis } from '@/hooks/use-vision';

export default function VisionUpdatePage() {
    const router = useRouter();
    const [textUpdate, setTextUpdate] = useState('');
    const [images, setImages] = useState<CapturedImage[]>([]);
    const [documents, setDocuments] = useState<CapturedDocument[]>([]);
    const [showHelp, setShowHelp] = useState(false);

    const { mutate: analyze, isPending, data: result, reset } = useVisionAnalysis();

    const handleAnalyze = () => {
        if (!textUpdate.trim() && images.length === 0) {
            alert('Please describe the update or add photos');
            return;
        }

        analyze({
            text_update: textUpdate || 'Site inspection update',
            images,
            documents,
            provider: 'google'  // Default to Gemini for now
        });
    };

    const handleReset = () => {
        reset();
        setTextUpdate('');
        setImages([]);
        setDocuments([]);
    };

    const canAnalyze = textUpdate.trim().length > 0 || images.length > 0;

    return (
        <div className="space-y-6 pb-20">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link href="/">
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                </Link>
                <div className="flex-1">
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Camera className="h-6 w-6 text-primary" />
                        Visual Safety Check
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        AI-powered inspection of equipment, PPE, and site conditions
                    </p>
                </div>
                <Badge variant="secondary" className="hidden sm:flex gap-1">
                    <Sparkles className="h-3 w-3" />
                    Agent 5
                </Badge>
            </div>

            {/* Show Results if available */}
            {result && !isPending && (
                <div className="space-y-4">
                    <VisionResults result={result} isLoading={false} />
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            onClick={handleReset}
                            className="flex-1"
                        >
                            New Inspection
                        </Button>
                        <Button
                            onClick={() => router.push('/jha/new')}
                            className="flex-1"
                        >
                            Create Full JHA
                        </Button>
                    </div>
                </div>
            )}

            {/* Show Loading */}
            {isPending && (
                <VisionResults
                    result={{} as any}
                    isLoading={true}
                />
            )}

            {/* Show Input Form when no results */}
            {!result && !isPending && (
                <>
                    {/* Quick Help */}
                    <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
                        <CardContent className="p-4">
                            <button
                                onClick={() => setShowHelp(!showHelp)}
                                className="flex items-center justify-between w-full"
                            >
                                <div className="flex items-center gap-2">
                                    <Info className="h-5 w-5 text-blue-500" />
                                    <span className="font-medium text-blue-900">How it works</span>
                                </div>
                                <span className="text-blue-500 text-sm">
                                    {showHelp ? 'Hide' : 'Show'}
                                </span>
                            </button>
                            {showHelp && (
                                <div className="mt-3 space-y-2 text-sm text-blue-800">
                                    <p>1. <strong>Describe</strong> what you're doing today (optional)</p>
                                    <p>2. <strong>Take photos</strong> of equipment, PPE, or site conditions</p>
                                    <p>3. <strong>Upload shop drawings</strong> if needed (optional)</p>
                                    <p>4. Tap <strong>Analyze</strong> - AI inspects everything in ~30 seconds</p>
                                    <p className="pt-2 text-blue-600">
                                        ✨ The AI will detect hazards you might miss, check PPE expiration,
                                        verify equipment certifications, and identify OSHA compliance gaps.
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Text Update */}
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-lg">What's happening today?</CardTitle>
                            <CardDescription>
                                Describe the work, equipment, or conditions (optional)
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Textarea
                                placeholder="e.g., Adding glass install, 4th floor, spider crane..."
                                value={textUpdate}
                                onChange={(e) => setTextUpdate(e.target.value)}
                                className="min-h-[80px] text-base"
                            />
                            {/* Quick phrases */}
                            <div className="flex flex-wrap gap-1 mt-2">
                                {['Crane operation', 'Glass install', 'Fall protection check', 'Equipment inspection', 'PPE check'].map((phrase) => (
                                    <Button
                                        key={phrase}
                                        variant="outline"
                                        size="sm"
                                        className="text-xs"
                                        onClick={() => setTextUpdate(prev =>
                                            prev ? `${prev}, ${phrase.toLowerCase()}` : phrase
                                        )}
                                    >
                                        + {phrase}
                                    </Button>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Photo Capture */}
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Camera className="h-5 w-5" />
                                Capture Photos
                            </CardTitle>
                            <CardDescription>
                                Tap a category to take a photo. The AI knows what to look for.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <VisionCapture
                                onImagesChange={setImages}
                                onDocumentsChange={setDocuments}
                                maxImages={10}
                                maxDocuments={3}
                                disabled={isPending}
                            />
                        </CardContent>
                    </Card>

                    {/* Analyze Button */}
                    <Button
                        size="lg"
                        onClick={handleAnalyze}
                        disabled={!canAnalyze || isPending}
                        className="w-full h-14 text-lg font-semibold"
                    >
                        {isPending ? (
                            <>
                                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2" />
                                Analyzing...
                            </>
                        ) : (
                            <>
                                <Sparkles className="h-5 w-5 mr-2" />
                                Analyze with AI
                                {images.length > 0 && (
                                    <Badge variant="secondary" className="ml-2 bg-white/20">
                                        {images.length} photo{images.length !== 1 ? 's' : ''}
                                    </Badge>
                                )}
                            </>
                        )}
                    </Button>

                    {/* Provider Info */}
                    <div className="text-center text-xs text-muted-foreground">
                        <span>Powered by Google Gemini 2.0 Flash Vision</span>
                        <span className="mx-2">•</span>
                        <span>~30 second analysis</span>
                    </div>
                </>
            )}
        </div>
    );
}
