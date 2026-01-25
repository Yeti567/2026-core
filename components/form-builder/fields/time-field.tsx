'use client';

import { Input } from '@/components/ui/input';
import { FieldWrapper } from './field-wrapper';
import { FormField, FieldValue } from '../types';

interface TimeFieldProps {
  field: FormField;
  value: FieldValue;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
}

export function TimeField({
  field,
  value,
  onChange,
  error,
  disabled,
}: TimeFieldProps) {
  return (
    <FieldWrapper
      label={field.label}
      fieldCode={field.field_code}
      required={field.validation_rules?.required}
      helpText={field.help_text}
      error={error}
    >
      <Input
        id={field.field_code}
        name={field.field_code}
        type="time"
        value={String(value ?? '')}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="w-full"
        aria-invalid={!!error}
      />
    </FieldWrapper>
  );
}

export default TimeField;
