'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search, Book, AlertTriangle, FileText, ClipboardList, GraduationCap,
  BarChart, ChevronRight, Star, Clock, Download, Bookmark, X, Filter,
  Wifi, WifiOff, AlertCircle, Check, Loader2, Shield, Folder, Tag,
  Eye, ExternalLink, Mail, Sparkles, Bell, RefreshCw
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

interface PendingAcknowledgment {
  id: string;
  document_id: string;
  document_title: string;
  document_control_number: string;
  required_by_date?: string;
  is_critical?: boolean;
  status: string;
  days_until_due?: number;
}

interface SearchResult extends Document {
  relevance?: number;
  snippet?: string;
}

// ============================================================================
// FOLDER ICONS
// ============================================================================

const FOLDER_ICONS: Record<string, React.ReactNode> = {
  'book-open': <Book className="w-5 h-5" />,
  'scroll': <FileText className="w-5 h-5" />,
  'clipboard-list': <ClipboardList className="w-5 h-5" />,
  'shield-check': <Shield className="w-5 h-5" />,
  'file-text': <FileText className="w-5 h-5" />,
  'graduation-cap': <GraduationCap className="w-5 h-5" />,
  'alert-triangle': <AlertTriangle className="w-5 h-5" />,
  'bar-chart': <BarChart className="w-5 h-5" />,
  'users': <ClipboardList className="w-5 h-5" />,
  'award': <Star className="w-5 h-5" />,
  'folder': <Folder className="w-5 h-5" />,
};

// ============================================================================
// LOCAL STORAGE KEYS
// ============================================================================

const STORAGE_KEYS = {
  BOOKMARKS: 'worker_document_bookmarks',
  RECENT: 'worker_recent_documents',
  OFFLINE: 'worker_offline_documents',
  RECENT_SEARCHES: 'worker_recent_searches',
};

// ============================================================================
// POPULAR SEARCHES
// ============================================================================

const POPULAR_SEARCHES = [
  'Working at Heights',
  'Concrete Safety',
  'PPE',
  'Emergency',
  'First Aid',
  'Incident Reporting',
  'Fire Safety',
  'Excavation',
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function WorkerDocumentPortal() {
  const router = useRouter();
  
  // Data state
  const [folders, setFolders] = useState<DocumentFolder[]>([]);
  const [pendingAcknowledgments, setPendingAcknowledgments] = useState<PendingAcknowledgment[]>([]);
  const [criticalDocuments, setCriticalDocuments] = useState<Document[]>([]);
  const [recentDocuments, setRecentDocuments] = useState<Document[]>([]);
  const [bookmarkedDocuments, setBookmarkedDocuments] = useState<Document[]>([]);
  const [offlineDocuments, setOfflineDocuments] = useState<string[]>([]);
  const [bookmarkedIds, setBookmarkedIds] = useState<string[]>([]);
  
  // UI state
  const [isLoading, setIsLoading] = useState(true);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [filterFolder, setFilterFolder] = useState('');
  const [filterType, setFilterType] = useState('');
  const [isOnline, setIsOnline] = useState(true);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [showAcknowledgmentModal, setShowAcknowledgmentModal] = useState(false);
  const [acknowledgingDoc, setAcknowledgingDoc] = useState<PendingAcknowledgment | null>(null);
  
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();

  // ============================================================================
  // DATA FETCHING
  // ============================================================================

  const fetchFolders = useCallback(async () => {
    try {
      const response = await fetch('/api/documents/folders');
      if (response.ok) {
        const data = await response.json();
        setFolders(data.folders || []);
      }
    } catch (error) {
      console.error('Failed to fetch folders:', error);
    }
  }, []);

  const fetchPendingAcknowledgments = useCallback(async () => {
    try {
      const response = await fetch('/api/documents/acknowledgments/me?status=pending');
      if (response.ok) {
        const data = await response.json();
        setPendingAcknowledgments(data.acknowledgments || []);
      }
    } catch (error) {
      console.error('Failed to fetch acknowledgments:', error);
    }
  }, []);

  const fetchCriticalDocuments = useCallback(async () => {
    try {
      const response = await fetch('/api/documents/search/advanced', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ critical_only: true, limit: 10 }),
      });
      if (response.ok) {
        const data = await response.json();
        setCriticalDocuments(data.results || []);
      }
    } catch (error) {
      console.error('Failed to fetch critical documents:', error);
    }
  }, []);

  const fetchInitialData = useCallback(async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        fetchFolders(),
        fetchPendingAcknowledgments(),
        fetchCriticalDocuments(),
      ]);
    } catch (error) {
      console.error('Failed to fetch initial data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [fetchFolders, fetchPendingAcknowledgments, fetchCriticalDocuments]);

  // Setup online/offline listeners and load localStorage data
  useEffect(() => {
    loadLocalStorageData();
    
    // Online status listener
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    setIsOnline(navigator.onLine);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Fetch initial data
  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  const loadLocalStorageData = () => {
    try {
      // Load bookmarks
      const bookmarks = localStorage.getItem(STORAGE_KEYS.BOOKMARKS);
      if (bookmarks) {
        setBookmarkedIds(JSON.parse(bookmarks));
      }
      
      // Load recent documents
      const recent = localStorage.getItem(STORAGE_KEYS.RECENT);
      if (recent) {
        setRecentDocuments(JSON.parse(recent));
      }
      
      // Load offline documents
      const offline = localStorage.getItem(STORAGE_KEYS.OFFLINE);
      if (offline) {
        setOfflineDocuments(JSON.parse(offline));
      }
      
      // Load recent searches
      const searches = localStorage.getItem(STORAGE_KEYS.RECENT_SEARCHES);
      if (searches) {
        setRecentSearches(JSON.parse(searches));
      }
    } catch (error) {
      console.error('Failed to load localStorage data:', error);
    }
  };

  // ============================================================================
  // SEARCH
  // ============================================================================

  const saveRecentSearch = useCallback((query: string) => {
    setRecentSearches(prev => {
      const updated = [query, ...prev.filter(s => s !== query)].slice(0, 5);
      localStorage.setItem(STORAGE_KEYS.RECENT_SEARCHES, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const performSearch = useCallback(async (query: string) => {
    setIsSearching(true);
    try {
      const response = await fetch('/api/documents/search/advanced', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          folder_id: filterFolder || undefined,
          document_type: filterType || undefined,
          limit: 20,
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.results || []);
        
        // Save to recent searches
        if (query.length >= 3) {
          saveRecentSearch(query);
        }
      }
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsSearching(false);
    }
  }, [filterFolder, filterType, saveRecentSearch]);

  useEffect(() => {
    if (searchQuery.length >= 2) {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      searchTimeoutRef.current = setTimeout(() => {
        performSearch(searchQuery);
      }, 300);
    } else {
      setSearchResults([]);
    }
    
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, filterFolder, filterType, performSearch]);

  // ============================================================================
  // BOOKMARKS
  // ============================================================================

  const toggleBookmark = useCallback((docId: string) => {
    setBookmarkedIds(prev => {
      const updated = prev.includes(docId)
        ? prev.filter(id => id !== docId)
        : [...prev, docId];
      localStorage.setItem(STORAGE_KEYS.BOOKMARKS, JSON.stringify(updated));
      return updated;
    });
  }, []);

  // ============================================================================
  // DOCUMENT ACTIONS
  // ============================================================================

  const openDocument = (doc: Document) => {
    // Add to recent
    const recentEntry = {
      ...doc,
      viewed_at: new Date().toISOString(),
    };
    
    setRecentDocuments(prev => {
      const updated = [recentEntry, ...prev.filter(d => d.id !== doc.id)].slice(0, 10);
      localStorage.setItem(STORAGE_KEYS.RECENT, JSON.stringify(updated));
      return updated;
    });
    
    // Track view
    fetch(`/api/documents/${doc.id}/view`, { method: 'POST' }).catch(() => {});
    
    // Open viewer
    setSelectedDocument(doc);
  };

  const openAcknowledgment = (ack: PendingAcknowledgment) => {
    setAcknowledgingDoc(ack);
    setShowAcknowledgmentModal(true);
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-emerald-400 animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading documents...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30">
                <Book className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Safety Documents</h1>
                <p className="text-xs text-slate-400">
                  {isOnline ? (
                    <span className="flex items-center gap-1">
                      <Wifi className="w-3 h-3 text-emerald-400" /> Online
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-amber-400">
                      <WifiOff className="w-3 h-3" /> Offline Mode
                    </span>
                  )}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {pendingAcknowledgments.length > 0 && (
                <div className="relative">
                  <Bell className="w-5 h-5 text-slate-400" />
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {pendingAcknowledgments.length}
                  </span>
                </div>
              )}
              <button
                onClick={() => setIsSearchOpen(true)}
                className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
              >
                <Search className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 py-6 pb-24 space-y-6">
        
        {/* Action Required */}
        {pendingAcknowledgments.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle className="w-5 h-5 text-amber-400" />
              <h2 className="text-lg font-semibold text-white">Action Required</h2>
              <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 text-xs font-medium rounded-full">
                {pendingAcknowledgments.length}
              </span>
            </div>
            <div className="space-y-2">
              {pendingAcknowledgments.slice(0, 3).map(ack => (
                <div
                  key={ack.id}
                  className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/15 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                        <p className="font-medium text-white truncate">{ack.document_title}</p>
                      </div>
                      <p className="text-sm text-slate-400">
                        {ack.document_control_number}
                        {ack.required_by_date && (
                          <> • Acknowledge by {new Date(ack.required_by_date).toLocaleDateString()}</>
                        )}
                      </p>
                    </div>
                    <button
                      onClick={() => openAcknowledgment(ack)}
                      className="shrink-0 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium rounded-lg transition-colors"
                    >
                      Acknowledge
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Quick Access */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-semibold text-white">Quick Access</h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {/* H&S Manual */}
            <button
              onClick={() => router.push('/documents/manual')}
              className="p-4 rounded-xl bg-gradient-to-br from-red-500/20 to-orange-500/20 border border-red-500/30 text-left hover:from-red-500/30 hover:to-orange-500/30 transition-all group"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-red-500/20">
                  <Book className="w-5 h-5 text-red-400" />
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500 ml-auto group-hover:translate-x-1 transition-transform" />
              </div>
              <p className="font-semibold text-white">H&S Manual</p>
              <p className="text-xs text-slate-400 mt-1">Complete safety program</p>
            </button>

            {/* Emergency Procedures */}
            <button
              onClick={() => router.push('/documents/folder/emergency-procedures')}
              className="p-4 rounded-xl bg-gradient-to-br from-amber-500/20 to-red-500/20 border border-amber-500/30 text-left hover:from-amber-500/30 hover:to-red-500/30 transition-all group"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-amber-500/20">
                  <AlertTriangle className="w-5 h-5 text-amber-400" />
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500 ml-auto group-hover:translate-x-1 transition-transform" />
              </div>
              <p className="font-semibold text-white">Emergency</p>
              <p className="text-xs text-slate-400 mt-1">Critical procedures</p>
            </button>
          </div>
        </section>

        {/* Browse by Folder */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Folder className="w-5 h-5 text-slate-400" />
            <h2 className="text-lg font-semibold text-white">Browse by Folder</h2>
          </div>
          <div className="space-y-2">
            {folders.filter(f => f.document_count > 0).map(folder => (
              <button
                key={folder.id}
                onClick={() => router.push(`/documents/folder/${folder.folder_code?.toLowerCase()}`)}
                className="w-full flex items-center gap-3 p-4 rounded-xl bg-slate-800/50 border border-slate-700 hover:bg-slate-800 hover:border-slate-600 transition-all group"
              >
                <div 
                  className="p-2 rounded-lg"
                  style={{ backgroundColor: `${folder.color}20` }}
                >
                  <span style={{ color: folder.color }}>
                    {FOLDER_ICONS[folder.icon] || <Folder className="w-5 h-5" />}
                  </span>
                </div>
                <div className="flex-1 text-left">
                  <p className="font-medium text-white">{folder.name}</p>
                  <p className="text-xs text-slate-400">{folder.document_count} documents</p>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-500 group-hover:translate-x-1 transition-transform" />
              </button>
            ))}
          </div>
        </section>

        {/* Recently Viewed */}
        {recentDocuments.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-5 h-5 text-slate-400" />
              <h2 className="text-lg font-semibold text-white">Recently Viewed</h2>
            </div>
            <div className="space-y-2">
              {recentDocuments.slice(0, 5).map(doc => (
                <button
                  key={doc.id}
                  onClick={() => openDocument(doc)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl bg-slate-800/30 hover:bg-slate-800/50 transition-all text-left"
                >
                  <FileText className="w-5 h-5 text-slate-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{doc.title}</p>
                    <p className="text-xs text-slate-500">{doc.control_number}</p>
                  </div>
                  {bookmarkedIds.includes(doc.id) && (
                    <Star className="w-4 h-4 text-amber-400 fill-amber-400 shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Bookmarks */}
        {bookmarkedIds.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Star className="w-5 h-5 text-amber-400" />
              <h2 className="text-lg font-semibold text-white">My Bookmarks</h2>
              <span className="text-sm text-slate-500">({bookmarkedIds.length})</span>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
              {recentDocuments
                .filter(d => bookmarkedIds.includes(d.id))
                .slice(0, 5)
                .map(doc => (
                  <button
                    key={doc.id}
                    onClick={() => openDocument(doc)}
                    className="shrink-0 w-40 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/15 transition-colors text-left"
                  >
                    <Star className="w-4 h-4 text-amber-400 mb-2" />
                    <p className="text-sm text-white font-medium truncate">{doc.title}</p>
                    <p className="text-xs text-slate-500 truncate">{doc.control_number}</p>
                  </button>
                ))}
            </div>
          </section>
        )}

        {/* Offline Documents */}
        {offlineDocuments.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Download className="w-5 h-5 text-emerald-400" />
              <h2 className="text-lg font-semibold text-white">Offline Documents</h2>
              <span className="text-sm text-slate-500">({offlineDocuments.length}/10)</span>
            </div>
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <p className="text-sm text-slate-300 mb-2">
                {offlineDocuments.length} documents available offline
              </p>
              <button
                onClick={() => router.push('/documents/offline')}
                className="text-sm text-emerald-400 hover:text-emerald-300 font-medium"
              >
                Manage Offline Documents →
              </button>
            </div>
          </section>
        )}

        {/* Popular Searches */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Search className="w-5 h-5 text-slate-400" />
            <h2 className="text-lg font-semibold text-white">Popular Searches</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {POPULAR_SEARCHES.map(term => (
              <button
                key={term}
                onClick={() => {
                  setSearchQuery(term);
                  setIsSearchOpen(true);
                }}
                className="px-3 py-1.5 rounded-full bg-slate-800 text-slate-300 text-sm hover:bg-slate-700 hover:text-white transition-colors"
              >
                {term}
              </button>
            ))}
          </div>
        </section>
      </main>

      {/* Search Modal */}
      {isSearchOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md">
          <div className="max-w-2xl mx-auto p-4">
            {/* Search Header */}
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search for procedures, policies..."
                  autoFocus
                  className="w-full pl-10 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
                />
                {isSearching && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 animate-spin" />
                )}
              </div>
              <button
                onClick={() => setIsSearchOpen(false)}
                className="p-3 rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Filters */}
            <div className="flex gap-2 mb-4">
              <select
                value={filterFolder}
                onChange={(e) => setFilterFolder(e.target.value)}
                className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="">All Folders</option>
                {folders.map(f => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="">All Types</option>
                <option value="POL">Policy</option>
                <option value="SWP">Safe Work Procedure</option>
                <option value="FRM">Form</option>
                <option value="TRN">Training</option>
                <option value="MAN">Manual</option>
              </select>
            </div>

            {/* Recent Searches */}
            {searchQuery.length < 2 && recentSearches.length > 0 && (
              <div className="mb-4">
                <p className="text-sm text-slate-400 mb-2">Recent Searches</p>
                <div className="space-y-1">
                  {recentSearches.map((term, i) => (
                    <button
                      key={i}
                      onClick={() => setSearchQuery(term)}
                      className="flex items-center gap-2 w-full p-2 rounded-lg hover:bg-slate-800 text-left transition-colors"
                    >
                      <Clock className="w-4 h-4 text-slate-500" />
                      <span className="text-slate-300">{term}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Search Results */}
            {searchQuery.length >= 2 && (
              <div className="space-y-2 max-h-[calc(100vh-200px)] overflow-y-auto">
                {searchResults.length === 0 && !isSearching ? (
                  <div className="text-center py-8">
                    <Search className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                    <p className="text-slate-400">No documents found</p>
                    <p className="text-sm text-slate-500 mt-1">Try different keywords</p>
                  </div>
                ) : (
                  searchResults.map(doc => (
                    <button
                      key={doc.id}
                      onClick={() => {
                        openDocument(doc);
                        setIsSearchOpen(false);
                      }}
                      className="w-full p-4 rounded-xl bg-slate-800/50 border border-slate-700 hover:bg-slate-800 hover:border-slate-600 transition-all text-left"
                    >
                      <div className="flex items-start gap-3">
                        <div 
                          className="p-2 rounded-lg shrink-0"
                          style={{ backgroundColor: `${doc.folder_color || '#6366f1'}20` }}
                        >
                          <FileText className="w-4 h-4" style={{ color: doc.folder_color || '#6366f1' }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-white">{doc.title}</p>
                          <p className="text-sm text-slate-400">
                            {doc.control_number} • {doc.folder_name || 'Documents'} • v{doc.version}
                          </p>
                          {doc.snippet && (
                            <p className="text-sm text-slate-500 mt-2 line-clamp-2">
                              {doc.snippet}
                            </p>
                          )}
                        </div>
                        {doc.is_critical && (
                          <span className="shrink-0 px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded-full">
                            Critical
                          </span>
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Document Viewer Modal */}
      {selectedDocument && (
        <DocumentViewer
          document={selectedDocument}
          isBookmarked={bookmarkedIds.includes(selectedDocument.id)}
          isOffline={offlineDocuments.includes(selectedDocument.id)}
          onClose={() => setSelectedDocument(null)}
          onToggleBookmark={() => toggleBookmark(selectedDocument.id)}
          onAcknowledge={() => {
            const ack = pendingAcknowledgments.find(a => a.document_id === selectedDocument.id);
            if (ack) {
              openAcknowledgment(ack);
            }
          }}
        />
      )}

      {/* Acknowledgment Modal */}
      {showAcknowledgmentModal && acknowledgingDoc && (
        <AcknowledgmentModal
          acknowledgment={acknowledgingDoc}
          onClose={() => {
            setShowAcknowledgmentModal(false);
            setAcknowledgingDoc(null);
          }}
          onSuccess={() => {
            setPendingAcknowledgments(prev => prev.filter(a => a.id !== acknowledgingDoc.id));
            setShowAcknowledgmentModal(false);
            setAcknowledgingDoc(null);
          }}
        />
      )}
    </div>
  );
}

// ============================================================================
// DOCUMENT VIEWER COMPONENT
// ============================================================================

interface DocumentViewerProps {
  document: Document;
  isBookmarked: boolean;
  isOffline: boolean;
  onClose: () => void;
  onToggleBookmark: () => void;
  onAcknowledge?: () => void;
}

function DocumentViewer({ 
  document, 
  isBookmarked, 
  isOffline, 
  onClose, 
  onToggleBookmark,
  onAcknowledge 
}: DocumentViewerProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-slate-900 border-b border-slate-800">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-emerald-400 font-mono">{document.control_number}</p>
            <p className="font-medium text-white truncate">{document.title}</p>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={onToggleBookmark}
              className={`p-2 rounded-lg transition-colors ${
                isBookmarked 
                  ? 'text-amber-400 hover:bg-amber-500/20' 
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Bookmark className={`w-5 h-5 ${isBookmarked ? 'fill-amber-400' : ''}`} />
            </button>
          </div>
        </div>
      </header>

      {/* Document Display */}
      <div className="h-[calc(100vh-130px)] bg-slate-800 flex items-center justify-center">
        {isLoading ? (
          <div className="text-center">
            <Loader2 className="w-12 h-12 text-emerald-400 animate-spin mx-auto mb-4" />
            <p className="text-slate-400">Loading document...</p>
          </div>
        ) : error ? (
          <div className="text-center p-8">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <p className="text-white font-medium mb-2">Failed to load document</p>
            <p className="text-slate-400 text-sm">{error}</p>
          </div>
        ) : (
          <div className="w-full h-full p-4">
            {/* PDF would be rendered here with react-pdf or similar */}
            <div className="w-full h-full bg-white rounded-lg flex items-center justify-center">
              <div className="text-center text-slate-500">
                <FileText className="w-16 h-16 mx-auto mb-4 text-slate-400" />
                <p className="text-lg font-medium text-slate-700">PDF Viewer</p>
                <p className="text-sm text-slate-500 mt-1">
                  Document: {document.file_name || 'document.pdf'}
                </p>
                <a
                  href={document.file_path || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  Open in New Tab
                </a>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <footer className="fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 px-4 py-3">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          {/* Page Navigation */}
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="p-1 hover:bg-slate-800 rounded disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ←
            </button>
            <span>{currentPage} / {totalPages}</span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="p-1 hover:bg-slate-800 rounded disabled:opacity-50 disabled:cursor-not-allowed"
            >
              →
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors">
              <Download className="w-5 h-5" />
            </button>
            <button className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors">
              <Mail className="w-5 h-5" />
            </button>
            {document.worker_must_acknowledge && onAcknowledge && (
              <button
                onClick={onAcknowledge}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-medium transition-colors"
              >
                <Check className="w-4 h-4" />
                Acknowledge
              </button>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}

// ============================================================================
// ACKNOWLEDGMENT MODAL COMPONENT
// ============================================================================

interface AcknowledgmentModalProps {
  acknowledgment: PendingAcknowledgment;
  onClose: () => void;
  onSuccess: () => void;
}

function AcknowledgmentModal({ acknowledgment, onClose, onSuccess }: AcknowledgmentModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [checkboxes, setCheckboxes] = useState({
    read: false,
    questions: false,
    comply: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allChecked = checkboxes.read && checkboxes.questions && checkboxes.comply;

  // Canvas drawing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, []);

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasSignature(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  const handleSubmit = async () => {
    if (!allChecked || !hasSignature) return;

    setIsSubmitting(true);
    setError(null);

    try {
      // Get signature data
      const signatureData = canvasRef.current?.toDataURL('image/png');

      const response = await fetch(`/api/documents/${acknowledgment.document_id}/acknowledgments`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: 'digital_signature',
          signature_data: signatureData,
          notes: 'Acknowledged via worker portal',
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to submit acknowledgment');
      }

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit acknowledgment');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex items-end sm:items-center justify-center">
      <div className="w-full max-w-lg bg-slate-900 rounded-t-2xl sm:rounded-2xl border border-slate-800 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-slate-900 border-b border-slate-800 px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Document Acknowledgment</h2>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Document Info */}
          <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700">
            <p className="text-sm text-slate-400 mb-1">Document</p>
            <p className="font-semibold text-white">{acknowledgment.document_title}</p>
            <p className="text-sm text-emerald-400 font-mono mt-1">{acknowledgment.document_control_number}</p>
            {acknowledgment.required_by_date && (
              <p className="text-sm text-amber-400 mt-2">
                Due: {new Date(acknowledgment.required_by_date).toLocaleDateString()}
              </p>
            )}
          </div>

          {/* Checkboxes */}
          <div className="space-y-3">
            <p className="text-sm font-medium text-white">By signing below, I confirm that I have:</p>
            
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={checkboxes.read}
                onChange={(e) => setCheckboxes(prev => ({ ...prev, read: e.target.checked }))}
                className="mt-0.5 w-5 h-5 rounded border-slate-600 bg-slate-800 text-emerald-500 focus:ring-emerald-500"
              />
              <span className="text-slate-300">Read and understood this document</span>
            </label>
            
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={checkboxes.questions}
                onChange={(e) => setCheckboxes(prev => ({ ...prev, questions: e.target.checked }))}
                className="mt-0.5 w-5 h-5 rounded border-slate-600 bg-slate-800 text-emerald-500 focus:ring-emerald-500"
              />
              <span className="text-slate-300">Asked questions if anything was unclear</span>
            </label>
            
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={checkboxes.comply}
                onChange={(e) => setCheckboxes(prev => ({ ...prev, comply: e.target.checked }))}
                className="mt-0.5 w-5 h-5 rounded border-slate-600 bg-slate-800 text-emerald-500 focus:ring-emerald-500"
              />
              <span className="text-slate-300">Will comply with this policy/procedure</span>
            </label>
          </div>

          {/* Signature Pad */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-white">Signature</p>
              {hasSignature && (
                <button
                  onClick={clearSignature}
                  className="text-sm text-slate-400 hover:text-white transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
            <div className="relative">
              <canvas
                ref={canvasRef}
                width={400}
                height={150}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                className="w-full h-36 bg-slate-800 border border-slate-700 rounded-xl cursor-crosshair touch-none"
              />
              {!hasSignature && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <p className="text-slate-500 text-sm">Sign here</p>
                </div>
              )}
            </div>
          </div>

          {/* Date */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400">Date:</span>
            <span className="text-white">{new Date().toLocaleDateString()}</span>
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 rounded-lg bg-red-500/20 border border-red-500/30">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-slate-900 border-t border-slate-800 px-6 py-4">
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!allChecked || !hasSignature || isSubmitting}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-700 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-colors"
            >
              {isSubmitting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Check className="w-5 h-5" />
                  Submit & Acknowledge
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
