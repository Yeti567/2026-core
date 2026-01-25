'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { SignaturePad } from '@/components/ui/signature-pad';
import { PhotoCapture } from '@/components/ui/photo-capture';
import { useNetworkStatus } from '@/hooks/use-network-status';
import { saveDraft, loadDraft, deleteDraft, submitForm, createAutoSave } from '@/lib/sync/form-submission';
import {
  EmergencyDrill,
  DrillType,
  NonParticipant,
  CorrectiveAction,
  ActionPriority,
  DRILL_TYPES,
  LEARNING_OBJECTIVES,
  SPECIFIC_ISSUES,
  TRAINING_NEEDS,
  ROLL_CALL_METHODS,
  OBSERVER_TYPES,
  EFFECTIVENESS_LEVELS,
  WIZARD_STEPS,
  getEmptyDrill,
  generateDrillNumber,
  calculateParticipationRate,
  calculateDuration,
  checkEvacuationTarget,
  getEffectivenessFromScore,
  PERFORMANCE_STANDARDS,
  NonParticipantReason,
  RollCallMethod,
} from './emergency-drill-types';

// Mock data - replace with actual data fetching
const MOCK_JOBSITES = [
  { id: 'site-1', name: 'Main Office Building' },
  { id: 'site-2', name: 'Warehouse A' },
  { id: 'site-3', name: 'Construction Site B' },
];

const MOCK_WORKERS = [
  { id: 'w-1', name: 'John Smith' },
  { id: 'w-2', name: 'Jane Doe' },
  { id: 'w-3', name: 'Mike Johnson' },
  { id: 'w-4', name: 'Sarah Williams' },
  { id: 'w-5', name: 'Robert Brown' },
  { id: 'w-6', name: 'Emily Davis' },
  { id: 'w-7', name: 'David Wilson' },
  { id: 'w-8', name: 'Lisa Anderson' },
];

const DRAFT_KEY = 'emergency-drill-draft';

export function EmergencyDrillForm() {
  const { isOnline } = useNetworkStatus();
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<EmergencyDrill>(getEmptyDrill());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showSuccess, setShowSuccess] = useState(false);
  const [stopwatchRunning, setStopwatchRunning] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const stopwatchRef = useRef<NodeJS.Timeout | null>(null);
  const autoSaveRef = useRef<ReturnType<typeof createAutoSave> | null>(null);

  // Initialize auto-save
  useEffect(() => {
    autoSaveRef.current = createAutoSave(DRAFT_KEY, 30000);
    const savedDraft = loadDraft(DRAFT_KEY);
    if (savedDraft?.data) {
      setFormData(savedDraft.data as EmergencyDrill);
    }
    return () => {
      if (stopwatchRef.current) clearInterval(stopwatchRef.current);
    };
  }, []);

  // Auto-save on form changes
  useEffect(() => {
    if (autoSaveRef.current && formData.id) {
      autoSaveRef.current.save({ ...formData, form_type: 'emergency_drill' });
    }
  }, [formData]);

  // Generate drill number on type change
  useEffect(() => {
    if (formData.drill_type && !formData.drill_number) {
      const sequence = Math.floor(Math.random() * 100) + 1;
      setFormData(prev => ({
        ...prev,
        id: `drill-${Date.now()}`,
        drill_number: generateDrillNumber(formData.drill_type, sequence),
      }));
    }
  }, [formData.drill_type, formData.drill_number]);

  // Calculate duration automatically
  useEffect(() => {
    if (formData.time_started && formData.time_ended) {
      const duration = calculateDuration(formData.time_started, formData.time_ended);
      setFormData(prev => ({ ...prev, duration_minutes: duration }));
    }
  }, [formData.time_started, formData.time_ended]);

  // Calculate participation rate
  useEffect(() => {
    const rate = calculateParticipationRate(formData.participants.length, formData.total_workers);
    setFormData(prev => ({ ...prev, participation_rate: rate }));
  }, [formData.participants.length, formData.total_workers]);

  // Stopwatch functions
  const startStopwatch = () => {
    setStopwatchRunning(true);
    setElapsedSeconds(0);
    stopwatchRef.current = setInterval(() => {
      setElapsedSeconds(prev => prev + 1);
    }, 1000);
  };

  const stopStopwatch = () => {
    setStopwatchRunning(false);
    if (stopwatchRef.current) {
      clearInterval(stopwatchRef.current);
      stopwatchRef.current = null;
    }
  };

  const formatStopwatch = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const updateFormData = useCallback((updates: Partial<EmergencyDrill>) => {
    setFormData(prev => ({ ...prev, ...updates, updated_at: new Date().toISOString() }));
  }, []);

  const updateObservations = useCallback((section: keyof EmergencyDrill['observations'], updates: Record<string, unknown>) => {
    setFormData(prev => ({
      ...prev,
      observations: {
        ...prev.observations,
        [section]: { ...prev.observations[section], ...updates },
      },
      updated_at: new Date().toISOString(),
    }));
  }, []);

  // Validation functions
  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    switch (step) {
      case 0: // Drill Information
        if (!formData.drill_type) newErrors.drill_type = 'Drill type is required';
        if (!formData.date) newErrors.date = 'Date is required';
        if (!formData.time_started) newErrors.time_started = 'Start time is required';
        if (!formData.time_ended) newErrors.time_ended = 'End time is required';
        if (!formData.jobsite_id) newErrors.jobsite_id = 'Jobsite is required';
        if (formData.announced === null) newErrors.announced = 'Please specify if drill was announced';
        break;
      case 1: // Participants
        if (formData.total_workers < 1) newErrors.total_workers = 'Total workers must be at least 1';
        if (formData.participants.length === 0) newErrors.participants = 'At least one participant is required';
        break;
      case 2: // Scenario
        if (!formData.scenario_description) newErrors.scenario_description = 'Scenario description is required';
        if (formData.learning_objectives.length === 0) newErrors.learning_objectives = 'At least one learning objective is required';
        break;
      case 9: // Debriefing
        if (formData.debriefing_held === null) newErrors.debriefing_held = 'Please indicate if debriefing was held';
        if (formData.debriefing_held && !formData.debriefing_date) newErrors.debriefing_date = 'Debriefing date is required';
        break;
      case 12: // Signatures
        if (!formData.coordinator_signature) newErrors.coordinator_signature = 'Coordinator signature is required';
        if (!formData.safety_manager_signature) newErrors.safety_manager_signature = 'Safety manager signature is required';
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const nextStep = () => {
    if (validateStep(currentStep) && currentStep < WIZARD_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
      window.scrollTo(0, 0);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      window.scrollTo(0, 0);
    }
  };

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) return;

    setIsSubmitting(true);
    try {
      const finalData = {
        ...formData,
        status: 'completed' as const,
        submitted_at: new Date().toISOString(),
        form_type: 'emergency_drill',
      };

      await submitForm(finalData);
      deleteDraft(DRAFT_KEY);
      setShowSuccess(true);

      // Check for alerts
      if (formData.participation_rate < PERFORMANCE_STANDARDS.minimumParticipationRate) {
        console.log('ALERT: Participation below 80% - supervisor notification required');
      }
      if (formData.effectiveness_score < PERFORMANCE_STANDARDS.poorPerformanceThreshold) {
        console.log('ALERT: Performance below 60% - immediate safety manager review required');
      }
    } catch (error) {
      console.error('Error submitting form:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleParticipant = (workerId: string, workerName: string) => {
    const exists = formData.participants.find(p => p.worker_id === workerId);
    if (exists) {
      updateFormData({
        participants: formData.participants.filter(p => p.worker_id !== workerId),
      });
    } else {
      updateFormData({
        participants: [...formData.participants, { worker_id: workerId, worker_name: workerName }],
      });
    }
  };

  const addNonParticipant = (workerId: string, workerName: string, reason: NonParticipantReason) => {
    const exists = formData.non_participants.find(p => p.worker_id === workerId);
    if (!exists) {
      updateFormData({
        non_participants: [...formData.non_participants, { worker_id: workerId, worker_name: workerName, reason }],
      });
    }
  };

  const addCorrectiveAction = () => {
    const newAction: CorrectiveAction = {
      id: `ca-${Date.now()}`,
      issue: '',
      root_cause: '',
      action: '',
      responsible_person_id: '',
      responsible_person_name: '',
      target_date: '',
      priority: 'medium',
      status: 'open',
    };
    updateFormData({
      corrective_actions: [...formData.corrective_actions, newAction],
    });
  };

  const updateCorrectiveAction = (id: string, updates: Partial<CorrectiveAction>) => {
    updateFormData({
      corrective_actions: formData.corrective_actions.map(ca =>
        ca.id === id ? { ...ca, ...updates } : ca
      ),
    });
  };

  const removeCorrectiveAction = (id: string) => {
    updateFormData({
      corrective_actions: formData.corrective_actions.filter(ca => ca.id !== id),
    });
  };

  const toggleLearningObjective = (objectiveId: string) => {
    const exists = formData.learning_objectives.includes(objectiveId);
    if (exists) {
      updateFormData({
        learning_objectives: formData.learning_objectives.filter(o => o !== objectiveId),
      });
    } else {
      updateFormData({
        learning_objectives: [...formData.learning_objectives, objectiveId],
      });
    }
  };

  const toggleSpecificIssue = (issueId: string) => {
    const exists = formData.specific_issues.includes(issueId);
    if (exists) {
      updateFormData({
        specific_issues: formData.specific_issues.filter(i => i !== issueId),
      });
    } else {
      updateFormData({
        specific_issues: [...formData.specific_issues, issueId],
      });
    }
  };

  const toggleTrainingNeed = (needId: string) => {
    const exists = formData.training_needs.includes(needId);
    if (exists) {
      updateFormData({
        training_needs: formData.training_needs.filter(n => n !== needId),
      });
    } else {
      updateFormData({
        training_needs: [...formData.training_needs, needId],
      });
    }
  };

  const addWentWell = (item: string) => {
    if (item.trim() && !formData.went_well.includes(item)) {
      updateFormData({ went_well: [...formData.went_well, item.trim()] });
    }
  };

  const removeWentWell = (index: number) => {
    updateFormData({ went_well: formData.went_well.filter((_, i) => i !== index) });
  };

  const addNeedsImprovement = (item: string) => {
    if (item.trim() && !formData.needs_improvement.includes(item)) {
      updateFormData({ needs_improvement: [...formData.needs_improvement, item.trim()] });
    }
  };

  const removeNeedsImprovement = (index: number) => {
    updateFormData({ needs_improvement: formData.needs_improvement.filter((_, i) => i !== index) });
  };

  // Calculate effectiveness score
  const calculateEffectivenessScore = (): number => {
    let score = 100;
    const obs = formData.observations;

    // Evacuation factors
    if (!obs.evacuation.alarm_audible) score -= 10;
    if (!obs.evacuation.workers_stopped_immediately) score -= 10;
    if (!obs.evacuation.proper_route) score -= 5;
    if (!obs.evacuation.met_target) score -= 15;

    // Assembly factors
    if (!obs.assembly.all_accounted) score -= 20;
    if (obs.assembly.headcount_time_minutes > 3) score -= 10;

    // Equipment factors
    if (!obs.equipment.extinguishers_accessible) score -= 10;
    if (!obs.equipment.exits_clear) score -= 10;
    if (!obs.equipment.communication_working) score -= 10;

    // Issue deductions
    score -= formData.specific_issues.length * 5;

    return Math.max(0, Math.min(100, score));
  };

  useEffect(() => {
    const score = calculateEffectivenessScore();
    const effectiveness = getEffectivenessFromScore(score);
    updateFormData({
      effectiveness_score: score,
      overall_effectiveness: effectiveness,
    });
  }, [formData.observations, formData.specific_issues]);

  if (showSuccess) {
    const drillConfig = DRILL_TYPES.find(t => t.value === formData.drill_type);
    const nextDrillDate = new Date(formData.date);
    nextDrillDate.setDate(nextDrillDate.getDate() + (drillConfig?.frequencyDays || 90));
    const nextDrillFormatted = nextDrillDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-900 via-teal-900 to-cyan-900 p-4 flex items-center justify-center">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 max-w-lg w-full text-center border border-white/20">
          <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Drill Documentation Complete!</h2>
          <p className="text-emerald-200 mb-4">Drill Number: {formData.drill_number}</p>
          
          <div className="bg-white/10 rounded-lg p-4 mb-4">
            <p className="text-white">Performance Score: <span className="font-bold text-2xl">{formData.effectiveness_score}%</span></p>
            <p className={`text-sm ${EFFECTIVENESS_LEVELS.find(e => e.value === formData.overall_effectiveness)?.color || 'text-white'}`}>
              {EFFECTIVENESS_LEVELS.find(e => e.value === formData.overall_effectiveness)?.label}
            </p>
          </div>

          {/* Notifications sent */}
          <div className="bg-white/5 rounded-lg p-4 mb-4 text-left">
            <p className="text-white/80 text-sm font-medium mb-2">📧 Notifications Sent:</p>
            <ul className="text-emerald-300 text-sm space-y-1">
              <li>✓ All {formData.participants.length} participants - drill summary</li>
              <li>✓ Management - performance report</li>
              {formData.effectiveness_score < 60 && (
                <li className="text-red-300">✓ Safety Manager & Directors - below standard alert</li>
              )}
            </ul>
          </div>

          {/* Dashboard update */}
          <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-4 mb-4">
            <p className="text-cyan-200 text-sm">📊 Dashboard Updated:</p>
            <p className="text-white font-medium">
              {drillConfig?.value === 'fire' ? '1/4 Fire Drills Q1 2025' : `1/1 ${drillConfig?.label} 2025`}
            </p>
            <p className="text-cyan-200/60 text-xs mt-1">Next {drillConfig?.label}: {nextDrillFormatted}</p>
          </div>

          {/* Corrective actions */}
          {formData.corrective_actions.length > 0 && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 mb-4 text-left">
              <p className="text-amber-200 text-sm font-medium">📋 Corrective Actions Tracked:</p>
              <p className="text-white">{formData.corrective_actions.length} action(s) assigned</p>
              <ul className="text-amber-200/80 text-xs mt-2 space-y-1">
                {formData.corrective_actions.slice(0, 3).map((action, idx) => (
                  <li key={idx}>• {action.issue.substring(0, 40)}{action.issue.length > 40 ? '...' : ''}</li>
                ))}
              </ul>
            </div>
          )}

          {formData.participation_rate < 80 && (
            <div className="bg-amber-500/20 border border-amber-500 rounded-lg p-3 mb-4">
              <p className="text-amber-200 text-sm">⚠️ Participation rate below 80% - supervisor has been notified</p>
            </div>
          )}
          {formData.effectiveness_score < 60 && (
            <div className="bg-red-500/20 border border-red-500 rounded-lg p-3 mb-4">
              <p className="text-red-200 text-sm">⚠️ Performance below standard - safety manager review required</p>
            </div>
          )}
          <button
            onClick={() => {
              setFormData(getEmptyDrill());
              setCurrentStep(0);
              setShowSuccess(false);
            }}
            className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            Start New Drill Documentation
          </button>
        </div>
      </div>
    );
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return renderDrillInfo();
      case 1:
        return renderParticipants();
      case 2:
        return renderScenario();
      case 3:
        return renderEvacuation();
      case 4:
        return renderAssembly();
      case 5:
        return renderEmergencyResponse();
      case 6:
        return renderEquipment();
      case 7:
        return renderEvaluation();
      case 8:
        return renderCorrectiveActions();
      case 9:
        return renderDebriefing();
      case 10:
        return renderTrainingNeeds();
      case 11:
        return renderEvidence();
      case 12:
        return renderSignatures();
      default:
        return null;
    }
  };

  const renderDrillInfo = () => (
    <div className="space-y-6">
      <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-4 mb-6">
        <p className="text-cyan-200 text-sm">
          <strong>COR Element 11:</strong> Emergency response drills must be documented with dates, participants, and outcomes.
          Fire drills are required quarterly; other emergency types annually.
        </p>
      </div>

      {formData.drill_number && (
        <div className="bg-white/5 rounded-lg p-3 text-center">
          <p className="text-white/60 text-sm">Drill Number</p>
          <p className="text-white font-mono text-xl">{formData.drill_number}</p>
        </div>
      )}

      <div>
        <label className="block text-white/80 text-sm font-medium mb-2">
          Drill Type <span className="text-red-400">*</span>
        </label>
        <select
          value={formData.drill_type}
          onChange={(e) => {
            const newType = e.target.value as DrillType;
            const sequence = Math.floor(Math.random() * 100) + 1;
            updateFormData({
              drill_type: newType,
              drill_number: generateDrillNumber(newType, sequence),
            });
          }}
          className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
        >
          {DRILL_TYPES.map(type => (
            <option key={type.value} value={type.value} className="bg-gray-800">
              {type.label} ({type.frequency})
            </option>
          ))}
        </select>
        {errors.drill_type && <p className="text-red-400 text-sm mt-1">{errors.drill_type}</p>}
      </div>

      {formData.drill_type === 'other' && (
        <div>
          <label className="block text-white/80 text-sm font-medium mb-2">
            Custom Drill Type <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={formData.custom_type || ''}
            onChange={(e) => updateFormData({ custom_type: e.target.value })}
            className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            placeholder="Specify drill type"
          />
        </div>
      )}

      <div>
        <label className="block text-white/80 text-sm font-medium mb-2">
          Date <span className="text-red-400">*</span>
        </label>
        <input
          type="date"
          value={formData.date}
          onChange={(e) => updateFormData({ date: e.target.value })}
          className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
        />
        {errors.date && <p className="text-red-400 text-sm mt-1">{errors.date}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-white/80 text-sm font-medium mb-2">
            Time Started <span className="text-red-400">*</span>
          </label>
          <input
            type="time"
            value={formData.time_started}
            onChange={(e) => updateFormData({ time_started: e.target.value })}
            className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />
          {errors.time_started && <p className="text-red-400 text-sm mt-1">{errors.time_started}</p>}
        </div>
        <div>
          <label className="block text-white/80 text-sm font-medium mb-2">
            Time Ended <span className="text-red-400">*</span>
          </label>
          <input
            type="time"
            value={formData.time_ended}
            onChange={(e) => updateFormData({ time_ended: e.target.value })}
            className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />
          {errors.time_ended && <p className="text-red-400 text-sm mt-1">{errors.time_ended}</p>}
        </div>
      </div>

      {formData.duration_minutes > 0 && (
        <div className="bg-white/5 rounded-lg p-3 text-center">
          <p className="text-white/60 text-sm">Duration</p>
          <p className="text-white font-semibold text-lg">{formData.duration_minutes} minutes</p>
        </div>
      )}

      <div>
        <label className="block text-white/80 text-sm font-medium mb-2">
          Announced Drill? <span className="text-red-400">*</span>
        </label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => updateFormData({ announced: true })}
            className={`p-4 rounded-lg border-2 transition-all ${
              formData.announced === true
                ? 'border-cyan-500 bg-cyan-500/20 text-white'
                : 'border-white/20 bg-white/5 text-white/60 hover:border-white/40'
            }`}
          >
            <span className="text-2xl mb-1">📢</span>
            <p className="font-medium">Yes - Announced</p>
            <p className="text-xs mt-1 opacity-60">Workers were notified</p>
          </button>
          <button
            type="button"
            onClick={() => updateFormData({ announced: false })}
            className={`p-4 rounded-lg border-2 transition-all ${
              formData.announced === false
                ? 'border-amber-500 bg-amber-500/20 text-white'
                : 'border-white/20 bg-white/5 text-white/60 hover:border-white/40'
            }`}
          >
            <span className="text-2xl mb-1">🤫</span>
            <p className="font-medium">No - Unannounced</p>
            <p className="text-xs mt-1 opacity-60">Tests real response</p>
          </button>
        </div>
        {errors.announced && <p className="text-red-400 text-sm mt-1">{errors.announced}</p>}
      </div>

      <div>
        <label className="block text-white/80 text-sm font-medium mb-2">
          Jobsite <span className="text-red-400">*</span>
        </label>
        <select
          value={formData.jobsite_id}
          onChange={(e) => {
            const site = MOCK_JOBSITES.find(s => s.id === e.target.value);
            updateFormData({
              jobsite_id: e.target.value,
              jobsite_name: site?.name || '',
            });
          }}
          className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
        >
          <option value="" className="bg-gray-800">Select jobsite</option>
          {MOCK_JOBSITES.map(site => (
            <option key={site.id} value={site.id} className="bg-gray-800">{site.name}</option>
          ))}
        </select>
        {errors.jobsite_id && <p className="text-red-400 text-sm mt-1">{errors.jobsite_id}</p>}
      </div>

      <div>
        <label className="block text-white/80 text-sm font-medium mb-2">
          Drill Coordinator
        </label>
        <input
          type="text"
          value={formData.coordinator_name}
          onChange={(e) => updateFormData({ coordinator_name: e.target.value })}
          className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-cyan-500"
          placeholder="Your name"
        />
      </div>
    </div>
  );

  const renderParticipants = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-white/80 text-sm font-medium mb-2">
          Total Workers on Site <span className="text-red-400">*</span>
        </label>
        <input
          type="number"
          min="1"
          value={formData.total_workers || ''}
          onChange={(e) => updateFormData({ total_workers: parseInt(e.target.value) || 0 })}
          className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
        />
        {errors.total_workers && <p className="text-red-400 text-sm mt-1">{errors.total_workers}</p>}
      </div>

      <div>
        <label className="block text-white/80 text-sm font-medium mb-2">
          Select Participants <span className="text-red-400">*</span>
        </label>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {MOCK_WORKERS.map(worker => {
            const isParticipant = formData.participants.some(p => p.worker_id === worker.id);
            return (
              <button
                key={worker.id}
                type="button"
                onClick={() => toggleParticipant(worker.id, worker.name)}
                className={`w-full p-3 rounded-lg border-2 text-left transition-all flex items-center justify-between ${
                  isParticipant
                    ? 'border-emerald-500 bg-emerald-500/20 text-white'
                    : 'border-white/20 bg-white/5 text-white/60 hover:border-white/40'
                }`}
              >
                <span>{worker.name}</span>
                {isParticipant && (
                  <svg className="w-5 h-5 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
        {errors.participants && <p className="text-red-400 text-sm mt-1">{errors.participants}</p>}
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white/5 rounded-lg p-4 text-center">
          <p className="text-white/60 text-sm">Participants</p>
          <p className="text-white font-bold text-2xl">{formData.participants.length}</p>
        </div>
        <div className="bg-white/5 rounded-lg p-4 text-center">
          <p className="text-white/60 text-sm">Total</p>
          <p className="text-white font-bold text-2xl">{formData.total_workers}</p>
        </div>
        <div className={`rounded-lg p-4 text-center ${
          formData.participation_rate >= 80 ? 'bg-emerald-500/20' : 'bg-red-500/20'
        }`}>
          <p className="text-white/60 text-sm">Rate</p>
          <p className="text-white font-bold text-2xl">{formData.participation_rate}%</p>
        </div>
      </div>

      {formData.participation_rate > 0 && formData.participation_rate < 80 && (
        <div className="bg-amber-500/20 border border-amber-500 rounded-lg p-4">
          <p className="text-amber-200 font-medium">⚠️ Participation below 80%</p>
          <p className="text-amber-200/80 text-sm mt-1">This will be flagged for management review</p>
        </div>
      )}

      <div>
        <label className="block text-white/80 text-sm font-medium mb-2">
          Non-Participants & Reasons
        </label>
        {MOCK_WORKERS.filter(w => !formData.participants.some(p => p.worker_id === w.id)).map(worker => {
          const nonParticipant = formData.non_participants.find(np => np.worker_id === worker.id);
          return (
            <div key={worker.id} className="flex items-center gap-2 mb-2">
              <span className="text-white/60 flex-1">{worker.name}</span>
              <select
                value={nonParticipant?.reason || ''}
                onChange={(e) => {
                  if (e.target.value) {
                    const existing = formData.non_participants.filter(np => np.worker_id !== worker.id);
                    updateFormData({
                      non_participants: [...existing, {
                        worker_id: worker.id,
                        worker_name: worker.name,
                        reason: e.target.value as NonParticipantReason,
                      }],
                    });
                  }
                }}
                className="bg-white/10 border border-white/20 rounded px-2 py-1 text-white text-sm focus:outline-none"
              >
                <option value="" className="bg-gray-800">Select reason</option>
                <option value="off_site" className="bg-gray-800">Off-site</option>
                <option value="on_break" className="bg-gray-800">On break</option>
                <option value="refused" className="bg-gray-800">Refused ⚠️</option>
                <option value="other" className="bg-gray-800">Other</option>
              </select>
            </div>
          );
        })}
      </div>

      <div>
        <label className="block text-white/80 text-sm font-medium mb-2">
          Observers Present
        </label>
        <div className="space-y-2">
          {OBSERVER_TYPES.map(observer => (
            <label key={observer.id} className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.observers.includes(observer.id)}
                onChange={(e) => {
                  if (e.target.checked) {
                    updateFormData({ observers: [...formData.observers, observer.id] });
                  } else {
                    updateFormData({ observers: formData.observers.filter(o => o !== observer.id) });
                  }
                }}
                className="w-5 h-5 rounded border-white/20 bg-white/10 text-cyan-500 focus:ring-cyan-500"
              />
              <span className="text-white">{observer.label}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );

  const renderScenario = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-white/80 text-sm font-medium mb-2">
          Scenario Description <span className="text-red-400">*</span>
        </label>
        <textarea
          value={formData.scenario_description}
          onChange={(e) => updateFormData({ scenario_description: e.target.value })}
          rows={4}
          className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-cyan-500"
          placeholder='Example: "Fire alarm activated - simulated electrical fire in storage room"'
        />
        {errors.scenario_description && <p className="text-red-400 text-sm mt-1">{errors.scenario_description}</p>}
      </div>

      <div>
        <label className="block text-white/80 text-sm font-medium mb-2">
          Learning Objectives <span className="text-red-400">*</span>
        </label>
        <div className="space-y-2">
          {LEARNING_OBJECTIVES.map(obj => (
            <label key={obj.id} className="flex items-center gap-3 cursor-pointer p-3 rounded-lg border border-white/10 hover:border-white/30 transition-colors">
              <input
                type="checkbox"
                checked={formData.learning_objectives.includes(obj.id)}
                onChange={() => toggleLearningObjective(obj.id)}
                className="w-5 h-5 rounded border-white/20 bg-white/10 text-cyan-500 focus:ring-cyan-500"
              />
              <span className="text-white">{obj.label}</span>
            </label>
          ))}
        </div>
        {errors.learning_objectives && <p className="text-red-400 text-sm mt-1">{errors.learning_objectives}</p>}
      </div>

      <div>
        <label className="block text-white/80 text-sm font-medium mb-2">
          Expected Response
        </label>
        <textarea
          value={formData.expected_response}
          onChange={(e) => updateFormData({ expected_response: e.target.value })}
          rows={4}
          className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-cyan-500"
          placeholder="What should workers do? Who should do what? Time targets?"
        />
      </div>
    </div>
  );

  const renderEvacuation = () => {
    const evac = formData.observations.evacuation;
    return (
      <div className="space-y-6">
        <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-4 mb-4">
          <p className="text-cyan-200 text-sm">
            <strong>Performance Target:</strong> Evacuation should complete within 5 minutes.
            Use the stopwatch to time the actual evacuation.
          </p>
        </div>

        {/* Stopwatch */}
        <div className="bg-white/5 rounded-lg p-6 text-center">
          <p className="text-white/60 text-sm mb-2">Evacuation Timer</p>
          <p className="text-white font-mono text-5xl mb-4">{formatStopwatch(elapsedSeconds)}</p>
          <div className="flex justify-center gap-3">
            {!stopwatchRunning ? (
              <button
                type="button"
                onClick={startStopwatch}
                className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-2 rounded-lg font-medium transition-colors"
              >
                ▶ Start
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  stopStopwatch();
                  const mins = Math.floor(elapsedSeconds / 60);
                  const secs = elapsedSeconds % 60;
                  updateObservations('evacuation', {
                    evacuation_time_minutes: mins,
                    evacuation_time_seconds: secs,
                    met_target: checkEvacuationTarget(mins, secs, evac.target_time_minutes, evac.target_time_seconds),
                  });
                }}
                className="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-lg font-medium transition-colors"
              >
                ⏹ Stop
              </button>
            )}
          </div>
        </div>

        <YesNoQuestion
          label="Alarm audible throughout site?"
          value={evac.alarm_audible}
          onChange={(val) => updateObservations('evacuation', { alarm_audible: val })}
        />

        <YesNoQuestion
          label="Workers stopped work immediately?"
          value={evac.workers_stopped_immediately}
          onChange={(val) => updateObservations('evacuation', { workers_stopped_immediately: val })}
        />

        {evac.workers_stopped_immediately === false && (
          <div className="bg-white/5 rounded-lg p-4 space-y-3">
            <label className="block text-white/80 text-sm font-medium">
              How many workers stopped immediately?
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min="0"
                max={formData.total_workers}
                value={Math.round((evac.workers_stopped_percentage / 100) * formData.total_workers) || ''}
                onChange={(e) => {
                  const stopped = parseInt(e.target.value) || 0;
                  const percentage = formData.total_workers > 0 
                    ? Math.round((stopped / formData.total_workers) * 100) 
                    : 0;
                  updateObservations('evacuation', { workers_stopped_percentage: percentage });
                }}
                className="w-20 bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
              <span className="text-white/60">of</span>
              <span className="text-white font-medium">{formData.total_workers}</span>
              <span className="text-white/60">workers</span>
              <span className={`ml-auto font-bold ${evac.workers_stopped_percentage >= 90 ? 'text-emerald-400' : evac.workers_stopped_percentage >= 75 ? 'text-yellow-400' : 'text-red-400'}`}>
                ({evac.workers_stopped_percentage}%)
              </span>
            </div>
          </div>
        )}

        <YesNoQuestion
          label="Workers proceeded to assembly point?"
          value={evac.proceeded_to_assembly}
          onChange={(val) => updateObservations('evacuation', { proceeded_to_assembly: val })}
        />

        <YesNoQuestion
          label="Workers took proper route?"
          value={evac.proper_route}
          onChange={(val) => updateObservations('evacuation', { proper_route: val })}
        />

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-white/80 text-sm font-medium mb-2">Evacuation Time</label>
            <div className="flex gap-2">
              <input
                type="number"
                min="0"
                value={evac.evacuation_time_minutes}
                onChange={(e) => {
                  const mins = parseInt(e.target.value) || 0;
                  updateObservations('evacuation', {
                    evacuation_time_minutes: mins,
                    met_target: checkEvacuationTarget(mins, evac.evacuation_time_seconds, evac.target_time_minutes, evac.target_time_seconds),
                  });
                }}
                className="w-20 bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                placeholder="min"
              />
              <span className="text-white self-center">:</span>
              <input
                type="number"
                min="0"
                max="59"
                value={evac.evacuation_time_seconds}
                onChange={(e) => {
                  const secs = parseInt(e.target.value) || 0;
                  updateObservations('evacuation', {
                    evacuation_time_seconds: secs,
                    met_target: checkEvacuationTarget(evac.evacuation_time_minutes, secs, evac.target_time_minutes, evac.target_time_seconds),
                  });
                }}
                className="w-20 bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                placeholder="sec"
              />
            </div>
          </div>
          <div>
            <label className="block text-white/80 text-sm font-medium mb-2">Target Time</label>
            <div className="flex gap-2">
              <input
                type="number"
                min="0"
                value={evac.target_time_minutes}
                onChange={(e) => {
                  const mins = parseInt(e.target.value) || 0;
                  updateObservations('evacuation', {
                    target_time_minutes: mins,
                    met_target: checkEvacuationTarget(evac.evacuation_time_minutes, evac.evacuation_time_seconds, mins, evac.target_time_seconds),
                  });
                }}
                className="w-20 bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
              <span className="text-white self-center">:</span>
              <input
                type="number"
                min="0"
                max="59"
                value={evac.target_time_seconds}
                onChange={(e) => {
                  const secs = parseInt(e.target.value) || 0;
                  updateObservations('evacuation', {
                    target_time_seconds: secs,
                    met_target: checkEvacuationTarget(evac.evacuation_time_minutes, evac.evacuation_time_seconds, evac.target_time_minutes, secs),
                  });
                }}
                className="w-20 bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>
          </div>
        </div>

        {evac.met_target !== null && (
          <div className={`p-4 rounded-lg ${evac.met_target ? 'bg-emerald-500/20 border border-emerald-500' : 'bg-red-500/20 border border-red-500'}`}>
            <p className={`font-medium ${evac.met_target ? 'text-emerald-200' : 'text-red-200'}`}>
              {evac.met_target ? '✓ Met evacuation target' : '✗ Did not meet evacuation target'}
            </p>
          </div>
        )}
      </div>
    );
  };

  const renderAssembly = () => {
    const assembly = formData.observations.assembly;
    return (
      <div className="space-y-6">
        <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-4 mb-4">
          <p className="text-cyan-200 text-sm">
            <strong>Performance Target:</strong> Headcount should complete within 3 minutes. 100% accountability is mandatory.
          </p>
        </div>

        <YesNoQuestion
          label="All workers accounted for?"
          value={assembly.all_accounted}
          onChange={(val) => updateObservations('assembly', { all_accounted: val })}
          required
        />

        {assembly.all_accounted === false && (
          <div className="bg-red-500/20 border border-red-500 rounded-lg p-4">
            <p className="text-red-200 font-medium">⚠️ Critical: 100% accountability is required!</p>
          </div>
        )}

        <div>
          <label className="block text-white/80 text-sm font-medium mb-2">Time to Complete Headcount</label>
          <div className="flex gap-2 items-center">
            <input
              type="number"
              min="0"
              value={assembly.headcount_time_minutes}
              onChange={(e) => updateObservations('assembly', { headcount_time_minutes: parseInt(e.target.value) || 0 })}
              className="w-20 bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
            <span className="text-white">:</span>
            <input
              type="number"
              min="0"
              max="59"
              value={assembly.headcount_time_seconds}
              onChange={(e) => updateObservations('assembly', { headcount_time_seconds: parseInt(e.target.value) || 0 })}
              className="w-20 bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
            <span className="text-white/60">(Target: 3:00)</span>
          </div>
        </div>

        <div>
          <label className="block text-white/80 text-sm font-medium mb-2">Roll Call Method Used</label>
          <select
            value={assembly.roll_call_method}
            onChange={(e) => updateObservations('assembly', { roll_call_method: e.target.value as RollCallMethod })}
            className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
          >
            <option value="" className="bg-gray-800">Select method</option>
            {ROLL_CALL_METHODS.map(method => (
              <option key={method.value} value={method.value} className="bg-gray-800">{method.label}</option>
            ))}
          </select>
        </div>

        <YesNoQuestion
          label="Missing workers identified?"
          value={assembly.missing_workers_identified}
          onChange={(val) => updateObservations('assembly', { missing_workers_identified: val })}
        />

        {assembly.missing_workers_identified === true && (
          <YesNoQuestion
            label="Search initiated for missing workers?"
            value={assembly.search_initiated}
            onChange={(val) => updateObservations('assembly', { search_initiated: val })}
          />
        )}
      </div>
    );
  };

  const renderEmergencyResponse = () => {
    const comm = formData.observations.communication;
    const firstAid = formData.observations.first_aid;
    const spill = formData.observations.spill;

    return (
      <div className="space-y-8">
        {/* Communication */}
        <div>
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <span className="text-2xl">📞</span> Emergency Communication
          </h3>
          <div className="space-y-4">
            <YesNoQuestion
              label="Emergency contact list available?"
              value={comm.contact_list_available}
              onChange={(val) => updateObservations('communication', { contact_list_available: val })}
            />
            <YesNoQuestion
              label="911 call simulated/made?"
              value={comm.emergency_call_made}
              onChange={(val) => updateObservations('communication', { emergency_call_made: val })}
            />
            <YesNoQuestion
              label="Client notified?"
              value={comm.client_notified}
              onChange={(val) => updateObservations('communication', { client_notified: val })}
            />
            {comm.emergency_call_made === true && (
              <div>
                <label className="block text-white/80 text-sm font-medium mb-2">
                  Emergency Services Arrival Time (minutes, if real)
                </label>
                <input
                  type="number"
                  min="0"
                  value={comm.emergency_services_arrival_minutes || ''}
                  onChange={(e) => updateObservations('communication', { emergency_services_arrival_minutes: parseInt(e.target.value) || undefined })}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>
            )}
          </div>
        </div>

        {/* First Aid */}
        <div>
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <span className="text-2xl">🏥</span> First Aid Response
          </h3>
          <label className="flex items-center gap-3 cursor-pointer mb-4">
            <input
              type="checkbox"
              checked={firstAid.applicable}
              onChange={(e) => updateObservations('first_aid', { applicable: e.target.checked })}
              className="w-5 h-5 rounded border-white/20 bg-white/10 text-cyan-500 focus:ring-cyan-500"
            />
            <span className="text-white">First aid response was part of this drill</span>
          </label>
          {firstAid.applicable && (
            <div className="space-y-4 pl-4 border-l-2 border-cyan-500/30">
              <YesNoQuestion
                label="First aid attendant responded?"
                value={firstAid.attendant_responded}
                onChange={(val) => updateObservations('first_aid', { attendant_responded: val })}
              />
              <div>
                <label className="block text-white/80 text-sm font-medium mb-2">Response Time (minutes)</label>
                <input
                  type="number"
                  min="0"
                  value={firstAid.response_time_minutes || ''}
                  onChange={(e) => updateObservations('first_aid', { response_time_minutes: parseInt(e.target.value) || 0 })}
                  className="w-32 bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>
              <YesNoQuestion
                label="First aid kit accessible?"
                value={firstAid.kit_accessible}
                onChange={(val) => updateObservations('first_aid', { kit_accessible: val })}
              />
              <YesNoQuestion
                label="AED available?"
                value={firstAid.aed_available}
                onChange={(val) => updateObservations('first_aid', { aed_available: val })}
              />
              <YesNoQuestion
                label="Treatment simulated correctly?"
                value={firstAid.treatment_correct}
                onChange={(val) => updateObservations('first_aid', { treatment_correct: val })}
              />
            </div>
          )}
        </div>

        {/* Spill Response */}
        <div>
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <span className="text-2xl">☣️</span> Spill Response
          </h3>
          <label className="flex items-center gap-3 cursor-pointer mb-4">
            <input
              type="checkbox"
              checked={spill.applicable}
              onChange={(e) => updateObservations('spill', { applicable: e.target.checked })}
              className="w-5 h-5 rounded border-white/20 bg-white/10 text-cyan-500 focus:ring-cyan-500"
            />
            <span className="text-white">Spill response was part of this drill</span>
          </label>
          {spill.applicable && (
            <div className="space-y-4 pl-4 border-l-2 border-amber-500/30">
              <YesNoQuestion
                label="Spill kit available?"
                value={spill.spill_kit_available}
                onChange={(val) => updateObservations('spill', { spill_kit_available: val })}
              />
              <YesNoQuestion
                label="Containment procedures followed?"
                value={spill.containment_followed}
                onChange={(val) => updateObservations('spill', { containment_followed: val })}
              />
              <YesNoQuestion
                label="SDS consulted?"
                value={spill.sds_consulted}
                onChange={(val) => updateObservations('spill', { sds_consulted: val })}
              />
              <YesNoQuestion
                label="Proper PPE used?"
                value={spill.proper_ppe}
                onChange={(val) => updateObservations('spill', { proper_ppe: val })}
              />
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderEquipment = () => {
    const equip = formData.observations.equipment;
    return (
      <div className="space-y-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <span className="text-2xl">🔧</span> Equipment & Resources Check
        </h3>

        <YesNoQuestion
          label="Fire extinguishers accessible?"
          value={equip.extinguishers_accessible}
          onChange={(val) => updateObservations('equipment', { extinguishers_accessible: val })}
        />

        <YesNoQuestion
          label="Emergency exits clear?"
          value={equip.exits_clear}
          onChange={(val) => updateObservations('equipment', { exits_clear: val })}
        />

        <YesNoQuestion
          label="Lighting adequate?"
          value={equip.lighting_adequate}
          onChange={(val) => updateObservations('equipment', { lighting_adequate: val })}
        />

        <YesNoQuestion
          label="Communication devices working?"
          value={equip.communication_working}
          onChange={(val) => updateObservations('equipment', { communication_working: val })}
        />

        <YesNoQuestion
          label="Emergency supplies available?"
          value={equip.emergency_supplies_available}
          onChange={(val) => updateObservations('equipment', { emergency_supplies_available: val })}
        />

        {(equip.extinguishers_accessible === false || 
          equip.exits_clear === false || 
          equip.communication_working === false) && (
          <div className="bg-red-500/20 border border-red-500 rounded-lg p-4">
            <p className="text-red-200 font-medium">⚠️ Equipment issues detected!</p>
            <p className="text-red-200/80 text-sm mt-1">Immediate maintenance request will be generated upon submission.</p>
          </div>
        )}
      </div>
    );
  };

  const renderEvaluation = () => {
    const [newWentWell, setNewWentWell] = useState('');
    const [newNeedsImprovement, setNewNeedsImprovement] = useState('');

    return (
      <div className="space-y-6">
        <div className="bg-white/5 rounded-lg p-6 text-center">
          <p className="text-white/60 text-sm mb-2">Performance Score</p>
          <p className={`text-5xl font-bold ${
            formData.effectiveness_score >= 90 ? 'text-emerald-400' :
            formData.effectiveness_score >= 75 ? 'text-blue-400' :
            formData.effectiveness_score >= 60 ? 'text-yellow-400' : 'text-red-400'
          }`}>
            {formData.effectiveness_score}%
          </p>
          <p className={`text-sm mt-2 ${
            EFFECTIVENESS_LEVELS.find(e => e.value === formData.overall_effectiveness)?.color || 'text-white'
          }`}>
            {EFFECTIVENESS_LEVELS.find(e => e.value === formData.overall_effectiveness)?.label || 'Calculating...'}
          </p>
        </div>

        <div>
          <label className="block text-white/80 text-sm font-medium mb-2">
            What Went Well (list 3-5 items)
          </label>
          <div className="space-y-2 mb-3">
            {formData.went_well.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2 bg-emerald-500/20 rounded-lg p-2">
                <span className="text-emerald-200 flex-1">{item}</span>
                <button type="button" onClick={() => removeWentWell(idx)} className="text-emerald-300 hover:text-red-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={newWentWell}
              onChange={(e) => setNewWentWell(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newWentWell) {
                  addWentWell(newWentWell);
                  setNewWentWell('');
                }
              }}
              className="flex-1 bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              placeholder="Add positive observation..."
            />
            <button
              type="button"
              onClick={() => {
                if (newWentWell) {
                  addWentWell(newWentWell);
                  setNewWentWell('');
                }
              }}
              className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Add
            </button>
          </div>
        </div>

        <div>
          <label className="block text-white/80 text-sm font-medium mb-2">
            What Needs Improvement (list 3-5 items)
          </label>
          <div className="space-y-2 mb-3">
            {formData.needs_improvement.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2 bg-amber-500/20 rounded-lg p-2">
                <span className="text-amber-200 flex-1">{item}</span>
                <button type="button" onClick={() => removeNeedsImprovement(idx)} className="text-amber-300 hover:text-red-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={newNeedsImprovement}
              onChange={(e) => setNewNeedsImprovement(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newNeedsImprovement) {
                  addNeedsImprovement(newNeedsImprovement);
                  setNewNeedsImprovement('');
                }
              }}
              className="flex-1 bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              placeholder="Add area for improvement..."
            />
            <button
              type="button"
              onClick={() => {
                if (newNeedsImprovement) {
                  addNeedsImprovement(newNeedsImprovement);
                  setNewNeedsImprovement('');
                }
              }}
              className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Add
            </button>
          </div>
        </div>

        <div>
          <label className="block text-white/80 text-sm font-medium mb-2">
            Specific Issues Observed
          </label>
          <div className="space-y-2">
            {SPECIFIC_ISSUES.map(issue => (
              <label key={issue.id} className="flex items-center gap-3 cursor-pointer p-3 rounded-lg border border-white/10 hover:border-red-500/30 transition-colors">
                <input
                  type="checkbox"
                  checked={formData.specific_issues.includes(issue.id)}
                  onChange={() => toggleSpecificIssue(issue.id)}
                  className="w-5 h-5 rounded border-white/20 bg-white/10 text-red-500 focus:ring-red-500"
                />
                <span className="text-white">{issue.label}</span>
              </label>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderCorrectiveActions = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-white">Corrective Actions</h3>
        <button
          type="button"
          onClick={addCorrectiveAction}
          className="bg-cyan-500 hover:bg-cyan-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          + Add Action
        </button>
      </div>

      {formData.corrective_actions.length === 0 ? (
        <div className="text-center py-8 text-white/60">
          <p>No corrective actions added yet.</p>
          <p className="text-sm mt-1">Click "Add Action" to document issues and their remediation.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {formData.corrective_actions.map((action, idx) => (
            <div key={action.id} className="bg-white/5 rounded-lg p-4 border border-white/10">
              <div className="flex justify-between items-start mb-4">
                <h4 className="text-white font-medium">Action #{idx + 1}</h4>
                <button
                  type="button"
                  onClick={() => removeCorrectiveAction(action.id)}
                  className="text-white/40 hover:text-red-400 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-white/60 text-sm mb-1">Issue</label>
                  <input
                    type="text"
                    value={action.issue}
                    onChange={(e) => updateCorrectiveAction(action.id, { issue: e.target.value })}
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    placeholder="Describe the issue"
                  />
                </div>

                <div>
                  <label className="block text-white/60 text-sm mb-1">Root Cause</label>
                  <input
                    type="text"
                    value={action.root_cause}
                    onChange={(e) => updateCorrectiveAction(action.id, { root_cause: e.target.value })}
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    placeholder="Why did this happen?"
                  />
                </div>

                <div>
                  <label className="block text-white/60 text-sm mb-1">Corrective Action</label>
                  <textarea
                    value={action.action}
                    onChange={(e) => updateCorrectiveAction(action.id, { action: e.target.value })}
                    rows={2}
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    placeholder="What will be done to address this?"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-white/60 text-sm mb-1">Responsible Person</label>
                    <select
                      value={action.responsible_person_id}
                      onChange={(e) => {
                        const worker = MOCK_WORKERS.find(w => w.id === e.target.value);
                        updateCorrectiveAction(action.id, {
                          responsible_person_id: e.target.value,
                          responsible_person_name: worker?.name || '',
                        });
                      }}
                      className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    >
                      <option value="" className="bg-gray-800">Select person</option>
                      {MOCK_WORKERS.map(w => (
                        <option key={w.id} value={w.id} className="bg-gray-800">{w.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-white/60 text-sm mb-1">Target Date</label>
                    <input
                      type="date"
                      value={action.target_date}
                      onChange={(e) => updateCorrectiveAction(action.id, { target_date: e.target.value })}
                      className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-white/60 text-sm mb-1">Priority</label>
                  <div className="flex gap-2">
                    {(['low', 'medium', 'high'] as ActionPriority[]).map(priority => (
                      <button
                        key={priority}
                        type="button"
                        onClick={() => updateCorrectiveAction(action.id, { priority })}
                        className={`flex-1 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
                          action.priority === priority
                            ? priority === 'high' ? 'border-red-500 bg-red-500/20 text-red-200' :
                              priority === 'medium' ? 'border-amber-500 bg-amber-500/20 text-amber-200' :
                              'border-emerald-500 bg-emerald-500/20 text-emerald-200'
                            : 'border-white/20 bg-white/5 text-white/60 hover:border-white/40'
                        }`}
                      >
                        {priority.charAt(0).toUpperCase() + priority.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderDebriefing = () => (
    <div className="space-y-6">
      <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-4">
        <p className="text-cyan-200 text-sm">
          <strong>COR Requirement:</strong> Post-drill debriefing must be documented for audit compliance.
        </p>
      </div>

      <YesNoQuestion
        label="Debriefing held?"
        value={formData.debriefing_held}
        onChange={(val) => updateFormData({ debriefing_held: val })}
        required
      />
      {errors.debriefing_held && <p className="text-red-400 text-sm">{errors.debriefing_held}</p>}

      {formData.debriefing_held && (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-white/80 text-sm font-medium mb-2">
                Debriefing Date <span className="text-red-400">*</span>
              </label>
              <input
                type="date"
                value={formData.debriefing_date}
                onChange={(e) => updateFormData({ debriefing_date: e.target.value })}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
              {errors.debriefing_date && <p className="text-red-400 text-sm mt-1">{errors.debriefing_date}</p>}
            </div>
            <div>
              <label className="block text-white/80 text-sm font-medium mb-2">Time</label>
              <input
                type="time"
                value={formData.debriefing_time}
                onChange={(e) => updateFormData({ debriefing_time: e.target.value })}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-white/80 text-sm font-medium mb-2">Who Attended Debriefing?</label>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {formData.participants.map(p => (
                <label key={p.worker_id} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.debriefing_attendees.some(a => a.worker_id === p.worker_id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        updateFormData({
                          debriefing_attendees: [...formData.debriefing_attendees, { worker_id: p.worker_id, worker_name: p.worker_name }],
                        });
                      } else {
                        updateFormData({
                          debriefing_attendees: formData.debriefing_attendees.filter(a => a.worker_id !== p.worker_id),
                        });
                      }
                    }}
                    className="w-5 h-5 rounded border-white/20 bg-white/10 text-cyan-500 focus:ring-cyan-500"
                  />
                  <span className="text-white">{p.worker_name}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-white/80 text-sm font-medium mb-2">Key Points Discussed</label>
            <textarea
              value={formData.key_points}
              onChange={(e) => updateFormData({ key_points: e.target.value })}
              rows={3}
              className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              placeholder="Main topics covered in the debriefing..."
            />
          </div>

          <div>
            <label className="block text-white/80 text-sm font-medium mb-2">Worker Feedback</label>
            <textarea
              value={formData.worker_feedback}
              onChange={(e) => updateFormData({ worker_feedback: e.target.value })}
              rows={3}
              className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              placeholder="What did workers say? Concerns raised? Suggestions?"
            />
          </div>

          <div>
            <label className="block text-white/80 text-sm font-medium mb-2">Lessons Learned</label>
            <textarea
              value={formData.lessons_learned}
              onChange={(e) => updateFormData({ lessons_learned: e.target.value })}
              rows={3}
              className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              placeholder="Key takeaways and improvements identified..."
            />
          </div>
        </>
      )}
    </div>
  );

  const renderTrainingNeeds = () => (
    <div className="space-y-6">
      <YesNoQuestion
        label="Additional training required based on drill results?"
        value={formData.training_required}
        onChange={(val) => updateFormData({ training_required: val })}
      />

      {formData.training_required && (
        <>
          <div>
            <label className="block text-white/80 text-sm font-medium mb-2">Training Needs Identified</label>
            <div className="space-y-2">
              {TRAINING_NEEDS.map(need => (
                <label key={need.id} className="flex items-center gap-3 cursor-pointer p-3 rounded-lg border border-white/10 hover:border-cyan-500/30 transition-colors">
                  <input
                    type="checkbox"
                    checked={formData.training_needs.includes(need.id)}
                    onChange={() => toggleTrainingNeed(need.id)}
                    className="w-5 h-5 rounded border-white/20 bg-white/10 text-cyan-500 focus:ring-cyan-500"
                  />
                  <span className="text-white">{need.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-white/80 text-sm font-medium mb-2">Other Training Need</label>
            <input
              type="text"
              value={formData.other_training_need || ''}
              onChange={(e) => updateFormData({ other_training_need: e.target.value })}
              className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              placeholder="Specify other training needed..."
            />
          </div>

          <YesNoQuestion
            label="Training scheduled?"
            value={formData.training_scheduled}
            onChange={(val) => updateFormData({ training_scheduled: val })}
          />

          {formData.training_scheduled && (
            <div>
              <label className="block text-white/80 text-sm font-medium mb-2">Training Date</label>
              <input
                type="date"
                value={formData.training_date || ''}
                onChange={(e) => updateFormData({ training_date: e.target.value })}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>
          )}
        </>
      )}
    </div>
  );

  const renderEvidence = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-white/80 text-sm font-medium mb-2">Photos During Drill (max 10)</label>
        <p className="text-white/60 text-sm mb-4">Assembly point, evacuation routes, equipment used, issues observed</p>
        <PhotoCapture
          photos={formData.photos}
          maxPhotos={10}
          onPhotosChange={(photos) => updateFormData({ photos })}
        />
      </div>

      <YesNoQuestion
        label="Video recording made?"
        value={formData.video_recorded}
        onChange={(val) => updateFormData({ video_recorded: val })}
      />

      <div>
        <label className="block text-white/80 text-sm font-medium mb-2">Sign-in Sheet Photo (if used)</label>
        <PhotoCapture
          photos={formData.signin_sheet_photo ? [formData.signin_sheet_photo] : []}
          maxPhotos={1}
          onPhotosChange={(photos) => updateFormData({ signin_sheet_photo: photos[0] || '' })}
        />
      </div>
    </div>
  );

  // Calculate next drill due date
  const getNextDrillDue = () => {
    if (!formData.date) return '';
    const drillDate = new Date(formData.date);
    const drillConfig = DRILL_TYPES.find(t => t.value === formData.drill_type);
    const daysToAdd = drillConfig?.frequencyDays || 90;
    drillDate.setDate(drillDate.getDate() + daysToAdd);
    return drillDate.toISOString().split('T')[0];
  };

  const renderSignatures = () => {
    const nextDrillDue = getNextDrillDue();
    const drillConfig = DRILL_TYPES.find(t => t.value === formData.drill_type);
    
    return (
    <div className="space-y-6">
      <div className="bg-white/5 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Drill Summary</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div><span className="text-white/60">Drill Number:</span> <span className="text-white ml-2">{formData.drill_number}</span></div>
          <div><span className="text-white/60">Type:</span> <span className="text-white ml-2">{DRILL_TYPES.find(t => t.value === formData.drill_type)?.label}</span></div>
          <div><span className="text-white/60">Date:</span> <span className="text-white ml-2">{formData.date}</span></div>
          <div><span className="text-white/60">Duration:</span> <span className="text-white ml-2">{formData.duration_minutes} minutes</span></div>
          <div><span className="text-white/60">Participants:</span> <span className="text-white ml-2">{formData.participants.length} / {formData.total_workers}</span></div>
          <div><span className="text-white/60">Participation Rate:</span> <span className={`ml-2 ${formData.participation_rate >= 80 ? 'text-emerald-400' : 'text-red-400'}`}>{formData.participation_rate}%</span></div>
          <div><span className="text-white/60">Performance Score:</span> <span className={`ml-2 font-bold ${formData.effectiveness_score >= 60 ? 'text-emerald-400' : 'text-red-400'}`}>{formData.effectiveness_score}%</span></div>
          <div><span className="text-white/60">Corrective Actions:</span> <span className="text-white ml-2">{formData.corrective_actions.length}</span></div>
        </div>
      </div>

      {/* Next Drill Due */}
      <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-cyan-200 font-medium">Next {drillConfig?.label} Due</p>
            <p className="text-white text-lg font-bold">{nextDrillDue}</p>
            <p className="text-cyan-200/60 text-sm">({drillConfig?.frequency} requirement)</p>
          </div>
          <div className="text-4xl">📅</div>
        </div>
      </div>

      <div>
        <label className="block text-white/80 text-sm font-medium mb-2">
          Drill Coordinator Signature <span className="text-red-400">*</span>
        </label>
        <SignaturePad
          value={formData.coordinator_signature}
          onChange={(sig) => updateFormData({
            coordinator_signature: sig,
            coordinator_signature_date: new Date().toISOString(),
          })}
        />
        {errors.coordinator_signature && <p className="text-red-400 text-sm mt-1">{errors.coordinator_signature}</p>}
      </div>

      <div>
        <label className="block text-white/80 text-sm font-medium mb-2">
          Safety Manager Review Signature <span className="text-red-400">*</span>
        </label>
        <SignaturePad
          value={formData.safety_manager_signature}
          onChange={(sig) => updateFormData({
            safety_manager_signature: sig,
            safety_manager_signature_date: new Date().toISOString(),
          })}
        />
        {errors.safety_manager_signature && <p className="text-red-400 text-sm mt-1">{errors.safety_manager_signature}</p>}
      </div>

      {!isOnline && (
        <div className="bg-amber-500/20 border border-amber-500 rounded-lg p-4">
          <p className="text-amber-200 font-medium">📴 You are offline</p>
          <p className="text-amber-200/80 text-sm mt-1">Form will be saved and submitted when connection is restored.</p>
        </div>
      )}
    </div>
  );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-cyan-900 to-teal-900">
      {/* Header */}
      <div className="bg-black/30 backdrop-blur-lg border-b border-white/10 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-white">Emergency Response Drill</h1>
              <p className="text-cyan-300 text-sm">COR Element 11</p>
            </div>
            <div className={`px-3 py-1 rounded-full text-sm ${isOnline ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'}`}>
              {isOnline ? '● Online' : '○ Offline'}
            </div>
          </div>
        </div>
      </div>

      {/* Progress */}
      <div className="max-w-2xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-white/60 text-sm">Step {currentStep + 1} of {WIZARD_STEPS.length}</span>
          <span className="text-white/60 text-sm">{Math.round(((currentStep + 1) / WIZARD_STEPS.length) * 100)}%</span>
        </div>
        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-cyan-500 to-teal-500 transition-all duration-300"
            style={{ width: `${((currentStep + 1) / WIZARD_STEPS.length) * 100}%` }}
          />
        </div>
        <p className="text-white font-medium mt-2">{WIZARD_STEPS[currentStep].title}</p>
        <p className="text-white/60 text-sm">{WIZARD_STEPS[currentStep].description}</p>
      </div>

      {/* Form Content */}
      <div className="max-w-2xl mx-auto px-4 pb-32">
        <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-6 border border-white/10">
          {renderStepContent()}
        </div>
      </div>

      {/* Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-black/50 backdrop-blur-lg border-t border-white/10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex justify-between">
          <button
            type="button"
            onClick={prevStep}
            disabled={currentStep === 0}
            className="px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-white/10 text-white hover:bg-white/20"
          >
            ← Previous
          </button>
          {currentStep === WIZARD_STEPS.length - 1 ? (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-8 py-3 rounded-lg font-semibold transition-colors bg-gradient-to-r from-cyan-500 to-teal-500 text-white hover:from-cyan-600 hover:to-teal-600 disabled:opacity-50"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Drill Report'}
            </button>
          ) : (
            <button
              type="button"
              onClick={nextStep}
              className="px-8 py-3 rounded-lg font-semibold transition-colors bg-gradient-to-r from-cyan-500 to-teal-500 text-white hover:from-cyan-600 hover:to-teal-600"
            >
              Next →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Helper component for Yes/No questions
function YesNoQuestion({
  label,
  value,
  onChange,
  required = false,
}: {
  label: string;
  value: boolean | null;
  onChange: (val: boolean) => void;
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-white/80 text-sm font-medium mb-2">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => onChange(true)}
          className={`p-3 rounded-lg border-2 font-medium transition-all ${
            value === true
              ? 'border-emerald-500 bg-emerald-500/20 text-emerald-200'
              : 'border-white/20 bg-white/5 text-white/60 hover:border-white/40'
          }`}
        >
          ✓ Yes
        </button>
        <button
          type="button"
          onClick={() => onChange(false)}
          className={`p-3 rounded-lg border-2 font-medium transition-all ${
            value === false
              ? 'border-red-500 bg-red-500/20 text-red-200'
              : 'border-white/20 bg-white/5 text-white/60 hover:border-white/40'
          }`}
        >
          ✗ No
        </button>
      </div>
    </div>
  );
}

export default EmergencyDrillForm;
