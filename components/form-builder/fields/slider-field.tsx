'use client';

import { Slider } from '@/components/ui/slider';
import { FieldWrapper } from './field-wrapper';
import { FormField, FieldValue } from '../types';

interface SliderFieldProps {
  field: FormField;
  value: FieldValue;
  onChange: (value: number) => void;
  error?: string;
  disabled?: boolean;
}

export function SliderField({
  field,
  value,
  onChange,
  error,
  disabled,
}: SliderFieldProps) {
  const numValue = typeof value === 'number' ? value : 0;
  const min = field.validation_rules?.min_value ?? 0;
  const max = field.validation_rules?.max_value ?? 100;
  
  return (
    <FieldWrapper
      label={field.label}
      fieldCode={field.field_code}
      required={field.validation_rules?.required}
      helpText={field.help_text}
      error={error}
    >
      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{min}</span>
          <span className="font-medium text-foreground text-lg">{numValue}</span>
          <span>{max}</span>
        </div>
        <Slider
          value={[numValue]}
          onValueChange={([val]) => onChange(val)}
          min={min}
          max={max}
          step={1}
          disabled={disabled}
          className="w-full"
        />
      </div>
    </FieldWrapper>
  );
}

export default SliderField;
