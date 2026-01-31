/**
 * Equipment CSV Validation Utilities
 * 
 * Validates equipment CSV uploads including:
 * - Required fields
 * - Equipment type validation
 * - Status validation
 */

// CSV column headers
export const EQUIPMENT_CSV_HEADERS = [
  'name',
  'equipment_code',
  'equipment_type',
  'manufacturer',
  'model',
  'serial_number',
  'purchase_date',
  'last_inspection_date',
  'next_inspection_date',
  'status',
  'location',
  'notes',
] as const;

export const REQUIRED_EQUIPMENT_HEADERS = ['name', 'equipment_code', 'equipment_type'] as const;

export const VALID_EQUIPMENT_TYPES = [
  'heavy_machinery',
  'power_tools',
  'hand_tools',
  'vehicles',
  'safety_equipment',
  'lifting_equipment',
  'electrical',
  'pneumatic',
  'other',
] as const;

export const VALID_EQUIPMENT_STATUS = [
  'active',
  'maintenance',
  'out_of_service',
  'retired',
] as const;

export interface EquipmentCSVRow {
  name: string;
  equipment_code: string;
  equipment_type: string;
  manufacturer?: string;
  model?: string;
  serial_number?: string;
  purchase_date?: string;
  last_inspection_date?: string;
  next_inspection_date?: string;
  status?: string;
  location?: string;
  notes?: string;
}

export interface EquipmentValidationError {
  row: number;
  field: string;
  value: string;
  message: string;
}

export interface ParsedEquipmentRow {
  rowNumber: number;
  data: EquipmentCSVRow;
  isValid: boolean;
  errors: EquipmentValidationError[];
}

export interface EquipmentUploadResult {
  total: number;
  valid: number;
  invalid: number;
  rows: ParsedEquipmentRow[];
  headerErrors: string[];
}

/**
 * Validate date format: YYYY-MM-DD
 */
export function isValidDate(date: string): boolean {
  if (!date || date.trim() === '') return true; // Optional field
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date.trim())) return false;
  const parsed = new Date(date.trim());
  return !isNaN(parsed.getTime());
}

/**
 * Validate equipment type
 */
export function isValidEquipmentType(type: string): boolean {
  return VALID_EQUIPMENT_TYPES.includes(type.toLowerCase().trim() as typeof VALID_EQUIPMENT_TYPES[number]);
}

/**
 * Validate equipment status
 */
export function isValidEquipmentStatus(status: string): boolean {
  if (!status || status.trim() === '') return true; // Optional, defaults to 'active'
  return VALID_EQUIPMENT_STATUS.includes(status.toLowerCase().trim() as typeof VALID_EQUIPMENT_STATUS[number]);
}

/**
 * Validate equipment CSV headers
 */
export function validateEquipmentHeaders(headers: string[]): string[] {
  const errors: string[] = [];
  const normalizedHeaders = headers.map(h => h.toLowerCase().trim());
  
  for (const required of REQUIRED_EQUIPMENT_HEADERS) {
    if (!normalizedHeaders.includes(required)) {
      errors.push(`Missing required column: ${required}`);
    }
  }
  
  return errors;
}

/**
 * Validate a single equipment row
 */
export function validateEquipmentRow(
  row: EquipmentCSVRow,
  rowNumber: number,
  existingCodes: Set<string>,
  csvCodes: Set<string>
): EquipmentValidationError[] {
  const errors: EquipmentValidationError[] = [];
  
  // Name required
  if (!row.name || row.name.trim() === '') {
    errors.push({
      row: rowNumber,
      field: 'name',
      value: row.name || '',
      message: 'Equipment name is required',
    });
  }
  
  // Equipment code required and unique
  const code = row.equipment_code?.trim() || '';
  if (!code) {
    errors.push({
      row: rowNumber,
      field: 'equipment_code',
      value: row.equipment_code || '',
      message: 'Equipment code is required',
    });
  } else if (existingCodes.has(code.toLowerCase())) {
    errors.push({
      row: rowNumber,
      field: 'equipment_code',
      value: row.equipment_code,
      message: 'Equipment code already exists',
    });
  } else if (csvCodes.has(code.toLowerCase())) {
    errors.push({
      row: rowNumber,
      field: 'equipment_code',
      value: row.equipment_code,
      message: 'Duplicate code in CSV file',
    });
  }
  
  // Equipment type required and valid
  if (!row.equipment_type || row.equipment_type.trim() === '') {
    errors.push({
      row: rowNumber,
      field: 'equipment_type',
      value: row.equipment_type || '',
      message: 'Equipment type is required',
    });
  } else if (!isValidEquipmentType(row.equipment_type)) {
    errors.push({
      row: rowNumber,
      field: 'equipment_type',
      value: row.equipment_type,
      message: `Invalid type. Must be: ${VALID_EQUIPMENT_TYPES.join(', ')}`,
    });
  }
  
  // Status optional but must be valid
  if (row.status && !isValidEquipmentStatus(row.status)) {
    errors.push({
      row: rowNumber,
      field: 'status',
      value: row.status,
      message: `Invalid status. Must be: ${VALID_EQUIPMENT_STATUS.join(', ')}`,
    });
  }
  
  // Date validations
  if (row.purchase_date && !isValidDate(row.purchase_date)) {
    errors.push({
      row: rowNumber,
      field: 'purchase_date',
      value: row.purchase_date,
      message: 'Invalid date format. Use: YYYY-MM-DD',
    });
  }
  
  if (row.last_inspection_date && !isValidDate(row.last_inspection_date)) {
    errors.push({
      row: rowNumber,
      field: 'last_inspection_date',
      value: row.last_inspection_date,
      message: 'Invalid date format. Use: YYYY-MM-DD',
    });
  }
  
  if (row.next_inspection_date && !isValidDate(row.next_inspection_date)) {
    errors.push({
      row: rowNumber,
      field: 'next_inspection_date',
      value: row.next_inspection_date,
      message: 'Invalid date format. Use: YYYY-MM-DD',
    });
  }
  
  return errors;
}

/**
 * Validate entire equipment CSV data
 */
export function validateEquipmentCSV(
  rows: EquipmentCSVRow[],
  existingCodes: string[] = []
): EquipmentUploadResult {
  const existingCodeSet = new Set(existingCodes.map(c => c.toLowerCase()));
  const csvCodeSet = new Set<string>();
  const parsedRows: ParsedEquipmentRow[] = [];
  
  let validCount = 0;
  let invalidCount = 0;
  
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNumber = i + 2; // +2 for headers and 1-indexing
    
    // Skip empty rows
    if (!row.name && !row.equipment_code && !row.equipment_type) {
      continue;
    }
    
    const errors = validateEquipmentRow(row, rowNumber, existingCodeSet, csvCodeSet);
    const isValid = errors.length === 0;
    
    // Add code to CSV set for duplicate checking
    const code = row.equipment_code?.toLowerCase().trim();
    if (code) {
      csvCodeSet.add(code);
    }
    
    if (isValid) {
      validCount++;
    } else {
      invalidCount++;
    }
    
    parsedRows.push({
      rowNumber,
      data: row,
      isValid,
      errors,
    });
  }
  
  return {
    total: parsedRows.length,
    valid: validCount,
    invalid: invalidCount,
    rows: parsedRows,
    headerErrors: [],
  };
}

/**
 * Generate equipment CSV template content
 */
export function generateEquipmentCSVTemplate(): string {
  const headers = EQUIPMENT_CSV_HEADERS.join(',');
  const sampleRows = [
    'CAT 320 Excavator,EQ-001,heavy_machinery,Caterpillar,320GC,CAT320-2024-001,2024-01-15,2024-06-01,2024-12-01,active,Main Yard,Primary excavator',
    'DeWalt Circular Saw,PT-001,power_tools,DeWalt,DWE575,DW-2023-456,2023-06-20,2024-01-15,2024-07-15,active,Tool Crib,',
    'Ford F-150 Truck,VH-001,vehicles,Ford,F-150,1FTFW1E50KFA12345,2022-03-10,2024-02-01,2024-08-01,active,Fleet Parking,Company truck #1',
    'Fall Arrest Harness,SE-001,safety_equipment,3M,1161431,3M-FA-789,2024-02-01,2024-02-01,2025-02-01,active,Safety Storage,Annual inspection required',
  ];
  
  return [headers, ...sampleRows].join('\n');
}

/**
 * Download equipment CSV template
 */
export function downloadEquipmentCSVTemplate() {
  const content = generateEquipmentCSVTemplate();
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'cor_pathways_equipment_template.csv';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
