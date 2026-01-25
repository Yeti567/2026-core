'use client';

interface SelectOption {
  value: string;
  label: string;
  icon?: string;
}

interface RadioFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  options: SelectOption[];
  description?: string;
  helpText?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  layout?: 'vertical' | 'horizontal';
}

export function RadioField({
  id,
  label,
  value,
  onChange,
  onBlur,
  options,
  description,
  helpText,
  required,
  disabled,
  error,
  layout = 'vertical',
}: RadioFieldProps) {
  const layoutClasses = {
    vertical: 'space-y-2',
    horizontal: 'flex flex-wrap gap-3',
  };

  return (
    <fieldset className="space-y-3" onBlur={onBlur}>
      <legend className="block text-sm font-medium">
        {label}
        {required && <span className="text-red-400 ml-1">*</span>}
      </legend>
      {description && (
        <p className="text-sm text-[var(--muted)]">{description}</p>
      )}
      {error && <p className="text-red-400 text-sm">{error}</p>}
      <div className={layoutClasses[layout]}>
        {options.map((option) => (
          <label
            key={option.value}
            className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
              value === option.value
                ? 'border-[var(--primary)] bg-[var(--primary)]/10'
                : 'border-[var(--border)] bg-[var(--card)]'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-[var(--primary)]/50'}`}
          >
            <input
              type="radio"
              name={id}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              disabled={disabled}
              className="w-5 h-5 border-2 border-[var(--border)] accent-[var(--primary)] cursor-pointer"
            />
            {option.icon && <span className="text-lg">{option.icon}</span>}
            <span className="text-base font-medium">{option.label}</span>
          </label>
        ))}
      </div>
      {helpText && !error && (
        <p className="text-xs text-[var(--muted)]">{helpText}</p>
      )}
    </fieldset>
  );
}
