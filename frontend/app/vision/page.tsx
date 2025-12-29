'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    ArrowLeft,
    Camera,
    Sparkle,
    Info,
    MapTrifold,
    Toolbox,
    HardHat,
    Stack,
    ArrowRight,
    PaperPlaneTilt
} from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { VisionCapture, CapturedImage, CapturedDocument } from '@/components/vision/VisionCapture';
import { VisionResults } from '@/components/vision/VisionResults';
import { useVisionAnalysis } from '@/hooks/use-vision';
import { PrimaryButton, SecondaryButton } from '@/components/ui/phosphor-buttons';

// Category cards configuration
const CATEGORIES = [
    {
        id: 'site',
        icon: MapTrifold,
        title: 'Site Overview',
        subtitle: 'Work area & conditions',
        gradient: 'from-blue-500 to-blue-600',
        shadowColor: 'shadow-blue-500/30',
    },
    {
        id: 'equipment',
        icon: Toolbox,
        title: 'Equipment',
        subtitle: 'Cranes, lifts, tools',
        gradient: 'from-orange-500 to-orange-600',
        shadowColor: 'shadow-orange-500/30',
    },
    {
        id: 'ppe',
        icon: HardHat,
        title: 'PPE Check',
        subtitle: 'Safety gear inspection',
        gradient: 'from-green-500 to-green-600',
        shadowColor: 'shadow-green-500/30',
    },
    {
        id: 'materials',
        icon: Stack,
        title: 'Materials',
        subtitle: 'Storage & staging',
        gradient: 'from-red-500 to-red-600',
        shadowColor: 'shadow-red-500/30',
    },
];

interface CategoryCardProps {
    icon: typeof MapTrifold;
    title: string;
    subtitle: string;
    gradient: string;
    shadowColor: string;
    onClick: () => void;
    selected?: boolean;
}

function CategoryCard({ icon: Icon, title, subtitle, gradient, shadowColor, onClick, selected }: CategoryCardProps) {
    return (
        <button
            onClick={onClick}
            className={`
                relative overflow-hidden
                bg-gradient-to-br ${gradient}
                p-6 rounded-2xl
                shadow-lg ${shadowColor}
                hover:shadow-2xl
                transform hover:-translate-y-1
                transition-all duration-200
                cursor-pointer
                group
                text-left
                w-full
                ${selected ? 'ring-4 ring-white/50' : ''}
            `}
        >
            {/* Pattern overlay */}
            <div className="absolute inset-0 opacity-10">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(255,255,255,0.4),transparent)]" />
            </div>

            {/* Icon with glow */}
            <div className="relative z-10 mb-3">
                <div className="inline-block relative">
                    <div className="absolute inset-0 bg-white/30 blur-xl group-hover:bg-white/50 transition-all rounded-full" />
                    <Icon weight="bold" size={48} className="text-white relative" />
                </div>
            </div>

            {/* Text */}
            <h3 className="text-xl font-bold text-white mb-1">
                {title}
            </h3>
            <p className="text-white/80 text-sm">
                {subtitle}
            </p>

            {/* Hover arrow */}
            <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <ArrowRight weight="bold" size={24} className="text-white" />
            </div>

            {/* Selected indicator */}
            {selected && (
                <div className="absolute top-3 right-3 w-6 h-6 bg-white rounded-full flex items-center justify-center">
                    <Camera weight="fill" size={16} className="text-gray-900" />
                </div>
            )}
        </button>
    );
}

export default function VisionUpdatePage() {
    const router = useRouter();
    const [textUpdate, setTextUpdate] = useState('');
    const [images, setImages] = useState<CapturedImage[]>([]);
    const [documents, setDocuments] = useState<CapturedDocument[]>([]);
    const [showHelp, setShowHelp] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

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
            provider: 'google'
        });
    };

    const handleReset = () => {
        reset();
        setTextUpdate('');
        setImages([]);
        setDocuments([]);
        setSelectedCategory(null);
    };

    const handleCategorySelect = (categoryId: string) => {
        setSelectedCategory(categoryId);
        // Auto-add category to text
        const category = CATEGORIES.find(c => c.id === categoryId);
        if (category && !textUpdate.toLowerCase().includes(category.title.toLowerCase())) {
            setTextUpdate(prev => prev ? `${prev}, ${category.title.toLowerCase()}` : category.title);
        }
    };

    const canAnalyze = textUpdate.trim().length > 0 || images.length > 0;

    return (
        <div className="space-y-6 pb-24">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link href="/">
                    <button className="p-2 rounded-xl bg-gray-800/50 hover:bg-gray-700/50 transition-colors">
                        <ArrowLeft weight="bold" size={24} className="text-gray-300" />
                    </button>
                </Link>
                <div className="flex-1">
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Camera weight="bold" size={28} className="text-orange-400" />
                        Visual Safety Check
                    </h1>
                    <p className="text-sm text-gray-400">
                        AI-powered inspection • Agent 5
                    </p>
                </div>
                <Badge className="hidden sm:flex gap-1 bg-gradient-to-r from-orange-500 to-orange-600 text-white border-0">
                    <Sparkle weight="fill" size={14} />
                    AI Vision
                </Badge>
            </div>

            {/* Show Results if available */}
            {result && !isPending && (
                <div className="space-y-4">
                    <VisionResults result={result} isLoading={false} />
                    <div className="flex gap-3">
                        <SecondaryButton
                            onClick={handleReset}
                            fullWidth
                            icon={Camera}
                        >
                            New Inspection
                        </SecondaryButton>
                        <PrimaryButton
                            onClick={() => router.push('/jha/new')}
                            fullWidth
                        >
                            Create Full JHA
                        </PrimaryButton>
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
                    {/* Category Cards */}
                    <div>
                        <h2 className="text-lg font-semibold text-white mb-3">What are you inspecting?</h2>
                        <div className="grid grid-cols-2 gap-4">
                            {CATEGORIES.map(cat => (
                                <CategoryCard
                                    key={cat.id}
                                    {...cat}
                                    onClick={() => handleCategorySelect(cat.id)}
                                    selected={selectedCategory === cat.id}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Quick Help (Collapsible) */}
                    <Card className="bg-gradient-to-r from-blue-900/50 to-indigo-900/50 border-blue-500/30">
                        <CardContent className="p-4">
                            <button
                                onClick={() => setShowHelp(!showHelp)}
                                className="flex items-center justify-between w-full"
                            >
                                <div className="flex items-center gap-2">
                                    <Info weight="bold" size={20} className="text-blue-400" />
                                    <span className="font-medium text-blue-200">How it works</span>
                                </div>
                                <span className="text-blue-400 text-sm">
                                    {showHelp ? 'Hide' : 'Show'}
                                </span>
                            </button>
                            {showHelp && (
                                <div className="mt-3 space-y-2 text-sm text-blue-200">
                                    <p>1. <strong>Select category</strong> above or describe in text</p>
                                    <p>2. <strong>Take photos</strong> of equipment, PPE, or conditions</p>
                                    <p>3. <strong>Upload drawings</strong> if needed (optional)</p>
                                    <p>4. Tap <strong>Analyze</strong> - AI inspects in ~30 seconds</p>
                                    <p className="pt-2 text-blue-300">
                                        ✨ AI detects hazards, checks PPE expiration, verifies certifications,
                                        and identifies OSHA compliance gaps.
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Text Update */}
                    <Card className="bg-gray-800/50 border-gray-700">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-lg text-white">Description (optional)</CardTitle>
                            <CardDescription className="text-gray-400">
                                Add context about the work or specific concerns
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Textarea
                                placeholder="e.g., Checking crane rigging before glass install on 4th floor..."
                                value={textUpdate}
                                onChange={(e) => setTextUpdate(e.target.value)}
                                className="min-h-[80px] text-base bg-gray-900/50 border-gray-600 text-white placeholder:text-gray-500"
                            />
                            {/* Quick phrases */}
                            <div className="flex flex-wrap gap-2 mt-3">
                                {['Fall protection', 'Equipment pre-op', 'Confined space', 'Hot work'].map((phrase) => (
                                    <button
                                        key={phrase}
                                        className="px-3 py-1.5 rounded-lg bg-gray-700/50 hover:bg-gray-600/50 text-sm text-gray-300 transition-colors"
                                        onClick={() => setTextUpdate(prev =>
                                            prev ? `${prev}, ${phrase.toLowerCase()}` : phrase
                                        )}
                                    >
                                        + {phrase}
                                    </button>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Photo Capture */}
                    <Card className="bg-gray-800/50 border-gray-700">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-lg text-white flex items-center gap-2">
                                <Camera weight="bold" size={20} className="text-orange-400" />
                                Capture Photos
                            </CardTitle>
                            <CardDescription className="text-gray-400">
                                Take photos of what you want the AI to inspect
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
                    <button
                        onClick={handleAnalyze}
                        disabled={!canAnalyze || isPending}
                        className={`
                            w-full py-5 rounded-2xl
                            font-bold text-xl text-white
                            flex items-center justify-center gap-3
                            transition-all duration-300
                            ${canAnalyze
                                ? 'bg-gradient-to-r from-orange-500 via-orange-600 to-orange-700 shadow-xl shadow-orange-500/30 hover:shadow-2xl hover:shadow-orange-500/40 hover:-translate-y-0.5'
                                : 'bg-gray-700 cursor-not-allowed opacity-50'
                            }
                        `}
                    >
                        {isPending ? (
                            <>
                                <div className="animate-spin rounded-full h-6 w-6 border-3 border-white border-t-transparent" />
                                Analyzing...
                            </>
                        ) : (
                            <>
                                <Sparkle weight="fill" size={28} />
                                Analyze with AI
                                {images.length > 0 && (
                                    <span className="ml-2 px-2 py-0.5 bg-white/20 rounded-full text-sm">
                                        {images.length} photo{images.length !== 1 ? 's' : ''}
                                    </span>
                                )}
                            </>
                        )}
                    </button>

                    {/* Provider Info */}
                    <div className="text-center text-xs text-gray-500">
                        <span>Powered by Google Gemini 2.0 Flash Vision</span>
                        <span className="mx-2">•</span>
                        <span>~30 second analysis</span>
                    </div>
                </>
            )}
        </div>
    );
}
