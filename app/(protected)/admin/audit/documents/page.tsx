'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronLeft, FileText, Check, AlertTriangle, X, Upload, Eye,
  Loader2, AlertCircle, ChevronRight, Search, Filter, Download,
  ExternalLink, Sparkles
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

interface DocumentEvidence {
  id: string;
  control_number: string;
  title: string;
  description?: string;
  document_type: string;
  version: string;
  effective_date?: string;
  file_path?: string;
  folder_name?: string;
  folder_code?: string;
  relevance: number;
  snippet?: string;
  matched_requirements?: string[];
  cor_elements?: number[];
  tags?: string[];
  is_critical?: boolean;
}

interface DocumentGap {
  requirement_id: string;
  element_number: number;
  severity: 'critical' | 'major' | 'minor';
  description: string;
  action_required: string;
  estimated_effort_hours: number;
  found_count: number;
  required_count: number;
  suggested_title?: string;
  suggested_folder?: string;
  suggested_document_type?: string;
}

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
  evidence: DocumentEvidence[];
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
// ELEMENT NAMES
// ============================================================================

const ELEMENT_NAMES: Record<number, string> = {
  1: 'Management Leadership',
  2: 'Hazard Identification',
  3: 'Hazard Control',
  4: 'Competency & Training',
  5: 'Workplace Behavior',
  6: 'PPE',
  7: 'Preventive Maintenance',
  8: 'Communications',
  9: 'Workplace Inspections',
  10: 'Incident Investigation',
  11: 'Emergency Response',
  12: 'Statistics & Records',
  13: 'Regulatory Compliance',
  14: 'Management Review',
};

// ============================================================================
// STATUS CONFIG
// ============================================================================

const STATUS_CONFIG = {
  compliant: { color: 'text-emerald-400', bg: 'bg-emerald-500/20', border: 'border-emerald-500/30' },
  partial: { color: 'text-amber-400', bg: 'bg-amber-500/20', border: 'border-amber-500/30' },
  non_compliant: { color: 'text-red-400', bg: 'bg-red-500/20', border: 'border-red-500/30' },
};

const SEVERITY_CONFIG = {
  critical: { color: 'text-red-400', bg: 'bg-red-500/20', border: 'border-red-500/30', label: 'Critical' },
  major: { color: 'text-amber-400', bg: 'bg-amber-500/20', border: 'border-amber-500/30', label: 'Major' },
  minor: { color: 'text-slate-400', bg: 'bg-slate-500/20', border: 'border-slate-500/30', label: 'Minor' },
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function AuditDocumentsPage() {
  const router = useRouter();
  
  const [compliance, setCompliance] = useState<OverallCompliance | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedElement, setSelectedElement] = useState<number | null>(null);
  const [view, setView] = useState<'gaps' | 'evidence'>('gaps');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

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
  // FILTERING
  // ============================================================================

  const getAllGaps = (): DocumentGap[] => {
    if (!compliance) return [];
    
    let gaps = compliance.by_element.flatMap(e => e.gaps);
    
    if (selectedElement) {
      gaps = gaps.filter(g => g.element_number === selectedElement);
    }
    
    if (filterSeverity !== 'all') {
      gaps = gaps.filter(g => g.severity === filterSeverity);
    }
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      gaps = gaps.filter(g => 
        g.description.toLowerCase().includes(query) ||
        g.action_required.toLowerCase().includes(query)
      );
    }
    
    return gaps;
  };

  const getAllEvidence = (): DocumentEvidence[] => {
    if (!compliance) return [];
    
    let evidence = compliance.by_element.flatMap(e => e.evidence);
    
    // Deduplicate
    const seen = new Set<string>();
    evidence = evidence.filter(e => {
      if (seen.has(e.id)) return false;
      seen.add(e.id);
      return true;
    });
    
    if (selectedElement) {
      evidence = evidence.filter(e => 
        e.cor_elements?.includes(selectedElement) ||
        e.matched_requirements?.some(r => r.includes(`elem${selectedElement}`))
      );
    }
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      evidence = evidence.filter(e => 
        e.title.toLowerCase().includes(query) ||
        e.control_number.toLowerCase().includes(query)
      );
    }
    
    return evidence.sort((a, b) => b.relevance - a.relevance);
  };

  const gaps = getAllGaps();
  const evidence = getAllEvidence();

  // ============================================================================
  // RENDER
  // ============================================================================

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-violet-950 flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-violet-400 animate-spin" />
      </div>
    );
  }

  if (error || !compliance) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-violet-950 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <p className="text-white font-medium mb-2">Failed to load compliance data</p>
          <p className="text-slate-400 text-sm mb-4">{error}</p>
          <button
            onClick={fetchCompliance}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const getProgressColor = (pct: number) => {
    if (pct >= 80) return 'from-emerald-500 to-teal-500';
    if (pct >= 50) return 'from-amber-500 to-orange-500';
    return 'from-red-500 to-rose-500';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-violet-950 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button 
            onClick={() => router.back()}
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-4"
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>
          
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 border border-violet-500/30">
                <FileText className="w-8 h-8 text-violet-400" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white tracking-tight">Document Compliance</h1>
                <p className="text-slate-400 mt-1">
                  COR Audit Document Requirements & Evidence
                </p>
              </div>
            </div>

            <button
              onClick={() => router.push('/admin/documents/upload')}
              className="flex items-center gap-2 px-4 py-2 bg-violet-500 hover:bg-violet-600 text-white rounded-lg font-medium transition-colors"
            >
              <Upload className="w-4 h-4" />
              Upload Documents
            </button>
          </div>
        </div>

        {/* Overall Score */}
        <div className="mb-8 p-6 rounded-2xl bg-slate-900/80 border border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Overall Document Compliance</h2>
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${STATUS_CONFIG[compliance.overall_status].bg} ${STATUS_CONFIG[compliance.overall_status].border} border`}>
              {compliance.overall_status === 'compliant' && <Check className="w-4 h-4 text-emerald-400" />}
              {compliance.overall_status === 'partial' && <AlertTriangle className="w-4 h-4 text-amber-400" />}
              {compliance.overall_status === 'non_compliant' && <X className="w-4 h-4 text-red-400" />}
              <span className={`font-medium ${STATUS_CONFIG[compliance.overall_status].color}`}>
                {compliance.overall_percentage}%
              </span>
            </div>
          </div>

          <div className="h-4 bg-slate-700 rounded-full overflow-hidden mb-4">
            <div
              className={`h-full bg-gradient-to-r ${getProgressColor(compliance.overall_percentage)} transition-all`}
              style={{ width: `${compliance.overall_percentage}%` }}
            />
          </div>

          <div className="grid grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-slate-800/50">
              <p className="text-2xl font-bold text-white">{compliance.matched_documents}</p>
              <p className="text-sm text-slate-400">Documents Matched</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-800/50">
              <p className="text-2xl font-bold text-white">{compliance.required_documents}</p>
              <p className="text-sm text-slate-400">Required</p>
            </div>
            <div className="p-4 rounded-xl bg-red-500/10">
              <p className="text-2xl font-bold text-red-400">{compliance.critical_gaps.length}</p>
              <p className="text-sm text-red-400/80">Critical Gaps</p>
            </div>
            <div className="p-4 rounded-xl bg-amber-500/10">
              <p className="text-2xl font-bold text-amber-400">{compliance.major_gaps.length}</p>
              <p className="text-sm text-amber-400/80">Major Gaps</p>
            </div>
          </div>
        </div>

        {/* Element Filter */}
        <div className="mb-6">
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            <button
              onClick={() => setSelectedElement(null)}
              className={`shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                selectedElement === null
                  ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              All Elements
            </button>
            {compliance.by_element.map(el => (
              <button
                key={el.element_number}
                onClick={() => setSelectedElement(el.element_number)}
                className={`shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                  selectedElement === el.element_number
                    ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <span>{el.element_number}</span>
                <span className={`text-xs ${
                  el.percentage >= 80 ? 'text-emerald-400' :
                  el.percentage >= 50 ? 'text-amber-400' : 'text-red-400'
                }`}>
                  {el.percentage}%
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={view === 'gaps' ? "Search gaps..." : "Search documents..."}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-violet-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setView('gaps')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                view === 'gaps'
                  ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              Gaps ({gaps.length})
            </button>
            <button
              onClick={() => setView('evidence')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                view === 'evidence'
                  ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              Evidence ({evidence.length})
            </button>
          </div>

          {view === 'gaps' && (
            <select
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value)}
              className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white"
            >
              <option value="all">All Severity</option>
              <option value="critical">Critical</option>
              <option value="major">Major</option>
              <option value="minor">Minor</option>
            </select>
          )}
        </div>

        {/* Content */}
        {view === 'gaps' ? (
          <div className="space-y-4">
            {gaps.length === 0 ? (
              <div className="text-center py-12">
                <Check className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
                <p className="text-white font-medium">No gaps found!</p>
                <p className="text-slate-400 text-sm mt-1">
                  {selectedElement ? `Element ${selectedElement} has all required documents` : 'All document requirements are met'}
                </p>
              </div>
            ) : (
              gaps.map((gap, i) => {
                const severity = SEVERITY_CONFIG[gap.severity];
                return (
                  <div
                    key={i}
                    className={`p-5 rounded-xl ${severity.bg} border ${severity.border}`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${severity.bg} ${severity.color}`}>
                            {severity.label}
                          </span>
                          <span className="px-2 py-0.5 bg-slate-700/50 text-slate-300 text-xs rounded-full">
                            Element {gap.element_number}: {ELEMENT_NAMES[gap.element_number]}
                          </span>
                        </div>
                        
                        <h3 className="text-lg font-semibold text-white mb-2">{gap.description}</h3>
                        
                        <div className="flex items-center gap-4 text-sm text-slate-400 mb-3">
                          <span>Found: {gap.found_count} / Required: {gap.required_count}</span>
                          <span>Est. effort: {gap.estimated_effort_hours}h</span>
                        </div>
                        
                        <p className="text-sm text-slate-300 mb-4">{gap.action_required}</p>
                        
                        {(gap.suggested_title || gap.suggested_folder || gap.suggested_document_type) && (
                          <div className="flex items-center gap-2 text-sm">
                            <Sparkles className="w-4 h-4 text-violet-400" />
                            <span className="text-violet-300">
                              Suggested: {gap.suggested_document_type && `${gap.suggested_document_type}`}
                              {gap.suggested_title && ` - "${gap.suggested_title}"`}
                              {gap.suggested_folder && ` in ${gap.suggested_folder} folder`}
                            </span>
                          </div>
                        )}
                      </div>
                      
                      <button
                        onClick={() => router.push(`/admin/documents/upload?type=${gap.suggested_document_type || ''}&element=${gap.element_number}`)}
                        className="shrink-0 flex items-center gap-2 px-4 py-2 bg-violet-500 hover:bg-violet-600 text-white rounded-lg text-sm font-medium transition-colors"
                      >
                        <Upload className="w-4 h-4" />
                        Upload
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {evidence.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                <p className="text-white font-medium">No documents found</p>
                <p className="text-slate-400 text-sm mt-1">Upload documents to see them as evidence</p>
              </div>
            ) : (
              evidence.map((doc) => (
                <button
                  key={doc.id}
                  onClick={() => router.push(`/documents/view/${doc.id}`)}
                  className="w-full p-4 rounded-xl bg-slate-800/50 border border-slate-700 hover:bg-slate-800 hover:border-slate-600 transition-all text-left group"
                >
                  <div className="flex items-start gap-4">
                    <div className="p-2 rounded-lg bg-violet-500/20 shrink-0">
                      <FileText className="w-5 h-5 text-violet-400" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-semibold text-white group-hover:text-violet-400 transition-colors truncate">
                            {doc.title}
                          </p>
                          <p className="text-sm text-violet-400 font-mono">{doc.control_number}</p>
                        </div>
                        
                        <div className="flex items-center gap-2 shrink-0">
                          {doc.is_critical && (
                            <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded-full">
                              Critical
                            </span>
                          )}
                          <span className={`px-2 py-0.5 rounded-full text-xs ${
                            doc.relevance >= 80 ? 'bg-emerald-500/20 text-emerald-400' :
                            doc.relevance >= 50 ? 'bg-amber-500/20 text-amber-400' :
                            'bg-slate-500/20 text-slate-400'
                          }`}>
                            {Math.round(doc.relevance)}% match
                          </span>
                        </div>
                      </div>
                      
                      {doc.description && (
                        <p className="text-sm text-slate-400 mt-1 line-clamp-2">{doc.description}</p>
                      )}
                      
                      {doc.snippet && (
                        <p className="text-sm text-slate-500 mt-2 italic line-clamp-1">
                          &quot;{doc.snippet}&quot;
                        </p>
                      )}
                      
                      <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
                        <span>v{doc.version}</span>
                        {doc.folder_name && <span>{doc.folder_name}</span>}
                        {doc.cor_elements && doc.cor_elements.length > 0 && (
                          <span>Elements: {doc.cor_elements.join(', ')}</span>
                        )}
                      </div>
                    </div>
                    
                    <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-violet-400 group-hover:translate-x-1 transition-all shrink-0" />
                  </div>
                </button>
              ))
            )}
          </div>
        )}

        {/* Recommendations */}
        {compliance.recommendations.length > 0 && (
          <div className="mt-8 p-6 rounded-2xl bg-slate-900/80 border border-slate-700">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              Recommendations
            </h3>
            <ul className="space-y-3">
              {compliance.recommendations.map((rec, i) => (
                <li key={i} className="flex items-start gap-3 text-slate-300">
                  <span className="text-violet-400 mt-0.5">→</span>
                  {rec}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
