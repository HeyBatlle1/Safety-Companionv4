'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
    Bookmark,
    Trash2,
    Search,
    LayoutGrid,
    List,
    Clock,
    Shield,
    TrendingUp
} from "lucide-react";
import Link from "next/link";
import { useSavedReports, useDeleteReport } from "@/hooks/use-api";
import { format, formatDistanceToNow } from "date-fns";
import ReactMarkdown from "react-markdown";

// Decision badge configuration
const DECISION_CONFIG = {
    'GO': {
        label: 'GO',
        bgClass: 'bg-emerald-500/20',
        textClass: 'text-emerald-400',
        borderClass: 'border-emerald-500/40',
        icon: CheckCircle,
        glow: 'shadow-emerald-500/20'
    },
    'NO_GO': {
        label: 'NO GO',
        bgClass: 'bg-red-500/20',
        textClass: 'text-red-400',
        borderClass: 'border-red-500/40',
        icon: XCircle,
        glow: 'shadow-red-500/20'
    },
    'GO_WITH_CONDITIONS': {
        label: 'CONDITIONS',
        bgClass: 'bg-amber-500/20',
        textClass: 'text-amber-400',
        borderClass: 'border-amber-500/40',
        icon: AlertTriangle,
        glow: 'shadow-amber-500/20'
    },
    'PENDING': {
        label: 'PENDING',
        bgClass: 'bg-slate-500/20',
        textClass: 'text-slate-400',
        borderClass: 'border-slate-500/40',
        icon: Clock,
        glow: ''
    }
};

type DecisionType = keyof typeof DECISION_CONFIG;

export default function ReportsPage() {
    const { data, isLoading, isError, refetch } = useSavedReports(100);
    const deleteReport = useDeleteReport();

    const [expandedReport, setExpandedReport] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterDecision, setFilterDecision] = useState<string>('all');
    const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

    const reports = data?.reports || [];

    // Filter and search
    const filteredReports = useMemo(() => {
        return reports.filter((report: any) => {
            const matchesSearch = searchQuery === '' ||
                report.project_name?.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesFilter = filterDecision === 'all' ||
                report.go_no_go === filterDecision;
            return matchesSearch && matchesFilter;
        });
    }, [reports, searchQuery, filterDecision]);

    // Stats calculation
    const stats = useMemo(() => ({
        total: reports.length,
        go: reports.filter((r: any) => r.go_no_go === 'GO').length,
        noGo: reports.filter((r: any) => r.go_no_go === 'NO_GO').length,
        conditional: reports.filter((r: any) => r.go_no_go === 'GO_WITH_CONDITIONS').length,
        avgRisk: reports.length > 0
            ? Math.round(reports.reduce((sum: number, r: any) => sum + (r.risk_score || 0), 0) / reports.length)
            : 0
    }), [reports]);

    const getDecisionConfig = (decision: string) => {
        return DECISION_CONFIG[decision as DecisionType] || DECISION_CONFIG['PENDING'];
    };

    const toggleReport = (reportId: string) => {
        setExpandedReport(expandedReport === reportId ? null : reportId);
    };

    const handleDelete = async (reportId: string) => {
        try {
            await deleteReport.mutateAsync(reportId);
            setDeleteConfirm(null);
            refetch();
        } catch (error) {
            console.error('Delete failed:', error);
        }
    };

    const handleDownload = (report: any) => {
        const markdown = report.markdown_report;
        if (!markdown) return;

        const blob = new Blob([markdown], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `JHA_${report.project_name?.replace(/\s+/g, '_') || 'Report'}_${format(new Date(report.created_at), 'yyyy-MM-dd')}.md`;
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
        <div className="space-y-6 pb-20">
            {/* Enterprise Header */}
            <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-slate-800 via-slate-700 to-slate-800 p-6 border border-slate-600">
                {/* Background pattern */}
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute inset-0" style={{
                        backgroundImage: `radial-gradient(circle at 25% 25%, rgba(255,255,255,0.1) 0%, transparent 50%), 
                                          radial-gradient(circle at 75% 75%, rgba(255,255,255,0.05) 0%, transparent 50%)`
                    }} />
                </div>

                <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <Link href="/">
                            <Button variant="ghost" size="icon" className="text-slate-300 hover:text-white hover:bg-slate-600/50">
                                <ArrowLeft className="h-5 w-5" />
                            </Button>
                        </Link>
                        <div>
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-gradient-to-br from-teal-500 to-emerald-600 shadow-lg shadow-teal-500/25">
                                    <Bookmark className="h-6 w-6 text-white" />
                                </div>
                                <div>
                                    <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
                                        Report History
                                    </h1>
                                    <p className="text-slate-300 text-sm">
                                        {stats.total} saved reports • Enterprise Safety Management
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => refetch()}
                            className="bg-slate-700/50 border-slate-500 text-white hover:bg-slate-600/50 hover:text-white"
                        >
                            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                            Refresh
                        </Button>
                    </div>
                </div>

                {/* Quick Stats Bar */}
                <div className="relative mt-6 grid grid-cols-2 md:grid-cols-5 gap-3">
                    <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-600/50">
                        <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-teal-400" />
                            <span className="text-slate-400 text-xs uppercase tracking-wide">Total</span>
                        </div>
                        <p className="text-2xl font-bold text-white mt-1">{stats.total}</p>
                    </div>
                    <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-600/50">
                        <div className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-emerald-400" />
                            <span className="text-slate-400 text-xs uppercase tracking-wide">GO</span>
                        </div>
                        <p className="text-2xl font-bold text-emerald-400 mt-1">{stats.go}</p>
                    </div>
                    <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-600/50">
                        <div className="flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-amber-400" />
                            <span className="text-slate-400 text-xs uppercase tracking-wide">Conditional</span>
                        </div>
                        <p className="text-2xl font-bold text-amber-400 mt-1">{stats.conditional}</p>
                    </div>
                    <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-600/50">
                        <div className="flex items-center gap-2">
                            <XCircle className="h-4 w-4 text-red-400" />
                            <span className="text-slate-400 text-xs uppercase tracking-wide">NO GO</span>
                        </div>
                        <p className="text-2xl font-bold text-red-400 mt-1">{stats.noGo}</p>
                    </div>
                    <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-600/50">
                        <div className="flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-sky-400" />
                            <span className="text-slate-400 text-xs uppercase tracking-wide">Avg Risk</span>
                        </div>
                        <p className="text-2xl font-bold text-sky-400 mt-1">{stats.avgRisk}%</p>
                    </div>
                </div>
            </div>

            {/* Search and Filter Bar */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                        placeholder="Search reports by project name..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-500"
                    />
                </div>
                <div className="flex gap-2">
                    <select
                        value={filterDecision}
                        onChange={(e) => setFilterDecision(e.target.value)}
                        className="px-3 py-2 rounded-md bg-slate-800/50 border border-slate-600 text-white text-sm"
                    >
                        <option value="all">All Decisions</option>
                        <option value="GO">GO</option>
                        <option value="GO_WITH_CONDITIONS">Conditional</option>
                        <option value="NO_GO">NO GO</option>
                    </select>
                    <div className="flex rounded-md border border-slate-600 overflow-hidden">
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-2 ${viewMode === 'list' ? 'bg-teal-600 text-white' : 'bg-slate-800/50 text-slate-400'}`}
                        >
                            <List className="h-4 w-4" />
                        </button>
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-2 ${viewMode === 'grid' ? 'bg-teal-600 text-white' : 'bg-slate-800/50 text-slate-400'}`}
                        >
                            <LayoutGrid className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Loading State */}
            {isLoading && (
                <div className="flex items-center justify-center py-16">
                    <div className="flex flex-col items-center gap-4">
                        <div className="relative">
                            <div className="w-16 h-16 border-4 border-slate-600 rounded-full" />
                            <div className="absolute top-0 left-0 w-16 h-16 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
                        </div>
                        <p className="text-slate-400">Loading report history...</p>
                    </div>
                </div>
            )}

            {/* Error State */}
            {isError && (
                <Card className="border-red-500/30 bg-red-500/5">
                    <CardContent className="flex items-center gap-4 py-6">
                        <div className="p-3 rounded-full bg-red-500/20">
                            <XCircle className="h-6 w-6 text-red-400" />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-semibold text-white">Failed to load reports</h3>
                            <p className="text-sm text-slate-400">Please check your connection and try again</p>
                        </div>
                        <Button variant="outline" onClick={() => refetch()} className="border-red-500/30 text-red-400 hover:bg-red-500/10">
                            Retry
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* Empty State */}
            {!isLoading && !isError && filteredReports.length === 0 && (
                <Card className="border-slate-600 bg-slate-800/30">
                    <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-teal-500/20 to-emerald-500/20 flex items-center justify-center mb-6 border border-teal-500/30">
                            <Bookmark className="h-10 w-10 text-teal-400" />
                        </div>
                        {reports.length === 0 ? (
                            <>
                                <h3 className="text-xl font-semibold mb-2 text-white">No Saved Reports Yet</h3>
                                <p className="text-slate-400 mb-6 max-w-md">
                                    When you complete a JHA analysis, click <strong className="text-teal-400">"Save to Reports"</strong> to store it here for future reference.
                                </p>
                                <div className="flex gap-3">
                                    <Link href="/jha/new">
                                        <Button className="bg-teal-600 hover:bg-teal-700">Create New JHA</Button>
                                    </Link>
                                    <Link href="/">
                                        <Button variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700">
                                            Back to Dashboard
                                        </Button>
                                    </Link>
                                </div>
                            </>
                        ) : (
                            <>
                                <h3 className="text-xl font-semibold mb-2 text-white">No Matching Reports</h3>
                                <p className="text-slate-400 mb-6">
                                    Try adjusting your search or filter criteria
                                </p>
                                <Button variant="outline" onClick={() => { setSearchQuery(''); setFilterDecision('all'); }}>
                                    Clear Filters
                                </Button>
                            </>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Reports List */}
            {!isLoading && filteredReports.length > 0 && (
                <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 gap-4' : 'space-y-4'}>
                    {filteredReports.map((report: any) => {
                        const config = getDecisionConfig(report.go_no_go);
                        const Icon = config.icon;
                        const isExpanded = expandedReport === report.id;
                        const isDeleting = deleteConfirm === report.id;

                        return (
                            <Card
                                key={report.id}
                                className={`transition-all duration-300 border-slate-600 bg-slate-800/40 overflow-hidden ${isExpanded ? 'ring-2 ring-teal-500/50' : 'hover:border-slate-500'
                                    }`}
                            >
                                {/* Header with gradient accent */}
                                <div className={`h-1 ${config.bgClass}`} />

                                <CardHeader className="pb-3">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1 min-w-0">
                                            {/* Decision Badge Row */}
                                            <div className="flex flex-wrap items-center gap-2 mb-3">
                                                <Badge
                                                    className={`${config.bgClass} ${config.textClass} ${config.borderClass} border font-semibold px-3 py-1`}
                                                >
                                                    <Icon className="h-3.5 w-3.5 mr-1.5" />
                                                    {config.label}
                                                </Badge>
                                                {report.risk_score !== null && report.risk_score !== undefined && (
                                                    <Badge className="bg-sky-500/20 text-sky-400 border border-sky-500/40">
                                                        <Shield className="h-3 w-3 mr-1" />
                                                        Risk: {report.risk_score}%
                                                    </Badge>
                                                )}
                                            </div>

                                            {/* Project Name */}
                                            <CardTitle className="text-lg text-white truncate">
                                                {report.project_name || 'Untitled Analysis'}
                                            </CardTitle>

                                            {/* Metadata */}
                                            <CardDescription className="flex flex-wrap items-center gap-3 mt-2 text-slate-400">
                                                <span className="flex items-center gap-1.5">
                                                    <Calendar className="h-3.5 w-3.5" />
                                                    {report.created_at
                                                        ? format(new Date(report.created_at), 'MMM d, yyyy')
                                                        : 'Unknown date'}
                                                </span>
                                                <span className="flex items-center gap-1.5">
                                                    <Clock className="h-3.5 w-3.5" />
                                                    {report.created_at
                                                        ? formatDistanceToNow(new Date(report.created_at), { addSuffix: true })
                                                        : ''}
                                                </span>
                                            </CardDescription>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-center gap-1">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => toggleReport(report.id)}
                                                className="text-slate-300 hover:text-white hover:bg-slate-700"
                                            >
                                                <Eye className="h-4 w-4 mr-1" />
                                                {isExpanded ? 'Hide' : 'View'}
                                                <ChevronDown className={`h-4 w-4 ml-1 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                            </Button>
                                            <Link href={`/jha/${report.id}`}>
                                                <Button variant="outline" size="sm" className="border-slate-600 text-slate-300 hover:bg-slate-700">
                                                    Details
                                                </Button>
                                            </Link>

                                            {/* Delete Button */}
                                            {isDeleting ? (
                                                <div className="flex items-center gap-1 bg-red-500/10 px-2 py-1 rounded-md">
                                                    <span className="text-xs text-red-400">Delete?</span>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleDelete(report.id)}
                                                        disabled={deleteReport.isPending}
                                                        className="h-6 px-2 text-red-400 hover:text-red-300 hover:bg-red-500/20"
                                                    >
                                                        {deleteReport.isPending ? (
                                                            <Loader2 className="h-3 w-3 animate-spin" />
                                                        ) : (
                                                            'Yes'
                                                        )}
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => setDeleteConfirm(null)}
                                                        className="h-6 px-2 text-slate-400 hover:text-slate-300 hover:bg-slate-700"
                                                    >
                                                        No
                                                    </Button>
                                                </div>
                                            ) : (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => setDeleteConfirm(report.id)}
                                                    className="text-slate-400 hover:text-red-400 hover:bg-red-500/10"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </CardHeader>

                                {/* Expanded Report Content */}
                                {isExpanded && (
                                    <CardContent className="pt-0 border-t border-slate-600/50">
                                        {/* Action Bar */}
                                        <div className="flex items-center justify-end gap-2 py-3 border-b border-slate-600/50 mb-4">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleDownload(report)}
                                                disabled={!report.markdown_report}
                                                className="border-slate-600 text-slate-300 hover:bg-slate-700"
                                            >
                                                <Download className="h-4 w-4 mr-2" />
                                                Download
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleEmail(report)}
                                                className="border-slate-600 text-slate-300 hover:bg-slate-700"
                                            >
                                                <Mail className="h-4 w-4 mr-2" />
                                                Email
                                            </Button>
                                        </div>

                                        {/* Markdown Content */}
                                        {report.markdown_report ? (
                                            <div className="rounded-lg bg-slate-900/50 p-6 max-h-[500px] overflow-y-auto border border-slate-700">
                                                <article className="prose prose-invert prose-sm max-w-none">
                                                    <ReactMarkdown
                                                        components={{
                                                            h1: ({ children }) => (
                                                                <h1 className="text-xl font-bold text-white border-b border-slate-700 pb-2 mb-4">
                                                                    {children}
                                                                </h1>
                                                            ),
                                                            h2: ({ children }) => (
                                                                <h2 className="text-lg font-bold text-teal-400 mt-6 mb-3">
                                                                    {children}
                                                                </h2>
                                                            ),
                                                            h3: ({ children }) => (
                                                                <h3 className="text-base font-semibold text-slate-200 mt-4 mb-2">
                                                                    {children}
                                                                </h3>
                                                            ),
                                                            p: ({ children }) => (
                                                                <p className="text-slate-300 leading-relaxed mb-3">
                                                                    {children}
                                                                </p>
                                                            ),
                                                            ul: ({ children }) => (
                                                                <ul className="list-disc list-outside ml-5 space-y-1 text-slate-300">
                                                                    {children}
                                                                </ul>
                                                            ),
                                                            li: ({ children }) => (
                                                                <li className="leading-relaxed">{children}</li>
                                                            ),
                                                            strong: ({ children }) => (
                                                                <strong className="font-semibold text-white">
                                                                    {children}
                                                                </strong>
                                                            ),
                                                            hr: () => (
                                                                <hr className="border-t border-slate-700 my-4" />
                                                            ),
                                                        }}
                                                    >
                                                        {report.markdown_report}
                                                    </ReactMarkdown>
                                                </article>
                                            </div>
                                        ) : (
                                            <div className="text-center py-10 text-slate-400">
                                                <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
                                                <p>Full report not available</p>
                                                <Link href={`/jha/${report.id}`}>
                                                    <Button variant="link" className="mt-2 text-teal-400">
                                                        View Analysis Details →
                                                    </Button>
                                                </Link>
                                            </div>
                                        )}
                                    </CardContent>
                                )}
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* Results count */}
            {!isLoading && filteredReports.length > 0 && (
                <p className="text-center text-sm text-slate-500">
                    Showing {filteredReports.length} of {reports.length} reports
                </p>
            )}
        </div>
    );
}
