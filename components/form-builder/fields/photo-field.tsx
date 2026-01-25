'use client';

import { useState, useRef, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { FieldWrapper } from './field-wrapper';
import { FormField, FieldValue } from '../types';
import { Camera, X, Upload, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PhotoFieldProps {
  field: FormField;
  value: FieldValue;
  onChange: (value: string | string[]) => void;
  error?: string;
  disabled?: boolean;
  multiple?: boolean;
}

export function PhotoField({
  field,
  value,
  onChange,
  error,
  disabled,
  multiple = false,
}: PhotoFieldProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  const photos = useMemo(() => 
    Array.isArray(value) ? value : value ? [value as string] : [],
    [value]
  );
  
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const processFile = (file: File) => {
      return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          resolve(e.target?.result as string);
        };
        reader.readAsDataURL(file);
      });
    };
    
    Promise.all(Array.from(files).map(processFile)).then((dataUrls) => {
      if (multiple) {
        onChange([...photos, ...dataUrls]);
      } else {
        onChange(dataUrls[0]);
      }
    });
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [photos, multiple, onChange]);
  
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
      
      if (multiple) {
        onChange([...photos, dataUrl]);
      } else {
        onChange(dataUrl);
      }
    }
    
    stopCamera();
  }, [photos, multiple, onChange, stopCamera]);
  
  const removePhoto = useCallback((index: number) => {
    if (multiple) {
      const newPhotos = [...photos];
      newPhotos.splice(index, 1);
      onChange(newPhotos);
    } else {
      onChange('');
    }
  }, [photos, multiple, onChange]);
  
  return (
    <FieldWrapper
      label={field.label}
      fieldCode={field.field_code}
      required={field.validation_rules?.required}
      helpText={field.help_text}
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
        
        {/* Photo preview grid */}
        {photos.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {photos.map((photo, index) => (
              <div key={index} className="relative aspect-square rounded-lg overflow-hidden bg-muted">
                <img
                  src={photo}
                  alt={`Photo ${index + 1}`}
                  className="w-full h-full object-cover"
                />
                {!disabled && (
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-1 right-1 h-6 w-6"
                    onClick={() => removePhoto(index)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
        
        {/* Upload buttons */}
        {!isCapturing && !disabled && (
          <div className={cn(
            'flex flex-col sm:flex-row gap-2',
            photos.length === 0 && 'p-6 border-2 border-dashed rounded-lg items-center justify-center bg-muted/30'
          )}>
            {photos.length === 0 && (
              <ImageIcon className="h-8 w-8 text-muted-foreground mb-2" />
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple={multiple}
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
              variant="outline"
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

export default PhotoField;
