'use client';

import { useMutation } from '@tanstack/react-query';
import type { CapturedImage, CapturedDocument } from '@/components/vision/VisionCapture';
import type { VisionAnalysisResult } from '@/components/vision/VisionResults';

// ════════════════════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════════════════════

interface VisionUpdateRequest {
    jha_id?: string;
    text_update: string;
    images: CapturedImage[];
    documents: CapturedDocument[];
    provider?: 'google' | 'anthropic';
}

interface SingleImageRequest {
    image: CapturedImage;
    analysis_type: 'site' | 'equipment' | 'ppe' | 'materials';
    context: string;
    provider?: 'google' | 'anthropic';
}

// ════════════════════════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════════════════════════

async function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const result = reader.result as string;
            // Remove the data URL prefix (e.g., "data:image/jpeg;base64,")
            const base64 = result.split(',')[1];
            resolve(base64);
        };
        reader.onerror = (error) => reject(error);
    });
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// ════════════════════════════════════════════════════════════════════════════════
// API FUNCTIONS
// ════════════════════════════════════════════════════════════════════════════════

async function analyzeVisionUpdate(request: VisionUpdateRequest): Promise<VisionAnalysisResult> {
    // Convert images to base64
    const imagePromises = request.images.map(async (img) => ({
        data: await fileToBase64(img.file),
        mime_type: img.file.type || 'image/jpeg',
        category: img.category,
        filename: img.file.name
    }));

    // Convert documents to base64
    const documentPromises = request.documents.map(async (doc) => ({
        data: await fileToBase64(doc.file),
        filename: doc.name
    }));

    const [images, documents] = await Promise.all([
        Promise.all(imagePromises),
        Promise.all(documentPromises)
    ]);

    const response = await fetch(`${API_URL}/api/v1/jha/vision/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            jha_id: request.jha_id,
            text_update: request.text_update,
            images: images.length > 0 ? images : null,
            documents: documents.length > 0 ? documents : null,
            provider: request.provider || 'google'
        })
    });

    if (!response.ok) {
        throw new Error(`Analysis failed: ${response.statusText}`);
    }

    return response.json();
}

async function analyzeSingleImage(request: SingleImageRequest): Promise<any> {
    const base64 = await fileToBase64(request.image.file);

    const response = await fetch(`${API_URL}/api/v1/jha/vision/analyze/image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            image: {
                data: base64,
                mime_type: request.image.file.type || 'image/jpeg',
                category: request.analysis_type
            },
            analysis_type: request.analysis_type,
            context: request.context,
            provider: request.provider || 'google'
        })
    });

    if (!response.ok) {
        throw new Error(`Analysis failed: ${response.statusText}`);
    }

    return response.json();
}

async function getVisionCapabilities(): Promise<any> {
    const response = await fetch(`${API_URL}/api/v1/jha/vision/capabilities`);

    if (!response.ok) {
        throw new Error(`Failed to fetch capabilities: ${response.statusText}`);
    }

    return response.json();
}

// ════════════════════════════════════════════════════════════════════════════════
// HOOKS
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Hook for comprehensive multimodal vision analysis
 * 
 * @example
 * const { mutate: analyze, isPending, data } = useVisionAnalysis();
 * 
 * analyze({
 *   text_update: "Adding glass install, spider crane",
 *   images: capturedImages,
 *   documents: capturedDocs
 * });
 */
export function useVisionAnalysis() {
    return useMutation({
        mutationFn: analyzeVisionUpdate,
        onError: (error) => {
            console.error('Vision analysis error:', error);
        }
    });
}

/**
 * Hook for single image analysis
 * 
 * @example
 * const { mutate: analyzeImage, isPending } = useSingleImageAnalysis();
 * 
 * analyzeImage({
 *   image: capturedImage,
 *   analysis_type: 'equipment',
 *   context: 'Spider crane for glass installation'
 * });
 */
export function useSingleImageAnalysis() {
    return useMutation({
        mutationFn: analyzeSingleImage,
        onError: (error) => {
            console.error('Single image analysis error:', error);
        }
    });
}

/**
 * Get vision API capabilities
 */
export { getVisionCapabilities };
