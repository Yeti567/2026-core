'use client';

import { Input } from '@/components/ui/input';
import { FieldWrapper } from './field-wrapper';
import { FormField, FieldValue } from '../types';
import { getInputType } from '../utils';

interface TextFieldProps {
  field: FormField;
  value: FieldValue;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
}

export function TextField({
  field,
  value,
  onChange,
  error,
  disabled,
}: TextFieldProps) {
  const inputType = getInputType(field.field_type);
  
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
        type={inputType}
        value={String(value ?? '')}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder ?? undefined}
        disabled={disabled}
        maxLength={field.validation_rules?.max_length}
        min={field.validation_rules?.min_value}
        max={field.validation_rules?.max_value}
        className="w-full"
        aria-invalid={!!error}
        aria-describedby={error ? `${field.field_code}-error` : undefined}
      />
    </FieldWrapper>
  );
}

export default TextField;
