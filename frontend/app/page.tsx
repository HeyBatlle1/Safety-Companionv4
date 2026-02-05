'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
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
      {/* Technical Dashboard Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2 border-b border-white/5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Live Operations</span>
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-foreground flex items-center gap-4">
            Safety Command
            <span className="text-xs font-mono font-medium px-2 py-1 rounded bg-secondary border border-white/5 text-muted-foreground">v3.4.0</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-md">
            Consolidated safety analysis and incident prediction for {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/vision">
            <button className="h-10 px-4 rounded-lg bg-secondary border border-white/10 hover:border-primary/50 text-sm font-medium transition-all flex items-center gap-2 group">
              <Camera size={18} className="text-muted-foreground group-hover:text-primary transition-colors" />
              Vision HUD
            </button>
          </Link>
          <Link href="/jha/new">
            <button className="h-10 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-bold transition-all flex items-center gap-2 hover:bg-primary/90 shadow-lg shadow-primary/10">
              <Plus weight="bold" size={18} />
              New Analysis
            </button>
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

      {/* Recent Activity Precision Grid */}
      <div className="bg-card border border-white/5 rounded-xl overflow-hidden shadow-2xl">
        <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
          <div>
            <h2 className="text-lg font-semibold text-foreground tracking-tight">Recent Safety Protocols</h2>
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mt-0.5">Real-time Analysis Stream</p>
          </div>
          <Link href="/jha">
            <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/5 text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all text-xs font-bold uppercase tracking-widest">
              Full Archive
              <ArrowRight weight="bold" size={14} className="text-primary" />
            </button>
          </Link>
        </div>

        <div className="divide-y divide-white/5">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between pb-4 last:pb-0">
                  <div className="space-y-2">
                    <div className="h-4 w-64 animate-pulse rounded bg-secondary/50"></div>
                    <div className="h-3 w-32 animate-pulse rounded bg-secondary/30"></div>
                  </div>
                  <div className="h-6 w-20 animate-pulse rounded bg-secondary/50"></div>
                </div>
              ))}
            </div>
          ) : recentJHAs && recentJHAs.length > 0 ? (
            recentJHAs.slice(0, 5).map((item) => (
              <Link key={item.id} href={`/jha/${item.id}`} className="block group">
                <div className="flex items-center justify-between p-6 transition-all group-hover:bg-white/[0.02]">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "h-10 w-10 rounded-lg flex items-center justify-center border transition-colors",
                      item.urgency_level === 'CRITICAL' || item.urgency_level === 'HIGH'
                        ? "bg-destructive/10 border-destructive/20 text-destructive"
                        : "bg-primary/10 border-primary/20 text-primary"
                    )}>
                      <ClipboardText weight="bold" size={20} />
                    </div>
                    <div className="space-y-1">
                      <p className="font-semibold text-foreground group-hover:text-primary transition-colors tracking-tight">{item.project_name}</p>
                      <div className="flex items-center gap-3">
                        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                          <Clock size={12} />
                          {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                        </p>
                        <span className="text-white/10">•</span>
                        <p className="text-xs font-mono text-muted-foreground uppercase">ID: {item.id.slice(0, 8)}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="hidden md:flex flex-col items-end mr-4">
                      <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold leading-none mb-1">Risk Index</span>
                      <span className={cn(
                        "text-lg font-bold font-mono leading-none",
                        item.risk_score > 70 ? "text-destructive" : item.risk_score > 40 ? "text-warning" : "text-success"
                      )}>{item.risk_score}</span>
                    </div>

                    <div className={cn(
                      "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border transition-all",
                      item.urgency_level === 'CRITICAL' || item.urgency_level === 'HIGH'
                        ? "bg-destructive/10 border-destructive/20 text-destructive"
                        : "bg-secondary text-muted-foreground border-white/5"
                    )}>
                      {item.urgency_level}
                    </div>
                    <ArrowRight size={16} className="text-white/10 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                  </div>
                </div>
              </Link>
            ))
          ) : (
            <div className="text-center py-12">
              <ClipboardText weight="light" size={48} className="text-white/5 mx-auto mb-3" />
              <p className="text-muted-foreground font-medium">No safety protocols available</p>
              <Link href="/jha/new" className="text-primary hover:text-primary/80 text-xs font-bold uppercase tracking-widest mt-4 inline-block border-b border-primary/30 pb-0.5">
                Initialize First Protocol →
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
