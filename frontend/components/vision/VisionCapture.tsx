'use client';

import { useState, useRef, useCallback } from 'react';
import NextImage from 'next/image';
import {
    X,
    CircleNotch,
    HardHat,
    Wrench,
    MapPin,
    Package,
    Plus,
    FilePdf,
    Image as ImageIcon,
    Target,
    CheckCircle,
    Warning
} from '@phosphor-icons/react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// ════════════════════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════════════════════

interface CapturedImage {
    id: string;
    file: File;
    preview: string;
    category: 'site' | 'equipment' | 'ppe' | 'materials';
    uploading: boolean;
}

interface CapturedDocument {
    id: string;
    file: File;
    name: string;
}

interface VisionCaptureProps {
    onImagesChange?: (images: CapturedImage[]) => void;
    onDocumentsChange?: (documents: CapturedDocument[]) => void;
    maxImages?: number;
    maxDocuments?: number;
    disabled?: boolean;
}

// ════════════════════════════════════════════════════════════════════════════════
// CATEGORY CONFIG - PREMIUM GRADIENTS
// ════════════════════════════════════════════════════════════════════════════════

const CAPTURE_CATEGORIES = [
    {
        id: 'site' as const,
        label: 'SITE SCAN',
        icon: MapPin,
        gradient: 'from-blue-600 to-indigo-600',
        glow: 'shadow-blue-500/20',
        description: 'Area & conditions',
        accent: 'text-blue-400'
    },
    {
        id: 'equipment' as const,
        label: 'GEAR CHECK',
        icon: Wrench,
        gradient: 'from-orange-600 to-amber-600',
        glow: 'shadow-orange-500/20',
        description: 'Tools & machinery',
        accent: 'text-orange-400'
    },
    {
        id: 'ppe' as const,
        label: 'PPE VERIFY',
        icon: HardHat,
        gradient: 'from-emerald-600 to-teal-600',
        glow: 'shadow-emerald-500/20',
        description: 'Safety gear status',
        accent: 'text-emerald-400'
    },
    {
        id: 'materials' as const,
        label: 'STOCK MAPPING',
        icon: Package,
        gradient: 'from-fuchsia-600 to-pink-600',
        glow: 'shadow-fuchsia-500/20',
        description: 'Staging & storage',
        accent: 'text-fuchsia-400'
    }
];

// ════════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════════════════════════════════════════

export function VisionCapture({
    onImagesChange,
    onDocumentsChange,
    maxImages = 10,
    maxDocuments = 3,
    disabled = false
}: VisionCaptureProps) {
    const [images, setImages] = useState<CapturedImage[]>([]);
    const [documents, setDocuments] = useState<CapturedDocument[]>([]);
    const [activeCategory, setActiveCategory] = useState<typeof CAPTURE_CATEGORIES[0] | null>(null);

    const cameraInputRef = useRef<HTMLInputElement>(null);
    const galleryInputRef = useRef<HTMLInputElement>(null);
    const documentInputRef = useRef<HTMLInputElement>(null);

    // Handle camera/gallery capture
    const handleCapture = useCallback((category: typeof CAPTURE_CATEGORIES[0]) => {
        setActiveCategory(category);
        if (cameraInputRef.current) {
            cameraInputRef.current.click();
        }
    }, []);

    const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files || files.length === 0 || !activeCategory) return;

        const newImages: CapturedImage[] = [];

        Array.from(files).forEach((file) => {
            if (images.length + newImages.length >= maxImages) return;

            const preview = URL.createObjectURL(file);
            newImages.push({
                id: `img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                file,
                preview,
                category: activeCategory.id,
                uploading: false
            });
        });

        const updatedImages = [...images, ...newImages];
        setImages(updatedImages);
        onImagesChange?.(updatedImages);

        event.target.value = '';
        setActiveCategory(null);
    }, [activeCategory, images, maxImages, onImagesChange]);

    const handleGalleryUpload = useCallback(() => {
        if (galleryInputRef.current) {
            galleryInputRef.current.click();
        }
    }, []);

    const handleGalleryChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files || files.length === 0) return;

        const newImages: CapturedImage[] = [];

        Array.from(files).forEach((file) => {
            if (images.length + newImages.length >= maxImages) return;

            const preview = URL.createObjectURL(file);
            newImages.push({
                id: `img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                file,
                preview,
                category: 'site',
                uploading: false
            });
        });

        const updatedImages = [...images, ...newImages];
        setImages(updatedImages);
        onImagesChange?.(updatedImages);

        event.target.value = '';
    }, [images, maxImages, onImagesChange]);

    const handleDocumentUpload = useCallback(() => {
        if (documentInputRef.current) {
            documentInputRef.current.click();
        }
    }, []);

    const handleDocumentChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files || files.length === 0) return;

        const newDocs: CapturedDocument[] = [];

        Array.from(files).forEach((file) => {
            if (documents.length + newDocs.length >= maxDocuments) return;

            newDocs.push({
                id: `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                file,
                name: file.name
            });
        });

        const updatedDocs = [...documents, ...newDocs];
        setDocuments(updatedDocs);
        onDocumentsChange?.(updatedDocs);

        event.target.value = '';
    }, [documents, maxDocuments, onDocumentsChange]);

    const removeImage = useCallback((id: string) => {
        const updated = images.filter(img => img.id !== id);
        setImages(updated);
        onImagesChange?.(updated);
    }, [images, onImagesChange]);

    const removeDocument = useCallback((id: string) => {
        const updated = documents.filter(doc => doc.id !== id);
        setDocuments(updated);
        onDocumentsChange?.(updated);
    }, [documents, onDocumentsChange]);

    return (
        <div className="space-y-6">
            {/* Category Grid */}
            <div className="grid grid-cols-2 gap-3 pb-2">
                {CAPTURE_CATEGORIES.map((category) => {
                    const Icon = category.icon;
                    const count = images.filter(img => img.category === category.id).length;

                    return (
                        <button
                            key={category.id}
                            onClick={() => handleCapture(category)}
                            disabled={disabled || images.length >= maxImages}
                            className={cn(
                                "group relative flex flex-col items-center justify-center p-6 rounded-3xl transition-all duration-300",
                                "min-h-[140px] border border-white/5 bg-white/5 backdrop-blur-md",
                                "hover:bg-white/10 hover:border-white/20 active:scale-95",
                                "shadow-2xl overflow-hidden",
                                disabled && "opacity-50 cursor-not-allowed"
                            )}
                        >
                            {/* Gradient Background Layer on Hover */}
                            <div className={cn(
                                "absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-10 transition-opacity duration-500",
                                category.gradient
                            )} />

                            <div className={cn(
                                "p-3 rounded-2xl mb-3 transition-transform duration-500 group-hover:scale-110 group-hover:-translate-y-1",
                                "bg-gradient-to-br",
                                category.gradient,
                                category.glow
                            )}>
                                <Icon weight="fill" size={32} className="text-white" />
                            </div>

                            <div className="text-center relative z-10">
                                <span className="block font-black text-xs tracking-widest text-white">{category.label}</span>
                                <span className="block text-[9px] font-mono text-gray-500 mt-0.5 uppercase">{category.description}</span>
                            </div>

                            {/* Count Badge */}
                            {count > 0 && (
                                <Badge className="absolute top-3 right-3 bg-white text-black font-black border-none px-2 py-0.5 text-[10px] animate-in zoom-in">
                                    {count}
                                </Badge>
                            )}

                            {/* HUD Corners */}
                            <div className="absolute top-2 left-2 w-2 h-2 border-t border-l border-white/10 group-hover:border-white/40" />
                            <div className="absolute bottom-2 right-2 w-2 h-2 border-b border-r border-white/10 group-hover:border-white/40" />
                        </button>
                    );
                })}
            </div>

            {/* Utility Rows */}
            <div className="grid grid-cols-2 gap-3">
                <button
                    onClick={handleGalleryUpload}
                    disabled={disabled || images.length >= maxImages}
                    className="flex items-center justify-center gap-2 p-4 rounded-2xl border border-white/5 bg-white/5 text-gray-400 text-xs font-bold hover:bg-white/10 transition-all uppercase tracking-tight"
                >
                    <ImageIcon weight="bold" size={18} />
                    Gallery
                </button>
                <button
                    onClick={handleDocumentUpload}
                    disabled={disabled || documents.length >= maxDocuments}
                    className="flex items-center justify-center gap-2 p-4 rounded-2xl border border-white/5 bg-white/5 text-gray-400 text-xs font-bold hover:bg-white/10 transition-all uppercase tracking-tight"
                >
                    <Plus weight="bold" size={18} />
                    DWG/PDF
                </button>
            </div>

            {/* Hidden Inputs */}
            <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={handleFileChange} className="hidden" />
            <input ref={galleryInputRef} type="file" accept="image/*" multiple onChange={handleGalleryChange} className="hidden" />
            <input ref={documentInputRef} type="file" accept=".pdf" onChange={handleDocumentChange} className="hidden" />

            {/* Previews */}
            {(images.length > 0 || documents.length > 0) && (
                <div className="space-y-4 pt-4 border-t border-white/5">
                    <div className="flex items-center justify-between px-1">
                        <div className="flex items-center gap-2">
                            <Target weight="fill" className="text-violet-500" />
                            <h3 className="text-xs font-black text-white tracking-widest uppercase">Payload Queue</h3>
                        </div>
                        <button
                            onClick={() => { setImages([]); setDocuments([]); onImagesChange?.([]); onDocumentsChange?.([]); }}
                            className="text-[10px] text-red-500/60 font-black uppercase tracking-tighter hover:text-red-400"
                        >
                            Flush All
                        </button>
                    </div>

                    {/* Image Grid */}
                    {images.length > 0 && (
                        <div className="grid grid-cols-3 gap-3">
                            {images.map((img) => (
                                <div key={img.id} className="relative group aspect-square rounded-2xl overflow-hidden border border-white/10 shadow-lg">
                                    <NextImage src={img.preview} alt="Captured" fill className="object-cover" unoptimized />
                                    <div className="absolute inset-x-0 bottom-0 p-1.5 bg-gradient-to-t from-black/80 to-transparent">
                                        <Badge className="bg-white/10 text-white border-white/20 text-[8px] px-1 py-0 uppercase">
                                            {img.category}
                                        </Badge>
                                    </div>
                                    <button
                                        onClick={() => removeImage(img.id)}
                                        className="absolute top-1 right-1 p-1 bg-red-600 rounded-lg text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <X weight="bold" size={12} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Document List */}
                    {documents.length > 0 && (
                        <div className="space-y-2">
                            {documents.map((doc) => (
                                <div key={doc.id} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-xl bg-violet-600/20">
                                            <FilePdf weight="fill" className="text-violet-400" />
                                        </div>
                                        <span className="text-xs text-gray-300 font-mono truncate max-w-[150px]">{doc.name}</span>
                                    </div>
                                    <button onClick={() => removeDocument(doc.id)} className="text-gray-600 hover:text-red-500 transition-colors">
                                        <X weight="bold" size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// ════════════════════════════════════════════════════════════════════════════════
// STATUS INDICATOR - Colorblind accessible (icon + color)
// ════════════════════════════════════════════════════════════════════════════════

interface StatusIndicatorProps {
    status: 'PASS' | 'CONCERN' | 'FAIL' | 'PENDING';
    size?: 'sm' | 'md' | 'lg';
    showLabel?: boolean;
}

export function StatusIndicator({ status, size = 'md', showLabel = false }: StatusIndicatorProps) {
    const sizeClasses = {
        sm: 'h-4 w-4',
        md: 'h-5 w-5',
        lg: 'h-6 w-6'
    };

    const config = {
        PASS: {
            icon: CheckCircle,
            className: 'text-emerald-500',
            label: 'PASS'
        },
        CONCERN: {
            icon: Warning,
            className: 'text-amber-500',
            label: 'CONCERN'
        },
        FAIL: {
            icon: X,
            className: 'text-red-500',
            label: 'FAIL'
        },
        PENDING: {
            icon: CircleNotch,
            className: 'text-slate-400 animate-spin',
            label: 'PENDING'
        }
    };

    const { icon: Icon, className, label } = config[status];

    return (
        <span className="inline-flex items-center gap-1.5">
            <Icon weight="bold" className={cn(sizeClasses[size], className)} />
            {showLabel && (
                <span className="font-semibold text-sm uppercase">{label}</span>
            )}
            <span className="sr-only">{label}</span>
        </span>
    );
}

// ════════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ════════════════════════════════════════════════════════════════════════════════

export type { CapturedImage, CapturedDocument };
