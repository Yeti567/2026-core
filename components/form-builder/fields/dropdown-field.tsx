'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FieldWrapper } from './field-wrapper';
import { FormField, FieldValue } from '../types';
import { normalizeOptions } from '../utils';

interface DropdownFieldProps {
  field: FormField;
  value: FieldValue;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
}

export function DropdownField({
  field,
  value,
  onChange,
  error,
  disabled,
}: DropdownFieldProps) {
  const options = normalizeOptions(field.options);
  
  return (
    <FieldWrapper
      label={field.label}
      fieldCode={field.field_code}
      required={field.validation_rules?.required}
      helpText={field.help_text}
      error={error}
    >
      <Select
        value={String(value ?? '')}
        onValueChange={onChange}
        disabled={disabled}
      >
        <SelectTrigger
          id={field.field_code}
          aria-invalid={!!error}
          className="w-full"
        >
          <SelectValue placeholder={field.placeholder || 'Select an option'} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem
              key={option.value}
              value={option.value}
              disabled={option.disabled}
            >
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FieldWrapper>
  );
}

export default DropdownField;
