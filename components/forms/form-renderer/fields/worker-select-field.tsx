'use client';

interface WorkerSelectFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  workers: Array<{ id: string; first_name: string; last_name: string; position?: string }>;
  description?: string;
  helpText?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
}

export function WorkerSelectField({
  id,
  label,
  value,
  onChange,
  onBlur,
  workers,
  description,
  helpText,
  required,
  disabled,
  error,
}: WorkerSelectFieldProps) {
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
        <option value="">Select a worker...</option>
        {workers.map((worker) => (
          <option key={worker.id} value={worker.id}>
            👤 {worker.first_name} {worker.last_name}
            {worker.position && ` (${worker.position})`}
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
