'use client';

import { Button } from '@/components/ui/button';
import { FieldWrapper } from './field-wrapper';
import { FormField, FieldValue } from '../types';
import { Check, X, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface YesNoFieldProps {
  field: FormField;
  value: FieldValue;
  onChange: (value: string | null) => void;
  error?: string;
  disabled?: boolean;
}

export function YesNoField({
  field,
  value,
  onChange,
  error,
  disabled,
}: YesNoFieldProps) {
  const includeNA = field.field_type === 'yes_no_na';
  const stringValue = value === null || value === undefined ? null : String(value);
  
  const options = [
    { value: 'yes', label: 'Yes', icon: Check, color: 'text-green-600 bg-green-100 border-green-500' },
    { value: 'no', label: 'No', icon: X, color: 'text-red-600 bg-red-100 border-red-500' },
    ...(includeNA ? [{ value: 'na', label: 'N/A', icon: Minus, color: 'text-gray-600 bg-gray-100 border-gray-400' }] : []),
  ];
  
  return (
    <FieldWrapper
      label={field.label}
      fieldCode={field.field_code}
      required={field.validation_rules?.required}
      helpText={field.help_text}
      error={error}
    >
      <div className="flex gap-2">
        {options.map((option) => {
          const Icon = option.icon;
          const isSelected = stringValue === option.value;
          
          return (
            <Button
              key={option.value}
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled}
              onClick={() => onChange(isSelected ? null : option.value)}
              className={cn(
                'flex-1 h-12 transition-all',
                isSelected && option.color,
                isSelected && 'border-2 font-medium'
              )}
            >
              <Icon className={cn('h-5 w-5 mr-1', isSelected && 'stroke-[2.5]')} />
              {option.label}
            </Button>
          );
        })}
      </div>
    </FieldWrapper>
  );
}

export default YesNoField;
