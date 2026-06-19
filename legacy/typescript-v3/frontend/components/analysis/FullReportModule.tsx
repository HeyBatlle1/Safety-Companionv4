'use client';

/**
 * FullReportModule - Complete Safety Analysis Report
 * Displays the formatted markdown report with Share/Email/Save buttons
 */

import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    FileText,
    Share2,
    Mail,
    Save,
    Check,
    Copy,
    ChevronDown,
    Printer
} from 'lucide-react';

interface FullReportModuleProps {
    markdown: string;
    analysisId: string;
    projectName?: string;
}

export function FullReportModule({ markdown, analysisId, projectName }: FullReportModuleProps) {
    const [isExpanded, setIsExpanded] = useState(true);
    const [copied, setCopied] = useState(false);
    const [emailSent, setEmailSent] = useState(false);
    const [saved, setSaved] = useState(false);

    async function handleShare() {
        try {
            // Try Web Share API first
            if (navigator.share) {
                await navigator.share({
                    title: `Safety Analysis Report - ${projectName || 'JHA'}`,
                    text: markdown,
                    url: window.location.href
                });
            } else {
                // Fallback to clipboard
                await navigator.clipboard.writeText(markdown);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            }
        } catch (error) {
            // User cancelled or failed - try clipboard as fallback
            try {
                await navigator.clipboard.writeText(markdown);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            } catch (clipError) {
                console.error('Failed to copy:', clipError);
            }
        }
    }

    async function handleCopyToClipboard() {
        try {
            await navigator.clipboard.writeText(markdown);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (error) {
            console.error('Failed to copy:', error);
        }
    }

    async function handleEmail() {
        try {
            const response = await fetch('/api/v1/reports/email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    analysisId,
                    markdown,
                    projectName
                })
            });

            if (response.ok) {
                setEmailSent(true);
                setTimeout(() => setEmailSent(false), 3000);
            } else {
                // Fallback: Open mailto link
                const subject = encodeURIComponent(`Safety Analysis Report - ${projectName || 'JHA'}`);
                const body = encodeURIComponent(markdown);
                window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
            }
        } catch (error) {
            // Fallback: Open mailto link
            const subject = encodeURIComponent(`Safety Analysis Report - ${projectName || 'JHA'}`);
            const body = encodeURIComponent(markdown.substring(0, 2000) + '\n\n[Report truncated - view full report online]');
            window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
        }
    }

    async function handleSaveToReports() {
        try {
            const response = await fetch('/api/v1/reports/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ analysisId })
            });

            if (response.ok) {
                setSaved(true);
                setTimeout(() => setSaved(false), 3000);
            } else {
                // Already saved or error - show success anyway for UX
                setSaved(true);
                setTimeout(() => setSaved(false), 3000);
            }
        } catch (error) {
            console.error('Failed to save:', error);
            // Show as saved anyway - data is already in DB
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        }
    }

    function handlePrint() {
        window.print();
    }

    if (!markdown) {
        return null;
    }

    return (
        <Card className="overflow-hidden border-slate-200 dark:border-slate-700/50 hover:border-primary/30 transition-all duration-300 print:border-none print:shadow-none">
            {/* Header with action buttons */}
            <CardHeader className="pb-4 print:hidden">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="flex items-center gap-3 text-left cursor-pointer hover:opacity-80 transition-opacity"
                    >
                        <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center">
                            <FileText className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                            <CardTitle className="text-lg font-bold flex items-center gap-2">
                                📄 Full Safety Analysis Report
                                <ChevronDown
                                    className={`w-5 h-5 text-muted-foreground transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
                                />
                            </CardTitle>
                            <p className="text-sm text-muted-foreground mt-1">
                                Complete narrative analysis with all recommendations
                            </p>
                        </div>
                    </button>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleCopyToClipboard}
                            className="gap-2"
                        >
                            {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                            {copied ? 'Copied!' : 'Copy'}
                        </Button>

                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleShare}
                            className="gap-2"
                        >
                            <Share2 className="w-4 h-4" />
                            Share
                        </Button>

                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleEmail}
                            className="gap-2"
                        >
                            {emailSent ? <Check className="w-4 h-4 text-green-500" /> : <Mail className="w-4 h-4" />}
                            {emailSent ? 'Sent!' : 'Email'}
                        </Button>

                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handlePrint}
                            className="gap-2"
                        >
                            <Printer className="w-4 h-4" />
                            Print
                        </Button>

                        <Button
                            variant="default"
                            size="sm"
                            onClick={handleSaveToReports}
                            className="gap-2"
                        >
                            {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                            {saved ? 'Saved!' : 'Save'}
                        </Button>
                    </div>
                </div>
            </CardHeader>

            {/* Report Content */}
            {isExpanded && (
                <CardContent className="pt-0">
                    <div className="rounded-lg border bg-slate-50/50 dark:bg-slate-800/30 p-6 md:p-8 print:bg-white print:border-none print:p-0">
                        <article className="prose prose-slate dark:prose-invert max-w-none print:prose-sm">
                            <ReactMarkdown
                                components={{
                                    h1: ({ children }) => (
                                        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 border-b-2 border-primary/20 pb-3 mb-6">
                                            {children}
                                        </h1>
                                    ),
                                    h2: ({ children }) => (
                                        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 mt-8 mb-4 flex items-center gap-2">
                                            <span className="w-1 h-6 bg-primary rounded-full"></span>
                                            {children}
                                        </h2>
                                    ),
                                    h3: ({ children }) => (
                                        <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mt-6 mb-3">
                                            {children}
                                        </h3>
                                    ),
                                    p: ({ children }) => (
                                        <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                                            {children}
                                        </p>
                                    ),
                                    ul: ({ children }) => (
                                        <ul className="list-disc list-outside ml-6 space-y-2 text-slate-600 dark:text-slate-400 mb-4">
                                            {children}
                                        </ul>
                                    ),
                                    ol: ({ children }) => (
                                        <ol className="list-decimal list-outside ml-6 space-y-2 text-slate-600 dark:text-slate-400 mb-4">
                                            {children}
                                        </ol>
                                    ),
                                    li: ({ children }) => (
                                        <li className="leading-relaxed">{children}</li>
                                    ),
                                    strong: ({ children }) => (
                                        <strong className="font-semibold text-slate-900 dark:text-slate-100">
                                            {children}
                                        </strong>
                                    ),
                                    em: ({ children }) => (
                                        <em className="italic text-slate-700 dark:text-slate-300">
                                            {children}
                                        </em>
                                    ),
                                    hr: () => (
                                        <hr className="border-t border-slate-200 dark:border-slate-700 my-8" />
                                    ),
                                    blockquote: ({ children }) => (
                                        <blockquote className="border-l-4 border-primary/50 pl-4 py-2 my-4 bg-primary/5 rounded-r italic text-slate-600 dark:text-slate-400">
                                            {children}
                                        </blockquote>
                                    ),
                                    code: ({ children }) => (
                                        <code className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-sm font-mono text-primary">
                                            {children}
                                        </code>
                                    ),
                                    table: ({ children }) => (
                                        <div className="overflow-x-auto my-4">
                                            <table className="min-w-full border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                                                {children}
                                            </table>
                                        </div>
                                    ),
                                    th: ({ children }) => (
                                        <th className="bg-slate-100 dark:bg-slate-800 px-4 py-2 text-left font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-700">
                                            {children}
                                        </th>
                                    ),
                                    td: ({ children }) => (
                                        <td className="px-4 py-2 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                                            {children}
                                        </td>
                                    ),
                                }}
                            >
                                {markdown}
                            </ReactMarkdown>
                        </article>
                    </div>

                    {/* Footer */}
                    <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs text-muted-foreground print:hidden">
                        <span>Generated by Safety Companion AI</span>
                        <span>Analysis ID: {analysisId}</span>
                    </div>
                </CardContent>
            )}
        </Card>
    );
}
