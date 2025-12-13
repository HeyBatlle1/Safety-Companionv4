'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SmartCardProps {
    title: string;
    description?: string;
    badge?: string;
    badgeVariant?: 'default' | 'secondary' | 'outline' | 'destructive';
    defaultExpanded?: boolean;
    optional?: boolean;
    estimatedTime?: string;
    children: React.ReactNode;
    onToggle?: (expanded: boolean) => void;
    className?: string;
}

export function SmartCard({
    title,
    description,
    badge,
    badgeVariant = 'secondary',
    defaultExpanded = false,
    optional = true,
    estimatedTime,
    children,
    onToggle,
    className
}: SmartCardProps) {
    const [expanded, setExpanded] = useState(defaultExpanded);

    const handleToggle = () => {
        const newState = !expanded;
        setExpanded(newState);
        onToggle?.(newState);
    };

    return (
        <Card className={cn('card-highlight border-l-4 border-l-accent', className)}>
            <CardHeader className="cursor-pointer" onClick={handleToggle}>
                <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <CardTitle className="text-lg">{title}</CardTitle>
                            {badge && (
                                <Badge variant={badgeVariant} className="text-xs flex items-center gap-1">
                                    <Sparkles className="h-3 w-3" />
                                    {badge}
                                </Badge>
                            )}
                            {optional && (
                                <Badge variant="outline" className="text-xs">
                                    Optional
                                </Badge>
                            )}
                        </div>
                        {description && (
                            <CardDescription className="mt-1">{description}</CardDescription>
                        )}
                        {estimatedTime && !expanded && (
                            <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                                ⏱️ ~{estimatedTime}
                            </p>
                        )}
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="shrink-0"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleToggle();
                        }}
                    >
                        {expanded ? (
                            <ChevronUp className="h-4 w-4" />
                        ) : (
                            <ChevronDown className="h-4 w-4" />
                        )}
                    </Button>
                </div>
            </CardHeader>

            {expanded && (
                <CardContent className="space-y-4 animate-in slide-in-from-top-2 duration-200">
                    {children}
                </CardContent>
            )}
        </Card>
    );
}
