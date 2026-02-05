'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

interface ActivityChartProps {
    data: Array<{ day: string; submissions: number }>;
}

export function ActivityChart({ data }: ActivityChartProps) {
    return (
        <div className="bg-card border border-white/5 rounded-xl overflow-hidden p-6">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary mb-1 block">Protocols Processed</span>
                    <h3 className="text-lg font-semibold text-foreground tracking-tight">System Utilization</h3>
                </div>
                <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-primary" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">JHA Volume</span>
                </div>
            </div>

            <ResponsiveContainer width="100%" height={260}>
                <BarChart data={data}>
                    <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.05)" strokeDasharray="4 4" />
                    <XAxis
                        dataKey="day"
                        stroke="rgba(255,255,255,0.3)"
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                        dy={10}
                    />
                    <YAxis
                        stroke="rgba(255,255,255,0.3)"
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                        dx={-10}
                    />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: '#161B22',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '8px',
                            color: '#F0F6FC'
                        }}
                        cursor={{ fill: 'rgba(255, 255, 255, 0.02)' }}
                    />
                    <Bar
                        dataKey="submissions"
                        fill="var(--primary)"
                        radius={[4, 4, 4, 4]}
                        barSize={32}
                        animationDuration={1000}
                    />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
