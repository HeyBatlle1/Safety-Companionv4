'use client';

import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@clerk/nextjs';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import {
    Certificate,
    FileText,
    Upload,
    Check,
    X,
    Warning,
    Clock,
    Eye,
    Trash,
    Plus,
    Shield,
    FirstAid,
    Syringe,
    Biohazard,
    HardHat,
    Fire,
    Lightning,
    Crane,
    Lock,
    CheckCircle,
    CalendarCheck,
    DownloadSimple,
    CircleNotch,
    CaretDown,
    CaretUp,
} from '@phosphor-icons/react';

// ════════════════════════════════════════════════════════════════════════════════
// DOCUMENT CATEGORY DEFINITIONS
// ════════════════════════════════════════════════════════════════════════════════

interface DocumentCategory {
    id: string;
    label: string;
    description: string;
    icon: React.ComponentType<any>;
    color: string;
    bgColor: string;
    borderColor: string;
    required: boolean;
    expirationMonths?: number; // How long until expiration
}

const DOCUMENT_CATEGORIES: DocumentCategory[] = [
    {
        id: 'osha_10',
        label: 'OSHA 10',
        description: '10-Hour Construction Safety Training',
        icon: Shield,
        color: 'text-emerald-400',
        bgColor: 'bg-emerald-500/10',
        borderColor: 'border-emerald-500/20',
        required: true,
        expirationMonths: undefined, // Never expires
    },
    {
        id: 'osha_30',
        label: 'OSHA 30',
        description: '30-Hour Construction Safety Training',
        icon: Shield,
        color: 'text-emerald-400',
        bgColor: 'bg-emerald-500/10',
        borderColor: 'border-emerald-500/20',
        required: false,
        expirationMonths: undefined,
    },
    {
        id: 'first_aid',
        label: 'First Aid / CPR',
        description: 'First Aid & CPR Certification',
        icon: FirstAid,
        color: 'text-red-400',
        bgColor: 'bg-red-500/10',
        borderColor: 'border-red-500/20',
        required: true,
        expirationMonths: 24, // 2 years
    },
    {
        id: 'drug_test',
        label: 'Drug Test',
        description: 'Pre-employment / Random Drug Screening',
        icon: Syringe,
        color: 'text-blue-400',
        bgColor: 'bg-blue-500/10',
        borderColor: 'border-blue-500/20',
        required: true,
        expirationMonths: 12, // Annual
    },
    {
        id: 'hazcom',
        label: 'HazCom',
        description: 'Hazard Communication Training (GHS)',
        icon: Biohazard,
        color: 'text-amber-400',
        bgColor: 'bg-amber-500/10',
        borderColor: 'border-amber-500/20',
        required: true,
        expirationMonths: 12, // Annual
    },
    {
        id: 'fall_protection',
        label: 'Fall Protection',
        description: 'Fall Protection Competent Person',
        icon: HardHat,
        color: 'text-orange-400',
        bgColor: 'bg-orange-500/10',
        borderColor: 'border-orange-500/20',
        required: false,
        expirationMonths: 36, // 3 years
    },
    {
        id: 'fire_safety',
        label: 'Fire Safety',
        description: 'Fire Extinguisher & Prevention Training',
        icon: Fire,
        color: 'text-red-400',
        bgColor: 'bg-red-500/10',
        borderColor: 'border-red-500/20',
        required: false,
        expirationMonths: 12,
    },
    {
        id: 'electrical',
        label: 'Electrical Safety',
        description: 'NFPA 70E / Electrical Safety Training',
        icon: Lightning,
        color: 'text-yellow-400',
        bgColor: 'bg-yellow-500/10',
        borderColor: 'border-yellow-500/20',
        required: false,
        expirationMonths: 36,
    },
    {
        id: 'rigging',
        label: 'Rigging / Crane',
        description: 'Rigging & Crane Signal Person Certification',
        icon: Crane,
        color: 'text-purple-400',
        bgColor: 'bg-purple-500/10',
        borderColor: 'border-purple-500/20',
        required: false,
        expirationMonths: 48, // 4 years
    },
    {
        id: 'confined_space',
        label: 'Confined Space',
        description: 'Confined Space Entry Training',
        icon: Lock,
        color: 'text-slate-400',
        bgColor: 'bg-slate-500/10',
        borderColor: 'border-slate-500/20',
        required: false,
        expirationMonths: 12,
    },
];

// ════════════════════════════════════════════════════════════════════════════════
// DOCUMENT STATUS HELPERS
// ════════════════════════════════════════════════════════════════════════════════

interface WorkerDocument {
    id: string;
    category: string;
    file_name: string;
    file_url: string;
    file_size: number;
    issue_date: string;
    expiration_date?: string;
    status: 'valid' | 'expiring_soon' | 'expired' | 'pending_review';
    verified: boolean;
    uploaded_at: string;
}

function getDocumentStatus(doc: WorkerDocument): { label: string; color: string; bgColor: string; icon: React.ComponentType<any> } {
    if (doc.status === 'expired' || (doc.expiration_date && new Date(doc.expiration_date) < new Date())) {
        return { label: 'EXPIRED', color: 'text-red-400', bgColor: 'bg-red-500/10', icon: X };
    }
    if (doc.status === 'expiring_soon') {
        return { label: 'EXPIRING SOON', color: 'text-amber-400', bgColor: 'bg-amber-500/10', icon: Warning };
    }
    if (doc.status === 'pending_review') {
        return { label: 'PENDING', color: 'text-blue-400', bgColor: 'bg-blue-500/10', icon: Clock };
    }
    if (doc.verified) {
        return { label: 'VERIFIED', color: 'text-emerald-400', bgColor: 'bg-emerald-500/10', icon: CheckCircle };
    }
    return { label: 'VALID', color: 'text-emerald-400', bgColor: 'bg-emerald-500/10', icon: Check };
}

function formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getDaysUntilExpiration(expirationDate: string): number {
    const exp = new Date(expirationDate);
    const now = new Date();
    return Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

// ════════════════════════════════════════════════════════════════════════════════
// DOCUMENT UPLOAD CARD
// ════════════════════════════════════════════════════════════════════════════════

interface DocumentUploadCardProps {
    category: DocumentCategory;
    documents: WorkerDocument[];
    onUpload: (categoryId: string, file: File, issueDate: string, expirationDate?: string) => void;
    onDelete: (docId: string) => void;
    isUploading: boolean;
}

function DocumentUploadCard({ category, documents, onUpload, onDelete, isUploading }: DocumentUploadCardProps) {
    const [isExpanded, setIsExpanded] = useState(documents.length > 0);
    const [showUploadForm, setShowUploadForm] = useState(false);
    const [issueDate, setIssueDate] = useState('');
    const [expirationDate, setExpirationDate] = useState('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const Icon = category.icon;
    const latestDoc = documents[0];
    const status = latestDoc ? getDocumentStatus(latestDoc) : null;
    const StatusIcon = status?.icon;

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedFile(file);
        }
    };

    const handleUpload = () => {
        if (selectedFile && issueDate) {
            onUpload(category.id, selectedFile, issueDate, expirationDate || undefined);
            setSelectedFile(null);
            setIssueDate('');
            setExpirationDate('');
            setShowUploadForm(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
                "rounded-xl border overflow-hidden transition-all",
                category.borderColor,
                latestDoc ? 'bg-card' : 'bg-card/50'
            )}
        >
            {/* Header */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full px-4 py-3 flex items-center gap-3 hover:bg-white/[0.02] transition-colors"
            >
                <div className={cn("p-2 rounded-lg", category.bgColor)}>
                    <Icon size={18} weight="fill" className={category.color} />
                </div>
                <div className="flex-1 text-left">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-white">{category.label}</span>
                        {category.required && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 font-bold">REQUIRED</span>
                        )}
                    </div>
                    <p className="text-[10px] text-muted-foreground">{category.description}</p>
                </div>
                {latestDoc && status && StatusIcon && (
                    <div className={cn("px-2 py-1 rounded-md flex items-center gap-1", status.bgColor)}>
                        <StatusIcon size={12} weight="bold" className={status.color} />
                        <span className={cn("text-[9px] font-bold", status.color)}>{status.label}</span>
                    </div>
                )}
                {!latestDoc && (
                    <div className="px-2 py-1 rounded-md bg-slate-500/10 flex items-center gap-1">
                        <Upload size={12} className="text-slate-400" />
                        <span className="text-[9px] font-bold text-slate-400">MISSING</span>
                    </div>
                )}
                {isExpanded ? (
                    <CaretUp size={16} className="text-muted-foreground" />
                ) : (
                    <CaretDown size={16} className="text-muted-foreground" />
                )}
            </button>

            {/* Expanded Content */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t border-white/5"
                    >
                        <div className="p-4 space-y-3">
                            {/* Existing Documents */}
                            {documents.length > 0 && (
                                <div className="space-y-2">
                                    {documents.map((doc) => {
                                        const docStatus = getDocumentStatus(doc);
                                        const DocStatusIcon = docStatus.icon;
                                        const daysUntil = doc.expiration_date ? getDaysUntilExpiration(doc.expiration_date) : null;

                                        return (
                                            <div key={doc.id} className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.02] border border-white/5">
                                                <FileText size={20} className="text-muted-foreground" />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs font-medium text-white truncate">{doc.file_name}</p>
                                                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                                                        <span>Issued: {formatDate(doc.issue_date)}</span>
                                                        {doc.expiration_date && (
                                                            <>
                                                                <span>•</span>
                                                                <span className={daysUntil && daysUntil < 30 ? 'text-amber-400' : ''}>
                                                                    Exp: {formatDate(doc.expiration_date)}
                                                                    {daysUntil !== null && daysUntil > 0 && daysUntil < 90 && (
                                                                        <span className="ml-1">({daysUntil}d)</span>
                                                                    )}
                                                                </span>
                                                            </>
                                                        )}
                                                        <span>•</span>
                                                        <span>{formatFileSize(doc.file_size)}</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {doc.verified && (
                                                        <div className="p-1 rounded bg-emerald-500/20">
                                                            <CheckCircle size={14} weight="fill" className="text-emerald-400" />
                                                        </div>
                                                    )}
                                                    <button className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                                                        <Eye size={14} className="text-muted-foreground" />
                                                    </button>
                                                    <button className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                                                        <DownloadSimple size={14} className="text-muted-foreground" />
                                                    </button>
                                                    <button
                                                        onClick={() => onDelete(doc.id)}
                                                        className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 transition-colors"
                                                    >
                                                        <Trash size={14} className="text-red-400" />
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Upload Form */}
                            {showUploadForm ? (
                                <div className="p-4 rounded-lg bg-white/[0.02] border border-dashed border-white/10 space-y-3">
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handleFileSelect}
                                        accept=".pdf,.jpg,.jpeg,.png"
                                        className="hidden"
                                    />

                                    {/* File Selection */}
                                    <div
                                        onClick={() => fileInputRef.current?.click()}
                                        className={cn(
                                            "p-4 rounded-lg border-2 border-dashed text-center cursor-pointer transition-colors",
                                            selectedFile
                                                ? "border-emerald-500/30 bg-emerald-500/5"
                                                : "border-white/10 hover:border-white/20"
                                        )}
                                    >
                                        {selectedFile ? (
                                            <div className="flex items-center justify-center gap-2">
                                                <FileText size={20} className="text-emerald-400" />
                                                <span className="text-sm text-emerald-400">{selectedFile.name}</span>
                                                <span className="text-xs text-muted-foreground">({formatFileSize(selectedFile.size)})</span>
                                            </div>
                                        ) : (
                                            <div>
                                                <Upload size={24} className="mx-auto text-muted-foreground mb-2" />
                                                <p className="text-sm text-muted-foreground">Click to select file</p>
                                                <p className="text-[10px] text-muted-foreground/60">PDF, JPG, PNG up to 10MB</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Date Inputs */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-[10px] font-medium text-muted-foreground uppercase">Issue Date *</label>
                                            <input
                                                type="date"
                                                value={issueDate}
                                                onChange={(e) => setIssueDate(e.target.value)}
                                                className="w-full mt-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white"
                                            />
                                        </div>
                                        {category.expirationMonths && (
                                            <div>
                                                <label className="text-[10px] font-medium text-muted-foreground uppercase">Expiration Date</label>
                                                <input
                                                    type="date"
                                                    value={expirationDate}
                                                    onChange={(e) => setExpirationDate(e.target.value)}
                                                    className="w-full mt-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white"
                                                />
                                            </div>
                                        )}
                                    </div>

                                    {/* Actions */}
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => {
                                                setShowUploadForm(false);
                                                setSelectedFile(null);
                                            }}
                                            className="flex-1 py-2 rounded-lg border border-white/10 text-sm font-medium text-muted-foreground hover:bg-white/5 transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleUpload}
                                            disabled={!selectedFile || !issueDate || isUploading}
                                            className={cn(
                                                "flex-1 py-2 rounded-lg text-sm font-bold transition-colors flex items-center justify-center gap-2",
                                                selectedFile && issueDate
                                                    ? "bg-emerald-600 text-white hover:bg-emerald-500"
                                                    : "bg-white/5 text-muted-foreground cursor-not-allowed"
                                            )}
                                        >
                                            {isUploading ? (
                                                <>
                                                    <CircleNotch size={16} className="animate-spin" />
                                                    Uploading...
                                                </>
                                            ) : (
                                                <>
                                                    <Upload size={16} />
                                                    Upload
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <button
                                    onClick={() => setShowUploadForm(true)}
                                    className="w-full py-3 rounded-lg border border-dashed border-white/10 text-sm font-medium text-muted-foreground hover:border-white/20 hover:bg-white/[0.02] transition-colors flex items-center justify-center gap-2"
                                >
                                    <Plus size={16} />
                                    {documents.length > 0 ? 'Upload New Version' : 'Upload Document'}
                                </button>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

// ════════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════════════════════════════════════════

export function WorkerDocuments() {
    const { getToken } = useAuth();
    const queryClient = useQueryClient();
    const [uploadingCategory, setUploadingCategory] = useState<string | null>(null);

    // Fetch documents
    const { data: documents = [], isLoading } = useQuery({
        queryKey: ['workerDocuments'],
        queryFn: async () => {
            const token = await getToken();
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/v1/users/me/documents`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!response.ok) return [];
            return response.json();
        },
    });

    // Upload mutation
    const uploadMutation = useMutation({
        mutationFn: async ({ categoryId, file, issueDate, expirationDate }: { categoryId: string; file: File; issueDate: string; expirationDate?: string }) => {
            const token = await getToken();
            const formData = new FormData();
            formData.append('file', file);
            formData.append('category', categoryId);
            formData.append('issue_date', issueDate);
            if (expirationDate) formData.append('expiration_date', expirationDate);

            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/v1/users/me/documents`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
                body: formData,
            });
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['workerDocuments'] });
            setUploadingCategory(null);
        },
        onError: () => {
            setUploadingCategory(null);
        },
    });

    // Delete mutation
    const deleteMutation = useMutation({
        mutationFn: async (docId: string) => {
            const token = await getToken();
            await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/v1/users/me/documents/${docId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['workerDocuments'] });
        },
    });

    const handleUpload = (categoryId: string, file: File, issueDate: string, expirationDate?: string) => {
        setUploadingCategory(categoryId);
        uploadMutation.mutate({ categoryId, file, issueDate, expirationDate });
    };

    const handleDelete = (docId: string) => {
        if (confirm('Are you sure you want to delete this document?')) {
            deleteMutation.mutate(docId);
        }
    };

    // Group documents by category
    const documentsByCategory = DOCUMENT_CATEGORIES.reduce((acc, cat) => {
        acc[cat.id] = (documents as WorkerDocument[]).filter(d => d.category === cat.id);
        return acc;
    }, {} as Record<string, WorkerDocument[]>);

    // Calculate compliance stats
    const requiredCategories = DOCUMENT_CATEGORIES.filter(c => c.required);
    const compliantCount = requiredCategories.filter(c => documentsByCategory[c.id]?.some(d => d.status === 'valid' || d.verified)).length;
    const expiringCount = (documents as WorkerDocument[]).filter(d => d.status === 'expiring_soon').length;
    const expiredCount = (documents as WorkerDocument[]).filter(d => d.status === 'expired').length;

    return (
        <div className="space-y-4">
            {/* Header with Stats */}
            <div className="rounded-xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 p-4">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <Certificate size={20} weight="fill" className="text-primary" />
                        <span className="text-sm font-bold text-white">Compliance Documents</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <Lock size={14} className="text-emerald-400" />
                        <span className="text-[10px] text-emerald-400 font-medium">ENCRYPTED</span>
                    </div>
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-3 gap-3">
                    <div className="text-center p-2 rounded-lg bg-white/5">
                        <p className="text-lg font-bold text-emerald-400">{compliantCount}/{requiredCategories.length}</p>
                        <p className="text-[9px] text-muted-foreground uppercase">Required</p>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-white/5">
                        <p className="text-lg font-bold text-amber-400">{expiringCount}</p>
                        <p className="text-[9px] text-muted-foreground uppercase">Expiring</p>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-white/5">
                        <p className="text-lg font-bold text-red-400">{expiredCount}</p>
                        <p className="text-[9px] text-muted-foreground uppercase">Expired</p>
                    </div>
                </div>
            </div>

            {/* Document Categories */}
            {isLoading ? (
                <div className="flex items-center justify-center py-8">
                    <CircleNotch size={24} className="animate-spin text-primary" />
                </div>
            ) : (
                <div className="space-y-3">
                    {DOCUMENT_CATEGORIES.map((category) => (
                        <DocumentUploadCard
                            key={category.id}
                            category={category}
                            documents={documentsByCategory[category.id] || []}
                            onUpload={handleUpload}
                            onDelete={handleDelete}
                            isUploading={uploadingCategory === category.id}
                        />
                    ))}
                </div>
            )}

            {/* Security Note */}
            <div className="flex items-start gap-2 p-3 rounded-lg bg-white/[0.02] border border-white/5">
                <Shield size={16} className="text-muted-foreground mt-0.5" />
                <div>
                    <p className="text-[10px] text-muted-foreground">
                        Documents are encrypted at rest and in transit. Only authorized personnel can view your compliance records.
                    </p>
                </div>
            </div>
        </div>
    );
}
