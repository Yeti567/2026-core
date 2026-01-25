'use client';

interface TextFieldProps {
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
  type?: 'text' | 'email' | 'tel' | 'url';
  maxLength?: number;
  minLength?: number;
}

export function TextField({
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
  type = 'text',
  maxLength,
}: TextFieldProps) {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
        {required && <span className="text-red-400 ml-1">*</span>}
      </label>
      {description && (
        <p className="text-sm text-[var(--muted)]">{description}</p>
      )}
      <input
        id={id}
        name={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        disabled={disabled}
        maxLength={maxLength}
        className={`w-full h-12 px-4 rounded-xl bg-[var(--card)] border text-base transition-colors ${
          error
            ? 'border-red-500 focus:border-red-500'
            : 'border-[var(--border)] focus:border-[var(--primary)]'
        } focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 disabled:opacity-50 disabled:cursor-not-allowed`}
      />
      {error && <p className="text-red-400 text-sm">{error}</p>}
      {helpText && !error && (
        <p className="text-xs text-[var(--muted)]">{helpText}</p>
      )}
    </div>
  );
}
