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
    Camera,
    CheckCircle,
    Warning,
    Trash
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
// CATEGORY CONFIG - CLEAN & PROFESSIONAL
// ════════════════════════════════════════════════════════════════════════════════

const CAPTURE_CATEGORIES = [
    {
        id: 'site' as const,
        label: 'Site',
        icon: MapPin,
        color: 'text-blue-400',
        bg: 'bg-blue-500/10 hover:bg-blue-500/20',
        border: 'border-blue-500/20'
    },
    {
        id: 'equipment' as const,
        label: 'Equipment',
        icon: Wrench,
        color: 'text-orange-400',
        bg: 'bg-orange-500/10 hover:bg-orange-500/20',
        border: 'border-orange-500/20'
    },
    {
        id: 'ppe' as const,
        label: 'PPE',
        icon: HardHat,
        color: 'text-emerald-400',
        bg: 'bg-emerald-500/10 hover:bg-emerald-500/20',
        border: 'border-emerald-500/20'
    },
    {
        id: 'materials' as const,
        label: 'Materials',
        icon: Package,
        color: 'text-purple-400',
        bg: 'bg-purple-500/10 hover:bg-purple-500/20',
        border: 'border-purple-500/20'
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

    const clearAll = useCallback(() => {
        setImages([]);
        setDocuments([]);
        onImagesChange?.([]);
        onDocumentsChange?.([]);
    }, [onImagesChange, onDocumentsChange]);

    const totalItems = images.length + documents.length;

    return (
        <div className="space-y-4">
            {/* Compact Category Buttons */}
            <div className="flex flex-wrap gap-2">
                {CAPTURE_CATEGORIES.map((category) => {
                    const Icon = category.icon;
                    const count = images.filter(img => img.category === category.id).length;

                    return (
                        <button
                            key={category.id}
                            onClick={() => handleCapture(category)}
                            disabled={disabled || images.length >= maxImages}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all",
                                "border text-sm font-medium",
                                category.bg,
                                category.border,
                                disabled && "opacity-50 cursor-not-allowed"
                            )}
                        >
                            <Icon weight="bold" size={18} className={category.color} />
                            <span className="text-white">{category.label}</span>
                            {count > 0 && (
                                <Badge className="bg-white/20 text-white text-xs px-1.5 py-0 ml-1">
                                    {count}
                                </Badge>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Utility Buttons Row */}
            <div className="flex gap-2">
                <button
                    onClick={handleGalleryUpload}
                    disabled={disabled || images.length >= maxImages}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 text-gray-400 text-sm font-medium hover:bg-white/10 transition-all disabled:opacity-50"
                >
                    <ImageIcon weight="bold" size={16} />
                    <span>Gallery</span>
                </button>
                <button
                    onClick={handleDocumentUpload}
                    disabled={disabled || documents.length >= maxDocuments}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 text-gray-400 text-sm font-medium hover:bg-white/10 transition-all disabled:opacity-50"
                >
                    <FilePdf weight="bold" size={16} />
                    <span>PDF</span>
                </button>
                {totalItems > 0 && (
                    <button
                        onClick={clearAll}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-red-500/20 bg-red-500/10 text-red-400 text-sm font-medium hover:bg-red-500/20 transition-all ml-auto"
                    >
                        <Trash weight="bold" size={16} />
                        <span>Clear All</span>
                    </button>
                )}
            </div>

            {/* Hidden Inputs */}
            <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={handleFileChange} className="hidden" />
            <input ref={galleryInputRef} type="file" accept="image/*" multiple onChange={handleGalleryChange} className="hidden" />
            <input ref={documentInputRef} type="file" accept=".pdf" onChange={handleDocumentChange} className="hidden" />

            {/* Preview Grid */}
            {totalItems > 0 && (
                <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                            {totalItems} file{totalItems !== 1 ? 's' : ''} ready
                        </span>
                    </div>

                    {/* Image Grid - Compact */}
                    {images.length > 0 && (
                        <div className="grid grid-cols-4 gap-2">
                            {images.map((img) => {
                                const cat = CAPTURE_CATEGORIES.find(c => c.id === img.category);
                                return (
                                    <div key={img.id} className="relative group aspect-square rounded-lg overflow-hidden border border-white/10">
                                        <NextImage src={img.preview} alt="Captured" fill className="object-cover" unoptimized />
                                        {/* Category indicator */}
                                        <div className={cn("absolute bottom-0 left-0 right-0 py-1 px-1.5 bg-black/60", cat?.color)}>
                                            <span className="text-[9px] font-medium uppercase">{img.category}</span>
                                        </div>
                                        {/* Remove button */}
                                        <button
                                            onClick={() => removeImage(img.id)}
                                            className="absolute top-1 right-1 p-1 bg-black/60 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                                        >
                                            <X weight="bold" size={10} />
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Document List - Compact */}
                    {documents.length > 0 && (
                        <div className="space-y-1">
                            {documents.map((doc) => (
                                <div key={doc.id} className="flex items-center justify-between p-2 bg-white/5 rounded-lg border border-white/5">
                                    <div className="flex items-center gap-2">
                                        <FilePdf weight="fill" size={16} className="text-red-400" />
                                        <span className="text-xs text-gray-300 truncate max-w-[180px]">{doc.name}</span>
                                    </div>
                                    <button onClick={() => removeDocument(doc.id)} className="text-gray-500 hover:text-red-400 transition-colors">
                                        <X weight="bold" size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Empty State */}
            {totalItems === 0 && (
                <div className="text-center py-8 border border-dashed border-white/10 rounded-xl">
                    <Camera weight="thin" size={32} className="mx-auto text-gray-600 mb-2" />
                    <p className="text-sm text-gray-500">Tap a category above to capture photos</p>
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
