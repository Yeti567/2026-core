'use client';

import { useCallback } from 'react';

interface ChecklistItem {
  id: string;
  label: string;
  helpText?: string;
}

interface ChecklistItemResult {
  id: string;
  result: 'pass' | 'fail' | 'na' | '';
  notes?: string;
}

interface ChecklistFieldProps {
  id: string;
  label: string;
  value: ChecklistItemResult[];
  onChange: (value: ChecklistItemResult[]) => void;
  onBlur?: () => void;
  items: ChecklistItem[];
  description?: string;
  helpText?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  allowNA?: boolean;
  allowNotes?: boolean;
}

export function ChecklistField({
  id,
  label,
  value,
  onChange,
  onBlur,
  items,
  description,
  helpText,
  required,
  disabled,
  error,
  allowNA = true,
  allowNotes = true,
}: ChecklistFieldProps) {
  const getItemResult = useCallback(
    (itemId: string): ChecklistItemResult => {
      const existing = value.find((v) => v.id === itemId);
      return existing || { id: itemId, result: '', notes: '' };
    },
    [value]
  );

  const updateItem = useCallback(
    (itemId: string, updates: Partial<ChecklistItemResult>) => {
      const existing = value.find((v) => v.id === itemId);
      if (existing) {
        onChange(
          value.map((v) => (v.id === itemId ? { ...v, ...updates } : v))
        );
      } else {
        onChange([...value, { id: itemId, result: '', ...updates }]);
      }
    },
    [value, onChange]
  );

  const setResult = useCallback(
    (itemId: string, result: 'pass' | 'fail' | 'na') => {
      updateItem(itemId, { result });
    },
    [updateItem]
  );

  const setNotes = useCallback(
    (itemId: string, notes: string) => {
      updateItem(itemId, { notes });
    },
    [updateItem]
  );

  return (
    <fieldset className="space-y-4" onBlur={onBlur}>
      <legend className="block text-sm font-medium">
        {label}
        {required && <span className="text-red-400 ml-1">*</span>}
      </legend>
      {description && (
        <p className="text-sm text-[var(--muted)]">{description}</p>
      )}
      {error && <p className="text-red-400 text-sm">{error}</p>}

      <div className="space-y-3">
        {items.map((item) => {
          const itemResult = getItemResult(item.id);
          return (
            <div
              key={item.id}
              className={`p-4 rounded-xl border transition-colors ${
                itemResult.result === 'pass'
                  ? 'border-emerald-500/50 bg-emerald-500/5'
                  : itemResult.result === 'fail'
                  ? 'border-red-500/50 bg-red-500/5'
                  : itemResult.result === 'na'
                  ? 'border-gray-500/50 bg-gray-500/5'
                  : 'border-[var(--border)] bg-[var(--card)]'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <p className="font-medium">{item.label}</p>
                  {item.helpText && (
                    <p className="text-sm text-[var(--muted)] mt-1">
                      {item.helpText}
                    </p>
                  )}
                </div>
              </div>

              {/* Result buttons */}
              <div className="flex gap-2 mt-3">
                <button
                  type="button"
                  onClick={() => setResult(item.id, 'pass')}
                  disabled={disabled}
                  className={`flex-1 h-10 rounded-lg font-medium text-sm transition-colors ${
                    itemResult.result === 'pass'
                      ? 'bg-emerald-500 text-white'
                      : 'bg-[var(--background)] border border-[var(--border)] text-emerald-600 hover:bg-emerald-500/10'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  ✓ Pass
                </button>
                <button
                  type="button"
                  onClick={() => setResult(item.id, 'fail')}
                  disabled={disabled}
                  className={`flex-1 h-10 rounded-lg font-medium text-sm transition-colors ${
                    itemResult.result === 'fail'
                      ? 'bg-red-500 text-white'
                      : 'bg-[var(--background)] border border-[var(--border)] text-red-600 hover:bg-red-500/10'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  ✗ Fail
                </button>
                {allowNA && (
                  <button
                    type="button"
                    onClick={() => setResult(item.id, 'na')}
                    disabled={disabled}
                    className={`flex-1 h-10 rounded-lg font-medium text-sm transition-colors ${
                      itemResult.result === 'na'
                        ? 'bg-gray-500 text-white'
                        : 'bg-[var(--background)] border border-[var(--border)] text-gray-600 hover:bg-gray-500/10'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    — N/A
                  </button>
                )}
              </div>

              {/* Notes field (shown when fail or always if allowNotes) */}
              {allowNotes && itemResult.result === 'fail' && (
                <div className="mt-3">
                  <input
                    type="text"
                    value={itemResult.notes || ''}
                    onChange={(e) => setNotes(item.id, e.target.value)}
                    placeholder="Add notes for this failed item..."
                    disabled={disabled}
                    className="w-full h-10 px-3 rounded-lg bg-[var(--background)] border border-[var(--border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 disabled:opacity-50"
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {helpText && !error && (
        <p className="text-xs text-[var(--muted)]">{helpText}</p>
      )}
    </fieldset>
  );
}
