// ============================================================================
// EQUIPMENT MAINTENANCE SYSTEM TYPES
// ============================================================================

// Enum Types
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

export type ScheduleFrequencyType = 'hours' | 'days' | 'weeks' | 'months' | 'years';

export type ReceiptSource = 'mobile_photo' | 'pdf_upload' | 'email_forward' | 'manual_entry' | 'vendor_portal';

export type DowntimeReason =
  | 'scheduled_maintenance'
  | 'breakdown'
  | 'parts_unavailable'
  | 'awaiting_inspection'
  | 'load_test_required'
  | 'safety_concern'
  | 'weather'
  | 'operator_unavailable'
  | 'other';

// Part Used in Maintenance
export interface PartUsed {
  part_name: string;
  part_number?: string;
  quantity: number;
  cost?: number;
}

// File Attachment
export interface FileAttachment {
  file_name: string;
  file_path: string;
  file_type: string;
  uploaded_at: string;
  description?: string;
}

// Line Item for Receipts
export interface LineItem {
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

// Checklist Task
export interface ChecklistTask {
  task: string;
  required: boolean;
  notes?: string;
  completed?: boolean;
}

// Required Part for Schedule
export interface RequiredPart {
  part_name: string;
  part_number?: string;
  quantity: number;
  ordered?: boolean;
  received?: boolean;
}

// ============================================================================
// MAIN ENTITY TYPES
// ============================================================================

export interface MaintenanceRecord {
  id: string;
  company_id: string;
  equipment_id: string;
  
  record_type: MaintenanceRecordType;
  title: string;
  description?: string;
  
  maintenance_date: string;
  completed_at?: string;
  time_spent_minutes?: number;
  
  hour_meter_reading?: number;
  
  performed_by?: string;
  performed_by_user_id?: string;
  verified_by?: string;
  verified_at?: string;
  
  work_performed?: string;
  findings?: string;
  recommendations?: string;
  follow_up_required: boolean;
  follow_up_notes?: string;
  
  parts_used: PartUsed[];
  labor_cost?: number;
  parts_cost?: number;
  total_cost?: number;
  
  work_order_id?: string;
  
  is_certification_record: boolean;
  certification_type?: string;
  certification_expiry?: string;
  certificate_number?: string;
  certifying_body?: string;
  
  passed?: boolean;
  deficiencies: string[];
  
  attachments: FileAttachment[];
  
  cor_element: number;
  evidence_chain_id?: string;
  
  created_at: string;
  updated_at: string;
  created_by?: string;
  
  // Joined data
  equipment?: {
    equipment_code: string;
    name: string;
    equipment_type: string;
  };
}

export interface MaintenanceReceipt {
  id: string;
  company_id: string;
  equipment_id?: string;
  maintenance_record_id?: string;
  work_order_id?: string;
  
  source: ReceiptSource;
  original_file_path?: string;
  original_file_name?: string;
  
  ocr_extracted: boolean;
  ocr_raw_text?: string;
  ocr_confidence?: number;
  
  receipt_number?: string;
  receipt_date?: string;
  vendor_name?: string;
  vendor_address?: string;
  vendor_phone?: string;
  
  subtotal?: number;
  tax_amount?: number;
  total_amount?: number;
  currency: string;
  payment_method?: string;
  
  line_items: LineItem[];
  
  expense_category?: string;
  is_warranty_claim: boolean;
  
  email_from?: string;
  email_subject?: string;
  email_received_at?: string;
  
  approved: boolean;
  approved_by?: string;
  approved_at?: string;
  
  notes?: string;
  
  created_at: string;
  updated_at: string;
  created_by?: string;
  
  // Joined data
  equipment?: {
    equipment_code: string;
    name: string;
  };
}

export interface MaintenanceSchedule {
  id: string;
  company_id: string;
  equipment_id: string;
  
  schedule_name: string;
  description?: string;
  maintenance_type: MaintenanceRecordType;
  
  frequency_type: ScheduleFrequencyType;
  frequency_value: number;
  
  hours_interval?: number;
  last_hour_reading?: number;
  next_due_hours?: number;
  
  last_performed_date?: string;
  next_due_date?: string;
  
  warning_days: number;
  warning_hours?: number;
  
  task_checklist: ChecklistTask[];
  estimated_duration_minutes?: number;
  required_parts: RequiredPart[];
  required_certifications: string[];
  
  assigned_to?: string;
  default_mechanic?: string;
  
  estimated_labor_cost?: number;
  estimated_parts_cost?: number;
  
  is_active: boolean;
  suspended_until?: string;
  suspension_reason?: string;
  
  is_regulatory_requirement: boolean;
  regulation_reference?: string;
  
  created_at: string;
  updated_at: string;
  created_by?: string;
  
  // Joined/Computed data
  equipment?: {
    equipment_code: string;
    name: string;
    equipment_type: string;
    current_hours?: number;
  };
  maintenance_status?: 'scheduled' | 'due_soon' | 'overdue';
  days_until_due?: number;
  hours_until_due?: number;
}

export interface MaintenanceWorkOrder {
  id: string;
  company_id: string;
  equipment_id: string;
  
  work_order_number: string;
  
  title: string;
  description?: string;
  maintenance_type: MaintenanceRecordType;
  
  status: WorkOrderStatus;
  priority: WorkOrderPriority;
  
  requested_date: string;
  scheduled_date?: string;
  due_date?: string;
  started_at?: string;
  completed_at?: string;
  
  schedule_id?: string;
  
  requested_by?: string;
  assigned_to?: string;
  assigned_mechanic?: string;
  
  equipment_location?: string;
  equipment_hours?: number;
  
  problem_description?: string;
  failure_mode?: string;
  safety_concern: boolean;
  safety_notes?: string;
  
  diagnosis?: string;
  work_performed?: string;
  root_cause?: string;
  
  parts_needed: RequiredPart[];
  parts_ordered_at?: string;
  parts_received_at?: string;
  estimated_labor_hours?: number;
  actual_labor_hours?: number;
  
  estimated_cost?: number;
  actual_cost?: number;
  
  photos_before: FileAttachment[];
  photos_after: FileAttachment[];
  
  completion_notes?: string;
  requires_testing: boolean;
  testing_completed: boolean;
  testing_results?: string;
  
  approval_required: boolean;
  approved_by?: string;
  approved_at?: string;
  
  follow_up_required: boolean;
  follow_up_work_order_id?: string;
  
  created_at: string;
  updated_at: string;
  created_by?: string;
  
  // Joined data
  equipment?: {
    equipment_code: string;
    name: string;
    equipment_type: string;
    current_location?: string;
  };
  assigned_user?: {
    user_id: string;
    role: string;
  };
}

export interface EquipmentDowntime {
  id: string;
  company_id: string;
  equipment_id: string;
  
  started_at: string;
  ended_at?: string;
  duration_minutes?: number;
  
  downtime_reason: DowntimeReason;
  reason_details?: string;
  
  work_order_id?: string;
  maintenance_record_id?: string;
  
  production_impact?: string;
  estimated_lost_hours?: number;
  replacement_equipment_used?: string;
  
  resolution_notes?: string;
  resolved_by?: string;
  
  created_at: string;
  updated_at: string;
  reported_by?: string;
  
  // Joined data
  equipment?: {
    equipment_code: string;
    name: string;
    equipment_type: string;
  };
}

// ============================================================================
// INPUT TYPES
// ============================================================================

export interface CreateMaintenanceRecordInput {
  equipment_id: string;
  record_type: MaintenanceRecordType;
  title: string;
  description?: string;
  maintenance_date: string;
  hour_meter_reading?: number;
  performed_by?: string;
  work_performed?: string;
  findings?: string;
  recommendations?: string;
  follow_up_required?: boolean;
  follow_up_notes?: string;
  parts_used?: PartUsed[];
  labor_cost?: number;
  parts_cost?: number;
  work_order_id?: string;
  is_certification_record?: boolean;
  certification_type?: string;
  certification_expiry?: string;
  certificate_number?: string;
  certifying_body?: string;
  passed?: boolean;
  deficiencies?: string[];
}

export interface CreateReceiptInput {
  equipment_id?: string;
  maintenance_record_id?: string;
  work_order_id?: string;
  source: ReceiptSource;
  receipt_number?: string;
  receipt_date?: string;
  vendor_name?: string;
  total_amount?: number;
  tax_amount?: number;
  line_items?: LineItem[];
  expense_category?: string;
  notes?: string;
}

export interface CreateScheduleInput {
  equipment_id: string;
  schedule_name: string;
  description?: string;
  maintenance_type: MaintenanceRecordType;
  frequency_type: ScheduleFrequencyType;
  frequency_value: number;
  hours_interval?: number;
  warning_days?: number;
  warning_hours?: number;
  task_checklist?: ChecklistTask[];
  estimated_duration_minutes?: number;
  required_parts?: RequiredPart[];
  required_certifications?: string[];
  assigned_to?: string;
  default_mechanic?: string;
  is_regulatory_requirement?: boolean;
  regulation_reference?: string;
}

export interface CreateWorkOrderInput {
  equipment_id: string;
  title: string;
  description?: string;
  maintenance_type: MaintenanceRecordType;
  priority?: WorkOrderPriority;
  scheduled_date?: string;
  due_date?: string;
  schedule_id?: string;
  assigned_to?: string;
  assigned_mechanic?: string;
  problem_description?: string;
  safety_concern?: boolean;
  safety_notes?: string;
  estimated_labor_hours?: number;
  estimated_cost?: number;
  approval_required?: boolean;
}

export interface CreateDowntimeInput {
  equipment_id: string;
  started_at: string;
  downtime_reason: DowntimeReason;
  reason_details?: string;
  work_order_id?: string;
  production_impact?: string;
  estimated_lost_hours?: number;
}

// ============================================================================
// FILTER TYPES
// ============================================================================

export interface MaintenanceRecordFilters {
  equipment_id?: string;
  record_type?: MaintenanceRecordType[];
  date_from?: string;
  date_to?: string;
  certification_only?: boolean;
  has_deficiencies?: boolean;
}

export interface WorkOrderFilters {
  equipment_id?: string;
  status?: WorkOrderStatus[];
  priority?: WorkOrderPriority[];
  assigned_to?: string;
  due_before?: string;
}

export interface ScheduleFilters {
  equipment_id?: string;
  maintenance_type?: MaintenanceRecordType[];
  is_active?: boolean;
  overdue_only?: boolean;
  due_within_days?: number;
}

// ============================================================================
// STATISTICS TYPES
// ============================================================================

export interface EquipmentMaintenanceStats {
  equipment_id: string;
  equipment_code: string;
  equipment_name: string;
  equipment_type: string;
  purchase_date?: string;
  purchase_price?: number;
  
  total_maintenance_cost: number;
  total_labor_cost: number;
  total_parts_cost: number;
  maintenance_record_count: number;
  total_receipt_amount: number;
  
  total_work_orders: number;
  completed_work_orders: number;
  open_work_orders: number;
  
  total_downtime_hours: number;
  cost_per_hour?: number;
  annual_maintenance_cost: number;
}

export interface EquipmentAvailabilityStats {
  equipment_id: string;
  equipment_code: string;
  equipment_name: string;
  current_status: string;
  
  availability_30_days: number;
  availability_90_days: number;
  availability_ytd: number;
  
  current_downtime_id?: string;
  downtime_incidents_30_days: number;
  mtbf_days?: number;
}

export interface MaintenanceDashboardStats {
  total_equipment: number;
  active_equipment: number;
  equipment_in_maintenance: number;
  
  overdue_inspections: number;
  upcoming_maintenance: number;
  
  open_work_orders: number;
  critical_work_orders: number;
  
  total_downtime_hours_30_days: number;
  average_availability: number;
  
  total_maintenance_cost_ytd: number;
  total_cost_by_type: Record<string, number>;
}

// ============================================================================
// DISPLAY CONFIGURATIONS
// ============================================================================

export const MAINTENANCE_TYPE_CONFIG: Record<MaintenanceRecordType, { label: string; icon: string; color: string }> = {
  preventive: { label: 'Preventive Maintenance', icon: '🔧', color: 'bg-blue-500' },
  corrective: { label: 'Corrective Repair', icon: '🔨', color: 'bg-orange-500' },
  inspection_daily: { label: 'Daily Inspection', icon: '📋', color: 'bg-green-500' },
  inspection_weekly: { label: 'Weekly Inspection', icon: '📋', color: 'bg-green-600' },
  inspection_monthly: { label: 'Monthly Inspection', icon: '📋', color: 'bg-green-700' },
  inspection_annual: { label: 'Annual Inspection', icon: '📋', color: 'bg-emerald-600' },
  load_test: { label: 'Load Test', icon: '⚖️', color: 'bg-purple-500' },
  service_report: { label: 'Service Report', icon: '📄', color: 'bg-gray-500' },
  parts_replacement: { label: 'Parts Replacement', icon: '🔩', color: 'bg-yellow-500' },
  calibration: { label: 'Calibration', icon: '🎯', color: 'bg-indigo-500' },
  certification_renewal: { label: 'Certification Renewal', icon: '📜', color: 'bg-teal-500' },
};

export const WORK_ORDER_STATUS_CONFIG: Record<WorkOrderStatus, { label: string; icon: string; color: string }> = {
  draft: { label: 'Draft', icon: '📝', color: 'bg-gray-400' },
  open: { label: 'Open', icon: '📂', color: 'bg-blue-500' },
  assigned: { label: 'Assigned', icon: '👤', color: 'bg-indigo-500' },
  in_progress: { label: 'In Progress', icon: '⏳', color: 'bg-yellow-500' },
  on_hold: { label: 'On Hold', icon: '⏸️', color: 'bg-orange-500' },
  parts_ordered: { label: 'Parts Ordered', icon: '📦', color: 'bg-purple-500' },
  completed: { label: 'Completed', icon: '✅', color: 'bg-green-500' },
  cancelled: { label: 'Cancelled', icon: '❌', color: 'bg-red-500' },
};

export const WORK_ORDER_PRIORITY_CONFIG: Record<WorkOrderPriority, { label: string; icon: string; color: string }> = {
  low: { label: 'Low', icon: '🟢', color: 'bg-green-500' },
  medium: { label: 'Medium', icon: '🟡', color: 'bg-yellow-500' },
  high: { label: 'High', icon: '🟠', color: 'bg-orange-500' },
  critical: { label: 'Critical', icon: '🔴', color: 'bg-red-500' },
};

export const DOWNTIME_REASON_CONFIG: Record<DowntimeReason, { label: string; icon: string }> = {
  scheduled_maintenance: { label: 'Scheduled Maintenance', icon: '🔧' },
  breakdown: { label: 'Breakdown', icon: '💥' },
  parts_unavailable: { label: 'Parts Unavailable', icon: '📦' },
  awaiting_inspection: { label: 'Awaiting Inspection', icon: '🔍' },
  load_test_required: { label: 'Load Test Required', icon: '⚖️' },
  safety_concern: { label: 'Safety Concern', icon: '⚠️' },
  weather: { label: 'Weather', icon: '🌧️' },
  operator_unavailable: { label: 'Operator Unavailable', icon: '👤' },
  other: { label: 'Other', icon: '📌' },
};

export const SCHEDULE_FREQUENCY_CONFIG: Record<ScheduleFrequencyType, { label: string; singular: string }> = {
  hours: { label: 'Hours', singular: 'hour' },
  days: { label: 'Days', singular: 'day' },
  weeks: { label: 'Weeks', singular: 'week' },
  months: { label: 'Months', singular: 'month' },
  years: { label: 'Years', singular: 'year' },
};
