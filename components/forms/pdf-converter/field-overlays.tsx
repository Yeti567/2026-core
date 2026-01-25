'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import type { FormFieldMapping } from '@/lib/forms/pdf-conversion-types';

interface FieldOverlaysProps {
  fields: FormFieldMapping[];
  onFieldClick: (field: FormFieldMapping) => void;
  selectedFieldId?: string;
  scale?: number;
}

export function FieldOverlays({ 
  fields, 
  onFieldClick, 
  selectedFieldId,
  scale = 1 
}: FieldOverlaysProps) {
  return (
    <>
      {fields.map(field => {
        const isSelected = field.field_id === selectedFieldId;
        const hasPosition = field.position_x !== null && 
                           field.position_y !== null && 
                           field.position_width !== null && 
                           field.position_height !== null;

        if (!hasPosition) return null;

        return (
          <div
            key={field.field_id}
            className={cn(
              'absolute border-2 cursor-pointer transition-all duration-150',
              'hover:shadow-lg hover:z-10',
              field.auto_detected
                ? isSelected 
                  ? 'border-green-600 bg-green-500/30 shadow-lg z-20'
                  : 'border-green-500 bg-green-500/10 hover:bg-green-500/20'
                : field.manually_added
                  ? isSelected
                    ? 'border-blue-600 bg-blue-500/30 shadow-lg z-20'
                    : 'border-blue-500 bg-blue-500/10 hover:bg-blue-500/20'
                  : isSelected
                    ? 'border-purple-600 bg-purple-500/30 shadow-lg z-20'
                    : 'border-purple-500 bg-purple-500/10 hover:bg-purple-500/20'
            )}
            style={{
              left: (field.position_x ?? 0) * scale,
              top: (field.position_y ?? 0) * scale,
              width: (field.position_width ?? 100) * scale,
              height: (field.position_height ?? 30) * scale
            }}
            onClick={(e) => {
              e.stopPropagation();
              onFieldClick(field);
            }}
            title={`${field.label} (${field.field_type})`}
          >
            {/* Field label badge */}
            <div 
              className={cn(
                'absolute -top-6 left-0 text-white text-xs px-2 py-1 rounded whitespace-nowrap',
                'max-w-[200px] truncate shadow-sm',
                field.auto_detected
                  ? 'bg-green-600'
                  : field.manually_added
                    ? 'bg-blue-600'
                    : 'bg-purple-600'
              )}
            >
              {field.label}
            </div>

            {/* Confidence indicator for auto-detected fields */}
            {field.auto_detected && field.confidence !== null && (
              <div className="absolute -bottom-5 right-0 text-xs text-gray-600 bg-white/90 px-1 rounded">
                {Math.round(field.confidence * 100)}%
              </div>
            )}

            {/* Field type badge */}
            <div className="absolute bottom-1 left-1 text-[10px] text-gray-700 bg-white/80 px-1 rounded capitalize">
              {field.field_type}
            </div>

            {/* Required indicator */}
            {field.validation_rules?.required && (
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" 
                   title="Required field" />
            )}

            {/* Selection indicator */}
            {isSelected && (
              <>
                {/* Corner handles */}
                <div className="absolute -top-1 -left-1 w-3 h-3 bg-white border-2 border-green-600 rounded-full" />
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-white border-2 border-green-600 rounded-full" />
                <div className="absolute -bottom-1 -left-1 w-3 h-3 bg-white border-2 border-green-600 rounded-full" />
                <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-white border-2 border-green-600 rounded-full" />
              </>
            )}
          </div>
        );
      })}
    </>
  );
}

export default FieldOverlays;
