/**
 * Auto-Population Module
 * 
 * Handles automatic field population when a library item is selected.
 * Supports cascading updates, computed fields, and form state management.
 */

import {
  LibrarySource,
  LibraryItem,
  getLibraryItem,
  getAutoPopulateValues,
  AutoPopulateConfig,
  HazardLibraryItem,
  EquipmentLibraryItem,
  TaskLibraryItem,
  JobsiteLibraryItem,
  SDSLibraryItem,
} from './library-integration';

// =============================================================================
// Types
// =============================================================================

export interface AutoPopulateResult {
  /** Fields that were populated */
  populatedFields: string[];
  /** Values that were set */
  values: Record<string, unknown>;
  /** Any warnings (e.g., missing source data) */
  warnings: string[];
}

export interface AutoPopulateOptions {
  /** Fields to populate */
  fieldsToPopulate: string[];
  /** Custom field mappings */
  customMappings?: AutoPopulateConfig[];
  /** Whether to overwrite existing values */
  overwriteExisting?: boolean;
  /** Current form values (to check if fields are already filled) */
  currentValues?: Record<string, unknown>;
  /** Transform functions for specific fields */
  transforms?: Record<string, (value: unknown) => unknown>;
}

// =============================================================================
// Main Auto-Populate Function
// =============================================================================

/**
 * Auto-populate form fields based on a selected library item
 */
export async function autoPopulateFromLibrary(
  source: LibrarySource,
  itemId: string,
  options: AutoPopulateOptions
): Promise<AutoPopulateResult> {
  const result: AutoPopulateResult = {
    populatedFields: [],
    values: {},
    warnings: [],
  };
  
  // Fetch the full item
  const item = await getLibraryItem(source, itemId);
  
  if (!item) {
    result.warnings.push(`Could not fetch ${source} item with ID: ${itemId}`);
    return result;
  }
  
  return autoPopulateFromItem(item, source, options);
}

/**
 * Auto-populate from an already-loaded library item
 */
export function autoPopulateFromItem(
  item: LibraryItem,
  source: LibrarySource,
  options: AutoPopulateOptions
): AutoPopulateResult {
  const {
    fieldsToPopulate,
    customMappings,
    overwriteExisting = false,
    currentValues = {},
    transforms = {},
  } = options;
  
  const result: AutoPopulateResult = {
    populatedFields: [],
    values: {},
    warnings: [],
  };
  
  // Get base auto-populate values
  const baseValues = getAutoPopulateValues(item, source, fieldsToPopulate, customMappings);
  
  // Process each field
  for (const fieldCode of fieldsToPopulate) {
    // Safe: fieldCode is from fieldsToPopulate array (controlled field codes)
    // eslint-disable-next-line security/detect-object-injection
    let value = baseValues[fieldCode];
    
    // Skip if no value available
    if (value === undefined || value === null) {
      continue;
    }
    
    // Skip if field already has a value and we're not overwriting
    // Safe: fieldCode is from fieldsToPopulate array (controlled field codes)
    // eslint-disable-next-line security/detect-object-injection
    if (!overwriteExisting && currentValues[fieldCode] !== undefined && currentValues[fieldCode] !== null && currentValues[fieldCode] !== '') {
      continue;
    }
    
    // Apply custom transform if provided
    // Safe: fieldCode is from fieldsToPopulate array (controlled field codes)
    // eslint-disable-next-line security/detect-object-injection
    if (transforms[fieldCode]) {
      // eslint-disable-next-line security/detect-object-injection
      value = transforms[fieldCode](value);
    }
    
    // Safe: fieldCode is from fieldsToPopulate array (controlled field codes)
    // eslint-disable-next-line security/detect-object-injection
    result.values[fieldCode] = value;
    result.populatedFields.push(fieldCode);
  }
  
  return result;
}

// =============================================================================
// Source-Specific Auto-Populate Functions
// =============================================================================

/**
 * Auto-populate from a jobsite selection
 */
export function autoPopulateFromJobsite(
  jobsite: JobsiteLibraryItem,
  fieldsToPopulate: string[],
  currentValues: Record<string, unknown> = {}
): AutoPopulateResult {
  return autoPopulateFromItem(jobsite, 'jobsites', {
    fieldsToPopulate,
    currentValues,
    customMappings: [
      // Add jobsite-specific computed fields
      {
        sourceField: 'site_specific_hazards',
        targetField: 'known_site_hazards',
        transform: (hazards) => Array.isArray(hazards) ? hazards.join(', ') : hazards,
      },
      {
        sourceField: '',
        targetField: 'jobsite_info',
        transform: () => ({
          id: jobsite.id,
          number: jobsite.jobsite_number,
          name: jobsite.name,
          address: jobsite.address,
        }),
      },
    ],
  });
}

/**
 * Auto-populate from an equipment selection
 */
export function autoPopulateFromEquipment(
  equipment: EquipmentLibraryItem,
  fieldsToPopulate: string[],
  currentValues: Record<string, unknown> = {}
): AutoPopulateResult {
  return autoPopulateFromItem(equipment, 'equipment', {
    fieldsToPopulate,
    currentValues,
    customMappings: [
      {
        sourceField: '',
        targetField: 'make_model',
        transform: () => [equipment.make, equipment.model].filter(Boolean).join(' '),
      },
      {
        sourceField: '',
        targetField: 'equipment_details',
        transform: () => ({
          id: equipment.id,
          number: equipment.equipment_number,
          name: equipment.name,
          type: equipment.equipment_type,
          serialNumber: equipment.serial_number,
        }),
      },
      {
        sourceField: 'inspection_checklist',
        targetField: 'inspection_items',
        transform: (checklist) => {
          if (!Array.isArray(checklist)) return [];
          return checklist.map(item => ({
            item: item.item,
            category: item.category,
            passed: null, // To be filled by user
            notes: '',
          }));
        },
      },
    ],
  });
}

/**
 * Auto-populate from a hazard selection
 */
export function autoPopulateFromHazard(
  hazard: HazardLibraryItem,
  fieldsToPopulate: string[],
  currentValues: Record<string, unknown> = {}
): AutoPopulateResult {
  return autoPopulateFromItem(hazard, 'hazards', {
    fieldsToPopulate,
    currentValues,
    customMappings: [
      {
        sourceField: 'recommended_controls',
        targetField: 'all_controls',
        transform: (controls) => {
          if (!Array.isArray(controls)) return [];
          return controls.map(c => ({
            type: c.type,
            control: c.control,
            required: c.required,
            implemented: false, // To be filled by user
          }));
        },
      },
      {
        sourceField: '',
        targetField: 'hazard_summary',
        transform: () => ({
          id: hazard.id,
          code: hazard.hazard_code,
          name: hazard.name,
          category: hazard.category,
          riskLevel: hazard.default_risk_level,
          riskScore: hazard.default_risk_score,
        }),
      },
      {
        sourceField: 'regulatory_references',
        targetField: 'applicable_regulations',
        transform: (refs) => {
          if (!Array.isArray(refs)) return '';
          return refs.map(r => `${r.regulation} ${r.section}: ${r.title}`).join('\n');
        },
      },
    ],
  });
}

/**
 * Auto-populate from a task selection
 */
export function autoPopulateFromTask(
  task: TaskLibraryItem,
  fieldsToPopulate: string[],
  currentValues: Record<string, unknown> = {}
): AutoPopulateResult {
  return autoPopulateFromItem(task, 'tasks', {
    fieldsToPopulate,
    currentValues,
    customMappings: [
      {
        sourceField: 'typical_hazards',
        targetField: 'identified_hazards',
        transform: (hazards) => {
          if (!Array.isArray(hazards)) return [];
          return hazards.map(h => ({
            hazard_id: h.hazard_id,
            hazard_name: h.hazard_name,
            risk_level: h.risk_level,
            controls_implemented: [],
          }));
        },
      },
      {
        sourceField: 'procedure_steps',
        targetField: 'work_procedure',
        transform: (steps) => {
          if (!Array.isArray(steps)) return '';
          return steps.map((step, i) => `${i + 1}. ${step}`).join('\n');
        },
      },
      {
        sourceField: '',
        targetField: 'task_details',
        transform: () => ({
          id: task.id,
          code: task.task_code,
          name: task.name,
          category: task.category,
          trade: task.trade,
          duration: task.typical_duration_hours,
          crewSize: { min: task.crew_size_min, max: task.crew_size_max },
        }),
      },
    ],
  });
}

/**
 * Auto-populate from an SDS selection
 */
export function autoPopulateFromSDS(
  sds: SDSLibraryItem,
  fieldsToPopulate: string[],
  currentValues: Record<string, unknown> = {}
): AutoPopulateResult {
  return autoPopulateFromItem(sds, 'sds', {
    fieldsToPopulate,
    currentValues,
    customMappings: [
      {
        sourceField: 'whmis_classification',
        targetField: 'whmis_classes',
        transform: (classes) => Array.isArray(classes) ? classes.join(', ') : classes,
      },
      {
        sourceField: '',
        targetField: 'first_aid_all',
        transform: () => ({
          inhalation: sds.first_aid_inhalation,
          skin: sds.first_aid_skin,
          eyes: sds.first_aid_eyes,
          ingestion: sds.first_aid_ingestion,
        }),
      },
      {
        sourceField: '',
        targetField: 'chemical_info',
        transform: () => ({
          id: sds.id,
          number: sds.sds_number,
          name: sds.product_name,
          manufacturer: sds.manufacturer,
          emergencyPhone: sds.emergency_phone,
        }),
      },
      {
        sourceField: 'hazard_statements',
        targetField: 'hazard_info',
        transform: (statements) => Array.isArray(statements) ? statements.join('\n') : statements,
      },
    ],
  });
}

// =============================================================================
// Cascading Auto-Populate
// =============================================================================

export interface CascadeConfig {
  /** The field that triggers the cascade */
  triggerField: string;
  /** The library source to fetch from */
  source: LibrarySource;
  /** Fields to auto-populate */
  populateFields: string[];
  /** Optional: another cascade to trigger after this one */
  nextCascade?: CascadeConfig;
}

/**
 * Handle cascading auto-population (e.g., selecting a task auto-fills hazards,
 * which then auto-fills controls)
 */
export async function handleCascadeAutoPopulate(
  cascadeConfig: CascadeConfig,
  selectedId: string,
  setFieldValue: (field: string, value: unknown) => void
): Promise<void> {
  const result = await autoPopulateFromLibrary(
    cascadeConfig.source,
    selectedId,
    { fieldsToPopulate: cascadeConfig.populateFields }
  );
  
  // Set all populated values
  for (const [field, value] of Object.entries(result.values)) {
    setFieldValue(field, value);
  }
  
  // Handle next cascade if configured
  if (cascadeConfig.nextCascade) {
    // Safe: triggerField is from cascadeConfig which is a controlled CascadeConfig object
     
    const nextTriggerId = result.values[cascadeConfig.nextCascade.triggerField];
    if (nextTriggerId && typeof nextTriggerId === 'string') {
      await handleCascadeAutoPopulate(
        cascadeConfig.nextCascade,
        nextTriggerId,
        setFieldValue
      );
    }
  }
}

// =============================================================================
// Multi-Select Auto-Populate
// =============================================================================

/**
 * Auto-populate from multiple hazard selections
 */
export function autoPopulateFromMultipleHazards(
  hazards: HazardLibraryItem[],
  fieldsToPopulate: string[]
): AutoPopulateResult {
  const result: AutoPopulateResult = {
    populatedFields: [],
    values: {},
    warnings: [],
  };
  
  // Aggregate PPE from all hazards
  if (fieldsToPopulate.includes('required_ppe') || fieldsToPopulate.includes('all_ppe')) {
    const allPPE = new Set<string>();
    hazards.forEach(h => {
      (h.required_ppe || []).forEach(ppe => allPPE.add(ppe));
    });
    result.values['required_ppe'] = Array.from(allPPE);
    result.values['all_ppe'] = Array.from(allPPE);
    result.populatedFields.push('required_ppe', 'all_ppe');
  }
  
  // Aggregate controls by type
  if (fieldsToPopulate.includes('all_controls')) {
    const controls = {
      engineering: new Set<string>(),
      administrative: new Set<string>(),
      ppe: new Set<string>(),
    };
    
    hazards.forEach(h => {
      (h.recommended_controls || []).forEach(c => {
        if (c.type === 'engineering') controls.engineering.add(c.control);
        else if (c.type === 'administrative') controls.administrative.add(c.control);
        else if (c.type === 'ppe') controls.ppe.add(c.control);
      });
    });
    
    result.values['all_controls'] = {
      engineering: Array.from(controls.engineering),
      administrative: Array.from(controls.administrative),
      ppe: Array.from(controls.ppe),
    };
    result.populatedFields.push('all_controls');
  }
  
  // Get highest risk level
  if (fieldsToPopulate.includes('highest_risk_level')) {
    const riskOrder = ['negligible', 'low', 'medium', 'high', 'critical'];
    let highestRisk = 'negligible';
    
    hazards.forEach(h => {
      const riskIndex = riskOrder.indexOf(h.default_risk_level);
      const currentIndex = riskOrder.indexOf(highestRisk);
      if (riskIndex > currentIndex) {
        highestRisk = h.default_risk_level;
      }
    });
    
    result.values['highest_risk_level'] = highestRisk;
    result.populatedFields.push('highest_risk_level');
  }
  
  // Aggregate regulatory references
  if (fieldsToPopulate.includes('all_regulations')) {
    const regulations = new Set<string>();
    hazards.forEach(h => {
      (h.regulatory_references || []).forEach(ref => {
        regulations.add(`${ref.regulation} ${ref.section}`);
      });
    });
    result.values['all_regulations'] = Array.from(regulations);
    result.populatedFields.push('all_regulations');
  }
  
  // Create hazard summary list
  if (fieldsToPopulate.includes('hazard_list')) {
    result.values['hazard_list'] = hazards.map(h => ({
      id: h.id,
      code: h.hazard_code,
      name: h.name,
      category: h.category,
      riskLevel: h.default_risk_level,
    }));
    result.populatedFields.push('hazard_list');
  }
  
  return result;
}


