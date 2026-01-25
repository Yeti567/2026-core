'use client';

import { useState, useEffect } from 'react';
import { 
  FileText, 
  Link2, 
  CheckCircle, 
  AlertCircle,
  ChevronRight,
  ExternalLink,
  Search,
  XCircle,
  Clock,
  Target,
  HelpCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface AuditQuestion {
  id: string;
  element_number: number;
  question_number: string;
  question_text: string;
  verification_methods: string[];
  required_evidence_types: string[];
  point_value: number;
  sampling_requirements: string | null;
  category: string | null;
}

interface QuestionEvidence {
  question: AuditQuestion;
  evidence_found: Evidence[];
  is_sufficient: boolean;
  required_samples: number;
  found_samples: number;
  coverage_percentage: number;
  gaps: string[];
  score: number;
  max_score: number;
}

interface Evidence {
  id: string;
  type: string;
  reference: string;
  date: string;
  description: string;
  url: string;
  formCode?: string;
  relevanceScore?: number;
}

interface ElementSummary {
  element_number: number;
  element_name: string;
  total_questions: number;
  questions_with_evidence: number;
  questions_sufficient: number;
  total_evidence: number;
  overall_coverage: number;
  earned_points: number;
  max_points: number;
  percentage: number;
  questions?: QuestionEvidence[];
}

interface EvidenceMapData {
  report: {
    total_questions: number;
    total_evidence_items: number;
    questions_with_sufficient_evidence: number;
    overall_coverage_percentage: number;
    total_points: number;
    max_points: number;
    overall_percentage: number;
    elements: ElementSummary[];
    critical_gaps: string[];
  };
}

const ELEMENT_NAMES: Record<number, string> = {
  1: 'Health & Safety Management System',
  2: 'Hazard Identification & Assessment',
  3: 'Hazard Control',
  4: 'Competency & Training',
  5: 'Workplace Behavior',
  6: 'Personal Protective Equipment',
  7: 'Preventative Maintenance',
  8: 'Training & Communication',
  9: 'Workplace Inspections',
  10: 'Incident Investigation',
  11: 'Emergency Preparedness',
  12: 'Statistics & Records',
  13: 'Regulatory Awareness',
  14: 'Management System Review',
};

export function EvidenceMapper() {
  const [data, setData] = useState<EvidenceMapData | null>(null);
  const [selectedElement, setSelectedElement] = useState<number | null>(null);
  const [elementDetail, setElementDetail] = useState<ElementSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchEvidenceData();
  }, []);

  useEffect(() => {
    if (selectedElement) {
      fetchElementDetail(selectedElement);
    } else {
      setElementDetail(null);
    }
  }, [selectedElement]);

  const fetchEvidenceData = async () => {
    try {
      const res = await fetch('/api/audit/evidence-map');
      if (res.ok) {
        const result = await res.json();
        setData(result);
      }
    } catch (error) {
      console.error('Failed to fetch evidence data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchElementDetail = async (elementNum: number) => {
    setLoadingDetail(true);
    try {
      const res = await fetch(`/api/audit/evidence-map?element=${elementNum}&full=true`);
      if (res.ok) {
        const result = await res.json();
        setElementDetail(result.element);
      }
    } catch (error) {
      console.error('Failed to fetch element detail:', error);
    } finally {
      setLoadingDetail(false);
    }
  };

  const getStatusColor = (coverage: number) => {
    if (coverage >= 80) return { bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/30' };
    if (coverage >= 50) return { bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/30' };
    return { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30' };
  };

  const getStatusIcon = (isSufficient: boolean) => {
    if (isSufficient) return <CheckCircle className="w-5 h-5 text-emerald-400" />;
    return <XCircle className="w-5 h-5 text-red-400" />;
  };

  const filteredElements = data?.report.elements.filter(element => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      element.element_name.toLowerCase().includes(query) ||
      element.element_number.toString().includes(query)
    );
  }) || [];

  if (loading) {
    return (
      <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-slate-700/50 rounded w-1/3" />
            <div className="h-64 bg-slate-700/50 rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur overflow-hidden">
      <CardHeader className="border-b border-slate-700/50 bg-gradient-to-r from-slate-800/50 to-transparent">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-3 text-xl">
            <div className="p-2 rounded-lg bg-cyan-500/20">
              <Link2 className="w-6 h-6 text-cyan-400" />
            </div>
            Evidence Mapper
          </CardTitle>
          {data && (
            <div className="flex items-center gap-4 text-sm">
              <span className="text-slate-400">
                {data.report.total_evidence_items} evidence items
              </span>
              <span className="text-slate-400">•</span>
              <span className="text-slate-400">
                {data.report.questions_with_sufficient_evidence}/{data.report.total_questions} questions covered
              </span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {/* Stats bar */}
        {data && (
          <div className="grid grid-cols-4 gap-px bg-slate-700/30">
            <div className="p-4 bg-slate-800/50 text-center">
              <p className="text-2xl font-bold text-white">{data.report.total_questions}</p>
              <p className="text-xs text-slate-400">Audit Questions</p>
            </div>
            <div className="p-4 bg-slate-800/50 text-center">
              <p className="text-2xl font-bold text-emerald-400">{data.report.questions_with_sufficient_evidence}</p>
              <p className="text-xs text-slate-400">Sufficiently Covered</p>
            </div>
            <div className="p-4 bg-slate-800/50 text-center">
              <p className="text-2xl font-bold text-cyan-400">{data.report.total_evidence_items}</p>
              <p className="text-xs text-slate-400">Evidence Items</p>
            </div>
            <div className="p-4 bg-slate-800/50 text-center">
              <p className={`text-2xl font-bold ${
                data.report.overall_coverage_percentage >= 80 ? 'text-emerald-400' :
                data.report.overall_coverage_percentage >= 60 ? 'text-amber-400' : 'text-red-400'
              }`}>
                {Math.round(data.report.overall_coverage_percentage)}%
              </p>
              <p className="text-xs text-slate-400">Overall Coverage</p>
            </div>
          </div>
        )}

        {/* Search bar */}
        <div className="p-4 border-b border-slate-700/50">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search elements..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
            />
          </div>
        </div>

        {/* Two-panel layout */}
        <div className="grid md:grid-cols-2 divide-x divide-slate-700/50">
          {/* Elements list */}
          <div className="max-h-[500px] overflow-y-auto scrollbar-thin">
            {filteredElements.map((element) => {
              const colors = getStatusColor(element.overall_coverage);
              const isSelected = selectedElement === element.element_number;
              
              return (
                <button
                  key={element.element_number}
                  onClick={() => setSelectedElement(isSelected ? null : element.element_number)}
                  className={`w-full p-4 text-left border-b border-slate-700/30 transition-all ${
                    isSelected 
                      ? 'bg-cyan-500/10 border-l-2 border-l-cyan-500' 
                      : 'hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg font-bold ${colors.bg} ${colors.text}`}>
                      {element.element_number}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-slate-200 truncate">
                          {element.element_name}
                        </span>
                        <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${
                          isSelected ? 'rotate-90' : ''
                        }`} />
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                          <div 
                            className={`h-full transition-all ${
                              element.overall_coverage >= 80 ? 'bg-emerald-500' :
                              element.overall_coverage >= 50 ? 'bg-amber-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${element.overall_coverage}%` }}
                          />
                        </div>
                        <span className="text-xs text-slate-400 w-10 text-right">
                          {Math.round(element.overall_coverage)}%
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                        <span>{element.questions_sufficient}/{element.total_questions} sufficient</span>
                        <span>•</span>
                        <span>{element.total_evidence} evidence</span>
                        <span>•</span>
                        <span>{element.earned_points}/{element.max_points} pts</span>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Questions detail */}
          <div className="max-h-[500px] overflow-y-auto scrollbar-thin bg-slate-800/30">
            {loadingDetail ? (
              <div className="h-full flex items-center justify-center p-8">
                <div className="animate-spin w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full" />
              </div>
            ) : elementDetail?.questions ? (
              <div className="p-4 space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-white">
                    Element {elementDetail.element_number} Questions
                  </h3>
                  <span className="text-xs text-slate-400">
                    {elementDetail.questions.length} questions
                  </span>
                </div>
                
                {elementDetail.questions.map((qe) => {
                  const colors = getStatusColor(qe.coverage_percentage);
                  
                  return (
                    <div 
                      key={qe.question.id}
                      className={`p-4 rounded-lg border transition-all ${colors.bg} ${colors.border}`}
                    >
                      <div className="flex items-start gap-3">
                        {getStatusIcon(qe.is_sufficient)}
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-sm font-medium text-slate-200">
                              Q{qe.question.question_number}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-slate-400">
                                {qe.score}/{qe.max_score} pts
                              </span>
                              {qe.question.category && (
                                <span className={`text-xs px-2 py-0.5 rounded-full ${
                                  qe.question.category === 'documentation' 
                                    ? 'bg-blue-500/20 text-blue-400'
                                    : qe.question.category === 'implementation'
                                    ? 'bg-purple-500/20 text-purple-400'
                                    : 'bg-orange-500/20 text-orange-400'
                                }`}>
                                  {qe.question.category}
                                </span>
                              )}
                            </div>
                          </div>
                          
                          <p className="text-sm text-slate-300 mt-1">
                            {qe.question.question_text}
                          </p>
                          
                          {/* Verification methods */}
                          <div className="flex items-center gap-2 mt-2">
                            {qe.question.verification_methods.map(method => (
                              <span 
                                key={method}
                                className="px-2 py-0.5 text-xs bg-slate-700/50 rounded text-slate-400"
                              >
                                {method}
                              </span>
                            ))}
                          </div>
                          
                          {/* Evidence coverage */}
                          <div className="mt-3 flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                              <div 
                                className={`h-full ${colors.text.replace('text-', 'bg-').replace('-400', '-500')}`}
                                style={{ width: `${qe.coverage_percentage}%` }}
                              />
                            </div>
                            <span className="text-xs text-slate-400">
                              {qe.found_samples}/{qe.required_samples} samples
                            </span>
                          </div>
                          
                          {/* Required evidence types */}
                          <div className="mt-2 text-xs text-slate-500">
                            Needs: {qe.question.required_evidence_types.slice(0, 3).join(', ')}
                            {qe.question.required_evidence_types.length > 3 && '...'}
                          </div>
                          
                          {/* Found evidence */}
                          {qe.evidence_found.length > 0 && (
                            <div className="mt-3 space-y-2">
                              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                                Evidence Found ({qe.evidence_found.length}):
                              </span>
                              {qe.evidence_found.slice(0, 3).map((e) => (
                                <div 
                                  key={e.id}
                                  className="flex items-center gap-2 p-2 bg-slate-800/50 rounded border border-slate-700/50"
                                >
                                  <FileText className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                                  <span className="text-sm text-slate-300 flex-1 truncate">
                                    {e.description}
                                  </span>
                                  <span className="text-xs text-slate-500">
                                    {new Date(e.date).toLocaleDateString()}
                                  </span>
                                </div>
                              ))}
                              {qe.evidence_found.length > 3 && (
                                <p className="text-xs text-slate-500">
                                  +{qe.evidence_found.length - 3} more items
                                </p>
                              )}
                            </div>
                          )}
                          
                          {/* Gaps */}
                          {qe.gaps.length > 0 && (
                            <div className="mt-3 p-2 bg-red-500/5 rounded border border-red-500/20">
                              <span className="text-xs font-medium text-red-400 uppercase tracking-wider">
                                Gaps:
                              </span>
                              <ul className="mt-1 space-y-1">
                                {qe.gaps.map((gap, i) => (
                                  <li key={i} className="text-xs text-red-400/80 flex items-start gap-1">
                                    <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                                    {gap}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Sampling requirements */}
                          {qe.question.sampling_requirements && (
                            <div className="mt-2 flex items-start gap-1 text-xs text-slate-500">
                              <HelpCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                              <span>{qe.question.sampling_requirements}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : selectedElement ? (
              <div className="h-full flex items-center justify-center p-8 text-center">
                <div>
                  <Clock className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                  <p className="text-slate-400 text-sm">
                    Loading element details...
                  </p>
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center p-8 text-center">
                <div>
                  <Target className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-400 text-sm">
                    Select an element to view audit questions and evidence mapping
                  </p>
                  <p className="text-xs text-slate-500 mt-2">
                    Each question shows what evidence is needed and what's been found
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Critical gaps section */}
        {data?.report.critical_gaps && data.report.critical_gaps.length > 0 && (
          <div className="border-t border-slate-700/50 p-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle className="w-4 h-4 text-red-400" />
              <span className="text-sm font-medium text-red-400">
                Critical Gaps ({data.report.critical_gaps.length})
              </span>
            </div>
            <div className="space-y-2 max-h-40 overflow-y-auto scrollbar-thin">
              {data.report.critical_gaps.slice(0, 5).map((gap, i) => (
                <div key={i} className="p-2 bg-red-500/5 rounded border border-red-500/20 text-xs text-red-400/80">
                  {gap}
                </div>
              ))}
              {data.report.critical_gaps.length > 5 && (
                <p className="text-xs text-slate-500">
                  +{data.report.critical_gaps.length - 5} more critical gaps
                </p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
