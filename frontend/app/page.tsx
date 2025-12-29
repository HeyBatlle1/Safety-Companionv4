'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ClipboardText,
  ShieldCheck,
  Warning,
  ArrowRight,
  Clock,
  Plus,
  Camera,
  ChartLineUp,
  Lightning
} from "@phosphor-icons/react";
import Link from "next/link";
import { useRecentJHAs } from "@/hooks/use-api";
import { formatDistanceToNow } from "date-fns";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { ActivityChart } from "@/components/dashboard/ActivityChart";
import { ComplianceGauge } from "@/components/dashboard/ComplianceGauge";
import { SiteConditionsWidget } from "@/components/dashboard/SiteConditionsWidget";
import { PrimaryButton, SecondaryButton } from "@/components/ui/phosphor-buttons";

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
    <div className="space-y-6 pb-24">
      {/* Header with gradient */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 p-6 border border-gray-700/50">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_-20%,rgba(59,130,246,0.2),transparent)]" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
              <ChartLineUp weight="bold" size={36} className="text-blue-400" />
              Safety Dashboard
            </h1>
            <p className="text-gray-400 mt-1">
              {new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
          </div>
          <div className="flex gap-3">
            <Link href="/vision">
              <SecondaryButton icon={Camera}>
                Quick Scan
              </SecondaryButton>
            </Link>
            <Link href="/jha/new">
              <PrimaryButton icon={Plus}>
                New JHA
              </PrimaryButton>
            </Link>
          </div>
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
            icon={ClipboardText}
            variant="primary"
            trend="up"
            trendValue="+12% this week"
          />
          <StatsCard
            title="Approved"
            value={approvedCount}
            icon={ShieldCheck}
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
            icon={Lightning}
            variant="danger"
          />
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <ActivityChart data={getWeeklyData()} />
        </div>
        <div>
          <ComplianceGauge score={avgCompliance} />
        </div>
      </div>

      {/* Recent Activity */}
      <Card className="bg-gray-800/50 border-gray-700">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-white">Recent JHA Analyses</CardTitle>
            <CardDescription className="text-gray-400">Your latest safety assessments</CardDescription>
          </div>
          <Link href="/jha">
            <button className="flex items-center gap-2 px-4 py-2 rounded-lg text-gray-300 hover:text-white hover:bg-gray-700/50 transition-colors text-sm font-medium">
              View All
              <ArrowRight weight="bold" size={16} />
            </button>
          </Link>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center justify-between border-b border-gray-700 pb-4 last:border-0 last:pb-0">
                    <div className="space-y-2">
                      <div className="h-4 w-48 animate-pulse rounded bg-gray-700"></div>
                      <div className="h-3 w-24 animate-pulse rounded bg-gray-700"></div>
                    </div>
                    <div className="h-6 w-16 animate-pulse rounded bg-gray-700"></div>
                  </div>
                ))}
              </div>
            ) : recentJHAs && recentJHAs.length > 0 ? (
              recentJHAs.slice(0, 5).map((item) => (
                <Link key={item.id} href={`/jha/${item.id}`} className="block group">
                  <div className="flex items-center justify-between border-b border-gray-700/50 pb-4 transition-colors group-hover:bg-white/5 rounded-lg px-2 -mx-2 last:border-0 last:pb-0">
                    <div className="space-y-1">
                      <p className="font-medium text-white group-hover:text-blue-400 transition-colors">{item.project_name}</p>
                      <p className="text-sm text-gray-500">{formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        className={`tabular-nums ${item.risk_score > 70
                            ? 'bg-red-500/20 text-red-400 border-red-500/30'
                            : item.risk_score > 40
                              ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                              : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                          }`}
                      >
                        Risk: {item.risk_score}
                      </Badge>
                      <Badge
                        className={`${item.urgency_level === 'CRITICAL' || item.urgency_level === 'HIGH'
                            ? 'bg-red-500/20 text-red-400 border-red-500/30'
                            : 'bg-gray-500/20 text-gray-400 border-gray-500/30'
                          }`}
                      >
                        {item.urgency_level}
                      </Badge>
                    </div>
                  </div>
                </Link>
              ))
            ) : (
              <div className="text-center py-8">
                <ClipboardText weight="light" size={48} className="text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400">No recent analyses found.</p>
                <Link href="/jha/new" className="text-blue-400 hover:underline text-sm mt-1 inline-block">
                  Start your first JHA →
                </Link>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
