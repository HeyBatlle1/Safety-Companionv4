'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    ArrowLeft,
    Camera,
    Sparkle,
    Info,
    CaretDown,
    ClipboardText,
    Eye
} from '@phosphor-icons/react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { VisionCapture, CapturedImage, CapturedDocument } from '@/components/vision/VisionCapture';
import { VisionResults } from '@/components/vision/VisionResults';
import { useVisionAnalysis } from '@/hooks/use-vision';
import { useRecentJHAs } from '@/hooks/use-api';
import { PrimaryButton, SecondaryButton } from '@/components/ui/phosphor-buttons';

export default function VisionUpdatePage() {
    const router = useRouter();
    const [textUpdate, setTextUpdate] = useState('');
    const [images, setImages] = useState<CapturedImage[]>([]);
    const [documents, setDocuments] = useState<CapturedDocument[]>([]);
    const [showHelp, setShowHelp] = useState(false);
    const [selectedJHA, setSelectedJHA] = useState<string>('');
    const [showJHADropdown, setShowJHADropdown] = useState(false);

    // Fetch recent JHAs for dropdown
    const { data: recentJHAs, isLoading: loadingJHAs } = useRecentJHAs(50);
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
            provider: 'google',
            // Include selected JHA if any
            ...(selectedJHA && { jha_id: selectedJHA })
        });
    };

    const handleReset = () => {
        reset();
        setTextUpdate('');
        setImages([]);
        setDocuments([]);
    };

    const handleJHASelect = (jhaId: string, projectName: string) => {
        setSelectedJHA(jhaId);
        setShowJHADropdown(false);
        // Auto-populate text with project context
        if (!textUpdate.includes(projectName)) {
            setTextUpdate(prev => prev ? `${prev} - Update for ${projectName}` : `Update for ${projectName}`);
        }
    };

    const canAnalyze = textUpdate.trim().length > 0 || images.length > 0;
    const selectedJHAData = recentJHAs?.find(j => j.id === selectedJHA);

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
                        <div className="p-1.5 rounded-xl bg-gradient-to-br from-violet-400 via-purple-300 to-fuchsia-500 shadow-lg shadow-violet-400/30">
                            <Eye weight="fill" size={24} className="text-white" />
                        </div>
                        Agent 5
                    </h1>
                    <p className="text-sm text-gray-400">
                        AI Vision Inspector • Real-time hazard detection
                    </p>
                </div>
                <Badge className="hidden sm:flex gap-1 bg-gradient-to-r from-violet-500/20 to-fuchsia-500/20 text-violet-300 border-violet-500/30">
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
                    {/* JHA Selector Dropdown */}
                    <Card className="bg-gray-800/50 border-gray-700">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-lg text-white flex items-center gap-2">
                                <ClipboardText weight="bold" size={20} className="text-gray-400" />
                                Link to Existing JHA
                            </CardTitle>
                            <CardDescription className="text-gray-400">
                                Select a JHA to add this inspection as an update
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="relative">
                                <button
                                    onClick={() => setShowJHADropdown(!showJHADropdown)}
                                    className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-gray-900/50 border border-gray-600 hover:border-gray-500 transition-colors text-left"
                                >
                                    <span className={selectedJHA ? 'text-white' : 'text-gray-500'}>
                                        {selectedJHAData
                                            ? `${selectedJHAData.project_name} (${selectedJHAData.id.slice(0, 8)}...)`
                                            : 'Select a JHA (optional)'
                                        }
                                    </span>
                                    <CaretDown
                                        weight="bold"
                                        size={18}
                                        className={`text-gray-400 transition-transform ${showJHADropdown ? 'rotate-180' : ''}`}
                                    />
                                </button>

                                {/* Dropdown List */}
                                {showJHADropdown && (
                                    <div className="absolute top-full left-0 right-0 mt-2 max-h-64 overflow-y-auto rounded-xl bg-gray-800 border border-gray-600 shadow-xl z-50">
                                        {/* Clear selection option */}
                                        <button
                                            onClick={() => {
                                                setSelectedJHA('');
                                                setShowJHADropdown(false);
                                            }}
                                            className="w-full px-4 py-3 text-left text-gray-400 hover:bg-gray-700 border-b border-gray-700"
                                        >
                                            No JHA (new inspection)
                                        </button>

                                        {loadingJHAs ? (
                                            <div className="px-4 py-3 text-gray-400">Loading JHAs...</div>
                                        ) : recentJHAs && recentJHAs.length > 0 ? (
                                            recentJHAs.map((jha) => (
                                                <button
                                                    key={jha.id}
                                                    onClick={() => handleJHASelect(jha.id, jha.project_name)}
                                                    className={`w-full px-4 py-3 text-left hover:bg-gray-700 transition-colors border-b border-gray-700/50 last:border-0 ${selectedJHA === jha.id ? 'bg-gray-700' : ''
                                                        }`}
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <div>
                                                            <p className="text-white font-medium">{jha.project_name}</p>
                                                            <p className="text-xs text-gray-500">
                                                                ID: {jha.id.slice(0, 8)}... • Risk: {jha.risk_score}
                                                            </p>
                                                        </div>
                                                        <Badge className={`text-xs ${jha.urgency_level === 'LOW'
                                                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                                                            : jha.urgency_level === 'MEDIUM'
                                                                ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                                                                : 'bg-red-500/20 text-red-400 border-red-500/30'
                                                            }`}>
                                                            {jha.urgency_level}
                                                        </Badge>
                                                    </div>
                                                </button>
                                            ))
                                        ) : (
                                            <div className="px-4 py-3 text-gray-400">No JHAs found</div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {selectedJHA && selectedJHAData && (
                                <div className="mt-3 p-3 rounded-lg bg-gray-700/30 border border-gray-600/50">
                                    <p className="text-sm text-gray-300">
                                        <span className="text-gray-500">Linked to:</span> {selectedJHAData.project_name}
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1">
                                        This inspection will be added as an update to the selected JHA
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Quick Help (Collapsible) */}
                    <Card className="bg-gray-800/30 border-gray-700/50">
                        <CardContent className="p-4">
                            <button
                                onClick={() => setShowHelp(!showHelp)}
                                className="flex items-center justify-between w-full"
                            >
                                <div className="flex items-center gap-2">
                                    <Info weight="bold" size={20} className="text-gray-500" />
                                    <span className="font-medium text-gray-400">How it works</span>
                                </div>
                                <span className="text-gray-500 text-sm">
                                    {showHelp ? 'Hide' : 'Show'}
                                </span>
                            </button>
                            {showHelp && (
                                <div className="mt-3 space-y-2 text-sm text-gray-400">
                                    <p>1. <strong className="text-gray-300">Select a JHA</strong> to link this update (optional)</p>
                                    <p>2. <strong className="text-gray-300">Take photos</strong> of equipment, PPE, or conditions</p>
                                    <p>3. <strong className="text-gray-300">Add description</strong> for context (optional)</p>
                                    <p>4. Tap <strong className="text-gray-300">Analyze</strong> - AI inspects in ~30 seconds</p>
                                    <p className="pt-2 text-gray-500">
                                        ✨ AI detects hazards, checks PPE, verifies certifications,
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

                    {/* Photo Capture - uses VisionCapture component which has its own category cards */}
                    <Card className="bg-gray-800/50 border-gray-700">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-lg text-white flex items-center gap-2">
                                <Camera weight="bold" size={20} className="text-gray-400" />
                                Capture Photos
                            </CardTitle>
                            <CardDescription className="text-gray-400">
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
                    <button
                        onClick={handleAnalyze}
                        disabled={!canAnalyze || isPending}
                        className={`
                            w-full py-5 rounded-2xl
                            font-bold text-xl text-white
                            flex items-center justify-center gap-3
                            transition-all duration-300
                            ${canAnalyze
                                ? 'bg-gradient-to-r from-gray-700 to-gray-800 shadow-xl shadow-gray-900/50 hover:shadow-2xl hover:from-gray-600 hover:to-gray-700 hover:-translate-y-0.5 border border-gray-600'
                                : 'bg-gray-800 cursor-not-allowed opacity-50 border border-gray-700'
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
                                    <span className="ml-2 px-2 py-0.5 bg-white/10 rounded-full text-sm">
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
