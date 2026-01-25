'use client';

import { FieldWrapper } from './field-wrapper';
import { FormField, FieldValue } from '../types';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RatingFieldProps {
  field: FormField;
  value: FieldValue;
  onChange: (value: number) => void;
  error?: string;
  disabled?: boolean;
  maxRating?: number;
}

export function RatingField({
  field,
  value,
  onChange,
  error,
  disabled,
  maxRating = 5,
}: RatingFieldProps) {
  const rating = typeof value === 'number' ? value : 0;
  
  return (
    <FieldWrapper
      label={field.label}
      fieldCode={field.field_code}
      required={field.validation_rules?.required}
      helpText={field.help_text}
      error={error}
    >
      <div className="flex items-center gap-1" role="radiogroup" aria-label={field.label}>
        {Array.from({ length: maxRating }, (_, i) => i + 1).map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => !disabled && onChange(star === rating ? 0 : star)}
            disabled={disabled}
            className={cn(
              'p-1 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-primary',
              disabled && 'cursor-not-allowed opacity-50'
            )}
            role="radio"
            aria-checked={star <= rating}
            aria-label={`${star} star${star !== 1 ? 's' : ''}`}
          >
            <Star
              className={cn(
                'h-8 w-8 transition-colors',
                star <= rating
                  ? 'fill-amber-400 text-amber-400'
                  : 'fill-transparent text-muted-foreground hover:text-amber-300'
              )}
            />
          </button>
        ))}
        <span className="ml-2 text-sm text-muted-foreground">
          {rating > 0 ? `${rating}/${maxRating}` : 'Not rated'}
        </span>
      </div>
    </FieldWrapper>
  );
}

export default RatingField;
