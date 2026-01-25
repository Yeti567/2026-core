'use client';

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';

// =============================================================================
// TYPES
// =============================================================================

interface Worker {
  id: string;
  first_name: string;
  last_name: string;
}

interface CertificationType {
  id: string;
  certification_code: string;
  certification_name: string;
  default_expiry_months: number | null;
}

type CaptureStep = 'setup' | 'camera' | 'preview' | 'details' | 'uploading' | 'success';

// =============================================================================
// SUPABASE CLIENT
// =============================================================================

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// =============================================================================
// LOADING FALLBACK
// =============================================================================

function CaptureLoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-2 text-gray-600">Loading...</p>
      </div>
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT (wrapped in Suspense)
// =============================================================================

export default function MobileCertificationCapturePage() {
  return (
    <Suspense fallback={<CaptureLoadingFallback />}>
      <MobileCertificationCaptureContent />
    </Suspense>
  );
}

function MobileCertificationCaptureContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedWorkerId = searchParams.get('worker_id');
  const preselectedTypeId = searchParams.get('type_id');

  const [step, setStep] = useState<CaptureStep>('setup');
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [certTypes, setCertTypes] = useState<CertificationType[]>([]);

  // Form state
  const [selectedWorkerId, setSelectedWorkerId] = useState(preselectedWorkerId || '');
  const [selectedTypeId, setSelectedTypeId] = useState(preselectedTypeId || '');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [rotation, setRotation] = useState(0);

  // Details form
  const [certNumber, setCertNumber] = useState('');
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [expiryDate, setExpiryDate] = useState('');

  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Camera refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // =============================================================================
  // FETCH DATA
  // =============================================================================

  useEffect(() => {
    const fetchData = async () => {
      const supabase = getSupabase();

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('company_id')
        .single();

      if (profile) {
        // Get workers
        const { data: workersData } = await supabase
          .from('user_profiles')
          .select('id, first_name, last_name')
          .eq('company_id', profile.company_id)
          .order('last_name');

        setWorkers(workersData || []);
      }

      // Get cert types
      const { data: typesData } = await supabase
        .from('certification_types')
        .select('id, certification_code, certification_name, default_expiry_months')
        .eq('is_active', true)
        .order('sort_order');

      setCertTypes(typesData || []);
    };

    fetchData();
  }, []);

  // Auto-calculate expiry date when type or issue date changes
  useEffect(() => {
    const type = certTypes.find(t => t.id === selectedTypeId);
    if (type?.default_expiry_months && issueDate) {
      const issue = new Date(issueDate);
      issue.setMonth(issue.getMonth() + type.default_expiry_months);
      setExpiryDate(issue.toISOString().split('T')[0]);
    }
  }, [selectedTypeId, issueDate, certTypes]);

  // =============================================================================
  // CAMERA FUNCTIONS
  // =============================================================================

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setStep('camera');
      setError(null);
    } catch (err: any) {
      console.error('Camera error:', err);
      setError('Unable to access camera. Please allow camera permissions.');
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, []);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    // Set canvas size to video dimensions
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame to canvas
    ctx.drawImage(video, 0, 0);

    // Get image data
    const imageData = canvas.toDataURL('image/jpeg', 0.9);
    setCapturedImage(imageData);

    // Convert to blob
    canvas.toBlob(blob => {
      if (blob) setCapturedBlob(blob);
    }, 'image/jpeg', 0.9);

    stopCamera();
    setStep('preview');
  }, [stopCamera]);

  const retakePhoto = useCallback(() => {
    setCapturedImage(null);
    setCapturedBlob(null);
    setRotation(0);
    startCamera();
  }, [startCamera]);

  // Rotate image
  const rotateImage = useCallback(() => {
    if (!capturedImage || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      const newRotation = (rotation + 90) % 360;
      setRotation(newRotation);

      // Swap dimensions for 90/270 degree rotations
      if (newRotation % 180 === 90) {
        canvas.width = img.height;
        canvas.height = img.width;
      } else {
        canvas.width = img.width;
        canvas.height = img.height;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((newRotation * Math.PI) / 180);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);
      ctx.restore();

      const newImageData = canvas.toDataURL('image/jpeg', 0.9);
      setCapturedImage(newImageData);

      canvas.toBlob(blob => {
        if (blob) setCapturedBlob(blob);
      }, 'image/jpeg', 0.9);
    };
    img.src = capturedImage;
  }, [capturedImage, rotation]);

  // =============================================================================
  // UPLOAD
  // =============================================================================

  const handleUpload = async () => {
    if (!capturedBlob || !selectedWorkerId || !selectedTypeId) {
      setError('Please fill in all required fields');
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setStep('uploading');

    try {
      const formData = new FormData();
      formData.append('file', capturedBlob, 'certificate.jpg');
      formData.append('worker_id', selectedWorkerId);
      formData.append('certification_type_id', selectedTypeId);
      formData.append('certificate_number', certNumber);
      formData.append('issue_date', issueDate);
      formData.append('expiry_date', expiryDate);

      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 15, 90));
      }, 300);

      const res = await fetch('/api/certifications/upload', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Upload failed');
      }

      setStep('success');
    } catch (err: any) {
      console.error('Upload error:', err);
      setError(err.message || 'Upload failed');
      setStep('details');
    } finally {
      setUploading(false);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  // =============================================================================
  // RENDER
  // =============================================================================

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <div className="bg-slate-900 border-b border-slate-800 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <span className="text-2xl">📸</span>
          <h1 className="font-semibold">Capture Safety Ticket</h1>
        </div>
        <Link
          href="/admin/certifications"
          className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </Link>
      </div>

      <div className="p-4">
        {/* Error Display */}
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 text-sm">
            {error}
            <button
              onClick={() => setError(null)}
              className="ml-2 underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Step: Setup */}
        {step === 'setup' && (
          <div className="space-y-6">
            <div>
              <label className="label">Worker *</label>
              <select
                className="input"
                value={selectedWorkerId}
                onChange={e => setSelectedWorkerId(e.target.value)}
              >
                <option value="">Select worker...</option>
                {workers.map(w => (
                  <option key={w.id} value={w.id}>
                    {w.first_name} {w.last_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Certification Type *</label>
              <select
                className="input"
                value={selectedTypeId}
                onChange={e => setSelectedTypeId(e.target.value)}
              >
                <option value="">Select certification...</option>
                {certTypes.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.certification_name} ({t.certification_code})
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={startCamera}
              disabled={!selectedWorkerId || !selectedTypeId}
              className="btn btn-primary w-full py-4 text-lg disabled:opacity-50"
            >
              <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Open Camera
            </button>

            {/* Tips */}
            <div className="bg-slate-800/50 rounded-lg p-4 text-sm">
              <h3 className="font-semibold mb-2 text-slate-200">Tips for best results:</h3>
              <ul className="space-y-1 text-slate-400">
                <li>• Use good lighting</li>
                <li>• Lay certificate flat on a surface</li>
                <li>• Fill frame with certificate</li>
                <li>• Avoid glare and shadows</li>
                <li>• Ensure all text is readable</li>
              </ul>
            </div>
          </div>
        )}

        {/* Step: Camera */}
        {step === 'camera' && (
          <div className="space-y-4">
            <div className="relative rounded-xl overflow-hidden bg-black aspect-[4/3]">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              {/* Camera guide overlay */}
              <div className="absolute inset-4 border-2 border-white/30 rounded-lg pointer-events-none">
                <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-white" />
                <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-white" />
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-white" />
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-white" />
              </div>
              <p className="absolute bottom-4 left-0 right-0 text-center text-white/80 text-sm">
                Position certificate in frame
              </p>
            </div>

            <button
              onClick={capturePhoto}
              className="btn btn-primary w-full py-4 text-lg"
            >
              <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" strokeWidth={2} />
              </svg>
              Capture Photo
            </button>

            <button
              onClick={() => {
                stopCamera();
                setStep('setup');
              }}
              className="btn w-full"
              style={{ background: 'rgba(51, 65, 85, 0.5)' }}
            >
              Cancel
            </button>
          </div>
        )}

        {/* Step: Preview */}
        {step === 'preview' && capturedImage && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Review Photo</h2>

            <div className="rounded-xl overflow-hidden bg-black">
              <img
                src={capturedImage}
                alt="Captured certificate"
                className="w-full"
                style={{ transform: `rotate(${rotation}deg)` }}
              />
            </div>

            {/* Image actions */}
            <div className="flex justify-center gap-4">
              <button
                onClick={rotateImage}
                className="flex flex-col items-center gap-1 p-3 rounded-lg bg-slate-800 hover:bg-slate-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span className="text-xs">Rotate</span>
              </button>
              <button
                onClick={retakePhoto}
                className="flex flex-col items-center gap-1 p-3 rounded-lg bg-slate-800 hover:bg-slate-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                <span className="text-xs">Retake</span>
              </button>
            </div>

            <button
              onClick={() => setStep('details')}
              className="btn btn-primary w-full py-4"
            >
              Continue →
            </button>
          </div>
        )}

        {/* Step: Details */}
        {step === 'details' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Certificate Details</h2>

            {/* Thumbnail */}
            {capturedImage && (
              <div className="flex items-center gap-4 p-3 bg-slate-800/50 rounded-lg">
                <img
                  src={capturedImage}
                  alt="Captured"
                  className="w-16 h-16 object-cover rounded"
                />
                <div className="flex-1">
                  <p className="text-sm text-slate-300">
                    {certTypes.find(t => t.id === selectedTypeId)?.certification_name}
                  </p>
                  <p className="text-xs text-slate-500">
                    {workers.find(w => w.id === selectedWorkerId)?.first_name}{' '}
                    {workers.find(w => w.id === selectedWorkerId)?.last_name}
                  </p>
                </div>
                <button
                  onClick={() => setStep('preview')}
                  className="text-sm text-indigo-400"
                >
                  Edit Photo
                </button>
              </div>
            )}

            <div>
              <label className="label">Certificate Number</label>
              <input
                type="text"
                className="input font-mono"
                value={certNumber}
                onChange={e => setCertNumber(e.target.value)}
                placeholder="e.g., WAH-234567"
              />
            </div>

            <div>
              <label className="label">Issue Date *</label>
              <input
                type="date"
                className="input"
                value={issueDate}
                onChange={e => setIssueDate(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="label">Expiry Date</label>
              <input
                type="date"
                className="input"
                value={expiryDate}
                onChange={e => setExpiryDate(e.target.value)}
              />
              <p className="text-xs text-slate-500 mt-1">Auto-calculated from standard expiry period</p>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                onClick={() => setStep('preview')}
                className="btn flex-1"
                style={{ background: 'rgba(51, 65, 85, 0.5)' }}
              >
                ← Back
              </button>
              <button
                onClick={handleUpload}
                className="btn btn-primary flex-1"
                disabled={!issueDate}
              >
                Save & Upload
              </button>
            </div>
          </div>
        )}

        {/* Step: Uploading */}
        {step === 'uploading' && (
          <div className="text-center py-12 space-y-6">
            <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <div>
              <p className="text-lg font-semibold">Uploading Certificate...</p>
              <p className="text-slate-400 text-sm mt-1">{uploadProgress}%</p>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-2 max-w-xs mx-auto">
              <div
                className="bg-indigo-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Step: Success */}
        {step === 'success' && (
          <div className="text-center py-12 space-y-6">
            <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-10 h-10 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-semibold">Certificate Saved!</h2>
              <p className="text-slate-400 text-sm mt-1">
                The certification has been added successfully.
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => {
                  setCapturedImage(null);
                  setCapturedBlob(null);
                  setCertNumber('');
                  setRotation(0);
                  setStep('setup');
                }}
                className="btn btn-primary"
              >
                Add Another Certificate
              </button>
              <Link
                href={`/admin/employees/${selectedWorkerId}/certifications`}
                className="btn"
                style={{ background: 'rgba(51, 65, 85, 0.5)' }}
              >
                View Worker's Certifications
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Hidden canvas for image processing */}
      <canvas ref={canvasRef} className="hidden" />
    </main>
  );
}
