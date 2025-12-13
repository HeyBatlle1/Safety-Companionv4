'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Clock, User } from 'lucide-react';

interface ActionItem {
    priority: string;
    action: string;
    timeframe: string;
    responsibility: string;
    category?: string;
}

interface ActionPlanSectionProps {
    actionItems: ActionItem[];
}

const priorityConfig = {
    CRITICAL: { color: 'destructive', bg: 'bg-red-50 border-red-200', icon: '🚨' },
    HIGH: { color: 'secondary', bg: 'bg-orange-50 border-orange-200', icon: '⚠️' },
    MEDIUM: { color: 'outline', bg: 'bg-yellow-50 border-yellow-200', icon: '📋' },
    LOW: { color: 'outline', bg: 'bg-blue-50 border-blue-200', icon: '📌' }
};

const categoryIcons = {
    'Compliance': '📜',
    'Safety Equipment': '🦺',
    'Emergency Prep': '🚑',
    'Training': '📚',
    'Monitoring': '👁️',
    'Safety': '🛡️'
};

export function ActionPlanSection({ actionItems }: ActionPlanSectionProps) {
    if (!actionItems || actionItems.length === 0) {
        return (
            <div className="text-center py-8 text-muted-foreground">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-2 text-green-500" />
                <p>No specific action items required</p>
            </div>
        );
    }

    // Group by priority
    const critical = actionItems.filter(a => a.priority === 'CRITICAL');
    const high = actionItems.filter(a => a.priority === 'HIGH');
    const medium = actionItems.filter(a => a.priority === 'MEDIUM');
    const low = actionItems.filter(a => a.priority === 'LOW');

    const renderActionGroup = (items: ActionItem[], title: string, priority: keyof typeof priorityConfig) => {
        if (items.length === 0) return null;

        const config = priorityConfig[priority];

        return (
            <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                    <span className="text-lg">{config.icon}</span>
                    <h4 className="font-semibold text-sm uppercase tracking-wide">{title}</h4>
                    <Badge variant={config.color as any} className="text-xs">
                        {items.length}
                    </Badge>
                </div>
                <div className="space-y-3">
                    {items.map((item, i) => (
                        <Card key={i} className={`${config.bg} border`}>
                            <CardContent className="p-4">
                                <div className="space-y-2">
                                    {/* Action */}
                                    <p className="font-medium text-sm leading-relaxed">
                                        {item.action}
                                    </p>

                                    {/* Metadata */}
                                    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                                        <div className="flex items-center gap-1">
                                            <Clock className="h-3 w-3" />
                                            <span>{item.timeframe}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <User className="h-3 w-3" />
                                            <span>{item.responsibility}</span>
                                        </div>
                                        {item.category && (
                                            <div className="flex items-center gap-1">
                                                <span>{categoryIcons[item.category as keyof typeof categoryIcons] || '📁'}</span>
                                                <span>{item.category}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div>
            {/* Summary Stats */}
            <div className="grid grid-cols-4 gap-2 mb-6">
                <Card className="border-red-200 bg-red-50">
                    <CardContent className="p-3 text-center">
                        <div className="text-2xl font-bold text-red-700">{critical.length}</div>
                        <div className="text-xs text-red-600">Critical</div>
                    </CardContent>
                </Card>
                <Card className="border-orange-200 bg-orange-50">
                    <CardContent className="p-3 text-center">
                        <div className="text-2xl font-bold text-orange-700">{high.length}</div>
                        <div className="text-xs text-orange-600">High</div>
                    </CardContent>
                </Card>
                <Card className="border-yellow-200 bg-yellow-50">
                    <CardContent className="p-3 text-center">
                        <div className="text-2xl font-bold text-yellow-700">{medium.length}</div>
                        <div className="text-xs text-yellow-600">Medium</div>
                    </CardContent>
                </Card>
                <Card className="border-blue-200 bg-blue-50">
                    <CardContent className="p-3 text-center">
                        <div className="text-2xl font-bold text-blue-700">{low.length}</div>
                        <div className="text-xs text-blue-600">Low</div>
                    </CardContent>
                </Card>
            </div>

            {/* Action Groups */}
            {renderActionGroup(critical, 'Critical Actions', 'CRITICAL')}
            {renderActionGroup(high, 'High Priority', 'HIGH')}
            {renderActionGroup(medium, 'Medium Priority', 'MEDIUM')}
            {renderActionGroup(low, 'Low Priority', 'LOW')}
        </div>
    );
}
