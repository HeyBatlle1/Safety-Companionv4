'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    FileText,
    ArrowLeft,
    Download,
    Mail,
    Eye,
    Calendar,
    AlertTriangle,
    CheckCircle,
    XCircle,
    ChevronDown,
    Loader2,
    RefreshCw,
    Bookmark
} from "lucide-react";
import Link from "next/link";
import { useSavedReports } from "@/hooks/use-api";
import { format } from "date-fns";
import ReactMarkdown from "react-markdown";

export default function ReportsPage() {
    const { data, isLoading, isError, refetch } = useSavedReports(50);
    const [expandedReport, setExpandedReport] = useState<string | null>(null);

    const reports = data?.reports || [];

    const getDecisionColor = (decision: string) => {
        switch (decision) {
            case 'GO': return 'bg-green-500/10 text-green-600 border-green-500/30';
            case 'NO_GO': return 'bg-red-500/10 text-red-600 border-red-500/30';
            case 'GO_WITH_CONDITIONS': return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30';
            default: return 'bg-slate-500/10 text-slate-600 border-slate-500/30';
        }
    };

    const getDecisionIcon = (decision: string) => {
        switch (decision) {
            case 'GO': return <CheckCircle className="h-4 w-4" />;
            case 'NO_GO': return <XCircle className="h-4 w-4" />;
            case 'GO_WITH_CONDITIONS': return <AlertTriangle className="h-4 w-4" />;
            default: return <FileText className="h-4 w-4" />;
        }
    };

    const toggleReport = (reportId: string) => {
        setExpandedReport(expandedReport === reportId ? null : reportId);
    };

    const handleDownload = (report: any) => {
        const markdown = report.markdown_report;
        if (!markdown) return;

        const blob = new Blob([markdown], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `jha_report_${report.project_name?.replace(/\s+/g, '_') || 'report'}_${report.id.slice(0, 8)}.md`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleEmail = (report: any) => {
        const subject = encodeURIComponent(`Safety Analysis Report - ${report.project_name}`);
        const markdown = report.markdown_report || `Safety Report for ${report.project_name}\n\nView full report online.`;
        const body = encodeURIComponent(markdown.substring(0, 2000) + '\n\n[Full report available in Safety Companion]');
        window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/">
                        <Button variant="ghost" size="icon" className="touch-target">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-high-contrast flex items-center gap-2">
                            <Bookmark className="h-7 w-7 text-primary" />
                            Saved Reports
                        </h1>
                        <p className="text-muted-foreground mt-1">
                            Your saved JHA analysis reports
                        </p>
                    </div>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => refetch()}
                    className="gap-2"
                >
                    <RefreshCw className="h-4 w-4" />
                    Refresh
                </Button>
            </div>

            {/* Loading State */}
            {isLoading && (
                <div className="flex items-center justify-center py-12">
                    <div className="flex flex-col items-center gap-4">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <p className="text-muted-foreground">Loading saved reports...</p>
                    </div>
                </div>
            )}

            {/* Error State */}
            {isError && (
                <Card className="border-red-500/30 bg-red-500/5">
                    <CardContent className="flex items-center gap-4 py-6">
                        <XCircle className="h-8 w-8 text-red-500" />
                        <div>
                            <h3 className="font-semibold">Failed to load saved reports</h3>
                            <p className="text-sm text-muted-foreground">Please try refreshing the page</p>
                        </div>
                        <Button variant="outline" onClick={() => refetch()} className="ml-auto">
                            Retry
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* Empty State */}
            {!isLoading && !isError && reports.length === 0 && (
                <Card className="card-highlight">
                    <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                            <Bookmark className="h-10 w-10 text-primary" />
                        </div>
                        <h3 className="text-xl font-semibold mb-2">No Saved Reports Yet</h3>
                        <p className="text-muted-foreground mb-6 max-w-md">
                            When you view a JHA analysis, click the <strong>"Save to Reports"</strong> button
                            to save it here for easy access later.
                        </p>
                        <div className="flex gap-3">
                            <Link href="/jha/new">
                                <Button>Create New JHA</Button>
                            </Link>
                            <Link href="/jha">
                                <Button variant="outline">View JHA History</Button>
                            </Link>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Reports List */}
            {!isLoading && reports.length > 0 && (
                <div className="space-y-4">
                    {reports.map((report: any) => (
                        <Card
                            key={report.id}
                            className={`transition-all duration-300 ${expandedReport === report.id
                                    ? 'border-primary/50 shadow-lg'
                                    : 'hover:border-primary/30'
                                }`}
                        >
                            <CardHeader className="pb-3">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-3 mb-2">
                                            <Badge
                                                variant="outline"
                                                className={getDecisionColor(report.go_no_go)}
                                            >
                                                {getDecisionIcon(report.go_no_go)}
                                                <span className="ml-1">{report.go_no_go?.replace('_', ' ') || 'PENDING'}</span>
                                            </Badge>
                                            {report.risk_score && (
                                                <Badge variant="outline" className="bg-slate-500/10">
                                                    Risk: {report.risk_score}%
                                                </Badge>
                                            )}
                                            <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">
                                                <Bookmark className="h-3 w-3 mr-1" />
                                                Saved
                                            </Badge>
                                        </div>
                                        <CardTitle className="text-lg truncate">
                                            {report.project_name || 'Untitled Analysis'}
                                        </CardTitle>
                                        <CardDescription className="flex items-center gap-4 mt-1">
                                            <span className="flex items-center gap-1">
                                                <Calendar className="h-3.5 w-3.5" />
                                                {report.created_at ? format(new Date(report.created_at), 'MMM d, yyyy h:mm a') : 'Unknown date'}
                                            </span>
                                            {report.saved_at && (
                                                <span className="text-xs text-primary">
                                                    Saved {format(new Date(report.saved_at), 'MMM d')}
                                                </span>
                                            )}
                                        </CardDescription>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => toggleReport(report.id)}
                                            className="gap-2"
                                        >
                                            <Eye className="h-4 w-4" />
                                            {expandedReport === report.id ? 'Hide' : 'View'}
                                            <ChevronDown className={`h-4 w-4 transition-transform ${expandedReport === report.id ? 'rotate-180' : ''
                                                }`} />
                                        </Button>
                                        <Link href={`/jha/${report.id}`}>
                                            <Button variant="outline" size="sm">
                                                Full Details
                                            </Button>
                                        </Link>
                                    </div>
                                </div>
                            </CardHeader>

                            {/* Expanded Report Content */}
                            {expandedReport === report.id && (
                                <CardContent className="pt-0 border-t">
                                    {/* Action Bar */}
                                    <div className="flex items-center justify-end gap-2 py-3 border-b mb-4">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleDownload(report)}
                                            disabled={!report.markdown_report}
                                            className="gap-2"
                                        >
                                            <Download className="h-4 w-4" />
                                            Download
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleEmail(report)}
                                            className="gap-2"
                                        >
                                            <Mail className="h-4 w-4" />
                                            Email
                                        </Button>
                                    </div>

                                    {/* Markdown Content */}
                                    {report.markdown_report ? (
                                        <div className="rounded-lg bg-slate-50/50 dark:bg-slate-800/30 p-6 max-h-[600px] overflow-y-auto">
                                            <article className="prose prose-slate dark:prose-invert prose-sm max-w-none">
                                                <ReactMarkdown
                                                    components={{
                                                        h1: ({ children }) => (
                                                            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 border-b pb-2 mb-4">
                                                                {children}
                                                            </h1>
                                                        ),
                                                        h2: ({ children }) => (
                                                            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200 mt-6 mb-3">
                                                                {children}
                                                            </h2>
                                                        ),
                                                        h3: ({ children }) => (
                                                            <h3 className="text-base font-semibold text-slate-700 dark:text-slate-300 mt-4 mb-2">
                                                                {children}
                                                            </h3>
                                                        ),
                                                        p: ({ children }) => (
                                                            <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-3">
                                                                {children}
                                                            </p>
                                                        ),
                                                        ul: ({ children }) => (
                                                            <ul className="list-disc list-outside ml-5 space-y-1 text-slate-600 dark:text-slate-400">
                                                                {children}
                                                            </ul>
                                                        ),
                                                        li: ({ children }) => (
                                                            <li className="leading-relaxed">{children}</li>
                                                        ),
                                                        strong: ({ children }) => (
                                                            <strong className="font-semibold text-slate-900 dark:text-slate-100">
                                                                {children}
                                                            </strong>
                                                        ),
                                                        hr: () => (
                                                            <hr className="border-t border-slate-200 dark:border-slate-700 my-4" />
                                                        ),
                                                    }}
                                                >
                                                    {report.markdown_report}
                                                </ReactMarkdown>
                                            </article>
                                        </div>
                                    ) : (
                                        <div className="text-center py-8 text-muted-foreground">
                                            <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
                                            <p>Full report not available</p>
                                            <Link href={`/jha/${report.id}`}>
                                                <Button variant="link" className="mt-2">View Analysis Details →</Button>
                                            </Link>
                                        </div>
                                    )}
                                </CardContent>
                            )}
                        </Card>
                    ))}
                </div>
            )}

            {/* Quick Stats Footer */}
            {!isLoading && reports.length > 0 && (
                <Card className="bg-slate-50/50 dark:bg-slate-800/30">
                    <CardContent className="py-4">
                        <div className="flex items-center justify-around text-center">
                            <div>
                                <p className="text-2xl font-bold text-primary">{reports.length}</p>
                                <p className="text-xs text-muted-foreground">Saved Reports</p>
                            </div>
                            <div className="h-8 w-px bg-border" />
                            <div>
                                <p className="text-2xl font-bold text-green-500">
                                    {reports.filter((r: any) => r.go_no_go === 'GO').length}
                                </p>
                                <p className="text-xs text-muted-foreground">GO Decisions</p>
                            </div>
                            <div className="h-8 w-px bg-border" />
                            <div>
                                <p className="text-2xl font-bold text-yellow-500">
                                    {reports.filter((r: any) => r.go_no_go === 'GO_WITH_CONDITIONS').length}
                                </p>
                                <p className="text-xs text-muted-foreground">Conditional</p>
                            </div>
                            <div className="h-8 w-px bg-border" />
                            <div>
                                <p className="text-2xl font-bold text-red-500">
                                    {reports.filter((r: any) => r.go_no_go === 'NO_GO').length}
                                </p>
                                <p className="text-xs text-muted-foreground">NO GO</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
