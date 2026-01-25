'use client';

interface TextareaFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  description?: string;
  helpText?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  rows?: number;
  maxLength?: number;
}

export function TextareaField({
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
  rows = 4,
  maxLength,
}: TextareaFieldProps) {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
        {required && <span className="text-red-400 ml-1">*</span>}
      </label>
      {description && (
        <p className="text-sm text-[var(--muted)]">{description}</p>
      )}
      <textarea
        id={id}
        name={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        disabled={disabled}
        rows={rows}
        maxLength={maxLength}
        className={`w-full p-4 rounded-xl bg-[var(--card)] border text-base resize-none transition-colors ${
          error
            ? 'border-red-500 focus:border-red-500'
            : 'border-[var(--border)] focus:border-[var(--primary)]'
        } focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 disabled:opacity-50 disabled:cursor-not-allowed`}
      />
      {error && <p className="text-red-400 text-sm">{error}</p>}
      {helpText && !error && (
        <p className="text-xs text-[var(--muted)]">{helpText}</p>
      )}
      {maxLength && (
        <p className="text-xs text-[var(--muted)] text-right">
          {value.length}/{maxLength}
        </p>
      )}
    </div>
  );
}
