'use client';

import { Textarea } from '@/components/ui/textarea';
import { FieldWrapper } from './field-wrapper';
import { FormField, FieldValue } from '../types';

interface TextareaFieldProps {
  field: FormField;
  value: FieldValue;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
}

export function TextareaField({
  field,
  value,
  onChange,
  error,
  disabled,
}: TextareaFieldProps) {
  const stringValue = String(value ?? '');
  const maxLength = field.validation_rules?.max_length;
  
  return (
    <FieldWrapper
      label={field.label}
      fieldCode={field.field_code}
      required={field.validation_rules?.required}
      helpText={field.help_text}
      error={error}
    >
      <div className="relative">
        <Textarea
          id={field.field_code}
          name={field.field_code}
          value={stringValue}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder ?? undefined}
          disabled={disabled}
          maxLength={maxLength}
          rows={4}
          className="w-full resize-none"
          aria-invalid={!!error}
        />
        {maxLength && (
          <div className="absolute bottom-2 right-2 text-xs text-muted-foreground">
            {stringValue.length}/{maxLength}
          </div>
        )}
      </div>
    </FieldWrapper>
  );
}

export default TextareaField;
