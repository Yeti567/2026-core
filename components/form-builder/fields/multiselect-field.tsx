'use client';

import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { FieldWrapper } from './field-wrapper';
import { FormField, FieldValue } from '../types';
import { normalizeOptions } from '../utils';
import { cn } from '@/lib/utils';

interface MultiselectFieldProps {
  field: FormField;
  value: FieldValue;
  onChange: (value: string[]) => void;
  error?: string;
  disabled?: boolean;
}

export function MultiselectField({
  field,
  value,
  onChange,
  error,
  disabled,
}: MultiselectFieldProps) {
  const options = normalizeOptions(field.options);
  const selectedValues = Array.isArray(value) ? value : [];
  
  const handleToggle = (optionValue: string, checked: boolean) => {
    if (checked) {
      onChange([...selectedValues, optionValue]);
    } else {
      onChange(selectedValues.filter(v => v !== optionValue));
    }
  };
  
  return (
    <FieldWrapper
      label={field.label}
      fieldCode={field.field_code}
      required={field.validation_rules?.required}
      helpText={field.help_text}
      error={error}
    >
      <div className="flex flex-col gap-2">
        {options.map((option) => {
          const isSelected = selectedValues.includes(option.value);
          return (
            <div
              key={option.value}
              className={cn(
                'flex items-center space-x-3 rounded-lg border p-3 transition-colors',
                isSelected && 'border-primary bg-primary/5',
                option.disabled && 'opacity-50 cursor-not-allowed'
              )}
            >
              <Checkbox
                id={`${field.field_code}-${option.value}`}
                checked={isSelected}
                onCheckedChange={(checked) => handleToggle(option.value, Boolean(checked))}
                disabled={disabled || option.disabled}
              />
              <Label
                htmlFor={`${field.field_code}-${option.value}`}
                className="flex-1 cursor-pointer font-normal"
              >
                {option.label}
              </Label>
            </div>
          );
        })}
      </div>
    </FieldWrapper>
  );
}

export default MultiselectField;
