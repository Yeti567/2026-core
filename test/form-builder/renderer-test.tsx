'use client';

/**
 * Dynamic Form Renderer Test
 * 
 * Manual test page to verify all form renderer functionality.
 * Access at: /test/form-renderer (dev only)
 */

import { useState } from 'react';
import { DynamicFormRenderer } from '@/components/form-builder/form-renderer';
import { FormSubmissionData } from '@/components/form-builder/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle, Circle, AlertCircle } from 'lucide-react';

// Test checklist items
const testChecklist = [
  { id: 'load', label: 'Form loads from database', status: 'pending' as const },
  { id: 'fields', label: 'All field types render correctly', status: 'pending' as const },
  { id: 'validation', label: 'Validation works (required, min_length, etc.)', status: 'pending' as const },
  { id: 'conditional', label: 'Conditional logic hides/shows fields', status: 'pending' as const },
  { id: 'photo', label: 'Photo capture works', status: 'pending' as const },
  { id: 'signature', label: 'Signature pad works', status: 'pending' as const },
  { id: 'gps', label: 'GPS auto-captures', status: 'pending' as const },
  { id: 'autosave', label: 'Draft saves every 30 seconds', status: 'pending' as const },
  { id: 'restore', label: 'Can restore draft', status: 'pending' as const },
  { id: 'submit-disabled', label: 'Submit button disabled when invalid', status: 'pending' as const },
  { id: 'submit', label: 'Submit works', status: 'pending' as const },
  { id: 'offline', label: 'Works offline', status: 'pending' as const },
];

type ChecklistStatus = 'pending' | 'passed' | 'failed';

interface ChecklistItem {
  id: string;
  label: string;
  status: ChecklistStatus;
}

export default function TestFormRenderer() {
  const [checklist, setChecklist] = useState<ChecklistItem[]>(testChecklist);
  const [submissions, setSubmissions] = useState<FormSubmissionData[]>([]);
  const [drafts, setDrafts] = useState<Record<string, unknown>[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [testCompanyId, setTestCompanyId] = useState<string>('');
  const [testUserId, setTestUserId] = useState<string>('');

  const handleSubmit = async (data: FormSubmissionData) => {
    console.log('Form submitted:', data);
    setSubmissions(prev => [...prev, data]);
    updateChecklistItem('submit', 'passed');
  };

  const handleSaveDraft = async (draft: Record<string, unknown>) => {
    console.log('Draft saved:', draft);
    setDrafts(prev => [...prev, { ...draft, savedAt: new Date().toISOString() }]);
    updateChecklistItem('autosave', 'passed');
  };

  const updateChecklistItem = (id: string, status: ChecklistStatus) => {
    setChecklist(prev => prev.map(item => 
      item.id === id ? { ...item, status } : item
    ));
  };

  const getStatusIcon = (status: ChecklistStatus) => {
    switch (status) {
      case 'passed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'failed':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Circle className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const passedCount = checklist.filter(c => c.status === 'passed').length;
  const totalCount = checklist.length;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Dynamic Form Renderer Test</h1>
          <p className="text-muted-foreground mt-2">
            Manual testing page for the form builder renderer component
          </p>
        </div>

        <Tabs defaultValue="form" className="space-y-6">
          <TabsList>
            <TabsTrigger value="form">Form Test</TabsTrigger>
            <TabsTrigger value="checklist">
              Checklist ({passedCount}/{totalCount})
            </TabsTrigger>
            <TabsTrigger value="logs">Logs</TabsTrigger>
          </TabsList>

          <TabsContent value="form" className="space-y-6">
            {/* Configuration */}
            <Card>
              <CardHeader>
                <CardTitle>Test Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium">Template ID</label>
                    <input
                      type="text"
                      value={selectedTemplateId}
                      onChange={(e) => setSelectedTemplateId(e.target.value)}
                      placeholder="Enter form template UUID"
                      className="w-full mt-1 px-3 py-2 border rounded-md"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Company ID</label>
                    <input
                      type="text"
                      value={testCompanyId}
                      onChange={(e) => setTestCompanyId(e.target.value)}
                      placeholder="Enter company UUID"
                      className="w-full mt-1 px-3 py-2 border rounded-md"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">User ID</label>
                    <input
                      type="text"
                      value={testUserId}
                      onChange={(e) => setTestUserId(e.target.value)}
                      placeholder="Enter user UUID"
                      className="w-full mt-1 px-3 py-2 border rounded-md"
                    />
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Enter valid UUIDs from your database to test with real form templates.
                </p>
              </CardContent>
            </Card>

            {/* Form Renderer */}
            {selectedTemplateId && testCompanyId ? (
              <DynamicFormRenderer
                formTemplateId={selectedTemplateId}
                companyId={testCompanyId}
                userId={testUserId || undefined}
                mode="create"
                onSubmit={handleSubmit}
                onSaveDraft={handleSaveDraft}
                onCancel={() => console.log('Form cancelled')}
              />
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">
                    Enter a Template ID and Company ID above to load a form for testing.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="checklist">
            <Card>
              <CardHeader>
                <CardTitle>Test Checklist</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {checklist.map((item) => (
                    <div 
                      key={item.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        {getStatusIcon(item.status)}
                        <span className={item.status === 'passed' ? 'line-through text-muted-foreground' : ''}>
                          {item.label}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateChecklistItem(item.id, 'passed')}
                          disabled={item.status === 'passed'}
                        >
                          Pass
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateChecklistItem(item.id, 'failed')}
                          disabled={item.status === 'failed'}
                        >
                          Fail
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => updateChecklistItem(item.id, 'pending')}
                          disabled={item.status === 'pending'}
                        >
                          Reset
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 p-4 bg-muted rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Progress</span>
                    <span>{Math.round((passedCount / totalCount) * 100)}%</span>
                  </div>
                  <div className="mt-2 h-2 bg-muted-foreground/20 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-green-500 transition-all"
                      style={{ width: `${(passedCount / totalCount) * 100}%` }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="logs">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Submissions Log */}
              <Card>
                <CardHeader>
                  <CardTitle>Submissions ({submissions.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  {submissions.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No submissions yet</p>
                  ) : (
                    <div className="space-y-4 max-h-96 overflow-auto">
                      {submissions.map((sub, index) => (
                        <div key={index} className="p-3 bg-muted rounded-lg text-sm">
                          <p className="font-medium mb-2">Submission #{index + 1}</p>
                          <pre className="text-xs overflow-auto">
                            {JSON.stringify(sub, null, 2)}
                          </pre>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Drafts Log */}
              <Card>
                <CardHeader>
                  <CardTitle>Auto-saved Drafts ({drafts.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  {drafts.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No drafts saved yet</p>
                  ) : (
                    <div className="space-y-4 max-h-96 overflow-auto">
                      {drafts.map((draft, index) => (
                        <div key={index} className="p-3 bg-muted rounded-lg text-sm">
                          <p className="font-medium mb-2">
                            Draft #{index + 1}
                          </p>
                          <pre className="text-xs overflow-auto">
                            {JSON.stringify(draft, null, 2)}
                          </pre>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
