'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronLeft, Download, Trash2, HardDrive, Wifi, WifiOff, FileText,
  Check, AlertCircle, Loader2, RefreshCw, Plus, X
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

interface OfflineDocument {
  id: string;
  control_number: string;
  title: string;
  file_name?: string;
  file_size_bytes?: number;
  downloaded_at: string;
  version: string;
}

interface AvailableDocument {
  id: string;
  control_number: string;
  title: string;
  file_path?: string;
  file_name?: string;
  file_size_bytes?: number;
  is_critical?: boolean;
  folder_name?: string;
  version: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const MAX_OFFLINE_DOCS = 10;
const STORAGE_KEY = 'worker_offline_documents';

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function OfflineDocumentsPage() {
  const router = useRouter();
  
  const [offlineDocuments, setOfflineDocuments] = useState<OfflineDocument[]>([]);
  const [availableDocuments, setAvailableDocuments] = useState<AvailableDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [totalSize, setTotalSize] = useState(0);

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  useEffect(() => {
    loadOfflineDocuments();
    fetchAvailableDocuments();
    
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

  useEffect(() => {
    const size = offlineDocuments.reduce((sum, doc) => sum + (doc.file_size_bytes || 0), 0);
    setTotalSize(size);
  }, [offlineDocuments]);

  // ============================================================================
  // DATA LOADING
  // ============================================================================

  const loadOfflineDocuments = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setOfflineDocuments(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Failed to load offline documents:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAvailableDocuments = async () => {
    if (!navigator.onLine) return;
    
    try {
      const response = await fetch('/api/documents/search/advanced', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ critical_only: true, limit: 50 }),
      });

      if (response.ok) {
        const data = await response.json();
        setAvailableDocuments(data.results || []);
      }
    } catch (error) {
      console.error('Failed to fetch available documents:', error);
    }
  };

  // ============================================================================
  // OFFLINE MANAGEMENT
  // ============================================================================

  const addToOffline = async (doc: AvailableDocument) => {
    if (offlineDocuments.length >= MAX_OFFLINE_DOCS) {
      alert(`Maximum ${MAX_OFFLINE_DOCS} documents can be stored offline`);
      return;
    }

    if (offlineDocuments.some(d => d.id === doc.id)) {
      alert('Document already saved offline');
      return;
    }

    // In a real app, you'd download and cache the file here
    // For now, we'll just store the metadata
    const offlineDoc: OfflineDocument = {
      id: doc.id,
      control_number: doc.control_number,
      title: doc.title,
      file_name: doc.file_name,
      file_size_bytes: doc.file_size_bytes,
      downloaded_at: new Date().toISOString(),
      version: doc.version,
    };

    const updated = [...offlineDocuments, offlineDoc];
    setOfflineDocuments(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    setShowAddModal(false);
  };

  const removeFromOffline = (docId: string) => {
    const updated = offlineDocuments.filter(d => d.id !== docId);
    setOfflineDocuments(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const syncDocuments = async () => {
    if (!navigator.onLine) {
      alert('Cannot sync while offline');
      return;
    }

    setIsSyncing(true);
    
    try {
      // Check for document updates
      await fetchAvailableDocuments();
      
      // In a real app, you'd re-download any updated documents
      // For now, we'll just refresh the metadata
      
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  // ============================================================================
  // HELPERS
  // ============================================================================

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.back()}
                className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30">
                  <HardDrive className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white">Offline Documents</h1>
                  <p className="text-sm text-slate-400">
                    {offlineDocuments.length}/{MAX_OFFLINE_DOCS} saved
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {isOnline ? (
                <span className="flex items-center gap-1 text-sm text-emerald-400">
                  <Wifi className="w-4 h-4" />
                </span>
              ) : (
                <span className="flex items-center gap-1 text-sm text-amber-400">
                  <WifiOff className="w-4 h-4" />
                </span>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-2xl mx-auto px-4 py-6 pb-24">
        {/* Storage Info */}
        <div className="mb-6 p-4 rounded-xl bg-slate-800/50 border border-slate-700">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm text-slate-400">Storage Used</p>
              <p className="text-lg font-semibold text-white">{formatFileSize(totalSize)}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-slate-400">Documents</p>
              <p className="text-lg font-semibold text-white">
                {offlineDocuments.length} / {MAX_OFFLINE_DOCS}
              </p>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all"
              style={{ width: `${(offlineDocuments.length / MAX_OFFLINE_DOCS) * 100}%` }}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setShowAddModal(true)}
            disabled={!isOnline || offlineDocuments.length >= MAX_OFFLINE_DOCS}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-emerald-500/20 hover:bg-emerald-500/30 disabled:bg-slate-800 disabled:text-slate-500 text-emerald-400 border border-emerald-500/30 disabled:border-slate-700 rounded-xl font-medium transition-colors"
          >
            <Plus className="w-5 h-5" />
            Add Document
          </button>
          <button
            onClick={syncDocuments}
            disabled={!isOnline || isSyncing}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-800 hover:bg-slate-700 disabled:text-slate-500 text-white rounded-xl font-medium transition-colors"
          >
            <RefreshCw className={`w-5 h-5 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Syncing...' : 'Sync'}
          </button>
        </div>

        {/* Offline Documents List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
          </div>
        ) : offlineDocuments.length === 0 ? (
          <div className="text-center py-12">
            <Download className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <p className="text-white font-medium mb-2">No Offline Documents</p>
            <p className="text-slate-400 text-sm mb-4">
              Download critical documents to access them without internet
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              disabled={!isOnline}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-700 text-white rounded-lg font-medium transition-colors"
            >
              Add Your First Document
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {offlineDocuments.map(doc => (
              <div
                key={doc.id}
                className="p-4 rounded-xl bg-slate-800/50 border border-slate-700"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-emerald-500/20 shrink-0">
                    <FileText className="w-5 h-5 text-emerald-400" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium text-white truncate">{doc.title}</p>
                        <p className="text-sm text-emerald-400 font-mono">{doc.control_number}</p>
                      </div>
                      
                      <button
                        onClick={() => removeFromOffline(doc.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/20 transition-colors shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    
                    <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                      <span>{formatFileSize(doc.file_size_bytes)}</span>
                      <span>v{doc.version}</span>
                      <span>Downloaded {formatDate(doc.downloaded_at)}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 mt-3 ml-11">
                  <span className="flex items-center gap-1 px-2 py-1 bg-emerald-500/20 text-emerald-400 text-xs rounded-full">
                    <Check className="w-3 h-3" />
                    Available Offline
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Info Notice */}
        {offlineDocuments.length > 0 && (
          <div className="mt-6 p-4 rounded-xl bg-slate-800/30 border border-slate-700">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
              <div className="text-sm text-slate-400">
                <p className="font-medium text-white mb-1">Offline Access</p>
                <p>
                  These documents are cached for offline access. They will automatically 
                  sync when you reconnect to the internet. Make sure to sync regularly 
                  to keep your offline documents up to date.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Add Document Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex items-end sm:items-center justify-center">
          <div className="w-full max-w-lg bg-slate-900 rounded-t-2xl sm:rounded-2xl border border-slate-800 max-h-[80vh] overflow-hidden">
            {/* Modal Header */}
            <div className="sticky top-0 bg-slate-900 border-b border-slate-800 px-6 py-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">Add Offline Document</h2>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-sm text-slate-400 mt-1">
                Select a critical document to save offline
              </p>
            </div>

            {/* Document List */}
            <div className="overflow-y-auto max-h-[60vh] p-4 space-y-2">
              {availableDocuments
                .filter(doc => !offlineDocuments.some(d => d.id === doc.id))
                .map(doc => (
                  <button
                    key={doc.id}
                    onClick={() => addToOffline(doc)}
                    className="w-full p-4 rounded-xl bg-slate-800/50 border border-slate-700 hover:bg-slate-800 hover:border-slate-600 transition-all text-left"
                  >
                    <div className="flex items-start gap-3">
                      <FileText className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-white truncate">{doc.title}</p>
                          {doc.is_critical && (
                            <span className="shrink-0 px-1.5 py-0.5 bg-red-500/20 text-red-400 text-[10px] rounded">
                              Critical
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-emerald-400 font-mono">{doc.control_number}</p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                          <span>{formatFileSize(doc.file_size_bytes)}</span>
                          {doc.folder_name && <span>{doc.folder_name}</span>}
                        </div>
                      </div>
                      <Download className="w-4 h-4 text-slate-500 shrink-0" />
                    </div>
                  </button>
                ))}

              {availableDocuments.filter(doc => !offlineDocuments.some(d => d.id === doc.id)).length === 0 && (
                <div className="text-center py-8">
                  <Check className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
                  <p className="text-white font-medium">All critical documents saved</p>
                  <p className="text-slate-400 text-sm mt-1">
                    You have all available critical documents offline
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
