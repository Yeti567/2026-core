'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  FileText, Check, AlertTriangle, X, ChevronRight, Loader2,
  Upload, Eye, AlertCircle, TrendingUp, TrendingDown, Minus
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

interface DocumentComplianceScore {
  element_number: number;
  element_name: string;
  total_points: number;
  earned_points: number;
  percentage: number;
  documents_found: number;
  documents_required: number;
  documents_matched: number;
  status: 'compliant' | 'partial' | 'non_compliant';
  gaps: DocumentGap[];
}

interface DocumentGap {
  requirement_id: string;
  element_number: number;
  severity: 'critical' | 'major' | 'minor';
  description: string;
  action_required: string;
  found_count: number;
  required_count: number;
}

interface OverallCompliance {
  total_documents: number;
  required_documents: number;
  matched_documents: number;
  overall_percentage: number;
  overall_status: 'compliant' | 'partial' | 'non_compliant';
  by_element: DocumentComplianceScore[];
  critical_gaps: DocumentGap[];
  major_gaps: DocumentGap[];
  minor_gaps: DocumentGap[];
  recommendations: string[];
}

// ============================================================================
// STATUS CONFIG
// ============================================================================

const STATUS_CONFIG = {
  compliant: {
    icon: Check,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/20',
    borderColor: 'border-emerald-500/30',
    label: 'Compliant',
  },
  partial: {
    icon: AlertTriangle,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/20',
    borderColor: 'border-amber-500/30',
    label: 'Partial',
  },
  non_compliant: {
    icon: X,
    color: 'text-red-400',
    bgColor: 'bg-red-500/20',
    borderColor: 'border-red-500/30',
    label: 'Non-Compliant',
  },
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

interface DocumentComplianceWidgetProps {
  compact?: boolean;
  showRecommendations?: boolean;
  onViewDetails?: () => void;
}

export function DocumentComplianceWidget({ 
  compact = false, 
  showRecommendations = true,
  onViewDetails 
}: DocumentComplianceWidgetProps) {
  const router = useRouter();
  const [compliance, setCompliance] = useState<OverallCompliance | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedElement, setExpandedElement] = useState<number | null>(null);

  // ============================================================================
  // DATA FETCHING
  // ============================================================================

  useEffect(() => {
    fetchCompliance();
  }, []);

  const fetchCompliance = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/audit/document-compliance');
      if (!response.ok) throw new Error('Failed to fetch compliance');
      
      const data = await response.json();
      setCompliance(data.compliance);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load compliance');
    } finally {
      setIsLoading(false);
    }
  };

  // ============================================================================
  // RENDER HELPERS
  // ============================================================================

  const getProgressBarColor = (percentage: number) => {
    if (percentage >= 80) return 'from-emerald-500 to-teal-500';
    if (percentage >= 50) return 'from-amber-500 to-orange-500';
    return 'from-red-500 to-rose-500';
  };

  const getStatusIcon = (status: keyof typeof STATUS_CONFIG) => {
    // Safe: status is constrained to keyof typeof STATUS_CONFIG
    // eslint-disable-next-line security/detect-object-injection
    const config = STATUS_CONFIG[status];
    const Icon = config.icon;
    return <Icon className={`w-4 h-4 ${config.color}`} />;
  };

  // ============================================================================
  // LOADING STATE
  // ============================================================================

  if (isLoading) {
    return (
      <div className={`rounded-2xl bg-slate-900/80 border border-slate-700 ${compact ? 'p-4' : 'p-6'}`}>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
        </div>
      </div>
    );
  }

  // ============================================================================
  // ERROR STATE
  // ============================================================================

  if (error || !compliance) {
    return (
      <div className={`rounded-2xl bg-slate-900/80 border border-slate-700 ${compact ? 'p-4' : 'p-6'}`}>
        <div className="flex items-center gap-3 text-red-400">
          <AlertCircle className="w-5 h-5" />
          <span>{error || 'Failed to load compliance data'}</span>
        </div>
        <button
          onClick={fetchCompliance}
          className="mt-3 text-sm text-violet-400 hover:text-violet-300"
        >
          Try again
        </button>
      </div>
    );
  }

  // ============================================================================
  // COMPACT VIEW
  // ============================================================================

  if (compact) {
    return (
      <div className="rounded-2xl bg-slate-900/80 border border-slate-700 p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-violet-400" />
            <span className="font-semibold text-white">Document Compliance</span>
          </div>
          <div className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_CONFIG[compliance.overall_status].bgColor} ${STATUS_CONFIG[compliance.overall_status].color}`}>
            {compliance.overall_percentage}%
          </div>
        </div>

        <div className="h-2 bg-slate-700 rounded-full overflow-hidden mb-3">
          <div
            className={`h-full bg-gradient-to-r ${getProgressBarColor(compliance.overall_percentage)} transition-all duration-500`}
            style={{ width: `${compliance.overall_percentage}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-400">
            {compliance.matched_documents}/{compliance.required_documents} documents
          </span>
          <button
            onClick={() => onViewDetails?.() || router.push('/admin/audit/documents')}
            className="flex items-center gap-1 text-violet-400 hover:text-violet-300"
          >
            Details
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // ============================================================================
  // FULL VIEW
  // ============================================================================

  return (
    <div className="rounded-2xl bg-slate-900/80 border border-slate-700 overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-slate-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-violet-500/20 border border-violet-500/30">
              <FileText className="w-6 h-6 text-violet-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Document Compliance</h3>
              <p className="text-sm text-slate-400">
                {compliance.matched_documents}/{compliance.required_documents} required documents
              </p>
            </div>
          </div>
          
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${STATUS_CONFIG[compliance.overall_status].bgColor} ${STATUS_CONFIG[compliance.overall_status].borderColor} border`}>
            {getStatusIcon(compliance.overall_status)}
            <span className={`text-sm font-medium ${STATUS_CONFIG[compliance.overall_status].color}`}>
              {compliance.overall_percentage}%
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
          <div
            className={`h-full bg-gradient-to-r ${getProgressBarColor(compliance.overall_percentage)} transition-all duration-500`}
            style={{ width: `${compliance.overall_percentage}%` }}
          />
        </div>
      </div>

      {/* Element Breakdown */}
      <div className="p-6 border-b border-slate-700">
        <h4 className="text-sm font-medium text-slate-400 mb-4">By Element</h4>
        <div className="space-y-2 max-h-[320px] overflow-y-auto">
          {compliance.by_element.map(element => (
            <div key={element.element_number}>
              <button
                onClick={() => setExpandedElement(
                  expandedElement === element.element_number ? null : element.element_number
                )}
                className="w-full flex items-center gap-3 p-3 rounded-lg bg-slate-800/50 hover:bg-slate-800 transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-slate-700 flex items-center justify-center shrink-0">
                  <span className="text-sm font-semibold text-white">{element.element_number}</span>
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-sm text-white truncate">{element.element_name}</span>
                    <span className={`text-sm font-medium ${
                      element.percentage >= 80 ? 'text-emerald-400' :
                      element.percentage >= 50 ? 'text-amber-400' : 'text-red-400'
                    }`}>
                      {element.percentage}%
                    </span>
                  </div>
                  <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full bg-gradient-to-r ${getProgressBarColor(element.percentage)} transition-all`}
                      style={{ width: `${element.percentage}%` }}
                    />
                  </div>
                </div>

                {getStatusIcon(element.status)}
                
                {element.gaps.length > 0 && (
                  <ChevronRight 
                    className={`w-4 h-4 text-slate-500 transition-transform ${
                      expandedElement === element.element_number ? 'rotate-90' : ''
                    }`} 
                  />
                )}
              </button>

              {/* Expanded Gaps */}
              {expandedElement === element.element_number && element.gaps.length > 0 && (
                <div className="ml-11 mt-2 space-y-2 mb-3">
                  {element.gaps.map((gap, i) => (
                    <div 
                      key={i}
                      className={`p-3 rounded-lg text-sm ${
                        gap.severity === 'critical' ? 'bg-red-500/10 border border-red-500/20' :
                        gap.severity === 'major' ? 'bg-amber-500/10 border border-amber-500/20' :
                        'bg-slate-800/50 border border-slate-700'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        {gap.severity === 'critical' && <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />}
                        {gap.severity === 'major' && <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />}
                        <div>
                          <p className="text-white">{gap.description}</p>
                          <p className="text-slate-400 mt-1">
                            Found: {gap.found_count} / Required: {gap.required_count}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Gap Summary */}
      <div className="p-6 border-b border-slate-700">
        <h4 className="text-sm font-medium text-slate-400 mb-3">Gap Summary</h4>
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-center">
            <p className="text-2xl font-bold text-red-400">{compliance.critical_gaps.length}</p>
            <p className="text-xs text-red-400/80">Critical</p>
          </div>
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-center">
            <p className="text-2xl font-bold text-amber-400">{compliance.major_gaps.length}</p>
            <p className="text-xs text-amber-400/80">Major</p>
          </div>
          <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700 text-center">
            <p className="text-2xl font-bold text-slate-400">{compliance.minor_gaps.length}</p>
            <p className="text-xs text-slate-400/80">Minor</p>
          </div>
        </div>
      </div>

      {/* Recommendations */}
      {showRecommendations && compliance.recommendations.length > 0 && (
        <div className="p-6 border-b border-slate-700">
          <h4 className="text-sm font-medium text-slate-400 mb-3">Recommendations</h4>
          <ul className="space-y-2">
            {compliance.recommendations.slice(0, 3).map((rec, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                <span className="text-violet-400 mt-0.5">→</span>
                {rec}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Actions */}
      <div className="p-6 flex gap-3">
        <button
          onClick={() => router.push('/admin/audit/documents')}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-medium transition-colors"
        >
          <Eye className="w-4 h-4" />
          View Missing
        </button>
        <button
          onClick={() => router.push('/admin/documents/upload')}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-violet-500 hover:bg-violet-600 text-white rounded-lg font-medium transition-colors"
        >
          <Upload className="w-4 h-4" />
          Upload Documents
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// MINI WIDGET (for sidebar/header)
// ============================================================================

export function DocumentComplianceMini() {
  const [percentage, setPercentage] = useState<number | null>(null);
  const [status, setStatus] = useState<'compliant' | 'partial' | 'non_compliant'>('partial');

  useEffect(() => {
    fetch('/api/audit/document-compliance')
      .then(res => res.json())
      .then(data => {
        if (data.compliance) {
          setPercentage(data.compliance.overall_percentage);
          setStatus(data.compliance.overall_status);
        }
      })
      .catch(() => {});
  }, []);

  if (percentage === null) return null;

  // Safe: status is constrained to specific string literal union type
  // eslint-disable-next-line security/detect-object-injection
  const config = STATUS_CONFIG[status];

  return (
    <div className={`flex items-center gap-2 px-2 py-1 rounded-lg ${config.bgColor}`}>
      <FileText className={`w-4 h-4 ${config.color}`} />
      <span className={`text-sm font-medium ${config.color}`}>{percentage}%</span>
    </div>
  );
}

export default DocumentComplianceWidget;
