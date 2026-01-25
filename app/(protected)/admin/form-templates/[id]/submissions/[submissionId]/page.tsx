'use client';

/**
 * Form Submission Detail Page
 * 
 * View detailed submission data, approve/reject, and download PDF.
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  ArrowLeft,
  Download,
  CheckCircle,
  XCircle,
  Clock,
  User,
  Calendar,
  MapPin,
  Loader2,
  FileText,
  Image as ImageIcon,
  ExternalLink,
} from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { FormTemplate, FormSubmission, FormSection, FormField } from '@/components/form-builder/types';

interface SubmissionDetail extends FormSubmission {
  submitted_by_user?: {
    first_name: string;
    last_name: string;
    email: string;
  };
  jobsite_data?: {
    name: string;
    address?: string;
  };
}

export default function SubmissionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();
  const templateId = params.id as string;
  const submissionId = params.submissionId as string;
  
  const [template, setTemplate] = useState<FormTemplate | null>(null);
  const [sections, setSections] = useState<FormSection[]>([]);
  const [submission, setSubmission] = useState<SubmissionDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [actionNotes, setActionNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Load template with sections and fields
      const { data: templateData, error: templateError } = await supabase
        .from('form_templates')
        .select(`
          *,
          form_sections (
            *,
            form_fields (*)
          )
        `)
        .eq('id', templateId)
        .single();
      
      if (templateError) throw templateError;
      setTemplate(templateData);
      
      // Sort sections and fields
      const sortedSections = (templateData.form_sections || [])
        .sort((a: FormSection, b: FormSection) => a.order_index - b.order_index)
        .map((section: FormSection) => ({
          ...section,
          form_fields: (section.form_fields || [])
            .sort((a: FormField, b: FormField) => a.order_index - b.order_index),
        }));
      setSections(sortedSections);
      
      // Load submission
      const { data: submissionData, error: submissionError } = await supabase
        .from('form_submissions')
        .select(`
          *,
          user_profiles!form_submissions_submitted_by_fkey (
            first_name,
            last_name,
            email
          ),
          jobsites (
            name,
            address
          )
        `)
        .eq('id', submissionId)
        .single();
      
      if (submissionError) throw submissionError;
      
      setSubmission({
        ...submissionData,
        submitted_by_user: submissionData.user_profiles ? {
          first_name: submissionData.user_profiles.first_name,
          last_name: submissionData.user_profiles.last_name,
          email: submissionData.user_profiles.email,
        } : undefined,
        jobsite_data: submissionData.jobsites ? {
          name: submissionData.jobsites.name,
          address: submissionData.jobsites.address,
        } : undefined,
      });
      
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [templateId, submissionId, supabase]);

  useEffect(() => {
    loadData();
  }, [loadData]);
  
  async function handleApprove() {
    if (!submission) return;
    setIsProcessing(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const newApprovalChain = [
        ...(submission.approval_chain || []),
        {
          user_id: user?.id,
          action: 'approved',
          timestamp: new Date().toISOString(),
          notes: actionNotes,
        },
      ];
      
      const { error } = await supabase
        .from('form_submissions')
        .update({
          status: 'approved',
          approval_chain: newApprovalChain,
          updated_at: new Date().toISOString(),
        })
        .eq('id', submissionId);
      
      if (error) throw error;
      
      setShowApproveDialog(false);
      setActionNotes('');
      loadData();
    } catch (err) {
      console.error('Failed to approve:', err);
    } finally {
      setIsProcessing(false);
    }
  }
  
  async function handleReject() {
    if (!submission) return;
    setIsProcessing(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const newApprovalChain = [
        ...(submission.approval_chain || []),
        {
          user_id: user?.id,
          action: 'rejected',
          timestamp: new Date().toISOString(),
          notes: actionNotes,
        },
      ];
      
      const { error } = await supabase
        .from('form_submissions')
        .update({
          status: 'rejected',
          approval_chain: newApprovalChain,
          updated_at: new Date().toISOString(),
        })
        .eq('id', submissionId);
      
      if (error) throw error;
      
      setShowRejectDialog(false);
      setActionNotes('');
      loadData();
    } catch (err) {
      console.error('Failed to reject:', err);
    } finally {
      setIsProcessing(false);
    }
  }
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'submitted':
        return <Badge variant="default" className="bg-blue-500"><Clock className="h-3 w-3 mr-1" />Submitted</Badge>;
      case 'approved':
        return <Badge variant="default" className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };
  
  const renderFieldValue = (field: FormField, value: unknown) => {
    if (value === null || value === undefined || value === '') {
      return <span className="text-muted-foreground italic">Not provided</span>;
    }
    
    switch (field.field_type) {
      case 'signature':
        return value ? (
          <img src={value as string} alt="Signature" className="max-w-xs border rounded" />
        ) : null;
      
      case 'photo':
        const photos = Array.isArray(value) ? value : [value];
        return (
          <div className="flex flex-wrap gap-2">
            {photos.map((photo, i) => (
              <img
                key={i}
                src={photo as string}
                alt={`Photo ${i + 1}`}
                className="w-24 h-24 object-cover rounded border"
              />
            ))}
          </div>
        );
      
      case 'checkbox':
        return value ? (
          <Badge variant="default" className="bg-green-500">Yes</Badge>
        ) : (
          <Badge variant="secondary">No</Badge>
        );
      
      case 'yes_no':
      case 'yes_no_na':
        return (
          <Badge variant={value === 'yes' ? 'default' : value === 'no' ? 'destructive' : 'secondary'}>
            {String(value).charAt(0).toUpperCase() + String(value).slice(1)}
          </Badge>
        );
      
      case 'multiselect':
        const items = Array.isArray(value) ? value : [];
        return items.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {items.map((item, i) => (
              <Badge key={i} variant="secondary">{String(item)}</Badge>
            ))}
          </div>
        ) : null;
      
      case 'rating':
        return (
          <span className="flex items-center gap-1">
            {'★'.repeat(Number(value))}{'☆'.repeat(5 - Number(value))}
            <span className="text-muted-foreground ml-1">({String(value)}/5)</span>
          </span>
        );
      
      case 'date':
        return new Date(value as string).toLocaleDateString();
      
      case 'time':
        return value as string;
      
      case 'datetime':
        return new Date(value as string).toLocaleString();
      
      case 'gps':
        const gps = value as { lat: number; lng: number };
        return gps ? (
          <a
            href={`https://maps.google.com/?q=${gps.lat},${gps.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline flex items-center gap-1"
          >
            {gps.lat.toFixed(6)}, {gps.lng.toFixed(6)}
            <ExternalLink className="h-3 w-3" />
          </a>
        ) : null;
      
      default:
        return <span>{String(value)}</span>;
    }
  };
  
  // Get icon
  const getIcon = (iconName: string) => {
    const name = iconName.replace(/-/g, '').replace(/^\w/, c => c.toUpperCase());
    const icons = LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>>;
    // Safe: name is derived from iconName with string transformations, fallback provided
    // eslint-disable-next-line security/detect-object-injection
    return icons[name] || FileText;
  };
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }
  
  if (!template || !submission) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Submission not found</p>
      </div>
    );
  }
  
  const Icon = getIcon(template.icon);
  const formData = submission.form_data as Record<string, unknown>;
  
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-6 px-4 max-w-4xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/admin/form-templates/${templateId}/submissions`)}
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Submissions
          </Button>
        </div>
        
        {/* Title Card */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div
                  className="rounded-lg p-2.5"
                  style={{ backgroundColor: `${template.color}20` }}
                >
                  <Icon className="h-6 w-6" style={{ color: template.color }} />
                </div>
                <div>
                  <CardTitle className="text-xl">{template.name}</CardTitle>
                  <p className="text-sm text-muted-foreground font-mono mt-1">
                    {submission.form_number}
                  </p>
                </div>
              </div>
              {getStatusBadge(submission.status)}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Submitted By</p>
                <p className="font-medium flex items-center gap-1">
                  <User className="h-4 w-4" />
                  {submission.submitted_by_user
                    ? `${submission.submitted_by_user.first_name} ${submission.submitted_by_user.last_name}`
                    : 'Unknown'}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Date</p>
                <p className="font-medium flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {new Date(submission.submitted_at || submission.created_at).toLocaleString()}
                </p>
              </div>
              {submission.jobsite_data && (
                <div>
                  <p className="text-muted-foreground">Jobsite</p>
                  <p className="font-medium flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    {submission.jobsite_data.name}
                  </p>
                </div>
              )}
              {submission.gps_latitude && submission.gps_longitude && (
                <div>
                  <p className="text-muted-foreground">Location</p>
                  <a
                    href={`https://maps.google.com/?q=${submission.gps_latitude},${submission.gps_longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-primary hover:underline flex items-center gap-1"
                  >
                    <MapPin className="h-4 w-4" />
                    View on Map
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}
            </div>
            
            {/* Action buttons */}
            {submission.status === 'submitted' && (
              <div className="flex gap-2 mt-6 pt-4 border-t">
                <Button
                  variant="default"
                  className="bg-green-600 hover:bg-green-700"
                  onClick={() => setShowApproveDialog(true)}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => setShowRejectDialog(true)}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Form Data */}
        {sections.map((section) => (
          <Card key={section.id} className="mb-4">
            <CardHeader>
              <CardTitle className="text-lg">{section.title}</CardTitle>
              {section.description && (
                <p className="text-sm text-muted-foreground">{section.description}</p>
              )}
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {(section.form_fields || []).map((field) => {
                  const value = formData[field.field_code];
                  
                  return (
                    <div key={field.id} className="grid grid-cols-3 gap-4">
                      <div className="text-sm text-muted-foreground">
                        {field.label}
                        {field.validation_rules?.required && (
                          <span className="text-destructive ml-1">*</span>
                        )}
                      </div>
                      <div className="col-span-2">
                        {renderFieldValue(field, value)}
                      </div>
                    </div>
                  );
                })}
                {(!section.form_fields || section.form_fields.length === 0) && (
                  <p className="text-muted-foreground italic">No fields in this section</p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
        
        {/* Approval History */}
        {submission.approval_chain && submission.approval_chain.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Approval History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {submission.approval_chain.map((action, index) => (
                  <div key={index} className="flex items-start gap-3 text-sm">
                    {action.action === 'approved' ? (
                      <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500 mt-0.5" />
                    )}
                    <div>
                      <p className="font-medium">
                        {action.action === 'approved' ? 'Approved' : 'Rejected'}
                      </p>
                      <p className="text-muted-foreground">
                        {new Date(action.timestamp).toLocaleString()}
                      </p>
                      {action.notes && (
                        <p className="mt-1">{action.notes}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
      
      {/* Approve Dialog */}
      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Submission</DialogTitle>
            <DialogDescription>
              Add any notes about this approval (optional).
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Approval notes..."
            value={actionNotes}
            onChange={(e) => setActionNotes(e.target.value)}
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApproveDialog(false)}>
              Cancel
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={handleApprove}
              disabled={isProcessing}
            >
              {isProcessing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Submission</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejection.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Reason for rejection..."
            value={actionNotes}
            onChange={(e) => setActionNotes(e.target.value)}
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={isProcessing || !actionNotes.trim()}
            >
              {isProcessing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
