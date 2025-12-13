'use client';

import { useState } from 'react';
import { useRecentJHAs } from '@/hooks/use-api';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { History, ArrowLeft, Search, Filter, Plus, FileText, Shield, Calendar } from "lucide-react";
import { format } from 'date-fns';
import Link from "next/link";

export default function JHAHistoryPage() {
    const [searchQuery, setSearchQuery] = useState('');
    const { data: jhas, isLoading } = useRecentJHAs(50); // Fetch recent 50

    const filteredJHAs = jhas?.filter(jha =>
        jha.project_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        jha.id.includes(searchQuery)
    );

    return (
        <div className="space-y-6 pb-20">
            {/* Header */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/">
                        <Button variant="ghost" size="icon" className="touch-target">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-high-contrast">
                            JHA History
                        </h1>
                        <p className="text-muted-foreground mt-1">
                            {filteredJHAs?.length || 0} analyses available
                        </p>
                    </div>
                </div>
                <Link href="/jha/new">
                    <Button className="w-full md:w-auto">
                        <Plus className="mr-2 h-4 w-4" />
                        Create New JHA
                    </Button>
                </Link>
            </div>

            {/* Search and Filter */}
            <div className="flex gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by project name or ID..."
                        className="pl-9"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <Button variant="outline" size="icon">
                    <Filter className="h-4 w-4" />
                </Button>
            </div>

            {/* List */}
            {isLoading ? (
                <div className="flex flex-col gap-4">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="h-32 w-full animate-pulse rounded-lg bg-card/50" />
                    ))}
                </div>
            ) : filteredJHAs && filteredJHAs.length > 0 ? (
                <div className="grid gap-4">
                    {filteredJHAs.map((jha) => (
                        <Link key={jha.id} href={`/jha/${jha.id}`} className="block">
                            <Card className="transition-colors hover:bg-accent/5">
                                <CardContent className="p-6">
                                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-semibold">{jha.project_name}</h3>
                                                <Badge variant="outline" className="text-xs font-normal">
                                                    ID: {jha.id.slice(0, 6)}
                                                </Badge>
                                            </div>
                                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                                <span className="flex items-center gap-1">
                                                    <Calendar className="h-3 w-3" />
                                                    {format(new Date(jha.created_at), 'MMM d, yyyy')}
                                                </span>
                                                {jha.urgency_level && (
                                                    <span className="flex items-center gap-1">
                                                        <Shield className="h-3 w-3" />
                                                        {jha.urgency_level}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between gap-6 md:justify-end">
                                            <div className="flex flex-col items-center md:items-end">
                                                <span className="text-xs text-muted-foreground">Risk Score</span>
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-xl font-bold ${jha.risk_score >= 80 ? 'text-destructive' :
                                                        jha.risk_score >= 50 ? 'text-yellow-500' :
                                                            'text-green-500'
                                                        }`}>
                                                        {jha.risk_score}
                                                    </span>
                                                </div>
                                            </div>
                                            <Button variant="ghost" size="icon">
                                                <FileText className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </Link>
                    ))}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center gap-4 py-12 text-center text-muted-foreground">
                    <div className="rounded-full bg-accent/10 p-4">
                        <History className="h-8 w-8 text-accent" />
                    </div>
                    <p>No JHA records found</p>
                    <Link href="/jha/new">
                        <Button variant="link">Create your first JHA</Button>
                    </Link>
                </div>
            )}
        </div>
    );
}
