'use client';

interface RatingFieldProps {
  id: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
  onBlur?: () => void;
  description?: string;
  helpText?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  max?: number;
  icon?: 'star' | 'heart' | 'thumb';
}

export function RatingField({
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
  max = 5,
  icon = 'star',
}: RatingFieldProps) {
  const icons = {
    star: { filled: '⭐', empty: '☆' },
    heart: { filled: '❤️', empty: '🤍' },
    thumb: { filled: '👍', empty: '👆' },
  };

  const selectedIcon = icons[icon];

  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
        {required && <span className="text-red-400 ml-1">*</span>}
        {value > 0 && (
          <span className="text-[var(--muted)] ml-2">({value}/{max})</span>
        )}
      </label>
      {description && (
        <p className="text-sm text-[var(--muted)]">{description}</p>
      )}
      {error && <p className="text-red-400 text-sm">{error}</p>}

      <div
        className="flex gap-1"
        role="radiogroup"
        aria-label={label}
        onBlur={onBlur}
      >
        {Array.from({ length: max }, (_, i) => i + 1).map((rating) => (
          <button
            key={rating}
            type="button"
            role="radio"
            aria-checked={value === rating}
            onClick={() => onChange(rating)}
            disabled={disabled}
            className={`text-3xl p-1 transition-transform hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed ${
              rating <= value ? 'scale-100' : 'opacity-40'
            }`}
          >
            {rating <= value ? selectedIcon.filled : selectedIcon.empty}
          </button>
        ))}

        {value > 0 && (
          <button
            type="button"
            onClick={() => onChange(0)}
            disabled={disabled}
            className="ml-2 text-sm text-[var(--muted)] hover:text-[var(--foreground)] disabled:opacity-50"
          >
            Clear
          </button>
        )}
      </div>

      {helpText && !error && (
        <p className="text-xs text-[var(--muted)]">{helpText}</p>
      )}
    </div>
  );
}
