'use client';

/**
 * Form Fill Page
 * 
 * Workers use this page to fill out and submit forms.
 * Supports offline mode with IndexedDB storage.
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { DynamicFormRenderer } from '@/components/form-builder/form-renderer';
import { FormSubmissionData, FormTemplate } from '@/components/form-builder/types';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ArrowLeft, CheckCircle, Loader2, WifiOff, AlertCircle } from 'lucide-react';
import { localDB as localDb } from '@/lib/db/local-db';

export default function FormFillPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();
  const slug = params.slug as string;
  
  const [template, setTemplate] = useState<FormTemplate | null>(null);
  const [companyId, setCompanyId] = useState<string>('');
  const [userId, setUserId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [submittedFormNumber, setSubmittedFormNumber] = useState<string>('');
  const [draftData, setDraftData] = useState<Record<string, unknown> | null>(null);
  
  // Track online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    setIsOnline(navigator.onLine);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  // Load template and user info
  useEffect(() => {
    async function load() {
      setIsLoading(true);
      setError(null);
      
      try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push('/login');
          return;
        }
        setUserId(user.id);
        
        // Get user's company
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('company_id')
          .eq('id', user.id)
          .single();
        
        if (!profile?.company_id) {
          setError('No company found for your account');
          return;
        }
        setCompanyId(profile.company_id);
        
        // Get form template by slug (form_code)
        // Note: profile.company_id is server-controlled (from database query result)
        // Safe to use directly as it comes from authenticated user's profile
        const { data: templateData, error: templateError } = await supabase
          .from('form_templates')
          .select('*')
          .eq('form_code', slug)
          .or(`company_id.eq.${profile.company_id},company_id.is.null`)
          .eq('is_active', true)
          .order('company_id', { nullsFirst: false }) // Prefer company-specific template
          .limit(1)
          .single();
        
        if (templateError || !templateData) {
          setError('Form not found or not available');
          return;
        }
        
        setTemplate(templateData);
        
        // Check for existing draft in IndexedDB
        // Drafts are forms that haven't been synced yet (synced === 'pending')
        const draft = await localDb.forms
          .where('form_type')
          .equals(slug)
          .and(form => form.synced === 'pending' && form.worker_id === user.id)
          .first();
        
        if (draft?.form_data) {
          setDraftData(draft.form_data as Record<string, unknown>);
        }
        
      } catch (err) {
        console.error('Failed to load form:', err);
        setError('Failed to load form');
      } finally {
        setIsLoading(false);
      }
    }
    
    load();
  }, [slug, supabase, router]);
  
  // Handle form submission
  const handleSubmit = useCallback(async (data: FormSubmissionData) => {
    if (!template || !companyId || !userId) return;
    
    try {
      if (isOnline) {
        // Generate form number
        const { data: formNumber } = await supabase
          .rpc('generate_form_number', {
            p_form_code: template.form_code,
            p_company_id: companyId,
          });
        
        // Submit to database
        const { data: submission, error: submitError } = await supabase
          .from('form_submissions')
          .insert({
            company_id: companyId,
            form_template_id: template.id,
            form_number: formNumber || `FRM-${Date.now()}`,
            submitted_by: userId,
            submitted_at: new Date().toISOString(),
            jobsite_id: data.jobsite_id || null,
            form_data: data.form_data,
            attachments: data.attachments,
            gps_latitude: data.gps_coordinates?.lat || null,
            gps_longitude: data.gps_coordinates?.lng || null,
            gps_accuracy: data.gps_coordinates?.accuracy || null,
            status: data.status,
            synced: true,
          })
          .select()
          .single();
        
        if (submitError) throw submitError;
        
        // Create evidence mapping if workflow specifies
        const { data: workflow } = await supabase
          .from('form_workflows')
          .select('auto_create_evidence, evidence_audit_element')
          .eq('form_template_id', template.id)
          .single();
        
        if (workflow?.auto_create_evidence && workflow.evidence_audit_element && submission) {
          await supabase
            .from('form_evidence_mappings')
            .insert({
              form_submission_id: submission.id,
              audit_element: workflow.evidence_audit_element,
              evidence_type: 'form',
            });
        }
        
        // Clear any local draft
        await localDb.forms
          .where('form_type')
          .equals(slug)
          .and(form => form.synced === 'pending' && form.worker_id === userId)
          .delete();
        
        setSubmittedFormNumber(formNumber || submission?.form_number || '');
        setShowSuccessDialog(true);
        
      } else {
        // Save to IndexedDB for offline sync
        const localId = crypto.randomUUID();
        const now = new Date().toISOString();
        
        await localDb.forms.add({
          id: localId,
          form_type: slug,
          form_data: data.form_data,
          company_id: companyId,
          worker_id: userId,
          photos: (data.attachments?.photos || []).map((att) => ({
            id: crypto.randomUUID(),
            data: att.data,
            mimeType: 'image/jpeg',
            filename: att.filename,
            size: 0,
            capturedAt: att.timestamp || now,
          })),
          signature_base64: null,
          gps_coordinates: data.gps_coordinates ? {
            latitude: data.gps_coordinates.lat,
            longitude: data.gps_coordinates.lng,
            accuracy: data.gps_coordinates.accuracy,
            timestamp: Date.now(),
          } : null,
          synced: data.status === 'draft' ? 'pending' : 'pending',
          server_id: null,
          created_at: now,
          updated_at: now,
          sync_attempts: 0,
          last_sync_error: null,
        });
        
        // Queue for sync
        if (data.status !== 'draft') {
          await localDb.queueForSync(
            'form_submission',
            localId,
            'forms',
            {
              company_id: companyId,
              form_template_id: template.id,
              form_code: template.form_code,
              submitted_by: userId,
              jobsite_id: data.jobsite_id,
              form_data: data.form_data,
              attachments: data.attachments,
              gps_latitude: data.gps_coordinates?.lat,
              gps_longitude: data.gps_coordinates?.lng,
              gps_accuracy: data.gps_coordinates?.accuracy,
              status: data.status,
              local_id: localId,
            },
            2 // Priority: higher priority for form submissions
          );
        }
        
        setSubmittedFormNumber('(Pending sync)');
        setShowSuccessDialog(true);
      }
    } catch (err) {
      console.error('Submission failed:', err);
      throw err;
    }
  }, [template, companyId, userId, isOnline, slug, supabase]);
  
  // Handle save draft
  const handleSaveDraft = useCallback(async (data: Record<string, unknown>) => {
    if (!userId || !companyId) return;
    
    try {
      // Check if draft exists (unsynced forms are considered drafts)
      const existingDraft = await localDb.forms
        .where('form_type')
        .equals(slug)
        .and(form => form.synced === 'pending' && form.worker_id === userId)
        .first();
      
      const now = new Date().toISOString();
      
      if (existingDraft) {
        // Update existing draft
        await localDb.forms.update(existingDraft.id, {
          form_data: data,
          updated_at: now,
        });
      } else {
        // Create new draft
        await localDb.forms.add({
          id: crypto.randomUUID(),
          form_type: slug,
          form_data: data,
          company_id: companyId,
          worker_id: userId,
          photos: [],
          signature_base64: null,
          gps_coordinates: null,
          synced: 'pending',
          server_id: null,
          created_at: now,
          updated_at: now,
          sync_attempts: 0,
          last_sync_error: null,
        });
      }
    } catch (err) {
      console.error('Failed to save draft:', err);
    }
  }, [userId, companyId, slug]);
  
  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }
  
  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error}
            <Button
              variant="link"
              className="p-0 h-auto mt-2 block"
              onClick={() => router.push('/forms')}
            >
              Back to Forms
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }
  
  if (!template) return null;
  
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur sticky top-0 z-40">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/forms')}
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Forms
            </Button>
            
            {!isOnline && (
              <div className="flex items-center gap-2 text-amber-600 text-sm">
                <WifiOff className="h-4 w-4" />
                Offline Mode
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Form */}
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        {draftData && (
          <Alert className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              You have a saved draft of this form. Your progress has been restored.
            </AlertDescription>
          </Alert>
        )}
        
        <DynamicFormRenderer
          formTemplateId={template.id}
          companyId={companyId}
          userId={userId}
          initialData={draftData || undefined}
          mode="create"
          onSubmit={handleSubmit}
          onSaveDraft={handleSaveDraft}
          onCancel={() => router.push('/forms')}
        />
      </div>
      
      {/* Success Dialog */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent>
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-green-100 p-2">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <DialogTitle>Form Submitted Successfully</DialogTitle>
                <DialogDescription>
                  {submittedFormNumber && submittedFormNumber !== '(Pending sync)' ? (
                    <>Your form has been submitted. Reference: <strong>{submittedFormNumber}</strong></>
                  ) : (
                    <>Your form has been saved and will sync when you&apos;re back online.</>
                  )}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowSuccessDialog(false);
                router.push('/forms');
              }}
            >
              Back to Forms
            </Button>
            <Button
              onClick={() => {
                setShowSuccessDialog(false);
                setDraftData(null);
                // Reset form by reloading
                window.location.reload();
              }}
            >
              Submit Another
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
