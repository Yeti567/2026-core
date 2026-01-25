'use client';

import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { FieldWrapper } from './field-wrapper';
import { FormField, FieldValue } from '../types';
import { cn } from '@/lib/utils';

interface CheckboxFieldProps {
  field: FormField;
  value: FieldValue;
  onChange: (value: boolean) => void;
  error?: string;
  disabled?: boolean;
}

export function CheckboxField({
  field,
  value,
  onChange,
  error,
  disabled,
}: CheckboxFieldProps) {
  const isChecked = Boolean(value);
  
  return (
    <div className="space-y-2">
      <div
        className={cn(
          'flex items-center space-x-3 rounded-lg border p-3 transition-colors',
          isChecked && 'border-primary bg-primary/5'
        )}
      >
        <Checkbox
          id={field.field_code}
          checked={isChecked}
          onCheckedChange={(checked) => onChange(Boolean(checked))}
          disabled={disabled}
          aria-invalid={!!error}
        />
        <div className="flex-1">
          <Label
            htmlFor={field.field_code}
            className={cn(
              'cursor-pointer font-medium',
              error && 'text-destructive'
            )}
          >
            {field.label}
            {field.validation_rules?.required && (
              <span className="text-destructive ml-1">*</span>
            )}
          </Label>
          {field.help_text && (
            <p className="text-sm text-muted-foreground mt-0.5">
              {field.help_text}
            </p>
          )}
        </div>
      </div>
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export default CheckboxField;
