'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';

interface CertificationType {
  id: string;
  certification_code: string;
  certification_name: string;
  default_expiry_months: number | null;
}

interface MyCertification {
  id: string;
  certification_type: CertificationType;
  issue_date: string;
  expiry_date: string | null;
  status: string;
}

type UploadStep = 'list' | 'select-type' | 'capture' | 'preview' | 'details' | 'uploading' | 'success';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export default function MyCertificatesPage() {
  const router = useRouter();
  
  const [step, setStep] = useState<UploadStep>('list');
  const [certTypes, setCertTypes] = useState<CertificationType[]>([]);
  const [myCerts, setMyCerts] = useState<MyCertification[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  // Upload state
  const [selectedTypeId, setSelectedTypeId] = useState('');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch user data and certifications
  useEffect(() => {
    const fetchData = async () => {
      const supabase = getSupabase();

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('id')
        .single();

      if (profile) {
        setUserId(profile.id);

        // Get my certifications
        const { data: certs } = await supabase
          .from('worker_certifications')
          .select(`
            id,
            issue_date,
            expiry_date,
            status,
            certification_type:certification_types(id, certification_code, certification_name)
          `)
          .eq('worker_id', profile.id)
          .order('expiry_date', { ascending: true });

        // Transform the data to match our interface (Supabase returns single relations as arrays)
        const transformedCerts = (certs || []).map((cert: any) => ({
          ...cert,
          certification_type: Array.isArray(cert.certification_type) 
            ? cert.certification_type[0] 
            : cert.certification_type
        }));
        setMyCerts(transformedCerts);
      }

      // Get cert types
      const { data: typesData } = await supabase
        .from('certification_types')
        .select('id, certification_code, certification_name, default_expiry_months')
        .eq('is_active', true)
        .order('sort_order');

      setCertTypes(typesData || []);
      setLoading(false);
    };

    fetchData();
  }, []);

  // Auto-calculate expiry date
  useEffect(() => {
    const type = certTypes.find(t => t.id === selectedTypeId);
    if (type?.default_expiry_months && issueDate) {
      const issue = new Date(issueDate);
      issue.setMonth(issue.getMonth() + type.default_expiry_months);
      setExpiryDate(issue.toISOString().split('T')[0]);
    }
  }, [selectedTypeId, issueDate, certTypes]);

  // Camera functions
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setStep('capture');
      setError(null);
    } catch (err) {
      console.error('Camera error:', err);
      setError('Unable to access camera. You can also select a photo from your gallery.');
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

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);

    const imageData = canvas.toDataURL('image/jpeg', 0.9);
    setCapturedImage(imageData);
    canvas.toBlob(blob => { if (blob) setCapturedBlob(blob); }, 'image/jpeg', 0.9);

    stopCamera();
    setStep('preview');
  }, [stopCamera]);

  // Handle file selection (for gallery upload)
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setCapturedImage(event.target?.result as string);
    };
    reader.readAsDataURL(file);
    setCapturedBlob(file);
    setStep('preview');
  }, []);

  const retakePhoto = useCallback(() => {
    setCapturedImage(null);
    setCapturedBlob(null);
    setStep('select-type');
  }, []);

  // Upload
  const handleUpload = async () => {
    if (!capturedBlob || !userId || !selectedTypeId) {
      setError('Please fill in all required fields');
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setStep('uploading');

    try {
      const formData = new FormData();
      formData.append('file', capturedBlob, 'certificate.jpg');
      formData.append('worker_id', userId);
      formData.append('certification_type_id', selectedTypeId);
      formData.append('certificate_number', certNumber);
      formData.append('issue_date', issueDate);
      formData.append('expiry_date', expiryDate);

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

  // Reset for new upload
  const resetUpload = () => {
    setCapturedImage(null);
    setCapturedBlob(null);
    setSelectedTypeId('');
    setCertNumber('');
    setIssueDate(new Date().toISOString().split('T')[0]);
    setExpiryDate('');
    setStep('list');
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => { stopCamera(); };
  }, [stopCamera]);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <div className="bg-slate-900 border-b border-slate-800 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🎓</span>
          <h1 className="font-semibold">My Certificates</h1>
        </div>
        <Link href="/dashboard" className="p-2 hover:bg-slate-800 rounded-lg">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </Link>
      </div>

      <div className="p-4 max-w-lg mx-auto">
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 text-sm">
            {error}
            <button onClick={() => setError(null)} className="ml-2 underline">Dismiss</button>
          </div>
        )}

        {/* Step: List of my certificates */}
        {step === 'list' && (
          <div className="space-y-6">
            <button
              onClick={() => setStep('select-type')}
              className="w-full p-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-medium flex items-center justify-center gap-3"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Upload New Certificate
            </button>

            {myCerts.length > 0 ? (
              <div className="space-y-3">
                <h2 className="text-lg font-semibold">Your Certificates</h2>
                {myCerts.map(cert => {
                  const isExpired = cert.expiry_date && new Date(cert.expiry_date) < new Date();
                  const isExpiringSoon = cert.expiry_date && !isExpired && 
                    new Date(cert.expiry_date) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
                  
                  return (
                    <div key={cert.id} className={`p-4 rounded-lg border ${
                      isExpired ? 'border-red-500/30 bg-red-500/10' :
                      isExpiringSoon ? 'border-amber-500/30 bg-amber-500/10' :
                      'border-slate-700 bg-slate-800/50'
                    }`}>
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium">{cert.certification_type?.certification_name}</p>
                          <p className="text-sm text-slate-400">{cert.certification_type?.certification_code}</p>
                        </div>
                        {isExpired ? (
                          <span className="text-xs px-2 py-1 rounded bg-red-500/20 text-red-400">Expired</span>
                        ) : isExpiringSoon ? (
                          <span className="text-xs px-2 py-1 rounded bg-amber-500/20 text-amber-400">Expiring Soon</span>
                        ) : (
                          <span className="text-xs px-2 py-1 rounded bg-emerald-500/20 text-emerald-400">Valid</span>
                        )}
                      </div>
                      {cert.expiry_date && (
                        <p className="text-xs text-slate-500 mt-2">
                          Expires: {new Date(cert.expiry_date).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-400">
                <p>No certificates uploaded yet.</p>
                <p className="text-sm mt-2">Upload your first certificate above!</p>
              </div>
            )}
          </div>
        )}

        {/* Step: Select certification type */}
        {step === 'select-type' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">What type of certificate?</h2>
            <div className="space-y-2">
              {certTypes.map(type => (
                <button
                  key={type.id}
                  onClick={() => {
                    setSelectedTypeId(type.id);
                    startCamera();
                  }}
                  className={`w-full p-4 rounded-lg border text-left transition-colors ${
                    selectedTypeId === type.id
                      ? 'border-emerald-500 bg-emerald-500/10'
                      : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                  }`}
                >
                  <p className="font-medium">{type.certification_name}</p>
                  <p className="text-sm text-slate-400">{type.certification_code}</p>
                </button>
              ))}
            </div>

            {/* Option to upload from gallery */}
            <div className="pt-4 border-t border-slate-700">
              <p className="text-sm text-slate-400 mb-3">Or upload from your photo gallery:</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleFileSelect}
              />
              <button
                onClick={() => {
                  if (!selectedTypeId) {
                    setError('Please select a certificate type first');
                    return;
                  }
                  fileInputRef.current?.click();
                }}
                className="w-full p-3 rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-800"
              >
                Choose from Gallery
              </button>
            </div>

            <button onClick={() => setStep('list')} className="w-full text-sm text-slate-400 hover:text-white">
              ← Back
            </button>
          </div>
        )}

        {/* Step: Camera capture */}
        {step === 'capture' && (
          <div className="space-y-4">
            <div className="relative rounded-xl overflow-hidden bg-black aspect-[4/3]">
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
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

            <button onClick={capturePhoto} className="btn btn-primary w-full py-4 text-lg">
              📸 Take Photo
            </button>

            <button onClick={() => { stopCamera(); setStep('select-type'); }} className="w-full text-sm text-slate-400">
              Cancel
            </button>
          </div>
        )}

        {/* Step: Preview */}
        {step === 'preview' && capturedImage && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Does this look good?</h2>
            <div className="rounded-xl overflow-hidden bg-black">
              <img src={capturedImage} alt="Captured certificate" className="w-full" />
            </div>
            <div className="flex gap-3">
              <button onClick={retakePhoto} className="flex-1 p-3 rounded-lg border border-slate-600 text-slate-300">
                Retake
              </button>
              <button onClick={() => setStep('details')} className="flex-1 btn btn-primary">
                Looks Good →
              </button>
            </div>
          </div>
        )}

        {/* Step: Details */}
        {step === 'details' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Certificate Details</h2>

            {capturedImage && (
              <div className="flex items-center gap-4 p-3 bg-slate-800/50 rounded-lg">
                <img src={capturedImage} alt="Captured" className="w-16 h-16 object-cover rounded" />
                <div className="flex-1">
                  <p className="text-sm text-slate-300">
                    {certTypes.find(t => t.id === selectedTypeId)?.certification_name}
                  </p>
                </div>
              </div>
            )}

            <div>
              <label className="label">Certificate Number (optional)</label>
              <input
                type="text"
                className="input font-mono"
                value={certNumber}
                onChange={e => setCertNumber(e.target.value)}
                placeholder="e.g., FA-123456"
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
              <p className="text-xs text-slate-500 mt-1">Auto-calculated if known</p>
            </div>

            <div className="flex gap-3 pt-4">
              <button onClick={() => setStep('preview')} className="flex-1 p-3 rounded-lg border border-slate-600">
                ← Back
              </button>
              <button onClick={handleUpload} className="flex-1 btn btn-primary" disabled={!issueDate}>
                Upload
              </button>
            </div>
          </div>
        )}

        {/* Step: Uploading */}
        {step === 'uploading' && (
          <div className="text-center py-12 space-y-6">
            <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <div>
              <p className="text-lg font-semibold">Uploading...</p>
              <p className="text-slate-400 text-sm mt-1">{uploadProgress}%</p>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-2 max-w-xs mx-auto">
              <div className="bg-emerald-500 h-2 rounded-full transition-all" style={{ width: `${uploadProgress}%` }} />
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
              <h2 className="text-xl font-semibold">Certificate Uploaded!</h2>
              <p className="text-slate-400 text-sm mt-1">Your certificate has been saved.</p>
            </div>
            <div className="flex flex-col gap-3">
              <button onClick={resetUpload} className="btn btn-primary">
                Upload Another
              </button>
              <Link href="/dashboard" className="btn border border-slate-600">
                Back to Dashboard
              </Link>
            </div>
          </div>
        )}
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </main>
  );
}
