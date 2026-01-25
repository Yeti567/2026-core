'use client';

import { useState, useEffect, use, useCallback } from 'react';
import { 
  FileText, Upload, Clock, CheckCircle, AlertTriangle, Archive,
  ChevronRight, ChevronDown, Edit, History, Link2, Download,
  Send, ThumbsUp, ThumbsDown, Eye, RefreshCw, ArrowLeft,
  FileCheck, FilePlus, Calendar, User, Building, Tag
} from 'lucide-react';
import {
  DOCUMENT_TYPE_LABELS,
  DOCUMENT_STATUS_LABELS,
  DOCUMENT_STATUS_COLORS,
  REVIEW_FREQUENCY_LABELS,
  type DocumentWithHistory,
  type DocumentVersion,
  type DocumentStatus,
  type DocumentChangeHistory,
  type DocumentAuditLink,
} from '@/lib/documents/types';
import { COR_ELEMENTS } from '@/lib/audit/types';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function DocumentDetailPage({ params }: PageProps) {
  const { id } = use(params);
  const [document, setDocument] = useState<DocumentWithHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'details' | 'versions' | 'history' | 'audit'>('details');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showVersionModal, setShowVersionModal] = useState(false);

  const loadDocument = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/documents/${id}?history=true`);
      if (!res.ok) throw new Error('Document not found');
      const data = await res.json();
      setDocument(data);
    } catch (error) {
      console.error('Failed to load document:', error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadDocument();
  }, [loadDocument]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!document) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 text-amber-400 mx-auto mb-4" />
          <h2 className="text-xl text-white mb-2">Document Not Found</h2>
          <a href="/admin/documents" className="text-indigo-400 hover:underline">
            Return to Document Registry
          </a>
        </div>
      </div>
    );
  }

  const statusColors = DOCUMENT_STATUS_COLORS[document.status];
  const currentVersion = document.versions?.find(v => v.is_current);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Header */}
      <div className="border-b border-slate-800/50 bg-slate-900/30 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <a 
            href="/admin/documents"
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Registry
          </a>
          
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="font-mono text-lg text-indigo-400">
                  {document.control_number}
                </span>
                <span className={`px-3 py-1 text-sm rounded-full ${statusColors.bg} ${statusColors.text} ${statusColors.border} border`}>
                  {DOCUMENT_STATUS_LABELS[document.status]}
                </span>
                <span className="px-3 py-1 text-sm rounded-full bg-slate-700/50 text-slate-300">
                  v{document.current_version}
                </span>
              </div>
              <h1 className="text-2xl font-bold text-white">{document.title}</h1>
              <div className="flex items-center gap-4 mt-2 text-slate-400">
                <span className="flex items-center gap-1">
                  <Tag className="w-4 h-4" />
                  {DOCUMENT_TYPE_LABELS[document.document_type_code]}
                </span>
                {document.department && (
                  <span className="flex items-center gap-1">
                    <Building className="w-4 h-4" />
                    {document.department}
                  </span>
                )}
              </div>
            </div>
            
            <div className="flex gap-3">
              {currentVersion?.file_path && (
                <a
                  href={`/api/documents/${id}/download`}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-800/50 border border-slate-700/50 
                           text-slate-300 rounded-xl hover:bg-slate-700/50 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Download
                </a>
              )}
              <button
                onClick={() => setShowUploadModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-slate-800/50 border border-slate-700/50 
                         text-slate-300 rounded-xl hover:bg-slate-700/50 transition-colors"
              >
                <Upload className="w-4 h-4" />
                Upload PDF
              </button>
              <button
                onClick={() => setShowVersionModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 
                         hover:from-indigo-600 hover:to-purple-700 text-white rounded-xl transition-all"
              >
                <FilePlus className="w-4 h-4" />
                New Version
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-800/50 bg-slate-900/20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-1">
            {(['details', 'versions', 'history', 'audit'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-4 text-sm font-medium transition-colors relative
                  ${activeTab === tab 
                    ? 'text-indigo-400' 
                    : 'text-slate-400 hover:text-white'}`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                {activeTab === tab && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500" />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {activeTab === 'details' && (
          <DetailsTab document={document} onStatusChange={loadDocument} />
        )}
        {activeTab === 'versions' && (
          <VersionsTab versions={document.versions || []} documentId={id} />
        )}
        {activeTab === 'history' && (
          <HistoryTab history={document.change_history || []} />
        )}
        {activeTab === 'audit' && (
          <AuditTab 
            auditLinks={document.audit_links || []} 
            documentId={id}
            onUpdate={loadDocument}
          />
        )}
      </div>

      {/* Upload Modal */}
      {showUploadModal && currentVersion && (
        <UploadModal
          documentId={id}
          versionId={currentVersion.id}
          onClose={() => setShowUploadModal(false)}
          onUploaded={() => {
            setShowUploadModal(false);
            loadDocument();
          }}
        />
      )}

      {/* New Version Modal */}
      {showVersionModal && (
        <NewVersionModal
          documentId={id}
          currentVersion={document.current_version || document.version}
          onClose={() => setShowVersionModal(false)}
          onCreated={() => {
            setShowVersionModal(false);
            loadDocument();
          }}
        />
      )}
    </div>
  );
}

// Details Tab
function DetailsTab({ 
  document, 
  onStatusChange 
}: { 
  document: DocumentWithHistory;
  onStatusChange: () => void;
}) {
  const [transitioning, setTransitioning] = useState(false);
  const currentVersion = document.versions?.find(v => v.is_current);
  
  const TRANSITIONS: Record<DocumentStatus, { label: string; status: DocumentStatus; color: string }[]> = {
    draft: [{ label: 'Submit for Review', status: 'pending_review', color: 'amber' }],
    pending_review: [
      { label: 'Start Review', status: 'under_review', color: 'blue' },
      { label: 'Return to Draft', status: 'draft', color: 'slate' },
    ],
    under_review: [
      { label: 'Approve', status: 'approved', color: 'emerald' },
      { label: 'Return to Draft', status: 'draft', color: 'slate' },
    ],
    approved: [
      { label: 'Publish', status: 'active', color: 'emerald' },
      { label: 'Return to Draft', status: 'draft', color: 'slate' },
    ],
    active: [
      { label: 'Start Revision', status: 'under_revision', color: 'amber' },
      { label: 'Mark Obsolete', status: 'obsolete', color: 'rose' },
    ],
    under_revision: [
      { label: 'Submit for Review', status: 'pending_review', color: 'amber' },
    ],
    obsolete: [],
    archived: [],
  };

  async function handleTransition(newStatus: DocumentStatus) {
    if (!currentVersion) return;
    setTransitioning(true);
    try {
      const res = await fetch(`/api/documents/${document.id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          version_id: currentVersion.id,
          new_status: newStatus,
        }),
      });
      if (res.ok) {
        onStatusChange();
      }
    } finally {
      setTransitioning(false);
    }
  }

  const availableTransitions = TRANSITIONS[document.status] || [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Main Info */}
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Document Information</h3>
          
          <dl className="grid grid-cols-2 gap-4">
            <div>
              <dt className="text-sm text-slate-400">Control Number</dt>
              <dd className="text-white font-mono">{document.control_number}</dd>
            </div>
            <div>
              <dt className="text-sm text-slate-400">Type</dt>
              <dd className="text-white">{DOCUMENT_TYPE_LABELS[document.document_type_code]}</dd>
            </div>
            <div>
              <dt className="text-sm text-slate-400">Category</dt>
              <dd className="text-white">{document.category || '—'}</dd>
            </div>
            <div>
              <dt className="text-sm text-slate-400">Department</dt>
              <dd className="text-white">{document.department || '—'}</dd>
            </div>
            <div className="col-span-2">
              <dt className="text-sm text-slate-400">Description</dt>
              <dd className="text-white">{document.description || 'No description provided.'}</dd>
            </div>
          </dl>
        </div>

        {/* Review Schedule */}
        <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-indigo-400" />
            Review Schedule
          </h3>
          
          <dl className="grid grid-cols-3 gap-4">
            <div>
              <dt className="text-sm text-slate-400">Review Frequency</dt>
              <dd className="text-white">{document.review_frequency_months ? REVIEW_FREQUENCY_LABELS[document.review_frequency_months as keyof typeof REVIEW_FREQUENCY_LABELS] || `${document.review_frequency_months} months` : 'Not set'}</dd>
            </div>
            <div>
              <dt className="text-sm text-slate-400">Last Review</dt>
              <dd className="text-white">
                {document.last_reviewed_at 
                  ? new Date(document.last_reviewed_at).toLocaleDateString()
                  : 'Never'
                }
              </dd>
            </div>
            <div>
              <dt className="text-sm text-slate-400">Next Review</dt>
              <dd className={document.next_review_date && new Date(document.next_review_date) < new Date() 
                ? 'text-rose-400' 
                : 'text-white'}>
                {document.next_review_date 
                  ? new Date(document.next_review_date).toLocaleDateString()
                  : 'Not scheduled'
                }
              </dd>
            </div>
          </dl>
        </div>

        {/* Current Version Info */}
        {currentVersion && (
          <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-400" />
              Current Version (v{currentVersion.version})
            </h3>
            
            <dl className="grid grid-cols-2 gap-4">
              {currentVersion.file_name && (
                <div>
                  <dt className="text-sm text-slate-400">File</dt>
                  <dd className="text-white">{currentVersion.file_name}</dd>
                </div>
              )}
              {currentVersion.file_size_bytes && (
                <div>
                  <dt className="text-sm text-slate-400">Size</dt>
                  <dd className="text-white">{(currentVersion.file_size_bytes / 1024).toFixed(1)} KB</dd>
                </div>
              )}
              {currentVersion.change_summary && (
                <div className="col-span-2">
                  <dt className="text-sm text-slate-400">Change Summary</dt>
                  <dd className="text-white">{currentVersion.change_summary}</dd>
                </div>
              )}
              {currentVersion.change_reason && (
                <div className="col-span-2">
                  <dt className="text-sm text-slate-400">Change Reason</dt>
                  <dd className="text-white">{currentVersion.change_reason}</dd>
                </div>
              )}
            </dl>
          </div>
        )}
      </div>

      {/* Sidebar */}
      <div className="space-y-6">
        {/* Status Actions */}
        {availableTransitions.length > 0 && (
          <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Lifecycle Actions</h3>
            
            <div className="space-y-3">
              {availableTransitions.map((t) => (
                <button
                  key={t.status}
                  onClick={() => handleTransition(t.status)}
                  disabled={transitioning}
                  className={`w-full px-4 py-3 rounded-xl font-medium transition-colors
                    ${t.color === 'emerald' ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30' :
                      t.color === 'amber' ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30' :
                      t.color === 'blue' ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30' :
                      t.color === 'rose' ? 'bg-rose-500/20 text-rose-400 hover:bg-rose-500/30' :
                      'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50'}
                    disabled:opacity-50`}
                >
                  {transitioning ? 'Processing...' : t.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Timeline */}
        <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Timeline</h3>
          
          <div className="space-y-4">
            <TimelineItem
              icon={<FileText className="w-4 h-4" />}
              label="Created"
              date={document.created_at}
              color="indigo"
            />
            {currentVersion?.prepared_at && (
              <TimelineItem
                icon={<Edit className="w-4 h-4" />}
                label="Prepared"
                date={currentVersion.prepared_at}
                color="slate"
              />
            )}
            {currentVersion?.reviewed_at && (
              <TimelineItem
                icon={<Eye className="w-4 h-4" />}
                label="Reviewed"
                date={currentVersion.reviewed_at}
                color="blue"
              />
            )}
            {currentVersion?.approved_at && (
              <TimelineItem
                icon={<CheckCircle className="w-4 h-4" />}
                label="Approved"
                date={currentVersion.approved_at}
                color="emerald"
              />
            )}
            {currentVersion?.published_at && (
              <TimelineItem
                icon={<FileCheck className="w-4 h-4" />}
                label="Published"
                date={currentVersion.published_at}
                color="emerald"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Timeline Item
function TimelineItem({ 
  icon, 
  label, 
  date, 
  color 
}: { 
  icon: React.ReactNode; 
  label: string; 
  date: string;
  color: string;
}) {
  const colors: Record<string, string> = {
    indigo: 'bg-indigo-500/20 text-indigo-400',
    emerald: 'bg-emerald-500/20 text-emerald-400',
    blue: 'bg-blue-500/20 text-blue-400',
    slate: 'bg-slate-700/50 text-slate-400',
  };

  return (
    <div className="flex items-center gap-3">
      {/* Safe: color is a typed prop from component's defined union type */}
      {/* eslint-disable-next-line security/detect-object-injection */}
      <div className={`p-2 rounded-lg ${colors[color]}`}>
        {icon}
      </div>
      <div>
        <p className="text-white text-sm">{label}</p>
        <p className="text-slate-500 text-xs">
          {new Date(date).toLocaleDateString()} at {new Date(date).toLocaleTimeString()}
        </p>
      </div>
    </div>
  );
}

// Versions Tab
function VersionsTab({ 
  versions, 
  documentId 
}: { 
  versions: DocumentVersion[];
  documentId: string;
}) {
  return (
    <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-700/50">
        <h3 className="text-lg font-semibold text-white">Version History</h3>
        <p className="text-slate-400 text-sm">All versions are archived and retrievable for audit trail</p>
      </div>
      
      <div className="divide-y divide-slate-700/30">
        {versions.map((version) => (
          <div 
            key={version.id}
            className={`px-6 py-4 ${version.is_current ? 'bg-indigo-500/10' : ''}`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="font-mono text-indigo-400">
                  v{version.version}
                </span>
                {version.is_current && (
                  <span className="px-2 py-0.5 text-xs bg-indigo-500/20 text-indigo-400 rounded-full">
                    Current
                  </span>
                )}
                {version.status && (
                  <span className={`px-2 py-0.5 text-xs rounded-full ${DOCUMENT_STATUS_COLORS[version.status].bg} ${DOCUMENT_STATUS_COLORS[version.status].text}`}>
                    {DOCUMENT_STATUS_LABELS[version.status]}
                  </span>
                )}
              </div>
              <span className="text-slate-500 text-sm">
                {new Date(version.created_at || version.changed_at).toLocaleDateString()}
              </span>
            </div>
            
            {version.change_summary && (
              <p className="text-white mt-2">{version.change_summary}</p>
            )}
            {version.change_reason && (
              <p className="text-slate-400 text-sm mt-1">{version.change_reason}</p>
            )}
            
            {version.file_name && (
              <div className="flex items-center gap-2 mt-2 text-sm text-slate-400">
                <FileText className="w-4 h-4" />
                {version.file_name}
                {version.file_size_bytes && ` (${(version.file_size_bytes / 1024).toFixed(1)} KB)`}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// History Tab
function HistoryTab({ history }: { history: DocumentChangeHistory[] }) {
  return (
    <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-700/50">
        <h3 className="text-lg font-semibold text-white">Change History</h3>
        <p className="text-slate-400 text-sm">Complete audit trail of all changes</p>
      </div>
      
      <div className="divide-y divide-slate-700/30 max-h-[600px] overflow-y-auto">
        {history.map((item) => (
          <div key={item.id} className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-700/50 rounded-lg">
                  <History className="w-4 h-4 text-slate-400" />
                </div>
                <div>
                  <p className="text-white">
                    {item.action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </p>
                  {item.field_changed && (
                    <p className="text-slate-400 text-sm">
                      {item.field_changed}: {item.old_value} → {item.new_value}
                    </p>
                  )}
                </div>
              </div>
              <span className="text-slate-500 text-sm">
                {new Date(item.changed_at || item.performed_at).toLocaleString()}
              </span>
            </div>
            {item.notes && (
              <p className="text-slate-400 text-sm mt-2 ml-12">{item.notes}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// Audit Tab
function AuditTab({ 
  auditLinks, 
  documentId,
  onUpdate 
}: { 
  auditLinks: DocumentAuditLink[];
  documentId: string;
  onUpdate: () => void;
}) {
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const loadSuggestions = useCallback(async () => {
    try {
      const res = await fetch(`/api/documents/${documentId}/audit-links?suggestions=true`);
      const data = await res.json();
      setSuggestions(data.suggestions || []);
    } catch (error) {
      console.error('Failed to load suggestions:', error);
    }
  }, [documentId]);

  useEffect(() => {
    loadSuggestions();
  }, [loadSuggestions]);

  async function handleLink(elementNumber: number) {
    setLoading(true);
    try {
      await fetch(`/api/documents/${documentId}/audit-links`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audit_element_number: elementNumber,
          audit_question_id: `${elementNumber}.manual`,
        }),
      });
      onUpdate();
      loadSuggestions();
    } finally {
      setLoading(false);
    }
  }

  const linkedElements = new Set(auditLinks.map(l => l.audit_element_number || l.cor_element));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Current Links */}
      <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Link2 className="w-5 h-5 text-indigo-400" />
          Linked Audit Elements
        </h3>
        
        {auditLinks.length === 0 ? (
          <p className="text-slate-400">No audit links yet. Add links to use this document as evidence.</p>
        ) : (
          <div className="space-y-3">
            {auditLinks.map((link) => {
              const element = COR_ELEMENTS.find(e => e.number === (link.audit_element_number || link.cor_element));
              return (
                <div 
                  key={link.id}
                  className="p-4 bg-slate-700/30 rounded-xl flex items-center justify-between"
                >
                  <div>
                    <p className="text-white font-medium">
                      Element {link.audit_element_number || link.cor_element}: {element?.name || 'Unknown'}
                    </p>
                    <p className="text-slate-400 text-sm">
                      {link.link_type === 'auto' ? 'Auto-detected' : 'Manually linked'}
                      {link.confidence_score && ` (${link.confidence_score}% confidence)`}
                    </p>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    link.link_type === 'auto' 
                      ? 'bg-blue-500/20 text-blue-400' 
                      : 'bg-emerald-500/20 text-emerald-400'
                  }`}>
                    {link.link_type}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Suggestions */}
      <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Suggested Links</h3>
        
        {suggestions.length === 0 ? (
          <p className="text-slate-400">No suggestions available. Upload a PDF to enable auto-detection.</p>
        ) : (
          <div className="space-y-3">
            {suggestions
              .filter(s => !linkedElements.has(s.elementNumber))
              .map((suggestion) => {
                const element = COR_ELEMENTS.find(e => e.number === suggestion.elementNumber);
                return (
                  <div 
                    key={suggestion.elementNumber}
                    className="p-4 bg-slate-700/30 rounded-xl"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white font-medium">
                          Element {suggestion.elementNumber}: {element?.name || 'Unknown'}
                        </p>
                        <p className="text-slate-400 text-sm">{suggestion.reason}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-indigo-400 font-medium">
                          {suggestion.confidence}%
                        </span>
                        <button
                          onClick={() => handleLink(suggestion.elementNumber)}
                          disabled={loading}
                          className="px-3 py-1 bg-indigo-500/20 text-indigo-400 rounded-lg 
                                   hover:bg-indigo-500/30 transition-colors text-sm"
                        >
                          Link
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
}

// Upload Modal
function UploadModal({ 
  documentId, 
  versionId, 
  onClose, 
  onUploaded 
}: { 
  documentId: string;
  versionId: string;
  onClose: () => void;
  onUploaded: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  async function handleUpload() {
    if (!file) return;
    
    setUploading(true);
    setError('');
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('version_id', versionId);
      
      const res = await fetch(`/api/documents/${documentId}/upload`, {
        method: 'POST',
        body: formData,
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Upload failed');
      }
      
      setResult(data);
      setTimeout(onUploaded, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-700/50 rounded-2xl w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/50">
          <h2 className="text-xl font-semibold text-white">Upload PDF</h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white">✕</button>
        </div>
        
        <div className="p-6 space-y-5">
          {error && (
            <div className="p-4 bg-rose-500/20 border border-rose-500/30 rounded-xl text-rose-400">
              {error}
            </div>
          )}
          
          {result ? (
            <div className="p-4 bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-emerald-400">
              <p className="font-medium">Upload Successful!</p>
              {result.extraction && (
                <p className="text-sm mt-1">
                  Extracted {result.extraction.text_length} characters from {result.extraction.page_count} pages.
                  {result.audit_links > 0 && ` Auto-linked to ${result.audit_links} audit elements.`}
                </p>
              )}
            </div>
          ) : (
            <>
              <div 
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors
                  ${file ? 'border-indigo-500/50 bg-indigo-500/10' : 'border-slate-700/50 hover:border-slate-600'}`}
              >
                <input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <Upload className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                  {file ? (
                    <p className="text-white">{file.name}</p>
                  ) : (
                    <>
                      <p className="text-white">Click to select a PDF file</p>
                      <p className="text-slate-500 text-sm mt-1">or drag and drop</p>
                    </>
                  )}
                </label>
              </div>
              
              <button
                onClick={handleUpload}
                disabled={!file || uploading}
                className="w-full px-4 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 
                         hover:from-indigo-600 hover:to-purple-700 text-white rounded-xl 
                         font-medium transition-all duration-200 disabled:opacity-50"
              >
                {uploading ? 'Uploading & Extracting...' : 'Upload PDF'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// New Version Modal
function NewVersionModal({ 
  documentId, 
  currentVersion,
  onClose, 
  onCreated 
}: { 
  documentId: string;
  currentVersion: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [formData, setFormData] = useState({
    is_major: false,
    change_summary: '',
    change_reason: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const newVersion = formData.is_major
    ? `${parseInt(currentVersion.split('.')[0]) + 1}.0`
    : `${currentVersion.split('.')[0]}.${parseInt(currentVersion.split('.')[1] || '0') + 1}`;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const res = await fetch(`/api/documents/${documentId}/versions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create version');
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
          <h2 className="text-xl font-semibold text-white">New Version</h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white">✕</button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-4 bg-rose-500/20 border border-rose-500/30 rounded-xl text-rose-400">
              {error}
            </div>
          )}
          
          <div className="flex items-center gap-4 p-4 bg-slate-800/50 rounded-xl">
            <div className="text-slate-400">
              Current: v{currentVersion}
            </div>
            <ChevronRight className="w-4 h-4 text-slate-600" />
            <div className="text-indigo-400 font-medium">
              New: v{newVersion}
            </div>
          </div>
          
          <div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_major}
                onChange={(e) => setFormData(prev => ({ ...prev, is_major: e.target.checked }))}
                className="w-5 h-5 rounded bg-slate-800 border-slate-700"
              />
              <span className="text-white">Major version change</span>
            </label>
            <p className="text-slate-500 text-sm mt-1 ml-8">
              Use for significant changes. Minor versions are for small updates.
            </p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Change Summary *
            </label>
            <input
              type="text"
              value={formData.change_summary}
              onChange={(e) => setFormData(prev => ({ ...prev, change_summary: e.target.value }))}
              placeholder="Brief description of changes..."
              className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-xl 
                       text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Change Reason *
            </label>
            <textarea
              value={formData.change_reason}
              onChange={(e) => setFormData(prev => ({ ...prev, change_reason: e.target.value }))}
              placeholder="Why is this version being created..."
              rows={3}
              className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-xl 
                       text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 resize-none"
              required
            />
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
              {loading ? 'Creating...' : 'Create Version'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
