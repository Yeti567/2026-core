'use client';

interface WeatherFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  description?: string;
  helpText?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
}

const WEATHER_OPTIONS = [
  { value: 'clear', label: 'Clear', icon: '☀️' },
  { value: 'partly_cloudy', label: 'Partly Cloudy', icon: '⛅' },
  { value: 'cloudy', label: 'Cloudy', icon: '☁️' },
  { value: 'rain', label: 'Rain', icon: '🌧️' },
  { value: 'snow', label: 'Snow', icon: '❄️' },
  { value: 'fog', label: 'Fog', icon: '🌫️' },
  { value: 'storm', label: 'Storm', icon: '⛈️' },
  { value: 'windy', label: 'Windy', icon: '💨' },
];

export function WeatherField({
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
}: WeatherFieldProps) {
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

      <div className="grid grid-cols-4 gap-2">
        {WEATHER_OPTIONS.map((option) => (
          <label
            key={option.value}
            className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 cursor-pointer transition-all ${
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
              className="sr-only"
            />
            <span className="text-2xl">{option.icon}</span>
            <span className="text-xs mt-1 text-center">{option.label}</span>
          </label>
        ))}
      </div>

      {helpText && !error && (
        <p className="text-xs text-[var(--muted)]">{helpText}</p>
      )}
    </fieldset>
  );
}
