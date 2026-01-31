/**
 * Library CSV Validation and Template Utilities
 * 
 * Handles CSV import/export for:
 * - Hazard Library
 * - Task Library
 * - SDS Library
 * - Legislation Library
 */

// ============================================================================
// HAZARD LIBRARY CSV
// ============================================================================

export const HAZARD_CSV_HEADERS = [
  'name',
  'category',
  'subcategory',
  'description',
  'applicable_trades',
  'severity',
  'likelihood',
  'engineering_controls',
  'administrative_controls',
  'required_ppe',
  'regulatory_references',
] as const;

export const HAZARD_REQUIRED_HEADERS = ['name', 'category'] as const;

export const VALID_HAZARD_CATEGORIES = [
  'physical', 'chemical', 'biological', 'ergonomic', 'psychosocial',
  'electrical', 'mechanical', 'fall', 'struck_by', 'caught_in',
  'environmental', 'fire_explosion', 'confined_space', 'radiation', 'other'
] as const;

export function generateHazardCSVTemplate(): string {
  const headers = HAZARD_CSV_HEADERS.join(',');
  const sampleRows = [
    '"Working at Heights","fall","ladders","Risk of falling from elevated work surfaces","Carpenter;Roofer;Ironworker",4,3,"Guardrails;Safety nets","Fall protection training;Pre-use inspection","Full body harness;Hard hat;Safety boots","OHS Reg Part 9"',
    '"Silica Dust Exposure","chemical","respirable dust","Exposure to crystalline silica during cutting/grinding","Mason;Concrete Finisher",4,4,"Water suppression;Local exhaust ventilation","Exposure monitoring;Rotation","N95 respirator;Safety glasses","OHS Reg Part 4"',
    '"Electrical Contact","electrical","live circuits","Contact with energized electrical components","Electrician;General Labourer",5,2,"Lockout/tagout;Insulated tools","Qualified worker only;Permit required","Insulated gloves;Arc flash suit","OHS Reg Part 10"',
  ];
  return [headers, ...sampleRows].join('\n');
}

export function downloadHazardCSVTemplate() {
  const content = generateHazardCSVTemplate();
  downloadCSV(content, 'cor_pathways_hazard_library_template.csv');
}

// ============================================================================
// TASK LIBRARY CSV
// ============================================================================

export const TASK_CSV_HEADERS = [
  'name',
  'task_code',
  'category',
  'trade',
  'description',
  'procedure_steps',
  'hazards',
  'required_equipment',
  'required_certifications',
  'ppe_required',
  'duration_hours',
  'crew_size_min',
  'crew_size_max',
] as const;

export const TASK_REQUIRED_HEADERS = ['name', 'category', 'trade'] as const;

export function generateTaskCSVTemplate(): string {
  const headers = TASK_CSV_HEADERS.join(',');
  const sampleRows = [
    '"Concrete Pour","TASK-001","Foundation","Concrete Finisher","Placing and finishing concrete","Set forms;Place concrete;Vibrate;Screed;Float;Cure","Silica dust;Manual handling;Skin irritation","Concrete vibrator;Screeds;Floats;Trowels","None","Safety boots;Safety glasses;Gloves;Long sleeves",4,2,4',
    '"Roof Shingle Install","TASK-002","Roofing","Roofer","Installing asphalt shingles on pitched roof","Install underlayment;Starter strip;Field shingles;Cap shingles","Falls;Heat stress;Struck by","Nail gun;Utility knife;Chalk line","Fall protection","Harness;Hard hat;Knee pads",6,2,3',
    '"Electrical Panel Install","TASK-003","Electrical","Electrician","Installing main electrical panel","Mount panel;Run conduit;Pull wire;Terminate;Label;Test","Electrical shock;Arc flash","Multimeter;Wire strippers;Drill","Electrician certification","Insulated gloves;Safety glasses",8,1,2',
  ];
  return [headers, ...sampleRows].join('\n');
}

export function downloadTaskCSVTemplate() {
  const content = generateTaskCSVTemplate();
  downloadCSV(content, 'cor_pathways_task_library_template.csv');
}

// ============================================================================
// SDS LIBRARY CSV
// ============================================================================

export const SDS_CSV_HEADERS = [
  'product_name',
  'manufacturer',
  'product_identifier',
  'sds_revision_date',
  'whmis_hazard_classes',
  'hazard_statements',
  'precautionary_statements',
  'ppe_required',
  'storage_requirements',
  'disposal_requirements',
  'emergency_phone',
  'locations',
] as const;

export const SDS_REQUIRED_HEADERS = ['product_name', 'manufacturer'] as const;

export function generateSDSCSVTemplate(): string {
  const headers = SDS_CSV_HEADERS.join(',');
  const sampleRows = [
    '"Portland Cement","Lafarge","PC-001","2024-01-15","skin_corrosion;respiratory_sensitization","Causes skin irritation;May cause respiratory irritation","Avoid breathing dust;Wear protective gloves","N95 respirator;Safety glasses;Gloves","Store in dry area","Dispose as construction waste","1-800-555-0123","Main warehouse;Site trailer"',
    '"Diesel Fuel","Shell","DF-001","2024-03-01","flammable_liquids;acute_toxicity","Flammable liquid;Harmful if swallowed","Keep away from heat/sparks;Do not ingest","Safety glasses;Nitrile gloves","Store in approved container away from ignition","Dispose through licensed facility","1-800-555-0456","Equipment yard;Fuel station"',
    '"Muriatic Acid","Diversey","MA-001","2024-02-20","skin_corrosion;acute_toxicity","Causes severe skin burns;Harmful if inhaled","Do not breathe fumes;Wear face shield","Face shield;Acid gloves;Apron;Respirator","Store in corrosive cabinet","Neutralize before disposal","1-800-555-0789","Chemical storage room"',
  ];
  return [headers, ...sampleRows].join('\n');
}

export function downloadSDSCSVTemplate() {
  const content = generateSDSCSVTemplate();
  downloadCSV(content, 'cor_pathways_sds_library_template.csv');
}

// ============================================================================
// LEGISLATION LIBRARY CSV
// ============================================================================

export const LEGISLATION_CSV_HEADERS = [
  'short_name',
  'full_name',
  'jurisdiction',
  'effective_date',
  'last_amended',
  'description',
  'url',
  'section_number',
  'section_title',
  'section_summary',
] as const;

export const LEGISLATION_REQUIRED_HEADERS = ['short_name', 'full_name', 'jurisdiction'] as const;

export function generateLegislationCSVTemplate(): string {
  const headers = LEGISLATION_CSV_HEADERS.join(',');
  const sampleRows = [
    '"AB OHS Reg","Occupational Health and Safety Regulation","Alberta","2024-01-01","2024-06-01","Alberta workplace safety regulations","https://kings-printer.alberta.ca","Part 9","Fall Protection","Requirements for fall protection systems when working at heights over 3m"',
    '"AB OHS Reg","Occupational Health and Safety Regulation","Alberta","2024-01-01","2024-06-01","Alberta workplace safety regulations","https://kings-printer.alberta.ca","Part 4","Chemical Hazards","Requirements for WHMIS and chemical hazard control"',
    '"AB OHS Reg","Occupational Health and Safety Regulation","Alberta","2024-01-01","2024-06-01","Alberta workplace safety regulations","https://kings-printer.alberta.ca","Part 10","Electrical Safety","Requirements for work on electrical equipment"',
  ];
  return [headers, ...sampleRows].join('\n');
}

export function downloadLegislationCSVTemplate() {
  const content = generateLegislationCSVTemplate();
  downloadCSV(content, 'cor_pathways_legislation_library_template.csv');
}

// ============================================================================
// COMMON UTILITIES
// ============================================================================

function downloadCSV(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export interface LibraryImportResult {
  total: number;
  valid: number;
  invalid: number;
  errors: { row: number; field: string; message: string }[];
}

export function validateCSVHeaders(
  headers: string[],
  requiredHeaders: readonly string[]
): string[] {
  const errors: string[] = [];
  const normalizedHeaders = headers.map(h => h.toLowerCase().trim());
  
  for (const required of requiredHeaders) {
    if (!normalizedHeaders.includes(required)) {
      errors.push(`Missing required column: ${required}`);
    }
  }
  
  return errors;
}

// Parse semicolon-separated values into array
export function parseArrayField(value: string | undefined): string[] {
  if (!value || value.trim() === '') return [];
  return value.split(';').map(v => v.trim()).filter(v => v.length > 0);
}
