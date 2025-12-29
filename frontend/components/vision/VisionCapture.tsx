'use client';

import { useState, useRef, useCallback } from 'react';
import { Camera, Upload, X, CheckCircle, AlertTriangle, XCircle, Loader2, HardHat, Wrench, MapPin, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
// CATEGORY CONFIG
// ════════════════════════════════════════════════════════════════════════════════

const CAPTURE_CATEGORIES = [
    {
        id: 'site' as const,
        label: 'Site Overview',
        icon: MapPin,
        color: 'bg-blue-500 hover:bg-blue-600',
        description: 'Work area, conditions',
        examples: 'Barriers, signage, access'
    },
    {
        id: 'equipment' as const,
        label: 'Equipment',
        icon: Wrench,
        color: 'bg-orange-500 hover:bg-orange-600',
        description: 'Cranes, lifts, tools',
        examples: 'Certs, damage, setup'
    },
    {
        id: 'ppe' as const,
        label: 'PPE Check',
        icon: HardHat,
        color: 'bg-green-500 hover:bg-green-600',
        description: 'Safety gear inspection',
        examples: 'Harnesses, hard hats'
    },
    {
        id: 'materials' as const,
        label: 'Materials',
        icon: Package,
        color: 'bg-purple-500 hover:bg-purple-600',
        description: 'Storage & staging',
        examples: 'Glass panels, lumber'
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
        // Use camera on mobile, open file picker on desktop
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

        // Reset input
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
                category: 'site', // Default to site for gallery uploads
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

    const getCategoryBadgeColor = (category: string) => {
        switch (category) {
            case 'site': return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'equipment': return 'bg-orange-100 text-orange-800 border-orange-200';
            case 'ppe': return 'bg-green-100 text-green-800 border-green-200';
            case 'materials': return 'bg-purple-100 text-purple-800 border-purple-200';
            default: return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    return (
        <div className="space-y-4">
            {/* Quick Capture Buttons */}
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
                                "relative flex flex-col items-center justify-center p-4 rounded-xl text-white transition-all",
                                "min-h-[100px] touch-manipulation active:scale-95",
                                category.color,
                                disabled && "opacity-50 cursor-not-allowed"
                            )}
                        >
                            <Icon className="h-8 w-8 mb-2" />
                            <span className="font-semibold text-sm">{category.label}</span>
                            <span className="text-xs opacity-80 mt-0.5">{category.description}</span>

                            {categoryCount > 0 && (
                                <Badge
                                    className="absolute top-2 right-2 bg-white text-gray-900 hover:bg-white"
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
                    size="sm"
                    onClick={handleGalleryUpload}
                    disabled={disabled || images.length >= maxImages}
                    className="flex-1"
                >
                    <Upload className="h-4 w-4 mr-2" />
                    From Gallery
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDocumentUpload}
                    disabled={disabled || documents.length >= maxDocuments}
                    className="flex-1"
                >
                    <Upload className="h-4 w-4 mr-2" />
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
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-muted-foreground">
                            Photos ({images.length}/{maxImages})
                        </span>
                        {images.length > 0 && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                    setImages([]);
                                    onImagesChange?.([]);
                                }}
                                className="text-red-500 hover:text-red-600 hover:bg-red-50"
                            >
                                Clear All
                            </Button>
                        )}
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                        {images.map((img) => (
                            <div key={img.id} className="relative group">
                                <img
                                    src={img.preview}
                                    alt="Captured"
                                    className="w-full h-24 object-cover rounded-lg border"
                                />
                                <Badge
                                    className={cn(
                                        "absolute bottom-1 left-1 text-[10px] px-1.5 py-0",
                                        getCategoryBadgeColor(img.category)
                                    )}
                                >
                                    {img.category}
                                </Badge>
                                <button
                                    onClick={() => removeImage(img.id)}
                                    className="absolute top-1 right-1 p-1 bg-black/50 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <X className="h-3 w-3" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Document List */}
            {documents.length > 0 && (
                <div className="space-y-2">
                    <span className="text-sm font-medium text-muted-foreground">
                        Documents ({documents.length}/{maxDocuments})
                    </span>
                    <div className="space-y-1">
                        {documents.map((doc) => (
                            <div
                                key={doc.id}
                                className="flex items-center justify-between p-2 bg-muted rounded-lg"
                            >
                                <span className="text-sm truncate flex-1">{doc.name}</span>
                                <button
                                    onClick={() => removeDocument(doc.id)}
                                    className="p-1 hover:bg-red-100 rounded text-red-500"
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
// STATUS INDICATOR
// ════════════════════════════════════════════════════════════════════════════════

interface StatusIndicatorProps {
    status: 'PASS' | 'CONCERN' | 'FAIL' | 'PENDING';
    size?: 'sm' | 'md' | 'lg';
}

export function StatusIndicator({ status, size = 'md' }: StatusIndicatorProps) {
    const sizeClasses = {
        sm: 'h-4 w-4',
        md: 'h-5 w-5',
        lg: 'h-6 w-6'
    };

    switch (status) {
        case 'PASS':
            return <CheckCircle className={cn(sizeClasses[size], "text-green-500")} />;
        case 'CONCERN':
            return <AlertTriangle className={cn(sizeClasses[size], "text-yellow-500")} />;
        case 'FAIL':
            return <XCircle className={cn(sizeClasses[size], "text-red-500")} />;
        default:
            return <Loader2 className={cn(sizeClasses[size], "text-gray-400 animate-spin")} />;
    }
}

// ════════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ════════════════════════════════════════════════════════════════════════════════

export type { CapturedImage, CapturedDocument };
