'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  ChevronLeft,
  Shield,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileText,
  Clock,
  Target,
  Lightbulb,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ElementDetailProps {
  elementNumber: number;
  userRole: string;
}

interface RequirementDetail {
  id: string;
  description: string;
  evidenceType: string;
  frequency: string;
  minimumSamples: number;
  foundSamples: number;
  pointValue: number;
  earnedPoints: number;
  formCodes: string[];
  status: 'complete' | 'partial' | 'missing';
  evidence: {
    id: string;
    date: string;
    description: string;
    reference: string;
  }[];
  gap: {
    severity: string;
    description: string;
    actionRequired: string;
    estimatedHours: number;
  } | null;
}

interface ElementData {
  element: {
    number: number;
    name: string;
    maxPoints: number;
    earnedPoints: number;
    percentage: number;
    status: string;
    weight: number;
  };
  requirements: RequirementDetail[];
  gaps: any[];
  evidence: any[];
  summary: {
    totalRequirements: number;
    metRequirements: number;
    partialRequirements: number;
    missingRequirements: number;
    totalEvidence: number;
    criticalGaps: number;
    majorGaps: number;
    minorGaps: number;
  };
  advice: {
    status: string;
    message: string;
    priorityActions: string[];
  };
}

const STATUS_CONFIG = {
  complete: { icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' },
  partial: { icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30' },
  missing: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30' },
};

export function ElementDetailClient({ elementNumber, userRole }: ElementDetailProps) {
  const [data, setData] = useState<ElementData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchElementData = useCallback(async () => {
    try {
      const res = await fetch(`/api/audit/element/${elementNumber}`);
      if (res.ok) {
        const result = await res.json();
        setData(result);
      } else {
        setError('Failed to fetch element data');
      }
    } catch (err) {
      setError('An error occurred');
    } finally {
      setLoading(false);
    }
  }, [elementNumber]);

  useEffect(() => {
    fetchElementData();
  }, [fetchElementData]);

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
        <div className="max-w-5xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-12 bg-slate-800/50 rounded-lg w-1/3" />
            <div className="h-48 bg-slate-800/50 rounded-xl" />
            <div className="h-96 bg-slate-800/50 rounded-xl" />
          </div>
        </div>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">Error</h2>
          <p className="text-slate-400 mb-4">{error || 'Failed to load element data'}</p>
          <button onClick={fetchElementData} className="px-4 py-2 bg-indigo-500 text-white rounded-lg">
            Try Again
          </button>
        </div>
      </main>
    );
  }

  const { element, requirements, summary, advice } = data;

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <header className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Link
              href="/admin/audit-dashboard"
              className="p-2 rounded-lg bg-slate-800/50 hover:bg-slate-700/50 text-slate-400 hover:text-white transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-xl ${
                  element.percentage >= 80 ? 'bg-emerald-500/20 text-emerald-400' :
                  element.percentage >= 60 ? 'bg-amber-500/20 text-amber-400' :
                  'bg-red-500/20 text-red-400'
                }`}>
                  {element.number}
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white">{element.name}</h1>
                  <p className="text-slate-400">
                    Weight: {element.weight}x | {element.earnedPoints}/{element.maxPoints} points
                  </p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Score Overview */}
        <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur mb-8">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400 uppercase tracking-wider">Element Score</p>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className={`text-5xl font-bold ${
                    element.percentage >= 80 ? 'text-emerald-400' :
                    element.percentage >= 60 ? 'text-amber-400' : 'text-red-400'
                  }`}>
                    {element.percentage}%
                  </span>
                </div>
                <div className="mt-4 h-3 w-64 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${
                      element.percentage >= 80 ? 'bg-emerald-500' :
                      element.percentage >= 60 ? 'bg-amber-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${element.percentage}%` }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="p-4 bg-emerald-500/10 rounded-xl border border-emerald-500/30">
                  <p className="text-2xl font-bold text-emerald-400">{summary.metRequirements}</p>
                  <p className="text-xs text-slate-400">Complete</p>
                </div>
                <div className="p-4 bg-amber-500/10 rounded-xl border border-amber-500/30">
                  <p className="text-2xl font-bold text-amber-400">{summary.partialRequirements}</p>
                  <p className="text-xs text-slate-400">Partial</p>
                </div>
                <div className="p-4 bg-red-500/10 rounded-xl border border-red-500/30">
                  <p className="text-2xl font-bold text-red-400">{summary.missingRequirements}</p>
                  <p className="text-xs text-slate-400">Missing</p>
                </div>
                <div className="p-4 bg-indigo-500/10 rounded-xl border border-indigo-500/30">
                  <p className="text-2xl font-bold text-indigo-400">{summary.totalEvidence}</p>
                  <p className="text-xs text-slate-400">Evidence</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Advice Card */}
        <Card className={`mb-8 ${
          advice.status === 'excellent' ? 'bg-emerald-500/5 border-emerald-500/30' :
          advice.status === 'good' ? 'bg-blue-500/5 border-blue-500/30' :
          advice.status === 'needs_improvement' ? 'bg-amber-500/5 border-amber-500/30' :
          'bg-red-500/5 border-red-500/30'
        } backdrop-blur`}>
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-xl ${
                advice.status === 'excellent' ? 'bg-emerald-500/20' :
                advice.status === 'good' ? 'bg-blue-500/20' :
                advice.status === 'needs_improvement' ? 'bg-amber-500/20' :
                'bg-red-500/20'
              }`}>
                <Lightbulb className={`w-6 h-6 ${
                  advice.status === 'excellent' ? 'text-emerald-400' :
                  advice.status === 'good' ? 'text-blue-400' :
                  advice.status === 'needs_improvement' ? 'text-amber-400' :
                  'text-red-400'
                }`} />
              </div>
              <div>
                <h3 className="font-semibold text-white mb-1">Recommendation</h3>
                <p className="text-slate-300">{advice.message}</p>
                {advice.priorityActions.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm text-slate-400 mb-2">Priority Actions:</p>
                    <ul className="space-y-2">
                      {advice.priorityActions.map((action, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <Target className="w-4 h-4 text-indigo-400 mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-slate-300">{action}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Requirements List */}
        <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur">
          <CardHeader className="border-b border-slate-700/50">
            <CardTitle className="text-xl text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-400" />
              Requirements ({requirements.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-700/50">
              {requirements.map(req => {
                const config = STATUS_CONFIG[req.status];
                const StatusIcon = config.icon;

                return (
                  <div key={req.id} className="p-4 hover:bg-slate-800/30 transition-colors">
                    <div className="flex items-start gap-4">
                      <div className={`p-2 rounded-lg ${config.bg} ${config.border} border`}>
                        <StatusIcon className={`w-5 h-5 ${config.color}`} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-medium text-white">{req.description}</h4>
                            <div className="flex items-center gap-4 mt-1 text-xs text-slate-400">
                              <span>Type: {req.evidenceType}</span>
                              <span>Frequency: {req.frequency}</span>
                              <span>Samples: {req.foundSamples}/{req.minimumSamples}</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`font-semibold ${config.color}`}>
                              {req.earnedPoints}/{req.pointValue} pts
                            </p>
                          </div>
                        </div>

                        {/* Form codes */}
                        {req.formCodes.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {req.formCodes.map(code => (
                              <span
                                key={code}
                                className="px-2 py-1 text-xs bg-slate-800 rounded text-slate-300"
                              >
                                {code}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Evidence found */}
                        {req.evidence.length > 0 && (
                          <div className="mt-3 space-y-2">
                            <p className="text-xs text-slate-500 uppercase tracking-wider">Evidence Found:</p>
                            {req.evidence.slice(0, 3).map(e => (
                              <div
                                key={e.id}
                                className="flex items-center gap-2 p-2 bg-emerald-500/5 rounded-lg border border-emerald-500/20"
                              >
                                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                <span className="text-sm text-slate-300 flex-1">{e.description}</span>
                                <span className="text-xs text-slate-500">{new Date(e.date).toLocaleDateString()}</span>
                                <span className="text-xs text-slate-400">{e.reference}</span>
                              </div>
                            ))}
                            {req.evidence.length > 3 && (
                              <p className="text-xs text-slate-500">+{req.evidence.length - 3} more</p>
                            )}
                          </div>
                        )}

                        {/* Gap info */}
                        {req.gap && (
                          <div className={`mt-3 p-3 rounded-lg ${
                            req.gap.severity === 'critical' ? 'bg-red-500/10 border border-red-500/30' :
                            req.gap.severity === 'major' ? 'bg-orange-500/10 border border-orange-500/30' :
                            'bg-blue-500/10 border border-blue-500/30'
                          }`}>
                            <div className="flex items-start justify-between">
                              <div>
                                <span className={`text-xs font-medium uppercase ${
                                  req.gap.severity === 'critical' ? 'text-red-400' :
                                  req.gap.severity === 'major' ? 'text-orange-400' :
                                  'text-blue-400'
                                }`}>
                                  {req.gap.severity} Gap
                                </span>
                                <p className="text-sm text-white mt-1">{req.gap.description}</p>
                                <p className="text-xs text-slate-400 mt-1">
                                  Action: {req.gap.actionRequired}
                                </p>
                              </div>
                              <div className="flex items-center gap-1 text-slate-400">
                                <Clock className="w-3 h-3" />
                                <span className="text-xs">{req.gap.estimatedHours}h</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
