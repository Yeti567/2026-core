'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Link2, FileText, ChevronRight, Loader2, ArrowRight, ArrowLeft,
  AlertCircle
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

interface RelatedDocument {
  id: string;
  control_number: string;
  title: string;
  document_type: string;
  version: string;
  relationship: 'references' | 'referenced_by' | 'supersedes' | 'superseded_by';
}

interface RelatedDocumentsData {
  document_id: string;
  control_number: string;
  references: RelatedDocument[];
  referenced_by: RelatedDocument[];
  supersedes: RelatedDocument | null;
  superseded_by: RelatedDocument | null;
  total: number;
}

// ============================================================================
// RELATED DOCUMENTS PANEL
// ============================================================================

interface RelatedDocumentsPanelProps {
  documentId: string;
  compact?: boolean;
  onNavigate?: (docId: string) => void;
}

export function RelatedDocumentsPanel({ 
  documentId, 
  compact = false,
  onNavigate 
}: RelatedDocumentsPanelProps) {
  const router = useRouter();
  const [data, setData] = useState<RelatedDocumentsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRelatedDocuments = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/documents/${documentId}/related`);
      if (!response.ok) throw new Error('Failed to fetch related documents');
      
      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setIsLoading(false);
    }
  }, [documentId]);

  useEffect(() => {
    fetchRelatedDocuments();
  }, [fetchRelatedDocuments]);

  const handleNavigate = (docId: string) => {
    if (onNavigate) {
      onNavigate(docId);
    } else {
      router.push(`/documents/view/${docId}`);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 text-slate-500 text-sm py-2">
        <AlertCircle className="w-4 h-4" />
        <span>Could not load related documents</span>
      </div>
    );
  }

  if (!data || data.total === 0) {
    return null; // Don't show anything if no related docs
  }

  // Compact view for document info panel
  if (compact) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm font-medium text-white">
          <Link2 className="w-4 h-4 text-violet-400" />
          Related Documents ({data.total})
        </div>
        
        <div className="space-y-1">
          {data.references.slice(0, 3).map(doc => (
            <button
              key={doc.id}
              onClick={() => handleNavigate(doc.id)}
              className="w-full flex items-center gap-2 p-2 rounded-lg bg-slate-800/50 hover:bg-slate-800 text-left text-sm transition-colors"
            >
              <ArrowRight className="w-3 h-3 text-blue-400 shrink-0" />
              <span className="text-violet-400 font-mono text-xs shrink-0">{doc.control_number}</span>
              <span className="text-slate-300 truncate flex-1">{doc.title}</span>
            </button>
          ))}
          
          {data.referenced_by.slice(0, 3).map(doc => (
            <button
              key={doc.id}
              onClick={() => handleNavigate(doc.id)}
              className="w-full flex items-center gap-2 p-2 rounded-lg bg-slate-800/50 hover:bg-slate-800 text-left text-sm transition-colors"
            >
              <ArrowLeft className="w-3 h-3 text-emerald-400 shrink-0" />
              <span className="text-violet-400 font-mono text-xs shrink-0">{doc.control_number}</span>
              <span className="text-slate-300 truncate flex-1">{doc.title}</span>
            </button>
          ))}
          
          {data.total > 6 && (
            <p className="text-xs text-slate-500 text-center mt-1">
              +{data.total - 6} more
            </p>
          )}
        </div>
      </div>
    );
  }

  // Full view
  return (
    <div className="rounded-xl bg-slate-800/50 border border-slate-700 overflow-hidden">
      <div className="p-4 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <Link2 className="w-5 h-5 text-violet-400" />
          <h3 className="font-semibold text-white">Related Documents</h3>
          <span className="text-sm text-slate-400">({data.total})</span>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Superseded/Superseding */}
        {(data.supersedes || data.superseded_by) && (
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              Version History
            </h4>
            
            {data.supersedes && (
              <button
                onClick={() => handleNavigate(data.supersedes!.id)}
                className="w-full flex items-center gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/15 text-left transition-colors"
              >
                <div className="p-1.5 rounded bg-amber-500/20">
                  <FileText className="w-4 h-4 text-amber-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-300">Supersedes</p>
                  <p className="text-xs text-amber-400 font-mono">{data.supersedes.control_number}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500" />
              </button>
            )}
            
            {data.superseded_by && (
              <button
                onClick={() => handleNavigate(data.superseded_by!.id)}
                className="w-full flex items-center gap-3 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/15 text-left transition-colors"
              >
                <div className="p-1.5 rounded bg-emerald-500/20">
                  <FileText className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-300">Superseded By (Newer Version)</p>
                  <p className="text-xs text-emerald-400 font-mono">{data.superseded_by.control_number}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500" />
              </button>
            )}
          </div>
        )}

        {/* References (documents this doc links to) */}
        {data.references.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              References ({data.references.length})
            </h4>
            
            <div className="space-y-1">
              {data.references.map(doc => (
                <button
                  key={doc.id}
                  onClick={() => handleNavigate(doc.id)}
                  className="w-full flex items-center gap-3 p-3 rounded-lg bg-slate-900/50 hover:bg-slate-800 text-left transition-colors group"
                >
                  <div className="p-1.5 rounded bg-blue-500/20">
                    <ArrowRight className="w-4 h-4 text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white group-hover:text-violet-400 truncate transition-colors">
                      {doc.title}
                    </p>
                    <p className="text-xs text-violet-400 font-mono">{doc.control_number}</p>
                  </div>
                  <span className="text-xs text-slate-500">{doc.document_type}</span>
                  <ChevronRight className="w-4 h-4 text-slate-500 group-hover:translate-x-1 transition-transform" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Referenced By (documents that link to this doc) */}
        {data.referenced_by.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              Referenced By ({data.referenced_by.length})
            </h4>
            
            <div className="space-y-1">
              {data.referenced_by.map(doc => (
                <button
                  key={doc.id}
                  onClick={() => handleNavigate(doc.id)}
                  className="w-full flex items-center gap-3 p-3 rounded-lg bg-slate-900/50 hover:bg-slate-800 text-left transition-colors group"
                >
                  <div className="p-1.5 rounded bg-emerald-500/20">
                    <ArrowLeft className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white group-hover:text-violet-400 truncate transition-colors">
                      {doc.title}
                    </p>
                    <p className="text-xs text-violet-400 font-mono">{doc.control_number}</p>
                  </div>
                  <span className="text-xs text-slate-500">{doc.document_type}</span>
                  <ChevronRight className="w-4 h-4 text-slate-500 group-hover:translate-x-1 transition-transform" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// INLINE REFERENCE LINK
// ============================================================================

interface InlineReferenceLinkProps {
  controlNumber: string;
  className?: string;
}

export function InlineReferenceLink({ controlNumber, className = '' }: InlineReferenceLinkProps) {
  const router = useRouter();
  const [docId, setDocId] = useState<string | null>(null);

  useEffect(() => {
    // Look up document ID by control number
    fetch(`/api/documents/by-control-number?q=${encodeURIComponent(controlNumber)}`)
      .then(res => res.json())
      .then(data => {
        if (data.found && data.document?.id) {
          setDocId(data.document.id);
        }
      })
      .catch(() => {});
  }, [controlNumber]);

  if (!docId) {
    return (
      <span className={`font-mono text-violet-400 ${className}`}>
        {controlNumber}
      </span>
    );
  }

  return (
    <button
      onClick={() => router.push(`/documents/view/${docId}`)}
      className={`font-mono text-violet-400 hover:text-violet-300 underline underline-offset-2 ${className}`}
    >
      {controlNumber}
    </button>
  );
}

export default RelatedDocumentsPanel;
