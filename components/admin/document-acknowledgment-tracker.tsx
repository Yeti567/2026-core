'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users, Check, Clock, AlertTriangle, Bell, ChevronRight,
  Loader2, Send, RefreshCw, Eye, MoreVertical, X, Mail
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

interface DocumentAcknowledgment {
  id: string;
  document_id: string;
  worker_id: string;
  worker_name?: string;
  worker_email?: string;
  required_by_date?: string;
  acknowledged_at?: string;
  status: 'pending' | 'acknowledged' | 'overdue' | 'exempt';
  reminder_count: number;
  last_reminder_at?: string;
}

interface AcknowledgmentStats {
  total: number;
  acknowledged: number;
  pending: number;
  overdue: number;
}

interface DocumentWithAcknowledgments {
  id: string;
  control_number: string;
  title: string;
  worker_must_acknowledge: boolean;
  acknowledgment_deadline_days?: number;
  stats?: AcknowledgmentStats;
  acknowledgments?: DocumentAcknowledgment[];
}

// ============================================================================
// ACKNOWLEDGMENT TRACKER WIDGET
// ============================================================================

interface AcknowledgmentTrackerProps {
  documentId?: string;
  compact?: boolean;
}

export function AcknowledgmentTracker({ documentId, compact = false }: AcknowledgmentTrackerProps) {
  const router = useRouter();
  const [documents, setDocuments] = useState<DocumentWithAcknowledgments[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<DocumentWithAcknowledgments | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSendingReminders, setIsSendingReminders] = useState(false);

  const fetchDocumentsRequiringAcknowledgment = useCallback(async () => {
    setIsLoading(true);
    try {
      const url = documentId 
        ? `/api/documents/${documentId}/acknowledgments`
        : '/api/documents/acknowledgments/admin';
      
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        if (documentId) {
          setDocuments([{
            id: documentId,
            control_number: '',
            title: '',
            worker_must_acknowledge: true,
            stats: data.stats,
            acknowledgments: data.acknowledgments,
          }]);
        } else {
          setDocuments(data.documents || []);
        }
      }
    } catch (error) {
      console.error('Failed to fetch acknowledgments:', error);
    } finally {
      setIsLoading(false);
    }
  }, [documentId]);

  useEffect(() => {
    fetchDocumentsRequiringAcknowledgment();
  }, [fetchDocumentsRequiringAcknowledgment]);

  const sendReminders = async (docId: string) => {
    setIsSendingReminders(true);
    try {
      await fetch(`/api/documents/${docId}/acknowledgments/remind`, {
        method: 'POST',
      });
      await fetchDocumentsRequiringAcknowledgment();
    } catch (error) {
      console.error('Failed to send reminders:', error);
    } finally {
      setIsSendingReminders(false);
    }
  };

  const getCompletionPercentage = (stats?: AcknowledgmentStats) => {
    if (!stats || stats.total === 0) return 0;
    return Math.round((stats.acknowledged / stats.total) * 100);
  };

  const getStatusColor = (percentage: number) => {
    if (percentage === 100) return 'text-emerald-400';
    if (percentage >= 75) return 'text-amber-400';
    return 'text-red-400';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
      </div>
    );
  }

  // Compact view for dashboard
  if (compact) {
    const totalStats = documents.reduce((acc, doc) => {
      if (doc.stats) {
        acc.total += doc.stats.total;
        acc.acknowledged += doc.stats.acknowledged;
        acc.pending += doc.stats.pending;
        acc.overdue += doc.stats.overdue;
      }
      return acc;
    }, { total: 0, acknowledged: 0, pending: 0, overdue: 0 });

    const percentage = getCompletionPercentage(totalStats);

    return (
      <div className="rounded-2xl bg-slate-900/80 border border-slate-700 p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-violet-400" />
            <span className="font-semibold text-white">Acknowledgments</span>
          </div>
          <span className={`font-semibold ${getStatusColor(percentage)}`}>
            {percentage}%
          </span>
        </div>

        <div className="h-2 bg-slate-700 rounded-full overflow-hidden mb-3">
          <div
            className={`h-full transition-all ${
              percentage === 100 ? 'bg-emerald-500' :
              percentage >= 75 ? 'bg-amber-500' : 'bg-red-500'
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-400">
            {totalStats.acknowledged}/{totalStats.total} workers
          </span>
          {totalStats.overdue > 0 && (
            <span className="text-red-400">{totalStats.overdue} overdue</span>
          )}
        </div>

        <button
          onClick={() => router.push('/admin/documents/acknowledgments')}
          className="mt-3 w-full flex items-center justify-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm transition-colors"
        >
          View Details
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  // Full view
  return (
    <div className="space-y-4">
      {documents.length === 0 ? (
        <div className="text-center py-8">
          <Check className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
          <p className="text-white font-medium">No pending acknowledgments</p>
          <p className="text-slate-400 text-sm mt-1">All documents are acknowledged</p>
        </div>
      ) : (
        documents.map(doc => {
          const percentage = getCompletionPercentage(doc.stats);
          
          return (
            <div
              key={doc.id}
              className="rounded-xl bg-slate-800/50 border border-slate-700 overflow-hidden"
            >
              {/* Header */}
              <div className="p-4 border-b border-slate-700">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-white truncate">{doc.title}</p>
                    <p className="text-sm text-violet-400 font-mono">{doc.control_number}</p>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className={`text-lg font-bold ${getStatusColor(percentage)}`}>
                      {percentage}%
                    </span>
                    <button
                      onClick={() => setSelectedDoc(selectedDoc?.id === doc.id ? null : doc)}
                      className="p-1.5 hover:bg-slate-700 rounded-lg transition-colors"
                    >
                      <MoreVertical className="w-4 h-4 text-slate-400" />
                    </button>
                  </div>
                </div>

                {/* Progress */}
                <div className="mt-3 h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      percentage === 100 ? 'bg-emerald-500' :
                      percentage >= 75 ? 'bg-amber-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>

                {/* Stats */}
                <div className="flex items-center gap-4 mt-3 text-sm">
                  <span className="flex items-center gap-1 text-emerald-400">
                    <Check className="w-4 h-4" />
                    {doc.stats?.acknowledged || 0}
                  </span>
                  <span className="flex items-center gap-1 text-amber-400">
                    <Clock className="w-4 h-4" />
                    {doc.stats?.pending || 0}
                  </span>
                  {(doc.stats?.overdue || 0) > 0 && (
                    <span className="flex items-center gap-1 text-red-400">
                      <AlertTriangle className="w-4 h-4" />
                      {doc.stats?.overdue || 0}
                    </span>
                  )}
                  <span className="text-slate-500 ml-auto">
                    {doc.stats?.total || 0} total
                  </span>
                </div>
              </div>

              {/* Expanded Details */}
              {selectedDoc?.id === doc.id && doc.acknowledgments && (
                <div className="p-4 bg-slate-900/50">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-medium text-white">Worker Status</h4>
                    {(doc.stats?.pending || 0) > 0 && (
                      <button
                        onClick={() => sendReminders(doc.id)}
                        disabled={isSendingReminders}
                        className="flex items-center gap-2 px-3 py-1.5 bg-violet-500/20 hover:bg-violet-500/30 text-violet-300 rounded-lg text-sm transition-colors disabled:opacity-50"
                      >
                        {isSendingReminders ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                        Send Reminders
                      </button>
                    )}
                  </div>

                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {doc.acknowledgments.map(ack => (
                      <div
                        key={ack.id}
                        className={`flex items-center gap-3 p-2 rounded-lg ${
                          ack.status === 'acknowledged' ? 'bg-emerald-500/10' :
                          ack.status === 'overdue' ? 'bg-red-500/10' :
                          'bg-slate-800/50'
                        }`}
                      >
                        <div className={`w-2 h-2 rounded-full ${
                          ack.status === 'acknowledged' ? 'bg-emerald-400' :
                          ack.status === 'overdue' ? 'bg-red-400' :
                          'bg-amber-400'
                        }`} />
                        
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white truncate">
                            {ack.worker_name || 'Unknown Worker'}
                          </p>
                          {ack.worker_email && (
                            <p className="text-xs text-slate-500 truncate">{ack.worker_email}</p>
                          )}
                        </div>

                        <div className="text-right text-xs">
                          {ack.status === 'acknowledged' ? (
                            <span className="text-emerald-400">
                              {ack.acknowledged_at 
                                ? new Date(ack.acknowledged_at).toLocaleDateString()
                                : 'Acknowledged'
                              }
                            </span>
                          ) : ack.status === 'overdue' ? (
                            <span className="text-red-400">
                              Overdue
                              {ack.required_by_date && (
                                <> since {new Date(ack.required_by_date).toLocaleDateString()}</>
                              )}
                            </span>
                          ) : (
                            <span className="text-slate-400">
                              {ack.required_by_date 
                                ? `Due ${new Date(ack.required_by_date).toLocaleDateString()}`
                                : 'Pending'
                              }
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}

// ============================================================================
// ACKNOWLEDGMENT SUMMARY CARD
// ============================================================================

interface AcknowledgmentSummaryProps {
  stats: AcknowledgmentStats;
  documentTitle?: string;
  controlNumber?: string;
}

export function AcknowledgmentSummary({ stats, documentTitle, controlNumber }: AcknowledgmentSummaryProps) {
  const percentage = stats.total > 0 ? Math.round((stats.acknowledged / stats.total) * 100) : 0;
  
  return (
    <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700">
      {documentTitle && (
        <div className="mb-3">
          <p className="font-medium text-white">{documentTitle}</p>
          {controlNumber && (
            <p className="text-sm text-violet-400 font-mono">{controlNumber}</p>
          )}
        </div>
      )}

      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-slate-400">Acknowledgments</span>
        <span className={`font-semibold ${
          percentage === 100 ? 'text-emerald-400' :
          percentage >= 75 ? 'text-amber-400' : 'text-red-400'
        }`}>
          {stats.acknowledged}/{stats.total} ({percentage}%)
        </span>
      </div>

      <div className="h-2 bg-slate-700 rounded-full overflow-hidden mb-3">
        <div
          className={`h-full transition-all ${
            percentage === 100 ? 'bg-emerald-500' :
            percentage >= 75 ? 'bg-amber-500' : 'bg-red-500'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        <div className="p-2 rounded-lg bg-emerald-500/10">
          <p className="font-semibold text-emerald-400">{stats.acknowledged}</p>
          <p className="text-emerald-400/70">Acknowledged</p>
        </div>
        <div className="p-2 rounded-lg bg-amber-500/10">
          <p className="font-semibold text-amber-400">{stats.pending}</p>
          <p className="text-amber-400/70">Pending</p>
        </div>
        <div className="p-2 rounded-lg bg-red-500/10">
          <p className="font-semibold text-red-400">{stats.overdue}</p>
          <p className="text-red-400/70">Overdue</p>
        </div>
      </div>
    </div>
  );
}

export default AcknowledgmentTracker;
