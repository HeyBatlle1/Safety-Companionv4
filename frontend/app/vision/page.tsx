'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    ArrowLeft,
    Camera,
    Sparkle,
    MagnifyingGlass,
    ShieldCheck,
    CircleNotch,
    Eye,
    FileText
} from '@phosphor-icons/react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { VisionCapture, CapturedImage, CapturedDocument } from '@/components/vision/VisionCapture';
import { VisionResults } from '@/components/vision/VisionResults';
import { useVisionAnalysis } from '@/hooks/use-vision';
import { useRecentJHAs, useJHADetails } from '@/hooks/use-api';

export default function VisionUpdatePage() {
    const router = useRouter();
    const [textUpdate, setTextUpdate] = useState('');
    const [images, setImages] = useState<CapturedImage[]>([]);
    const [documents, setDocuments] = useState<CapturedDocument[]>([]);

    // JHA Search & Select
    const [jhaSearchId, setJhaSearchId] = useState('');
    const [selectedJHA, setSelectedJHA] = useState<string>('');

    // Fetch individual JHA if searched
    const { data: searchedJHA, isLoading: isSearchLoading } = useJHADetails(selectedJHA || '');

    // Fetch recent JHAs for quick access
    const { data: recentJHAs, isLoading: loadingJHAs } = useRecentJHAs(5);
    const { mutate: analyze, isPending, data: result, reset } = useVisionAnalysis();

    const handleSearchJHA = () => {
        if (!jhaSearchId.trim()) return;
        setSelectedJHA(jhaSearchId.trim());
    };

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
            ...(selectedJHA && { jha_id: selectedJHA })
        });
    };

    const handleReset = () => {
        reset();
        setTextUpdate('');
        setImages([]);
        setDocuments([]);
        setSelectedJHA('');
        setJhaSearchId('');
    };

    const handleQuickSelect = (jha: any) => {
        setSelectedJHA(jha.id);
        setJhaSearchId(jha.id);
    };

    const canAnalyze = textUpdate.trim().length > 0 || images.length > 0;

    return (
        <div className="space-y-6 pb-24 min-h-screen">
            {/* Header */}
            <header className="flex items-center gap-4 sticky top-0 z-40 py-4 bg-[#0f1419]/95 backdrop-blur-xl border-b border-white/5 -mx-4 px-4">
                <Link href="/">
                    <button className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-all">
                        <ArrowLeft weight="bold" size={18} className="text-gray-400" />
                    </button>
                </Link>
                <div className="flex-1">
                    <h1 className="text-lg font-bold text-white flex items-center gap-2">
                        <Eye weight="fill" size={20} className="text-violet-400" />
                        Vision Analysis
                    </h1>
                    <p className="text-xs text-gray-500">AI-powered site inspection</p>
                </div>
            </header>

            {/* Loading Overlay */}
            {isPending && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
                    <div className="text-center space-y-4">
                        <div className="relative">
                            <div className="w-16 h-16 rounded-full border-2 border-violet-500/30 animate-ping absolute inset-0" />
                            <div className="w-16 h-16 rounded-full border-2 border-t-violet-500 border-r-transparent border-b-transparent border-l-transparent animate-spin flex items-center justify-center">
                                <Sparkle weight="fill" size={24} className="text-violet-400" />
                            </div>
                        </div>
                        <div>
                            <p className="text-white font-medium">Analyzing...</p>
                            <p className="text-xs text-gray-500">Processing with Gemini Vision</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Show Results if available */}
            {result && !isPending && (
                <div className="space-y-4 animate-in fade-in duration-300">
                    <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-3">
                        <ShieldCheck weight="fill" size={24} className="text-emerald-400" />
                        <div>
                            <p className="text-sm font-medium text-emerald-400">Analysis Complete</p>
                            <p className="text-xs text-emerald-500/70">Risk assessment updated</p>
                        </div>
                    </div>

                    <VisionResults result={result} isLoading={false} />

                    <div className="grid grid-cols-2 gap-3 pt-4">
                        <button
                            onClick={handleReset}
                            className="py-3 px-4 rounded-xl border border-white/10 bg-white/5 text-white font-medium hover:bg-white/10 transition-all"
                        >
                            New Analysis
                        </button>
                        <button
                            onClick={() => router.push(`/jha/${result.id || selectedJHA}`)}
                            className="py-3 px-4 rounded-xl bg-violet-600 text-white font-medium hover:bg-violet-500 transition-all"
                        >
                            View Report
                        </button>
                    </div>
                </div>
            )}

            {/* Input Form */}
            {!result && !isPending && (
                <div className="space-y-6">
                    {/* JHA Search */}
                    <div className="space-y-3">
                        <label className="text-sm font-medium text-gray-400">Link to existing JHA (optional)</label>
                        <div className="flex gap-2">
                            <div className="flex-1 relative">
                                <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                                <input
                                    type="text"
                                    placeholder="Enter JHA ID..."
                                    value={jhaSearchId}
                                    onChange={(e) => setJhaSearchId(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSearchJHA()}
                                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-gray-600 focus:outline-none focus:border-violet-500/50"
                                />
                            </div>
                            <button
                                onClick={handleSearchJHA}
                                disabled={!jhaSearchId.trim() || isSearchLoading}
                                className="px-5 py-3 rounded-xl bg-violet-600 text-white font-medium hover:bg-violet-500 disabled:opacity-50 transition-all"
                            >
                                {isSearchLoading ? <CircleNotch className="animate-spin" size={18} /> : 'Find'}
                            </button>
                        </div>

                        {/* Quick Select */}
                        {recentJHAs && recentJHAs.length > 0 && !selectedJHA && (
                            <div className="flex gap-2 overflow-x-auto pb-1">
                                <span className="text-xs text-gray-600 py-1">Recent:</span>
                                {recentJHAs.slice(0, 4).map(jha => (
                                    <button
                                        key={jha.id}
                                        onClick={() => handleQuickSelect(jha)}
                                        className="flex-shrink-0 px-3 py-1 rounded-lg text-xs font-medium bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10 transition-all"
                                    >
                                        {jha.project_name?.slice(0, 15) || 'Project'}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Selected JHA Preview */}
                        {searchedJHA && (
                            <Card className="bg-white/5 border-violet-500/30">
                                <CardContent className="p-4">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <p className="font-medium text-white">{searchedJHA.project_name}</p>
                                            <p className="text-xs text-gray-500 font-mono">ID: {searchedJHA.id?.slice(0, 8)}...</p>
                                        </div>
                                        <div className="text-right">
                                            <Badge className="bg-violet-500/20 text-violet-400 border-violet-500/30">
                                                Risk: {searchedJHA.risk_score}/100
                                            </Badge>
                                        </div>
                                    </div>
                                    <p className="text-xs text-violet-400 mt-2 flex items-center gap-1">
                                        <ShieldCheck weight="fill" size={12} />
                                        Analysis will update this JHA
                                    </p>
                                </CardContent>
                            </Card>
                        )}
                    </div>

                    {/* Divider */}
                    <div className="flex items-center gap-3">
                        <div className="flex-1 h-px bg-white/10" />
                        <span className="text-xs text-gray-600 uppercase">Capture</span>
                        <div className="flex-1 h-px bg-white/10" />
                    </div>

                    {/* Photo Capture */}
                    <VisionCapture
                        onImagesChange={setImages}
                        onDocumentsChange={setDocuments}
                        maxImages={10}
                        maxDocuments={3}
                        disabled={isPending}
                    />

                    {/* Text Update */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-400">Description (optional)</label>
                        <Textarea
                            placeholder="What's changed on site? (e.g. 'Started hot work on deck C')"
                            value={textUpdate}
                            onChange={(e) => setTextUpdate(e.target.value)}
                            className="min-h-[100px] bg-white/5 border-white/10 text-white placeholder:text-gray-600 rounded-xl focus:border-violet-500/50 resize-none"
                        />
                    </div>

                    {/* Analyze Button */}
                    <button
                        onClick={handleAnalyze}
                        disabled={!canAnalyze || isPending}
                        className={`
                            w-full py-4 rounded-xl font-bold text-lg
                            flex items-center justify-center gap-2
                            transition-all
                            ${canAnalyze
                                ? 'bg-white text-black hover:bg-gray-100 active:scale-[0.98]'
                                : 'bg-white/10 text-white/30 cursor-not-allowed'
                            }
                        `}
                    >
                        <Sparkle weight="fill" size={20} className={canAnalyze ? 'text-violet-600' : ''} />
                        {selectedJHA ? 'Analyze & Update JHA' : 'Analyze Site'}
                    </button>
                </div>
            )}
        </div>
    );
}
