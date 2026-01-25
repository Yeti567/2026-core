'use client';

import { useState, useEffect, use, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronLeft, Download, Bookmark, Mail, Share2, Star, X,
  Loader2, AlertCircle, FileText, ExternalLink, Check, ZoomIn, ZoomOut,
  ChevronRight, Maximize, Minimize
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
  file_size_bytes?: number;
  effective_date?: string;
  is_critical?: boolean;
  worker_must_acknowledge?: boolean;
  page_count?: number;
  folder_id?: string;
  folder_name?: string;
  cor_elements?: number[];
  tags?: string[];
  created_at: string;
  updated_at: string;
}

// ============================================================================
// STORAGE KEYS
// ============================================================================

const STORAGE_KEYS = {
  BOOKMARKS: 'worker_document_bookmarks',
  OFFLINE: 'worker_offline_documents',
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function DocumentViewerPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();
  
  const [document, setDocument] = useState<Document | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [zoom, setZoom] = useState(100);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [needsAcknowledgment, setNeedsAcknowledgment] = useState(false);
  const [showAckModal, setShowAckModal] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);

  // ============================================================================
  // DATA FETCHING
  // ============================================================================

  const checkAcknowledgmentStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/documents/acknowledgments/me?status=pending');
      if (response.ok) {
        const data = await response.json();
        const pending = data.acknowledgments?.find((a: { document_id: string }) => a.document_id === id);
        setNeedsAcknowledgment(!!pending);
      }
    } catch (error) {
      console.error('Failed to check acknowledgment status:', error);
    }
  }, [id]);

  const fetchDocument = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/documents/${id}`);
      if (!response.ok) {
        throw new Error('Document not found');
      }
      
      const data = await response.json();
      setDocument(data.document);
      setTotalPages(data.document.page_count || 1);
      
      // Check if needs acknowledgment
      if (data.document.worker_must_acknowledge) {
        checkAcknowledgmentStatus();
      }

      // Track view
      fetch(`/api/documents/${id}/view`, { method: 'POST' }).catch(() => {});
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load document');
    } finally {
      setIsLoading(false);
    }
  }, [id, checkAcknowledgmentStatus]);

  const loadLocalState = useCallback(() => {
    try {
      // Check bookmarks
      const bookmarks = localStorage.getItem(STORAGE_KEYS.BOOKMARKS);
      if (bookmarks) {
        const ids = JSON.parse(bookmarks);
        setIsBookmarked(ids.includes(id));
      }
      
      // Check offline
      const offline = localStorage.getItem(STORAGE_KEYS.OFFLINE);
      if (offline) {
        const ids = JSON.parse(offline);
        setIsOffline(ids.includes(id));
      }
    } catch (error) {
      console.error('Failed to load local state:', error);
    }
  }, [id]);

  useEffect(() => {
    fetchDocument();
    loadLocalState();
  }, [fetchDocument, loadLocalState]);

  // ============================================================================
  // ACTIONS
  // ============================================================================

  const toggleBookmark = () => {
    try {
      const bookmarks = localStorage.getItem(STORAGE_KEYS.BOOKMARKS);
      const ids = bookmarks ? JSON.parse(bookmarks) : [];
      const updated = isBookmarked
        ? ids.filter((docId: string) => docId !== id)
        : [...ids, id];
      localStorage.setItem(STORAGE_KEYS.BOOKMARKS, JSON.stringify(updated));
      setIsBookmarked(!isBookmarked);
    } catch (error) {
      console.error('Failed to toggle bookmark:', error);
    }
  };

  const handleDownload = () => {
    if (document?.file_path) {
      window.open(document.file_path, '_blank');
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: document?.title,
          text: `Check out this document: ${document?.control_number}`,
          url: window.location.href,
        });
      } catch (error) {
        // User cancelled or not supported
      }
    } else {
      // Fallback: copy link
      navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard');
    }
  };

  const handleEmail = () => {
    if (document) {
      const subject = encodeURIComponent(`Document: ${document.title}`);
      const body = encodeURIComponent(
        `Please see the attached document:\n\n` +
        `Title: ${document.title}\n` +
        `Control Number: ${document.control_number}\n` +
        `Version: ${document.version}\n\n` +
        `Link: ${window.location.href}`
      );
      window.location.href = `mailto:?subject=${subject}&body=${body}`;
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    
    if (!isFullscreen) {
      containerRef.current.requestFullscreen?.();
    } else {
      window.document.exitFullscreen?.();
    }
    setIsFullscreen(!isFullscreen);
  };

  const handleAcknowledge = async () => {
    setShowAckModal(true);
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-emerald-400 animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading document...</p>
        </div>
      </div>
    );
  }

  if (error || !document) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <p className="text-white font-medium mb-2">Failed to load document</p>
          <p className="text-slate-400 text-sm mb-4">{error}</p>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="min-h-screen bg-slate-950 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800">
        <div className="flex items-center gap-2 px-3 py-3">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors shrink-0"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          
          <div className="flex-1 min-w-0">
            <p className="text-xs text-emerald-400 font-mono">{document.control_number}</p>
            <p className="font-medium text-white text-sm truncate">{document.title}</p>
          </div>
          
          <div className="flex items-center gap-1 shrink-0">
            {document.is_critical && (
              <span className="hidden sm:inline px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded-full">
                Critical
              </span>
            )}
            <button
              onClick={() => setShowInfo(!showInfo)}
              className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            >
              <FileText className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Document Info Panel */}
      {showInfo && (
        <div className="bg-slate-900 border-b border-slate-800 px-4 py-4">
          <div className="max-w-2xl mx-auto space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-white">Document Information</h3>
              <button
                onClick={() => setShowInfo(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-slate-500">Version</p>
                <p className="text-white">{document.version}</p>
              </div>
              <div>
                <p className="text-slate-500">Effective Date</p>
                <p className="text-white">
                  {document.effective_date 
                    ? new Date(document.effective_date).toLocaleDateString()
                    : 'N/A'
                  }
                </p>
              </div>
              <div>
                <p className="text-slate-500">Pages</p>
                <p className="text-white">{document.page_count || 'Unknown'}</p>
              </div>
              <div>
                <p className="text-slate-500">Folder</p>
                <p className="text-white">{document.folder_name || 'Uncategorized'}</p>
              </div>
            </div>

            {document.description && (
              <div>
                <p className="text-slate-500 text-sm">Description</p>
                <p className="text-white text-sm">{document.description}</p>
              </div>
            )}

            {document.cor_elements && document.cor_elements.length > 0 && (
              <div>
                <p className="text-slate-500 text-sm mb-1">COR Elements</p>
                <div className="flex flex-wrap gap-1">
                  {document.cor_elements.map(el => (
                    <span key={el} className="px-2 py-0.5 bg-violet-500/20 text-violet-300 text-xs rounded-full">
                      Element {el}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {document.tags && document.tags.length > 0 && (
              <div>
                <p className="text-slate-500 text-sm mb-1">Tags</p>
                <div className="flex flex-wrap gap-1">
                  {document.tags.map((tag, i) => (
                    <span key={i} className="px-2 py-0.5 bg-slate-700 text-slate-300 text-xs rounded-full">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Document Viewer */}
      <div className="flex-1 bg-slate-800 overflow-hidden">
        <div className="h-full flex items-center justify-center p-4">
          {document.file_path ? (
            <div className="w-full h-full max-w-4xl bg-white rounded-lg shadow-2xl flex flex-col">
              {/* Zoom Controls */}
              <div className="flex items-center justify-between px-4 py-2 bg-slate-100 border-b">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setZoom(Math.max(50, zoom - 25))}
                    className="p-1.5 rounded hover:bg-slate-200 text-slate-600"
                    disabled={zoom <= 50}
                  >
                    <ZoomOut className="w-4 h-4" />
                  </button>
                  <span className="text-sm text-slate-600 min-w-[60px] text-center">{zoom}%</span>
                  <button
                    onClick={() => setZoom(Math.min(200, zoom + 25))}
                    className="p-1.5 rounded hover:bg-slate-200 text-slate-600"
                    disabled={zoom >= 200}
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-600">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={toggleFullscreen}
                    className="p-1.5 rounded hover:bg-slate-200 text-slate-600"
                  >
                    {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              
              {/* PDF Content Area */}
              <div 
                className="flex-1 overflow-auto"
                style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center' }}
              >
                <iframe
                  src={`${document.file_path}#toolbar=0&navpanes=0`}
                  className="w-full h-full min-h-[600px]"
                  title={document.title}
                />
              </div>
            </div>
          ) : (
            <div className="text-center">
              <FileText className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <p className="text-white font-medium">No preview available</p>
              <p className="text-slate-400 text-sm mt-2">
                {document.file_name || 'Document file not found'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Page Navigation (for multi-page docs) */}
      {totalPages > 1 && (
        <div className="bg-slate-900 border-t border-slate-800 px-4 py-2">
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage <= 1}
              className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="text-slate-400 text-sm min-w-[80px] text-center">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage >= totalPages}
              className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Footer Actions */}
      <footer className="bg-slate-900 border-t border-slate-800 px-4 py-3 safe-area-pb">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-1">
            <button
              onClick={handleDownload}
              className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            >
              <Download className="w-5 h-5" />
              <span className="text-[10px]">Download</span>
            </button>
            <button
              onClick={toggleBookmark}
              className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${
                isBookmarked
                  ? 'text-amber-400 hover:bg-amber-500/20'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Star className={`w-5 h-5 ${isBookmarked ? 'fill-amber-400' : ''}`} />
              <span className="text-[10px]">Bookmark</span>
            </button>
            <button
              onClick={handleEmail}
              className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            >
              <Mail className="w-5 h-5" />
              <span className="text-[10px]">Email</span>
            </button>
            <button
              onClick={handleShare}
              className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            >
              <Share2 className="w-5 h-5" />
              <span className="text-[10px]">Share</span>
            </button>
          </div>

          {needsAcknowledgment && (
            <button
              onClick={handleAcknowledge}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-medium transition-colors"
            >
              <Check className="w-5 h-5" />
              Acknowledge
            </button>
          )}
        </div>
      </footer>

      {/* Acknowledgment Modal */}
      {showAckModal && (
        <AcknowledgmentModal
          documentId={id}
          documentTitle={document.title}
          controlNumber={document.control_number}
          onClose={() => setShowAckModal(false)}
          onSuccess={() => {
            setShowAckModal(false);
            setNeedsAcknowledgment(false);
          }}
        />
      )}
    </div>
  );
}

// ============================================================================
// ACKNOWLEDGMENT MODAL
// ============================================================================

interface AcknowledgmentModalProps {
  documentId: string;
  documentTitle: string;
  controlNumber: string;
  onClose: () => void;
  onSuccess: () => void;
}

function AcknowledgmentModal({ 
  documentId, 
  documentTitle, 
  controlNumber, 
  onClose, 
  onSuccess 
}: AcknowledgmentModalProps) {
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
      const signatureData = canvasRef.current?.toDataURL('image/png');

      const response = await fetch(`/api/documents/${documentId}/acknowledgments`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: 'digital_signature',
          signature_data: signatureData,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to submit');
      }

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex items-end sm:items-center justify-center">
      <div className="w-full max-w-lg bg-slate-900 rounded-t-2xl sm:rounded-2xl border border-slate-800 max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-slate-900 border-b border-slate-800 px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Acknowledge Document</h2>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-800 text-slate-400">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700">
            <p className="font-semibold text-white">{documentTitle}</p>
            <p className="text-sm text-emerald-400 font-mono mt-1">{controlNumber}</p>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium text-white">I confirm that I have:</p>
            
            {[
              { key: 'read', label: 'Read and understood this document' },
              { key: 'questions', label: 'Asked questions if anything was unclear' },
              { key: 'comply', label: 'Will comply with this policy/procedure' },
            ].map(({ key, label }) => (
              <label key={key} className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={checkboxes[key as keyof typeof checkboxes]}
                  onChange={(e) => setCheckboxes(prev => ({ ...prev, [key]: e.target.checked }))}
                  className="mt-0.5 w-5 h-5 rounded border-slate-600 bg-slate-800 text-emerald-500"
                />
                <span className="text-slate-300">{label}</span>
              </label>
            ))}
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-white">Signature</p>
              {hasSignature && (
                <button onClick={clearSignature} className="text-sm text-slate-400 hover:text-white">
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

          {error && (
            <div className="p-3 rounded-lg bg-red-500/20 border border-red-500/30">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}
        </div>

        <div className="sticky bottom-0 bg-slate-900 border-t border-slate-800 px-6 py-4">
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!allChecked || !hasSignature || isSubmitting}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-700 disabled:cursor-not-allowed text-white rounded-xl font-medium"
            >
              {isSubmitting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Check className="w-5 h-5" />
                  Submit
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
