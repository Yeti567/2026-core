'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { COR_ELEMENTS } from '@/lib/integrations/auditsoft/types';

// =============================================================================
// TYPES
// =============================================================================

interface ExportSummary {
  form_submissions: number;
  documents: number;
  certifications: number;
  maintenance_records: number;
  training_records: number;
  meeting_minutes: number;
  inspections: number;
  incidents: number;
  total: number;
}

interface ExportProgress {
  status: 'in_progress' | 'completed' | 'failed' | 'partial';
  phase: string;
  total: number;
  succeeded: number;
  failed: number;
  percentage: number;
  details?: {
    by_type?: Record<string, number>;
  };
}

interface ExportResult {
  success: boolean;
  total_items: number;
  succeeded: number;
  failed: number;
  duration_seconds: number;
  summary: Record<string, number>;
  errors: Array<{
    item_type: string;
    item_id: string;
    item_name?: string;
    error: string;
  }>;
  sync_log_id?: string;
}

type DateRangeOption = 'all' | '12_months' | '6_months' | 'custom';

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function AuditSoftExportWizard({ onClose }: { onClose?: () => void }) {
  // Wizard state
  const [step, setStep] = useState(1);
  
  // Step 1: Selection
  const [dateRange, setDateRange] = useState<DateRangeOption>('12_months');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [selectedElements, setSelectedElements] = useState<number[]>(
    COR_ELEMENTS.map(e => e.number)
  );
  
  // Step 2: Summary
  const [summary, setSummary] = useState<ExportSummary | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  
  // Step 3: Progress
  const [isExporting, setIsExporting] = useState(false);
  const [exportId, setExportId] = useState<string | null>(null);
  const [progress, setProgress] = useState<ExportProgress | null>(null);
  
  // Step 4: Results
  const [result, setResult] = useState<ExportResult | null>(null);
  const [showErrors, setShowErrors] = useState(false);
  
  // Error handling
  const [error, setError] = useState('');

  // Calculate date range
  const getDateRange = useCallback(() => {
    const now = new Date();
    const end = now.toISOString().split('T')[0];
    
    switch (dateRange) {
      case 'all':
        return { start: '2020-01-01', end };
      case '12_months':
        const start12 = new Date(now);
        start12.setMonth(start12.getMonth() - 12);
        return { start: start12.toISOString().split('T')[0], end };
      case '6_months':
        const start6 = new Date(now);
        start6.setMonth(start6.getMonth() - 6);
        return { start: start6.toISOString().split('T')[0], end };
      case 'custom':
        return { start: customStartDate, end: customEndDate };
      default:
        return { start: '2020-01-01', end };
    }
  }, [dateRange, customStartDate, customEndDate]);

  // Load export summary
  const loadSummary = useCallback(async () => {
    setLoadingSummary(true);
    setError('');
    
    try {
      const { start, end } = getDateRange();
      
      const response = await fetch('/api/integrations/auditsoft/export/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date_range: { start, end },
          elements: selectedElements,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to load summary');
      }

      const data = await response.json();
      setSummary(data.summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load export summary');
    } finally {
      setLoadingSummary(false);
    }
  }, [getDateRange, selectedElements]);

  // Start export
  const startExport = async () => {
    setIsExporting(true);
    setStep(3);
    setError('');
    setProgress({
      status: 'in_progress',
      phase: 'Starting export...',
      total: summary?.total || 0,
      succeeded: 0,
      failed: 0,
      percentage: 0,
    });

    try {
      const { start, end } = getDateRange();
      
      const response = await fetch('/api/integrations/auditsoft/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date_range: { start, end },
          elements: selectedElements,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to start export');
      }

      const data = await response.json();
      
      if (data.result) {
        // Export completed synchronously
        setResult({
          success: data.success,
          total_items: data.result.total_items,
          succeeded: data.result.succeeded,
          failed: data.result.failed,
          duration_seconds: data.result.duration_seconds,
          summary: data.result.summary,
          errors: data.result.errors || [],
          sync_log_id: data.result.sync_log_id,
        });
        setIsExporting(false);
        setStep(4);
      } else if (data.export_id) {
        // Export running async - connect to SSE
        setExportId(data.export_id);
        connectToProgressStream(data.export_id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
      setIsExporting(false);
    }
  };

  // Connect to SSE for progress updates
  const connectToProgressStream = (id: string) => {
    const eventSource = new EventSource(`/api/integrations/auditsoft/export/${id}/progress`);

    eventSource.onmessage = (event) => {
      try {
        const update = JSON.parse(event.data);
        
        if (update.type === 'progress') {
          setProgress({
            status: update.data.status || 'in_progress',
            phase: update.data.phase || 'Processing...',
            total: update.data.total || 0,
            succeeded: update.data.succeeded || 0,
            failed: update.data.failed || 0,
            percentage: update.data.total > 0 
              ? Math.round((update.data.succeeded / update.data.total) * 100)
              : 0,
            details: update.data.details,
          });
        } else if (update.type === 'complete') {
          setResult({
            success: update.data.status === 'completed',
            total_items: update.data.items_attempted || 0,
            succeeded: update.data.items_succeeded || 0,
            failed: update.data.items_failed || 0,
            duration_seconds: update.data.duration_seconds || 0,
            summary: update.data.sync_details?.by_type || {},
            errors: update.data.error_details || [],
            sync_log_id: id,
          });
          setIsExporting(false);
          setStep(4);
          eventSource.close();
        } else if (update.type === 'error') {
          setError(update.error || 'Export failed');
          setIsExporting(false);
          eventSource.close();
        }
      } catch (e) {
        console.error('Failed to parse SSE message:', e);
      }
    };

    eventSource.onerror = () => {
      // Lost connection - try polling as fallback
      eventSource.close();
      pollExportStatus(id);
    };
  };

  // Fallback: Poll for status
  const pollExportStatus = async (id: string) => {
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/integrations/auditsoft/export/${id}/status`);
        const data = await response.json();

        if (data.status === 'completed' || data.status === 'failed' || data.status === 'partial') {
          clearInterval(pollInterval);
          setResult({
            success: data.status === 'completed',
            total_items: data.items_attempted || 0,
            succeeded: data.items_succeeded || 0,
            failed: data.items_failed || 0,
            duration_seconds: data.duration_seconds || 0,
            summary: data.sync_details?.by_type || {},
            errors: data.error_details || [],
            sync_log_id: id,
          });
          setIsExporting(false);
          setStep(4);
        } else {
          setProgress(prev => ({
            ...prev!,
            succeeded: data.items_succeeded || 0,
            failed: data.items_failed || 0,
            percentage: data.items_attempted > 0
              ? Math.round((data.items_succeeded / data.items_attempted) * 100)
              : 0,
          }));
        }
      } catch (e) {
        console.error('Failed to poll status:', e);
      }
    }, 3000);
  };

  // Element selection helpers
  const toggleElement = (elementNumber: number) => {
    setSelectedElements(prev => 
      prev.includes(elementNumber)
        ? prev.filter(e => e !== elementNumber)
        : [...prev, elementNumber].sort((a, b) => a - b)
    );
  };

  const selectAllElements = () => {
    setSelectedElements(COR_ELEMENTS.map(e => e.number));
  };

  const deselectAllElements = () => {
    setSelectedElements([]);
  };

  // Format duration
  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds} seconds`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (minutes < 60) {
      return remainingSeconds > 0 
        ? `${minutes} min ${remainingSeconds} sec`
        : `${minutes} minutes`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };

  // Estimate export time
  const estimateTime = (totalItems: number) => {
    const itemsPerMinute = 20; // Rough estimate
    const minutes = Math.ceil(totalItems / itemsPerMinute);
    if (minutes < 5) return '< 5 minutes';
    if (minutes < 15) return '5-15 minutes';
    if (minutes < 30) return '15-30 minutes';
    return '30+ minutes';
  };

  // ==========================================================================
  // RENDER STEP 1: Selection
  // ==========================================================================
  const renderStep1 = () => (
    <div className="space-y-6">
      {/* Date Range */}
      <div>
        <h4 className="font-semibold mb-3">Date Range</h4>
        <div className="space-y-2">
          {[
            { value: 'all', label: 'All time (complete audit package)' },
            { value: '12_months', label: 'Last 12 months (recommended)' },
            { value: '6_months', label: 'Last 6 months' },
            { value: 'custom', label: 'Custom range' },
          ].map(option => (
            <label
              key={option.value}
              className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                dateRange === option.value
                  ? 'border-indigo-500 bg-indigo-500/10'
                  : 'border-slate-700 hover:border-slate-600'
              }`}
            >
              <input
                type="radio"
                name="dateRange"
                value={option.value}
                checked={dateRange === option.value}
                onChange={(e) => setDateRange(e.target.value as DateRangeOption)}
                className="accent-indigo-500"
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>

        {dateRange === 'custom' && (
          <div className="grid grid-cols-2 gap-4 mt-4 pl-8">
            <div>
              <label className="label">Start Date</label>
              <input
                type="date"
                className="input"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
              />
            </div>
            <div>
              <label className="label">End Date</label>
              <input
                type="date"
                className="input"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
              />
            </div>
          </div>
        )}
      </div>

      {/* COR Elements */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-semibold">COR Elements</h4>
          <div className="flex gap-2">
            <button
              onClick={selectAllElements}
              className="text-xs text-indigo-400 hover:text-indigo-300"
            >
              Select All
            </button>
            <span className="text-slate-600">|</span>
            <button
              onClick={deselectAllElements}
              className="text-xs text-slate-400 hover:text-slate-300"
            >
              Deselect All
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-64 overflow-y-auto p-1">
          {COR_ELEMENTS.map(element => (
            <label
              key={element.number}
              className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all text-sm ${
                selectedElements.includes(element.number)
                  ? 'border-indigo-500/50 bg-indigo-500/5'
                  : 'border-slate-700/50 hover:border-slate-600'
              }`}
            >
              <input
                type="checkbox"
                checked={selectedElements.includes(element.number)}
                onChange={() => toggleElement(element.number)}
                className="accent-indigo-500"
              />
              <span className="text-indigo-400 font-mono text-xs w-6">
                {element.number}.
              </span>
              <span className="truncate">{element.name}</span>
            </label>
          ))}
        </div>
        
        <p className="text-xs text-[var(--muted)] mt-2">
          {selectedElements.length} of {COR_ELEMENTS.length} elements selected
        </p>
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-4 border-t border-slate-700">
        <button
          onClick={onClose}
          className="btn"
          style={{ background: 'var(--border)' }}
        >
          Cancel
        </button>
        <button
          onClick={() => {
            loadSummary();
            setStep(2);
          }}
          disabled={selectedElements.length === 0 || (dateRange === 'custom' && (!customStartDate || !customEndDate))}
          className="btn btn-primary"
        >
          Next: Review →
        </button>
      </div>
    </div>
  );

  // ==========================================================================
  // RENDER STEP 2: Review
  // ==========================================================================
  const renderStep2 = () => (
    <div className="space-y-6">
      {loadingSummary ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-[var(--muted)]">Calculating export summary...</p>
          </div>
        </div>
      ) : error ? (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400">
          {error}
        </div>
      ) : summary ? (
        <>
          {/* Summary Card */}
          <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
            <h4 className="font-semibold mb-4">Export Summary</h4>
            
            <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
              <div>
                <p className="text-[var(--muted)]">Date Range</p>
                <p className="font-medium">
                  {dateRange === 'all' ? 'All time' :
                   dateRange === '12_months' ? 'Last 12 months' :
                   dateRange === '6_months' ? 'Last 6 months' :
                   `${customStartDate} to ${customEndDate}`}
                </p>
              </div>
              <div>
                <p className="text-[var(--muted)]">Elements</p>
                <p className="font-medium">
                  {selectedElements.length === 14 ? 'All 14' : `${selectedElements.length} selected`}
                </p>
              </div>
            </div>

            <div className="border-t border-slate-700 pt-4">
              <p className="text-[var(--muted)] text-sm mb-3">Items to Export:</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {[
                  { key: 'form_submissions', icon: '📋', label: 'Form Submissions' },
                  { key: 'documents', icon: '📄', label: 'Documents' },
                  { key: 'certifications', icon: '🎓', label: 'Certifications' },
                  { key: 'maintenance_records', icon: '🔧', label: 'Maintenance Records' },
                  { key: 'training_records', icon: '📚', label: 'Training Records' },
                  { key: 'meeting_minutes', icon: '📝', label: 'Meeting Minutes' },
                  { key: 'inspections', icon: '🔍', label: 'Inspections' },
                  { key: 'incidents', icon: '⚠️', label: 'Incidents' },
                ].map(item => (
                  <div key={item.key} className="flex items-center justify-between py-1">
                    <span className="text-[var(--muted)]">
                      {item.icon} {item.label}
                    </span>
                    <span className="font-medium font-mono">
                      {summary[item.key as keyof ExportSummary] || 0}
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-700">
                <span className="font-semibold">Total Items</span>
                <span className="text-2xl font-bold text-indigo-400">
                  {summary.total}
                </span>
              </div>
              
              <p className="text-xs text-[var(--muted)] mt-2">
                Estimated time: {estimateTime(summary.total)}
              </p>
            </div>
          </div>

          {/* Important Notes */}
          <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30">
            <div className="flex items-start gap-3">
              <span className="text-amber-400">⚠️</span>
              <div className="text-sm">
                <p className="font-medium text-amber-400 mb-2">Important:</p>
                <ul className="list-disc list-inside space-y-1 text-amber-300/80">
                  <li>Existing items in AuditSoft will not be duplicated</li>
                  <li>You can re-run this export anytime</li>
                  <li>Large exports may take several minutes</li>
                </ul>
              </div>
            </div>
          </div>
        </>
      ) : null}

      {/* Navigation */}
      <div className="flex justify-between pt-4 border-t border-slate-700">
        <button
          onClick={() => setStep(1)}
          className="btn"
          style={{ background: 'var(--border)' }}
        >
          ← Back
        </button>
        <button
          onClick={startExport}
          disabled={loadingSummary || !summary || summary.total === 0}
          className="btn btn-primary"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          Start Export
        </button>
      </div>
    </div>
  );

  // ==========================================================================
  // RENDER STEP 3: Progress
  // ==========================================================================
  const renderStep3 = () => (
    <div className="space-y-6">
      {/* Overall Progress */}
      <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-semibold">Overall Progress</h4>
          <span className="text-2xl font-bold text-indigo-400">
            {progress?.percentage || 0}%
          </span>
        </div>
        
        {/* Progress Bar */}
        <div className="h-3 bg-slate-700 rounded-full overflow-hidden mb-3">
          <div
            className="h-full bg-gradient-to-r from-indigo-600 to-indigo-400 transition-all duration-500"
            style={{ width: `${progress?.percentage || 0}%` }}
          />
        </div>
        
        <div className="flex items-center justify-between text-sm text-[var(--muted)]">
          <span>{progress?.succeeded || 0} / {progress?.total || 0} items</span>
          <span>
            {progress?.total && progress.succeeded 
              ? `~${Math.ceil((progress.total - progress.succeeded) / 20)} min remaining`
              : 'Calculating...'}
          </span>
        </div>
      </div>

      {/* Current Phase */}
      <div className="flex items-center gap-3 p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/30">
        <div className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
        <span className="text-indigo-300">{progress?.phase || 'Initializing...'}</span>
      </div>

      {/* Detailed Progress */}
      <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
        <h4 className="font-semibold mb-4">Detailed Progress</h4>
        
        <div className="space-y-3">
          {[
            { key: 'form_submissions', icon: '📋', label: 'Form Submissions' },
            { key: 'documents', icon: '📄', label: 'Documents' },
            { key: 'certifications', icon: '🎓', label: 'Certifications' },
            { key: 'maintenance_records', icon: '🔧', label: 'Maintenance Records' },
            { key: 'training_records', icon: '📚', label: 'Training Records' },
            { key: 'meeting_minutes', icon: '📝', label: 'Meeting Minutes' },
            { key: 'inspections', icon: '🔍', label: 'Inspections' },
            { key: 'incidents', icon: '⚠️', label: 'Incidents' },
          ].map((item, index) => {
            const count = progress?.details?.by_type?.[item.key] || 0;
            const total = summary?.[item.key as keyof ExportSummary] || 0;
            const isComplete = count >= total && total > 0;
            const isActive = !isComplete && index === Math.floor((progress?.percentage || 0) / 12.5);
            
            return (
              <div key={item.key} className="flex items-center gap-3">
                <span className="w-6 text-center">
                  {isComplete ? '✅' : isActive ? '⏳' : '⏸️'}
                </span>
                <span className={`flex-1 ${isComplete ? 'text-emerald-400' : isActive ? 'text-indigo-300' : 'text-[var(--muted)]'}`}>
                  {item.icon} {item.label}
                </span>
                <span className="font-mono text-sm">
                  {count}/{total}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Errors (if any) */}
      {progress && progress.failed > 0 && (
        <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-sm">
          <span className="text-amber-400">
            ⚠️ {progress.failed} items failed (will continue with remaining items)
          </span>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-center pt-4 border-t border-slate-700">
        <button
          onClick={() => {
            // TODO: Implement cancel
            setIsExporting(false);
            setStep(1);
          }}
          className="btn text-red-400 border-red-500/30 hover:bg-red-500/10"
        >
          Cancel Export
        </button>
      </div>
    </div>
  );

  // ==========================================================================
  // RENDER STEP 4: Results
  // ==========================================================================
  const renderStep4 = () => (
    <div className="space-y-6">
      {/* Success/Partial Header */}
      <div className={`p-4 rounded-lg ${
        result?.success 
          ? 'bg-emerald-500/10 border border-emerald-500/30' 
          : 'bg-amber-500/10 border border-amber-500/30'
      }`}>
        <div className="flex items-center gap-3">
          <span className="text-3xl">
            {result?.success ? '✅' : '⚠️'}
          </span>
          <div>
            <h3 className="font-semibold text-lg">
              {result?.success ? 'Export Complete!' : 'Export Completed with Errors'}
            </h3>
            <p className={result?.success ? 'text-emerald-300' : 'text-amber-300'}>
              {result?.success 
                ? 'All evidence has been exported to AuditSoft'
                : `${result?.succeeded} items exported, ${result?.failed} failed`}
            </p>
          </div>
        </div>
      </div>

      {/* Results Summary */}
      <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
        <h4 className="font-semibold mb-4">Results</h4>
        
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="text-center p-3 rounded-lg bg-slate-700/50">
            <p className="text-3xl font-bold text-indigo-400">{result?.total_items}</p>
            <p className="text-xs text-[var(--muted)]">Total Items</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-slate-700/50">
            <p className="text-3xl font-bold text-emerald-400">{result?.succeeded}</p>
            <p className="text-xs text-[var(--muted)]">Succeeded</p>
          </div>
        </div>

        {result?.failed && result.failed > 0 && (
          <div className="text-center p-3 rounded-lg bg-red-500/10 border border-red-500/30 mb-4">
            <p className="text-2xl font-bold text-red-400">{result.failed}</p>
            <p className="text-xs text-red-300">Failed</p>
          </div>
        )}

        <div className="flex items-center justify-between text-sm text-[var(--muted)] pt-4 border-t border-slate-700">
          <span>Duration: {formatDuration(result?.duration_seconds || 0)}</span>
          <span>Completed: {new Date().toLocaleString()}</span>
        </div>
      </div>

      {/* Failed Items */}
      {result?.errors && result.errors.length > 0 && (
        <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold">Failed Items ({result.errors.length})</h4>
            <button
              onClick={() => setShowErrors(!showErrors)}
              className="text-sm text-indigo-400 hover:text-indigo-300"
            >
              {showErrors ? 'Hide' : 'Show'} Details
            </button>
          </div>

          {showErrors && (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {result.errors.map((err, index) => (
                <div
                  key={index}
                  className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-red-300">
                        {err.item_name || err.item_type}
                      </p>
                      <p className="text-red-400/80 text-xs mt-1">{err.error}</p>
                    </div>
                    <button className="text-xs text-indigo-400 hover:text-indigo-300">
                      Retry
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <button className="btn btn-primary w-full mt-4" onClick={() => {/* TODO: Retry all */}}>
            Retry All Failed Items
          </button>
        </div>
      )}

      {/* Next Steps */}
      <div className="p-4 rounded-lg bg-indigo-500/10 border border-indigo-500/30">
        <div className="flex items-start gap-3">
          <span className="text-indigo-400">💡</span>
          <div className="text-sm">
            <p className="font-medium text-indigo-300 mb-1">What's Next?</p>
            <p className="text-indigo-300/80">
              Your auditor now has access to all exported evidence in AuditSoft. 
              They'll be able to review and score your COR audit submission.
            </p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-slate-700">
        <a
          href="https://auditsoft.co/audits"
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-primary flex-1 text-center"
        >
          View in AuditSoft →
        </a>
        <button
          onClick={onClose}
          className="btn flex-1"
          style={{ background: 'var(--border)' }}
        >
          Done
        </button>
      </div>
    </div>
  );

  // ==========================================================================
  // MAIN RENDER
  // ==========================================================================
  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden max-w-2xl w-full mx-auto">
      {/* Header */}
      <div className="p-4 border-b border-slate-700 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">
            {step === 4 ? (result?.success ? '✅' : '⚠️') : '📤'}
          </span>
          <div>
            <h2 className="font-semibold text-lg">
              {step === 1 && 'Export to AuditSoft'}
              {step === 2 && 'Review Export'}
              {step === 3 && 'Exporting...'}
              {step === 4 && 'Export Complete'}
            </h2>
            {step < 4 && (
              <p className="text-xs text-[var(--muted)]">
                Step {step} of 3
              </p>
            )}
          </div>
        </div>
        {step !== 3 && (
          <button
            onClick={onClose}
            className="text-[var(--muted)] hover:text-[var(--foreground)] p-1"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Progress Steps */}
      {step < 4 && (
        <div className="px-4 py-3 border-b border-slate-700 bg-slate-800/30">
          <div className="flex items-center gap-2">
            {[1, 2, 3].map(s => (
              <div key={s} className="flex items-center flex-1">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                  s < step ? 'bg-emerald-500 text-white' :
                  s === step ? 'bg-indigo-500 text-white' :
                  'bg-slate-700 text-slate-400'
                }`}>
                  {s < step ? '✓' : s}
                </div>
                {s < 3 && (
                  <div className={`flex-1 h-0.5 mx-2 ${
                    s < step ? 'bg-emerald-500' : 'bg-slate-700'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="p-6">
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
        {step === 4 && renderStep4()}
      </div>
    </div>
  );
}
