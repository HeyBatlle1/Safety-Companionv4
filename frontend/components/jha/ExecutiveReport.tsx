'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Share2, Printer } from 'lucide-react';

interface ExecutiveReportProps {
    markdown: string;
    metadata?: {
        projectName?: string;
        location?: string;
        workType?: string;
        timestamp?: string;
    };
}

export function ExecutiveReport({ markdown, metadata }: ExecutiveReportProps) {
    const handlePrint = () => {
        window.print();
    };

    const handleDownload = () => {
        const blob = new Blob([markdown], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `JHA-Executive-Report-${metadata?.projectName || 'Report'}-${new Date().toISOString().split('T')[0]}.md`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: `JHA Report: ${metadata?.projectName || 'Safety Analysis'}`,
                    text: markdown.substring(0, 200) + '...',
                });
            } catch (err) {
                console.log('Share failed:', err);
            }
        } else {
            // Fallback: copy to clipboard
            navigator.clipboard.writeText(markdown);
            alert('Report copied to clipboard!');
        }
    };

    return (
        <div className="space-y-4">
            {/* Action Bar */}
            <div className="flex items-center justify-between gap-3 print:hidden">
                <div>
                    <h2 className="text-lg font-semibold">Executive Report</h2>
                    {metadata && (
                        <p className="text-sm text-muted-foreground">
                            {metadata.projectName} • {metadata.location}
                        </p>
                    )}
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleShare}>
                        <Share2 className="h-4 w-4 mr-2" />
                        Share
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleDownload}>
                        <Download className="h-4 w-4 mr-2" />
                        Download
                    </Button>
                    <Button variant="outline" size="sm" onClick={handlePrint}>
                        <Printer className="h-4 w-4 mr-2" />
                        Print
                    </Button>
                </div>
            </div>

            {/* Report Content */}
            <Card className="executive-report-card">
                <CardContent className="p-8 prose prose-slate dark:prose-invert max-w-none">
                    <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                            h1: ({ node, ...props }) => (
                                <h1 className="text-3xl font-bold mb-6 pb-3 border-b" {...props} />
                            ),
                            h2: ({ node, ...props }) => (
                                <h2 className="text-2xl font-semibold mt-8 mb-4" {...props} />
                            ),
                            h3: ({ node, ...props }) => (
                                <h3 className="text-xl font-semibold mt-6 mb-3" {...props} />
                            ),
                            ul: ({ node, ...props }) => (
                                <ul className="list-disc pl-6 space-y-2 my-4" {...props} />
                            ),
                            ol: ({ node, ...props }) => (
                                <ol className="list-decimal pl-6 space-y-2 my-4" {...props} />
                            ),
                            li: ({ node, ...props }) => (
                                <li className="leading-relaxed" {...props} />
                            ),
                            p: ({ node, ...props }) => (
                                <p className="leading-relaxed my-4" {...props} />
                            ),
                            strong: ({ node, ...props }) => (
                                <strong className="font-semibold text-foreground" {...props} />
                            ),
                            blockquote: ({ node, ...props }) => (
                                <blockquote className="border-l-4 border-accent pl-4 italic my-4" {...props} />
                            ),
                            code: ({ node, inline, ...props }: any) =>
                                inline ? (
                                    <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono" {...props} />
                                ) : (
                                    <code className="block bg-muted p-4 rounded-lg my-4 overflow-x-auto" {...props} />
                                ),
                            hr: ({ node, ...props }) => (
                                <hr className="my-8 border-border" {...props} />
                            ),
                        }}
                    >
                        {markdown}
                    </ReactMarkdown>
                </CardContent>
            </Card>

            {/* Print Styles */}
            <style jsx global>{`
        @media print {
          .executive-report-card {
            box-shadow: none;
            border: none;
          }
          
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          
          .prose {
            max-width: 100%;
          }
          
          h1, h2, h3 {
            page-break-after: avoid;
          }
          
          ul, ol {
            page-break-inside: avoid;
          }
        }
      `}</style>
        </div>
    );
}
