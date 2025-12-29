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
                        <CartesianGrid strokeDasharray="3 3" stroke="#4A5B6D" opacity={0.5} />
                        <XAxis
                            dataKey="day"
                            stroke="#B8C4D0"
                            fontSize={12}
                            tickLine={false}
                        />
                        <YAxis
                            stroke="#B8C4D0"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: '#2D3A48',
                                border: '1px solid #4A5B6D',
                                borderRadius: '8px',
                                color: '#FFFFFF'
                            }}
                            cursor={{ fill: 'rgba(45, 212, 191, 0.1)' }}
                        />
                        <Bar
                            dataKey="submissions"
                            fill="#2DD4BF"
                            radius={[8, 8, 0, 0]}
                            animationDuration={1000}
                        />
                    </BarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}
