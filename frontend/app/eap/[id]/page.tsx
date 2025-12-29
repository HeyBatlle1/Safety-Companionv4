'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    ArrowLeft,
    Download,
    Mail,
    CheckCircle,
    XCircle,
    AlertTriangle,
    Shield,
    Users,
    MapPin,
    Phone,
    Clock,
    FileText,
    ChevronDown,
    ChevronUp,
    Printer,
    Building2,
    Flag,
    Loader2
} from "lucide-react";
import Link from "next/link";

interface GeneratedEAP {
    id: string;
    questionnaire_id: string;
    eap_document: {
        title: string;
        version: string;
        effective_date: string;
        site_info: {
            company: string;
            address: string;
            city: string;
            state: string;
            zip: string;
            site_type: string;
            total_employees: number;
        };
        sections: Array<{
            number: number;
            title: string;
            content: any;
            procedures?: Array<{
                emergency_type: string;
                title: string;
                priority: string;
                steps: Array<{
                    step_number: number;
                    action: string;
                    responsible_party: string;
                    time_frame: string;
                }>;
                equipment_needed: string[];
                training_required: string[];
                special_considerations: string[];
            }>;
        }>;
        compliance: {
            is_compliant: boolean;
            completeness_score: number;
            requirements_met: string[];
            requirements_missing: string[];
            osha_standard: string;
        };
    };
    osha_compliant: boolean;
    completeness: number;
    procedure_count: number;
    generation_time_ms: number;
    created_at: string;
}

export default function EAPResultsPage() {
    const params = useParams();
    const router = useRouter();
    const eapId = params.id as string;

    const [eap, setEap] = useState<GeneratedEAP | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [expandedSections, setExpandedSections] = useState<Set<number>>(new Set([1, 2, 5]));
    const [expandedProcedures, setExpandedProcedures] = useState<Set<string>>(new Set());

    useEffect(() => {
        const fetchEAP = async () => {
            try {
                const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
                const response = await fetch(`${apiUrl}/api/v1/eap/${eapId}`);

                if (!response.ok) {
                    throw new Error('Failed to load EAP');
                }

                const data = await response.json();
                setEap(data);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };

        if (eapId) {
            fetchEAP();
        }
    }, [eapId]);

    const toggleSection = (sectionNum: number) => {
        setExpandedSections(prev => {
            const next = new Set(prev);
            if (next.has(sectionNum)) {
                next.delete(sectionNum);
            } else {
                next.add(sectionNum);
            }
            return next;
        });
    };

    const toggleProcedure = (procedureType: string) => {
        setExpandedProcedures(prev => {
            const next = new Set(prev);
            if (next.has(procedureType)) {
                next.delete(procedureType);
            } else {
                next.add(procedureType);
            }
            return next;
        });
    };

    const handleDownload = () => {
        if (!eap) return;

        // Generate markdown content
        const doc = eap.eap_document;
        let markdown = `# ${doc.title}\n\n`;
        markdown += `**Version:** ${doc.version}\n`;
        markdown += `**Effective Date:** ${doc.effective_date}\n`;
        markdown += `**Site:** ${doc.site_info.address}, ${doc.site_info.city}, ${doc.site_info.state}\n\n`;
        markdown += `---\n\n`;

        for (const section of doc.sections) {
            markdown += `## Section ${section.number}: ${section.title}\n\n`;

            if (section.procedures) {
                for (const proc of section.procedures) {
                    markdown += `### ${proc.title}\n\n`;
                    markdown += `**Priority:** ${proc.priority.toUpperCase()}\n\n`;
                    markdown += `**Steps:**\n`;
                    for (const step of proc.steps) {
                        markdown += `${step.step_number}. **${step.action}**\n`;
                        markdown += `   - Responsible: ${step.responsible_party}\n`;
                        markdown += `   - Time Frame: ${step.time_frame}\n\n`;
                    }
                    markdown += `**Equipment Needed:** ${proc.equipment_needed.join(', ')}\n\n`;
                    markdown += `**Training Required:** ${proc.training_required.join(', ')}\n\n`;
                }
            } else if (typeof section.content === 'string') {
                markdown += `${section.content}\n\n`;
            } else if (typeof section.content === 'object') {
                markdown += `${JSON.stringify(section.content, null, 2)}\n\n`;
            }
        }

        const blob = new Blob([markdown], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `EAP_${doc.site_info.company?.replace(/\s+/g, '_') || 'Document'}_${doc.effective_date}.md`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handlePrint = () => {
        window.print();
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="flex flex-col items-center gap-4">
                    <div className="relative">
                        <div className="w-20 h-20 border-4 border-slate-600 rounded-full" />
                        <div className="absolute top-0 left-0 w-20 h-20 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                    <div className="text-center">
                        <p className="text-lg font-semibold text-white">Loading Emergency Action Plan</p>
                        <p className="text-sm text-slate-400">Please wait...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (error || !eap) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Card className="border-red-500/30 bg-red-500/5 max-w-md">
                    <CardContent className="flex flex-col items-center py-8 text-center">
                        <XCircle className="h-12 w-12 text-red-400 mb-4" />
                        <h3 className="text-lg font-semibold text-white mb-2">Failed to Load EAP</h3>
                        <p className="text-slate-400 mb-4">{error || 'EAP not found'}</p>
                        <Link href="/eap">
                            <Button>Generate New EAP</Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const doc = eap.eap_document;
    const compliance = doc.compliance;

    return (
        <div className="space-y-6 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Link href="/eap">
                        <Button variant="ghost" size="icon" className="text-slate-300 hover:text-white">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold text-white">
                            {doc.title}
                        </h1>
                        <p className="text-slate-400 text-sm flex items-center gap-2">
                            <Clock className="h-3.5 w-3.5" />
                            Generated in {(eap.generation_time_ms / 1000).toFixed(1)}s
                            <span className="text-slate-600">•</span>
                            Version {doc.version}
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={handlePrint} className="border-slate-600 text-slate-300">
                        <Printer className="h-4 w-4 mr-2" />
                        Print
                    </Button>
                    <Button variant="outline" onClick={handleDownload} className="border-slate-600 text-slate-300">
                        <Download className="h-4 w-4 mr-2" />
                        Download
                    </Button>
                </div>
            </div>

            {/* Compliance Banner */}
            <div className={`rounded-xl p-6 border ${compliance.is_compliant
                    ? 'bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border-emerald-500/30'
                    : 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 border-amber-500/30'
                }`}>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className={`w-14 h-14 rounded-full flex items-center justify-center ${compliance.is_compliant ? 'bg-emerald-500' : 'bg-amber-500'
                            }`}>
                            {compliance.is_compliant
                                ? <CheckCircle className="h-7 w-7 text-white" />
                                : <AlertTriangle className="h-7 w-7 text-white" />
                            }
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">
                                {compliance.is_compliant ? 'OSHA Compliant' : 'Review Required'}
                            </h2>
                            <p className="text-slate-300 text-sm">
                                {compliance.osha_standard} • {compliance.completeness_score}% Complete
                            </p>
                        </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                            <p className="text-2xl font-bold text-emerald-400">{compliance.requirements_met.length}</p>
                            <p className="text-xs text-slate-400">Requirements Met</p>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-amber-400">{compliance.requirements_missing.length}</p>
                            <p className="text-xs text-slate-400">Missing</p>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-teal-400">{eap.procedure_count}</p>
                            <p className="text-xs text-slate-400">Procedures</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Site Info Card */}
            <Card className="border-slate-600 bg-slate-800/40">
                <CardHeader className="pb-3">
                    <CardTitle className="text-white flex items-center gap-2">
                        <Building2 className="h-5 w-5 text-teal-400" />
                        Site Information
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                            <p className="text-xs text-slate-400 uppercase">Company</p>
                            <p className="text-white font-medium">{doc.site_info.company}</p>
                        </div>
                        <div>
                            <p className="text-xs text-slate-400 uppercase">Location</p>
                            <p className="text-white font-medium">{doc.site_info.city}, {doc.site_info.state}</p>
                        </div>
                        <div>
                            <p className="text-xs text-slate-400 uppercase">Site Type</p>
                            <p className="text-white font-medium capitalize">{doc.site_info.site_type?.replace('_', ' ')}</p>
                        </div>
                        <div>
                            <p className="text-xs text-slate-400 uppercase">Employees</p>
                            <p className="text-white font-medium">{doc.site_info.total_employees}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Document Sections */}
            <div className="space-y-4">
                {doc.sections.map((section) => (
                    <Card key={section.number} className="border-slate-600 bg-slate-800/40 overflow-hidden">
                        <button
                            onClick={() => toggleSection(section.number)}
                            className="w-full p-4 flex items-center justify-between hover:bg-slate-700/30 transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                <Badge className="bg-teal-500/20 text-teal-400 border-teal-500/40">
                                    Section {section.number}
                                </Badge>
                                <span className="text-white font-semibold">{section.title}</span>
                            </div>
                            {expandedSections.has(section.number)
                                ? <ChevronUp className="h-5 w-5 text-slate-400" />
                                : <ChevronDown className="h-5 w-5 text-slate-400" />
                            }
                        </button>

                        {expandedSections.has(section.number) && (
                            <CardContent className="border-t border-slate-700 pt-4">
                                {/* Procedures Section */}
                                {section.procedures ? (
                                    <div className="space-y-3">
                                        {section.procedures.map((proc) => (
                                            <div
                                                key={proc.emergency_type}
                                                className={`rounded-lg border overflow-hidden ${proc.priority === 'high'
                                                        ? 'border-red-500/30 bg-red-500/5'
                                                        : 'border-slate-600 bg-slate-900/30'
                                                    }`}
                                            >
                                                <button
                                                    onClick={() => toggleProcedure(proc.emergency_type)}
                                                    className="w-full p-3 flex items-center justify-between hover:bg-slate-700/20"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <Badge className={`${proc.priority === 'high'
                                                                ? 'bg-red-500/20 text-red-400 border-red-500/40'
                                                                : proc.priority === 'medium'
                                                                    ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                                                                    : 'bg-slate-500/20 text-slate-400 border-slate-500/40'
                                                            }`}>
                                                            {proc.priority.toUpperCase()}
                                                        </Badge>
                                                        <span className="text-white font-medium">{proc.title}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm text-slate-400">{proc.steps.length} steps</span>
                                                        {expandedProcedures.has(proc.emergency_type)
                                                            ? <ChevronUp className="h-4 w-4 text-slate-400" />
                                                            : <ChevronDown className="h-4 w-4 text-slate-400" />
                                                        }
                                                    </div>
                                                </button>

                                                {expandedProcedures.has(proc.emergency_type) && (
                                                    <div className="p-4 border-t border-slate-700/50">
                                                        <div className="space-y-3">
                                                            {proc.steps.map((step) => (
                                                                <div key={step.step_number} className="flex gap-3">
                                                                    <div className="w-8 h-8 rounded-full bg-teal-500/20 text-teal-400 flex items-center justify-center flex-shrink-0 font-bold text-sm">
                                                                        {step.step_number}
                                                                    </div>
                                                                    <div className="flex-1">
                                                                        <p className="text-white">{step.action}</p>
                                                                        <div className="flex gap-4 mt-1 text-xs text-slate-400">
                                                                            <span>👤 {step.responsible_party}</span>
                                                                            <span>⏱️ {step.time_frame}</span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>

                                                        <div className="mt-4 pt-4 border-t border-slate-700/50 grid grid-cols-1 md:grid-cols-2 gap-4">
                                                            <div>
                                                                <p className="text-xs text-slate-400 uppercase mb-2">Equipment Needed</p>
                                                                <div className="flex flex-wrap gap-1">
                                                                    {proc.equipment_needed.map((eq, idx) => (
                                                                        <Badge key={idx} variant="outline" className="text-xs">
                                                                            {eq}
                                                                        </Badge>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                            <div>
                                                                <p className="text-xs text-slate-400 uppercase mb-2">Training Required</p>
                                                                <div className="flex flex-wrap gap-1">
                                                                    {proc.training_required.map((tr, idx) => (
                                                                        <Badge key={idx} variant="outline" className="text-xs bg-teal-500/10 text-teal-400 border-teal-500/30">
                                                                            {tr}
                                                                        </Badge>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                ) : typeof section.content === 'string' ? (
                                    <p className="text-slate-300 whitespace-pre-line">{section.content}</p>
                                ) : typeof section.content === 'object' ? (
                                    <div className="space-y-3">
                                        {Object.entries(section.content).map(([key, value]) => (
                                            <div key={key}>
                                                <p className="text-xs text-slate-400 uppercase mb-1">
                                                    {key.replace(/_/g, ' ')}
                                                </p>
                                                {typeof value === 'object' && value !== null ? (
                                                    <div className="bg-slate-900/50 p-3 rounded-lg">
                                                        {Object.entries(value as object).map(([k, v]) => (
                                                            <div key={k} className="flex justify-between text-sm">
                                                                <span className="text-slate-400 capitalize">{k.replace(/_/g, ' ')}:</span>
                                                                <span className="text-white">{String(v)}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <p className="text-white">{String(value)}</p>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                ) : null}
                            </CardContent>
                        )}
                    </Card>
                ))}
            </div>

            {/* Footer Actions */}
            <div className="flex justify-center gap-4 pt-8">
                <Link href="/eap">
                    <Button variant="outline" className="border-slate-600 text-slate-300">
                        Create Another EAP
                    </Button>
                </Link>
                <Button onClick={handleDownload} className="bg-teal-600 hover:bg-teal-700">
                    <Download className="h-4 w-4 mr-2" />
                    Download Full Document
                </Button>
            </div>
        </div>
    );
}
