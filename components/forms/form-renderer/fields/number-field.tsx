'use client';

interface NumberFieldProps {
  id: string;
  label: string;
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  onBlur?: () => void;
  placeholder?: string;
  description?: string;
  helpText?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
}

export function NumberField({
  id,
  label,
  value,
  onChange,
  onBlur,
  placeholder,
  description,
  helpText,
  required,
  disabled,
  error,
  min,
  max,
  step = 1,
  unit,
}: NumberFieldProps) {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
        {unit && <span className="text-[var(--muted)] ml-1">({unit})</span>}
        {required && <span className="text-red-400 ml-1">*</span>}
      </label>
      {description && (
        <p className="text-sm text-[var(--muted)]">{description}</p>
      )}
      <div className="relative">
        <input
          id={id}
          name={id}
          type="number"
          value={value ?? ''}
          onChange={(e) => {
            const val = e.target.value;
            onChange(val === '' ? undefined : parseFloat(val));
          }}
          onBlur={onBlur}
          placeholder={placeholder}
          disabled={disabled}
          min={min}
          max={max}
          step={step}
          className={`w-full h-12 px-4 rounded-xl bg-[var(--card)] border text-base transition-colors ${
            error
              ? 'border-red-500 focus:border-red-500'
              : 'border-[var(--border)] focus:border-[var(--primary)]'
          } focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 disabled:opacity-50 disabled:cursor-not-allowed ${
            unit ? 'pr-12' : ''
          }`}
        />
        {unit && (
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--muted)]">
            {unit}
          </span>
        )}
      </div>
      {error && <p className="text-red-400 text-sm">{error}</p>}
      {helpText && !error && (
        <p className="text-xs text-[var(--muted)]">{helpText}</p>
      )}
    </div>
  );
}
