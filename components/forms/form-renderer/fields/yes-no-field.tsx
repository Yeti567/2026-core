'use client';

interface YesNoFieldProps {
  id: string;
  label: string;
  value: boolean | null | 'na';
  onChange: (value: boolean | null | 'na') => void;
  onBlur?: () => void;
  description?: string;
  helpText?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  yesLabel?: string;
  noLabel?: string;
  naLabel?: string;
  showNA?: boolean;
}

export function YesNoField({
  id,
  label,
  value,
  onChange,
  onBlur,
  description,
  helpText,
  required,
  disabled,
  error,
  yesLabel = 'Yes',
  noLabel = 'No',
  naLabel = 'N/A',
  showNA = false,
}: YesNoFieldProps) {
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

      <div className={`grid gap-3 ${showNA ? 'grid-cols-3' : 'grid-cols-2'}`}>
        {/* Yes Button */}
        <label
          className={`flex items-center justify-center h-14 rounded-xl border-2 cursor-pointer transition-all ${
            value === true
              ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600'
              : 'border-[var(--border)] bg-[var(--card)]'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-emerald-500/50'}`}
        >
          <input
            type="radio"
            name={id}
            value="yes"
            checked={value === true}
            onChange={() => onChange(true)}
            disabled={disabled}
            className="sr-only"
          />
          <span className="font-medium">✓ {yesLabel}</span>
        </label>

        {/* No Button */}
        <label
          className={`flex items-center justify-center h-14 rounded-xl border-2 cursor-pointer transition-all ${
            value === false
              ? 'border-red-500 bg-red-500/10 text-red-600'
              : 'border-[var(--border)] bg-[var(--card)]'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-red-500/50'}`}
        >
          <input
            type="radio"
            name={id}
            value="no"
            checked={value === false}
            onChange={() => onChange(false)}
            disabled={disabled}
            className="sr-only"
          />
          <span className="font-medium">✗ {noLabel}</span>
        </label>

        {/* N/A Button */}
        {showNA && (
          <label
            className={`flex items-center justify-center h-14 rounded-xl border-2 cursor-pointer transition-all ${
              value === 'na'
                ? 'border-gray-500 bg-gray-500/10 text-gray-600'
                : 'border-[var(--border)] bg-[var(--card)]'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-gray-500/50'}`}
          >
            <input
              type="radio"
              name={id}
              value="na"
              checked={value === 'na'}
              onChange={() => onChange('na')}
              disabled={disabled}
              className="sr-only"
            />
            <span className="font-medium">— {naLabel}</span>
          </label>
        )}
      </div>

      {helpText && !error && (
        <p className="text-xs text-[var(--muted)]">{helpText}</p>
      )}
    </fieldset>
  );
}
