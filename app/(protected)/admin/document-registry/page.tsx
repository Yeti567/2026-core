'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Upload, FolderOpen, FileText, Search, Plus, Filter,
  ChevronRight, ChevronDown, MoreVertical, Edit, Trash2,
  Move, Tag, CheckCircle, AlertCircle, Clock, Archive,
  Folder, FolderPlus, Grid, List, SortAsc, SortDesc,
  Download, Eye, RefreshCw, Loader2, X, Check, Sparkles,
  ShieldCheck, FileCheck, BookOpen, ScrollText, GraduationCap,
  AlertTriangle, ClipboardList
} from 'lucide-react';
import {
  DOCUMENT_TYPE_LABELS,
  DOCUMENT_STATUS_LABELS,
  DOCUMENT_STATUS_COLORS,
  FOLDER_TYPE_CONFIG,
  type DocumentTypeCode,
  type DocumentStatus,
  type Document,
  type DocumentFolder,
  type FolderTreeNode,
  type BulkUploadFile,
  type SuggestedMetadata,
} from '@/lib/documents/types';

// ============================================================================
// ICON MAPPING
// ============================================================================

const FOLDER_ICONS: Record<string, React.ElementType> = {
  'scroll': ScrollText,
  'clipboard-list': ClipboardList,
  'shield-check': ShieldCheck,
  'file-text': FileText,
  'graduation-cap': GraduationCap,
  'book-open': BookOpen,
  'alert-triangle': AlertTriangle,
  'folder': Folder,
};

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================

export default function DocumentRegistryPage() {
  // State
  const [folders, setFolders] = useState<FolderTreeNode[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<DocumentTypeCode | ''>('');
  const [statusFilter, setStatusFilter] = useState<DocumentStatus | ''>('');
  const [selectedDocuments, setSelectedDocuments] = useState<Set<string>>(new Set());
  const [showUploadPanel, setShowUploadPanel] = useState(false);
  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);
  const [showBatchTagModal, setShowBatchTagModal] = useState(false);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [folderStats, setFolderStats] = useState<Map<string, number>>(new Map());
  const [sortBy, setSortBy] = useState<string>('updated_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Fetch folders
  const fetchFolders = useCallback(async () => {
    try {
      const response = await fetch('/api/documents/folders');
      const data = await response.json();
      setFolders(data.folders || []);
      setFolderStats(new Map(Object.entries(data.stats || {})));
    } catch (error) {
      console.error('Failed to fetch folders:', error);
    }
  }, []);

  // Fetch documents
  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedFolderId) params.set('folder_id', selectedFolderId);
      if (searchQuery) params.set('q', searchQuery);
      if (typeFilter) params.set('type', typeFilter);
      if (statusFilter) params.set('status', statusFilter);
      if (sortBy) params.set('sort', sortBy);
      if (sortOrder) params.set('order', sortOrder);

      const response = await fetch(`/api/documents?${params}`);
      const data = await response.json();
      setDocuments(data.documents || []);
    } catch (error) {
      console.error('Failed to fetch documents:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedFolderId, searchQuery, typeFilter, statusFilter, sortBy, sortOrder]);

  useEffect(() => {
    fetchFolders();
  }, [fetchFolders]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // Toggle folder expansion
  const toggleFolder = (folderId: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedFolders(newExpanded);
  };

  // Select folder
  const selectFolder = (folderId: string | null) => {
    setSelectedFolderId(folderId);
    setSelectedDocuments(new Set());
  };

  // Toggle document selection
  const toggleDocumentSelection = (docId: string) => {
    const newSelected = new Set(selectedDocuments);
    if (newSelected.has(docId)) {
      newSelected.delete(docId);
    } else {
      newSelected.add(docId);
    }
    setSelectedDocuments(newSelected);
  };

  // Select all documents
  const selectAllDocuments = () => {
    if (selectedDocuments.size === documents.length) {
      setSelectedDocuments(new Set());
    } else {
      setSelectedDocuments(new Set(documents.map(d => d.id)));
    }
  };

  // Get current folder
  const currentFolder = selectedFolderId
    ? findFolder(folders, selectedFolderId)
    : null;

  // Get breadcrumbs
  const breadcrumbs = currentFolder
    ? getBreadcrumbs(folders, currentFolder)
    : [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Header */}
      <div className="border-b border-slate-800/50 bg-slate-900/30 backdrop-blur-sm sticky top-0 z-20">
        <div className="max-w-[1800px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-violet-500 to-fuchsia-600 rounded-xl">
                  <FolderOpen className="w-6 h-6 text-white" />
                </div>
                Document Registry
              </h1>
              <p className="text-slate-400 text-sm mt-1">
                Upload, organize, and manage your safety documents
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowUploadPanel(true)}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-500 to-fuchsia-600 
                         hover:from-violet-600 hover:to-fuchsia-700 text-white rounded-xl font-medium 
                         transition-all duration-200 shadow-lg shadow-violet-500/25"
              >
                <Upload className="w-5 h-5" />
                Upload Documents
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1800px] mx-auto px-6 py-6">
        <div className="flex gap-6">
          {/* Sidebar - Folder Tree */}
          <div className="w-72 flex-shrink-0">
            <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-2xl overflow-hidden sticky top-24">
              {/* Sidebar Header */}
              <div className="px-4 py-3 border-b border-slate-700/50 flex items-center justify-between">
                <h2 className="font-semibold text-white flex items-center gap-2">
                  <Folder className="w-4 h-4 text-violet-400" />
                  Folders
                </h2>
                <button
                  onClick={() => setShowCreateFolderModal(true)}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors"
                  title="Create Folder"
                >
                  <FolderPlus className="w-4 h-4" />
                </button>
              </div>

              {/* All Documents */}
              <div className="p-2">
                <button
                  onClick={() => selectFolder(null)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all
                    ${!selectedFolderId
                      ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
                      : 'text-slate-300 hover:bg-slate-700/30'
                    }`}
                >
                  <FileText className="w-5 h-5" />
                  <span className="flex-1 text-left font-medium">All Documents</span>
                  <span className="text-xs px-2 py-0.5 bg-slate-700/50 rounded-full">
                    {Array.from(folderStats.values()).reduce((a, b) => a + b, 0)}
                  </span>
                </button>
              </div>

              {/* Folder Tree */}
              <div className="p-2 pt-0 max-h-[calc(100vh-280px)] overflow-y-auto">
                {folders.map(folder => (
                  <FolderTreeItem
                    key={folder.id}
                    folder={folder}
                    selectedId={selectedFolderId}
                    expandedIds={expandedFolders}
                    onSelect={selectFolder}
                    onToggle={toggleFolder}
                    stats={folderStats}
                    depth={0}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {/* Toolbar */}
            <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-4 mb-4">
              {/* Breadcrumbs */}
              {breadcrumbs.length > 0 && (
                <div className="flex items-center gap-1.5 text-sm mb-4">
                  <button
                    onClick={() => selectFolder(null)}
                    className="text-slate-400 hover:text-white transition-colors"
                  >
                    All Documents
                  </button>
                  {breadcrumbs.map((folder, idx) => (
                    <div key={folder.id} className="flex items-center gap-1.5">
                      <ChevronRight className="w-4 h-4 text-slate-600" />
                      <button
                        onClick={() => selectFolder(folder.id)}
                        className={`transition-colors ${idx === breadcrumbs.length - 1
                          ? 'text-violet-400 font-medium'
                          : 'text-slate-400 hover:text-white'
                          }`}
                      >
                        {folder.name}
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Search & Filters */}
              <div className="flex flex-wrap gap-3">
                <div className="flex-1 min-w-[300px] relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search documents..."
                    className="w-full pl-11 pr-4 py-2.5 bg-slate-900/50 border border-slate-700/50 
                             rounded-xl text-white placeholder-slate-500 focus:outline-none 
                             focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20"
                  />
                </div>

                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value as DocumentTypeCode | '')}
                  className="px-4 py-2.5 bg-slate-900/50 border border-slate-700/50 rounded-xl 
                           text-white focus:outline-none focus:border-violet-500/50 min-w-[160px]"
                >
                  <option value="">All Types</option>
                  {Object.entries(DOCUMENT_TYPE_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as DocumentStatus | '')}
                  className="px-4 py-2.5 bg-slate-900/50 border border-slate-700/50 rounded-xl 
                           text-white focus:outline-none focus:border-violet-500/50 min-w-[140px]"
                >
                  <option value="">All Status</option>
                  {Object.entries(DOCUMENT_STATUS_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>

                <div className="flex items-center gap-1 bg-slate-900/50 border border-slate-700/50 rounded-xl p-1">
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-violet-500/20 text-violet-400' : 'text-slate-400 hover:text-white'
                      }`}
                  >
                    <List className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-violet-500/20 text-violet-400' : 'text-slate-400 hover:text-white'
                      }`}
                  >
                    <Grid className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="px-4 py-2.5 bg-slate-900/50 border border-slate-700/50 rounded-xl 
                             text-white focus:outline-none focus:border-violet-500/50 min-w-[140px]"
                  >
                    <option value="updated_at">Last Updated</option>
                    <option value="title">Title</option>
                    <option value="control_number">Control #</option>
                    <option value="effective_date">Effective Date</option>
                  </select>

                  <button
                    onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                    className="p-2.5 text-slate-400 hover:text-white bg-slate-900/50 border border-slate-700/50 
                             rounded-xl hover:bg-slate-700/50 transition-colors"
                  >
                    {sortOrder === 'asc' ? <SortAsc className="w-5 h-5" /> : <SortDesc className="w-5 h-5" />}
                  </button>
                </div>

                <button
                  onClick={fetchDocuments}
                  className="p-2.5 text-slate-400 hover:text-white bg-slate-900/50 border border-slate-700/50 
                           rounded-xl hover:bg-slate-700/50 transition-colors"
                >
                  <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {/* Bulk Actions */}
              {selectedDocuments.size > 0 && (
                <div className="mt-4 flex items-center gap-3 p-3 bg-violet-500/10 border border-violet-500/30 rounded-xl">
                  <span className="text-sm text-violet-300">
                    {selectedDocuments.size} document{selectedDocuments.size !== 1 ? 's' : ''} selected
                  </span>
                  <div className="flex-1" />
                  <button
                    onClick={() => setShowBatchTagModal(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-violet-300 
                             hover:bg-violet-500/20 rounded-lg transition-colors"
                  >
                    <Tag className="w-4 h-4" />
                    Batch Tag
                  </button>
                  <button
                    onClick={() => setShowMoveModal(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-violet-300 
                             hover:bg-violet-500/20 rounded-lg transition-colors"
                  >
                    <Move className="w-4 h-4" />
                    Move
                  </button>
                  <button
                    onClick={() => setSelectedDocuments(new Set())}
                    className="p-1.5 text-violet-300 hover:bg-violet-500/20 rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Documents Grid/List */}
            <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-2xl overflow-hidden">
              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
                </div>
              ) : documents.length === 0 ? (
                <EmptyState
                  folder={currentFolder}
                  onUpload={() => setShowUploadPanel(true)}
                />
              ) : viewMode === 'list' ? (
                <DocumentList
                  documents={documents}
                  selectedIds={selectedDocuments}
                  onSelect={toggleDocumentSelection}
                  onSelectAll={selectAllDocuments}
                />
              ) : (
                <DocumentGrid
                  documents={documents}
                  selectedIds={selectedDocuments}
                  onSelect={toggleDocumentSelection}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Upload Panel */}
      {
        showUploadPanel && (
          <UploadPanel
            folderId={selectedFolderId}
            folders={folders}
            onClose={() => setShowUploadPanel(false)}
            onSuccess={() => {
              setShowUploadPanel(false);
              fetchDocuments();
              fetchFolders();
            }}
          />
        )
      }

      {/* Create Folder Modal */}
      {
        showCreateFolderModal && (
          <CreateFolderModal
            parentFolder={currentFolder}
            onClose={() => setShowCreateFolderModal(false)}
            onCreated={() => {
              setShowCreateFolderModal(false);
              fetchFolders();
            }}
          />
        )
      }

      {/* Batch Tag Modal */}
      {
        showBatchTagModal && selectedDocuments.size > 0 && (
          <BatchTagModal
            documentIds={Array.from(selectedDocuments)}
            onClose={() => setShowBatchTagModal(false)}
            onSuccess={() => {
              setShowBatchTagModal(false);
              setSelectedDocuments(new Set());
              fetchDocuments();
            }}
          />
        )
      }

      {/* Move Modal */}
      {
        showMoveModal && selectedDocuments.size > 0 && (
          <MoveDocumentsModal
            documentIds={Array.from(selectedDocuments)}
            folders={folders}
            currentFolderId={selectedFolderId}
            onClose={() => setShowMoveModal(false)}
            onSuccess={() => {
              setShowMoveModal(false);
              setSelectedDocuments(new Set());
              fetchDocuments();
              fetchFolders();
            }}
          />
        )
      }
    </div >
  );
}

// ============================================================================
// FOLDER TREE ITEM
// ============================================================================

function FolderTreeItem({
  folder,
  selectedId,
  expandedIds,
  onSelect,
  onToggle,
  stats,
  depth,
}: {
  folder: FolderTreeNode;
  selectedId: string | null;
  expandedIds: Set<string>;
  onSelect: (id: string) => void;
  onToggle: (id: string) => void;
  stats: Map<string, number>;
  depth: number;
}) {
  const isExpanded = expandedIds.has(folder.id);
  const isSelected = selectedId === folder.id;
  const hasChildren = folder.children.length > 0;
  const count = stats.get(folder.id) || folder.document_count || 0;
  const IconComponent = FOLDER_ICONS[folder.icon] || Folder;

  return (
    <div>
      <div
        className={`flex items-center gap-2 px-3 py-2 rounded-xl cursor-pointer transition-all
          ${isSelected
            ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
            : 'text-slate-300 hover:bg-slate-700/30'
          }`}
        style={{ paddingLeft: `${12 + depth * 16}px` }}
      >
        {hasChildren ? (
          <button
            onClick={(e) => { e.stopPropagation(); onToggle(folder.id); }}
            className="p-0.5 hover:bg-slate-700/50 rounded"
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
        ) : (
          <span className="w-5" />
        )}

        <button
          onClick={() => onSelect(folder.id)}
          className="flex items-center gap-2 flex-1 min-w-0"
        >
          <IconComponent
            className="w-4 h-4 flex-shrink-0"
            style={{ color: folder.color }}
          />
          <span className="truncate text-sm font-medium">{folder.name}</span>
          {count > 0 && (
            <span className="text-xs px-1.5 py-0.5 bg-slate-700/50 rounded-full ml-auto">
              {count}
            </span>
          )}
        </button>
      </div>

      {hasChildren && isExpanded && (
        <div>
          {folder.children.map(child => (
            <FolderTreeItem
              key={child.id}
              folder={child}
              selectedId={selectedId}
              expandedIds={expandedIds}
              onSelect={onSelect}
              onToggle={onToggle}
              stats={stats}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// DOCUMENT LIST VIEW
// ============================================================================

function DocumentList({
  documents,
  selectedIds,
  onSelect,
  onSelectAll,
}: {
  documents: Document[];
  selectedIds: Set<string>;
  onSelect: (id: string) => void;
  onSelectAll: () => void;
}) {
  return (
    <div className="divide-y divide-slate-700/30">
      {/* Header */}
      <div className="px-4 py-3 bg-slate-900/30 flex items-center gap-4 text-xs font-medium text-slate-400 uppercase tracking-wider">
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={selectedIds.size === documents.length && documents.length > 0}
            onChange={onSelectAll}
            className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-violet-500 focus:ring-violet-500/50"
          />
        </label>
        <div className="w-24">Control #</div>
        <div className="flex-1">Title</div>
        <div className="w-32">Type</div>
        <div className="w-24">Status</div>
        <div className="w-24 text-right">Updated</div>
        <div className="w-10" />
      </div>

      {/* Rows */}
      {documents.map(doc => (
        <DocumentRow
          key={doc.id}
          document={doc}
          isSelected={selectedIds.has(doc.id)}
          onSelect={() => onSelect(doc.id)}
        />
      ))}
    </div>
  );
}

function DocumentRow({
  document: doc,
  isSelected,
  onSelect,
}: {
  document: Document;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const statusColors = DOCUMENT_STATUS_COLORS[doc.status];

  return (
    <a
      href={`/admin/documents/${doc.id}`}
      className={`flex items-center gap-4 px-4 py-3 transition-colors group
        ${isSelected ? 'bg-violet-500/10' : 'hover:bg-slate-700/20'}`}
    >
      <label className="flex items-center" onClick={(e) => e.stopPropagation()}>
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onSelect}
          className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-violet-500 focus:ring-violet-500/50"
        />
      </label>

      <div className="w-24 font-mono text-sm text-violet-400">{doc.control_number}</div>

      <div className="flex-1 min-w-0">
        <p className="text-white font-medium truncate group-hover:text-violet-300 transition-colors">
          {doc.title}
        </p>
        {doc.description && (
          <p className="text-slate-500 text-sm truncate">{doc.description}</p>
        )}
        {doc.tags && doc.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {doc.tags.slice(0, 3).map(tag => (
              <span key={tag} className="text-[10px] px-1.5 py-0.5 bg-slate-800/80 text-slate-400 rounded-md border border-slate-700/50">
                {tag}
              </span>
            ))}
            {doc.tags.length > 3 && (
              <span className="text-[10px] text-slate-500">+{doc.tags.length - 3}</span>
            )}
          </div>
        )}
      </div>

      <div className="w-32">
        <span className="text-slate-300 text-sm">
          {DOCUMENT_TYPE_LABELS[doc.document_type_code]}
        </span>
      </div>

      <div className="w-24">
        <span className={`inline-flex px-2 py-0.5 text-xs rounded-full ${statusColors.bg} ${statusColors.text} ${statusColors.border} border`}>
          {DOCUMENT_STATUS_LABELS[doc.status]}
        </span>
      </div>

      <div className="w-24 text-right text-sm text-slate-400">
        {new Date(doc.updated_at).toLocaleDateString()}
      </div>

      <div className="w-10 flex justify-end">
        <button className="p-1.5 text-slate-400 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity">
          <MoreVertical className="w-4 h-4" />
        </button>
      </div>
    </a>
  );
}

// ============================================================================
// DOCUMENT GRID VIEW
// ============================================================================

function DocumentGrid({
  documents,
  selectedIds,
  onSelect,
}: {
  documents: Document[];
  selectedIds: Set<string>;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="p-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {documents.map(doc => (
        <DocumentCard
          key={doc.id}
          document={doc}
          isSelected={selectedIds.has(doc.id)}
          onSelect={() => onSelect(doc.id)}
        />
      ))}
    </div>
  );
}

function DocumentCard({
  document: doc,
  isSelected,
  onSelect,
}: {
  document: Document;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const statusColors = DOCUMENT_STATUS_COLORS[doc.status];

  return (
    <div
      className={`relative bg-slate-900/50 border rounded-xl p-4 hover:border-violet-500/30 
                transition-all cursor-pointer group
                ${isSelected ? 'border-violet-500 bg-violet-500/10' : 'border-slate-700/50'}`}
    >
      {/* Selection Checkbox */}
      <label
        className="absolute top-3 left-3 z-10"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onSelect}
          className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-violet-500 focus:ring-violet-500/50"
        />
      </label>

      <a href={`/admin/documents/${doc.id}`} className="block">
        {/* Icon */}
        <div className="w-12 h-12 bg-slate-800/50 rounded-xl flex items-center justify-center mb-3 mx-auto group-hover:bg-violet-500/20 transition-colors">
          <FileText className="w-6 h-6 text-violet-400" />
        </div>

        {/* Control Number */}
        <div className="text-center mb-2">
          <span className="font-mono text-xs text-violet-400">{doc.control_number}</span>
        </div>

        {/* Title */}
        <h3 className="text-white font-medium text-sm text-center line-clamp-2 mb-2 group-hover:text-violet-300 transition-colors">
          {doc.title}
        </h3>

        {/* Tags */}
        {doc.tags && doc.tags.length > 0 && (
          <div className="flex flex-wrap justify-center gap-1 mb-3">
            {doc.tags.slice(0, 2).map(tag => (
              <span key={tag} className="text-[10px] px-1.5 py-0.5 bg-slate-800/80 text-slate-400 rounded-md border border-slate-700/50">
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Status */}
        <div className="flex justify-center">
          <span className={`inline-flex px-2 py-0.5 text-xs rounded-full ${statusColors.bg} ${statusColors.text}`}>
            {DOCUMENT_STATUS_LABELS[doc.status]}
          </span>
        </div>
      </a>
    </div>
  );
}

// ============================================================================
// EMPTY STATE
// ============================================================================

function EmptyState({
  folder,
  onUpload,
}: {
  folder: FolderTreeNode | null;
  onUpload: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-slate-400">
      <div className="w-20 h-20 bg-slate-800/50 rounded-2xl flex items-center justify-center mb-4">
        <FolderOpen className="w-10 h-10 text-slate-600" />
      </div>
      <h3 className="text-lg font-medium text-white mb-1">
        {folder ? `No documents in "${folder.name}"` : 'No documents found'}
      </h3>
      <p className="text-sm mb-6">
        {folder
          ? 'Upload documents to this folder to get started'
          : 'Start by uploading your safety documents'
        }
      </p>
      <button
        onClick={onUpload}
        className="flex items-center gap-2 px-5 py-2.5 bg-violet-500/20 border border-violet-500/30 
                 text-violet-300 rounded-xl hover:bg-violet-500/30 transition-colors"
      >
        <Upload className="w-5 h-5" />
        Upload Documents
      </button>
    </div>
  );
}

// ============================================================================
// UPLOAD PANEL
// ============================================================================

function UploadPanel({
  folderId,
  folders,
  onClose,
  onSuccess,
}: {
  folderId: string | null;
  folders: FolderTreeNode[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [files, setFiles] = useState<BulkUploadFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle file selection
  const handleFiles = async (fileList: FileList) => {
    const newFiles: BulkUploadFile[] = [];

    for (let i = 0; i < fileList.length; i++) {
      // Safe: i is a numeric loop index bounded by fileList.length, standard array access
      // eslint-disable-next-line security/detect-object-injection
      const file = fileList[i];
      if (file.type === 'application/pdf') {
        newFiles.push({
          id: crypto.randomUUID(),
          file,
          status: 'pending',
          progress: 0,
        });
      }
    }

    setFiles(prev => [...prev, ...newFiles]);

    // Auto-suggest metadata
    for (const fileItem of newFiles) {
      await suggestMetadataForFile(fileItem);
    }
  };

  // Suggest metadata for a file
  const suggestMetadataForFile = async (fileItem: BulkUploadFile) => {
    try {
      const response = await fetch('/api/documents/suggest-metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: fileItem.file.name }),
      });

      if (response.ok) {
        const suggestion = await response.json();
        setFiles(prev => prev.map(f =>
          f.id === fileItem.id ? { ...f, suggestedMetadata: suggestion } : f
        ));
      }
    } catch (error) {
      console.error('Failed to suggest metadata:', error);
    }
  };

  // Upload all files
  const handleUpload = async () => {
    setUploading(true);

    for (const fileItem of files) {
      if (fileItem.status !== 'pending') continue;

      setFiles(prev => prev.map(f =>
        f.id === fileItem.id ? { ...f, status: 'processing', progress: 10 } : f
      ));

      try {
        const formData = new FormData();
        formData.append('file', fileItem.file);
        formData.append('document_type', fileItem.suggestedMetadata?.document_type_code || 'FRM');
        if (fileItem.suggestedMetadata?.title) {
          formData.append('title', fileItem.suggestedMetadata.title);
        }
        if (folderId) {
          formData.append('folder_id', folderId);
        }
        if (fileItem.suggestedMetadata?.tags?.length) {
          formData.append('tags', fileItem.suggestedMetadata.tags.join(','));
        }
        if (fileItem.suggestedMetadata?.cor_elements?.length) {
          formData.append('cor_elements', fileItem.suggestedMetadata.cor_elements.join(','));
        }

        const response = await fetch('/api/documents/upload', {
          method: 'POST',
          body: formData,
        });

        if (response.ok) {
          const result = await response.json();
          setFiles(prev => prev.map(f =>
            f.id === fileItem.id
              ? { ...f, status: 'success', progress: 100, document: result.document }
              : f
          ));
        } else {
          const error = await response.json();
          setFiles(prev => prev.map(f =>
            f.id === fileItem.id
              ? { ...f, status: 'error', error: error.error || 'Upload failed' }
              : f
          ));
        }
      } catch (error) {
        setFiles(prev => prev.map(f =>
          f.id === fileItem.id
            ? { ...f, status: 'error', error: 'Network error' }
            : f
        ));
      }
    }

    setUploading(false);

    // Check if all succeeded
    const allSuccess = files.every(f => f.status === 'success');
    if (allSuccess) {
      setTimeout(onSuccess, 1000);
    }
  };

  // Remove file
  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  // Update file metadata
  const updateFileMetadata = (id: string, updates: Partial<SuggestedMetadata>) => {
    setFiles(prev => prev.map(f =>
      f.id === id
        ? { ...f, suggestedMetadata: { ...f.suggestedMetadata!, ...updates } }
        : f
    ));
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-start justify-center overflow-y-auto py-8">
      <div className="bg-slate-900 border border-slate-700/50 rounded-2xl w-full max-w-4xl shadow-2xl m-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/50">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <Upload className="w-5 h-5 text-violet-400" />
            Upload Documents
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drop Zone */}
        <div className="p-6">
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              handleFiles(e.dataTransfer.files);
            }}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all
              ${dragOver
                ? 'border-violet-500 bg-violet-500/10'
                : 'border-slate-700 hover:border-violet-500/50 hover:bg-slate-800/30'
              }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              multiple
              onChange={(e) => e.target.files && handleFiles(e.target.files)}
              className="hidden"
            />
            <div className="w-16 h-16 bg-violet-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Upload className="w-8 h-8 text-violet-400" />
            </div>
            <p className="text-white font-medium mb-1">
              Drop PDF files here or click to browse
            </p>
            <p className="text-slate-400 text-sm">
              Supports multiple files and entire folders
            </p>
          </div>
        </div>

        {/* File List */}
        {files.length > 0 && (
          <div className="px-6 pb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-white">
                {files.length} file{files.length !== 1 ? 's' : ''} selected
              </h3>
              <div className="flex items-center gap-2 text-sm text-violet-400">
                <Sparkles className="w-4 h-4" />
                <span>AI-suggested metadata</span>
              </div>
            </div>

            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {files.map(fileItem => (
                <FileUploadItem
                  key={fileItem.id}
                  file={fileItem}
                  onRemove={() => removeFile(fileItem.id)}
                  onUpdateMetadata={(updates) => updateFileMetadata(fileItem.id, updates)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="px-6 py-4 border-t border-slate-700/50 flex justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <div className="flex gap-3">
            {files.length > 0 && (
              <button
                onClick={() => setFiles([])}
                className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
              >
                Clear All
              </button>
            )}
            <button
              onClick={handleUpload}
              disabled={files.length === 0 || uploading}
              className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-violet-500 to-fuchsia-600 
                       hover:from-violet-600 hover:to-fuchsia-700 text-white rounded-xl font-medium 
                       transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Upload {files.length} File{files.length !== 1 ? 's' : ''}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function FileUploadItem({
  file,
  onRemove,
  onUpdateMetadata,
}: {
  file: BulkUploadFile;
  onRemove: () => void;
  onUpdateMetadata: (updates: Partial<SuggestedMetadata>) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={`border rounded-xl overflow-hidden transition-colors
      ${file.status === 'success' ? 'border-emerald-500/30 bg-emerald-500/5' :
        file.status === 'error' ? 'border-rose-500/30 bg-rose-500/5' :
          file.status === 'processing' ? 'border-violet-500/30 bg-violet-500/5' :
            'border-slate-700/50 bg-slate-800/30'
      }`}
    >
      {/* Main Row */}
      <div className="flex items-center gap-4 p-4">
        {/* Status Icon */}
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0
                      bg-slate-900/50">
          {file.status === 'success' ? (
            <CheckCircle className="w-5 h-5 text-emerald-400" />
          ) : file.status === 'error' ? (
            <AlertCircle className="w-5 h-5 text-rose-400" />
          ) : file.status === 'processing' ? (
            <Loader2 className="w-5 h-5 text-violet-400 animate-spin" />
          ) : (
            <FileText className="w-5 h-5 text-slate-400" />
          )}
        </div>

        {/* File Info */}
        <div className="flex-1 min-w-0">
          <p className="text-white font-medium truncate">{file.file.name}</p>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-xs text-slate-500">
              {(file.file.size / 1024 / 1024).toFixed(2)} MB
            </span>
            {file.suggestedMetadata && (
              <>
                <span className="text-xs px-2 py-0.5 bg-violet-500/20 text-violet-300 rounded">
                  {DOCUMENT_TYPE_LABELS[file.suggestedMetadata.document_type_code]}
                </span>
                <span className="text-xs text-slate-500">
                  {file.suggestedMetadata.confidence}% confidence
                </span>
              </>
            )}
          </div>
          {file.error && (
            <p className="text-rose-400 text-sm mt-1">{file.error}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {file.status === 'pending' && (
            <button
              onClick={() => {
                if (!file.suggestedMetadata) {
                  onUpdateMetadata({
                    title: file.file.name.replace(/\.[^/.]+$/, ""),
                    document_type_code: 'FRM',
                    confidence: 0,
                    tags: [],
                    cor_elements: []
                  });
                }
                setExpanded(!expanded);
              }}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors"
              title="Edit Metadata"
            >
              <Edit className="w-4 h-4" />
            </button>
          )}
          {file.status === 'pending' && (
            <button
              onClick={onRemove}
              className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
              title="Remove"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      {file.status === 'processing' && (
        <div className="h-1 bg-slate-800">
          <div
            className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all duration-300"
            style={{ width: `${file.progress}%` }}
          />
        </div>
      )}

      {/* Expanded Metadata Editor */}
      {expanded && file.suggestedMetadata && (
        <div className="px-4 pb-4 pt-2 border-t border-slate-700/30 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Title</label>
              <input
                type="text"
                value={file.suggestedMetadata.title}
                onChange={(e) => onUpdateMetadata({ title: e.target.value })}
                className="w-full px-3 py-2 bg-slate-900/50 border border-slate-700/50 rounded-lg 
                         text-white text-sm focus:outline-none focus:border-violet-500/50"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Document Type</label>
              <select
                value={file.suggestedMetadata.document_type_code}
                onChange={(e) => onUpdateMetadata({ document_type_code: e.target.value as DocumentTypeCode })}
                className="w-full px-3 py-2 bg-slate-900/50 border border-slate-700/50 rounded-lg 
                         text-white text-sm focus:outline-none focus:border-violet-500/50"
              >
                {Object.entries(DOCUMENT_TYPE_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">
              COR Elements (comma-separated)
            </label>
            <input
              type="text"
              value={file.suggestedMetadata.cor_elements.join(', ')}
              onChange={(e) => onUpdateMetadata({
                cor_elements: e.target.value.split(',').map(n => parseInt(n.trim())).filter(n => !isNaN(n))
              })}
              className="w-full px-3 py-2 bg-slate-900/50 border border-slate-700/50 rounded-lg 
                       text-white text-sm focus:outline-none focus:border-violet-500/50"
              placeholder="1, 2, 3"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">
              Tags (comma-separated)
            </label>
            <input
              type="text"
              value={file.suggestedMetadata.tags.join(', ')}
              onChange={(e) => onUpdateMetadata({
                tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean)
              })}
              className="w-full px-3 py-2 bg-slate-900/50 border border-slate-700/50 rounded-lg 
                       text-white text-sm focus:outline-none focus:border-violet-500/50"
              placeholder="safety, policy, training"
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// CREATE FOLDER MODAL
// ============================================================================

function CreateFolderModal({
  parentFolder,
  onClose,
  onCreated,
}: {
  parentFolder: FolderTreeNode | null;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/documents/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description,
          parent_folder_id: parentFolder?.id,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create folder');
      }

      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-700/50 rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/50">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <FolderPlus className="w-5 h-5 text-violet-400" />
            Create Folder
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-500/20 border border-rose-500/30 rounded-xl text-rose-400 text-sm">
              {error}
            </div>
          )}

          {parentFolder && (
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <span>Creating inside:</span>
              <span className="text-violet-400">{parentFolder.name}</span>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Folder Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Concrete Work Procedures"
              className="w-full px-4 py-2.5 bg-slate-800/50 border border-slate-700/50 rounded-xl 
                       text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/50"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description..."
              rows={3}
              className="w-full px-4 py-2.5 bg-slate-800/50 border border-slate-700/50 rounded-xl 
                       text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/50 resize-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-slate-800/50 border border-slate-700/50 text-slate-300 
                       rounded-xl hover:bg-slate-700/50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !name}
              className="flex-1 px-4 py-2.5 bg-gradient-to-r from-violet-500 to-fuchsia-600 
                       hover:from-violet-600 hover:to-fuchsia-700 text-white rounded-xl 
                       font-medium transition-all duration-200 disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Folder'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================================
// BATCH TAG MODAL
// ============================================================================

function BatchTagModal({
  documentIds,
  onClose,
  onSuccess,
}: {
  documentIds: string[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [tags, setTags] = useState('');
  const [corElements, setCorElements] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/documents/batch-tag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          document_ids: documentIds,
          tags: tags.split(',').map(t => t.trim()).filter(Boolean),
          cor_elements: corElements.split(',').map(n => parseInt(n.trim())).filter(n => !isNaN(n)),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update documents');
      }

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-700/50 rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/50">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Tag className="w-5 h-5 text-violet-400" />
            Batch Tag Documents
          </h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-500/20 border border-rose-500/30 rounded-xl text-rose-400 text-sm">
              {error}
            </div>
          )}

          <p className="text-sm text-slate-400">
            Add tags and COR elements to {documentIds.length} document{documentIds.length !== 1 ? 's' : ''}
          </p>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Tags (comma-separated)
            </label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="safety, training, policy"
              className="w-full px-4 py-2.5 bg-slate-800/50 border border-slate-700/50 rounded-xl 
                       text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              COR Elements (comma-separated)
            </label>
            <input
              type="text"
              value={corElements}
              onChange={(e) => setCorElements(e.target.value)}
              placeholder="1, 2, 3"
              className="w-full px-4 py-2.5 bg-slate-800/50 border border-slate-700/50 rounded-xl 
                       text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/50"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 bg-slate-800/50 border border-slate-700/50 text-slate-300 rounded-xl hover:bg-slate-700/50 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="flex-1 px-4 py-2.5 bg-gradient-to-r from-violet-500 to-fuchsia-600 hover:from-violet-600 hover:to-fuchsia-700 text-white rounded-xl font-medium transition-all duration-200 disabled:opacity-50">
              {loading ? 'Updating...' : 'Apply Tags'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================================
// MOVE DOCUMENTS MODAL
// ============================================================================

function MoveDocumentsModal({
  documentIds,
  folders,
  currentFolderId,
  onClose,
  onSuccess,
}: {
  documentIds: string[];
  folders: FolderTreeNode[];
  currentFolderId: string | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleMove = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/documents/move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          document_ids: documentIds,
          folder_id: selectedFolderId,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to move documents');
      }

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const renderFolderOption = (folder: FolderTreeNode, depth: number = 0): JSX.Element[] => {
    const items: JSX.Element[] = [];
    const isDisabled = folder.id === currentFolderId;

    items.push(
      <button
        key={folder.id}
        onClick={() => !isDisabled && setSelectedFolderId(folder.id)}
        disabled={isDisabled}
        className={`w-full flex items-center gap-2 px-4 py-2.5 transition-colors text-left
          ${selectedFolderId === folder.id ? 'bg-violet-500/20 text-violet-300' :
            isDisabled ? 'opacity-50 cursor-not-allowed text-slate-500' : 'text-slate-300 hover:bg-slate-700/30'}`}
        style={{ paddingLeft: `${16 + depth * 20}px` }}
      >
        <Folder className="w-4 h-4" style={{ color: folder.color }} />
        <span>{folder.name}</span>
        {isDisabled && <span className="text-xs text-slate-500 ml-auto">(current)</span>}
      </button>
    );

    folder.children.forEach(child => {
      items.push(...renderFolderOption(child, depth + 1));
    });

    return items;
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-700/50 rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/50">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Move className="w-5 h-5 text-violet-400" />
            Move Documents
          </h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-rose-500/20 border border-rose-500/30 rounded-xl text-rose-400 text-sm">
              {error}
            </div>
          )}

          <p className="text-sm text-slate-400 mb-4">
            Move {documentIds.length} document{documentIds.length !== 1 ? 's' : ''} to:
          </p>

          <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl overflow-hidden max-h-[300px] overflow-y-auto">
            <button
              onClick={() => setSelectedFolderId(null)}
              className={`w-full flex items-center gap-2 px-4 py-2.5 transition-colors text-left
                ${selectedFolderId === null && currentFolderId !== null ? 'bg-violet-500/20 text-violet-300' :
                  currentFolderId === null ? 'opacity-50 cursor-not-allowed text-slate-500' : 'text-slate-300 hover:bg-slate-700/30'}`}
              disabled={currentFolderId === null}
            >
              <FileText className="w-4 h-4 text-slate-400" />
              <span>Root (No Folder)</span>
            </button>
            {folders.flatMap(folder => renderFolderOption(folder))}
          </div>

          <div className="flex gap-3 pt-6">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 bg-slate-800/50 border border-slate-700/50 text-slate-300 rounded-xl hover:bg-slate-700/50 transition-colors">
              Cancel
            </button>
            <button onClick={handleMove} disabled={loading || (selectedFolderId === currentFolderId)} className="flex-1 px-4 py-2.5 bg-gradient-to-r from-violet-500 to-fuchsia-600 hover:from-violet-600 hover:to-fuchsia-700 text-white rounded-xl font-medium transition-all duration-200 disabled:opacity-50">
              {loading ? 'Moving...' : 'Move Here'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function findFolder(folders: FolderTreeNode[], id: string): FolderTreeNode | null {
  for (const folder of folders) {
    if (folder.id === id) return folder;
    const found = findFolder(folder.children, id);
    if (found) return found;
  }
  return null;
}

function getBreadcrumbs(folders: FolderTreeNode[], target: FolderTreeNode): FolderTreeNode[] {
  const path: FolderTreeNode[] = [];

  const findPath = (nodes: FolderTreeNode[], current: FolderTreeNode[]): boolean => {
    for (const node of nodes) {
      if (node.id === target.id) {
        path.push(...current, node);
        return true;
      }
      if (findPath(node.children, [...current, node])) {
        return true;
      }
    }
    return false;
  };

  findPath(folders, []);
  return path;
}
