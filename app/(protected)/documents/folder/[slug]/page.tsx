'use client';

import { useState, useEffect, use, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronLeft, FileText, Search, Filter, Star, Download, Eye,
  Loader2, AlertCircle, Clock, Tag, Shield, Check, X
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

interface Document {
  id: string;
  control_number: string;
  title: string;
  description?: string;
  document_type_code: string;
  version: string;
  file_path?: string;
  file_name?: string;
  effective_date?: string;
  is_critical?: boolean;
  worker_must_acknowledge?: boolean;
  view_count?: number;
  folder_id?: string;
  folder_name?: string;
  folder_code?: string;
  folder_icon?: string;
  folder_color?: string;
  cor_elements?: number[];
  tags?: string[];
  keywords?: string[];
  updated_at: string;
}

interface DocumentFolder {
  id: string;
  name: string;
  folder_code: string;
  icon: string;
  color: string;
  description?: string;
  document_count: number;
}

// ============================================================================
// STORAGE KEYS
// ============================================================================

const STORAGE_KEYS = {
  BOOKMARKS: 'worker_document_bookmarks',
  RECENT: 'worker_recent_documents',
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default function FolderDocumentsPage({ params }: PageProps) {
  const { slug } = use(params);
  const router = useRouter();
  
  const [folder, setFolder] = useState<DocumentFolder | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [filteredDocuments, setFilteredDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'title' | 'date' | 'control_number'>('title');
  const [bookmarkedIds, setBookmarkedIds] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [filterCritical, setFilterCritical] = useState(false);

  // ============================================================================
  // DATA FETCHING
  // ============================================================================

  const fetchFolderAndDocuments = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Fetch folder info
      const foldersResponse = await fetch('/api/documents/folders');
      if (foldersResponse.ok) {
        const foldersData = await foldersResponse.json();
        const folderMatch = foldersData.folders?.find(
          (f: DocumentFolder) => f.folder_code?.toLowerCase() === slug.toLowerCase()
        );
        if (folderMatch) {
          setFolder(folderMatch);
        }
      }

      // Fetch documents
      const docsResponse = await fetch('/api/documents/search/advanced', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          folder_id: slug,
          limit: 100,
        }),
      });

      if (docsResponse.ok) {
        const docsData = await docsResponse.json();
        setDocuments(docsData.results || []);
      } else {
        throw new Error('Failed to fetch documents');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load documents');
    } finally {
      setIsLoading(false);
    }
  }, [slug]);

  const loadBookmarks = useCallback(() => {
    try {
      const bookmarks = localStorage.getItem(STORAGE_KEYS.BOOKMARKS);
      if (bookmarks) {
        setBookmarkedIds(JSON.parse(bookmarks));
      }
    } catch (error) {
      console.error('Failed to load bookmarks:', error);
    }
  }, []);

  // ============================================================================
  // FILTERING & SORTING
  // ============================================================================

  const filterAndSortDocuments = useCallback(() => {
    let filtered = [...documents];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(doc =>
        doc.title.toLowerCase().includes(query) ||
        doc.control_number.toLowerCase().includes(query) ||
        doc.description?.toLowerCase().includes(query) ||
        doc.tags?.some(t => t.toLowerCase().includes(query)) ||
        doc.keywords?.some(k => k.toLowerCase().includes(query))
      );
    }

    // Critical filter
    if (filterCritical) {
      filtered = filtered.filter(doc => doc.is_critical);
    }

    // Sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'title':
          return a.title.localeCompare(b.title);
        case 'date':
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
        case 'control_number':
          return a.control_number.localeCompare(b.control_number);
        default:
          return 0;
      }
    });

    setFilteredDocuments(filtered);
  }, [documents, searchQuery, sortBy, filterCritical]);

  useEffect(() => {
    fetchFolderAndDocuments();
    loadBookmarks();
  }, [fetchFolderAndDocuments, loadBookmarks]);

  useEffect(() => {
    filterAndSortDocuments();
  }, [filterAndSortDocuments]);

  // ============================================================================
  // ACTIONS
  // ============================================================================

  const toggleBookmark = (docId: string) => {
    setBookmarkedIds(prev => {
      const updated = prev.includes(docId)
        ? prev.filter(id => id !== docId)
        : [...prev, docId];
      localStorage.setItem(STORAGE_KEYS.BOOKMARKS, JSON.stringify(updated));
      return updated;
    });
  };

  const openDocument = (doc: Document) => {
    // Save to recent
    try {
      const recent = localStorage.getItem(STORAGE_KEYS.RECENT);
      const recentDocs = recent ? JSON.parse(recent) : [];
      const updated = [
        { ...doc, viewed_at: new Date().toISOString() },
        ...recentDocs.filter((d: Document) => d.id !== doc.id)
      ].slice(0, 10);
      localStorage.setItem(STORAGE_KEYS.RECENT, JSON.stringify(updated));
    } catch (error) {
      console.error('Failed to save to recent:', error);
    }

    // Track view
    fetch(`/api/documents/${doc.id}/view`, { method: 'POST' }).catch(() => {});

    // Navigate to viewer
    router.push(`/documents/view/${doc.id}`);
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  const folderColor = folder?.color || '#6366f1';
  const folderName = folder?.name || slug.charAt(0).toUpperCase() + slug.slice(1).replace(/-/g, ' ');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-white">{folderName}</h1>
              <p className="text-sm text-slate-400">
                {filteredDocuments.length} document{filteredDocuments.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>

          {/* Search */}
          <div className="mt-4 flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search documents..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2.5 rounded-xl border transition-colors ${
                showFilters || filterCritical
                  ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400'
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
              }`}
            >
              <Filter className="w-5 h-5" />
            </button>
          </div>

          {/* Filters */}
          {showFilters && (
            <div className="mt-3 p-3 rounded-xl bg-slate-800/50 border border-slate-700">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filterCritical}
                      onChange={(e) => setFilterCritical(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-emerald-500"
                    />
                    <span className="text-sm text-slate-300">Critical only</span>
                  </label>
                </div>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                  className="px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white"
                >
                  <option value="title">Sort by Title</option>
                  <option value="date">Sort by Date</option>
                  <option value="control_number">Sort by Control #</option>
                </select>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Content */}
      <main className="max-w-2xl mx-auto px-4 py-6 pb-24">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <p className="text-white font-medium mb-2">Failed to load documents</p>
            <p className="text-slate-400 text-sm">{error}</p>
            <button
              onClick={fetchFolderAndDocuments}
              className="mt-4 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : filteredDocuments.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <p className="text-white font-medium mb-2">No documents found</p>
            <p className="text-slate-400 text-sm">
              {searchQuery ? 'Try a different search term' : 'This folder is empty'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredDocuments.map(doc => (
              <button
                key={doc.id}
                onClick={() => openDocument(doc)}
                className="w-full p-4 rounded-xl bg-slate-800/50 border border-slate-700 hover:bg-slate-800 hover:border-slate-600 transition-all text-left group"
              >
                <div className="flex items-start gap-3">
                  <div 
                    className="p-2 rounded-lg shrink-0"
                    style={{ backgroundColor: `${folderColor}20` }}
                  >
                    <FileText className="w-5 h-5" style={{ color: folderColor }} />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium text-white group-hover:text-emerald-400 transition-colors truncate">
                          {doc.title}
                        </p>
                        <p className="text-sm text-emerald-400 font-mono">{doc.control_number}</p>
                      </div>
                      
                      <div className="flex items-center gap-1 shrink-0">
                        {doc.is_critical && (
                          <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded-full">
                            Critical
                          </span>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleBookmark(doc.id);
                          }}
                          className={`p-1.5 rounded-lg transition-colors ${
                            bookmarkedIds.includes(doc.id)
                              ? 'text-amber-400 hover:bg-amber-500/20'
                              : 'text-slate-500 hover:bg-slate-700 hover:text-white'
                          }`}
                        >
                          <Star className={`w-4 h-4 ${bookmarkedIds.includes(doc.id) ? 'fill-amber-400' : ''}`} />
                        </button>
                      </div>
                    </div>
                    
                    {doc.description && (
                      <p className="text-sm text-slate-400 mt-1 line-clamp-2">{doc.description}</p>
                    )}
                    
                    <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                      <span>v{doc.version}</span>
                      {doc.effective_date && (
                        <span>Effective: {new Date(doc.effective_date).toLocaleDateString()}</span>
                      )}
                      {doc.view_count !== undefined && doc.view_count > 0 && (
                        <span className="flex items-center gap-1">
                          <Eye className="w-3 h-3" /> {doc.view_count}
                        </span>
                      )}
                    </div>

                    {/* Tags */}
                    {doc.tags && doc.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {doc.tags.slice(0, 4).map((tag, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-700/50 text-slate-400 text-xs rounded-full"
                          >
                            <Tag className="w-3 h-3" />
                            {tag}
                          </span>
                        ))}
                        {doc.tags.length > 4 && (
                          <span className="text-xs text-slate-500">+{doc.tags.length - 4}</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
