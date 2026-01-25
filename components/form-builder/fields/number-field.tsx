'use client';

import { Input } from '@/components/ui/input';
import { FieldWrapper } from './field-wrapper';
import { FormField, FieldValue } from '../types';

interface NumberFieldProps {
  field: FormField;
  value: FieldValue;
  onChange: (value: number | string) => void;
  error?: string;
  disabled?: boolean;
}

export function NumberField({
  field,
  value,
  onChange,
  error,
  disabled,
}: NumberFieldProps) {
  const isCurrency = field.field_type === 'currency';
  
  return (
    <FieldWrapper
      label={field.label}
      fieldCode={field.field_code}
      required={field.validation_rules?.required}
      helpText={field.help_text}
      error={error}
    >
      <div className="relative">
        {isCurrency && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            $
          </span>
        )}
        <Input
          id={field.field_code}
          name={field.field_code}
          type="number"
          value={value === '' || value === null || value === undefined ? '' : String(value)}
          onChange={(e) => {
            const val = e.target.value;
            onChange(val === '' ? '' : Number(val));
          }}
          placeholder={field.placeholder ?? undefined}
          disabled={disabled}
          min={field.validation_rules?.min_value}
          max={field.validation_rules?.max_value}
          step={isCurrency ? '0.01' : '1'}
          className={isCurrency ? 'pl-7' : ''}
          aria-invalid={!!error}
        />
      </div>
    </FieldWrapper>
  );
}

export default NumberField;
