'use client';

import { useState, useRef, useCallback } from 'react';
import { Camera, Upload, X, CheckCircle2, AlertTriangle, XOctagon, Loader2, HardHat, Wrench, MapPin, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
// CATEGORY CONFIG - ANSI Safety Colors
// ════════════════════════════════════════════════════════════════════════════════

const CAPTURE_CATEGORIES = [
    {
        id: 'site' as const,
        label: 'Site Overview',
        icon: MapPin,
        className: 'capture-btn-site',
        description: 'Work area & conditions',
        badgeClass: 'bg-sky-500/20 text-sky-400 border-sky-500/30'
    },
    {
        id: 'equipment' as const,
        label: 'Equipment',
        icon: Wrench,
        className: 'capture-btn-equipment',
        description: 'Cranes, lifts, tools',
        badgeClass: 'bg-orange-500/20 text-orange-400 border-orange-500/30'
    },
    {
        id: 'ppe' as const,
        label: 'PPE Check',
        icon: HardHat,
        className: 'capture-btn-ppe',
        description: 'Safety gear inspection',
        badgeClass: 'bg-green-500/20 text-green-400 border-green-500/30'
    },
    {
        id: 'materials' as const,
        label: 'Materials',
        icon: Package,
        className: 'capture-btn-materials',
        description: 'Storage & staging',
        badgeClass: 'bg-rose-500/20 text-rose-400 border-rose-500/30'
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

    const getCategoryConfig = (category: string) => {
        return CAPTURE_CATEGORIES.find(c => c.id === category);
    };

    return (
        <div className="space-y-4">
            {/* Quick Capture Buttons - Large, touch-friendly, high contrast */}
            <div className="grid grid-cols-2 gap-3">
                {CAPTURE_CATEGORIES.map((category) => {
                    const Icon = category.icon;
                    const categoryCount = images.filter(img => img.category === category.id).length;

                    return (
                        <button
                            key={category.id}
                            onClick={() => handleCapture(category)}
                            disabled={disabled || images.length >= maxImages}
                            className={cn(
                                "relative flex flex-col items-center justify-center p-5 rounded-xl text-white transition-all",
                                "min-h-[110px] touch-target-xl active:scale-95",
                                "border-2 border-white/20",
                                category.className,
                                disabled && "opacity-50 cursor-not-allowed"
                            )}
                        >
                            <Icon className="h-10 w-10 mb-2" strokeWidth={2} />
                            <span className="font-bold text-base">{category.label}</span>
                            <span className="text-xs opacity-80 mt-0.5">{category.description}</span>

                            {/* Photo count badge */}
                            {categoryCount > 0 && (
                                <Badge
                                    className="absolute top-2 right-2 bg-white text-slate-900 font-bold hover:bg-white border-0"
                                >
                                    {categoryCount}
                                </Badge>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Additional Upload Options */}
            <div className="flex gap-2">
                <Button
                    variant="outline"
                    size="lg"
                    onClick={handleGalleryUpload}
                    disabled={disabled || images.length >= maxImages}
                    className="flex-1 border-2"
                >
                    <Upload className="h-5 w-5 mr-2" />
                    From Gallery
                </Button>
                <Button
                    variant="outline"
                    size="lg"
                    onClick={handleDocumentUpload}
                    disabled={disabled || documents.length >= maxDocuments}
                    className="flex-1 border-2"
                >
                    <Upload className="h-5 w-5 mr-2" />
                    Shop Drawing
                </Button>
            </div>

            {/* Hidden Inputs */}
            <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileChange}
                className="hidden"
            />
            <input
                ref={galleryInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleGalleryChange}
                className="hidden"
            />
            <input
                ref={documentInputRef}
                type="file"
                accept=".pdf"
                onChange={handleDocumentChange}
                className="hidden"
            />

            {/* Image Preview Grid */}
            {images.length > 0 && (
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <span className="font-semibold text-foreground">
                            Photos ({images.length}/{maxImages})
                        </span>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                                setImages([]);
                                onImagesChange?.([]);
                            }}
                            className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                        >
                            Clear All
                        </Button>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                        {images.map((img) => {
                            const categoryConfig = getCategoryConfig(img.category);
                            return (
                                <div key={img.id} className="relative group">
                                    <img
                                        src={img.preview}
                                        alt="Captured"
                                        className="w-full h-24 object-cover rounded-lg border-2 border-slate-600"
                                    />
                                    <Badge
                                        className={cn(
                                            "absolute bottom-1 left-1 text-[10px] px-1.5 py-0 border",
                                            categoryConfig?.badgeClass
                                        )}
                                    >
                                        {img.category}
                                    </Badge>
                                    <button
                                        onClick={() => removeImage(img.id)}
                                        className="absolute top-1 right-1 p-1.5 bg-red-500 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                        aria-label="Remove image"
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Document List */}
            {documents.length > 0 && (
                <div className="space-y-2">
                    <span className="font-semibold text-foreground">
                        Documents ({documents.length}/{maxDocuments})
                    </span>
                    <div className="space-y-1">
                        {documents.map((doc) => (
                            <div
                                key={doc.id}
                                className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg border border-slate-600"
                            >
                                <span className="text-sm truncate flex-1 text-foreground">{doc.name}</span>
                                <button
                                    onClick={() => removeDocument(doc.id)}
                                    className="p-1.5 hover:bg-red-500/20 rounded text-red-400 ml-2"
                                    aria-label="Remove document"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                        ))}
                    </div>
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
            icon: CheckCircle2,
            className: 'icon-pass',
            label: 'PASS'
        },
        CONCERN: {
            icon: AlertTriangle,
            className: 'icon-caution',
            label: 'CONCERN'
        },
        FAIL: {
            icon: XOctagon,
            className: 'icon-fail',
            label: 'FAIL'
        },
        PENDING: {
            icon: Loader2,
            className: 'text-slate-400 animate-spin',
            label: 'PENDING'
        }
    };

    const { icon: Icon, className, label } = config[status];

    return (
        <span className="inline-flex items-center gap-1.5">
            <Icon className={cn(sizeClasses[size], className)} />
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
