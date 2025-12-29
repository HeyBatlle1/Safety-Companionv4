'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Shield,
  AlertTriangle,
  ArrowRight,
  Clock,
  Plus,
  Camera
} from "lucide-react";
import Link from "next/link";
import { useRecentJHAs } from "@/hooks/use-api";
import { formatDistanceToNow } from "date-fns";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { ActivityChart } from "@/components/dashboard/ActivityChart";
import { ComplianceGauge } from "@/components/dashboard/ComplianceGauge";
import { SiteConditionsWidget } from "@/components/dashboard/SiteConditionsWidget";

export default function DashboardPage() {
  const { data: recentJHAs, isLoading } = useRecentJHAs(50);

  // Calculate stats
  const totalSubmissions = recentJHAs?.length || 0;
  const approvedCount = recentJHAs?.filter(jha => jha.urgency_level === 'LOW').length || 0;
  const pendingCount = recentJHAs?.filter(jha => jha.urgency_level === 'MEDIUM').length || 0;
  const highRiskCount = recentJHAs?.filter(jha =>
    jha.urgency_level === 'HIGH' || jha.urgency_level === 'CRITICAL'
  ).length || 0;

  // Calculate average compliance score
  const avgCompliance = recentJHAs && recentJHAs.length > 0
    ? Math.round(recentJHAs.reduce((acc, jha) => acc + (jha.risk_score || 85), 0) / recentJHAs.length)
    : 87;

  // Generate weekly activity data
  const getWeeklyData = () => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const today = new Date();
    return days.map((day, index) => {
      const count = recentJHAs?.filter(jha => {
        const date = new Date(jha.created_at);
        return date.getDay() === index &&
          (today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24) < 7;
      }).length || 0;
      return { day, submissions: count };
    });
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-high-contrast">
            Safety Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/vision">
            <Button variant="outline" className="touch-target-lg">
              <Camera className="h-4 w-4 mr-2" />
              Quick Scan
            </Button>
          </Link>
          <Link href="/jha/new">
            <Button className="touch-target-lg">
              <Plus className="h-4 w-4 mr-2" />
              New JHA
            </Button>
          </Link>
        </div>
      </div>

      {/* Site Conditions & Stats Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Site Conditions - Location + Weather */}
        <div className="lg:col-span-1">
          <SiteConditionsWidget />
        </div>

        {/* Stats Grid */}
        <div className="lg:col-span-2 grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatsCard
            title="Total JHAs"
            value={totalSubmissions}
            icon={FileText}
            variant="primary"
            trend="up"
            trendValue="+12% this week"
          />
          <StatsCard
            title="Approved"
            value={approvedCount}
            icon={Shield}
            variant="success"
          />
          <StatsCard
            title="Pending Review"
            value={pendingCount}
            icon={Clock}
            variant="warning"
          />
          <StatsCard
            title="High Risk"
            value={highRiskCount}
            icon={AlertTriangle}
            variant="danger"
          />
        </div >
      </div >

      {/* Charts Row */}
      < div className="grid grid-cols-1 lg:grid-cols-3 gap-4" >
        <div className="lg:col-span-2">
          <ActivityChart data={getWeeklyData()} />
        </div>
        <div>
          <ComplianceGauge score={avgCompliance} />
        </div>
      </div >

      {/* Recent Activity */}
      < Card >
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Recent JHA Analyses</CardTitle>
            <CardDescription>Your latest safety assessments</CardDescription>
          </div>
          <Link href="/jha">
            <Button variant="ghost" size="sm">
              View All <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                    <div className="space-y-2">
                      <div className="h-4 w-48 animate-pulse rounded bg-muted"></div>
                      <div className="h-3 w-24 animate-pulse rounded bg-muted"></div>
                    </div>
                    <div className="h-6 w-16 animate-pulse rounded bg-muted"></div>
                  </div>
                ))}
              </div>
            ) : recentJHAs && recentJHAs.length > 0 ? (
              recentJHAs.slice(0, 5).map((item) => (
                <Link key={item.id} href={`/jha/${item.id}`} className="block group">
                  <div className="flex items-center justify-between border-b pb-4 transition-colors group-hover:bg-accent/5 last:border-0 last:pb-0">
                    <div className="space-y-1">
                      <p className="font-medium leading-none group-hover:text-primary">{item.project_name}</p>
                      <p className="text-sm text-muted-foreground">{formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={item.risk_score > 70 ? 'destructive' : item.risk_score > 40 ? 'secondary' : 'default'}
                        className="tabular-nums"
                      >
                        Risk: {item.risk_score}
                      </Badge>
                      <Badge variant={item.urgency_level === 'CRITICAL' || item.urgency_level === 'HIGH' ? 'destructive' : 'outline'}>
                        {item.urgency_level}
                      </Badge>
                    </div>
                  </div>
                </Link>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No recent analyses found. Start your first JHA!
              </div>
            )}
          </div>
        </CardContent>
      </Card >
    </div >
  );
}
