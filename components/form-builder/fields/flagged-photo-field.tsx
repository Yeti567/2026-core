'use client';

/**
 * Flagged Photo Field
 * 
 * Photo capture with flag option to notify supervisor for follow-up.
 * Combines camera capture with a flag toggle that sends the photo to supervisor.
 */

import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { FieldWrapper } from './field-wrapper';
import { FormField, FieldValue } from '../types';
import { Camera, X, Upload, Flag, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FlaggedPhotoValue {
  photo: string;
  flagged: boolean;
  notes: string;
}

interface FlaggedPhotoFieldProps {
  field: FormField;
  value: FieldValue;
  onChange: (value: FlaggedPhotoValue | null) => void;
  error?: string;
  disabled?: boolean;
}

export function FlaggedPhotoField({
  field,
  value,
  onChange,
  error,
  disabled,
}: FlaggedPhotoFieldProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  const currentValue = value as FlaggedPhotoValue | null;
  
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const file = files[0];
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      onChange({
        photo: dataUrl,
        flagged: currentValue?.flagged || false,
        notes: currentValue?.notes || '',
      });
    };
    reader.readAsDataURL(file);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [currentValue, onChange]);
  
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setIsCapturing(true);
    } catch (err) {
      console.error('Camera access denied:', err);
    }
  }, []);
  
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCapturing(false);
  }, []);
  
  const capturePhoto = useCallback(() => {
    if (!videoRef.current) return;
    
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
      
      onChange({
        photo: dataUrl,
        flagged: currentValue?.flagged || false,
        notes: currentValue?.notes || '',
      });
    }
    
    stopCamera();
  }, [currentValue, onChange, stopCamera]);
  
  const toggleFlag = useCallback(() => {
    if (!currentValue?.photo) return;
    onChange({
      ...currentValue,
      flagged: !currentValue.flagged,
    });
  }, [currentValue, onChange]);
  
  const updateNotes = useCallback((notes: string) => {
    if (!currentValue?.photo) return;
    onChange({
      ...currentValue,
      notes,
    });
  }, [currentValue, onChange]);
  
  const removePhoto = useCallback(() => {
    onChange(null);
  }, [onChange]);
  
  return (
    <FieldWrapper
      label={field.label}
      fieldCode={field.field_code}
      required={field.validation_rules?.required}
      helpText={field.help_text || 'Take a photo and flag for supervisor follow-up if needed'}
      error={error}
    >
      <div className="space-y-3">
        {/* Camera capture view */}
        {isCapturing && (
          <div className="relative rounded-lg overflow-hidden bg-black">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full aspect-video"
            />
            <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-2">
              <Button
                type="button"
                size="sm"
                onClick={capturePhoto}
              >
                <Camera className="h-4 w-4 mr-1" />
                Capture
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={stopCamera}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
        
        {/* Photo preview with flag option */}
        {currentValue?.photo && (
          <div className="space-y-3">
            <div className="relative rounded-lg overflow-hidden bg-muted">
              <img
                src={currentValue.photo}
                alt="Captured photo"
                className="w-full aspect-video object-cover"
              />
              {currentValue.flagged && (
                <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-1 bg-red-500 text-white rounded-md text-xs font-medium">
                  <Flag className="h-3 w-3" />
                  Flagged for Follow-up
                </div>
              )}
              {!disabled && (
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 h-7 w-7"
                  onClick={removePhoto}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            
            {/* Flag toggle button */}
            {!disabled && (
              <Button
                type="button"
                variant={currentValue.flagged ? 'destructive' : 'outline'}
                className="w-full"
                onClick={toggleFlag}
              >
                {currentValue.flagged ? (
                  <>
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Flagged - Supervisor Will Be Notified
                  </>
                ) : (
                  <>
                    <Flag className="h-4 w-4 mr-2" />
                    Flag for Supervisor Follow-up
                  </>
                )}
              </Button>
            )}
            
            {/* Notes field for flagged items */}
            {currentValue.flagged && (
              <div className="space-y-1">
                <label className="text-sm font-medium text-muted-foreground">
                  Describe what needs follow-up:
                </label>
                <Textarea
                  value={currentValue.notes}
                  onChange={(e) => updateNotes(e.target.value)}
                  placeholder="Explain the issue for the supervisor..."
                  rows={3}
                  disabled={disabled}
                />
              </div>
            )}
          </div>
        )}
        
        {/* Upload buttons */}
        {!isCapturing && !currentValue?.photo && !disabled && (
          <div className="flex flex-col sm:flex-row gap-2 p-6 border-2 border-dashed rounded-lg items-center justify-center bg-muted/30">
            <Camera className="h-8 w-8 text-muted-foreground mb-2" />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-4 w-4 mr-1" />
              Upload Photo
            </Button>
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={startCamera}
            >
              <Camera className="h-4 w-4 mr-1" />
              Take Photo
            </Button>
          </div>
        )}
      </div>
    </FieldWrapper>
  );
}

export default FlaggedPhotoField;
