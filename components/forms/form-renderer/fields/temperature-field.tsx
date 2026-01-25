'use client';

interface TemperatureFieldProps {
  id: string;
  label: string;
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  onBlur?: () => void;
  description?: string;
  helpText?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  unit?: 'celsius' | 'fahrenheit';
  min?: number;
  max?: number;
}

export function TemperatureField({
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
  unit = 'celsius',
  min = -50,
  max = 50,
}: TemperatureFieldProps) {
  const unitSymbol = unit === 'celsius' ? '°C' : '°F';

  // Preset temperature buttons
  const presets = unit === 'celsius'
    ? [-20, -10, 0, 10, 20, 30, 40]
    : [0, 20, 32, 50, 70, 85, 100];

  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
        {required && <span className="text-red-400 ml-1">*</span>}
      </label>
      {description && (
        <p className="text-sm text-[var(--muted)]">{description}</p>
      )}

      <div className="flex gap-2">
        <div className="relative flex-1">
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
            disabled={disabled}
            min={min}
            max={max}
            className={`w-full h-12 px-4 pr-12 rounded-xl bg-[var(--card)] border text-base transition-colors ${
              error
                ? 'border-red-500 focus:border-red-500'
                : 'border-[var(--border)] focus:border-[var(--primary)]'
            } focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 disabled:opacity-50 disabled:cursor-not-allowed`}
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--muted)] font-medium">
            {unitSymbol}
          </span>
        </div>
      </div>

      {/* Quick preset buttons */}
      <div className="flex flex-wrap gap-2">
        {presets.map((temp) => (
          <button
            key={temp}
            type="button"
            onClick={() => onChange(temp)}
            disabled={disabled}
            className={`px-3 py-1 text-sm rounded-lg border transition-colors ${
              value === temp
                ? 'border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]'
                : 'border-[var(--border)] bg-[var(--card)] hover:border-[var(--primary)]/50'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {temp}{unitSymbol}
          </button>
        ))}
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}
      {helpText && !error && (
        <p className="text-xs text-[var(--muted)]">{helpText}</p>
      )}
    </div>
  );
}
