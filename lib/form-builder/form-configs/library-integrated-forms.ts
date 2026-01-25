/**
 * Library-Integrated Form Configurations Index
 * 
 * These form configurations demonstrate the full integration of master libraries
 * with the form system, including:
 * 
 * - Dynamic dropdown population from libraries
 * - Auto-population of related fields
 * - Cascading data (e.g., task → hazards → controls)
 * - Certification checking
 * - Offline support via IndexedDB cache
 * 
 * Use these as templates for creating new library-integrated forms.
 */

// Form configurations
export { default as libraryHazardAssessment } from './library-integrated-hazard-assessment';
export { default as libraryEquipmentInspection } from './library-integrated-equipment-inspection';
export { default as libraryIncidentReport } from './library-integrated-incident-report';
export { default as libraryToolboxTalk } from './library-integrated-toolbox-talk';

// Individual exports for specific use cases
export {
  LIBRARY_HAZARD_ASSESSMENT_TEMPLATE,
  LIBRARY_HAZARD_ASSESSMENT_SECTIONS,
  LIBRARY_HAZARD_ASSESSMENT_FIELDS,
} from './library-integrated-hazard-assessment';

export {
  LIBRARY_EQUIPMENT_INSPECTION_TEMPLATE,
  LIBRARY_EQUIPMENT_INSPECTION_SECTIONS,
  LIBRARY_EQUIPMENT_INSPECTION_FIELDS,
} from './library-integrated-equipment-inspection';

export {
  LIBRARY_INCIDENT_REPORT_TEMPLATE,
  LIBRARY_INCIDENT_REPORT_SECTIONS,
  LIBRARY_INCIDENT_REPORT_FIELDS,
} from './library-integrated-incident-report';

export {
  LIBRARY_TOOLBOX_TALK_TEMPLATE,
  LIBRARY_TOOLBOX_TALK_SECTIONS,
  LIBRARY_TOOLBOX_TALK_FIELDS,
} from './library-integrated-toolbox-talk';

/**
 * All library-integrated form configurations
 */
export const LIBRARY_INTEGRATED_FORMS = {
  'LIB-HA-001': 'library-integrated-hazard-assessment',
  'LIB-EI-001': 'library-integrated-equipment-inspection',
  'LIB-IR-001': 'library-integrated-incident-report',
  'LIB-TT-001': 'library-integrated-toolbox-talk',
};

/**
 * Form code to template mapping
 */
export const FORM_CODE_TO_CONFIG: Record<string, {
  template: any;
  sections: any;
  fields: any;
}> = {};

// Dynamically populate the mapping
import hazardAssessment from './library-integrated-hazard-assessment';
import equipmentInspection from './library-integrated-equipment-inspection';
import incidentReport from './library-integrated-incident-report';
import toolboxTalk from './library-integrated-toolbox-talk';

FORM_CODE_TO_CONFIG['LIB-HA-001'] = hazardAssessment;
FORM_CODE_TO_CONFIG['LIB-EI-001'] = equipmentInspection;
FORM_CODE_TO_CONFIG['LIB-IR-001'] = incidentReport;
FORM_CODE_TO_CONFIG['LIB-TT-001'] = toolboxTalk;
