'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    ArrowLeft,
    Camera,
    Sparkle,
    Info,
    CaretDown,
    ClipboardText,
    Eye,
    MagnifyingGlass,
    SkipForward,
    ShieldCheck,
    Pulse
} from '@phosphor-icons/react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { VisionCapture, CapturedImage, CapturedDocument } from '@/components/vision/VisionCapture';
import { VisionResults } from '@/components/vision/VisionResults';
import { useVisionAnalysis } from '@/hooks/use-vision';
import { useRecentJHAs, useJHADetails } from '@/hooks/use-api';
import { PrimaryButton, SecondaryButton } from '@/components/ui/phosphor-buttons';

export default function VisionUpdatePage() {
    const router = useRouter();
    const [textUpdate, setTextUpdate] = useState('');
    const [images, setImages] = useState<CapturedImage[]>([]);
    const [documents, setDocuments] = useState<CapturedDocument[]>([]);
    const [showHelp, setShowHelp] = useState(false);

    // JHA Search & Select
    const [jhaSearchId, setJhaSearchId] = useState('');
    const [selectedJHA, setSelectedJHA] = useState<string>('');
    const [isSearching, setIsSearching] = useState(false);

    // Fetch individual JHA if searched
    const { data: searchedJHA, error: searchError, isLoading: isSearchLoading } = useJHADetails(selectedJHA || '');

    // Fetch recent JHAs for dropdown/quick access
    const { data: recentJHAs, isLoading: loadingJHAs } = useRecentJHAs(10);
    const { mutate: analyze, isPending, data: result, reset } = useVisionAnalysis();

    const handleSearchJHA = () => {
        if (!jhaSearchId.trim()) return;
        setIsSearching(true);
        setSelectedJHA(jhaSearchId.trim());
        // Simple delay to show "Searching" state for premium feel
        setTimeout(() => setIsSearching(false), 800);
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

    // "Scanning HUD" Overlay during analysis
    const ScanningHUD = () => (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center pointer-events-none">
            {/* Dark Backdrop */}
            <div className="absolute inset-0 bg-[#0A0A0A]/80 backdrop-blur-md" />

            {/* HUD Elements */}
            <div className="relative w-full max-w-xl aspect-square flex flex-col items-center justify-center px-6">
                {/* Spinning Scanner Rings */}
                <div className="absolute inset-0 border-[1px] border-violet-500/20 rounded-full animate-[spin_12s_linear_infinite]" />
                <div className="absolute inset-10 border-[1px] border-fuchsia-500/20 rounded-full animate-[spin_8s_linear_reverse_infinite]" />
                <div className="absolute inset-20 border-[2px] border-violet-500/30 border-t-transparent rounded-full animate-spin" />

                {/* Horizontal Scan Line */}
                <div className="absolute inset-4 bg-gradient-to-b from-transparent via-violet-500/10 to-transparent h-1 w-[90%] left-[5%] top-[50%] animate-[scan_3s_ease-in-out_infinite]" />

                {/* Content */}
                <div className="z-10 text-center space-y-4">
                    <div className="mx-auto p-4 rounded-2xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 border border-violet-500/40 backdrop-blur-xl animate-pulse">
                        <Sparkle weight="fill" size={48} className="text-violet-400" />
                    </div>
                    <div>
                        <h2 className="text-3xl font-black text-white tracking-widest uppercase italic">Analyzing</h2>
                        <p className="text-violet-400 font-mono text-sm tracking-tighter">SAFETY PROTOCOLS • OSHA 1926 • GEMINI FLASH</p>
                    </div>

                    <div className="flex gap-2 justify-center">
                        <div className="h-1 w-8 bg-violet-600 rounded-full animate-pulse" />
                        <div className="h-1 w-8 bg-fuchsia-600 rounded-full animate-pulse [animation-delay:200ms]" />
                        <div className="h-1 w-8 bg-violet-600 rounded-full animate-pulse [animation-delay:400ms]" />
                    </div>
                </div>

                {/* Corner Accents */}
                <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-violet-400/50" />
                <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-violet-400/50" />
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-violet-400/50" />
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-violet-400/50" />
            </div>

            {/* Terminal Output Preview */}
            <div className="mt-8 font-mono text-[10px] text-violet-400/60 text-center uppercase tracking-widest">
                [SYSTEM] PROCESSING NEURAL MAPPING...<br />
                [OSHA] VERIFYING 1926.100 COMPLIANCE...<br />
                [AI] DETECTING SPATIAL ANOMALIES...
            </div>
        </div>
    );

    const canAnalyze = textUpdate.trim().length > 0 || images.length > 0;

    return (
        <div className="space-y-6 pb-24 relative min-h-screen">
            <style jsx global>{`
                @keyframes scan {
                    0%, 100% { top: 5%; opacity: 0; }
                    50% { top: 95%; opacity: 1; }
                }
            `}</style>

            {isPending && <ScanningHUD />}

            {/* Header */}
            <header className="flex items-center gap-4 sticky top-0 z-40 py-4 bg-[#1A242F]/80 backdrop-blur-xl border-b border-white/5 mx-[-1rem] px-4">
                <Link href="/">
                    <button className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 transition-all active:scale-95">
                        <ArrowLeft weight="bold" size={20} className="text-gray-300" />
                    </button>
                </Link>
                <div className="flex-1">
                    <h1 className="text-xl font-black text-white flex items-center gap-2 tracking-tight">
                        <div className="p-1 px-2 rounded-lg bg-gradient-to-br from-violet-600 to-fuchsia-600 shadow-lg shadow-violet-600/20">
                            <Eye weight="fill" size={20} className="text-white" />
                        </div>
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">VISION AGENT</span>
                    </h1>
                </div>
                <Badge className="bg-violet-500/10 text-violet-400 border-violet-500/20 px-3 py-1 font-mono text-[10px]">
                    v3.0.0
                </Badge>
            </header>

            {/* Search/Retrieve JHA Section */}
            {!result && !isPending && (
                <div className="space-y-4 pt-2">
                    <div className="relative group">
                        <div className="absolute -inset-1 bg-gradient-to-r from-violet-600 to-fuchsia-600 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
                        <div className="relative bg-[#2D3A48] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
                            <div className="flex items-center p-1 pl-4">
                                <MagnifyingGlass weight="bold" size={20} className="text-gray-500" />
                                <input
                                    type="text"
                                    placeholder="Enter JHA # to update..."
                                    value={jhaSearchId}
                                    onChange={(e) => setJhaSearchId(e.target.value)}
                                    className="flex-1 bg-transparent border-none focus:ring-0 text-white placeholder:text-gray-600 h-14 font-mono text-sm"
                                />
                                <button
                                    onClick={handleSearchJHA}
                                    disabled={!jhaSearchId.trim() || isSearchLoading}
                                    className="bg-violet-600 hover:bg-violet-500 text-white px-6 h-12 m-1 rounded-xl font-bold flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                                >
                                    {isSearchLoading ? <Pulse className="animate-pulse" /> : <SkipForward weight="fill" />}
                                    Retrieve
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Quick Recents Carousel */}
                    {recentJHAs && recentJHAs.length > 0 && (
                        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none px-1">
                            {recentJHAs.map(jha => (
                                <button
                                    key={jha.id}
                                    onClick={() => handleQuickSelect(jha)}
                                    className={`
                                        flex-shrink-0 px-4 py-2 rounded-xl text-xs font-medium border transition-all
                                        ${selectedJHA === jha.id
                                            ? 'bg-violet-500/20 border-violet-500/50 text-violet-300'
                                            : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'}
                                    `}
                                >
                                    {jha.project_name || 'Project'} • {jha.id.slice(0, 4)}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Report Preview if Found */}
                    {searchedJHA && (
                        <Card className="bg-gradient-to-br from-[#2D3A48] to-[#1A242F] border-violet-500/30 overflow-hidden animate-in fade-in slide-in-from-top-4 duration-500">
                            <CardHeader className="pb-3 border-b border-white/5">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <CardTitle className="text-lg text-white font-bold">{searchedJHA.project_name}</CardTitle>
                                        <CardDescription className="text-gray-500 font-mono text-[10px] uppercase">
                                            ID: {searchedJHA.id}
                                        </CardDescription>
                                    </div>
                                    <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                                        ACTIVE REPORT
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-4 space-y-3">
                                <div className="grid grid-cols-2 gap-3 text-xs">
                                    <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                                        <p className="text-gray-500 mb-1">Risk Score</p>
                                        <p className="text-xl font-black text-white">{searchedJHA.risk_score}/100</p>
                                    </div>
                                    <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                                        <p className="text-gray-500 mb-1">Status</p>
                                        <p className="text-lg font-bold text-emerald-400">READY</p>
                                    </div>
                                </div>
                                <p className="text-xs text-violet-400 flex items-center gap-2 font-medium">
                                    <ShieldCheck weight="fill" />
                                    This inspection will update this specific JHA record.
                                </p>
                            </CardContent>
                        </Card>
                    )}
                </div>
            )}

            {/* Show Results if available */}
            {result && !isPending && (
                <div className="space-y-4 animate-in fade-in zoom-in-95 duration-500">
                    <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-emerald-500/20">
                            <ShieldCheck weight="fill" size={24} className="text-emerald-400" />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-emerald-400">Analysis Complete</p>
                            <p className="text-xs text-emerald-500/70">Risk updated with live field conditions</p>
                        </div>
                    </div>

                    <VisionResults result={result} isLoading={false} />

                    <div className="grid grid-cols-2 gap-3 pt-4">
                        <SecondaryButton
                            onClick={handleReset}
                            fullWidth
                            icon={Camera}
                        >
                            Reset
                        </SecondaryButton>
                        <PrimaryButton
                            onClick={() => router.push(`/jha/${result.id || selectedJHA}`)}
                            fullWidth
                            icon={ArrowLeft}
                        >
                            View JHA
                        </PrimaryButton>
                    </div>
                </div>
            )}

            {/* Show Input Form when no results */}
            {!result && !isPending && (
                <div className="space-y-6 animate-in fade-in duration-700">
                    {/* Photo Capture */}
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-sm font-black text-gray-400 uppercase tracking-widest pl-1">Capture Feed</h2>
                            <span className="text-[10px] text-gray-600 font-mono">GEMINI_MAPPING_V3</span>
                        </div>
                        <VisionCapture
                            onImagesChange={setImages}
                            onDocumentsChange={setDocuments}
                            maxImages={10}
                            maxDocuments={3}
                            disabled={isPending}
                        />
                    </div>

                    {/* Text Update */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 pl-1">
                            <Sparkle weight="bold" size={16} className="text-violet-400" />
                            <h2 className="text-sm font-bold text-white">Logic Update</h2>
                        </div>
                        <div className="relative group">
                            <div className="absolute -inset-0.5 bg-gradient-to-r from-violet-600/30 to-fuchsia-600/30 rounded-2xl blur-sm opacity-50"></div>
                            <Textarea
                                placeholder="What's changed on site? (e.g. 'Started hot work on deck C')"
                                value={textUpdate}
                                onChange={(e) => setTextUpdate(e.target.value)}
                                className="relative min-h-[120px] text-base bg-[#2D3A48] border-white/10 text-white placeholder:text-gray-600 rounded-2xl focus:border-violet-500/50 focus:ring-violet-500/20 transition-all shadow-inner"
                            />
                        </div>
                    </div>

                    {/* Analyze Button */}
                    <button
                        onClick={handleAnalyze}
                        disabled={!canAnalyze || isPending}
                        className={`
                            group relative w-full py-6 rounded-2xl
                            font-black text-xl tracking-widest
                            flex flex-col items-center justify-center gap-0.5
                            transition-all duration-500 overflow-hidden
                            ${canAnalyze
                                ? 'bg-white text-black shadow-2xl hover:scale-[1.02] active:scale-95'
                                : 'bg-white/5 text-white/20 border border-white/5 cursor-not-allowed opacity-50'
                            }
                        `}
                    >
                        {/* Action labels */}
                        <div className="flex items-center gap-2">
                            <Sparkle weight="fill" size={24} className={canAnalyze ? 'text-violet-600' : ''} />
                            SYNC DATA
                        </div>
                        <span className="text-[10px] opacity-40 font-mono italic">
                            {selectedJHA ? 'INJECTING INTO REPORT' : 'CREATE NEW SNAPSHOT'}
                        </span>

                        {/* Hover Gradient Effect */}
                        {canAnalyze && (
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-violet-100 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000"></div>
                        )}
                    </button>

                    {/* Footnote */}
                    <div className="pt-4 text-center">
                        <p className="text-[10px] text-gray-600 font-mono tracking-tighter uppercase">
                            Safety Companion Multimodal V2.5 • Optimized for Gemini Flash
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
