'use client';

import { useState } from 'react';
import Link from 'next/link';

// =============================================================================
// TEST CHECKLIST COMPONENT
// =============================================================================

interface TestItem {
  id: string;
  title: string;
  description: string;
  steps: string[];
  passed: boolean | null;
  notes: string;
}

interface TestSection {
  id: string;
  title: string;
  icon: string;
  tests: TestItem[];
}

export default function CertificationTestPage() {
  const [sections, setSections] = useState<TestSection[]>([
    {
      id: 'upload',
      title: 'Certificate Upload',
      icon: '📄',
      tests: [
        {
          id: 'test1',
          title: 'Add certification with PDF upload',
          description: 'Test desktop PDF upload flow',
          steps: [
            'Go to /admin/employees/[id]/certifications',
            'Click [+ Add]',
            'Select: "Working at Heights"',
            'Enter Certificate #: WAH-234567',
            'Set Issue Date: Today',
            'Verify Expiry Date auto-fills (+3 years)',
            'Upload PDF file',
            'Check "I have verified this certificate"',
            'Click [Save Certificate]',
            'Verify certificate appears with ✅ Active status',
            'Verify days remaining displays correctly',
          ],
          passed: null,
          notes: '',
        },
        {
          id: 'test2',
          title: 'Mobile photo capture',
          description: 'Test camera capture on mobile device',
          steps: [
            'Open /mobile/certifications/capture on mobile',
            'Select worker from dropdown',
            'Select certification type',
            'Camera should open',
            'Position certificate in frame',
            'Tap [Capture Photo]',
            'Verify photo preview shows',
            'Test Rotate/Crop buttons',
            'Enter cert details',
            'Save',
            'Verify photo uploaded successfully',
            'Verify thumbnail generated',
            'Verify certificate visible in worker profile',
          ],
          passed: null,
          notes: '',
        },
        {
          id: 'test10',
          title: 'Bulk upload certifications',
          description: 'Test uploading multiple certificates at once',
          steps: [
            'Go to /admin/certifications/bulk-upload',
            'Drag multiple PDF/image files',
            'For each file, assign worker and cert type',
            'Set expiry dates',
            'Click [Upload All]',
            'Verify progress shows correctly',
            'Verify all certs appear in worker profiles',
            'Verify reminders auto-scheduled',
          ],
          passed: null,
          notes: '',
        },
      ],
    },
    {
      id: 'notifications',
      title: 'Expiry Notifications',
      icon: '📧',
      tests: [
        {
          id: 'test3',
          title: '60-day expiry notification',
          description: 'Test 60-day reminder generation and sending',
          steps: [
            'Set cert expiry to 55-60 days from now',
            'Run expiry check (POST /api/certifications/notifications/check)',
            'Verify reminder created in certification_reminders',
            'Verify reminder_type = "60_day"',
            'Verify email sent to worker and supervisor',
            'Check email subject: "Reminder: [Cert] expires in 60 days"',
            'Verify HTML formatting is correct',
            'Check reminder_60_sent flag updated',
          ],
          passed: null,
          notes: '',
        },
        {
          id: 'test4',
          title: '30-day expiry notification (Important)',
          description: 'Test 30-day reminder with escalation',
          steps: [
            'Set cert expiry to 25-30 days from now',
            'Run expiry check',
            'Verify notification sent to: Worker, Supervisor, Safety Manager',
            'Check email subject: "⚠️ IMPORTANT: Expires in 30 days"',
            'Verify orange warning styling in email',
          ],
          passed: null,
          notes: '',
        },
        {
          id: 'test5',
          title: '7-day URGENT notification',
          description: 'Test urgent 7-day notification',
          steps: [
            'Set cert expiry to 5-7 days from now',
            'Run expiry check',
            'Verify notification sent to: Worker, Supervisor, Safety Manager, Internal Auditor',
            'Check email subject: "🚨 URGENT: Expires in 7 days"',
            'Verify red urgent styling in email',
            'Verify dashboard shows red flag on cert',
          ],
          passed: null,
          notes: '',
        },
        {
          id: 'test6',
          title: 'Expired certification handling',
          description: 'Test expired cert workflow',
          steps: [
            'Set cert expiry to yesterday',
            'Run expiry check',
            'Verify cert status changed to "expired"',
            'Verify worker profile shows ❌ Expired cert',
            'Verify email sent: "❌ CERTIFICATION EXPIRED - Work Restriction"',
            'Verify dashboard shows Expired count increased',
          ],
          passed: null,
          notes: '',
        },
      ],
    },
    {
      id: 'dashboard',
      title: 'Dashboard & Reports',
      icon: '📊',
      tests: [
        {
          id: 'test7',
          title: 'Expiring certs dashboard widget',
          description: 'Verify dashboard displays expiring certifications',
          steps: [
            'Go to /admin/certifications',
            'Verify stats cards show correct counts',
            'Verify "Expiring & Expired" table shows certs',
            'Verify color coding: green=active, amber=expiring, red=expired',
            'Click worker name to navigate to profile',
            'Verify export functionality works',
          ],
          passed: null,
          notes: '',
        },
        {
          id: 'test8',
          title: 'Training matrix report',
          description: 'Test training matrix generation',
          steps: [
            'Go to /admin/certifications/reports?type=matrix',
            'Verify table shows all workers vs cert types',
            'Verify color coding: ✅ Green, ⚠️ Yellow, ❌ Red, N/A Grey',
            'Test export to Excel/CSV',
          ],
          passed: null,
          notes: '',
        },
        {
          id: 'test9',
          title: 'Missing mandatory certifications',
          description: 'Test missing cert detection',
          steps: [
            'Go to worker certification page',
            'Verify "Missing Mandatory Certifications" section shows',
            'Click [Add Now] for a missing cert',
            'Verify modal pre-fills cert type',
            'Upload and save cert',
            'Verify cert removed from missing list',
          ],
          passed: null,
          notes: '',
        },
      ],
    },
  ]);

  const [expandedTest, setExpandedTest] = useState<string | null>(null);

  // =============================================================================
  // HANDLERS
  // =============================================================================

  const updateTestResult = (sectionId: string, testId: string, passed: boolean | null) => {
    setSections(prev =>
      prev.map(section =>
        section.id === sectionId
          ? {
              ...section,
              tests: section.tests.map(test =>
                test.id === testId ? { ...test, passed } : test
              ),
            }
          : section
      )
    );
  };

  const updateTestNotes = (sectionId: string, testId: string, notes: string) => {
    setSections(prev =>
      prev.map(section =>
        section.id === sectionId
          ? {
              ...section,
              tests: section.tests.map(test =>
                test.id === testId ? { ...test, notes } : test
              ),
            }
          : section
      )
    );
  };

  // Calculate totals
  const allTests = sections.flatMap(s => s.tests);
  const passedCount = allTests.filter(t => t.passed === true).length;
  const failedCount = allTests.filter(t => t.passed === false).length;
  const pendingCount = allTests.filter(t => t.passed === null).length;

  // =============================================================================
  // QUICK ACTIONS
  // =============================================================================

  const runNotificationCheck = async () => {
    try {
      const res = await fetch('/api/certifications/notifications/check', {
        method: 'POST',
      });
      const data = await res.json();
      alert(`Check complete!\n\nReminders created: ${data.remindersCreated}\nEmails sent: ${data.emailsSent}\nFailed: ${data.emailsFailed}`);
    } catch (error) {
      alert('Error running notification check');
    }
  };

  // =============================================================================
  // RENDER
  // =============================================================================

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
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                <span className="text-3xl">🧪</span>
                Certification System Test Suite
              </h1>
              <p className="text-slate-400 text-sm mt-1">
                Verify all certification features work correctly
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        {/* Summary */}
        <div className="grid grid-cols-4 gap-4">
          <div className="card bg-gradient-to-br from-slate-500/10 to-slate-600/5 border-slate-700/30">
            <p className="text-sm text-slate-400">Total Tests</p>
            <p className="text-3xl font-bold text-slate-200">{allTests.length}</p>
          </div>
          <div className="card bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border-emerald-700/30">
            <p className="text-sm text-slate-400">Passed</p>
            <p className="text-3xl font-bold text-emerald-400">{passedCount}</p>
          </div>
          <div className="card bg-gradient-to-br from-red-500/10 to-red-600/5 border-red-700/30">
            <p className="text-sm text-slate-400">Failed</p>
            <p className="text-3xl font-bold text-red-400">{failedCount}</p>
          </div>
          <div className="card bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-amber-700/30">
            <p className="text-sm text-slate-400">Pending</p>
            <p className="text-3xl font-bold text-amber-400">{pendingCount}</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card">
          <h2 className="text-lg font-semibold text-white mb-4">⚡ Quick Test Actions</h2>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/admin/employees"
              className="btn text-sm"
              style={{ background: 'rgba(51, 65, 85, 0.5)' }}
            >
              📋 Employee List
            </Link>
            <Link
              href="/admin/certifications/bulk-upload"
              className="btn text-sm"
              style={{ background: 'rgba(51, 65, 85, 0.5)' }}
            >
              📁 Bulk Upload
            </Link>
            <Link
              href="/mobile/certifications/capture"
              className="btn text-sm"
              style={{ background: 'rgba(51, 65, 85, 0.5)' }}
            >
              📸 Mobile Capture
            </Link>
            <Link
              href="/admin/certifications/reports"
              className="btn text-sm"
              style={{ background: 'rgba(51, 65, 85, 0.5)' }}
            >
              📊 Reports
            </Link>
            <button
              onClick={runNotificationCheck}
              className="btn btn-primary text-sm"
            >
              🔔 Run Notification Check
            </button>
          </div>
        </div>

        {/* Test Sections */}
        {sections.map(section => (
          <div key={section.id} className="card">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <span className="text-2xl">{section.icon}</span>
              {section.title}
              <span className="ml-auto text-sm font-normal text-slate-400">
                {section.tests.filter(t => t.passed === true).length}/{section.tests.length} passed
              </span>
            </h2>

            <div className="space-y-3">
              {section.tests.map(test => (
                <div
                  key={test.id}
                  className={`p-4 rounded-lg border transition-all ${
                    test.passed === true
                      ? 'bg-emerald-500/5 border-emerald-500/30'
                      : test.passed === false
                      ? 'bg-red-500/5 border-red-500/30'
                      : 'bg-slate-800/50 border-slate-700/50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div
                      className="flex-1 cursor-pointer"
                      onClick={() => setExpandedTest(expandedTest === test.id ? null : test.id)}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`text-lg ${
                            test.passed === true
                              ? 'text-emerald-400'
                              : test.passed === false
                              ? 'text-red-400'
                              : 'text-slate-500'
                          }`}
                        >
                          {test.passed === true ? '✅' : test.passed === false ? '❌' : '⬜'}
                        </span>
                        <div>
                          <h3 className="font-medium text-white">{test.title}</h3>
                          <p className="text-sm text-slate-400">{test.description}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={() => updateTestResult(section.id, test.id, true)}
                        className={`p-2 rounded-lg transition-colors ${
                          test.passed === true
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'hover:bg-emerald-500/10 text-slate-500 hover:text-emerald-400'
                        }`}
                        title="Mark as Passed"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </button>
                      <button
                        onClick={() => updateTestResult(section.id, test.id, false)}
                        className={`p-2 rounded-lg transition-colors ${
                          test.passed === false
                            ? 'bg-red-500/20 text-red-400'
                            : 'hover:bg-red-500/10 text-slate-500 hover:text-red-400'
                        }`}
                        title="Mark as Failed"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                      <button
                        onClick={() => updateTestResult(section.id, test.id, null)}
                        className="p-2 rounded-lg hover:bg-slate-700 text-slate-500 hover:text-slate-300 transition-colors"
                        title="Reset"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Expanded Steps */}
                  {expandedTest === test.id && (
                    <div className="mt-4 pt-4 border-t border-slate-700/50">
                      <h4 className="text-sm font-medium text-slate-300 mb-3">Test Steps:</h4>
                      <ol className="space-y-2 text-sm">
                        {test.steps.map((step, idx) => (
                          <li key={idx} className="flex items-start gap-3">
                            <span className="text-slate-500 font-mono text-xs mt-0.5">{idx + 1}.</span>
                            <span className="text-slate-400">{step}</span>
                          </li>
                        ))}
                      </ol>

                      <div className="mt-4">
                        <label className="text-sm font-medium text-slate-300 block mb-2">Notes:</label>
                        <textarea
                          className="input text-sm"
                          rows={2}
                          placeholder="Add any test notes or issues found..."
                          value={test.notes}
                          onChange={e => updateTestNotes(section.id, test.id, e.target.value)}
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Test Data Setup */}
        <div className="card border-indigo-500/30 bg-indigo-500/5">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <span className="text-2xl">🔧</span>
            Test Data Setup
          </h2>
          <div className="text-sm text-slate-300 space-y-3">
            <p>To run these tests, you'll need:</p>
            <ul className="list-disc list-inside space-y-1 text-slate-400">
              <li>At least 2-3 test employees in the system</li>
              <li>Sample PDF/image certificate files</li>
              <li>Certification types seeded (WAH, FSA, WHMIS, etc.)</li>
              <li>Email provider configured (Resend/SendGrid) for notification tests</li>
            </ul>
            <p className="text-slate-500 text-xs mt-4">
              Tip: For notification tests, temporarily modify cert expiry dates in the database to trigger different reminder thresholds.
            </p>
          </div>
        </div>

        {/* SQL Test Queries */}
        <div className="card">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <span className="text-2xl">💾</span>
            Helpful SQL Queries for Testing
          </h2>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-slate-400 mb-2">Set cert to expire in 55 days (trigger 60-day reminder):</p>
              <pre className="bg-slate-800 p-3 rounded-lg text-xs text-slate-300 overflow-x-auto">
{`UPDATE worker_certifications 
SET expiry_date = CURRENT_DATE + INTERVAL '55 days'
WHERE id = '<cert-id>';`}
              </pre>
            </div>
            <div>
              <p className="text-sm text-slate-400 mb-2">Set cert to expired:</p>
              <pre className="bg-slate-800 p-3 rounded-lg text-xs text-slate-300 overflow-x-auto">
{`UPDATE worker_certifications 
SET expiry_date = CURRENT_DATE - INTERVAL '1 day',
    status = 'active'
WHERE id = '<cert-id>';`}
              </pre>
            </div>
            <div>
              <p className="text-sm text-slate-400 mb-2">Reset all reminders for a cert:</p>
              <pre className="bg-slate-800 p-3 rounded-lg text-xs text-slate-300 overflow-x-auto">
{`DELETE FROM certification_reminders 
WHERE certification_id = '<cert-id>';

UPDATE worker_certifications 
SET reminder_60_sent = false,
    reminder_30_sent = false,
    reminder_7_sent = false
WHERE id = '<cert-id>';`}
              </pre>
            </div>
            <div>
              <p className="text-sm text-slate-400 mb-2">View all pending reminders:</p>
              <pre className="bg-slate-800 p-3 rounded-lg text-xs text-slate-300 overflow-x-auto">
{`SELECT cr.*, wc.expiry_date, ct.certification_name, up.email
FROM certification_reminders cr
JOIN worker_certifications wc ON wc.id = cr.certification_id
JOIN certification_types ct ON ct.id = wc.certification_type_id
JOIN user_profiles up ON up.id = wc.worker_id
WHERE cr.status = 'pending'
ORDER BY cr.scheduled_date;`}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
