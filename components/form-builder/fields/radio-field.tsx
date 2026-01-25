'use client';

import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { FieldWrapper } from './field-wrapper';
import { FormField, FieldValue } from '../types';
import { normalizeOptions } from '../utils';
import { cn } from '@/lib/utils';

interface RadioFieldProps {
  field: FormField;
  value: FieldValue;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
}

export function RadioField({
  field,
  value,
  onChange,
  error,
  disabled,
}: RadioFieldProps) {
  const options = normalizeOptions(field.options);
  
  return (
    <FieldWrapper
      label={field.label}
      fieldCode={field.field_code}
      required={field.validation_rules?.required}
      helpText={field.help_text}
      error={error}
    >
      <RadioGroup
        value={String(value ?? '')}
        onValueChange={onChange}
        disabled={disabled}
        className="flex flex-col gap-2"
        aria-invalid={!!error}
      >
        {options.map((option) => (
          <div
            key={option.value}
            className={cn(
              'flex items-center space-x-3 rounded-lg border p-3 transition-colors',
              value === option.value && 'border-primary bg-primary/5',
              option.disabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            <RadioGroupItem
              value={option.value}
              id={`${field.field_code}-${option.value}`}
              disabled={option.disabled}
            />
            <Label
              htmlFor={`${field.field_code}-${option.value}`}
              className="flex-1 cursor-pointer font-normal"
            >
              {option.label}
            </Label>
          </div>
        ))}
      </RadioGroup>
    </FieldWrapper>
  );
}

export default RadioField;
