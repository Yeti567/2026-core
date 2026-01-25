/**
 * Type Guards and Validators
 * 
 * Type-safe validators for query parameters and common types.
 * Prevents the need for `as any` casts.
 */

// =============================================================================
// DOCUMENT TYPES
// =============================================================================

import type { DocumentTypeCode, DocumentStatus as DocStatus } from '@/lib/documents/types';

export type DocumentType = 'policy' | 'procedure' | 'form' | 'other' | 'manual' | 'standard';
export type DocumentStatus = DocStatus;

export function isDocumentType(value: unknown): value is DocumentType {
  return (
    typeof value === 'string' &&
    ['policy', 'procedure', 'form', 'other', 'manual', 'standard'].includes(value)
  );
}

export function isDocumentStatus(value: unknown): value is DocumentStatus {
  return (
    typeof value === 'string' &&
    [
      'draft',
      'pending_review',
      'under_review',
      'approved',
      'active',
      'under_revision',
      'obsolete',
      'archived',
    ].includes(value)
  );
}

export function isDocumentTypeCode(value: unknown): value is DocumentTypeCode {
  return (
    typeof value === 'string' &&
    [
      'POL',
      'SWP',
      'SJP',
      'FRM',
      'CHK',
      'WI',
      'PRC',
      'MAN',
      'PLN',
      'REG',
      'TRN',
      'RPT',
      'MIN',
      'CRT',
      'DWG',
      'AUD',
    ].includes(value)
  );
}

export function parseDocumentTypeCode(value: unknown): DocumentTypeCode | undefined {
  return isDocumentTypeCode(value) ? value : undefined;
}

// =============================================================================
// MAINTENANCE TYPES
// =============================================================================

export type MaintenanceType = 'preventive' | 'corrective' | 'predictive' | 'emergency' | 'inspection_daily' | 'inspection_weekly' | 'inspection_monthly' | 'inspection_annual';
export type MaintenanceRecordType = 
  | 'preventive'
  | 'corrective'
  | 'inspection_daily'
  | 'inspection_weekly'
  | 'inspection_monthly'
  | 'inspection_annual'
  | 'load_test'
  | 'service_report'
  | 'parts_replacement'
  | 'calibration'
  | 'certification_renewal';
export type WorkOrderStatus =
  | 'draft'
  | 'open'
  | 'assigned'
  | 'in_progress'
  | 'on_hold'
  | 'parts_ordered'
  | 'completed'
  | 'cancelled';

export type WorkOrderPriority = 'low' | 'medium' | 'high' | 'critical';

export function isMaintenanceType(value: unknown): value is MaintenanceType {
  return (
    typeof value === 'string' &&
    ['preventive', 'corrective', 'predictive', 'emergency'].includes(value)
  );
}

export function isMaintenanceRecordType(value: unknown): value is MaintenanceRecordType {
  return (
    typeof value === 'string' &&
    [
      'preventive',
      'corrective',
      'inspection_daily',
      'inspection_weekly',
      'inspection_monthly',
      'inspection_annual',
      'load_test',
      'service_report',
      'parts_replacement',
      'calibration',
      'certification_renewal',
    ].includes(value)
  );
}

export function isWorkOrderStatus(value: unknown): value is WorkOrderStatus {
  return (
    typeof value === 'string' &&
    ['draft', 'open', 'assigned', 'in_progress', 'on_hold', 'parts_ordered', 'completed', 'cancelled'].includes(value)
  );
}

export function isWorkOrderPriority(value: unknown): value is WorkOrderPriority {
  return (
    typeof value === 'string' &&
    ['low', 'medium', 'high', 'critical'].includes(value)
  );
}

// =============================================================================
// EVIDENCE TYPES
// =============================================================================

export type EvidenceType = 
  | 'form_submission'
  | 'document'
  | 'certification'
  | 'maintenance_record'
  | 'training_record'
  | 'meeting_minutes'
  | 'inspection'
  | 'incident';

export function isEvidenceType(value: unknown): value is EvidenceType {
  return (
    typeof value === 'string' &&
    [
      'form_submission',
      'document',
      'certification',
      'maintenance_record',
      'training_record',
      'meeting_minutes',
      'inspection',
      'incident',
    ].includes(value)
  );
}

// =============================================================================
// ERROR TYPES
// =============================================================================

export interface ErrorWithCode extends Error {
  code?: string | number;
}

export interface ErrorWithStatusCode extends Error {
  statusCode?: number;
}

export function hasCode(error: unknown): error is ErrorWithCode {
  return error instanceof Error && 'code' in error;
}

export function hasStatusCode(error: unknown): error is ErrorWithStatusCode {
  return error instanceof Error && 'statusCode' in error;
}

// =============================================================================
// ARRAY VALIDATORS
// =============================================================================

export function parseStringArray(value: unknown): string[] | undefined {
  if (typeof value === 'string') {
    return value.split(',').map(s => s.trim()).filter(Boolean);
  }
  if (Array.isArray(value)) {
    return value.filter((v): v is string => typeof v === 'string');
  }
  return undefined;
}

export function parseDocumentTypeArray(value: unknown): DocumentType[] | undefined {
  const strings = parseStringArray(value);
  if (!strings) return undefined;
  const types = strings.filter(isDocumentType);
  return types.length > 0 ? types : undefined;
}

export function parseDocumentStatusArray(value: unknown): DocumentStatus[] | undefined {
  const strings = parseStringArray(value);
  if (!strings) return undefined;
  const statuses = strings.filter(isDocumentStatus);
  return statuses.length > 0 ? statuses : undefined;
}

export function parseMaintenanceTypeArray(value: unknown): MaintenanceType[] | undefined {
  const strings = parseStringArray(value);
  if (!strings) return undefined;
  const types = strings.filter(isMaintenanceType);
  return types.length > 0 ? types : undefined;
}

export function parseWorkOrderStatusArray(value: unknown): WorkOrderStatus[] | undefined {
  const strings = parseStringArray(value);
  if (!strings) return undefined;
  const statuses = strings.filter(isWorkOrderStatus);
  return statuses.length > 0 ? statuses : undefined;
}

export function parseWorkOrderPriorityArray(value: unknown): WorkOrderPriority[] | undefined {
  const strings = parseStringArray(value);
  if (!strings) return undefined;
  const priorities = strings.filter(isWorkOrderPriority);
  return priorities.length > 0 ? priorities : undefined;
}

export function parseMaintenanceRecordTypeArray(value: unknown): MaintenanceRecordType[] | undefined {
  const strings = parseStringArray(value);
  if (!strings) return undefined;
  const types = strings.filter(isMaintenanceRecordType);
  return types.length > 0 ? types : undefined;
}
