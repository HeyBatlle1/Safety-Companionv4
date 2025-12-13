import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart3, ArrowLeft, TrendingUp, PieChart, LineChart } from "lucide-react";
import Link from "next/link";

export default function ReportsPage() {
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link href="/">
                    <Button variant="ghost" size="icon" className="touch-target">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-high-contrast">
                        Reports & Analytics
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Safety trends and compliance insights
                    </p>
                </div>
            </div>

            {/* Coming Soon Card */}
            <Card className="card-highlight">
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-accent/10">
                            <BarChart3 className="h-6 w-6 text-accent" />
                        </div>
                        <div>
                            <CardTitle>Analytics Dashboard</CardTitle>
                            <CardDescription>Coming in Phase 4</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-muted-foreground">
                        Comprehensive safety analytics including:
                    </p>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                        <li className="flex items-start gap-2">
                            <TrendingUp className="h-4 w-4 text-accent mt-0.5" />
                            <span><strong>Trend Analysis:</strong> Track safety metrics over time</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <PieChart className="h-4 w-4 text-accent mt-0.5" />
                            <span><strong>Risk Distribution:</strong> Visualize hazard categories and frequency</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <LineChart className="h-4 w-4 text-accent mt-0.5" />
                            <span><strong>Compliance Tracking:</strong> OSHA standards adherence over time</span>
                        </li>
                    </ul>
                    <div className="pt-4">
                        <Link href="/">
                            <Button variant="outline" className="touch-target">
                                Return to Dashboard
                            </Button>
                        </Link>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
