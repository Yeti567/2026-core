'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronLeft, ChevronRight, Book, FileText, Search, Star, Download,
  Loader2, AlertCircle, ExternalLink, Eye
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

interface ManualSection {
  id: string;
  control_number: string;
  title: string;
  description?: string;
  section_number?: number;
  cor_element?: number;
  is_critical?: boolean;
  file_path?: string;
  version: string;
  updated_at: string;
}

// ============================================================================
// COR ELEMENT NAMES
// ============================================================================

const COR_ELEMENT_NAMES: Record<number, string> = {
  1: 'Management Leadership & Commitment',
  2: 'Hazard Identification & Assessment',
  3: 'Hazard Control',
  4: 'Competency, Training & Orientation',
  5: 'Workplace Behavior',
  6: 'Personal Protective Equipment',
  7: 'Preventive Maintenance',
  8: 'Communications',
  9: 'Workplace Inspections',
  10: 'Incident Investigation',
  11: 'Emergency Response',
  12: 'Statistics, Records & Documentation',
  13: 'Regulatory Compliance',
  14: 'Management Review',
};

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

export default function HSManualPage() {
  const router = useRouter();
  
  const [sections, setSections] = useState<ManualSection[]>([]);
  const [filteredSections, setFilteredSections] = useState<ManualSection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedElement, setSelectedElement] = useState<number | null>(null);
  const [bookmarkedIds, setBookmarkedIds] = useState<string[]>([]);

  // ============================================================================
  // DATA FETCHING
  // ============================================================================

  const fetchManualSections = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Fetch documents from the H&S Manual folder
      const response = await fetch('/api/documents/search/advanced', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          document_type: 'MAN',
          limit: 100,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        // Sort by COR element
        const sorted = (data.results || []).sort((a: ManualSection, b: ManualSection) => {
          const aEl = a.cor_element || 99;
          const bEl = b.cor_element || 99;
          return aEl - bEl;
        });
        setSections(sorted);
      } else {
        throw new Error('Failed to fetch manual sections');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load H&S Manual');
    } finally {
      setIsLoading(false);
    }
  }, []);

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

  useEffect(() => {
    fetchManualSections();
    loadBookmarks();
  }, [fetchManualSections, loadBookmarks]);

  // ============================================================================
  // FILTERING
  // ============================================================================

  const filterSections = useCallback(() => {
    let filtered = [...sections];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(s =>
        s.title.toLowerCase().includes(query) ||
        s.control_number.toLowerCase().includes(query) ||
        s.description?.toLowerCase().includes(query)
      );
    }

    if (selectedElement) {
      filtered = filtered.filter(s => 
        s.cor_element === selectedElement ||
        (s.cor_element === undefined && selectedElement === 0)
      );
    }

    setFilteredSections(filtered);
  }, [sections, searchQuery, selectedElement]);

  useEffect(() => {
    fetchManualSections();
    loadBookmarks();
  }, [fetchManualSections, loadBookmarks]);

  useEffect(() => {
    filterSections();
  }, [filterSections]);

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

  const openSection = (section: ManualSection) => {
    // Save to recent
    try {
      const recent = localStorage.getItem(STORAGE_KEYS.RECENT);
      const recentDocs = recent ? JSON.parse(recent) : [];
      const updated = [
        { ...section, viewed_at: new Date().toISOString() },
        ...recentDocs.filter((d: ManualSection) => d.id !== section.id)
      ].slice(0, 10);
      localStorage.setItem(STORAGE_KEYS.RECENT, JSON.stringify(updated));
    } catch (error) {
      console.error('Failed to save to recent:', error);
    }

    router.push(`/documents/view/${section.id}`);
  };

  // ============================================================================
  // GROUP BY COR ELEMENT
  // ============================================================================

  const groupedSections = filteredSections.reduce((acc, section) => {
    const element = section.cor_element || 0;
    // Safe: element is always a number from cor_element property, used for grouping sections by COR element number
    // eslint-disable-next-line security/detect-object-injection
    if (!acc[element]) {
      // Safe: element is always a number from cor_element property, used for grouping sections by COR element number
      // eslint-disable-next-line security/detect-object-injection
      acc[element] = [];
    }
    // Safe: element is always a number from cor_element property, used for grouping sections by COR element number
    // eslint-disable-next-line security/detect-object-injection
    acc[element].push(section);
    return acc;
  }, {} as Record<number, ManualSection[]>);

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-red-950">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={() => router.back()}
              className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-red-500/20 to-orange-500/20 border border-red-500/30">
                <Book className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Health & Safety Manual</h1>
                <p className="text-sm text-slate-400">{sections.length} sections</p>
              </div>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search manual sections..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-red-500"
            />
          </div>
        </div>
      </header>

      {/* COR Element Filter */}
      <div className="sticky top-[130px] z-30 bg-slate-900/95 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            <button
              onClick={() => setSelectedElement(null)}
              className={`shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                selectedElement === null
                  ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              All
            </button>
            {Object.keys(COR_ELEMENT_NAMES).map(el => (
              <button
                key={el}
                onClick={() => setSelectedElement(Number(el))}
                className={`shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  selectedElement === Number(el)
                    ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {el}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-2xl mx-auto px-4 py-6 pb-24">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-red-400 animate-spin" />
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <p className="text-white font-medium mb-2">Failed to load manual</p>
            <p className="text-slate-400 text-sm">{error}</p>
            <button
              onClick={fetchManualSections}
              className="mt-4 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg"
            >
              Try Again
            </button>
          </div>
        ) : filteredSections.length === 0 ? (
          <div className="text-center py-12">
            <Book className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <p className="text-white font-medium mb-2">No sections found</p>
            <p className="text-slate-400 text-sm">
              {searchQuery ? 'Try a different search term' : 'Manual sections will appear here'}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedSections)
              .sort(([a], [b]) => Number(a) - Number(b))
              .map(([element, sectionList]) => (
                <section key={element}>
                  {/* Element Header */}
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center">
                      <span className="text-sm font-bold text-red-400">{element}</span>
                    </div>
                    <h2 className="font-semibold text-white text-sm">
                      {COR_ELEMENT_NAMES[Number(element)] || 'General'}
                    </h2>
                  </div>

                  {/* Sections */}
                  <div className="space-y-2 ml-11">
                    {sectionList.map(section => (
                      <button
                        key={section.id}
                        onClick={() => openSection(section)}
                        className="w-full p-4 rounded-xl bg-slate-800/50 border border-slate-700 hover:bg-slate-800 hover:border-slate-600 transition-all text-left group"
                      >
                        <div className="flex items-start gap-3">
                          <FileText className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="font-medium text-white group-hover:text-red-400 transition-colors">
                                  {section.title}
                                </p>
                                <p className="text-sm text-red-400/80 font-mono">{section.control_number}</p>
                              </div>
                              
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleBookmark(section.id);
                                  }}
                                  className={`p-1.5 rounded-lg transition-colors ${
                                    bookmarkedIds.includes(section.id)
                                      ? 'text-amber-400 hover:bg-amber-500/20'
                                      : 'text-slate-500 hover:bg-slate-700 hover:text-white'
                                  }`}
                                >
                                  <Star className={`w-4 h-4 ${bookmarkedIds.includes(section.id) ? 'fill-amber-400' : ''}`} />
                                </button>
                                <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-red-400 group-hover:translate-x-1 transition-all" />
                              </div>
                            </div>
                            
                            {section.description && (
                              <p className="text-sm text-slate-400 mt-1 line-clamp-2">{section.description}</p>
                            )}
                            
                            <p className="text-xs text-slate-500 mt-2">
                              v{section.version} • Updated {new Date(section.updated_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </section>
              ))}
          </div>
        )}
      </main>
    </div>
  );
}
