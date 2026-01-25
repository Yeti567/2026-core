'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
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

interface PendingUpload {
  id: string;
  file: File;
  preview: string;
  workerId: string;
  certTypeId: string;
  expiryDate: string;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
}

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
// MAIN COMPONENT
// =============================================================================

export default function BulkCertificateUploadPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [workers, setWorkers] = useState<Worker[]>([]);
  const [certTypes, setCertTypes] = useState<CertificationType[]>([]);
  const [uploads, setUploads] = useState<PendingUpload[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);

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
        const { data: workersData } = await supabase
          .from('user_profiles')
          .select('id, first_name, last_name')
          .eq('company_id', profile.company_id)
          .order('last_name');

        setWorkers(workersData || []);
      }

      const { data: typesData } = await supabase
        .from('certification_types')
        .select('id, certification_code, certification_name, default_expiry_months')
        .eq('is_active', true)
        .order('sort_order');

      setCertTypes(typesData || []);
    };

    fetchData();
  }, []);

  // =============================================================================
  // FILE HANDLING
  // =============================================================================

  const handleFiles = useCallback((files: FileList) => {
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf'];
    const maxFiles = 20;
    const maxSize = 10 * 1024 * 1024;

    const newUploads: PendingUpload[] = [];

    for (let i = 0; i < Math.min(files.length, maxFiles - uploads.length); i++) {
      // Safe: i is a numeric loop index bounded by files.length, standard array access
      // eslint-disable-next-line security/detect-object-injection
      const file = files[i];

      if (!validTypes.includes(file.type)) {
        continue;
      }

      if (file.size > maxSize) {
        continue;
      }

      const preview = file.type.startsWith('image/')
        ? URL.createObjectURL(file)
        : '';

      // Try to extract worker name from filename
      let guessedWorkerId = '';
      const fileName = file.name.toLowerCase();
      for (const w of workers) {
        const fullName = `${w.first_name}_${w.last_name}`.toLowerCase();
        const firstLast = `${w.first_name}${w.last_name}`.toLowerCase();
        if (fileName.includes(fullName) || fileName.includes(firstLast)) {
          guessedWorkerId = w.id;
          break;
        }
      }

      // Try to extract cert type from filename
      let guessedTypeId = '';
      for (const t of certTypes) {
        const code = t.certification_code.toLowerCase();
        const name = t.certification_name.toLowerCase().replace(/\s+/g, '');
        if (fileName.includes(code) || fileName.includes(name)) {
          guessedTypeId = t.id;
          break;
        }
      }

      // Calculate default expiry date
      let defaultExpiry = '';
      if (guessedTypeId) {
        const type = certTypes.find(t => t.id === guessedTypeId);
        if (type?.default_expiry_months) {
          const expiry = new Date();
          expiry.setMonth(expiry.getMonth() + type.default_expiry_months);
          defaultExpiry = expiry.toISOString().split('T')[0];
        }
      }

      newUploads.push({
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        file,
        preview,
        workerId: guessedWorkerId,
        certTypeId: guessedTypeId,
        expiryDate: defaultExpiry,
        status: 'pending',
      });
    }

    setUploads(prev => [...prev, ...newUploads]);
  }, [uploads.length, workers, certTypes]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const removeUpload = useCallback((id: string) => {
    setUploads(prev => {
      const upload = prev.find(u => u.id === id);
      if (upload?.preview) {
        URL.revokeObjectURL(upload.preview);
      }
      return prev.filter(u => u.id !== id);
    });
  }, []);

  const updateUpload = useCallback((id: string, updates: Partial<PendingUpload>) => {
    setUploads(prev => prev.map(u => u.id === id ? { ...u, ...updates } : u));

    // Recalculate expiry date if cert type changed
    if (updates.certTypeId) {
      const type = certTypes.find(t => t.id === updates.certTypeId);
      if (type?.default_expiry_months) {
        const expiry = new Date();
        expiry.setMonth(expiry.getMonth() + type.default_expiry_months);
        setUploads(prev => prev.map(u =>
          u.id === id ? { ...u, expiryDate: expiry.toISOString().split('T')[0] } : u
        ));
      }
    }
  }, [certTypes]);

  // =============================================================================
  // UPLOAD ALL
  // =============================================================================

  const uploadAll = async () => {
    const pendingUploads = uploads.filter(u => u.status === 'pending');
    const validUploads = pendingUploads.filter(u => u.workerId && u.certTypeId);

    if (validUploads.length === 0) {
      alert('Please select worker and certification type for all files');
      return;
    }

    setUploading(true);

    for (const upload of validUploads) {
      setUploads(prev => prev.map(u =>
        u.id === upload.id ? { ...u, status: 'uploading' } : u
      ));

      try {
        const formData = new FormData();
        formData.append('file', upload.file);
        formData.append('worker_id', upload.workerId);
        formData.append('certification_type_id', upload.certTypeId);
        formData.append('issue_date', new Date().toISOString().split('T')[0]);
        formData.append('expiry_date', upload.expiryDate);

        const res = await fetch('/api/certifications/upload', {
          method: 'POST',
          body: formData,
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Upload failed');
        }

        setUploads(prev => prev.map(u =>
          u.id === upload.id ? { ...u, status: 'success' } : u
        ));
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Upload failed';
        setUploads(prev => prev.map(u =>
          u.id === upload.id ? { ...u, status: 'error', error: message } : u
        ));
      }
    }

    setUploading(false);
  };

  // =============================================================================
  // RENDER
  // =============================================================================

  const pendingCount = uploads.filter(u => u.status === 'pending').length;
  const successCount = uploads.filter(u => u.status === 'success').length;
  const errorCount = uploads.filter(u => u.status === 'error').length;
  const validPending = uploads.filter(u => u.status === 'pending' && u.workerId && u.certTypeId).length;

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Header */}
      <div className="border-b border-slate-800/50 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <Link
            href="/admin/certifications"
            className="text-slate-500 hover:text-slate-300 text-sm flex items-center gap-1 mb-2 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Certifications
          </Link>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <span className="text-3xl">📁</span>
            Bulk Certificate Upload
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Upload multiple certificates at once
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        {/* Drop Zone */}
        <div
          className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${dragActive
              ? 'border-indigo-500 bg-indigo-500/10'
              : 'border-slate-600 hover:border-slate-500'
            }`}
          onDragOver={e => { e.preventDefault(); setDragActive(true); }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
        >
          <div className="text-5xl mb-4">📄</div>
          <p className="text-lg text-slate-200 mb-2">
            Drop PDFs or images here (up to 20 files)
          </p>
          <p className="text-slate-500 mb-4">or</p>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="btn btn-primary"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
            Browse Files
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,application/pdf"
            multiple
            className="hidden"
            onChange={e => e.target.files && handleFiles(e.target.files)}
          />
          <p className="text-xs text-slate-500 mt-4">
            Supports PDF, JPEG, PNG, WebP, HEIC • Max 10MB per file
          </p>
        </div>

        {/* Status Summary */}
        {uploads.length > 0 && (
          <div className="flex items-center gap-6 text-sm">
            <span className="text-slate-400">
              Files uploaded: <span className="text-white font-medium">{uploads.length}</span>
            </span>
            {pendingCount > 0 && (
              <span className="text-amber-400">
                Pending: {pendingCount}
              </span>
            )}
            {successCount > 0 && (
              <span className="text-emerald-400">
                Success: {successCount}
              </span>
            )}
            {errorCount > 0 && (
              <span className="text-red-400">
                Failed: {errorCount}
              </span>
            )}
          </div>
        )}

        {/* File List */}
        <div className="space-y-4">
          {uploads.map(upload => (
            <div
              key={upload.id}
              className={`card border ${upload.status === 'success'
                  ? 'border-emerald-500/30 bg-emerald-500/5'
                  : upload.status === 'error'
                    ? 'border-red-500/30 bg-red-500/5'
                    : upload.status === 'uploading'
                      ? 'border-indigo-500/30 bg-indigo-500/5'
                      : 'border-slate-700'
                }`}
            >
              <div className="flex items-start gap-4">
                {/* Thumbnail */}
                <div className="w-16 h-16 rounded bg-slate-800 flex-shrink-0 overflow-hidden">
                  {upload.preview ? (
                    <img
                      src={upload.preview}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <svg className="w-8 h-8 text-red-400" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" />
                      </svg>
                    </div>
                  )}
                </div>

                {/* File Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium truncate">{upload.file.name}</p>
                  <p className="text-xs text-slate-500">
                    {(upload.file.size / 1024).toFixed(1)} KB
                  </p>

                  {upload.status === 'pending' && (
                    <div className="grid grid-cols-3 gap-3 mt-3">
                      <div>
                        <label className="text-xs text-slate-500 block mb-1">Worker</label>
                        <select
                          className="input text-sm py-1"
                          value={upload.workerId}
                          onChange={e => updateUpload(upload.id, { workerId: e.target.value })}
                        >
                          <option value="">Select...</option>
                          {workers.map(w => (
                            <option key={w.id} value={w.id}>
                              {w.first_name} {w.last_name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-slate-500 block mb-1">Cert Type</label>
                        <select
                          className="input text-sm py-1"
                          value={upload.certTypeId}
                          onChange={e => updateUpload(upload.id, { certTypeId: e.target.value })}
                        >
                          <option value="">Select...</option>
                          {certTypes.map(t => (
                            <option key={t.id} value={t.id}>
                              {t.certification_code}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-slate-500 block mb-1">Expiry</label>
                        <input
                          type="date"
                          className="input text-sm py-1"
                          value={upload.expiryDate}
                          onChange={e => updateUpload(upload.id, { expiryDate: e.target.value })}
                        />
                      </div>
                    </div>
                  )}

                  {upload.status === 'uploading' && (
                    <div className="flex items-center gap-2 mt-2 text-indigo-400">
                      <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                      <span className="text-sm">Uploading...</span>
                    </div>
                  )}

                  {upload.status === 'success' && (
                    <div className="flex items-center gap-2 mt-2 text-emerald-400">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-sm">Uploaded successfully</span>
                    </div>
                  )}

                  {upload.status === 'error' && (
                    <div className="flex items-center gap-2 mt-2 text-red-400">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      <span className="text-sm">{upload.error || 'Upload failed'}</span>
                    </div>
                  )}
                </div>

                {/* Remove Button */}
                {upload.status === 'pending' && (
                  <button
                    onClick={() => removeUpload(upload.id)}
                    className="p-2 rounded hover:bg-slate-800 text-slate-500 hover:text-red-400 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Upload All Button */}
        {pendingCount > 0 && (
          <div className="flex items-center justify-between pt-6 border-t border-slate-700">
            <button
              onClick={() => setUploads([])}
              className="btn"
              style={{ background: 'rgba(51, 65, 85, 0.5)' }}
              disabled={uploading}
            >
              Cancel
            </button>
            <button
              onClick={uploadAll}
              className="btn btn-primary"
              disabled={uploading || validPending === 0}
            >
              {uploading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Uploading...
                </>
              ) : (
                <>
                  Upload All ({validPending} files)
                </>
              )}
            </button>
          </div>
        )}

        {/* All Done */}
        {uploads.length > 0 && pendingCount === 0 && (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">All uploads complete!</h3>
            <p className="text-slate-400 mb-4">
              {successCount} successful, {errorCount} failed
            </p>
            <Link
              href="/admin/certifications"
              className="btn btn-primary"
            >
              View All Certifications
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
