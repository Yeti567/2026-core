'use client';

import { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { FieldWrapper } from './field-wrapper';
import { FormField, FieldValue } from '../types';
import { MapPin, RefreshCw, Check, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GPSValue {
  lat: number;
  lng: number;
  accuracy?: number;
  timestamp?: string;
}

interface GPSFieldProps {
  field: FormField;
  value: FieldValue;
  onChange: (value: GPSValue | null) => void;
  error?: string;
  disabled?: boolean;
  autoCapture?: boolean;
}

export function GPSField({
  field,
  value,
  onChange,
  error,
  disabled,
  autoCapture = true,
}: GPSFieldProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  
  const gpsValue = value as GPSValue | null;
  
  const captureLocation = useCallback(async () => {
    if (!navigator.geolocation) {
      setGpsError('Geolocation is not supported by your browser');
      return;
    }
    
    setIsLoading(true);
    setGpsError(null);
    
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0,
        });
      });
      
      onChange({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: position.coords.accuracy,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      const geoError = err as GeolocationPositionError;
      switch (geoError.code) {
        case geoError.PERMISSION_DENIED:
          setGpsError('Location permission denied');
          break;
        case geoError.POSITION_UNAVAILABLE:
          setGpsError('Location information unavailable');
          break;
        case geoError.TIMEOUT:
          setGpsError('Location request timed out');
          break;
        default:
          setGpsError('Failed to get location');
      }
    } finally {
      setIsLoading(false);
    }
  }, [onChange]);
  
  // Auto-capture on mount if enabled
  useEffect(() => {
    if (autoCapture && !gpsValue && !disabled) {
      captureLocation();
    }
  }, [autoCapture, gpsValue, disabled, captureLocation]);
  
  return (
    <FieldWrapper
      label={field.label}
      fieldCode={field.field_code}
      required={field.validation_rules?.required}
      helpText={field.help_text}
      error={error}
    >
      <div className={cn(
        'rounded-lg border p-4 space-y-3',
        gpsValue && 'border-green-500/50 bg-green-50/50 dark:bg-green-950/20',
        gpsError && 'border-destructive/50 bg-destructive/5'
      )}>
        {/* GPS Status */}
        {gpsValue ? (
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-green-500/10 p-2">
              <Check className="h-5 w-5 text-green-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-green-700 dark:text-green-400">
                Location captured
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {gpsValue.lat.toFixed(6)}, {gpsValue.lng.toFixed(6)}
              </p>
              {gpsValue.accuracy && (
                <p className="text-xs text-muted-foreground">
                  Accuracy: ±{gpsValue.accuracy.toFixed(0)}m
                </p>
              )}
              {gpsValue.timestamp && (
                <p className="text-xs text-muted-foreground">
                  {new Date(gpsValue.timestamp).toLocaleTimeString()}
                </p>
              )}
            </div>
          </div>
        ) : isLoading ? (
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-primary/10 p-2">
              <RefreshCw className="h-5 w-5 text-primary animate-spin" />
            </div>
            <p className="text-sm text-muted-foreground">
              Getting your location...
            </p>
          </div>
        ) : gpsError ? (
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-destructive/10 p-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="text-sm font-medium text-destructive">{gpsError}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Please enable location services and try again
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-muted p-2">
              <MapPin className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">
              No location captured
            </p>
          </div>
        )}
        
        {/* Action buttons */}
        {!disabled && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={captureLocation}
            disabled={isLoading}
          >
            {isLoading ? (
              <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <MapPin className="h-4 w-4 mr-1" />
            )}
            {gpsValue ? 'Update Location' : 'Capture Location'}
          </Button>
        )}
      </div>
    </FieldWrapper>
  );
}

export default GPSField;
