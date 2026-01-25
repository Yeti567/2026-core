'use client';

import { Input } from '@/components/ui/input';
import { FieldWrapper } from './field-wrapper';
import { FormField, FieldValue } from '../types';

interface DateFieldProps {
  field: FormField;
  value: FieldValue;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
}

export function DateField({
  field,
  value,
  onChange,
  error,
  disabled,
}: DateFieldProps) {
  const isDateTime = field.field_type === 'datetime';
  
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
        type={isDateTime ? 'datetime-local' : 'date'}
        value={String(value ?? '')}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        min={field.validation_rules?.min_date}
        max={field.validation_rules?.max_date}
        className="w-full"
        aria-invalid={!!error}
      />
    </FieldWrapper>
  );
}

export default DateField;
