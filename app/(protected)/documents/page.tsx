'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  Search, FileText, Download, CheckCircle, Clock, 
  Filter, Eye, AlertCircle, BookOpen, ChevronRight,
  Loader2, Folder, FolderOpen, Home, ArrowLeft,
  ChevronDown, X, Menu, Shield, ScrollText, ClipboardList,
  GraduationCap, AlertTriangle, Star, Bookmark, Bell
} from 'lucide-react';
import { 
  DOCUMENT_TYPE_LABELS, 
  DOCUMENT_STATUS_LABELS,
  type DocumentTypeCode,
  type Document,
  type DocumentFolder,
} from '@/lib/documents/types';

// ============================================================================
// ICON MAPPING
// ============================================================================

const FOLDER_ICONS: Record<string, React.ElementType> = {
  'scroll': ScrollText,
  'clipboard-list': ClipboardList,
  'shield-check': Shield,
  'file-text': FileText,
  'graduation-cap': GraduationCap,
  'book-open': BookOpen,
  'alert-triangle': AlertTriangle,
  'folder': Folder,
};

// ============================================================================
// WORKER DOCUMENT PORTAL
// ============================================================================

export default function WorkerDocumentsPage() {
  // State
  const [folders, setFolders] = useState<DocumentFolder[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<DocumentTypeCode | 'all'>('all');
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [acknowledging, setAcknowledging] = useState(false);
  const [unacknowledgedCount, setUnacknowledgedCount] = useState(0);
  const [showMobileNav, setShowMobileNav] = useState(false);
  const [breadcrumbs, setBreadcrumbs] = useState<DocumentFolder[]>([]);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  // Flatten folder tree for easy access
  const flattenFolders = useCallback((tree: any[], result: DocumentFolder[] = []): DocumentFolder[] => {
    tree.forEach(node => {
      result.push(node);
      if (node.children?.length) {
        flattenFolders(node.children, result);
      }
    });
    return result;
  }, []);

  // Fetch folders
  const fetchFolders = useCallback(async () => {
    try {
      const response = await fetch('/api/documents/folders');
      const data = await response.json();
      setFolders(flattenFolders(data.folders || []));
    } catch (error) {
      console.error('Failed to fetch folders:', error);
    }
  }, [flattenFolders]);

  // Fetch documents
  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('status', 'active');
      if (searchQuery) params.set('q', searchQuery);
      if (selectedType !== 'all') params.set('type', selectedType);
      if (selectedFolderId) params.set('folder_id', selectedFolderId);
      
      const response = await fetch(`/api/documents/search?${params}`);
      const data = await response.json();
      
      setDocuments(data.results || []);
    } catch (error) {
      console.error('Failed to fetch documents:', error);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, selectedType, selectedFolderId]);

  // Fetch unacknowledged count
  const fetchUnacknowledged = useCallback(async () => {
    try {
      const response = await fetch('/api/documents/distributions?unacknowledged=true');
      const data = await response.json();
      setUnacknowledgedCount(data.count || 0);
    } catch (error) {
      console.error('Failed to fetch unacknowledged:', error);
    }
  }, []);

  // Load favorites from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('document-favorites');
    if (stored) {
      setFavorites(new Set(JSON.parse(stored)));
    }
  }, []);

  // Save favorites to localStorage
  const toggleFavorite = (docId: string) => {
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(docId)) {
        next.delete(docId);
      } else {
        next.add(docId);
      }
      localStorage.setItem('document-favorites', JSON.stringify(Array.from(next)));
      return next;
    });
  };

  // Update breadcrumbs when folder changes
  useEffect(() => {
    if (!selectedFolderId) {
      setBreadcrumbs([]);
      return;
    }
    
    const folder = folders.find(f => f.id === selectedFolderId);
    if (!folder) {
      setBreadcrumbs([]);
      return;
    }
    
    // Build breadcrumb path
    const path: DocumentFolder[] = [];
    let current: DocumentFolder | undefined = folder;
    while (current) {
      path.unshift(current);
      current = folders.find(f => f.id === current?.parent_folder_id);
    }
    setBreadcrumbs(path);
  }, [selectedFolderId, folders]);

  useEffect(() => {
    fetchFolders();
    fetchUnacknowledged();
  }, [fetchFolders, fetchUnacknowledged]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(fetchDocuments, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, fetchDocuments]);

  // Acknowledge document
  const handleAcknowledge = async (documentId: string) => {
    setAcknowledging(true);
    try {
      const response = await fetch(`/api/documents/${documentId}/acknowledge`, {
        method: 'POST',
      });
      
      if (response.ok) {
        fetchUnacknowledged();
        setSelectedDocument(null);
      }
    } catch (error) {
      console.error('Failed to acknowledge:', error);
    } finally {
      setAcknowledging(false);
    }
  };

  // Get subfolders of current folder
  const currentSubfolders = folders.filter(f => 
    selectedFolderId ? f.parent_folder_id === selectedFolderId : !f.parent_folder_id
  );

  // Get current folder
  const currentFolder = selectedFolderId 
    ? folders.find(f => f.id === selectedFolderId) 
    : null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950">
      {/* Mobile Header */}
      <div className="lg:hidden sticky top-0 z-30 bg-slate-900/95 backdrop-blur-sm border-b border-slate-800/50">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={() => setShowMobileNav(true)}
            className="p-2 -ml-2 text-slate-400 hover:text-white"
          >
            <Menu className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-semibold text-white">Documents</h1>
          <div className="relative">
            {unacknowledgedCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-amber-500 text-white text-xs rounded-full flex items-center justify-center">
                {unacknowledgedCount}
              </span>
            )}
            <Bell className="w-6 h-6 text-slate-400" />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 lg:px-6 py-4 lg:py-8">
        {/* Desktop Header */}
        <div className="hidden lg:block mb-8">
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <BookOpen className="w-8 h-8 text-cyan-400" />
            Company Documents
          </h1>
          <p className="text-slate-400 mt-2">
            Access safety policies, procedures, and forms
          </p>
        </div>

        {/* Alert: Unacknowledged Documents */}
        {unacknowledgedCount > 0 && (
          <div className="mb-6 p-4 bg-amber-500/20 border border-amber-500/30 rounded-xl flex items-center gap-4">
            <AlertCircle className="w-6 h-6 text-amber-400 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-amber-300 font-medium">
                You have {unacknowledgedCount} document{unacknowledgedCount !== 1 ? 's' : ''} to review
              </p>
              <p className="text-amber-400/70 text-sm">
                Please review and acknowledge these documents
              </p>
            </div>
            <button className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg transition-colors text-sm font-medium">
              View Documents
            </button>
          </div>
        )}

        {/* Breadcrumbs */}
        {breadcrumbs.length > 0 && (
          <div className="flex items-center gap-2 mb-4 text-sm overflow-x-auto pb-2">
            <button
              onClick={() => setSelectedFolderId(null)}
              className="flex items-center gap-1 text-slate-400 hover:text-white transition-colors flex-shrink-0"
            >
              <Home className="w-4 h-4" />
              <span className="hidden sm:inline">Home</span>
            </button>
            {breadcrumbs.map((folder, idx) => (
              <div key={folder.id} className="flex items-center gap-2 flex-shrink-0">
                <ChevronRight className="w-4 h-4 text-slate-600" />
                <button
                  onClick={() => setSelectedFolderId(folder.id)}
                  className={`transition-colors ${
                    idx === breadcrumbs.length - 1
                      ? 'text-cyan-400 font-medium'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {folder.name}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Search and Filter */}
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search documents..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-900/50 border border-slate-600/50 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
              />
            </div>

            {/* Type Filter */}
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-slate-400 hidden sm:block" />
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value as DocumentTypeCode | 'all')}
                className="flex-1 sm:flex-none px-3 py-2.5 bg-slate-900/50 border border-slate-600/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
              >
                <option value="all">All Types</option>
                {Object.entries(DOCUMENT_TYPE_LABELS).map(([code, name]) => (
                  <option key={code} value={code}>{name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar - Folders (Desktop) */}
          <div className="hidden lg:block w-64 flex-shrink-0">
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 overflow-hidden sticky top-6">
              <div className="px-4 py-3 border-b border-slate-700/50">
                <h3 className="font-semibold text-white flex items-center gap-2">
                  <Folder className="w-4 h-4 text-cyan-400" />
                  Browse Folders
                </h3>
              </div>
              <div className="p-2 max-h-[calc(100vh-240px)] overflow-y-auto">
                {/* All Documents */}
                <button
                  onClick={() => setSelectedFolderId(null)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all mb-1
                    ${!selectedFolderId 
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' 
                      : 'text-slate-300 hover:bg-slate-700/30'
                    }`}
                >
                  <FolderOpen className="w-5 h-5" />
                  <span className="font-medium">All Documents</span>
                </button>

                {/* Root Folders */}
                {folders.filter(f => !f.parent_folder_id).map(folder => (
                  <FolderNavItem
                    key={folder.id}
                    folder={folder}
                    allFolders={folders}
                    selectedId={selectedFolderId}
                    onSelect={setSelectedFolderId}
                    depth={0}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {/* Subfolder Grid */}
            {currentSubfolders.length > 0 && !searchQuery && (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-3">
                  {currentFolder ? 'Subfolders' : 'Folders'}
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {currentSubfolders.map(folder => (
                    <FolderCard
                      key={folder.id}
                      folder={folder}
                      onClick={() => setSelectedFolderId(folder.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Document List */}
            <div>
              <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-3">
                Documents {documents.length > 0 && `(${documents.length})`}
              </h3>
              
              <div className="space-y-2">
                {loading ? (
                  <div className="text-center py-12">
                    <Loader2 className="w-8 h-8 text-cyan-400 animate-spin mx-auto" />
                    <p className="text-slate-400 mt-2">Loading documents...</p>
                  </div>
                ) : documents.length === 0 ? (
                  <div className="text-center py-12 bg-slate-800/30 rounded-xl border border-slate-700/50">
                    <FileText className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                    <p className="text-slate-400">No documents found</p>
                    <p className="text-slate-500 text-sm mt-1">
                      {searchQuery ? 'Try adjusting your search' : 'This folder is empty'}
                    </p>
                  </div>
                ) : (
                  documents.map((doc) => (
                    <DocumentCard
                      key={doc.id}
                      document={doc}
                      isFavorite={favorites.has(doc.id)}
                      onToggleFavorite={() => toggleFavorite(doc.id)}
                      onClick={() => setSelectedDocument(doc)}
                    />
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {showMobileNav && (
        <MobileNavDrawer
          folders={folders}
          selectedId={selectedFolderId}
          onSelect={(id) => {
            setSelectedFolderId(id);
            setShowMobileNav(false);
          }}
          onClose={() => setShowMobileNav(false)}
        />
      )}

      {/* Document Detail Modal */}
      {selectedDocument && (
        <DocumentDetailModal
          document={selectedDocument}
          onClose={() => setSelectedDocument(null)}
          onAcknowledge={handleAcknowledge}
          acknowledging={acknowledging}
        />
      )}
    </div>
  );
}

// ============================================================================
// FOLDER NAV ITEM (DESKTOP)
// ============================================================================

function FolderNavItem({
  folder,
  allFolders,
  selectedId,
  onSelect,
  depth,
}: {
  folder: DocumentFolder;
  allFolders: DocumentFolder[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  depth: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const children = allFolders.filter(f => f.parent_folder_id === folder.id);
  const hasChildren = children.length > 0;
  const isSelected = selectedId === folder.id;
  const IconComponent = FOLDER_ICONS[folder.icon] || Folder;

  return (
    <div>
      <div
        className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all
          ${isSelected 
            ? 'bg-cyan-500/20 text-cyan-300' 
            : 'text-slate-300 hover:bg-slate-700/30'
          }`}
        style={{ paddingLeft: `${12 + depth * 12}px` }}
      >
        {hasChildren && (
          <button
            onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
            className="p-0.5"
          >
            <ChevronRight className={`w-4 h-4 transition-transform ${expanded ? 'rotate-90' : ''}`} />
          </button>
        )}
        <button
          onClick={() => onSelect(folder.id)}
          className="flex items-center gap-2 flex-1 min-w-0"
        >
          <IconComponent className="w-4 h-4 flex-shrink-0" style={{ color: folder.color }} />
          <span className="truncate text-sm">{folder.name}</span>
        </button>
      </div>
      {expanded && children.map(child => (
        <FolderNavItem
          key={child.id}
          folder={child}
          allFolders={allFolders}
          selectedId={selectedId}
          onSelect={onSelect}
          depth={depth + 1}
        />
      ))}
    </div>
  );
}

// ============================================================================
// FOLDER CARD
// ============================================================================

function FolderCard({
  folder,
  onClick,
}: {
  folder: DocumentFolder;
  onClick: () => void;
}) {
  const IconComponent = FOLDER_ICONS[folder.icon] || Folder;
  
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center p-4 bg-slate-800/50 rounded-xl border border-slate-700/50 
               hover:border-cyan-500/30 hover:bg-slate-800/70 transition-all group"
    >
      <div 
        className="w-12 h-12 rounded-xl flex items-center justify-center mb-2 transition-colors"
        style={{ backgroundColor: `${folder.color}20` }}
      >
        <IconComponent className="w-6 h-6" style={{ color: folder.color }} />
      </div>
      <span className="text-white text-sm font-medium text-center line-clamp-2 group-hover:text-cyan-300 transition-colors">
        {folder.name}
      </span>
      {folder.document_count !== undefined && folder.document_count > 0 && (
        <span className="text-xs text-slate-500 mt-1">
          {folder.document_count} doc{folder.document_count !== 1 ? 's' : ''}
        </span>
      )}
    </button>
  );
}

// ============================================================================
// DOCUMENT CARD
// ============================================================================

function DocumentCard({ 
  document: doc,
  isFavorite,
  onToggleFavorite,
  onClick,
}: { 
  document: Document;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onClick: () => void;
}) {
  return (
    <div 
      className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-4 hover:border-cyan-500/30 hover:bg-slate-800/70 cursor-pointer transition-all group"
    >
      <div className="flex items-center gap-4">
        {/* Icon */}
        <div className="p-3 bg-cyan-500/20 rounded-lg flex-shrink-0">
          <FileText className="w-6 h-6 text-cyan-400" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0" onClick={onClick}>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="font-mono text-sm text-cyan-400">{doc.control_number}</span>
            <span className="px-2 py-0.5 bg-slate-700/50 text-slate-300 text-xs rounded">
              {DOCUMENT_TYPE_LABELS[doc.document_type_code]}
            </span>
          </div>
          <h3 className="text-white font-medium truncate group-hover:text-cyan-300 transition-colors">
            {doc.title}
          </h3>
          {doc.description && (
            <p className="text-slate-400 text-sm truncate mt-1">{doc.description}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
            className={`p-2 rounded-lg transition-colors ${
              isFavorite 
                ? 'text-amber-400 bg-amber-500/20' 
                : 'text-slate-500 hover:text-amber-400 hover:bg-slate-700/50'
            }`}
          >
            <Star className={`w-5 h-5 ${isFavorite ? 'fill-current' : ''}`} />
          </button>
          <ChevronRight 
            className="w-5 h-5 text-slate-500 group-hover:text-cyan-400 transition-colors hidden sm:block"
            onClick={onClick}
          />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MOBILE NAV DRAWER
// ============================================================================

function MobileNavDrawer({
  folders,
  selectedId,
  onSelect,
  onClose,
}: {
  folders: DocumentFolder[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute left-0 top-0 bottom-0 w-80 max-w-[85vw] bg-slate-900 border-r border-slate-800 overflow-y-auto">
        <div className="flex items-center justify-between px-4 py-4 border-b border-slate-800">
          <h2 className="text-lg font-semibold text-white">Browse Folders</h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-3">
          <button
            onClick={() => onSelect(null)}
            className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all mb-2
              ${!selectedId 
                ? 'bg-cyan-500/20 text-cyan-300' 
                : 'text-slate-300 hover:bg-slate-800'
              }`}
          >
            <FolderOpen className="w-5 h-5" />
            <span className="font-medium">All Documents</span>
          </button>
          
          {folders.filter(f => !f.parent_folder_id).map(folder => {
            const IconComponent = FOLDER_ICONS[folder.icon] || Folder;
            return (
              <button
                key={folder.id}
                onClick={() => onSelect(folder.id)}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all
                  ${selectedId === folder.id 
                    ? 'bg-cyan-500/20 text-cyan-300' 
                    : 'text-slate-300 hover:bg-slate-800'
                  }`}
              >
                <IconComponent className="w-5 h-5" style={{ color: folder.color }} />
                <span className="font-medium">{folder.name}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// DOCUMENT DETAIL MODAL
// ============================================================================

function DocumentDetailModal({
  document: doc,
  onClose,
  onAcknowledge,
  acknowledging,
}: {
  document: Document;
  onClose: () => void;
  onAcknowledge: (id: string) => void;
  acknowledging: boolean;
}) {
  const [acknowledged, setAcknowledged] = useState(false);

  return (
    <div 
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      <div 
        className="bg-slate-800 border-t sm:border border-slate-700 rounded-t-2xl sm:rounded-xl w-full sm:w-full sm:max-w-2xl max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Handle */}
        <div className="sm:hidden flex justify-center py-2">
          <div className="w-12 h-1 bg-slate-600 rounded-full" />
        </div>

        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-slate-700">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="font-mono text-cyan-400">{doc.control_number}</span>
                <span className="px-2 py-0.5 bg-slate-700/50 text-slate-300 text-xs rounded">
                  v{doc.version}
                </span>
              </div>
              <h2 className="text-xl font-bold text-white">{doc.title}</h2>
              <p className="text-slate-400 mt-1">{DOCUMENT_TYPE_LABELS[doc.document_type_code]}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto max-h-[50vh]">
          {/* Description */}
          {doc.description && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-2">
                Description
              </h3>
              <p className="text-white">{doc.description}</p>
            </div>
          )}

          {/* Metadata */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-slate-900/50 rounded-lg p-3">
              <p className="text-xs text-slate-500 uppercase tracking-wider">Effective Date</p>
              <p className="text-white mt-1">
                {doc.effective_date 
                  ? new Date(doc.effective_date).toLocaleDateString()
                  : 'Not set'}
              </p>
            </div>
            <div className="bg-slate-900/50 rounded-lg p-3">
              <p className="text-xs text-slate-500 uppercase tracking-wider">Last Updated</p>
              <p className="text-white mt-1">
                {new Date(doc.updated_at).toLocaleDateString()}
              </p>
            </div>
          </div>

          {/* COR Elements */}
          {doc.cor_elements && doc.cor_elements.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-2">
                Related COR Elements
              </h3>
              <div className="flex flex-wrap gap-2">
                {doc.cor_elements.map(el => (
                  <span 
                    key={el}
                    className="px-2 py-1 bg-cyan-600/20 text-cyan-300 text-sm rounded border border-cyan-500/30"
                  >
                    Element {el}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Acknowledgment */}
          <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700/50">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={acknowledged}
                onChange={(e) => setAcknowledged(e.target.checked)}
                className="mt-1 w-5 h-5 rounded border-slate-600 bg-slate-800 text-cyan-500 focus:ring-cyan-500/50"
              />
              <div>
                <p className="text-white font-medium">I have read and understood this document</p>
                <p className="text-slate-400 text-sm mt-1">
                  By checking this box, I acknowledge that I have reviewed this document
                  and understand my responsibilities as outlined.
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Actions */}
        <div className="p-4 sm:p-6 border-t border-slate-700 flex flex-col sm:flex-row gap-3 sm:justify-between">
          <div className="flex gap-2 order-2 sm:order-1">
            {doc.file_path && (
              <button className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors">
                <Download className="w-4 h-4" />
                <span className="sm:inline">Download</span>
              </button>
            )}
            <button className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors">
              <Eye className="w-4 h-4" />
              <span className="sm:inline">View PDF</span>
            </button>
          </div>
          
          <button
            onClick={() => onAcknowledge(doc.id)}
            disabled={!acknowledged || acknowledging}
            className="flex items-center justify-center gap-2 px-6 py-2.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium order-1 sm:order-2"
          >
            {acknowledging ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle className="w-4 h-4" />
            )}
            Acknowledge
          </button>
        </div>
      </div>
    </div>
  );
}
