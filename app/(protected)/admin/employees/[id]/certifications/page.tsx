'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';

// =============================================================================
// TYPES
// =============================================================================

interface Worker {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  position: string | null;
}

interface CertificationType {
  id: string;
  certification_code: string;
  certification_name: string;
  issuing_organization: string | null;
  default_expiry_months: number | null;
  is_mandatory: boolean;
  legal_requirement: string | null;
}

interface WorkerCertification {
  id: string;
  certificate_number: string | null;
  issue_date: string;
  expiry_date: string | null;
  issuing_organization: string | null;
  instructor_name: string | null;
  course_hours: number | null;
  certificate_file_path: string | null;
  certificate_image_path: string | null;
  file_type: 'pdf' | 'image' | null;
  thumbnail_path: string | null;
  status: string;
  verified_by: string | null;
  verified_at: string | null;
  verification_notes: string | null;
  reminder_60_sent: boolean;
  reminder_30_sent: boolean;
  reminder_7_sent: boolean;
  notes: string | null;
  certification_type: CertificationType;
}

interface CertificationSummary {
  total_certifications: number;
  active_certifications: number;
  expired_certifications: number;
  expiring_soon_certifications: number;
  missing_mandatory_certifications: string[];
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

export default function WorkerCertificationsPage() {
  const params = useParams();
  const router = useRouter();
  const workerId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [worker, setWorker] = useState<Worker | null>(null);
  const [certifications, setCertifications] = useState<WorkerCertification[]>([]);
  const [certTypes, setCertTypes] = useState<CertificationType[]>([]);
  const [summary, setSummary] = useState<CertificationSummary | null>(null);

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showViewerModal, setShowViewerModal] = useState<WorkerCertification | null>(null);
  const [editingCert, setEditingCert] = useState<WorkerCertification | null>(null);

  // =============================================================================
  // FETCH DATA
  // =============================================================================

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const supabase = getSupabase();

      // Get worker
      const { data: workerData, error: workerError } = await supabase
        .from('user_profiles')
        .select('id, first_name, last_name, email, position')
        .eq('id', workerId)
        .single();

      if (workerError || !workerData) {
        router.push('/admin/employees');
        return;
      }
      setWorker(workerData);

      // Get certifications
      const { data: certsData } = await supabase
        .from('worker_certifications')
        .select(`
          *,
          certification_type:certification_types(*)
        `)
        .eq('worker_id', workerId)
        .order('expiry_date', { ascending: true, nullsFirst: false });

      setCertifications(certsData || []);

      // Get certification types
      const { data: typesData } = await supabase
        .from('certification_types')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');

      setCertTypes(typesData || []);

      // Get summary using database function
      const { data: summaryData } = await supabase
        .rpc('get_worker_certifications_summary', { p_worker_id: workerId });

      if (summaryData && summaryData.length > 0) {
        setSummary(summaryData[0]);
      }
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [workerId, router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // =============================================================================
  // HELPERS
  // =============================================================================

  const getStatusInfo = (cert: WorkerCertification) => {
    if (!cert.expiry_date) {
      return { icon: '✅', color: 'emerald', label: 'No Expiry', daysText: 'Never expires' };
    }

    const today = new Date();
    const expiry = new Date(cert.expiry_date);
    const days = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (days < 0) {
      return { icon: '❌', color: 'red', label: 'Expired', daysText: `Expired ${Math.abs(days)} days ago` };
    }
    if (days <= 7) {
      return { icon: '🚨', color: 'red', label: 'Critical', daysText: `${days} days remaining` };
    }
    if (days <= 30) {
      return { icon: '⚠️', color: 'amber', label: 'Warning', daysText: `${days} days remaining` };
    }
    if (days <= 60) {
      return { icon: '⏰', color: 'amber', label: 'Expiring Soon', daysText: `${days} days remaining` };
    }
    return { icon: '✅', color: 'emerald', label: 'Active', daysText: `${days} days remaining` };
  };

  const getStatusBadgeClasses = (color: string) => {
    const classes: Record<string, string> = {
      emerald: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
      amber: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
      red: 'bg-red-500/20 text-red-400 border-red-500/30',
    };
    // Safe: color is a typed parameter with fallback, not arbitrary user input
    // eslint-disable-next-line security/detect-object-injection
    return classes[color] || classes.emerald;
  };

  const getRemindersSent = (cert: WorkerCertification) => {
    const sent = [];
    if (cert.reminder_60_sent) sent.push('60');
    if (cert.reminder_30_sent) sent.push('30');
    if (cert.reminder_7_sent) sent.push('7');
    return sent;
  };

  // =============================================================================
  // RENDER
  // =============================================================================

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </main>
    );
  }

  if (!worker) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-400 mb-4">Worker not found</p>
          <Link href="/admin/employees" className="btn btn-primary">Back to Employees</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Header */}
      <div className="border-b border-slate-800/50 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <Link
                href="/admin/employees"
                className="text-slate-500 hover:text-slate-300 text-sm flex items-center gap-1 mb-2 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to Employees
              </Link>
              <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                <span className="text-3xl">🎓</span>
                Certifications - {worker.first_name} {worker.last_name}
              </h1>
              {worker.position && (
                <p className="text-slate-400 text-sm">{worker.position}</p>
              )}
            </div>

            <button
              onClick={() => setShowAddModal(true)}
              className="btn btn-primary flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Certification
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        {/* Status Summary */}
        {summary && (
          <div className="card">
            <h2 className="text-lg font-semibold text-white mb-4">Status Summary</h2>
            <div className="flex flex-wrap items-center gap-6">
              <div className="flex items-center gap-2">
                <span className="text-2xl">✅</span>
                <div>
                  <p className="text-2xl font-bold text-emerald-400">{summary.active_certifications}</p>
                  <p className="text-xs text-slate-400">Active</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-2xl">⚠️</span>
                <div>
                  <p className="text-2xl font-bold text-amber-400">{summary.expiring_soon_certifications}</p>
                  <p className="text-xs text-slate-400">Expiring Soon</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-2xl">❌</span>
                <div>
                  <p className="text-2xl font-bold text-red-400">{summary.expired_certifications}</p>
                  <p className="text-xs text-slate-400">Expired</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-2xl">📋</span>
                <div>
                  <p className="text-2xl font-bold text-slate-300">{summary.total_certifications}</p>
                  <p className="text-xs text-slate-400">Total</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Certifications List */}
        <div className="space-y-4">
          {certifications.length === 0 ? (
            <div className="card text-center py-12">
              <span className="text-5xl mb-4 block">📄</span>
              <h3 className="text-lg font-semibold text-white mb-2">No Certifications Yet</h3>
              <p className="text-slate-400 mb-4">Add the first certification for this worker.</p>
              <button
                onClick={() => setShowAddModal(true)}
                className="btn btn-primary"
              >
                Add Certification
              </button>
            </div>
          ) : (
            certifications.map(cert => {
              const status = getStatusInfo(cert);
              const remindersSent = getRemindersSent(cert);

              return (
                <div
                  key={cert.id}
                  className={`card border ${status.color === 'red' ? 'border-red-500/30' : status.color === 'amber' ? 'border-amber-500/30' : 'border-slate-700'}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-white">
                          {cert.certification_type?.certification_name || 'Unknown'}
                        </h3>
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusBadgeClasses(status.color)}`}>
                          {status.icon} {status.label}
                        </span>
                        {cert.certification_type?.is_mandatory && (
                          <span className="px-2 py-0.5 rounded text-xs bg-purple-500/20 text-purple-400">
                            Mandatory
                          </span>
                        )}
                        {cert.verified_at && (
                          <span className="px-2 py-0.5 rounded text-xs bg-emerald-500/20 text-emerald-400 flex items-center gap-1">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Verified
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
                        {cert.certificate_number && (
                          <div>
                            <p className="text-slate-500">Certificate #</p>
                            <p className="text-slate-200 font-mono">{cert.certificate_number}</p>
                          </div>
                        )}
                        <div>
                          <p className="text-slate-500">Issued</p>
                          <p className="text-slate-200">{new Date(cert.issue_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                        </div>
                        <div>
                          <p className="text-slate-500">Expires</p>
                          <p className="text-slate-200">
                            {cert.expiry_date
                              ? new Date(cert.expiry_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                              : 'Never'}
                          </p>
                        </div>
                        <div>
                          <p className="text-slate-500">Status</p>
                          <p className={`font-medium ${status.color === 'red' ? 'text-red-400' : status.color === 'amber' ? 'text-amber-400' : 'text-emerald-400'}`}>
                            {status.daysText}
                          </p>
                        </div>
                      </div>

                      {remindersSent.length > 0 && (
                        <p className="text-xs text-slate-500 flex items-center gap-1">
                          <span>📧</span>
                          Reminders sent: {remindersSent.map(d => `${d} days`).join(', ')}
                        </p>
                      )}

                      {cert.certification_type?.legal_requirement && (
                        <p className="text-xs text-slate-500 mt-1">
                          Legal: {cert.certification_type.legal_requirement}
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 ml-4">
                      {cert.certificate_file_path && (
                        <button
                          onClick={() => setShowViewerModal(cert)}
                          className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                          title="View Certificate"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                      )}
                      {status.color === 'red' && (
                        <button
                          onClick={() => {
                            setEditingCert(cert);
                            setShowAddModal(true);
                          }}
                          className="btn text-sm bg-amber-500 hover:bg-amber-600 text-white"
                        >
                          Renew Now
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setEditingCert(cert);
                          setShowAddModal(true);
                        }}
                        className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                        title="Edit"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Thumbnail Preview */}
                  {cert.thumbnail_path && (
                    <div className="mt-4 pt-4 border-t border-slate-700/50">
                      <button
                        onClick={() => setShowViewerModal(cert)}
                        className="relative group"
                      >
                        <img
                          src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/certifications/${cert.thumbnail_path}`}
                          alt="Certificate thumbnail"
                          className="h-16 rounded border border-slate-700 group-hover:border-indigo-500 transition-colors"
                        />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded">
                          <span className="text-white text-xs">View</span>
                        </div>
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Missing Mandatory Certifications */}
        {summary && summary.missing_mandatory_certifications && summary.missing_mandatory_certifications.length > 0 && (
          <div className="card border-red-500/30 bg-red-500/5">
            <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
              <span>⚠️</span>
              Missing Mandatory Certifications ({summary.missing_mandatory_certifications.length})
            </h3>
            <ul className="space-y-2">
              {summary.missing_mandatory_certifications.map((certName, idx) => (
                <li key={idx} className="flex items-center justify-between">
                  <span className="text-slate-300">• {certName}</span>
                  <button
                    onClick={() => {
                      const type = certTypes.find(t => t.certification_name === certName);
                      if (type) {
                        setEditingCert(null);
                        setShowAddModal(true);
                      }
                    }}
                    className="text-sm text-indigo-400 hover:text-indigo-300"
                  >
                    Add Now →
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Add/Edit Certificate Modal */}
      {showAddModal && (
        <AddCertificationModal
          workerId={workerId}
          certTypes={certTypes}
          existingCert={editingCert}
          onClose={() => {
            setShowAddModal(false);
            setEditingCert(null);
          }}
          onSuccess={() => {
            setShowAddModal(false);
            setEditingCert(null);
            fetchData();
          }}
        />
      )}

      {/* Certificate Viewer Modal */}
      {showViewerModal && (
        <CertificateViewerModal
          certification={showViewerModal}
          onClose={() => setShowViewerModal(null)}
        />
      )}
    </main>
  );
}

// =============================================================================
// ADD CERTIFICATION MODAL
// =============================================================================

function AddCertificationModal({
  workerId,
  certTypes,
  existingCert,
  onClose,
  onSuccess,
}: {
  workerId: string;
  certTypes: CertificationType[];
  existingCert: WorkerCertification | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [previewFile, setPreviewFile] = useState<{ file: File; preview: string } | null>(null);

  const [form, setForm] = useState({
    certification_type_id: existingCert?.certification_type?.id || '',
    certificate_number: existingCert?.certificate_number || '',
    issue_date: existingCert?.issue_date || new Date().toISOString().split('T')[0],
    expiry_date: existingCert?.expiry_date || '',
    issuing_organization: existingCert?.issuing_organization || '',
    instructor_name: existingCert?.instructor_name || '',
    course_hours: existingCert?.course_hours?.toString() || '',
    notes: existingCert?.notes || '',
    verified: false,
  });

  // Auto-fill when certification type changes
  const handleTypeChange = (typeId: string) => {
    const type = certTypes.find(t => t.id === typeId);
    if (type) {
      const issueDate = form.issue_date ? new Date(form.issue_date) : new Date();
      let expiryDate = '';

      if (type.default_expiry_months) {
        const expiry = new Date(issueDate);
        expiry.setMonth(expiry.getMonth() + type.default_expiry_months);
        expiryDate = expiry.toISOString().split('T')[0];
      }

      setForm(prev => ({
        ...prev,
        certification_type_id: typeId,
        issuing_organization: type.issuing_organization || prev.issuing_organization,
        expiry_date: expiryDate || prev.expiry_date,
      }));
    } else {
      setForm(prev => ({ ...prev, certification_type_id: typeId }));
    }
  };

  // Handle issue date change - recalculate expiry
  const handleIssueDateChange = (date: string) => {
    setForm(prev => ({ ...prev, issue_date: date }));

    const type = certTypes.find(t => t.id === form.certification_type_id);
    if (type?.default_expiry_months && date) {
      const issueDate = new Date(date);
      issueDate.setMonth(issueDate.getMonth() + type.default_expiry_months);
      setForm(prev => ({ ...prev, expiry_date: issueDate.toISOString().split('T')[0] }));
    }
  };

  // File handling
  const handleFile = (file: File) => {
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      alert('Invalid file type. Please upload a PDF or image (JPEG, PNG, WebP, HEIC).');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('File too large. Maximum size is 10MB.');
      return;
    }

    const preview = file.type.startsWith('image/')
      ? URL.createObjectURL(file)
      : '/pdf-icon.svg';

    setPreviewFile({ file, preview });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  // Camera capture
  const handleCameraCapture = async () => {
    try {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.capture = 'environment';
      input.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) handleFile(file);
      };
      input.click();
    } catch (err) {
      console.error('Camera error:', err);
      alert('Unable to access camera');
    }
  };

  // Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.certification_type_id) {
      alert('Please select a certification type');
      return;
    }

    setLoading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('worker_id', workerId);
      formData.append('certification_type_id', form.certification_type_id);
      formData.append('certificate_number', form.certificate_number);
      formData.append('issue_date', form.issue_date);
      formData.append('expiry_date', form.expiry_date);
      formData.append('issuing_organization', form.issuing_organization);
      formData.append('instructor_name', form.instructor_name);
      formData.append('course_hours', form.course_hours);
      formData.append('notes', form.notes);
      formData.append('verified', form.verified.toString());

      if (previewFile) {
        formData.append('file', previewFile.file);
      }

      if (existingCert) {
        formData.append('existing_id', existingCert.id);
      }

      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);

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

      onSuccess();
    } catch (err: any) {
      console.error('Submit error:', err);
      alert(err.message || 'Failed to save certification');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-slate-900 border-b border-slate-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">
            {existingCert ? 'Edit Certification' : 'Add Certification'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Certification Type */}
          <div>
            <label className="label">Certification Type *</label>
            <select
              className="input"
              value={form.certification_type_id}
              onChange={e => handleTypeChange(e.target.value)}
              required
            >
              <option value="">Select certification...</option>
              <optgroup label="Legally Required">
                {certTypes.filter(t => t.legal_requirement).map(type => (
                  <option key={type.id} value={type.id}>
                    {type.certification_name} ({type.certification_code})
                    {type.is_mandatory && ' *'}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Equipment & Operations">
                {certTypes.filter(t => !t.legal_requirement && ['FORK', 'AWP', 'CRANE', 'BOOM', 'SKID', 'EXCA'].includes(t.certification_code)).map(type => (
                  <option key={type.id} value={type.id}>
                    {type.certification_name} ({type.certification_code})
                  </option>
                ))}
              </optgroup>
              <optgroup label="Safety Training">
                {certTypes.filter(t => !t.legal_requirement && !['FORK', 'AWP', 'CRANE', 'BOOM', 'SKID', 'EXCA', 'COMPANY-ORIENT', 'COMPANY-CONC'].includes(t.certification_code)).map(type => (
                  <option key={type.id} value={type.id}>
                    {type.certification_name} ({type.certification_code})
                  </option>
                ))}
              </optgroup>
              <optgroup label="Company-Specific">
                {certTypes.filter(t => t.certification_code.startsWith('COMPANY')).map(type => (
                  <option key={type.id} value={type.id}>
                    {type.certification_name}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>

          {/* Certificate Number */}
          <div>
            <label className="label">Certificate Number</label>
            <input
              type="text"
              className="input font-mono"
              value={form.certificate_number}
              onChange={e => setForm(prev => ({ ...prev, certificate_number: e.target.value }))}
              placeholder="e.g., WAH-234567"
            />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Issue Date *</label>
              <input
                type="date"
                className="input"
                value={form.issue_date}
                onChange={e => handleIssueDateChange(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="label">Expiry Date</label>
              <input
                type="date"
                className="input"
                value={form.expiry_date}
                onChange={e => setForm(prev => ({ ...prev, expiry_date: e.target.value }))}
              />
              {form.certification_type_id && (
                <p className="text-xs text-slate-500 mt-1">Auto-calculated from expiry period</p>
              )}
            </div>
          </div>

          {/* Organization & Instructor */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Issuing Organization</label>
              <input
                type="text"
                className="input"
                value={form.issuing_organization}
                onChange={e => setForm(prev => ({ ...prev, issuing_organization: e.target.value }))}
                placeholder="e.g., IHSA"
              />
            </div>
            <div>
              <label className="label">Instructor Name</label>
              <input
                type="text"
                className="input"
                value={form.instructor_name}
                onChange={e => setForm(prev => ({ ...prev, instructor_name: e.target.value }))}
              />
            </div>
          </div>

          {/* Course Hours */}
          <div>
            <label className="label">Course Hours</label>
            <input
              type="number"
              step="0.5"
              className="input w-32"
              value={form.course_hours}
              onChange={e => setForm(prev => ({ ...prev, course_hours: e.target.value }))}
              placeholder="e.g., 8"
            />
          </div>

          {/* File Upload */}
          <div>
            <label className="label">Upload Certificate</label>
            <div
              className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                dragActive ? 'border-indigo-500 bg-indigo-500/10' : 'border-slate-600 hover:border-slate-500'
              }`}
              onDragOver={e => { e.preventDefault(); setDragActive(true); }}
              onDragLeave={() => setDragActive(false)}
              onDrop={handleDrop}
            >
              {previewFile ? (
                <div className="space-y-3">
                  {previewFile.file.type.startsWith('image/') ? (
                    <img src={previewFile.preview} alt="Preview" className="max-h-32 mx-auto rounded" />
                  ) : (
                    <div className="flex items-center justify-center gap-2 text-slate-300">
                      <svg className="w-10 h-10 text-red-400" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" />
                      </svg>
                      <span>{previewFile.file.name}</span>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => setPreviewFile(null)}
                    className="text-sm text-red-400 hover:text-red-300"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <>
                  <div className="text-4xl mb-2">📄</div>
                  <p className="text-slate-300 mb-2">Drop PDF or image here</p>
                  <p className="text-slate-500 text-sm mb-4">or</p>
                  <div className="flex justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="btn text-sm"
                      style={{ background: 'rgba(51, 65, 85, 0.5)' }}
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                      </svg>
                      Browse Files
                    </button>
                    <button
                      type="button"
                      onClick={handleCameraCapture}
                      className="btn text-sm"
                      style={{ background: 'rgba(51, 65, 85, 0.5)' }}
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Take Photo
                    </button>
                  </div>
                </>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) handleFile(file);
                }}
              />
            </div>
            <p className="text-xs text-slate-500 mt-2">Supports PDF, JPEG, PNG, WebP, HEIC (max 10MB)</p>
          </div>

          {/* Verification Checkbox */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.verified}
              onChange={e => setForm(prev => ({ ...prev, verified: e.target.checked }))}
              className="rounded border-slate-600"
            />
            <span className="text-slate-300">I have verified this certificate is authentic</span>
          </label>

          {/* Notes */}
          <div>
            <label className="label">Notes</label>
            <textarea
              className="input"
              rows={2}
              value={form.notes}
              onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Any additional notes..."
            />
          </div>

          {/* Progress Bar */}
          {loading && uploadProgress > 0 && (
            <div className="w-full bg-slate-700 rounded-full h-2">
              <div
                className="bg-indigo-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-700">
            <button
              type="button"
              onClick={onClose}
              className="btn"
              style={{ background: 'rgba(51, 65, 85, 0.5)' }}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? 'Saving...' : existingCert ? 'Update Certificate' : 'Save Certificate'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// =============================================================================
// CERTIFICATE VIEWER MODAL
// =============================================================================

function CertificateViewerModal({
  certification,
  onClose,
}: {
  certification: WorkerCertification;
  onClose: () => void;
}) {
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUrl = async () => {
      try {
        const supabase = getSupabase();
        const path = certification.certificate_file_path || certification.certificate_image_path;
        
        if (!path) {
          setLoading(false);
          return;
        }

        const { data } = await supabase.storage
          .from('certifications')
          .createSignedUrl(path, 3600);

        if (data) {
          setFileUrl(data.signedUrl);
        }
      } catch (err) {
        console.error('Error fetching file URL:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchUrl();
  }, [certification]);

  const handleDownload = () => {
    if (fileUrl) {
      window.open(fileUrl, '_blank');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80" onClick={onClose}>
      <div
        className="bg-slate-900 border border-slate-700 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h2 className="text-lg font-semibold text-white">
              Certificate: {certification.certification_type?.certification_name}
            </h2>
          </div>
          <button
            onClick={handleDownload}
            className="btn text-sm flex items-center gap-2"
            style={{ background: 'rgba(51, 65, 85, 0.5)' }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6 bg-slate-950 flex items-center justify-center min-h-[400px]">
          {loading ? (
            <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          ) : fileUrl ? (
            certification.file_type === 'pdf' ? (
              <iframe src={fileUrl} className="w-full h-[60vh] rounded" />
            ) : (
              <img src={fileUrl} alt="Certificate" className="max-w-full max-h-[60vh] object-contain rounded" />
            )
          ) : (
            <div className="text-center text-slate-400">
              <span className="text-4xl block mb-2">📄</span>
              No file available
            </div>
          )}
        </div>

        {/* Details */}
        <div className="px-6 py-4 border-t border-slate-700 bg-slate-900">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-slate-500">Certificate #</p>
              <p className="text-white font-mono">{certification.certificate_number || '-'}</p>
            </div>
            <div>
              <p className="text-slate-500">Issued</p>
              <p className="text-white">{new Date(certification.issue_date).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-slate-500">Expires</p>
              <p className="text-white">{certification.expiry_date ? new Date(certification.expiry_date).toLocaleDateString() : 'Never'}</p>
            </div>
            <div>
              <p className="text-slate-500">Verified</p>
              <p className="text-white">
                {certification.verified_at
                  ? `Yes (${new Date(certification.verified_at).toLocaleDateString()})`
                  : 'No'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
