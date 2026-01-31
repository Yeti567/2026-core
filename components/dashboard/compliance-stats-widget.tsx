'use client';

/**
 * Compliance Stats Widget
 * 
 * Displays compliance statistics on the home dashboard.
 * Shows inspections, hazard assessments, training status with frequency comparisons.
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Shield,
  ClipboardCheck,
  AlertTriangle,
  GraduationCap,
  Clock,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ChevronRight,
  Flame,
  Users,
  FileCheck,
  Calendar,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface ActivityStat {
  done: number;
  required: number;
  label: string;
  status: 'good' | 'warning' | 'critical';
}

interface ComplianceData {
  summary: {
    auditReadiness: number;
    auditStatus: string;
    trainingCompliance: number;
    totalGaps: number;
    expiringSoon: number;
    expired: number;
  };
  activities: {
    daily: { hazardAssessments: ActivityStat };
    weekly: { inspections: ActivityStat; toolboxTalks: ActivityStat };
    monthly: { safetyMeetings: ActivityStat; equipmentInspections: ActivityStat };
    quarterly: { emergencyDrills: ActivityStat; managementReviews: ActivityStat };
    annual: { policyReviews: ActivityStat };
  };
  training: {
    totalEmployees: number;
    employeesWithCerts: number;
    compliancePercent: number;
    validCertifications: number;
    expiringSoon: number;
    expired: number;
  };
  lastUpdated: string;
}

const statusConfig = {
  good: { bg: 'bg-emerald-500', text: 'text-emerald-400', icon: CheckCircle2 },
  warning: { bg: 'bg-amber-500', text: 'text-amber-400', icon: AlertCircle },
  critical: { bg: 'bg-red-500', text: 'text-red-400', icon: XCircle },
};

function ActivityCard({ 
  stat, 
  icon: Icon, 
  href 
}: { 
  stat: ActivityStat; 
  icon: React.ElementType;
  href?: string;
}) {
  const config = statusConfig[stat.status];
  const percentage = stat.required > 0 ? Math.min((stat.done / stat.required) * 100, 100) : 100;
  
  const content = (
    <div className={cn(
      "p-4 rounded-xl border transition-all",
      stat.status === 'good' && "bg-emerald-500/10 border-emerald-500/30",
      stat.status === 'warning' && "bg-amber-500/10 border-amber-500/30",
      stat.status === 'critical' && "bg-red-500/10 border-red-500/30",
      href && "hover:scale-[1.02] cursor-pointer"
    )}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icon className={cn("w-5 h-5", config.text)} />
          <span className="text-sm font-medium text-slate-200">{stat.label}</span>
        </div>
        <config.icon className={cn("w-4 h-4", config.text)} />
      </div>
      
      <div className="flex items-end justify-between mb-2">
        <div>
          <span className={cn("text-2xl font-bold", config.text)}>{stat.done}</span>
          <span className="text-slate-500 text-sm"> / {stat.required}</span>
        </div>
        <span className={cn("text-sm font-medium", config.text)}>
          {Math.round(percentage)}%
        </span>
      </div>
      
      <Progress 
        value={percentage} 
        className="h-2 bg-slate-700"
      />
      
      {stat.status === 'critical' && stat.done < stat.required && (
        <p className="text-xs text-red-400 mt-2 flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" />
          Behind schedule - {stat.required - stat.done} more needed
        </p>
      )}
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }
  return content;
}

export function ComplianceStatsWidget() {
  const [data, setData] = useState<ComplianceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/dashboard/compliance-stats');
      if (res.ok) {
        const result = await res.json();
        setData(result);
      } else {
        setError('Failed to load stats');
      }
    } catch (err) {
      setError('Failed to load stats');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-slate-700/50 rounded w-1/3" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-24 bg-slate-700/50 rounded-xl" />
              ))}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-32 bg-slate-700/50 rounded-xl" />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur">
        <CardContent className="p-6 text-center text-slate-400">
          <AlertCircle className="w-8 h-8 mx-auto mb-2 text-slate-500" />
          <p>Unable to load compliance stats</p>
        </CardContent>
      </Card>
    );
  }

  const { summary, activities, training } = data;

  return (
    <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur overflow-hidden">
      <CardHeader className="border-b border-slate-700/50 bg-gradient-to-r from-slate-800/50 to-transparent">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-3 text-xl">
            <div className="p-2 rounded-lg bg-indigo-500/20">
              <TrendingUp className="w-6 h-6 text-indigo-400" />
            </div>
            Compliance Dashboard
          </CardTitle>
          <Link 
            href="/audit"
            className="text-sm text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
          >
            View Full Audit Dashboard
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </CardHeader>
      
      <CardContent className="p-6 space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Audit Readiness */}
          <Link href="/audit" className="block">
            <div className={cn(
              "p-4 rounded-xl border transition-all hover:scale-[1.02]",
              summary.auditReadiness >= 80 ? "bg-emerald-500/10 border-emerald-500/30" :
              summary.auditReadiness >= 50 ? "bg-amber-500/10 border-amber-500/30" :
              "bg-red-500/10 border-red-500/30"
            )}>
              <div className="flex items-center gap-2 mb-2">
                <Shield className={cn(
                  "w-5 h-5",
                  summary.auditReadiness >= 80 ? "text-emerald-400" :
                  summary.auditReadiness >= 50 ? "text-amber-400" : "text-red-400"
                )} />
                <span className="text-sm text-slate-400">COR Readiness</span>
              </div>
              <div className={cn(
                "text-3xl font-bold",
                summary.auditReadiness >= 80 ? "text-emerald-400" :
                summary.auditReadiness >= 50 ? "text-amber-400" : "text-red-400"
              )}>
                {summary.auditReadiness}%
              </div>
            </div>
          </Link>

          {/* Training Compliance */}
          <Link href="/admin/certifications" className="block">
            <div className={cn(
              "p-4 rounded-xl border transition-all hover:scale-[1.02]",
              training.compliancePercent >= 80 ? "bg-emerald-500/10 border-emerald-500/30" :
              training.compliancePercent >= 50 ? "bg-amber-500/10 border-amber-500/30" :
              "bg-red-500/10 border-red-500/30"
            )}>
              <div className="flex items-center gap-2 mb-2">
                <GraduationCap className={cn(
                  "w-5 h-5",
                  training.compliancePercent >= 80 ? "text-emerald-400" :
                  training.compliancePercent >= 50 ? "text-amber-400" : "text-red-400"
                )} />
                <span className="text-sm text-slate-400">Training</span>
              </div>
              <div className={cn(
                "text-3xl font-bold",
                training.compliancePercent >= 80 ? "text-emerald-400" :
                training.compliancePercent >= 50 ? "text-amber-400" : "text-red-400"
              )}>
                {training.compliancePercent}%
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {training.employeesWithCerts}/{training.totalEmployees} employees
              </p>
            </div>
          </Link>

          {/* Expiring Soon */}
          <Link href="/admin/certifications" className="block">
            <div className={cn(
              "p-4 rounded-xl border transition-all hover:scale-[1.02]",
              training.expiringSoon === 0 ? "bg-slate-800/50 border-slate-700/50" :
              "bg-amber-500/10 border-amber-500/30"
            )}>
              <div className="flex items-center gap-2 mb-2">
                <Clock className={cn(
                  "w-5 h-5",
                  training.expiringSoon === 0 ? "text-slate-400" : "text-amber-400"
                )} />
                <span className="text-sm text-slate-400">Expiring Soon</span>
              </div>
              <div className={cn(
                "text-3xl font-bold",
                training.expiringSoon === 0 ? "text-slate-300" : "text-amber-400"
              )}>
                {training.expiringSoon}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Next 30 days
              </p>
            </div>
          </Link>

          {/* Gaps to Address */}
          <Link href="/audit" className="block">
            <div className={cn(
              "p-4 rounded-xl border transition-all hover:scale-[1.02]",
              summary.totalGaps === 0 ? "bg-emerald-500/10 border-emerald-500/30" :
              summary.totalGaps <= 5 ? "bg-amber-500/10 border-amber-500/30" :
              "bg-red-500/10 border-red-500/30"
            )}>
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className={cn(
                  "w-5 h-5",
                  summary.totalGaps === 0 ? "text-emerald-400" :
                  summary.totalGaps <= 5 ? "text-amber-400" : "text-red-400"
                )} />
                <span className="text-sm text-slate-400">Gaps</span>
              </div>
              <div className={cn(
                "text-3xl font-bold",
                summary.totalGaps === 0 ? "text-emerald-400" :
                summary.totalGaps <= 5 ? "text-amber-400" : "text-red-400"
              )}>
                {summary.totalGaps}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                To address
              </p>
            </div>
          </Link>
        </div>

        {/* Activity Tracking */}
        <div>
          <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">
            Activity Frequency Tracking
          </h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Daily */}
            <ActivityCard 
              stat={activities.daily.hazardAssessments} 
              icon={FileCheck}
              href="/forms"
            />
            
            {/* Weekly */}
            <ActivityCard 
              stat={activities.weekly.inspections} 
              icon={ClipboardCheck}
              href="/forms"
            />
            <ActivityCard 
              stat={activities.weekly.toolboxTalks} 
              icon={Users}
              href="/forms"
            />
            
            {/* Monthly */}
            <ActivityCard 
              stat={activities.monthly.safetyMeetings} 
              icon={Calendar}
              href="/forms"
            />
            
            {/* Quarterly */}
            <ActivityCard 
              stat={activities.quarterly.emergencyDrills} 
              icon={Flame}
              href="/forms"
            />
            
            {/* Annual */}
            <ActivityCard 
              stat={activities.annual.policyReviews} 
              icon={Shield}
              href="/admin/documents"
            />
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-2 pt-4 border-t border-slate-700/50">
          <Link 
            href="/forms"
            className="px-4 py-2 rounded-lg bg-indigo-500/20 text-indigo-400 text-sm font-medium hover:bg-indigo-500/30 transition-colors"
          >
            Submit Inspection
          </Link>
          <Link 
            href="/forms"
            className="px-4 py-2 rounded-lg bg-emerald-500/20 text-emerald-400 text-sm font-medium hover:bg-emerald-500/30 transition-colors"
          >
            Submit Hazard Assessment
          </Link>
          <Link 
            href="/admin/certifications"
            className="px-4 py-2 rounded-lg bg-amber-500/20 text-amber-400 text-sm font-medium hover:bg-amber-500/30 transition-colors"
          >
            Manage Training
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

export default ComplianceStatsWidget;
