'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

interface ActivityChartProps {
    data: Array<{ day: string; submissions: number }>;
}

export function ActivityChart({ data }: ActivityChartProps) {
    return (
        <Card className="card-highlight">
            <CardHeader>
                <CardTitle>Weekly Activity</CardTitle>
                <CardDescription>JHA submissions by day</CardDescription>
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                        <XAxis
                            dataKey="day"
                            stroke="hsl(var(--muted-foreground))"
                            fontSize={12}
                        />
                        <YAxis
                            stroke="hsl(var(--muted-foreground))"
                            fontSize={12}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: 'hsl(var(--card))',
                                border: '1px solid hsl(var(--border))',
                                borderRadius: '8px',
                                color: 'hsl(var(--foreground))'
                            }}
                            cursor={{ fill: 'hsl(var(--accent))' }}
                        />
                        <Bar
                            dataKey="submissions"
                            fill="hsl(var(--primary))"
                            radius={[8, 8, 0, 0]}
                            animationDuration={1000}
                        />
                    </BarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}
