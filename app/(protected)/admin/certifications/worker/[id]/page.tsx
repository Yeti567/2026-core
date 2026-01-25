'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  CERTIFICATION_STATUS_LABELS,
  TRAINING_CATEGORIES,
  COMPETENCY_LEVELS,
  type CertificationStatus,
  type TrainingCategory,
} from '@/lib/certifications/types';

// =============================================================================
// TYPES
// =============================================================================

interface Worker {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  position: string | null;
  department: string | null;
  supervisor_id: string | null;
  certification_status: string;
  has_active_restrictions: boolean;
}

interface Certification {
  id: string;
  name: string;
  issuing_organization: string | null;
  certificate_number: string | null;
  issue_date: string | null;
  expiry_date: string | null;
  file_path: string | null;
  file_type: string | null;
  file_name: string | null;
  status: CertificationStatus;
  verified: boolean;
  notes: string | null;
  certification_type: {
    id: string;
    name: string;
    short_code: string | null;
    required_for_work: boolean;
  } | null;
}

interface TrainingRecord {
  id: string;
  title: string;
  category: TrainingCategory;
  completed_date: string;
  hours_completed: number | null;
  instructor_name: string | null;
  competency_level: string | null;
  verified: boolean;
  training_type: {
    id: string;
    name: string;
  } | null;
}

interface Summary {
  totalCertifications: number;
  activeCertifications: number;
  expiringIn30Days: number;
  expiredCertifications: number;
  trainingHoursThisYear: number;
  trainingSessionsThisYear: number;
  activeRestrictions: number;
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
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [trainingRecords, setTrainingRecords] = useState<TrainingRecord[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [activeTab, setActiveTab] = useState<'certifications' | 'training'>('certifications');
  
  // Modal states
  const [showAddCert, setShowAddCert] = useState(false);
  const [showAddTraining, setShowAddTraining] = useState(false);
  const [uploadingCertId, setUploadingCertId] = useState<string | null>(null);
  const [viewingFileUrl, setViewingFileUrl] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // =============================================================================
  // FETCH DATA
  // =============================================================================

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/workers/${workerId}/certifications`);
      if (!res.ok) {
        if (res.status === 404) {
          router.push('/admin/certifications');
          return;
        }
        throw new Error('Failed to fetch data');
      }
      const data = await res.json();
      setWorker(data.worker);
      setCertifications(data.certifications || []);
      setTrainingRecords(data.trainingRecords || []);
      setSummary(data.summary);
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
  // HANDLERS
  // =============================================================================

  const handleFileUpload = async (certId: string, file: File) => {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch(`/api/certifications/${certId}/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'Upload failed');
        return;
      }

      await fetchData();
    } catch (err) {
      console.error('Upload error:', err);
      alert('Failed to upload file');
    } finally {
      setUploadingCertId(null);
    }
  };

  const handleViewFile = async (certId: string) => {
    try {
      const res = await fetch(`/api/certifications/${certId}/upload`);
      if (!res.ok) {
        alert('Failed to load file');
        return;
      }
      const data = await res.json();
      setViewingFileUrl(data.url);
    } catch (err) {
      console.error('View file error:', err);
    }
  };

  const handleVerifyCert = async (certId: string, verified: boolean) => {
    try {
      const res = await fetch(`/api/certifications/${certId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verified }),
      });

      if (!res.ok) {
        alert('Failed to update verification status');
        return;
      }

      await fetchData();
    } catch (err) {
      console.error('Verify error:', err);
    }
  };

  // =============================================================================
  // HELPER FUNCTIONS
  // =============================================================================

  const getExpiryStatus = (expiryDate: string | null) => {
    if (!expiryDate) return { label: 'No Expiry', color: 'slate' };
    
    const today = new Date();
    const expiry = new Date(expiryDate);
    const daysUntil = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntil <= 0) return { label: 'Expired', color: 'red' };
    if (daysUntil <= 7) return { label: `${daysUntil}d left`, color: 'red' };
    if (daysUntil <= 30) return { label: `${daysUntil}d left`, color: 'amber' };
    if (daysUntil <= 60) return { label: `${daysUntil}d left`, color: 'blue' };
    return { label: expiry.toLocaleDateString(), color: 'slate' };
  };

  const getStatusBadgeClasses = (color: string) => {
    const classes: Record<string, string> = {
      red: 'bg-red-500/20 text-red-400',
      amber: 'bg-amber-500/20 text-amber-400',
      blue: 'bg-blue-500/20 text-blue-400',
      emerald: 'bg-emerald-500/20 text-emerald-400',
      slate: 'bg-slate-500/20 text-slate-400',
    };
    // Safe: color is a typed parameter with fallback, not arbitrary user input
    // eslint-disable-next-line security/detect-object-injection
    return classes[color] || classes.slate;
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
          <Link href="/admin/certifications" className="btn btn-primary">
            Back to Certifications
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Header */}
      <div className="border-b border-slate-800/50 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <Link
            href="/admin/certifications?tab=workers"
            className="text-slate-500 hover:text-slate-300 text-sm flex items-center gap-1 mb-2 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Workers
          </Link>

          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 text-xl font-bold">
                {worker.first_name?.[0]}{worker.last_name?.[0]}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">
                  {worker.first_name} {worker.last_name}
                </h1>
                <div className="flex items-center gap-3 text-sm text-slate-400">
                  {worker.position && <span>{worker.position}</span>}
                  {worker.department && <span>• {worker.department}</span>}
                  {worker.email && <span>• {worker.email}</span>}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {worker.has_active_restrictions && (
                <span className="badge badge-red flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  Work Restricted
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="card text-center">
              <p className="text-3xl font-bold text-emerald-400">{summary.activeCertifications}</p>
              <p className="text-sm text-slate-400">Active Certs</p>
            </div>
            <div className="card text-center">
              <p className="text-3xl font-bold text-amber-400">{summary.expiringIn30Days}</p>
              <p className="text-sm text-slate-400">Expiring Soon</p>
            </div>
            <div className="card text-center">
              <p className="text-3xl font-bold text-red-400">{summary.expiredCertifications}</p>
              <p className="text-sm text-slate-400">Expired</p>
            </div>
            <div className="card text-center">
              <p className="text-3xl font-bold text-indigo-400">{summary.trainingHoursThisYear.toFixed(1)}</p>
              <p className="text-sm text-slate-400">Training Hours (YTD)</p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('certifications')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'certifications'
                ? 'bg-indigo-500 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            Certifications ({certifications.length})
          </button>
          <button
            onClick={() => setActiveTab('training')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'training'
                ? 'bg-indigo-500 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            Training Records ({trainingRecords.length})
          </button>
        </div>

        {/* Certifications Tab */}
        {activeTab === 'certifications' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-white">Certifications</h2>
              <button
                onClick={() => setShowAddCert(true)}
                className="btn btn-primary flex items-center gap-2 text-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Certification
              </button>
            </div>

            {certifications.length === 0 ? (
              <div className="card text-center py-12">
                <span className="text-4xl mb-4 block">📄</span>
                <p className="text-slate-400">No certifications recorded yet</p>
                <button
                  onClick={() => setShowAddCert(true)}
                  className="btn btn-primary mt-4"
                >
                  Add First Certification
                </button>
              </div>
            ) : (
              <div className="grid gap-4">
                {certifications.map(cert => {
                  const expiryStatus = getExpiryStatus(cert.expiry_date);
                  
                  return (
                    <div
                      key={cert.id}
                      className={`card p-4 ${
                        cert.status === 'expired' ? 'border-red-500/30' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold text-white">{cert.name}</h3>
                            {cert.certification_type?.required_for_work && (
                              <span className="text-xs px-2 py-0.5 rounded bg-red-500/20 text-red-400">
                                Required
                              </span>
                            )}
                            {cert.verified && (
                              <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 flex items-center gap-1">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                Verified
                              </span>
                            )}
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <p className="text-slate-500">Issuing Organization</p>
                              <p className="text-slate-300">{cert.issuing_organization || '-'}</p>
                            </div>
                            <div>
                              <p className="text-slate-500">Certificate #</p>
                              <p className="text-slate-300">{cert.certificate_number || '-'}</p>
                            </div>
                            <div>
                              <p className="text-slate-500">Issue Date</p>
                              <p className="text-slate-300">
                                {cert.issue_date ? new Date(cert.issue_date).toLocaleDateString() : '-'}
                              </p>
                            </div>
                            <div>
                              <p className="text-slate-500">Expiry Date</p>
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusBadgeClasses(expiryStatus.color)}`}>
                                {expiryStatus.label}
                              </span>
                            </div>
                          </div>

                          {cert.notes && (
                            <p className="mt-3 text-sm text-slate-400 bg-slate-800/50 rounded p-2">
                              {cert.notes}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-2 ml-4">
                          {/* File Upload/View */}
                          {cert.file_path ? (
                            <button
                              onClick={() => handleViewFile(cert.id)}
                              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                              title="View File"
                            >
                              {cert.file_type === 'pdf' ? (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                </svg>
                              ) : (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                              )}
                            </button>
                          ) : (
                            <label className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer" title="Upload File">
                              <input
                                type="file"
                                accept="image/*,application/pdf"
                                className="hidden"
                                onChange={e => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    setUploadingCertId(cert.id);
                                    handleFileUpload(cert.id, file);
                                  }
                                }}
                              />
                              {uploadingCertId === cert.id ? (
                                <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                </svg>
                              )}
                            </label>
                          )}

                          {/* Verify Button */}
                          {!cert.verified && (
                            <button
                              onClick={() => handleVerifyCert(cert.id, true)}
                              className="p-2 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 transition-colors"
                              title="Mark as Verified"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            </button>
                          )}

                          {/* Edit Button */}
                          <Link
                            href={`/admin/certifications/${cert.id}`}
                            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                            title="Edit"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Training Tab */}
        {activeTab === 'training' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-white">Training Records</h2>
              <button
                onClick={() => setShowAddTraining(true)}
                className="btn btn-primary flex items-center gap-2 text-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Training Record
              </button>
            </div>

            {trainingRecords.length === 0 ? (
              <div className="card text-center py-12">
                <span className="text-4xl mb-4 block">📝</span>
                <p className="text-slate-400">No training records yet</p>
                <button
                  onClick={() => setShowAddTraining(true)}
                  className="btn btn-primary mt-4"
                >
                  Add First Training Record
                </button>
              </div>
            ) : (
              <div className="card p-0 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700/50 bg-slate-800/30">
                      <th className="py-3 px-4 text-left text-slate-400 font-medium">Training</th>
                      <th className="py-3 px-4 text-left text-slate-400 font-medium">Category</th>
                      <th className="py-3 px-4 text-left text-slate-400 font-medium">Date</th>
                      <th className="py-3 px-4 text-left text-slate-400 font-medium">Hours</th>
                      <th className="py-3 px-4 text-left text-slate-400 font-medium">Instructor</th>
                      <th className="py-3 px-4 text-center text-slate-400 font-medium">Verified</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trainingRecords.map(record => (
                      <tr key={record.id} className="border-b border-slate-700/30 hover:bg-slate-800/30 transition-colors">
                        <td className="py-3 px-4">
                          <p className="font-medium text-white">{record.title}</p>
                          {record.training_type && (
                            <p className="text-xs text-slate-500">{record.training_type.name}</p>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-700 text-slate-300">
                            {TRAINING_CATEGORIES.find(c => c.value === record.category)?.label || record.category}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-300">
                          {new Date(record.completed_date).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 text-slate-300">
                          {record.hours_completed ? `${record.hours_completed}h` : '-'}
                        </td>
                        <td className="py-3 px-4 text-slate-300">
                          {record.instructor_name || '-'}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {record.verified ? (
                            <span className="text-emerald-400">✓</span>
                          ) : (
                            <span className="text-slate-500">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add Certification Modal */}
      {showAddCert && (
        <AddCertificationModal
          workerId={workerId}
          onClose={() => setShowAddCert(false)}
          onSuccess={() => {
            setShowAddCert(false);
            fetchData();
          }}
        />
      )}

      {/* Add Training Modal */}
      {showAddTraining && (
        <AddTrainingModal
          workerId={workerId}
          onClose={() => setShowAddTraining(false)}
          onSuccess={() => {
            setShowAddTraining(false);
            fetchData();
          }}
        />
      )}

      {/* File Viewer Modal */}
      {viewingFileUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80"
          onClick={() => setViewingFileUrl(null)}
        >
          <div
            className="bg-slate-900 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center p-4 border-b border-slate-700">
              <h3 className="font-semibold text-white">Certificate File</h3>
              <button
                onClick={() => setViewingFileUrl(null)}
                className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4 flex items-center justify-center bg-slate-950" style={{ height: '70vh' }}>
              {viewingFileUrl.includes('.pdf') ? (
                <iframe src={viewingFileUrl} className="w-full h-full" />
              ) : (
                <img src={viewingFileUrl} alt="Certificate" className="max-w-full max-h-full object-contain" />
              )}
            </div>
            <div className="p-4 border-t border-slate-700 flex justify-end gap-2">
              <a
                href={viewingFileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn"
                style={{ background: 'rgba(51, 65, 85, 0.5)' }}
              >
                Open in New Tab
              </a>
              <button
                onClick={() => setViewingFileUrl(null)}
                className="btn btn-primary"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

// =============================================================================
// ADD CERTIFICATION MODAL
// =============================================================================

function AddCertificationModal({
  workerId,
  onClose,
  onSuccess,
}: {
  workerId: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [certTypes, setCertTypes] = useState<Array<{ id: string; name: string; default_expiry_months: number | null }>>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    certification_type_id: '',
    name: '',
    issuing_organization: '',
    certificate_number: '',
    issue_date: '',
    expiry_date: '',
    notes: '',
  });

  useEffect(() => {
    fetch('/api/certifications/types')
      .then(res => res.json())
      .then(data => setCertTypes(data.types || []));
  }, []);

  const handleTypeChange = (typeId: string) => {
    const type = certTypes.find(t => t.id === typeId);
    setForm(prev => ({
      ...prev,
      certification_type_id: typeId,
      name: type?.name || prev.name,
    }));

    // Auto-calculate expiry date if issue date is set
    if (form.issue_date && type?.default_expiry_months) {
      const issueDate = new Date(form.issue_date);
      issueDate.setMonth(issueDate.getMonth() + type.default_expiry_months);
      setForm(prev => ({
        ...prev,
        expiry_date: issueDate.toISOString().split('T')[0],
      }));
    }
  };

  const handleIssueDateChange = (date: string) => {
    setForm(prev => ({ ...prev, issue_date: date }));
    
    // Auto-calculate expiry date
    const type = certTypes.find(t => t.id === form.certification_type_id);
    if (date && type?.default_expiry_months) {
      const issueDate = new Date(date);
      issueDate.setMonth(issueDate.getMonth() + type.default_expiry_months);
      setForm(prev => ({
        ...prev,
        expiry_date: issueDate.toISOString().split('T')[0],
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) {
      alert('Name is required');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/certifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          worker_id: workerId,
          ...form,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'Failed to create certification');
        return;
      }

      onSuccess();
    } catch (err) {
      console.error('Create error:', err);
      alert('Failed to create certification');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-xl font-semibold text-white mb-6">Add Certification</h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Certification Type</label>
              <select
                className="input"
                value={form.certification_type_id}
                onChange={e => handleTypeChange(e.target.value)}
              >
                <option value="">Select or enter custom...</option>
                {certTypes.map(type => (
                  <option key={type.id} value={type.id}>{type.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Certification Name *</label>
              <input
                type="text"
                className="input"
                value={form.name}
                onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Working at Heights"
                required
              />
            </div>

            <div>
              <label className="label">Issuing Organization</label>
              <input
                type="text"
                className="input"
                value={form.issuing_organization}
                onChange={e => setForm(prev => ({ ...prev, issuing_organization: e.target.value }))}
                placeholder="e.g., Ontario Safety Training"
              />
            </div>

            <div>
              <label className="label">Certificate Number</label>
              <input
                type="text"
                className="input"
                value={form.certificate_number}
                onChange={e => setForm(prev => ({ ...prev, certificate_number: e.target.value }))}
                placeholder="e.g., WAH-2024-12345"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Issue Date</label>
                <input
                  type="date"
                  className="input"
                  value={form.issue_date}
                  onChange={e => handleIssueDateChange(e.target.value)}
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
              </div>
            </div>

            <div>
              <label className="label">Notes</label>
              <textarea
                className="input"
                rows={3}
                value={form.notes}
                onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Any additional notes..."
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="btn"
                style={{ background: 'rgba(51, 65, 85, 0.5)' }}
                disabled={loading}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Creating...' : 'Add Certification'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// ADD TRAINING MODAL
// =============================================================================

function AddTrainingModal({
  workerId,
  onClose,
  onSuccess,
}: {
  workerId: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [trainingTypes, setTrainingTypes] = useState<Array<{ id: string; name: string; category: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    training_type_id: '',
    title: '',
    category: 'toolbox_talk' as TrainingCategory,
    completed_date: new Date().toISOString().split('T')[0],
    hours_completed: '',
    instructor_name: '',
    notes: '',
  });

  useEffect(() => {
    fetch('/api/training/types')
      .then(res => res.json())
      .then(data => setTrainingTypes(data.types || []));
  }, []);

  const handleTypeChange = (typeId: string) => {
    const type = trainingTypes.find(t => t.id === typeId);
    setForm(prev => ({
      ...prev,
      training_type_id: typeId,
      title: type?.name || prev.title,
      category: (type?.category as TrainingCategory) || prev.category,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title) {
      alert('Title is required');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/training', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          worker_id: workerId,
          ...form,
          hours_completed: form.hours_completed ? parseFloat(form.hours_completed) : null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'Failed to create training record');
        return;
      }

      onSuccess();
    } catch (err) {
      console.error('Create error:', err);
      alert('Failed to create training record');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-xl font-semibold text-white mb-6">Add Training Record</h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Training Type</label>
              <select
                className="input"
                value={form.training_type_id}
                onChange={e => handleTypeChange(e.target.value)}
              >
                <option value="">Select or enter custom...</option>
                {trainingTypes.map(type => (
                  <option key={type.id} value={type.id}>{type.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Title *</label>
              <input
                type="text"
                className="input"
                value={form.title}
                onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))}
                placeholder="e.g., Weekly Safety Toolbox Talk"
                required
              />
            </div>

            <div>
              <label className="label">Category *</label>
              <select
                className="input"
                value={form.category}
                onChange={e => setForm(prev => ({ ...prev, category: e.target.value as TrainingCategory }))}
                required
              >
                {TRAINING_CATEGORIES.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Date Completed *</label>
                <input
                  type="date"
                  className="input"
                  value={form.completed_date}
                  onChange={e => setForm(prev => ({ ...prev, completed_date: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="label">Hours</label>
                <input
                  type="number"
                  step="0.5"
                  className="input"
                  value={form.hours_completed}
                  onChange={e => setForm(prev => ({ ...prev, hours_completed: e.target.value }))}
                  placeholder="e.g., 2.5"
                />
              </div>
            </div>

            <div>
              <label className="label">Instructor/Supervisor Name</label>
              <input
                type="text"
                className="input"
                value={form.instructor_name}
                onChange={e => setForm(prev => ({ ...prev, instructor_name: e.target.value }))}
                placeholder="e.g., John Smith"
              />
            </div>

            <div>
              <label className="label">Notes</label>
              <textarea
                className="input"
                rows={3}
                value={form.notes}
                onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Topics covered, observations, etc..."
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="btn"
                style={{ background: 'rgba(51, 65, 85, 0.5)' }}
                disabled={loading}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Creating...' : 'Add Record'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
