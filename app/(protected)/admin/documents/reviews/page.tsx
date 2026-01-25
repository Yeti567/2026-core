'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  Calendar, AlertTriangle, Clock, CheckCircle, 
  ChevronRight, FileText, RefreshCw, Filter, Bell
} from 'lucide-react';
import {
  DOCUMENT_TYPE_LABELS,
  DOCUMENT_STATUS_LABELS,
  DOCUMENT_STATUS_COLORS,
  type DocumentWithVersion,
} from '@/lib/documents/types';

export default function DocumentReviewsPage() {
  const [documents, setDocuments] = useState<DocumentWithVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [daysAhead, setDaysAhead] = useState(30);

  const loadDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/documents/evidence-report?action=reviews_due&days=${daysAhead}`);
      const data = await res.json();
      setDocuments(data || []);
    } catch (error) {
      console.error('Failed to load documents:', error);
    } finally {
      setLoading(false);
    }
  }, [daysAhead]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const now = new Date();
  const overdue = documents.filter(d => d.next_review_date && new Date(d.next_review_date) < now);
  const dueThisWeek = documents.filter(d => {
    if (!d.next_review_date) return false;
    const reviewDate = new Date(d.next_review_date);
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    return reviewDate >= now && reviewDate <= weekFromNow;
  });
  const upcoming = documents.filter(d => {
    if (!d.next_review_date) return false;
    const reviewDate = new Date(d.next_review_date);
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    return reviewDate > weekFromNow;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Header */}
      <div className="border-b border-slate-800/50 bg-slate-900/30 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl">
                  <Calendar className="w-7 h-7 text-white" />
                </div>
                Document Reviews
              </h1>
              <p className="text-slate-400 mt-1">
                Track and manage scheduled document reviews
              </p>
            </div>
            
            <div className="flex items-center gap-4">
              <select
                value={daysAhead}
                onChange={(e) => setDaysAhead(parseInt(e.target.value))}
                className="px-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-xl 
                         text-white focus:outline-none focus:border-indigo-500/50"
              >
                <option value={7}>Next 7 days</option>
                <option value={30}>Next 30 days</option>
                <option value={60}>Next 60 days</option>
                <option value={90}>Next 90 days</option>
              </select>
              
              <button 
                onClick={loadDocuments}
                className="p-2 text-slate-400 hover:text-white transition-colors"
              >
                <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-rose-500/20 to-rose-600/10 border border-rose-500/30 rounded-xl p-5">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-rose-500/20 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-rose-400" />
              </div>
              <div>
                <p className="text-slate-400 text-sm">Overdue</p>
                <p className="text-2xl font-bold text-white">{overdue.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/30 rounded-xl p-5">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/20 rounded-lg">
                <Clock className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <p className="text-slate-400 text-sm">Due This Week</p>
                <p className="text-2xl font-bold text-white">{dueThisWeek.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-indigo-500/20 to-indigo-600/10 border border-indigo-500/30 rounded-xl p-5">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-500/20 rounded-lg">
                <Calendar className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <p className="text-slate-400 text-sm">Upcoming</p>
                <p className="text-2xl font-bold text-white">{upcoming.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Overdue Section */}
        {overdue.length > 0 && (
          <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-rose-500/20">
              <h2 className="text-lg font-semibold text-rose-400 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Overdue Reviews ({overdue.length})
              </h2>
            </div>
            <div className="divide-y divide-rose-500/20">
              {overdue.map((doc) => (
                <ReviewRow key={doc.id} document={doc} isOverdue />
              ))}
            </div>
          </div>
        )}

        {/* Due This Week */}
        {dueThisWeek.length > 0 && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-amber-500/20">
              <h2 className="text-lg font-semibold text-amber-400 flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Due This Week ({dueThisWeek.length})
              </h2>
            </div>
            <div className="divide-y divide-amber-500/20">
              {dueThisWeek.map((doc) => (
                <ReviewRow key={doc.id} document={doc} />
              ))}
            </div>
          </div>
        )}

        {/* Upcoming */}
        {upcoming.length > 0 && (
          <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-700/50">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Calendar className="w-5 h-5 text-indigo-400" />
                Upcoming Reviews ({upcoming.length})
              </h2>
            </div>
            <div className="divide-y divide-slate-700/30">
              {upcoming.map((doc) => (
                <ReviewRow key={doc.id} document={doc} />
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && documents.length === 0 && (
          <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-12 text-center">
            <CheckCircle className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">All Caught Up!</h3>
            <p className="text-slate-400">
              No document reviews due in the next {daysAhead} days.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function ReviewRow({ 
  document, 
  isOverdue = false 
}: { 
  document: DocumentWithVersion;
  isOverdue?: boolean;
}) {
  const reviewDate = document.next_review_date ? new Date(document.next_review_date) : null;
  const daysUntil = reviewDate 
    ? Math.ceil((reviewDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;
  
  return (
    <a
      href={`/admin/documents/${document.id}`}
      className="flex items-center gap-4 px-6 py-4 hover:bg-white/5 transition-colors"
    >
      <div className={`p-3 rounded-xl ${isOverdue ? 'bg-rose-500/20' : 'bg-slate-800/50'}`}>
        <FileText className={`w-6 h-6 ${isOverdue ? 'text-rose-400' : 'text-indigo-400'}`} />
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3">
          <span className="font-mono text-indigo-400 text-sm">
            {document.control_number}
          </span>
          <span className={`px-2 py-0.5 text-xs rounded-full ${DOCUMENT_STATUS_COLORS[document.status].bg} ${DOCUMENT_STATUS_COLORS[document.status].text}`}>
            v{document.current_version}
          </span>
        </div>
        <h3 className="text-white font-medium mt-1 truncate">{document.title}</h3>
        <p className="text-slate-500 text-sm">
          {DOCUMENT_TYPE_LABELS[document.document_type_code]}
          {document.department && ` • ${document.department}`}
        </p>
      </div>
      
      <div className="text-right">
        {reviewDate && (
          <>
            <p className={`font-medium ${isOverdue ? 'text-rose-400' : daysUntil !== null && daysUntil <= 7 ? 'text-amber-400' : 'text-slate-300'}`}>
              {reviewDate.toLocaleDateString()}
            </p>
            <p className={`text-sm ${isOverdue ? 'text-rose-400' : 'text-slate-500'}`}>
              {isOverdue 
                ? `${Math.abs(daysUntil || 0)} days overdue`
                : daysUntil === 0 
                  ? 'Due today'
                  : `${daysUntil} days`
              }
            </p>
          </>
        )}
      </div>
      
      <ChevronRight className="w-5 h-5 text-slate-500" />
    </a>
  );
}
