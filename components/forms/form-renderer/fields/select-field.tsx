'use client';

interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  options: SelectOption[];
  placeholder?: string;
  description?: string;
  helpText?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
}

export function SelectField({
  id,
  label,
  value,
  onChange,
  onBlur,
  options,
  placeholder = 'Select...',
  description,
  helpText,
  required,
  disabled,
  error,
}: SelectFieldProps) {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
        {required && <span className="text-red-400 ml-1">*</span>}
      </label>
      {description && (
        <p className="text-sm text-[var(--muted)]">{description}</p>
      )}
      <select
        id={id}
        name={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        disabled={disabled}
        className={`w-full h-12 px-4 rounded-xl bg-[var(--card)] border text-base appearance-none transition-colors ${
          error
            ? 'border-red-500 focus:border-red-500'
            : 'border-[var(--border)] focus:border-[var(--primary)]'
        } focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 disabled:opacity-50 disabled:cursor-not-allowed`}
        style={{ WebkitAppearance: 'none' }}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </option>
        ))}
      </select>
      {error && <p className="text-red-400 text-sm">{error}</p>}
      {helpText && !error && (
        <p className="text-xs text-[var(--muted)]">{helpText}</p>
      )}
    </div>
  );
}
