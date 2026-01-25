'use client';

import { useState, useCallback, useEffect } from 'react';

interface GPSCoordinates {
  lat: number;
  lng: number;
  accuracy?: number;
}

interface GPSFieldProps {
  id: string;
  label: string;
  value: GPSCoordinates | null;
  onChange: (value: GPSCoordinates | null) => void;
  onBlur?: () => void;
  description?: string;
  helpText?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  autoCapture?: boolean;
}

export function GPSField({
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
  autoCapture = true,
}: GPSFieldProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const captureLocation = useCallback(async () => {
    if (disabled) return;
    
    if (!navigator.geolocation) {
      setLocationError('Geolocation not supported');
      return;
    }

    setIsLoading(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        onChange({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
        setIsLoading(false);
        onBlur?.();
      },
      (err) => {
        console.error('[GPSField] Error:', err);
        setLocationError(
          err.code === 1
            ? 'Location permission denied'
            : err.code === 2
            ? 'Location unavailable'
            : 'Location timeout'
        );
        setIsLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  }, [disabled, onChange, onBlur]);

  // Auto-capture on mount if enabled
  useEffect(() => {
    if (autoCapture && !value && !disabled) {
      captureLocation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoCapture, disabled]);

  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
        {required && <span className="text-red-400 ml-1">*</span>}
      </label>
      {description && (
        <p className="text-sm text-[var(--muted)]">{description}</p>
      )}

      <div
        className={`h-14 px-4 rounded-xl bg-[var(--card)] border flex items-center justify-between ${
          error
            ? 'border-red-500'
            : 'border-[var(--border)]'
        }`}
      >
        <div className="flex items-center gap-2 text-sm">
          {isLoading ? (
            <>
              <span className="animate-spin">⟳</span>
              <span className="text-[var(--muted)]">Acquiring location...</span>
            </>
          ) : value ? (
            <>
              <span>📍</span>
              <span>
                {value.lat.toFixed(6)}, {value.lng.toFixed(6)}
              </span>
              {value.accuracy && (
                <span className="text-[var(--muted)]">
                  (±{Math.round(value.accuracy)}m)
                </span>
              )}
            </>
          ) : locationError ? (
            <>
              <span>⚠️</span>
              <span className="text-red-400">{locationError}</span>
            </>
          ) : (
            <>
              <span>📍</span>
              <span className="text-[var(--muted)]">No location captured</span>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={captureLocation}
          disabled={disabled || isLoading}
          className="text-[var(--primary)] font-medium text-sm hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {value ? 'Refresh' : 'Capture'}
        </button>
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}
      {helpText && !error && (
        <p className="text-xs text-[var(--muted)]">{helpText}</p>
      )}
    </div>
  );
}
