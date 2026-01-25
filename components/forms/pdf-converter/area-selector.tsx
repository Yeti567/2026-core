'use client';

import React, { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';

export interface SelectedArea {
  x: number;
  y: number;
  width: number;
  height: number;
  page?: number;
}

interface AreaSelectorProps {
  onAreaSelect: (area: SelectedArea) => void;
  disabled?: boolean;
  className?: string;
}

export function AreaSelector({ onAreaSelect, disabled, className }: AreaSelectorProps) {
  const [isSelecting, setIsSelecting] = useState(false);
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);
  const [currentPos, setCurrentPos] = useState<{ x: number; y: number } | null>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (disabled) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    setStartPos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
    setIsSelecting(true);
  }, [disabled]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!isSelecting || !startPos || disabled) return;

    const rect = e.currentTarget.getBoundingClientRect();
    setCurrentPos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  }, [isSelecting, startPos, disabled]);

  const handleMouseUp = useCallback(() => {
    if (startPos && currentPos) {
      const area: SelectedArea = {
        x: Math.min(startPos.x, currentPos.x),
        y: Math.min(startPos.y, currentPos.y),
        width: Math.abs(currentPos.x - startPos.x),
        height: Math.abs(currentPos.y - startPos.y)
      };

      // Only trigger if selection is meaningful (larger than 20x10 pixels)
      if (area.width > 20 && area.height > 10) {
        onAreaSelect(area);
      }
    }

    setIsSelecting(false);
    setStartPos(null);
    setCurrentPos(null);
  }, [startPos, currentPos, onAreaSelect]);

  const handleMouseLeave = useCallback(() => {
    if (isSelecting) {
      handleMouseUp();
    }
  }, [isSelecting, handleMouseUp]);

  // Calculate selection rectangle
  const selectionRect = isSelecting && startPos && currentPos ? {
    left: Math.min(startPos.x, currentPos.x),
    top: Math.min(startPos.y, currentPos.y),
    width: Math.abs(currentPos.x - startPos.x),
    height: Math.abs(currentPos.y - startPos.y)
  } : null;

  return (
    <div
      className={cn(
        'absolute inset-0 cursor-crosshair',
        disabled && 'pointer-events-none',
        className
      )}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
    >
      {/* Selection rectangle */}
      {selectionRect && (
        <div
          className="absolute border-2 border-dashed border-blue-500 bg-blue-500/20 pointer-events-none transition-none"
          style={{
            left: selectionRect.left,
            top: selectionRect.top,
            width: selectionRect.width,
            height: selectionRect.height
          }}
        >
          <span className="absolute -top-6 left-0 bg-blue-600 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
            {Math.round(selectionRect.width)} × {Math.round(selectionRect.height)}
          </span>
        </div>
      )}

      {/* Instructions hint */}
      {!isSelecting && !disabled && (
        <div className="absolute bottom-2 left-2 right-2 text-center">
          <span className="text-xs text-gray-500 bg-white/90 px-2 py-1 rounded shadow-sm">
            Click and drag to select an area for a new field
          </span>
        </div>
      )}
    </div>
  );
}

export default AreaSelector;
