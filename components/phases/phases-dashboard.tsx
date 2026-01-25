'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

interface Prompt {
  id: string;
  prompt_number: number;
  title: string;
  description: string;
  prompt_type: string;
  required: boolean;
  display_order: number;
  progress: {
    status: string;
    started_at: string | null;
    completed_at: string | null;
  } | null;
}

interface Phase {
  id: string;
  phase_number: number;
  title: string;
  description: string;
  estimated_duration_days: number;
  display_order: number;
  progress: {
    status: string;
    started_at: string | null;
    completed_at: string | null;
  };
  prompts: Prompt[];
  completion_percentage: number;
}

interface PhasesDashboardProps {
  initialPhases?: Phase[];
  initialOverallProgress?: number;
}

export function PhasesDashboard({ initialPhases, initialOverallProgress }: PhasesDashboardProps) {
  const [phases, setPhases] = useState<Phase[]>(initialPhases || []);
  const [overallProgress, setOverallProgress] = useState(initialOverallProgress || 0);
  const [loading, setLoading] = useState(!initialPhases);

   
  useEffect(() => {
    if (!initialPhases) {
      fetchPhases();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Only fetch on mount when no SSR data
  }, []);

  const fetchPhases = async () => {
    try {
      const response = await fetch('/api/phases');
      const data = await response.json();
      setPhases(data.phases || []);
      setOverallProgress(data.overall_progress || 0);
    } catch (error) {
      console.error('Error fetching phases:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'in_progress':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'blocked':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        );
      case 'in_progress':
        return (
          <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        );
      case 'blocked':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        );
    }
  };

  const getCompletedPromptsCount = (phase: Phase) => {
    return phase.prompts.filter(p => p.progress?.status === 'completed').length;
  };

  const getTotalPromptsCount = (phase: Phase) => {
    return phase.prompts.filter(p => p.required).length;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="w-12 h-12 rounded-full border-4 border-[var(--primary)] border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overall Progress Card */}
      <div className="card bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-cyan-500/10 border-indigo-500/30">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold mb-2">COR Certification Progress</h2>
            <p className="text-[var(--muted)]">Track your progress through all 12 phases</p>
          </div>
          <div className="text-right">
            <div className="text-4xl font-bold text-[var(--primary)]">{overallProgress.toFixed(0)}%</div>
            <div className="text-sm text-[var(--muted)]">Complete</div>
          </div>
        </div>
        <Progress value={overallProgress} className="h-3" />
        <div className="mt-4 flex gap-4 text-sm">
          <div>
            <span className="text-[var(--muted)]">Phases Completed: </span>
            <span className="font-semibold">
              {phases.filter(p => p.progress.status === 'completed').length} / {phases.length}
            </span>
          </div>
          <div>
            <span className="text-[var(--muted)]">In Progress: </span>
            <span className="font-semibold">
              {phases.filter(p => p.progress.status === 'in_progress').length}
            </span>
          </div>
        </div>
      </div>

      {/* Phases Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {phases.map((phase) => {
          const completedPrompts = getCompletedPromptsCount(phase);
          const totalPrompts = getTotalPromptsCount(phase);
          const phaseProgress = totalPrompts > 0 ? (completedPrompts / totalPrompts) * 100 : 0;

          return (
            <Link
              key={phase.id}
              href={`/phases/${phase.id}`}
              className="card hover:border-[var(--primary)] transition-colors cursor-pointer group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center border ${getStatusColor(phase.progress.status)}`}>
                    {getStatusIcon(phase.progress.status)}
                  </div>
                  <div>
                    <div className="text-xs text-[var(--muted)] mb-1">Phase {phase.phase_number}</div>
                    <h3 className="font-semibold group-hover:text-[var(--primary)] transition-colors">
                      {phase.title}
                    </h3>
                  </div>
                </div>
              </div>

              {phase.description && (
                <p className="text-sm text-[var(--muted)] mb-4 line-clamp-2">
                  {phase.description}
                </p>
              )}

              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[var(--muted)]">Progress</span>
                  <span className="font-semibold">{phaseProgress.toFixed(0)}%</span>
                </div>
                <Progress value={phaseProgress} className="h-2" />
                <div className="flex items-center justify-between text-xs text-[var(--muted)]">
                  <span>{completedPrompts} of {totalPrompts} prompts completed</span>
                  {phase.estimated_duration_days && (
                    <span>~{phase.estimated_duration_days} days</span>
                  )}
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-[var(--border)] flex items-center justify-between">
                <Badge className={getStatusColor(phase.progress.status)}>
                  {phase.progress.status.replace('_', ' ')}
                </Badge>
                <svg className="w-4 h-4 text-[var(--muted)] group-hover:text-[var(--primary)] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
