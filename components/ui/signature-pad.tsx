'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

// =============================================================================
// TYPES
// =============================================================================

export interface SignatureData {
  data: string; // base64 PNG
  timestamp: string;
  isEmpty: boolean;
}

interface SignaturePadProps {
  /** Callback when signature changes (rich metadata) */
  onSignatureChange?: (signature: SignatureData | null) => void;
  /** Back-compat: callback with base64 string */
  onChange?: (value: string) => void;
  /** Current signature data */
  value?: string;
  /** Optional wrapper className */
  className?: string;
  /** Label for the signature field */
  label?: string;
  /** Whether the signature is required */
  required?: boolean;
  /** Error message to display */
  error?: string;
  /** Disable the signature pad */
  disabled?: boolean;
  /** Stroke color */
  strokeColor?: string;
  /** Stroke width */
  strokeWidth?: number;
  /** Background color */
  backgroundColor?: string;
}

// =============================================================================
// COMPONENT
// =============================================================================

export default function SignaturePad({
  onSignatureChange,
  onChange,
  value,
  className,
  label = 'Signature',
  required = false,
  error,
  disabled = false,
  strokeColor = '#ffffff',
  strokeWidth = 2,
  backgroundColor = 'transparent',
}: SignaturePadProps) {
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const modalCanvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);

  // Initialize canvas context
  const initCanvas = useCallback((canvas: HTMLCanvasElement | null) => {
    if (!canvas) return null;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    
    // Set up high-DPI canvas
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    
    ctx.scale(dpr, dpr);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = strokeWidth;
    
    if (backgroundColor !== 'transparent') {
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, rect.width, rect.height);
    }
    
    return ctx;
  }, [strokeColor, strokeWidth, backgroundColor]);

  // Initialize modal canvas when opened
  useEffect(() => {
    if (isModalOpen && modalCanvasRef.current) {
      contextRef.current = initCanvas(modalCanvasRef.current);
    }
  }, [isModalOpen, initCanvas]);

  // Get coordinates from event
  const getCoordinates = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>,
    canvas: HTMLCanvasElement
  ): { x: number; y: number } | null => {
    const rect = canvas.getBoundingClientRect();
    
    if ('touches' in e) {
      if (e.touches.length === 0) return null;
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    }
    
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  // Start drawing
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (disabled || !contextRef.current) return;
    
    const canvas = e.currentTarget;
    const coords = getCoordinates(e, canvas);
    if (!coords) return;
    
    e.preventDefault();
    setIsDrawing(true);
    setHasSignature(true);
    
    contextRef.current.beginPath();
    contextRef.current.moveTo(coords.x, coords.y);
  };

  // Draw
  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || disabled || !contextRef.current) return;
    
    const canvas = e.currentTarget;
    const coords = getCoordinates(e, canvas);
    if (!coords) return;
    
    e.preventDefault();
    
    contextRef.current.lineTo(coords.x, coords.y);
    contextRef.current.stroke();
  };

  // Stop drawing
  const stopDrawing = () => {
    if (contextRef.current) {
      contextRef.current.closePath();
    }
    setIsDrawing(false);
  };

  // Clear signature
  const clearSignature = () => {
    if (modalCanvasRef.current && contextRef.current) {
      const rect = modalCanvasRef.current.getBoundingClientRect();
      contextRef.current.clearRect(0, 0, rect.width, rect.height);
      if (backgroundColor !== 'transparent') {
        contextRef.current.fillStyle = backgroundColor;
        contextRef.current.fillRect(0, 0, rect.width, rect.height);
      }
    }
    setHasSignature(false);
    onSignatureChange?.(null);
    onChange?.('');
  };

  // Save signature
  const saveSignature = () => {
    if (!modalCanvasRef.current || !hasSignature) {
      setIsModalOpen(false);
      return;
    }
    
    const data = modalCanvasRef.current.toDataURL('image/png');
    
    onSignatureChange?.({
      data,
      timestamp: new Date().toISOString(),
      isEmpty: !hasSignature,
    });
    onChange?.(data);
    
    setIsModalOpen(false);
  };

  // Cancel and close modal
  const cancelSignature = () => {
    clearSignature();
    setIsModalOpen(false);
  };

  // Open signature modal
  const openModal = () => {
    if (!disabled) {
      setIsModalOpen(true);
      setHasSignature(false);
    }
  };

  // Remove existing signature
  const removeSignature = () => {
    onSignatureChange?.(null);
    onChange?.('');
  };

  return (
    <div className={`space-y-2 ${className || ''}`}>
      {/* Label */}
      <label className="block text-sm font-medium">
        {label} {required && <span className="text-red-400">*</span>}
      </label>

      {/* Signature display / tap to sign */}
      <div
        className={`h-32 rounded-xl border-2 border-dashed flex items-center justify-center ${
          error ? 'border-red-500' : 'border-[var(--border)]'
        } bg-[var(--card)] ${!disabled ? 'cursor-pointer' : ''}`}
        onClick={value ? undefined : openModal}
      >
        {value ? (
          <div className="relative w-full h-full p-2">
            <img
              src={value}
              alt="Signature"
              className="w-full h-full object-contain"
            />
            {!disabled && (
              <div className="absolute bottom-2 right-2 flex gap-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    openModal();
                  }}
                  className="px-3 py-1 bg-[var(--primary)] text-white text-xs rounded-lg"
                >
                  Re-sign
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeSignature();
                  }}
                  className="px-3 py-1 bg-red-500 text-white text-xs rounded-lg"
                >
                  Remove
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center">
            <span className="text-2xl">✍️</span>
            <p className="text-sm text-[var(--muted)] mt-1">
              {disabled ? 'Signature disabled' : 'Tap to sign'}
            </p>
          </div>
        )}
      </div>

      {/* Error message */}
      {error && (
        <p className="text-red-400 text-sm">{error}</p>
      )}

      {/* Signature modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col">
          {/* Header */}
          <div className="bg-[var(--card)] border-b border-[var(--border)] p-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold">{label}</h3>
            <button
              type="button"
              onClick={cancelSignature}
              className="text-[var(--muted)] hover:text-white"
            >
              ✕
            </button>
          </div>

          {/* Canvas area */}
          <div className="flex-1 p-4 flex flex-col">
            <p className="text-sm text-[var(--muted)] mb-2">
              Sign in the box below using your finger or stylus
            </p>
            <div className="flex-1 relative rounded-xl border-2 border-[var(--border)] bg-[var(--card)] overflow-hidden">
              <canvas
                ref={modalCanvasRef}
                className="absolute inset-0 w-full h-full touch-none"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
              />
              {!hasSignature && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <p className="text-[var(--muted)] text-lg">Draw your signature here</p>
                </div>
              )}
            </div>
          </div>

          {/* Footer buttons */}
          <div className="bg-[var(--card)] border-t border-[var(--border)] p-4 flex gap-3">
            <button
              type="button"
              onClick={clearSignature}
              className="flex-1 h-12 rounded-xl bg-[var(--background)] border border-[var(--border)] font-medium"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={cancelSignature}
              className="flex-1 h-12 rounded-xl bg-[var(--background)] border border-[var(--border)] font-medium"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={saveSignature}
              disabled={!hasSignature}
              className="flex-1 h-12 rounded-xl bg-[var(--primary)] text-white font-semibold disabled:opacity-50"
            >
              Save Signature
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
