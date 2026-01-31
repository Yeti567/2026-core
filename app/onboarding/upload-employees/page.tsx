'use client';

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Papa from 'papaparse';
import {
  validateCSV,
  validateHeaders,
  downloadCSVTemplate,
  normalizeRole,
  formatPhone,
  type CSVRow,
  type ParsedRow,
  type UploadResult,
  VALID_ROLES,
} from '@/lib/validation/csv';

interface SendingProgress {
  current: number;
  total: number;
  status: 'idle' | 'sending' | 'complete' | 'error';
  results: {
    success: number;
    failed: number;
    errors: string[];
  };
}

function UploadEmployeesContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const isWelcome = searchParams.get('welcome') === 'true';
  const companyName = searchParams.get('company') || 'your company';
  
  const [showWelcome, setShowWelcome] = useState(isWelcome);
  const [dragActive, setDragActive] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [existingEmails, setExistingEmails] = useState<string[]>([]);
  const [sendingProgress, setSendingProgress] = useState<SendingProgress>({
    current: 0,
    total: 0,
    status: 'idle',
    results: { success: 0, failed: 0, errors: [] },
  });

  // Auto-hide welcome message
  useEffect(() => {
    if (isWelcome) {
      const timer = setTimeout(() => setShowWelcome(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [isWelcome]);

  // Fetch existing emails on mount
  useEffect(() => {
    async function fetchExistingEmails() {
      try {
        const response = await fetch('/api/workers/emails');
        if (response.ok) {
          const data = await response.json();
          setExistingEmails(data.emails || []);
        }
      } catch (err) {
        console.error('Failed to fetch existing emails:', err);
      }
    }
    fetchExistingEmails();
  }, []);

  // Handle file parsing
  const parseFile = useCallback((file: File) => {
    setParseError(null);
    setUploadResult(null);
    setSendingProgress({ current: 0, total: 0, status: 'idle', results: { success: 0, failed: 0, errors: [] } });

    if (!file.name.toLowerCase().endsWith('.csv')) {
      setParseError('Please upload a CSV file');
      return;
    }

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.toLowerCase().trim(),
      complete: (results) => {
        // Validate headers
        const headerErrors = validateHeaders(results.meta.fields || []);
        if (headerErrors.length > 0) {
          setParseError(headerErrors.join('. '));
          return;
        }

        // Validate rows
        const rows = results.data as CSVRow[];
        const validation = validateCSV(rows, existingEmails);
        setUploadResult(validation);
      },
      error: (error) => {
        setParseError(`Failed to parse CSV: ${error.message}`);
      },
    });
  }, [existingEmails]);

  // Drag and drop handlers
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const file = e.dataTransfer.files[0];
    if (file) parseFile(file);
  }, [parseFile]);

  // Remove a row from results
  const removeRow = (rowNumber: number) => {
    if (!uploadResult) return;
    
    const newRows = uploadResult.rows.filter(r => r.rowNumber !== rowNumber);
    const valid = newRows.filter(r => r.isValid).length;
    const invalid = newRows.filter(r => !r.isValid).length;
    
    setUploadResult({
      ...uploadResult,
      rows: newRows,
      total: newRows.length,
      valid,
      invalid,
    });
  };

  // Send invitations
  const sendInvitations = async () => {
    if (!uploadResult) return;
    
    const validRows = uploadResult.rows.filter(r => r.isValid);
    if (validRows.length === 0) return;

    setSendingProgress({
      current: 0,
      total: validRows.length,
      status: 'sending',
      results: { success: 0, failed: 0, errors: [] },
    });

    try {
      const response = await fetch('/api/invitations/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employees: validRows.map(r => ({
            firstName: r.data.first_name.trim(),
            lastName: r.data.last_name.trim(),
            email: r.data.email.toLowerCase().trim(),
            position: r.data.position.trim(),
            role: normalizeRole(r.data.role),
            phone: r.data.phone ? formatPhone(r.data.phone) : undefined,
            hireDate: r.data.hire_date?.trim() || undefined,
          })),
        }),
      });

      const result = await response.json();

      setSendingProgress({
        current: validRows.length,
        total: validRows.length,
        status: 'complete',
        results: {
          success: result.success || 0,
          failed: result.failed || 0,
          errors: result.errors || [],
        },
      });

      // Redirect to admin employees page after short delay if successful
      if (result.success > 0 && result.failed === 0) {
        setTimeout(() => {
          router.push('/admin/employees');
        }, 2000);
      }
    } catch (err) {
      setSendingProgress(prev => ({
        ...prev,
        status: 'error',
        results: {
          ...prev.results,
          errors: ['Network error. Please try again.'],
        },
      }));
    }
  };

  // Reset to upload new file
  const resetUpload = () => {
    setUploadResult(null);
    setParseError(null);
    setSendingProgress({ current: 0, total: 0, status: 'idle', results: { success: 0, failed: 0, errors: [] } });
  };

  const validCount = uploadResult?.valid || 0;
  const invalidCount = uploadResult?.invalid || 0;
  const totalCount = uploadResult?.total || 0;

  return (
    <main className="min-h-screen py-12 px-4 bg-[#080a0c]">
      <div className="max-w-5xl mx-auto">
        {/* Welcome banner */}
        {showWelcome && (
          <div className="mb-8 p-6 rounded-xl bg-gradient-to-r from-emerald-500/10 to-emerald-600/10 border border-emerald-500/20 animate-slide-down">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-emerald-400 mb-1">Welcome to COR 2026!</h2>
                <p className="text-[#8b949e]">
                  <strong className="text-white">{decodeURIComponent(companyName)}</strong> has been registered. 
                  Now add your team members to get started.
                </p>
              </div>
              <button onClick={() => setShowWelcome(false)} className="text-[#8b949e] hover:text-white">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link href="/admin" className="text-[#8b949e] hover:text-white text-sm flex items-center gap-1 mb-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Admin
            </Link>
            <h1 className="text-2xl font-semibold text-white">Bulk Employee Upload</h1>
            <p className="text-[#8b949e] mt-1">Import employees from a CSV file to send invitations</p>
          </div>
          
          <button
            onClick={downloadCSVTemplate}
            className="flex items-center gap-2 py-2 px-4 rounded-lg bg-[#21262d] text-white text-sm font-medium hover:bg-[#30363d] transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download Template
          </button>
        </div>

        {/* Sending Progress */}
        {sendingProgress.status !== 'idle' && (
          <div className={`mb-6 p-6 rounded-xl border ${
            sendingProgress.status === 'complete' && sendingProgress.results.failed === 0
              ? 'bg-emerald-500/10 border-emerald-500/20'
              : sendingProgress.status === 'error' || sendingProgress.results.failed > 0
              ? 'bg-red-500/10 border-red-500/20'
              : 'bg-[#161b22] border-[#21262d]'
          }`}>
            {sendingProgress.status === 'sending' && (
              <div className="flex items-center gap-4">
                <div className="w-8 h-8 border-2 border-[#238636] border-t-transparent rounded-full animate-spin" />
                <div>
                  <p className="font-medium text-white">Sending invitations...</p>
                  <p className="text-sm text-[#8b949e]">
                    {sendingProgress.current} / {sendingProgress.total} complete
                  </p>
                </div>
              </div>
            )}
            
            {sendingProgress.status === 'complete' && (
              <div>
                <div className="flex items-center gap-3 mb-2">
                  {sendingProgress.results.failed === 0 ? (
                    <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-6 h-6 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  )}
                  <p className="font-medium text-white">
                    {sendingProgress.results.failed === 0
                      ? `✅ ${sendingProgress.results.success} invitation${sendingProgress.results.success !== 1 ? 's' : ''} sent successfully`
                      : `⚠️ ${sendingProgress.results.success} sent, ${sendingProgress.results.failed} failed`}
                  </p>
                </div>
                
                {sendingProgress.results.errors.length > 0 && (
                  <ul className="mt-3 space-y-1 text-sm text-red-400">
                    {sendingProgress.results.errors.slice(0, 5).map((err, i) => (
                      <li key={i}>• {err}</li>
                    ))}
                    {sendingProgress.results.errors.length > 5 && (
                      <li className="text-[#8b949e]">...and {sendingProgress.results.errors.length - 5} more</li>
                    )}
                  </ul>
                )}

                {sendingProgress.results.failed === 0 && (
                  <p className="text-sm text-[#8b949e] mt-2">Redirecting to employee list...</p>
                )}
              </div>
            )}

            {sendingProgress.status === 'error' && (
              <div className="flex items-center gap-3">
                <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                <p className="font-medium text-red-400">Failed to send invitations. Please try again.</p>
              </div>
            )}
          </div>
        )}

        {/* Upload Area - Only show when no results */}
        {!uploadResult && sendingProgress.status === 'idle' && (
          <div className="bg-[#0d1117] border border-[#21262d] rounded-xl p-8 mb-8">
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all ${
                dragActive
                  ? 'border-[#238636] bg-[#238636]/5'
                  : 'border-[#30363d] hover:border-[#8b949e]'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && parseFile(e.target.files[0])}
              />
              
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#238636]/10 flex items-center justify-center">
                <svg className="w-8 h-8 text-[#238636]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              
              <p className="text-lg font-medium text-white mb-1">Drop your CSV file here</p>
              <p className="text-[#8b949e] text-sm mb-4">or click to browse</p>
              
              <p className="text-xs text-[#8b949e]">
                Supported format: .csv with columns: first_name, last_name, email, position, role
              </p>
            </div>

            {parseError && (
              <div className="mt-4 p-4 rounded-lg bg-red-500/10 border border-red-500/20">
                <p className="text-red-400 text-sm">{parseError}</p>
              </div>
            )}

            {/* Format Info */}
            <div className="mt-6 p-4 rounded-lg bg-[#161b22] border border-[#21262d]">
              <h3 className="font-medium text-white mb-3 flex items-center gap-2">
                <svg className="w-4 h-4 text-[#58a6ff]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                CSV Column Format
              </h3>
              <div className="grid grid-cols-2 gap-6 text-sm">
                <div>
                  <p className="text-[#8b949e] mb-2">Required columns:</p>
                  <ul className="space-y-1 text-[#c9d1d9]">
                    <li><code className="text-[#238636]">first_name</code> - Employee first name</li>
                    <li><code className="text-[#238636]">last_name</code> - Employee last name</li>
                    <li><code className="text-[#238636]">email</code> - Must be unique</li>
                    <li><code className="text-[#238636]">position</code> - Job title</li>
                    <li><code className="text-[#238636]">role</code> - {VALID_ROLES.join(', ')}</li>
                  </ul>
                </div>
                <div>
                  <p className="text-[#8b949e] mb-2">Optional columns:</p>
                  <ul className="space-y-1 text-[#c9d1d9]">
                    <li><code className="text-[#8b949e]">phone</code> - Format: (123) 456-7890</li>
                    <li><code className="text-[#8b949e]">hire_date</code> - Format: YYYY-MM-DD</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Preview Table */}
        {uploadResult && uploadResult.rows.length > 0 && sendingProgress.status === 'idle' && (
          <div className="bg-[#0d1117] border border-[#21262d] rounded-xl overflow-hidden">
            {/* Table Header */}
            <div className="px-6 py-4 border-b border-[#21262d] flex items-center justify-between">
              <div>
                <h2 className="font-medium text-white">Preview ({totalCount} employees)</h2>
                <p className="text-sm text-[#8b949e]">
                  <span className="text-emerald-400">{validCount} valid</span>
                  {invalidCount > 0 && <span className="text-red-400"> · {invalidCount} with errors</span>}
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={resetUpload}
                  className="py-2 px-4 rounded-lg bg-[#21262d] text-white text-sm font-medium hover:bg-[#30363d] transition-colors"
                >
                  Upload Different File
                </button>
                <button
                  onClick={sendInvitations}
                  disabled={validCount === 0}
                  className="py-2 px-4 rounded-lg bg-[#238636] text-white text-sm font-medium hover:bg-[#2ea043] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Send {validCount} Invitation{validCount !== 1 ? 's' : ''}
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#161b22]">
                    <th className="py-3 px-4 text-left text-[#8b949e] font-medium">#</th>
                    <th className="py-3 px-4 text-left text-[#8b949e] font-medium">Name</th>
                    <th className="py-3 px-4 text-left text-[#8b949e] font-medium">Email</th>
                    <th className="py-3 px-4 text-left text-[#8b949e] font-medium">Position</th>
                    <th className="py-3 px-4 text-left text-[#8b949e] font-medium">Role</th>
                    <th className="py-3 px-4 text-left text-[#8b949e] font-medium">Phone</th>
                    <th className="py-3 px-4 text-left text-[#8b949e] font-medium">Status</th>
                    <th className="py-3 px-4"></th>
                  </tr>
                </thead>
                <tbody>
                  {uploadResult.rows.map((row) => (
                    <tr
                      key={row.rowNumber}
                      className={`border-t border-[#21262d] ${
                        !row.isValid ? 'bg-red-500/5' : ''
                      }`}
                    >
                      <td className="py-3 px-4 text-[#8b949e]">{row.rowNumber}</td>
                      <td className="py-3 px-4 text-white">
                        {row.data.first_name} {row.data.last_name}
                        {row.errors.some(e => e.field === 'first_name' || e.field === 'last_name') && (
                          <p className="text-xs text-red-400 mt-1">
                            {row.errors.filter(e => e.field === 'first_name' || e.field === 'last_name').map(e => e.message).join(', ')}
                          </p>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className={row.errors.some(e => e.field === 'email') ? 'text-red-400' : 'text-[#8b949e]'}>
                          {row.data.email || '-'}
                        </span>
                        {row.errors.some(e => e.field === 'email') && (
                          <p className="text-xs text-red-400 mt-1">
                            {row.errors.filter(e => e.field === 'email').map(e => e.message).join(', ')}
                          </p>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className={row.errors.some(e => e.field === 'position') ? 'text-red-400' : 'text-[#8b949e]'}>
                          {row.data.position || '-'}
                        </span>
                        {row.errors.some(e => e.field === 'position') && (
                          <p className="text-xs text-red-400 mt-1">Required</p>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          row.errors.some(e => e.field === 'role')
                            ? 'bg-red-500/20 text-red-400'
                            : row.data.role === 'admin'
                            ? 'bg-purple-500/20 text-purple-400'
                            : row.data.role === 'internal_auditor'
                            ? 'bg-blue-500/20 text-blue-400'
                            : row.data.role === 'supervisor'
                            ? 'bg-amber-500/20 text-amber-400'
                            : 'bg-[#21262d] text-[#8b949e]'
                        }`}>
                          {row.data.role || '-'}
                        </span>
                        {row.errors.some(e => e.field === 'role') && (
                          <p className="text-xs text-red-400 mt-1">
                            {row.errors.filter(e => e.field === 'role').map(e => e.message).join(', ')}
                          </p>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className={row.errors.some(e => e.field === 'phone') ? 'text-red-400' : 'text-[#8b949e]'}>
                          {row.data.phone || '-'}
                        </span>
                        {row.errors.some(e => e.field === 'phone') && (
                          <p className="text-xs text-red-400 mt-1">Invalid format</p>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {row.isValid ? (
                          <span className="inline-flex items-center gap-1 text-emerald-400 text-xs">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Valid
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-red-400 text-xs">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            {row.errors.length} error{row.errors.length !== 1 ? 's' : ''}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => removeRow(row.rowNumber)}
                          className="text-[#8b949e] hover:text-red-400 transition-colors"
                          title="Remove row"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Skip option */}
        {sendingProgress.status === 'idle' && (
          <div className="mt-8 text-center">
            <Link
              href="/audit"
              className="text-[#8b949e] hover:text-white text-sm"
            >
              Skip for now → Go to Dashboard
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}

export default function UploadEmployeesPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen flex items-center justify-center bg-[#080a0c]">
        <div className="w-8 h-8 border-2 border-[#238636] border-t-transparent rounded-full animate-spin" />
      </main>
    }>
      <UploadEmployeesContent />
    </Suspense>
  );
}
