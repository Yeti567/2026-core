'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Shield,
  Clock,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  FileText,
  Download,
  MessageSquare,
  Target,
  TrendingUp,
  Users,
  Loader2,
  ExternalLink,
  Filter,
  Search,
  ArrowUpRight,
  Zap,
  ClipboardList,
  Sparkles,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// Types
interface ElementScore {
  elementNumber: number;
  elementName: string;
  score: number;
  maxScore: number;
  percentage: number;
  status: 'passing' | 'at-risk' | 'failing';
  gaps: Gap[];
  evidenceCount: number;
  requirementCount: number;
}

interface Gap {
  id: string;
  elementNumber: number;
  type: string;
  severity: 'critical' | 'major' | 'minor';
  title: string;
  description: string;
  actionItem: string;
  estimatedTime: string;
  assignedTo?: string;
  status?: 'todo' | 'in_progress' | 'done';
}

interface ComplianceData {
  overall: {
    score: number;
    maxScore: number;
    percentage: number;
    status: string;
    passingThreshold: number;
  };
  elements: ElementScore[];
  readiness: {
    ready_for_audit: boolean;
    critical_gaps: number;
    major_gaps: number;
    minor_gaps: number;
    total_gaps: number;
    estimated_hours: number;
    projected_ready_date: string;
  };
  lastUpdated: string;
}

interface TimelineData {
  timeline: {
    currentReadiness: number;
    projectedReadyDate: string;
    criticalPath: any[];
    milestones: any[];
    totalDaysToReady: number;
    totalHoursNeeded: number;
  };
  elementProgress: any[];
}

interface AuditDashboardProps {
  userRole: string;
  userId: string;
}

const STATUS_CONFIG = {
  passing: { color: 'emerald', icon: CheckCircle2, label: 'On Track' },
  'at-risk': { color: 'amber', icon: AlertTriangle, label: 'Needs Work' },
  failing: { color: 'red', icon: XCircle, label: 'Critical' },
};

const SEVERITY_CONFIG = {
  critical: { color: 'red', bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-400' },
  major: { color: 'orange', bg: 'bg-orange-500/10', border: 'border-orange-500/30', text: 'text-orange-400' },
  minor: { color: 'blue', bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-400' },
};

export function AuditDashboardClient({ userRole, userId }: AuditDashboardProps) {
  const router = useRouter();
  const [data, setData] = useState<ComplianceData | null>(null);
  const [timelineData, setTimelineData] = useState<TimelineData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedElements, setExpandedElements] = useState<number[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showMajorGaps, setShowMajorGaps] = useState(false);
  const [showMinorGaps, setShowMinorGaps] = useState(false);
  const [generatingPlan, setGeneratingPlan] = useState(false);
  const [planGenerationStatus, setPlanGenerationStatus] = useState('');

  const fetchData = useCallback(async (forceRefresh = false) => {
    try {
      const url = forceRefresh ? '/api/audit/compliance?refresh=true' : '/api/audit/compliance';
      const [complianceRes, timelineRes] = await Promise.all([
        fetch(url),
        fetch('/api/audit/timeline'),
      ]);

      if (complianceRes.ok) {
        const complianceData = await complianceRes.json();
        setData(complianceData);
      }

      if (timelineRes.ok) {
        const timeline = await timelineRes.json();
        setTimelineData(timeline);
      }
    } catch (error) {
      console.error('Failed to fetch audit data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    // Refresh every 5 minutes
    const interval = setInterval(() => fetchData(), 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData(true);
  };

  const handleGenerateActionPlan = async () => {
    if (!data) return;
    
    try {
      setGeneratingPlan(true);
      setPlanGenerationStatus('Analyzing compliance gaps...');
      
      // Collect all gaps from all elements
      const allGaps = data.elements.flatMap(element => 
        element.gaps.map(gap => ({
          requirement_id: gap.id,
          element_number: gap.elementNumber,
          description: gap.description,
          requirement_description: gap.title,
          severity: gap.severity,
          action_required: gap.actionItem,
          estimated_effort_hours: parseEstimatedTime(gap.estimatedTime)
        }))
      );

      await new Promise(resolve => setTimeout(resolve, 500));
      setPlanGenerationStatus('Creating action phases...');
      await new Promise(resolve => setTimeout(resolve, 500));
      setPlanGenerationStatus('Assigning tasks to team members...');
      await new Promise(resolve => setTimeout(resolve, 500));
      setPlanGenerationStatus('Generating subtasks...');

      // Calculate target date (90 days from now or from readiness data)
      const targetDate = data.readiness.projected_ready_date 
        ? new Date(data.readiness.projected_ready_date)
        : new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);

      const response = await fetch('/api/audit/action-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gaps: allGaps,
          targetDate: targetDate.toISOString(),
          estimatedHours: data.readiness.estimated_hours || 80
        })
      });

      const result = await response.json();

      if (result.error) {
        throw new Error(result.error);
      }

      setPlanGenerationStatus('Action plan created! Redirecting...');
      await new Promise(resolve => setTimeout(resolve, 500));
      
      router.push('/admin/action-plan');

    } catch (error) {
      console.error('Failed to generate action plan:', error);
      setPlanGenerationStatus('Failed to generate plan. Please try again.');
      setTimeout(() => {
        setGeneratingPlan(false);
        setPlanGenerationStatus('');
      }, 2000);
    }
  };

  // Helper to parse estimated time strings like "2h", "4 hours", "30 mins"
  function parseEstimatedTime(timeStr: string): number {
    const hourMatch = timeStr.match(/(\d+)\s*h/i);
    if (hourMatch) return parseInt(hourMatch[1]);
    const minMatch = timeStr.match(/(\d+)\s*min/i);
    if (minMatch) return Math.ceil(parseInt(minMatch[1]) / 60);
    return 2; // default 2 hours
  }

  const toggleElement = (elementNumber: number) => {
    setExpandedElements(prev =>
      prev.includes(elementNumber)
        ? prev.filter(n => n !== elementNumber)
        : [...prev, elementNumber]
    );
  };

  const filteredElements = data?.elements.filter(element => {
    if (filter === 'all') return true;
    if (filter === 'critical') return element.status === 'failing';
    if (filter === 'needs-work') return element.status === 'at-risk';
    if (filter === 'good') return element.status === 'passing';
    return true;
  }) || [];

  const allGaps = data?.elements.flatMap(e => e.gaps) || [];
  const criticalGaps = allGaps.filter(g => g.severity === 'critical');
  const majorGaps = allGaps.filter(g => g.severity === 'major');
  const minorGaps = allGaps.filter(g => g.severity === 'minor');

  const filteredGaps = searchQuery
    ? allGaps.filter(g =>
        g.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        g.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        g.actionItem.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : null;

  const formatLastUpdated = (isoString: string) => {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-12 bg-slate-800/50 rounded-lg w-1/3" />
            <div className="grid grid-cols-3 gap-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-32 bg-slate-800/50 rounded-xl" />
              ))}
            </div>
            <div className="h-96 bg-slate-800/50 rounded-xl" />
          </div>
        </div>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">Failed to Load Data</h2>
          <p className="text-slate-400 mb-4">Unable to fetch compliance data.</p>
          <button onClick={() => fetchData()} className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-400">
            Try Again
          </button>
        </div>
      </main>
    );
  }

  const { overall, readiness } = data;
  const isReady = readiness.ready_for_audit;

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Background decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <header className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/admin"
                className="p-2 rounded-lg bg-slate-800/50 hover:bg-slate-700/50 text-slate-400 hover:text-white transition-colors"
              >
                <ChevronRight className="w-5 h-5 rotate-180" />
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                  <Target className="w-8 h-8 text-indigo-400" />
                  COR Certification Readiness
                </h1>
                <p className="text-slate-400 mt-1">
                  Track your progress toward COR audit certification
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-500">
                Last updated: {formatLastUpdated(data.lastUpdated)}
              </span>
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                {refreshing ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>
          </div>
        </header>

        {/* Main Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Overall Score Card */}
          <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400 uppercase tracking-wider">Overall Score</p>
                  <div className="flex items-baseline gap-2 mt-2">
                    <span className={`text-5xl font-bold ${
                      overall.percentage >= 80 ? 'text-emerald-400' :
                      overall.percentage >= 60 ? 'text-amber-400' : 'text-red-400'
                    }`}>
                      {overall.percentage.toFixed(1)}%
                    </span>
                    <span className="text-slate-500">/ {overall.passingThreshold}%</span>
                  </div>
                </div>
                <div className="relative w-20 h-20">
                  <svg className="w-20 h-20 -rotate-90">
                    <circle
                      cx="40"
                      cy="40"
                      r="36"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="8"
                      className="text-slate-700"
                    />
                    <circle
                      cx="40"
                      cy="40"
                      r="36"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="8"
                      strokeLinecap="round"
                      strokeDasharray={`${(overall.percentage / 100) * 226} 226`}
                      className={
                        overall.percentage >= 80 ? 'text-emerald-500' :
                        overall.percentage >= 60 ? 'text-amber-500' : 'text-red-500'
                      }
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Shield className={`w-6 h-6 ${
                      overall.percentage >= 80 ? 'text-emerald-400' :
                      overall.percentage >= 60 ? 'text-amber-400' : 'text-red-400'
                    }`} />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Hours to Ready Card */}
          <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400 uppercase tracking-wider">Hours to Ready</p>
                  <div className="flex items-baseline gap-2 mt-2">
                    <span className="text-5xl font-bold text-white">{readiness.estimated_hours}</span>
                    <span className="text-slate-500">hours</span>
                  </div>
                  <p className="text-sm text-slate-500 mt-1">
                    ~{Math.ceil(readiness.estimated_hours / 10)} weeks at 10h/week
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-indigo-500/10">
                  <Clock className="w-8 h-8 text-indigo-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Projected Ready Date Card */}
          <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400 uppercase tracking-wider">Ready Date</p>
                  <div className="mt-2">
                    <span className="text-3xl font-bold text-white">
                      {new Date(readiness.projected_ready_date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                    <span className="text-xl text-slate-400 ml-2">
                      {new Date(readiness.projected_ready_date).getFullYear()}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500 mt-1">
                    {timelineData?.timeline.totalDaysToReady || 0} days from now
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-purple-500/10">
                  <Calendar className="w-8 h-8 text-purple-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Status Banner */}
        <div className={`mb-8 p-4 rounded-xl border ${
          isReady
            ? 'bg-emerald-500/10 border-emerald-500/30'
            : 'bg-red-500/10 border-red-500/30'
        }`}>
          <div className="flex items-center gap-4">
            {isReady ? (
              <>
                <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                <div>
                  <p className="text-lg font-semibold text-emerald-400">Ready for COR Audit!</p>
                  <p className="text-sm text-emerald-400/70">
                    Your organization meets the minimum 80% threshold with no critical gaps.
                  </p>
                </div>
              </>
            ) : (
              <>
                <XCircle className="w-8 h-8 text-red-400" />
                <div>
                  <p className="text-lg font-semibold text-red-400">
                    Not Ready for Audit — {readiness.critical_gaps} Critical Gap{readiness.critical_gaps !== 1 ? 's' : ''} Must Be Fixed
                  </p>
                  <p className="text-sm text-red-400/70">
                    Address all critical gaps and achieve 80%+ score before scheduling your audit.
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Element Scores Section */}
        <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur mb-8">
          <CardHeader className="border-b border-slate-700/50">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl text-white flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-indigo-400" />
                Element Scores
                <span className="text-sm font-normal text-slate-400">(14 Elements)</span>
              </CardTitle>
              <div className="flex items-center gap-3">
                <div className="flex bg-slate-800 rounded-lg p-1">
                  {[
                    { value: 'all', label: 'All' },
                    { value: 'critical', label: 'Critical' },
                    { value: 'needs-work', label: 'Needs Work' },
                    { value: 'good', label: 'Good' },
                  ].map(option => (
                    <button
                      key={option.value}
                      onClick={() => setFilter(option.value)}
                      className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                        filter === option.value
                          ? 'bg-indigo-500 text-white'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-700/50">
              {filteredElements.map(element => {
                const isExpanded = expandedElements.includes(element.elementNumber);
                const statusConfig = STATUS_CONFIG[element.status];
                const StatusIcon = statusConfig.icon;

                return (
                  <div key={element.elementNumber} className="transition-colors hover:bg-slate-800/30">
                    <button
                      onClick={() => toggleElement(element.elementNumber)}
                      className="w-full p-4 flex items-center gap-4 text-left"
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg ${
                        element.status === 'passing' ? 'bg-emerald-500/20 text-emerald-400' :
                        element.status === 'at-risk' ? 'bg-amber-500/20 text-amber-400' :
                        'bg-red-500/20 text-red-400'
                      }`}>
                        {element.elementNumber}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-white truncate pr-4">
                            {element.elementName}
                          </span>
                          <span className={`text-lg font-semibold ${
                            element.status === 'passing' ? 'text-emerald-400' :
                            element.status === 'at-risk' ? 'text-amber-400' :
                            'text-red-400'
                          }`}>
                            {element.percentage}%
                          </span>
                        </div>
                        <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-500 ${
                              element.status === 'passing' ? 'bg-emerald-500' :
                              element.status === 'at-risk' ? 'bg-amber-500' :
                              'bg-red-500'
                            }`}
                            style={{ width: `${element.percentage}%` }}
                          />
                        </div>
                        {element.gaps.length > 0 && (
                          <p className="text-xs text-slate-500 mt-1">
                            {element.gaps.filter(g => g.severity === 'critical').length} critical,{' '}
                            {element.gaps.filter(g => g.severity === 'major').length} major,{' '}
                            {element.gaps.filter(g => g.severity === 'minor').length} minor gaps
                          </p>
                        )}
                      </div>

                      <StatusIcon className={`w-5 h-5 ${
                        element.status === 'passing' ? 'text-emerald-400' :
                        element.status === 'at-risk' ? 'text-amber-400' :
                        'text-red-400'
                      }`} />

                      <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${
                        isExpanded ? 'rotate-180' : ''
                      }`} />
                    </button>

                    {isExpanded && (
                      <div className="px-4 pb-4 space-y-4 animate-in fade-in duration-200">
                        {/* Evidence summary */}
                        <div className="ml-14 p-3 bg-slate-800/50 rounded-lg">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-slate-400">
                              Evidence found: {element.evidenceCount} / {element.requirementCount} requirements met
                            </span>
                            <Link
                              href={`/admin/audit-dashboard/element/${element.elementNumber}`}
                              className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                            >
                              View Details
                              <ExternalLink className="w-3 h-3" />
                            </Link>
                          </div>
                        </div>

                        {/* Gaps for this element */}
                        {element.gaps.length > 0 && (
                          <div className="ml-14 space-y-2">
                            {element.gaps.map(gap => {
                              const config = SEVERITY_CONFIG[gap.severity];
                              return (
                                <div
                                  key={gap.id}
                                  className={`p-3 rounded-lg border ${config.bg} ${config.border}`}
                                >
                                  <div className="flex items-start justify-between">
                                    <div>
                                      <span className={`text-xs font-medium uppercase ${config.text}`}>
                                        {gap.severity}
                                      </span>
                                      <p className="text-sm text-white mt-1">{gap.title}</p>
                                      <p className="text-xs text-slate-400 mt-1">
                                        Action: {gap.actionItem}
                                      </p>
                                    </div>
                                    <span className="text-xs text-slate-500">{gap.estimatedTime}</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Critical Gaps Section */}
        {criticalGaps.length > 0 && (
          <Card className="bg-red-500/5 border-red-500/30 backdrop-blur mb-8">
            <CardHeader className="border-b border-red-500/20">
              <CardTitle className="text-xl text-red-400 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Critical Gaps ({criticalGaps.length}) — Must Fix Before Audit
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              {criticalGaps.map(gap => (
                <GapCard key={gap.id} gap={gap} severity="critical" />
              ))}
            </CardContent>
          </Card>
        )}

        {/* Major Gaps Section (Collapsible) */}
        {majorGaps.length > 0 && (
          <Card className="bg-orange-500/5 border-orange-500/30 backdrop-blur mb-8">
            <CardHeader className="border-b border-orange-500/20">
              <button
                onClick={() => setShowMajorGaps(!showMajorGaps)}
                className="w-full flex items-center justify-between"
              >
                <CardTitle className="text-xl text-orange-400 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  Major Gaps ({majorGaps.length})
                </CardTitle>
                <ChevronDown className={`w-5 h-5 text-orange-400 transition-transform ${
                  showMajorGaps ? 'rotate-180' : ''
                }`} />
              </button>
            </CardHeader>
            {showMajorGaps && (
              <CardContent className="p-4 space-y-4">
                {majorGaps.map(gap => (
                  <GapCard key={gap.id} gap={gap} severity="major" />
                ))}
              </CardContent>
            )}
          </Card>
        )}

        {/* Minor Gaps Section (Collapsible) */}
        {minorGaps.length > 0 && (
          <Card className="bg-blue-500/5 border-blue-500/30 backdrop-blur mb-8">
            <CardHeader className="border-b border-blue-500/20">
              <button
                onClick={() => setShowMinorGaps(!showMinorGaps)}
                className="w-full flex items-center justify-between"
              >
                <CardTitle className="text-xl text-blue-400 flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Minor Gaps ({minorGaps.length})
                </CardTitle>
                <ChevronDown className={`w-5 h-5 text-blue-400 transition-transform ${
                  showMinorGaps ? 'rotate-180' : ''
                }`} />
              </button>
            </CardHeader>
            {showMinorGaps && (
              <CardContent className="p-4 space-y-4">
                {minorGaps.map(gap => (
                  <GapCard key={gap.id} gap={gap} severity="minor" />
                ))}
              </CardContent>
            )}
          </Card>
        )}

        {/* Progress Timeline */}
        {timelineData && (
          <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur mb-8">
            <CardHeader className="border-b border-slate-700/50">
              <CardTitle className="text-xl text-white flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-indigo-400" />
                Progress Timeline
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-slate-700" />

                <div className="space-y-8">
                  {timelineData.timeline.milestones.map((milestone, index) => {
                    const isComplete = milestone.status === 'completed';
                    const isAtRisk = milestone.status === 'at_risk';

                    return (
                      <div key={milestone.id} className="relative pl-12">
                        {/* Timeline dot */}
                        <div className={`absolute left-2 w-5 h-5 rounded-full border-2 ${
                          isComplete
                            ? 'bg-emerald-500 border-emerald-500'
                            : isAtRisk
                            ? 'bg-amber-500 border-amber-500'
                            : 'bg-slate-900 border-slate-500'
                        } flex items-center justify-center`}>
                          {isComplete && <CheckCircle2 className="w-3 h-3 text-white" />}
                        </div>

                        <div className={`p-4 rounded-xl border ${
                          isComplete
                            ? 'bg-emerald-500/5 border-emerald-500/30'
                            : isAtRisk
                            ? 'bg-amber-500/5 border-amber-500/30'
                            : 'bg-slate-800/50 border-slate-700/50'
                        }`}>
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-semibold text-white">{milestone.name}</h4>
                            <span className="text-sm text-slate-400">
                              {new Date(milestone.date).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                              })}
                            </span>
                          </div>
                          <p className="text-sm text-slate-400">{milestone.description}</p>
                          <div className="flex flex-wrap gap-2 mt-3">
                            {milestone.tasks.map((task: string, i: number) => (
                              <span
                                key={i}
                                className={`px-2 py-1 text-xs rounded ${
                                  isComplete
                                    ? 'bg-emerald-500/20 text-emerald-400'
                                    : 'bg-slate-700 text-slate-300'
                                }`}
                              >
                                {task}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Actions */}
        <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur">
          <CardHeader className="border-b border-slate-700/50">
            <CardTitle className="text-xl text-white flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-400" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {/* Generate Action Plan - Primary Action */}
              <button
                onClick={handleGenerateActionPlan}
                disabled={generatingPlan || !data}
                className="flex flex-col items-center gap-3 p-4 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 hover:from-amber-500/30 hover:to-orange-500/30 border border-amber-500/50 hover:border-amber-400 transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="p-3 rounded-xl bg-amber-500/30 group-hover:bg-amber-500/40 transition-colors">
                  {generatingPlan ? (
                    <Loader2 className="w-6 h-6 text-amber-400 animate-spin" />
                  ) : (
                    <ClipboardList className="w-6 h-6 text-amber-400" />
                  )}
                </div>
                <span className="text-sm font-medium text-white">Generate Action Plan</span>
              </button>

              <Link
                href="/admin/action-plan"
                className="flex flex-col items-center gap-3 p-4 rounded-xl bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700/50 hover:border-amber-500/50 transition-all group"
              >
                <div className="p-3 rounded-xl bg-amber-500/20 group-hover:bg-amber-500/30 transition-colors">
                  <Target className="w-6 h-6 text-amber-400" />
                </div>
                <span className="text-sm font-medium text-white">View Action Plan</span>
              </Link>

              <Link
                href="/audit"
                className="flex flex-col items-center gap-3 p-4 rounded-xl bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700/50 hover:border-indigo-500/50 transition-all group"
              >
                <div className="p-3 rounded-xl bg-indigo-500/20 group-hover:bg-indigo-500/30 transition-colors">
                  <FileText className="w-6 h-6 text-indigo-400" />
                </div>
                <span className="text-sm font-medium text-white">Audit Package</span>
              </Link>

              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex flex-col items-center gap-3 p-4 rounded-xl bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700/50 hover:border-emerald-500/50 transition-all group disabled:opacity-50"
              >
                <div className="p-3 rounded-xl bg-emerald-500/20 group-hover:bg-emerald-500/30 transition-colors">
                  <RefreshCw className={`w-6 h-6 text-emerald-400 ${refreshing ? 'animate-spin' : ''}`} />
                </div>
                <span className="text-sm font-medium text-white">Refresh Scores</span>
              </button>

              <Link
                href="/admin/mock-audit"
                className="flex flex-col items-center gap-3 p-4 rounded-xl bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700/50 hover:border-cyan-500/50 transition-all group"
              >
                <div className="p-3 rounded-xl bg-cyan-500/20 group-hover:bg-cyan-500/30 transition-colors">
                  <MessageSquare className="w-6 h-6 text-cyan-400" />
                </div>
                <span className="text-sm font-medium text-white">Mock Audit</span>
              </Link>

              <Link
                href="/audit?tab=package"
                className="flex flex-col items-center gap-3 p-4 rounded-xl bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700/50 hover:border-purple-500/50 transition-all group"
              >
                <div className="p-3 rounded-xl bg-purple-500/20 group-hover:bg-purple-500/30 transition-colors">
                  <Download className="w-6 h-6 text-purple-400" />
                </div>
                <span className="text-sm font-medium text-white">Export Report</span>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Action Plan Generation Modal */}
        {generatingPlan && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl p-8 max-w-md w-full mx-4 text-center">
              <div className="w-16 h-16 rounded-full bg-amber-500/20 flex items-center justify-center mx-auto mb-6">
                <Sparkles className="w-8 h-8 text-amber-400 animate-pulse" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">
                Generating Action Plan
              </h3>
              <p className="text-slate-400 mb-6">
                {planGenerationStatus}
              </p>
              <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-amber-500 to-orange-500 animate-pulse" style={{ width: '60%' }} />
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

// Gap Card Component
function GapCard({ gap, severity }: { gap: Gap; severity: 'critical' | 'major' | 'minor' }) {
  // Safe: severity is a typed union literal ('critical' | 'major' | 'minor'), not user input
  // eslint-disable-next-line security/detect-object-injection
  const config = SEVERITY_CONFIG[severity];

  return (
    <div className={`p-4 rounded-xl border ${config.bg} ${config.border}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className={`px-2 py-0.5 text-xs font-medium rounded ${config.bg} ${config.text} border ${config.border}`}>
              Element {gap.elementNumber}
            </span>
            <span className={`px-2 py-0.5 text-xs font-medium uppercase rounded ${config.bg} ${config.text}`}>
              {severity}
            </span>
          </div>
          <h4 className="font-medium text-white">{gap.title}</h4>
          <p className="text-sm text-slate-400 mt-1">{gap.description}</p>
          <div className="mt-3 p-3 bg-slate-800/50 rounded-lg">
            <p className="text-sm">
              <span className="text-slate-500">Action Required:</span>{' '}
              <span className="text-white">{gap.actionItem}</span>
            </p>
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-sm text-slate-400">Effort</p>
          <p className="text-lg font-semibold text-white">{gap.estimatedTime}</p>
          <button className="mt-3 px-3 py-1.5 text-xs font-medium bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-400 rounded-lg transition-colors flex items-center gap-1">
            <Users className="w-3 h-3" />
            Assign
          </button>
        </div>
      </div>
    </div>
  );
}
