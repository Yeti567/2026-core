'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  FileText, Search, Plus, Filter, ChevronDown, Calendar, 
  AlertTriangle, CheckCircle, Clock, Archive, RefreshCw,
  FolderOpen, FileCheck, FileX, SortAsc
} from 'lucide-react';
import {
  DOCUMENT_TYPE_LABELS,
  DOCUMENT_STATUS_LABELS,
  DOCUMENT_STATUS_COLORS,
  type DocumentTypeCode,
  type DocumentStatus,
  type DocumentWithVersion,
  type DocumentRegistryStats,
} from '@/lib/documents/types';

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<DocumentWithVersion[]>([]);
  const [stats, setStats] = useState<DocumentRegistryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<DocumentTypeCode | ''>('');
  const [statusFilter, setStatusFilter] = useState<DocumentStatus | ''>('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const loadDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set('query', searchQuery);
      if (typeFilter) params.set('type', typeFilter);
      if (statusFilter) params.set('status', statusFilter);
      
      const res = await fetch(`/api/documents?${params}`);
      const data = await res.json();
      setDocuments(data.documents || []);
    } catch (error) {
      console.error('Failed to load documents:', error);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, typeFilter, statusFilter]);

  const loadStats = useCallback(async () => {
    try {
      const res = await fetch('/api/documents?action=stats');
      const data = await res.json();
      setStats(data);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  }, []);

  useEffect(() => {
    loadDocuments();
    loadStats();
  }, [loadDocuments, loadStats]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    loadDocuments();
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Header */}
      <div className="border-b border-slate-800/50 bg-slate-900/30 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl">
                  <FolderOpen className="w-7 h-7 text-white" />
                </div>
                Document Control System
              </h1>
              <p className="text-slate-400 mt-1">
                Manage your document registry, versions, and lifecycle
              </p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 
                       hover:from-indigo-600 hover:to-purple-700 text-white rounded-xl font-medium 
                       transition-all duration-200 shadow-lg shadow-indigo-500/25"
            >
              <Plus className="w-5 h-5" />
              New Document
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <StatCard
              icon={<FileText className="w-5 h-5" />}
              label="Total Documents"
              value={stats.total_documents}
              color="indigo"
            />
            <StatCard
              icon={<CheckCircle className="w-5 h-5" />}
              label="Active"
              value={stats.by_status.active || 0}
              color="emerald"
            />
            <StatCard
              icon={<Clock className="w-5 h-5" />}
              label="Reviews Due (30 days)"
              value={stats.reviews_due_30_days}
              color="amber"
            />
            <StatCard
              icon={<AlertTriangle className="w-5 h-5" />}
              label="Reviews Overdue"
              value={stats.reviews_overdue}
              color="rose"
            />
          </div>
        )}

        {/* Search & Filters */}
        <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 mb-6">
          <form onSubmit={handleSearch} className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[300px]">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by title, control number, or content..."
                  className="w-full pl-12 pr-4 py-3 bg-slate-900/50 border border-slate-700/50 
                           rounded-xl text-white placeholder-slate-500 focus:outline-none 
                           focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
            </div>
            
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as DocumentTypeCode | '')}
              className="px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-xl 
                       text-white focus:outline-none focus:border-indigo-500/50"
            >
              <option value="">All Types</option>
              {Object.entries(DOCUMENT_TYPE_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
            
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as DocumentStatus | '')}
              className="px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-xl 
                       text-white focus:outline-none focus:border-indigo-500/50"
            >
              <option value="">All Statuses</option>
              {Object.entries(DOCUMENT_STATUS_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
            
            <button
              type="submit"
              className="px-6 py-3 bg-indigo-500/20 border border-indigo-500/30 
                       text-indigo-400 rounded-xl hover:bg-indigo-500/30 transition-colors"
            >
              Search
            </button>
          </form>
        </div>

        {/* Documents List */}
        <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-700/50 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">
              Document Registry
            </h2>
            <button
              onClick={loadDocuments}
              className="p-2 text-slate-400 hover:text-white transition-colors"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
          
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : documents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <FolderOpen className="w-16 h-16 mb-4 opacity-50" />
              <p className="text-lg">No documents found</p>
              <p className="text-sm">Create your first document to get started</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-700/30">
              {documents.map((doc) => (
                <DocumentRow key={doc.id} document={doc} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <CreateDocumentModal
          onClose={() => setShowCreateModal(false)}
          onCreated={() => {
            setShowCreateModal(false);
            loadDocuments();
            loadStats();
          }}
        />
      )}
    </div>
  );
}

// Stat Card Component
function StatCard({ 
  icon, label, value, color 
}: { 
  icon: React.ReactNode; 
  label: string; 
  value: number;
  color: 'indigo' | 'emerald' | 'amber' | 'rose';
}) {
  const colors = {
    indigo: 'from-indigo-500/20 to-indigo-600/10 border-indigo-500/30 text-indigo-400',
    emerald: 'from-emerald-500/20 to-emerald-600/10 border-emerald-500/30 text-emerald-400',
    amber: 'from-amber-500/20 to-amber-600/10 border-amber-500/30 text-amber-400',
    rose: 'from-rose-500/20 to-rose-600/10 border-rose-500/30 text-rose-400',
  };
  
  // Safe: color is a typed prop from component's defined union type
  // eslint-disable-next-line security/detect-object-injection
  const colorClass = colors[color];

  return (
    <div className={`bg-gradient-to-br ${colorClass} border rounded-xl p-5`}>
      <div className="flex items-center gap-3">
        <div className="p-2 bg-white/5 rounded-lg">{icon}</div>
        <div>
          <p className="text-slate-400 text-sm">{label}</p>
          <p className="text-2xl font-bold text-white">{value}</p>
        </div>
      </div>
    </div>
  );
}

// Document Row Component
function DocumentRow({ document }: { document: DocumentWithVersion }) {
  const statusColors = DOCUMENT_STATUS_COLORS[document.status];
  const reviewDate = document.next_review_date ? new Date(document.next_review_date) : null;
  const isOverdue = reviewDate && reviewDate < new Date();
  
  return (
    <a
      href={`/admin/documents/${document.id}`}
      className="flex items-center gap-4 px-6 py-4 hover:bg-slate-700/20 transition-colors group"
    >
      <div className="p-3 bg-slate-800/50 rounded-xl group-hover:bg-slate-700/50 transition-colors">
        <FileText className="w-6 h-6 text-indigo-400" />
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3">
          <span className="font-mono text-indigo-400 text-sm">
            {document.control_number}
          </span>
          <span className={`px-2 py-0.5 text-xs rounded-full ${statusColors.bg} ${statusColors.text} ${statusColors.border} border`}>
            {DOCUMENT_STATUS_LABELS[document.status]}
          </span>
          <span className="px-2 py-0.5 text-xs rounded-full bg-slate-700/50 text-slate-400">
            v{document.current_version}
          </span>
        </div>
        <h3 className="text-white font-medium mt-1 truncate">{document.title}</h3>
        <div className="flex items-center gap-4 mt-1 text-sm text-slate-500">
          <span>{DOCUMENT_TYPE_LABELS[document.document_type_code]}</span>
          {document.department && <span>• {document.department}</span>}
        </div>
      </div>
      
      <div className="text-right">
        {reviewDate && (
          <div className={`flex items-center gap-2 text-sm ${isOverdue ? 'text-rose-400' : 'text-slate-400'}`}>
            <Calendar className="w-4 h-4" />
            <span>
              {isOverdue ? 'Review overdue' : `Review: ${reviewDate.toLocaleDateString()}`}
            </span>
          </div>
        )}
        <div className="text-xs text-slate-500 mt-1">
          Updated {new Date(document.updated_at).toLocaleDateString()}
        </div>
      </div>
    </a>
  );
}

// Create Document Modal
function CreateDocumentModal({ 
  onClose, 
  onCreated 
}: { 
  onClose: () => void; 
  onCreated: () => void;
}) {
  const [formData, setFormData] = useState({
    document_type: 'POL' as DocumentTypeCode,
    title: '',
    description: '',
    department: '',
    category: '',
    review_frequency: 'annual',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const res = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create document');
      }
      
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-700/50 rounded-2xl w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/50">
          <h2 className="text-xl font-semibold text-white">New Document</h2>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-4 bg-rose-500/20 border border-rose-500/30 rounded-xl text-rose-400">
              {error}
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Document Type *
            </label>
            <select
              value={formData.document_type}
              onChange={(e) => setFormData(prev => ({ ...prev, document_type: e.target.value as DocumentTypeCode }))}
              className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-xl 
                       text-white focus:outline-none focus:border-indigo-500/50"
              required
            >
              {Object.entries(DOCUMENT_TYPE_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Title *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="e.g., Health and Safety Policy"
              className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-xl 
                       text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Brief description of the document..."
              rows={3}
              className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-xl 
                       text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 resize-none"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Department
              </label>
              <input
                type="text"
                value={formData.department}
                onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
                placeholder="e.g., Operations"
                className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-xl 
                         text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Review Frequency
              </label>
              <select
                value={formData.review_frequency}
                onChange={(e) => setFormData(prev => ({ ...prev, review_frequency: e.target.value }))}
                className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-xl 
                         text-white focus:outline-none focus:border-indigo-500/50"
              >
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="semi_annual">Semi-Annual</option>
                <option value="annual">Annual</option>
                <option value="biennial">Every 2 Years</option>
                <option value="triennial">Every 3 Years</option>
                <option value="as_needed">As Needed</option>
              </select>
            </div>
          </div>
          
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-slate-800/50 border border-slate-700/50 text-slate-300 
                       rounded-xl hover:bg-slate-700/50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 
                       hover:from-indigo-600 hover:to-purple-700 text-white rounded-xl 
                       font-medium transition-all duration-200 disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Document'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
