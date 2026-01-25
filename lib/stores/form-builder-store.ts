/**
 * Form Builder Zustand Store
 * 
 * State management for the form template builder admin interface.
 * Handles sections, fields, workflows, undo/redo, and auto-save.
 */

import { create } from 'zustand';
import { persist, devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import {
  FormTemplate,
  FormSection,
  FormField,
  FormWorkflow,
  FieldType,
  ValidationRules,
  ConditionalLogic,
} from '@/components/form-builder/types';

// =============================================================================
// TYPES
// =============================================================================

interface HistoryState {
  sections: FormSection[];
  fields: Map<string, FormField[]>;
}

interface FormBuilderState {
  // Template data
  template: Partial<FormTemplate> | null;
  sections: FormSection[];
  fields: Map<string, FormField[]>; // sectionId -> fields[]
  workflow: Partial<FormWorkflow> | null;
  
  // UI state
  selectedSectionId: string | null;
  selectedFieldId: string | null;
  mode: 'edit' | 'preview';
  isDirty: boolean;
  isSaving: boolean;
  lastSavedAt: Date | null;
  
  // History for undo/redo
  history: HistoryState[];
  historyIndex: number;
  maxHistory: number;
  
  // Errors
  validationErrors: string[];
}

interface FormBuilderActions {
  // Template actions
  initTemplate: (template?: Partial<FormTemplate>) => void;
  updateTemplate: (updates: Partial<FormTemplate>) => void;
  resetTemplate: () => void;
  
  // Section actions
  addSection: (section?: Partial<FormSection>) => string;
  updateSection: (id: string, updates: Partial<FormSection>) => void;
  deleteSection: (id: string) => void;
  reorderSections: (sourceIndex: number, destIndex: number) => void;
  duplicateSection: (id: string) => string;
  
  // Field actions
  addField: (sectionId: string, field: Partial<FormField>) => string;
  updateField: (fieldId: string, updates: Partial<FormField>) => void;
  deleteField: (fieldId: string) => void;
  reorderFields: (sectionId: string, sourceIndex: number, destIndex: number) => void;
  moveFieldToSection: (fieldId: string, sourceSectionId: string, targetSectionId: string, targetIndex: number) => void;
  duplicateField: (fieldId: string) => string;
  
  // Workflow actions
  updateWorkflow: (updates: Partial<FormWorkflow>) => void;
  
  // Selection
  selectSection: (id: string | null) => void;
  selectField: (id: string | null) => void;
  
  // Mode
  setMode: (mode: 'edit' | 'preview') => void;
  toggleMode: () => void;
  
  // History
  pushHistory: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  
  // Saving
  setSaving: (isSaving: boolean) => void;
  markSaved: () => void;
  markDirty: () => void;
  
  // Validation
  validate: () => boolean;
  clearValidationErrors: () => void;
  
  // Helpers
  getSection: (id: string) => FormSection | undefined;
  getField: (id: string) => FormField | undefined;
  getSectionFields: (sectionId: string) => FormField[];
  getAllFields: () => FormField[];
  getFieldByCode: (code: string) => FormField | undefined;
  generateFieldCode: (label: string) => string;
}

// =============================================================================
// INITIAL STATE
// =============================================================================

const initialState: FormBuilderState = {
  template: null,
  sections: [],
  fields: new Map(),
  workflow: null,
  selectedSectionId: null,
  selectedFieldId: null,
  mode: 'edit',
  isDirty: false,
  isSaving: false,
  lastSavedAt: null,
  history: [],
  historyIndex: -1,
  maxHistory: 50,
  validationErrors: [],
};

// =============================================================================
// HELPERS
// =============================================================================

function generateId(): string {
  return crypto.randomUUID();
}

function generateFieldCode(label: string, existingCodes: Set<string>): string {
  let code = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .substring(0, 30);
  
  if (!code) code = 'field';
  
  let finalCode = code;
  let counter = 1;
  
  while (existingCodes.has(finalCode)) {
    finalCode = `${code}_${counter}`;
    counter++;
  }
  
  return finalCode;
}

// =============================================================================
// STORE
// =============================================================================

export const useFormBuilderStore = create<FormBuilderState & FormBuilderActions>()(
  devtools(
    immer((set, get) => ({
      ...initialState,

      // =========================================================================
      // TEMPLATE ACTIONS
      // =========================================================================

      initTemplate: (template) => {
        set((state) => {
          state.template = template || {
            form_code: '',
            name: '',
            description: '',
            cor_element: null,
            frequency: 'as_needed',
            estimated_time_minutes: 5,
            icon: 'file-text',
            color: '#3b82f6',
            is_active: false,
            is_mandatory: false,
            version: 1,
          };
          state.sections = [];
          state.fields = new Map();
          state.workflow = {
            submit_to_role: 'supervisor',
            notify_roles: [],
            notify_emails: [],
            creates_task: false,
            requires_approval: false,
            sync_priority: 3,
            auto_create_evidence: false,
          };
          state.selectedSectionId = null;
          state.selectedFieldId = null;
          state.isDirty = false;
          state.history = [];
          state.historyIndex = -1;
        });
      },

      updateTemplate: (updates) => {
        set((state) => {
          if (state.template) {
            Object.assign(state.template, updates);
          }
          state.isDirty = true;
        });
      },

      resetTemplate: () => {
        set(() => initialState);
      },

      // =========================================================================
      // SECTION ACTIONS
      // =========================================================================

      addSection: (sectionData) => {
        const id = generateId();
        const orderIndex = get().sections.length;
        
        set((state) => {
          const newSection: FormSection = {
            id,
            form_template_id: state.template?.id || '',
            title: sectionData?.title || `Section ${orderIndex + 1}`,
            description: sectionData?.description || null,
            order_index: orderIndex,
            is_repeatable: sectionData?.is_repeatable || false,
            min_repeats: sectionData?.min_repeats || 1,
            max_repeats: sectionData?.max_repeats || 10,
            conditional_logic: sectionData?.conditional_logic || null,
            created_at: new Date().toISOString(),
          };
          
          state.sections.push(newSection);
          state.fields.set(id, []);
          state.selectedSectionId = id;
          state.isDirty = true;
        });
        
        get().pushHistory();
        return id;
      },

      updateSection: (id, updates) => {
        set((state) => {
          const section = state.sections.find(s => s.id === id);
          if (section) {
            Object.assign(section, updates);
            state.isDirty = true;
          }
        });
      },

      deleteSection: (id) => {
        get().pushHistory();
        set((state) => {
          state.sections = state.sections.filter(s => s.id !== id);
          state.fields.delete(id);
          
          // Reorder remaining sections
          state.sections.forEach((s, index) => {
            s.order_index = index;
          });
          
          if (state.selectedSectionId === id) {
            state.selectedSectionId = state.sections[0]?.id || null;
          }
          state.isDirty = true;
        });
      },

      reorderSections: (sourceIndex, destIndex) => {
        get().pushHistory();
        set((state) => {
          const [removed] = state.sections.splice(sourceIndex, 1);
          state.sections.splice(destIndex, 0, removed);
          
          // Update order indices
          state.sections.forEach((s, index) => {
            s.order_index = index;
          });
          state.isDirty = true;
        });
      },

      duplicateSection: (id) => {
        const section = get().getSection(id);
        if (!section) return '';
        
        const newId = generateId();
        const fields = get().getSectionFields(id);
        
        get().pushHistory();
        set((state) => {
          const newSection: FormSection = {
            ...section,
            id: newId,
            title: `${section.title} (Copy)`,
            order_index: state.sections.length,
            created_at: new Date().toISOString(),
          };
          
          state.sections.push(newSection);
          
          // Duplicate fields
          const existingCodes = new Set(get().getAllFields().map(f => f.field_code));
          const newFields = fields.map(field => ({
            ...field,
            id: generateId(),
            form_section_id: newId,
            field_code: generateFieldCode(field.label, existingCodes),
            created_at: new Date().toISOString(),
          }));
          
          newFields.forEach(f => existingCodes.add(f.field_code));
          state.fields.set(newId, newFields);
          state.isDirty = true;
        });
        
        return newId;
      },

      // =========================================================================
      // FIELD ACTIONS
      // =========================================================================

      addField: (sectionId, fieldData) => {
        const id = generateId();
        const existingCodes = new Set(get().getAllFields().map(f => f.field_code));
        const label = fieldData.label || 'New Field';
        const fieldCode = fieldData.field_code || generateFieldCode(label, existingCodes);
        const fields = get().getSectionFields(sectionId);
        
        get().pushHistory();
        set((state) => {
          const newField: FormField = {
            id,
            form_section_id: sectionId,
            field_code: fieldCode,
            label,
            field_type: fieldData.field_type || 'text',
            placeholder: fieldData.placeholder || null,
            help_text: fieldData.help_text || null,
            default_value: fieldData.default_value || null,
            width: fieldData.width || 'full',
            options: fieldData.options || null,
            validation_rules: fieldData.validation_rules || { required: false },
            conditional_logic: fieldData.conditional_logic || null,
            order_index: fields.length,
            created_at: new Date().toISOString(),
          };
          
          const sectionFields = state.fields.get(sectionId) || [];
          sectionFields.push(newField);
          state.fields.set(sectionId, sectionFields);
          state.selectedFieldId = id;
          state.isDirty = true;
        });
        
        return id;
      },

      updateField: (fieldId, updates) => {
        set((state) => {
          for (const [sectionId, fields] of state.fields) {
            const fieldIndex = fields.findIndex(f => f.id === fieldId);
            if (fieldIndex !== -1) {
              const updatedFields = [...fields];
              // Safe: fieldIndex is from findIndex() on the same array (bounded by array length)
              // eslint-disable-next-line security/detect-object-injection
              updatedFields[fieldIndex] = { ...updatedFields[fieldIndex], ...updates };
              state.fields.set(sectionId, updatedFields);
              state.isDirty = true;
              break;
            }
          }
        });
      },

      deleteField: (fieldId) => {
        get().pushHistory();
        set((state) => {
          for (const [sectionId, fields] of state.fields) {
            const fieldIndex = fields.findIndex(f => f.id === fieldId);
            if (fieldIndex !== -1) {
              const updatedFields = fields.filter(f => f.id !== fieldId);
              // Reorder
              updatedFields.forEach((f, index) => {
                f.order_index = index;
              });
              state.fields.set(sectionId, updatedFields);
              
              if (state.selectedFieldId === fieldId) {
                state.selectedFieldId = null;
              }
              state.isDirty = true;
              break;
            }
          }
        });
      },

      reorderFields: (sectionId, sourceIndex, destIndex) => {
        get().pushHistory();
        set((state) => {
          const fields = state.fields.get(sectionId);
          if (fields) {
            const [removed] = fields.splice(sourceIndex, 1);
            fields.splice(destIndex, 0, removed);
            
            // Update order indices
            fields.forEach((f, index) => {
              f.order_index = index;
            });
            state.isDirty = true;
          }
        });
      },

      moveFieldToSection: (fieldId, sourceSectionId, targetSectionId, targetIndex) => {
        get().pushHistory();
        set((state) => {
          const sourceFields = state.fields.get(sourceSectionId);
          const targetFields = state.fields.get(targetSectionId);
          
          if (sourceFields && targetFields) {
            const fieldIndex = sourceFields.findIndex(f => f.id === fieldId);
            if (fieldIndex !== -1) {
              const [field] = sourceFields.splice(fieldIndex, 1);
              field.form_section_id = targetSectionId;
              targetFields.splice(targetIndex, 0, field);
              
              // Reorder both sections
              sourceFields.forEach((f, index) => f.order_index = index);
              targetFields.forEach((f, index) => f.order_index = index);
              state.isDirty = true;
            }
          }
        });
      },

      duplicateField: (fieldId) => {
        const field = get().getField(fieldId);
        if (!field) return '';
        
        const newId = generateId();
        const existingCodes = new Set(get().getAllFields().map(f => f.field_code));
        
        get().pushHistory();
        set((state) => {
          const sectionFields = state.fields.get(field.form_section_id);
          if (sectionFields) {
            const newField: FormField = {
              ...field,
              id: newId,
              field_code: generateFieldCode(field.label, existingCodes),
              order_index: sectionFields.length,
              created_at: new Date().toISOString(),
            };
            sectionFields.push(newField);
            state.selectedFieldId = newId;
            state.isDirty = true;
          }
        });
        
        return newId;
      },

      // =========================================================================
      // WORKFLOW ACTIONS
      // =========================================================================

      updateWorkflow: (updates) => {
        set((state) => {
          if (state.workflow) {
            Object.assign(state.workflow, updates);
          }
          state.isDirty = true;
        });
      },

      // =========================================================================
      // SELECTION
      // =========================================================================

      selectSection: (id) => {
        set((state) => {
          state.selectedSectionId = id;
          state.selectedFieldId = null;
        });
      },

      selectField: (id) => {
        set((state) => {
          state.selectedFieldId = id;
          // Also select the field's section
          if (id) {
            const field = get().getField(id);
            if (field) {
              state.selectedSectionId = field.form_section_id;
            }
          }
        });
      },

      // =========================================================================
      // MODE
      // =========================================================================

      setMode: (mode) => {
        set((state) => {
          state.mode = mode;
        });
      },

      toggleMode: () => {
        set((state) => {
          state.mode = state.mode === 'edit' ? 'preview' : 'edit';
        });
      },

      // =========================================================================
      // HISTORY
      // =========================================================================

      pushHistory: () => {
        set((state) => {
          const currentState: HistoryState = {
            sections: JSON.parse(JSON.stringify(state.sections)),
            fields: new Map(
              Array.from(state.fields.entries()).map(([k, v]) => [k, JSON.parse(JSON.stringify(v))])
            ),
          };
          
          // Remove any redo history
          state.history = state.history.slice(0, state.historyIndex + 1);
          
          // Add new state
          state.history.push(currentState);
          state.historyIndex = state.history.length - 1;
          
          // Limit history size
          if (state.history.length > state.maxHistory) {
            state.history.shift();
            state.historyIndex--;
          }
        });
      },

      undo: () => {
        const { historyIndex, history } = get();
        if (historyIndex <= 0) return;
        
        set((state) => {
          state.historyIndex--;
          const prevState = history[state.historyIndex];
          if (prevState) {
            state.sections = prevState.sections;
            state.fields = prevState.fields;
            state.isDirty = true;
          }
        });
      },

      redo: () => {
        const { historyIndex, history } = get();
        if (historyIndex >= history.length - 1) return;
        
        set((state) => {
          state.historyIndex++;
          const nextState = history[state.historyIndex];
          if (nextState) {
            state.sections = nextState.sections;
            state.fields = nextState.fields;
            state.isDirty = true;
          }
        });
      },

      canUndo: () => get().historyIndex > 0,
      canRedo: () => get().historyIndex < get().history.length - 1,

      // =========================================================================
      // SAVING
      // =========================================================================

      setSaving: (isSaving) => {
        set((state) => {
          state.isSaving = isSaving;
        });
      },

      markSaved: () => {
        set((state) => {
          state.isDirty = false;
          state.lastSavedAt = new Date();
        });
      },

      markDirty: () => {
        set((state) => {
          state.isDirty = true;
        });
      },

      // =========================================================================
      // VALIDATION
      // =========================================================================

      validate: () => {
        const errors: string[] = [];
        const state = get();
        
        // Check template metadata
        if (!state.template?.name) {
          errors.push('Form name is required');
        }
        if (!state.template?.form_code) {
          errors.push('Form code is required');
        }
        
        // Check sections
        if (state.sections.length === 0) {
          errors.push('At least one section is required');
        }
        
        // Check fields
        const allFields = state.getAllFields();
        if (allFields.length === 0) {
          errors.push('At least one field is required');
        }
        
        // Check for duplicate field codes
        const fieldCodes = allFields.map(f => f.field_code);
        const duplicateCodes = fieldCodes.filter((code, index) => fieldCodes.indexOf(code) !== index);
        if (duplicateCodes.length > 0) {
          errors.push(`Duplicate field codes: ${[...new Set(duplicateCodes)].join(', ')}`);
        }
        
        // Check conditional logic references
        for (const field of allFields) {
          if (field.conditional_logic) {
            const referencedField = allFields.find(f => f.id === field.conditional_logic?.field_id);
            if (!referencedField) {
              errors.push(`Field "${field.label}" references non-existent field in conditional logic`);
            }
          }
        }
        
        for (const section of state.sections) {
          if (section.conditional_logic) {
            const referencedField = allFields.find(f => f.id === section.conditional_logic?.field_id);
            if (!referencedField) {
              errors.push(`Section "${section.title}" references non-existent field in conditional logic`);
            }
          }
        }
        
        set((s) => {
          s.validationErrors = errors;
        });
        
        return errors.length === 0;
      },

      clearValidationErrors: () => {
        set((state) => {
          state.validationErrors = [];
        });
      },

      // =========================================================================
      // HELPERS
      // =========================================================================

      getSection: (id) => {
        return get().sections.find(s => s.id === id);
      },

      getField: (id) => {
        for (const fields of get().fields.values()) {
          const field = fields.find(f => f.id === id);
          if (field) return field;
        }
        return undefined;
      },

      getSectionFields: (sectionId) => {
        return get().fields.get(sectionId) || [];
      },

      getAllFields: () => {
        const allFields: FormField[] = [];
        for (const fields of get().fields.values()) {
          allFields.push(...fields);
        }
        return allFields;
      },

      getFieldByCode: (code) => {
        return get().getAllFields().find(f => f.field_code === code);
      },

      generateFieldCode: (label) => {
        const existingCodes = new Set(get().getAllFields().map(f => f.field_code));
        return generateFieldCode(label, existingCodes);
      },
    })),
    { name: 'form-builder-store' }
  )
);

export default useFormBuilderStore;
