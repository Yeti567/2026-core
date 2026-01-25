'use client';

import { useState } from 'react';
import { 
  CheckCircle, XCircle, Clock, AlertCircle, 
  Send, Loader2, PenTool, MessageSquare 
} from 'lucide-react';
import SignaturePad from '@/components/ui/signature-pad';

// ============================================================================
// TYPES
// ============================================================================

interface Approval {
  id: string;
  document_id: string;
  approver_role: string;
  approver_id?: string;
  approver_name?: string;
  approval_order: number;
  required: boolean;
  status: 'pending' | 'approved' | 'rejected' | 'skipped';
  approved_at?: string;
  rejection_reason?: string;
  approval_comments?: string;
  signature_data?: string;
  notified_at?: string;
}

interface ApprovalWorkflowProps {
  documentId: string;
  documentTitle: string;
  documentStatus: string;
  approvals: Approval[];
  currentUserId: string;
  currentUserRole: string;
  onApprovalSubmitted?: () => void;
}

// ============================================================================
// STATUS COLORS
// ============================================================================

const STATUS_STYLES = {
  pending: { bg: 'bg-amber-500/20', border: 'border-amber-500/30', text: 'text-amber-400', icon: Clock },
  approved: { bg: 'bg-emerald-500/20', border: 'border-emerald-500/30', text: 'text-emerald-400', icon: CheckCircle },
  rejected: { bg: 'bg-rose-500/20', border: 'border-rose-500/30', text: 'text-rose-400', icon: XCircle },
  skipped: { bg: 'bg-slate-500/20', border: 'border-slate-500/30', text: 'text-slate-400', icon: AlertCircle },
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ApprovalWorkflow({
  documentId,
  documentTitle,
  documentStatus,
  approvals,
  currentUserId,
  currentUserRole,
  onApprovalSubmitted,
}: ApprovalWorkflowProps) {
  const [expandedApproval, setExpandedApproval] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [comments, setComments] = useState('');
  const [signature, setSignature] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');

  // Sort approvals by order
  const sortedApprovals = [...approvals].sort((a, b) => a.approval_order - b.approval_order);

  // Find current approval step (first pending)
  const currentStep = sortedApprovals.find(a => a.status === 'pending');

  // Check if current user can approve
  const canApprove = currentStep && (
    currentStep.approver_id === currentUserId ||
    currentStep.approver_role === currentUserRole ||
    currentUserRole === 'admin' ||
    currentUserRole === 'super_admin'
  );

  // Check if all approvals complete
  const allApproved = sortedApprovals.every(a => a.status === 'approved' || a.status === 'skipped');
  const hasRejection = sortedApprovals.some(a => a.status === 'rejected');

  // Handle approval submission
  const handleApprove = async () => {
    if (!currentStep) return;
    
    setSubmitting(true);
    try {
      const response = await fetch(`/api/documents/${documentId}/approvals/${currentStep.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'approved',
          comments,
          signature_data: signature,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit approval');
      }

      setComments('');
      setSignature('');
      onApprovalSubmitted?.();
    } catch (error) {
      console.error('Approval error:', error);
      alert('Failed to submit approval. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle rejection
  const handleReject = async () => {
    if (!currentStep || !rejectionReason.trim()) {
      alert('Please provide a reason for rejection');
      return;
    }
    
    setSubmitting(true);
    try {
      const response = await fetch(`/api/documents/${documentId}/approvals/${currentStep.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'rejected',
          rejection_reason: rejectionReason,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit rejection');
      }

      setRejectionReason('');
      onApprovalSubmitted?.();
    } catch (error) {
      console.error('Rejection error:', error);
      alert('Failed to submit rejection. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-700/50">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <PenTool className="w-5 h-5 text-cyan-400" />
          Approval Workflow
        </h3>
        <p className="text-sm text-slate-400 mt-1">
          {documentTitle}
        </p>
        
        {/* Status summary */}
        <div className="mt-3 flex items-center gap-4">
          {allApproved && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/20 text-emerald-400 text-sm rounded-full border border-emerald-500/30">
              <CheckCircle className="w-4 h-4" />
              Fully Approved
            </span>
          )}
          {hasRejection && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-500/20 text-rose-400 text-sm rounded-full border border-rose-500/30">
              <XCircle className="w-4 h-4" />
              Rejected
            </span>
          )}
          {!allApproved && !hasRejection && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/20 text-amber-400 text-sm rounded-full border border-amber-500/30">
              <Clock className="w-4 h-4" />
              {sortedApprovals.filter(a => a.status === 'approved').length}/{sortedApprovals.length} Approvals
            </span>
          )}
        </div>
      </div>

      {/* Approval Steps */}
      <div className="p-6 space-y-4">
        {sortedApprovals.map((approval, index) => {
          const styles = STATUS_STYLES[approval.status];
          const StatusIcon = styles.icon;
          const isExpanded = expandedApproval === approval.id;
          const isCurrent = currentStep?.id === approval.id;

          return (
            <div
              key={approval.id}
              className={`relative ${index > 0 ? 'mt-4' : ''}`}
            >
              {/* Connector line */}
              {index > 0 && (
                <div className="absolute left-5 -top-4 w-0.5 h-4 bg-slate-600" />
              )}

              <div
                className={`rounded-lg border ${styles.border} ${styles.bg} ${isCurrent ? 'ring-2 ring-cyan-500/50' : ''}`}
              >
                {/* Step header */}
                <div 
                  className="p-4 cursor-pointer"
                  onClick={() => setExpandedApproval(isExpanded ? null : approval.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${styles.bg}`}>
                        <StatusIcon className={`w-5 h-5 ${styles.text}`} />
                      </div>
                      <div>
                        <p className="font-medium text-white">
                          Step {approval.approval_order}: {approval.approver_role.replace(/_/g, ' ')}
                          {approval.required && <span className="text-rose-400 ml-1">*</span>}
                        </p>
                        {approval.approver_name && (
                          <p className="text-sm text-slate-400">
                            Assigned to: {approval.approver_name}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`text-sm font-medium ${styles.text} capitalize`}>
                        {approval.status}
                      </span>
                      {approval.approved_at && (
                        <p className="text-xs text-slate-500 mt-0.5">
                          {new Date(approval.approved_at).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded content */}
                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-slate-700/30 pt-4">
                    {/* Completed approval details */}
                    {approval.status === 'approved' && (
                      <div className="space-y-3">
                        {approval.approval_comments && (
                          <div>
                            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Comments</p>
                            <p className="text-slate-300">{approval.approval_comments}</p>
                          </div>
                        )}
                        {approval.signature_data && (
                          <div>
                            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Signature</p>
                            <img 
                              src={approval.signature_data} 
                              alt="Signature" 
                              className="h-16 bg-white/10 rounded p-2"
                            />
                          </div>
                        )}
                      </div>
                    )}

                    {/* Rejected details */}
                    {approval.status === 'rejected' && approval.rejection_reason && (
                      <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Rejection Reason</p>
                        <p className="text-rose-300">{approval.rejection_reason}</p>
                      </div>
                    )}

                    {/* Pending - show approval form if current user can approve */}
                    {approval.status === 'pending' && isCurrent && canApprove && (
                      <div className="space-y-4">
                        {/* Comments */}
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-2">
                            <MessageSquare className="w-4 h-4 inline mr-1" />
                            Comments (optional)
                          </label>
                          <textarea
                            value={comments}
                            onChange={(e) => setComments(e.target.value)}
                            placeholder="Add any comments about this approval..."
                            className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600/50 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 resize-none"
                            rows={2}
                          />
                        </div>

                        {/* Signature */}
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-2">
                            <PenTool className="w-4 h-4 inline mr-1" />
                            Signature
                          </label>
                          <SignaturePad
                            value={signature}
                            onChange={setSignature}
                            className="bg-slate-900/50 border border-slate-600/50 rounded-lg"
                          />
                        </div>

                        {/* Action buttons */}
                        <div className="flex gap-3">
                          <button
                            onClick={handleApprove}
                            disabled={submitting}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                          >
                            {submitting ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <CheckCircle className="w-4 h-4" />
                            )}
                            Approve
                          </button>
                          <button
                            onClick={() => setExpandedApproval(`${approval.id}-reject`)}
                            disabled={submitting}
                            className="px-4 py-2.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-rose-400 rounded-lg transition-colors"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Pending - notification info */}
                    {approval.status === 'pending' && !canApprove && (
                      <div className="text-sm text-slate-400">
                        {approval.notified_at ? (
                          <p>Notification sent: {new Date(approval.notified_at).toLocaleString()}</p>
                        ) : (
                          <p>Awaiting approval...</p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Rejection form */}
                {expandedApproval === `${approval.id}-reject` && (
                  <div className="px-4 pb-4 border-t border-slate-700/30 pt-4 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Reason for Rejection <span className="text-rose-400">*</span>
                      </label>
                      <textarea
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        placeholder="Please explain why this document is being rejected..."
                        className="w-full px-3 py-2 bg-slate-900/50 border border-rose-500/30 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500/50 resize-none"
                        rows={3}
                      />
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={handleReject}
                        disabled={submitting || !rejectionReason.trim()}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                      >
                        {submitting ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <XCircle className="w-4 h-4" />
                        )}
                        Confirm Rejection
                      </button>
                      <button
                        onClick={() => setExpandedApproval(approval.id)}
                        className="px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// SUBMIT FOR APPROVAL BUTTON
// ============================================================================

interface SubmitForApprovalProps {
  documentId: string;
  documentStatus: string;
  onSubmitted?: () => void;
}

export function SubmitForApprovalButton({
  documentId,
  documentStatus,
  onSubmitted,
}: SubmitForApprovalProps) {
  const [submitting, setSubmitting] = useState(false);

  if (documentStatus !== 'draft') {
    return null;
  }

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const response = await fetch(`/api/documents/${documentId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'pending_review' }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit for approval');
      }

      onSubmitted?.();
    } catch (error) {
      console.error('Submit error:', error);
      alert('Failed to submit for approval. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <button
      onClick={handleSubmit}
      disabled={submitting}
      className="flex items-center gap-2 px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
    >
      {submitting ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Send className="w-4 h-4" />
      )}
      Submit for Approval
    </button>
  );
}
