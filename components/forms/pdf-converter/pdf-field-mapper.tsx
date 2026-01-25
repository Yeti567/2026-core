'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Maximize2, Loader2 } from 'lucide-react';
import { FieldOverlays } from './field-overlays';
import { AreaSelector, type SelectedArea } from './area-selector';
import type { PDFFormConversion, FormFieldMapping } from '@/lib/forms/pdf-conversion-types';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PDFFieldMapperProps {
  conversion: PDFFormConversion;
  fields: FormFieldMapping[];
  pdfUrl: string | null;
  onFieldClick: (field: FormFieldMapping) => void;
  onAreaSelect: (area: SelectedArea & { page: number }) => void;
  selectedFieldId?: string;
  isSelectMode?: boolean;
}

export function PDFFieldMapper({
  conversion,
  fields,
  pdfUrl,
  onFieldClick,
  onAreaSelect,
  selectedFieldId,
  isSelectMode = true
}: PDFFieldMapperProps) {
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Filter fields for current page
  const currentPageFields = fields.filter(f => f.position_page === currentPage);

  const handleDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setIsLoading(false);
  };

  const handleDocumentLoadError = (error: Error) => {
    setError(`Failed to load PDF: ${error.message}`);
    setIsLoading(false);
  };

  const handleAreaSelect = (area: SelectedArea) => {
    onAreaSelect({
      ...area,
      page: currentPage
    });
  };

  const zoomIn = () => setScale(s => Math.min(s + 0.25, 3));
  const zoomOut = () => setScale(s => Math.max(s - 0.25, 0.5));
  const resetZoom = () => setScale(1);

  // Auto-fit width on container resize
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver(() => {
      // Could auto-calculate scale here if needed
    });

    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, []);

  if (!pdfUrl) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-100 rounded-lg">
        <div className="text-center p-8">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-200 rounded-lg flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
          </div>
          <p className="text-gray-500">Loading PDF...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-900 rounded-lg overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-800 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-300 font-medium">PDF Preview</span>
          {conversion.original_pdf_name && (
            <span className="text-xs text-slate-500 truncate max-w-[200px]">
              {conversion.original_pdf_name}
            </span>
          )}
        </div>
        
        {/* Zoom controls */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={zoomOut}
            disabled={scale <= 0.5}
            className="text-slate-300 hover:text-white hover:bg-slate-700"
          >
            <ZoomOut className="w-4 h-4" />
          </Button>
          <span className="text-sm text-slate-300 min-w-[60px] text-center">
            {Math.round(scale * 100)}%
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={zoomIn}
            disabled={scale >= 3}
            className="text-slate-300 hover:text-white hover:bg-slate-700"
          >
            <ZoomIn className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={resetZoom}
            className="text-slate-300 hover:text-white hover:bg-slate-700"
          >
            <Maximize2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* PDF Document Area */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-auto relative"
        style={{ backgroundColor: '#1e293b' }}
      >
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center p-4">
              <p className="text-red-400">{error}</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => {
                  setError(null);
                  setIsLoading(true);
                }}
              >
                Retry
              </Button>
            </div>
          </div>
        )}

        <div className="flex justify-center p-4">
          <div className="relative shadow-2xl">
            <Document
              file={pdfUrl}
              onLoadSuccess={handleDocumentLoadSuccess}
              onLoadError={handleDocumentLoadError}
              loading={null}
              className="flex justify-center"
            >
              <Page
                pageNumber={currentPage}
                scale={scale}
                renderTextLayer={false}
                renderAnnotationLayer={false}
                className="shadow-lg"
                loading={
                  <div className="w-[612px] h-[792px] bg-white flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
                  </div>
                }
              />
            </Document>

            {/* Field overlays - positioned over the PDF */}
            {!isLoading && (
              <div className="absolute inset-0 pointer-events-none">
                <div className="relative w-full h-full pointer-events-auto">
                  <FieldOverlays
                    fields={currentPageFields}
                    onFieldClick={onFieldClick}
                    selectedFieldId={selectedFieldId}
                    scale={scale}
                  />
                </div>
              </div>
            )}

            {/* Area selector for adding new fields */}
            {!isLoading && isSelectMode && (
              <AreaSelector
                onAreaSelect={handleAreaSelect}
                disabled={!isSelectMode}
              />
            )}
          </div>
        </div>
      </div>

      {/* Page navigation */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-800 border-t border-slate-700">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="text-slate-300 hover:text-white hover:bg-slate-700"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Previous
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-300">
            Page {currentPage} of {numPages || '...'}
          </span>
          <div className="flex gap-1">
            {numPages > 0 && Array.from({ length: Math.min(numPages, 10) }, (_, i) => i + 1).map(page => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={cn(
                  'w-7 h-7 text-xs rounded transition-colors',
                  page === currentPage
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:bg-slate-700 hover:text-white'
                )}
              >
                {page}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentPage(p => Math.min(numPages, p + 1))}
            disabled={currentPage === numPages || numPages === 0}
            className="text-slate-300 hover:text-white hover:bg-slate-700"
          >
            Next
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>

      {/* Field count for current page */}
      <div className="px-4 py-2 bg-slate-900 text-xs text-slate-500 text-center border-t border-slate-800">
        {currentPageFields.length} field{currentPageFields.length !== 1 ? 's' : ''} detected on this page
        {isSelectMode && ' • Click and drag to add a field'}
      </div>
    </div>
  );
}

export default PDFFieldMapper;
