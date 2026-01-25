'use client';

import { useRef, useState, useEffect, useCallback } from 'react';

interface SignatureFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  description?: string;
  helpText?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  penColor?: string;
  backgroundColor?: string;
}

export function SignatureField({
  id,
  label,
  value,
  onChange,
  onBlur,
  description,
  helpText,
  required,
  disabled,
  error,
  penColor = '#000000',
  backgroundColor = '#ffffff',
}: SignatureFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(!!value);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  // Initialize canvas with saved signature
  useEffect(() => {
    if (value && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const img = new Image();
        img.onload = () => {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);
        };
        img.src = value;
      }
    }
  }, [value, isModalOpen]);

  const getCoordinates = useCallback(
    (e: React.TouchEvent | React.MouseEvent): { x: number; y: number } | null => {
      const canvas = canvasRef.current;
      if (!canvas) return null;

      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;

      if ('touches' in e) {
        const touch = e.touches[0];
        return {
          x: (touch.clientX - rect.left) * scaleX,
          y: (touch.clientY - rect.top) * scaleY,
        };
      } else {
        return {
          x: (e.clientX - rect.left) * scaleX,
          y: (e.clientY - rect.top) * scaleY,
        };
      }
    },
    []
  );

  const startDrawing = useCallback(
    (e: React.TouchEvent | React.MouseEvent) => {
      if (disabled) return;
      e.preventDefault();
      
      const coords = getCoordinates(e);
      if (coords) {
        setIsDrawing(true);
        lastPointRef.current = coords;
      }
    },
    [disabled, getCoordinates]
  );

  const draw = useCallback(
    (e: React.TouchEvent | React.MouseEvent) => {
      if (!isDrawing || disabled) return;
      e.preventDefault();

      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      const coords = getCoordinates(e);
      const lastPoint = lastPointRef.current;

      if (!ctx || !coords || !lastPoint) return;

      ctx.beginPath();
      ctx.strokeStyle = penColor;
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.moveTo(lastPoint.x, lastPoint.y);
      ctx.lineTo(coords.x, coords.y);
      ctx.stroke();

      lastPointRef.current = coords;
      setHasSignature(true);
    },
    [isDrawing, disabled, penColor, getCoordinates]
  );

  const stopDrawing = useCallback(() => {
    if (isDrawing) {
      setIsDrawing(false);
      lastPointRef.current = null;
    }
  }, [isDrawing]);

  const clearSignature = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (ctx && canvas) {
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      setHasSignature(false);
      onChange('');
    }
  }, [backgroundColor, onChange]);

  const saveSignature = useCallback(() => {
    const canvas = canvasRef.current;
    if (canvas && hasSignature) {
      const dataUrl = canvas.toDataURL('image/png');
      onChange(dataUrl);
      setIsModalOpen(false);
      onBlur?.();
    }
  }, [hasSignature, onChange, onBlur]);

  const openModal = useCallback(() => {
    if (!disabled) {
      setIsModalOpen(true);
    }
  }, [disabled]);

  // Initialize canvas background
  useEffect(() => {
    if (isModalOpen && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Restore existing signature if any
        if (value) {
          const img = new Image();
          img.onload = () => {
            ctx.drawImage(img, 0, 0);
          };
          img.src = value;
        }
      }
    }
  }, [isModalOpen, backgroundColor, value]);

  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
        {required && <span className="text-red-400 ml-1">*</span>}
      </label>
      {description && (
        <p className="text-sm text-[var(--muted)]">{description}</p>
      )}

      {/* Signature Display/Button */}
      <div
        onClick={openModal}
        className={`h-32 rounded-xl border-2 border-dashed flex items-center justify-center cursor-pointer transition-colors ${
          error
            ? 'border-red-500'
            : 'border-[var(--border)] hover:border-[var(--primary)]/50'
        } bg-[var(--card)] ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        {value ? (
          <div className="text-center">
            <img
              src={value}
              alt="Signature"
              className="h-20 w-auto mx-auto object-contain"
            />
            <p className="text-xs text-[var(--muted)] mt-1">Tap to edit</p>
          </div>
        ) : (
          <div className="text-center">
            <span className="text-2xl">✍️</span>
            <p className="text-[var(--primary)] font-medium mt-1">Tap to sign</p>
          </div>
        )}
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}
      {helpText && !error && (
        <p className="text-xs text-[var(--muted)]">{helpText}</p>
      )}

      {/* Signature Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50">
          <div className="bg-[var(--card)] w-full max-w-lg rounded-t-2xl p-4 animate-slide-up">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">{label}</h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-2xl text-[var(--muted)] hover:text-[var(--foreground)]"
              >
                ×
              </button>
            </div>

            <div className="border-2 border-[var(--border)] rounded-xl overflow-hidden mb-4">
              <canvas
                ref={canvasRef}
                width={400}
                height={200}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                className="w-full touch-none"
                style={{ touchAction: 'none' }}
              />
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={clearSignature}
                className="flex-1 h-12 rounded-xl bg-[var(--background)] border border-[var(--border)] font-medium transition-colors hover:bg-[var(--card)]"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={saveSignature}
                disabled={!hasSignature}
                className="flex-1 h-12 rounded-xl bg-[var(--primary)] text-white font-semibold transition-colors hover:bg-[var(--primary-hover)] disabled:opacity-50"
              >
                Save Signature
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
