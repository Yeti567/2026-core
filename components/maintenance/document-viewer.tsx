'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// ============================================================================
// TYPES
// ============================================================================

interface Attachment {
  id: string;
  maintenance_record_id?: string;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size_bytes?: number;
  attachment_type: string;
  vendor_name: string | null;
  amount: number | null;
  attachment_date: string | null;
  description?: string;
  uploaded_at: string;
  url?: string;
  thumbnail_url?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

interface DocumentViewerProps {
  attachment: Attachment;
  onClose: () => void;
  onDelete?: (id: string) => void;
  linkedRecordNumber?: string;
}

// ============================================================================
// DOCUMENT VIEWER MODAL
// ============================================================================

export function DocumentViewer({
  attachment,
  onClose,
  onDelete,
  linkedRecordNumber
}: DocumentViewerProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(attachment.url || null);
  const [isLoading, setIsLoading] = useState(!attachment.url);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  
  const fetchSignedUrl = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/maintenance/attachment-url?path=${encodeURIComponent(attachment.file_path)}`);
      if (res.ok) {
        const data = await res.json();
        setImageUrl(data.url);
      }
    } catch (err) {
      console.error('Failed to fetch URL:', err);
    } finally {
      setIsLoading(false);
    }
  }, [attachment.file_path]);
  
  // Fetch signed URL if not provided
  useEffect(() => {
    if (!attachment.url && attachment.file_path) {
      fetchSignedUrl();
    }
  }, [attachment.url, attachment.file_path, fetchSignedUrl]);
  
  const handleDownload = () => {
    if (imageUrl) {
      const link = document.createElement('a');
      link.href = imageUrl;
      link.download = attachment.file_name;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };
  
  const handlePrint = () => {
    if (imageUrl) {
      const printWindow = window.open(imageUrl, '_blank');
      if (printWindow) {
        printWindow.onload = () => {
          printWindow.print();
        };
      }
    }
  };
  
  const zoomIn = () => setZoom(prev => Math.min(prev + 0.25, 3));
  const zoomOut = () => setZoom(prev => Math.max(prev - 0.25, 0.5));
  const rotateLeft = () => setRotation(prev => prev - 90);
  const rotateRight = () => setRotation(prev => prev + 90);
  const resetView = () => {
    setZoom(1);
    setRotation(0);
  };
  
  const isPDF = attachment.file_type?.includes('pdf');
  const isImage = attachment.file_type?.startsWith('image/');
  
  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };
  
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
      >
        ✕
      </button>
      
      <div className="w-full h-full flex flex-col lg:flex-row">
        {/* Main Viewer */}
        <div className="flex-1 flex flex-col">
          {/* Toolbar */}
          <div className="flex items-center justify-center gap-2 p-2 bg-black/50">
            <Button variant="ghost" size="sm" onClick={zoomOut} className="text-white hover:bg-white/20">
              ➖
            </Button>
            <span className="text-white text-sm w-16 text-center">{Math.round(zoom * 100)}%</span>
            <Button variant="ghost" size="sm" onClick={zoomIn} className="text-white hover:bg-white/20">
              ➕
            </Button>
            <div className="w-px h-6 bg-white/30 mx-2" />
            <Button variant="ghost" size="sm" onClick={rotateLeft} className="text-white hover:bg-white/20">
              ↶
            </Button>
            <Button variant="ghost" size="sm" onClick={rotateRight} className="text-white hover:bg-white/20">
              ↷
            </Button>
            <div className="w-px h-6 bg-white/30 mx-2" />
            <Button variant="ghost" size="sm" onClick={resetView} className="text-white hover:bg-white/20">
              Reset
            </Button>
            <div className="w-px h-6 bg-white/30 mx-2" />
            <Button variant="ghost" size="sm" onClick={handleDownload} className="text-white hover:bg-white/20">
              ⬇ Download
            </Button>
            <Button variant="ghost" size="sm" onClick={handlePrint} className="text-white hover:bg-white/20">
              🖨 Print
            </Button>
          </div>
          
          {/* Content */}
          <div className="flex-1 overflow-auto flex items-center justify-center p-4">
            {isLoading ? (
              <div className="text-white text-center">
                <div className="animate-spin text-4xl mb-2">⏳</div>
                <p>Loading document...</p>
              </div>
            ) : isPDF ? (
              <iframe
                src={imageUrl || ''}
                className="w-full h-full bg-white rounded-lg"
                title={attachment.file_name}
              />
            ) : isImage && imageUrl ? (
              <div 
                className="overflow-auto max-h-full max-w-full"
                style={{ 
                  transform: `scale(${zoom}) rotate(${rotation}deg)`,
                  transition: 'transform 0.2s ease'
                }}
              >
                <img
                  src={imageUrl}
                  alt={attachment.file_name}
                  className="max-w-none"
                  style={{ maxHeight: '80vh' }}
                />
              </div>
            ) : (
              <div className="text-white text-center">
                <div className="text-6xl mb-4">📄</div>
                <p>Preview not available</p>
                <Button onClick={handleDownload} className="mt-4">
                  Download File
                </Button>
              </div>
            )}
          </div>
        </div>
        
        {/* Metadata Sidebar */}
        <div className="w-full lg:w-80 bg-[var(--background)] p-4 overflow-y-auto">
          <h2 className="text-lg font-bold mb-4">Document Details</h2>
          
          <div className="space-y-4">
            {/* File Info */}
            <div>
              <div className="text-xs text-[var(--muted)] uppercase tracking-wide mb-1">File Name</div>
              <div className="font-medium break-all">{attachment.file_name}</div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-[var(--muted)] uppercase tracking-wide mb-1">Type</div>
                <div className="capitalize">{attachment.attachment_type}</div>
              </div>
              <div>
                <div className="text-xs text-[var(--muted)] uppercase tracking-wide mb-1">Size</div>
                <div>{formatFileSize(attachment.file_size_bytes)}</div>
              </div>
            </div>
            
            {/* Receipt Info */}
            {attachment.vendor_name && (
              <div>
                <div className="text-xs text-[var(--muted)] uppercase tracking-wide mb-1">Vendor</div>
                <div className="font-medium">{attachment.vendor_name}</div>
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-4">
              {attachment.attachment_date && (
                <div>
                  <div className="text-xs text-[var(--muted)] uppercase tracking-wide mb-1">Date</div>
                  <div>{new Date(attachment.attachment_date).toLocaleDateString()}</div>
                </div>
              )}
              {attachment.amount && (
                <div>
                  <div className="text-xs text-[var(--muted)] uppercase tracking-wide mb-1">Amount</div>
                  <div className="font-medium text-green-500">${attachment.amount.toLocaleString()}</div>
                </div>
              )}
            </div>
            
            {/* Linked Record */}
            {(attachment.maintenance_record_id || linkedRecordNumber) && (
              <div>
                <div className="text-xs text-[var(--muted)] uppercase tracking-wide mb-1">Linked To</div>
                <div className="font-medium text-[var(--primary)]">
                  {linkedRecordNumber || attachment.maintenance_record_id}
                </div>
              </div>
            )}
            
            {/* Description */}
            {attachment.description && (
              <div>
                <div className="text-xs text-[var(--muted)] uppercase tracking-wide mb-1">Description</div>
                <div>{attachment.description}</div>
              </div>
            )}
            
            {/* Tags */}
            {attachment.tags && attachment.tags.length > 0 && (
              <div>
                <div className="text-xs text-[var(--muted)] uppercase tracking-wide mb-1">Tags</div>
                <div className="flex flex-wrap gap-1">
                  {attachment.tags.map((tag, i) => (
                    <span key={i} className="px-2 py-0.5 bg-[var(--primary)]/10 text-[var(--primary)] rounded-full text-xs">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            {/* Upload Info */}
            <div className="pt-4 border-t border-[var(--border)]">
              <div className="text-xs text-[var(--muted)]">
                Uploaded: {new Date(attachment.uploaded_at).toLocaleString()}
              </div>
            </div>
            
            {/* Actions */}
            <div className="pt-4 space-y-2">
              <Button onClick={handleDownload} variant="outline" className="w-full">
                ⬇ Download
              </Button>
              <Button onClick={handlePrint} variant="outline" className="w-full">
                🖨 Print
              </Button>
              {onDelete && (
                <Button 
                  onClick={() => onDelete(attachment.id)} 
                  variant="outline" 
                  className="w-full text-red-500 hover:text-red-600 hover:border-red-500"
                >
                  🗑 Delete
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// DOCUMENT GALLERY (for embedding in pages)
// ============================================================================

interface DocumentGalleryProps {
  attachments: Attachment[];
  onUpload?: () => void;
  onDelete?: (id: string) => void;
  emptyMessage?: string;
}

export function DocumentGalleryWithViewer({
  attachments,
  onUpload,
  onDelete,
  emptyMessage = 'No documents yet'
}: DocumentGalleryProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedAttachment, setSelectedAttachment] = useState<Attachment | null>(null);
  
  if (attachments.length === 0) {
    return (
      <div className="text-center py-12 text-[var(--muted)]">
        <div className="text-4xl mb-2">📄</div>
        <p>{emptyMessage}</p>
        {onUpload && (
          <Button onClick={onUpload} className="mt-4">
            📁 Upload Document
          </Button>
        )}
      </div>
    );
  }
  
  return (
    <>
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex gap-2">
          {onUpload && (
            <Button onClick={onUpload}>+ Upload</Button>
          )}
        </div>
        <div className="flex border border-[var(--border)] rounded-lg overflow-hidden">
          <button
            onClick={() => setViewMode('grid')}
            className={`px-3 py-1.5 text-sm ${viewMode === 'grid' ? 'bg-[var(--primary)] text-white' : ''}`}
          >
            ▦
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`px-3 py-1.5 text-sm ${viewMode === 'list' ? 'bg-[var(--primary)] text-white' : ''}`}
          >
            ≡
          </button>
        </div>
      </div>
      
      {/* Grid View */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {attachments.map((attachment) => (
            <Card 
              key={attachment.id} 
              className="overflow-hidden hover:border-[var(--primary)]/50 transition-colors cursor-pointer"
              onClick={() => setSelectedAttachment(attachment)}
            >
              <div className="aspect-square bg-[var(--muted)]/10 flex items-center justify-center">
                {attachment.thumbnail_url ? (
                  <img 
                    src={attachment.thumbnail_url} 
                    alt={attachment.file_name}
                    className="w-full h-full object-cover"
                  />
                ) : attachment.file_type?.includes('pdf') ? (
                  <div className="text-4xl">📄</div>
                ) : (
                  <div className="text-4xl">🧾</div>
                )}
              </div>
              <CardContent className="p-3">
                <div className="text-sm font-medium truncate">{attachment.file_name}</div>
                <div className="text-xs text-[var(--muted)]">
                  {attachment.attachment_date 
                    ? new Date(attachment.attachment_date).toLocaleDateString() 
                    : new Date(attachment.uploaded_at).toLocaleDateString()
                  }
                  {attachment.amount && ` | $${attachment.amount}`}
                </div>
                {attachment.vendor_name && (
                  <div className="text-xs text-[var(--muted)] truncate">{attachment.vendor_name}</div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        /* List View */
        <div className="space-y-2">
          {attachments.map((attachment) => (
            <Card 
              key={attachment.id} 
              className="hover:border-[var(--primary)]/50 transition-colors cursor-pointer"
              onClick={() => setSelectedAttachment(attachment)}
            >
              <CardContent className="py-3 flex items-center gap-4">
                <div className="w-12 h-12 bg-[var(--muted)]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  {attachment.file_type?.includes('pdf') ? '📄' : '🧾'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{attachment.file_name}</div>
                  <div className="text-sm text-[var(--muted)]">
                    {attachment.attachment_date 
                      ? new Date(attachment.attachment_date).toLocaleDateString() 
                      : new Date(attachment.uploaded_at).toLocaleDateString()
                    }
                    {attachment.vendor_name && ` • ${attachment.vendor_name}`}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  {attachment.amount && (
                    <div className="font-medium">${attachment.amount.toLocaleString()}</div>
                  )}
                  <div className="text-xs text-[var(--muted)] capitalize">{attachment.attachment_type}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      
      {/* Viewer Modal */}
      {selectedAttachment && (
        <DocumentViewer
          attachment={selectedAttachment}
          onClose={() => setSelectedAttachment(null)}
          onDelete={onDelete}
        />
      )}
    </>
  );
}
