'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

// =============================================================================
// TYPES
// =============================================================================

export interface CapturedPhoto {
  id: string;
  data: string; // base64
  mimeType: string;
  filename: string;
  capturedAt: string;
  size: number;
}

interface PhotoCaptureProps {
  /** Maximum number of photos allowed */
  maxPhotos?: number;
  /** Current photos */
  photos: CapturedPhoto[];
  /** Callback when photos change */
  onPhotosChange: (photos: CapturedPhoto[]) => void;
  /** Optional label */
  label?: string;
  /** Whether photos are required */
  required?: boolean;
  /** Error message to display */
  error?: string;
  /** Disable the component */
  disabled?: boolean;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function generatePhotoId(): string {
  return `photo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function getFileSizeFromBase64(base64: string): number {
  // Remove data URL prefix if present
  const base64Data = base64.split(',')[1] || base64;
  return Math.ceil((base64Data.length * 3) / 4);
}

async function compressImage(
  file: File,
  maxWidth: number = 1920,
  maxHeight: number = 1080,
  quality: number = 0.8
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;

        // Calculate new dimensions
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

// =============================================================================
// COMPONENT
// =============================================================================

export default function PhotoCapture({
  maxPhotos = 10,
  photos,
  onPhotosChange,
  label = 'Photos',
  required = false,
  error,
  disabled = false,
}: PhotoCaptureProps) {
  const [isCapturing, setIsCapturing] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [previewPhoto, setPreviewPhoto] = useState<CapturedPhoto | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Cleanup camera stream on unmount
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraStream]);

  // Start camera
  const startCamera = useCallback(async () => {
    try {
      setCameraError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Prefer rear camera
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      });
      setCameraStream(stream);
      setIsCapturing(true);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err) {
      console.error('Camera error:', err);
      setCameraError('Unable to access camera. Please use file upload instead.');
    }
  }, []);

  // Stop camera
  const stopCamera = useCallback(() => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setIsCapturing(false);
  }, [cameraStream]);

  // Capture photo from camera
  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.drawImage(video, 0, 0);
    const data = canvas.toDataURL('image/jpeg', 0.8);
    
    const newPhoto: CapturedPhoto = {
      id: generatePhotoId(),
      data,
      mimeType: 'image/jpeg',
      filename: `capture_${Date.now()}.jpg`,
      capturedAt: new Date().toISOString(),
      size: getFileSizeFromBase64(data),
    };
    
    onPhotosChange([...photos, newPhoto]);
    stopCamera();
  }, [photos, onPhotosChange, stopCamera]);

  // Handle file input
  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const remainingSlots = maxPhotos - photos.length;
    const filesToProcess = Array.from(files).slice(0, remainingSlots);
    
    const newPhotos: CapturedPhoto[] = [];
    
    for (const file of filesToProcess) {
      try {
        const data = await compressImage(file);
        newPhotos.push({
          id: generatePhotoId(),
          data,
          mimeType: 'image/jpeg',
          filename: file.name,
          capturedAt: new Date().toISOString(),
          size: getFileSizeFromBase64(data),
        });
      } catch (err) {
        console.error('Error processing file:', err);
      }
    }
    
    if (newPhotos.length > 0) {
      onPhotosChange([...photos, ...newPhotos]);
    }
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [photos, maxPhotos, onPhotosChange]);

  // Remove photo
  const removePhoto = useCallback((photoId: string) => {
    onPhotosChange(photos.filter(p => p.id !== photoId));
  }, [photos, onPhotosChange]);

  const canAddMore = photos.length < maxPhotos;

  return (
    <div className="space-y-3">
      {/* Label */}
      <label className="block text-sm font-medium">
        {label} {required && <span className="text-red-400">*</span>}
        <span className="text-[var(--muted)] ml-2">
          ({photos.length}/{maxPhotos})
        </span>
      </label>

      {/* Error message */}
      {error && (
        <p className="text-red-400 text-sm">{error}</p>
      )}

      {/* Camera capture modal */}
      {isCapturing && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col">
          <div className="flex-1 relative">
            <video
              ref={videoRef}
              className="absolute inset-0 w-full h-full object-cover"
              playsInline
              muted
            />
            <canvas ref={canvasRef} className="hidden" />
          </div>
          <div className="bg-black/90 p-4 flex justify-center gap-4">
            <button
              type="button"
              onClick={stopCamera}
              className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center text-white text-xl"
            >
              ✕
            </button>
            <button
              type="button"
              onClick={capturePhoto}
              className="w-20 h-20 rounded-full bg-white border-4 border-white/50 flex items-center justify-center"
            >
              <div className="w-16 h-16 rounded-full bg-white" />
            </button>
            <div className="w-14 h-14" /> {/* Spacer for balance */}
          </div>
        </div>
      )}

      {/* Photo preview modal */}
      {previewPhoto && (
        <div 
          className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-4"
          onClick={() => setPreviewPhoto(null)}
        >
          <img
            src={previewPhoto.data}
            alt="Preview"
            className="max-w-full max-h-[80vh] object-contain rounded-lg"
          />
          <button
            type="button"
            onClick={() => setPreviewPhoto(null)}
            className="mt-4 px-6 py-2 bg-white/20 text-white rounded-lg"
          >
            Close
          </button>
        </div>
      )}

      {/* Photo grid */}
      <div className="grid grid-cols-3 gap-3">
        {photos.map((photo) => (
          <div
            key={photo.id}
            className="aspect-square rounded-xl bg-[var(--card)] border border-[var(--border)] overflow-hidden relative group"
          >
            <img
              src={photo.data}
              alt={photo.filename}
              className="w-full h-full object-cover cursor-pointer"
              onClick={() => setPreviewPhoto(photo)}
            />
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                removePhoto(photo.id);
              }}
              disabled={disabled}
              className="absolute top-1 right-1 w-7 h-7 bg-red-500 rounded-full text-white text-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
            >
              ✕
            </button>
            <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-1 truncate">
              {(photo.size / 1024).toFixed(0)} KB
            </div>
          </div>
        ))}

        {/* Add photo button */}
        {canAddMore && !disabled && (
          <div className="aspect-square rounded-xl border-2 border-dashed border-[var(--border)] bg-[var(--card)] flex flex-col items-center justify-center gap-2">
            <button
              type="button"
              onClick={startCamera}
              className="w-full h-1/2 flex flex-col items-center justify-center text-[var(--muted)] hover:text-[var(--primary)] transition-colors"
            >
              <span className="text-2xl">📷</span>
              <span className="text-xs">Camera</span>
            </button>
            <div className="w-full h-px bg-[var(--border)]" />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full h-1/2 flex flex-col items-center justify-center text-[var(--muted)] hover:text-[var(--primary)] transition-colors"
            >
              <span className="text-2xl">📁</span>
              <span className="text-xs">Upload</span>
            </button>
          </div>
        )}
      </div>

      {/* Camera error */}
      {cameraError && (
        <p className="text-amber-400 text-sm">{cameraError}</p>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
}
