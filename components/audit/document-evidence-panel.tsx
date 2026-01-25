'use client';

import { useState, useEffect } from 'react';
import { 
  FileText, CheckCircle, AlertTriangle, XCircle, Link2, 
  Search, ExternalLink, Calendar, RefreshCw, ChevronDown,
  ChevronRight, FolderOpen, FileCheck, Clock
} from 'lucide-react';
import {
  DOCUMENT_TYPE_LABELS,
  DOCUMENT_STATUS_LABELS,
  DOCUMENT_STATUS_COLORS,
  type Document,
  type DocumentStatus,
} from '@/lib/documents/types';
import { COR_ELEMENTS } from '@/lib/audit/types';

interface AuditEvidenceReport {
  elementNumber: number;
  elementName: string;
  requiredDocuments: string[];
  foundDocuments: Document[];
  missingTypes: string[];
  invalidDocuments: {
    document: Document;
    isValid: boolean;
    issues: { type: string; message: string; severity: string }[];
  }[];
  coveragePercentage: number;
  status: 'complete' | 'partial' | 'missing';
}

interface FullReport {
  elements: AuditEvidenceReport[];
  overallCoverage: number;
  criticalIssues: string[];
}

export function DocumentEvidencePanel() {
  const [report, setReport] = useState<FullReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedElements, setExpandedElements] = useState<Set<number>>(new Set());
  const [selectedElement, setSelectedElement] = useState<number | null>(null);

  useEffect(() => {
    loadReport();
  }, []);

  async function loadReport() {
    setLoading(true);
    try {
      const res = await fetch('/api/documents/evidence-report');
      const data = await res.json();
      setReport(data);
    } catch (error) {
      console.error('Failed to load report:', error);
    } finally {
      setLoading(false);
    }
  }

  function toggleElement(elementNumber: number) {
    setExpandedElements(prev => {
      const next = new Set(prev);
      if (next.has(elementNumber)) {
        next.delete(elementNumber);
      } else {
        next.add(elementNumber);
      }
      return next;
    });
  }

  if (loading) {
    return (
      <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-8">
        <div className="flex items-center justify-center">
          <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin" />
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-8 text-center">
        <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto mb-4" />
        <p className="text-white">Failed to load evidence report</p>
        <button 
          onClick={loadReport}
          className="mt-4 px-4 py-2 bg-indigo-500/20 text-indigo-400 rounded-lg hover:bg-indigo-500/30"
        >
          Retry
        </button>
      </div>
    );
  }

  const completeCount = report.elements.filter(e => e.status === 'complete').length;
  const partialCount = report.elements.filter(e => e.status === 'partial').length;
  const missingCount = report.elements.filter(e => e.status === 'missing').length;

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-indigo-500/20 to-indigo-600/10 border border-indigo-500/30 rounded-xl p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/20 rounded-lg">
              <FolderOpen className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <p className="text-slate-400 text-sm">Overall Coverage</p>
              <p className="text-2xl font-bold text-white">{report.overallCoverage.toFixed(0)}%</p>
            </div>
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border border-emerald-500/30 rounded-xl p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/20 rounded-lg">
              <CheckCircle className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-slate-400 text-sm">Complete</p>
              <p className="text-2xl font-bold text-white">{completeCount} / 14</p>
            </div>
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/30 rounded-xl p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/20 rounded-lg">
              <Clock className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <p className="text-slate-400 text-sm">Partial</p>
              <p className="text-2xl font-bold text-white">{partialCount}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-rose-500/20 to-rose-600/10 border border-rose-500/30 rounded-xl p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-rose-500/20 rounded-lg">
              <XCircle className="w-5 h-5 text-rose-400" />
            </div>
            <div>
              <p className="text-slate-400 text-sm">Missing</p>
              <p className="text-2xl font-bold text-white">{missingCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Critical Issues */}
      {report.criticalIssues.length > 0 && (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-rose-400 flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5" />
            Critical Issues ({report.criticalIssues.length})
          </h3>
          <ul className="space-y-2">
            {report.criticalIssues.slice(0, 5).map((issue, i) => (
              <li key={i} className="text-rose-300 text-sm flex items-start gap-2">
                <XCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                {issue}
              </li>
            ))}
            {report.criticalIssues.length > 5 && (
              <li className="text-rose-400 text-sm">
                + {report.criticalIssues.length - 5} more issues
              </li>
            )}
          </ul>
        </div>
      )}

      {/* Elements Grid */}
      <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-700/50 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">COR Element Evidence Status</h3>
          <button 
            onClick={loadReport}
            className="p-2 text-slate-400 hover:text-white transition-colors"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
        
        <div className="divide-y divide-slate-700/30">
          {report.elements.map((element) => (
            <ElementRow
              key={element.elementNumber}
              element={element}
              isExpanded={expandedElements.has(element.elementNumber)}
              onToggle={() => toggleElement(element.elementNumber)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function ElementRow({ 
  element, 
  isExpanded, 
  onToggle 
}: { 
  element: AuditEvidenceReport;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const statusConfig = {
    complete: { icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/20' },
    partial: { icon: Clock, color: 'text-amber-400', bg: 'bg-amber-500/20' },
    missing: { icon: XCircle, color: 'text-rose-400', bg: 'bg-rose-500/20' },
  };
  
  const config = statusConfig[element.status];
  const Icon = config.icon;

  return (
    <div>
      <div 
        onClick={onToggle}
        className="px-6 py-4 hover:bg-slate-700/20 transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-4">
          <button className="p-1 text-slate-400">
            {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
          </button>
          
          <div className={`p-2 rounded-lg ${config.bg}`}>
            <Icon className={`w-5 h-5 ${config.color}`} />
          </div>
          
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <span className="text-indigo-400 font-mono">Element {element.elementNumber}</span>
              <span className="text-white font-medium">{element.elementName}</span>
            </div>
            <div className="flex items-center gap-4 mt-1 text-sm text-slate-400">
              <span>{element.foundDocuments.length} documents</span>
              {element.missingTypes.length > 0 && (
                <span className="text-amber-400">
                  {element.missingTypes.length} types missing
                </span>
              )}
            </div>
          </div>
          
          <div className="text-right">
            <div className="flex items-center gap-2">
              <div className="w-32 h-2 bg-slate-700 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all ${
                    element.status === 'complete' ? 'bg-emerald-500' :
                    element.status === 'partial' ? 'bg-amber-500' : 'bg-rose-500'
                  }`}
                  style={{ width: `${element.coveragePercentage}%` }}
                />
              </div>
              <span className={`text-sm font-medium ${config.color}`}>
                {element.coveragePercentage.toFixed(0)}%
              </span>
            </div>
          </div>
        </div>
      </div>
      
      {isExpanded && (
        <div className="px-6 pb-4 bg-slate-800/30">
          <div className="ml-12 space-y-4">
            {/* Found Documents */}
            {element.foundDocuments.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-slate-300 mb-2">Found Documents</h4>
                <div className="space-y-2">
                  {element.foundDocuments.map((doc) => {
                    const validation = element.invalidDocuments.find(
                      v => v.document.id === doc.id
                    );
                    const hasIssues = validation && validation.issues.length > 0;
                    const status = doc.status as DocumentStatus;
                    
                    return (
                      <a
                        key={doc.id}
                        href={`/admin/documents/${doc.id}`}
                        className="flex items-center gap-3 p-3 bg-slate-700/30 rounded-lg hover:bg-slate-700/50 transition-colors"
                      >
                        <FileText className={`w-4 h-4 ${hasIssues ? 'text-amber-400' : 'text-indigo-400'}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-indigo-400 text-sm">{doc.control_number}</span>
                            {/* Safe: status is typed as DocumentStatus from doc.status cast */}
                            {/* eslint-disable-next-line security/detect-object-injection */}
                            <span className={`px-2 py-0.5 text-xs rounded-full ${DOCUMENT_STATUS_COLORS[status].bg} ${DOCUMENT_STATUS_COLORS[status].text}`}>
                              {/* eslint-disable-next-line security/detect-object-injection */}
                              {DOCUMENT_STATUS_LABELS[status]}
                            </span>
                          </div>
                          <p className="text-white text-sm truncate">{doc.title}</p>
                          {hasIssues && (
                            <p className="text-amber-400 text-xs mt-1">
                              {validation.issues.map(i => i.message).join('; ')}
                            </p>
                          )}
                        </div>
                        <ExternalLink className="w-4 h-4 text-slate-500" />
                      </a>
                    );
                  })}
                </div>
              </div>
            )}
            
            {/* Missing Types */}
            {element.missingTypes.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-slate-300 mb-2">Missing Document Types</h4>
                <div className="flex flex-wrap gap-2">
                  {element.missingTypes.map((type) => (
                    <span 
                      key={type}
                      className="px-3 py-1 bg-rose-500/20 text-rose-400 rounded-full text-sm"
                    >
                      {DOCUMENT_TYPE_LABELS[type as keyof typeof DOCUMENT_TYPE_LABELS] || type}
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            {/* Required Types */}
            <div>
              <h4 className="text-sm font-medium text-slate-300 mb-2">Required Document Types</h4>
              <div className="flex flex-wrap gap-2">
                {element.requiredDocuments.map((type) => {
                  const isMissing = element.missingTypes.includes(type);
                  return (
                    <span 
                      key={type}
                      className={`px-3 py-1 rounded-full text-sm ${
                        isMissing 
                          ? 'bg-rose-500/20 text-rose-400' 
                          : 'bg-emerald-500/20 text-emerald-400'
                      }`}
                    >
                      {DOCUMENT_TYPE_LABELS[type as keyof typeof DOCUMENT_TYPE_LABELS] || type}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DocumentEvidencePanel;
