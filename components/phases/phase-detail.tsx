'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface Prompt {
  id: string;
  prompt_number: number;
  title: string;
  description: string;
  instructions: string | null;
  prompt_type: string;
  required: boolean;
  estimated_time_minutes: number | null;
  display_order: number;
  progress: {
    status: string;
    started_at: string | null;
    completed_at: string | null;
    completed_by: string | null;
    completion_data: any;
    completion_notes: string | null;
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
    completed_by: string | null;
    completion_notes: string | null;
  };
  prompts: Prompt[];
  completion_percentage: number;
}

interface PhaseDetailProps {
  phaseId: string;
  initialPhase?: Phase;
}

export function PhaseDetail({ phaseId, initialPhase }: PhaseDetailProps) {
  const [phase, setPhase] = useState<Phase | null>(initialPhase || null);
  const [loading, setLoading] = useState(!initialPhase);
  const [updating, setUpdating] = useState(false);
  const router = useRouter();

  const fetchPhase = useCallback(async () => {
    try {
      const response = await fetch(`/api/phases/${phaseId}`);
      const data = await response.json();
      setPhase(data.phase);
    } catch (error) {
      console.error('Error fetching phase:', error);
    } finally {
      setLoading(false);
    }
  }, [phaseId]);

  useEffect(() => {
    if (!initialPhase) {
      fetchPhase();
    }
  }, [initialPhase, fetchPhase]);

  const updatePromptStatus = async (promptId: string, status: string) => {
    setUpdating(true);
    try {
      const response = await fetch(`/api/phases/${phaseId}/prompts/${promptId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });

      if (response.ok) {
        // Refresh phase data
        await fetchPhase();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to update prompt');
      }
    } catch (error) {
      console.error('Error updating prompt:', error);
      alert('Failed to update prompt');
    } finally {
      setUpdating(false);
    }
  };

  const completePhase = async () => {
    if (!confirm('Are you sure you want to mark this phase as completed? All required prompts must be completed.')) {
      return;
    }

    setUpdating(true);
    try {
      const response = await fetch(`/api/phases/${phaseId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed' })
      });

      if (response.ok) {
        await fetchPhase();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to complete phase');
      }
    } catch (error) {
      console.error('Error completing phase:', error);
      alert('Failed to complete phase');
    } finally {
      setUpdating(false);
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
      case 'skipped':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return '✓';
      case 'in_progress':
        return '⟳';
      case 'skipped':
        return '⊘';
      default:
        return '○';
    }
  };

  const getPromptTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      task: 'Task',
      form: 'Form',
      upload: 'Upload',
      review: 'Review',
      approval: 'Approval'
    };
    // Safe: type is from prompt_type field in phase data
    // eslint-disable-next-line security/detect-object-injection
    return labels[type] || type;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="w-12 h-12 rounded-full border-4 border-[var(--primary)] border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!phase) {
    return (
      <div className="card p-8 text-center">
        <p className="text-[var(--muted)]">Phase not found</p>
      </div>
    );
  }

  const completedPrompts = phase.prompts.filter(p => p.progress?.status === 'completed').length;
  const totalPrompts = phase.prompts.filter(p => p.required).length;
  const canCompletePhase = completedPrompts === totalPrompts && phase.progress.status !== 'completed';

  return (
    <div className="space-y-6">
      {/* Phase Header */}
      <div className="card">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="text-sm text-[var(--muted)] mb-2">Phase {phase.phase_number} of 12</div>
            <h1 className="text-3xl font-bold mb-2">{phase.title}</h1>
            {phase.description && (
              <p className="text-[var(--muted)]">{phase.description}</p>
            )}
          </div>
          <Badge className={getStatusColor(phase.progress.status)}>
            {phase.progress.status.replace('_', ' ')}
          </Badge>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-[var(--muted)]">Overall Progress</span>
            <span className="font-semibold">{phase.completion_percentage.toFixed(0)}%</span>
          </div>
          <Progress value={phase.completion_percentage} className="h-3" />
          <div className="flex items-center justify-between text-xs text-[var(--muted)]">
            <span>{completedPrompts} of {totalPrompts} required prompts completed</span>
            {phase.estimated_duration_days && (
              <span>Estimated duration: {phase.estimated_duration_days} days</span>
            )}
          </div>
        </div>

        {canCompletePhase && (
          <div className="mt-6 pt-6 border-t border-[var(--border)]">
            <Button
              onClick={completePhase}
              disabled={updating}
              className="w-full"
            >
              {updating ? 'Completing...' : 'Mark Phase as Completed'}
            </Button>
          </div>
        )}
      </div>

      {/* Prompts List */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Prompts</h2>
        {phase.prompts.map((prompt) => {
          const isCompleted = prompt.progress?.status === 'completed';
          const isInProgress = prompt.progress?.status === 'in_progress';
          const isNotStarted = !prompt.progress || prompt.progress.status === 'not_started';

          return (
            <div
              key={prompt.id}
              className={`card ${isCompleted ? 'border-green-500/30' : isInProgress ? 'border-blue-500/30' : ''}`}
            >
              <div className="flex items-start gap-4">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center border flex-shrink-0 ${getStatusColor(prompt.progress?.status || 'not_started')}`}>
                  {getStatusIcon(prompt.progress?.status || 'not_started')}
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm text-[var(--muted)]">Prompt {prompt.prompt_number}</span>
                        <Badge variant="outline" className="text-xs">
                          {getPromptTypeLabel(prompt.prompt_type)}
                        </Badge>
                        {!prompt.required && (
                          <Badge variant="outline" className="text-xs">Optional</Badge>
                        )}
                      </div>
                      <h3 className="font-semibold mb-1">{prompt.title}</h3>
                      {prompt.description && (
                        <p className="text-sm text-[var(--muted)] mb-2">{prompt.description}</p>
                      )}
                      {prompt.instructions && (
                        <div className="mt-2 p-3 rounded-lg bg-[var(--background)] border border-[var(--border)]">
                          <p className="text-sm text-[var(--muted)]">{prompt.instructions}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {prompt.progress?.completed_at && (
                    <div className="mt-3 pt-3 border-t border-[var(--border)] text-xs text-[var(--muted)]">
                      Completed on {new Date(prompt.progress.completed_at).toLocaleDateString()}
                      {prompt.progress.completion_notes && (
                        <div className="mt-2">
                          <strong>Notes:</strong> {prompt.progress.completion_notes}
                        </div>
                      )}
                    </div>
                  )}

                  {prompt.estimated_time_minutes && (
                    <div className="mt-2 text-xs text-[var(--muted)]">
                      Estimated time: {prompt.estimated_time_minutes} minutes
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="mt-4 flex gap-2">
                    {isNotStarted && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updatePromptStatus(prompt.id, 'in_progress')}
                        disabled={updating}
                      >
                        Start
                      </Button>
                    )}
                    {isInProgress && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => updatePromptStatus(prompt.id, 'completed')}
                          disabled={updating}
                        >
                          Mark Complete
                        </Button>
                        {!prompt.required && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updatePromptStatus(prompt.id, 'skipped')}
                            disabled={updating}
                          >
                            Skip
                          </Button>
                        )}
                      </>
                    )}
                    {isCompleted && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updatePromptStatus(prompt.id, 'in_progress')}
                        disabled={updating}
                      >
                        Reopen
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
