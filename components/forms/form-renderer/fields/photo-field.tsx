'use client';

import { useRef, useCallback } from 'react';

interface PhotoFieldProps {
  id: string;
  label: string;
  value: string[];
  onChange: (value: string[]) => void;
  onBlur?: () => void;
  description?: string;
  helpText?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  multiple?: boolean;
  maxCount?: number;
}

export function PhotoField({
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
  multiple = true,
  maxCount = 10,
}: PhotoFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;

      const remainingSlots = maxCount - value.length;
      const filesToProcess = Array.from(files).slice(0, remainingSlots);

      filesToProcess.forEach((file) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          const base64 = event.target?.result as string;
          onChange([...value, base64]);
        };
        reader.readAsDataURL(file);
      });

      // Reset input
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    },
    [value, onChange, maxCount]
  );

  const handleRemove = useCallback(
    (index: number) => {
      const newPhotos = value.filter((_, i) => i !== index);
      onChange(newPhotos);
    },
    [value, onChange]
  );

  const canAddMore = value.length < maxCount;

  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
        {required && <span className="text-red-400 ml-1">*</span>}
        <span className="text-[var(--muted)] ml-2 font-normal">
          ({value.length}/{maxCount})
        </span>
      </label>
      {description && (
        <p className="text-sm text-[var(--muted)]">{description}</p>
      )}
      {error && <p className="text-red-400 text-sm">{error}</p>}

      <input
        ref={inputRef}
        id={id}
        name={id}
        type="file"
        accept="image/*"
        capture="environment"
        multiple={multiple && canAddMore}
        onChange={handleFileChange}
        onBlur={onBlur}
        disabled={disabled || !canAddMore}
        className="hidden"
      />

      <div className="grid grid-cols-3 gap-3">
        {/* Existing photos */}
        {value.map((photo, index) => (
          <div
            key={index}
            className="aspect-square rounded-xl bg-[var(--card)] border border-[var(--border)] overflow-hidden relative"
          >
            <img
              src={photo}
              alt={`Photo ${index + 1}`}
              className="w-full h-full object-cover"
            />
            <button
              type="button"
              onClick={() => handleRemove(index)}
              disabled={disabled}
              className="absolute top-1 right-1 w-6 h-6 bg-red-500 rounded-full text-white text-sm flex items-center justify-center hover:bg-red-600 transition-colors disabled:opacity-50"
              aria-label={`Remove photo ${index + 1}`}
            >
              ×
            </button>
          </div>
        ))}

        {/* Add photo button */}
        {canAddMore && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={disabled}
            className="aspect-square rounded-xl border-2 border-dashed border-[var(--border)] bg-[var(--card)] flex flex-col items-center justify-center text-[var(--muted)] hover:border-[var(--primary)]/50 hover:text-[var(--primary)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="text-2xl">📷</span>
            <span className="text-xs mt-1">Add Photo</span>
          </button>
        )}
      </div>

      {helpText && !error && (
        <p className="text-xs text-[var(--muted)]">{helpText}</p>
      )}
    </div>
  );
}
