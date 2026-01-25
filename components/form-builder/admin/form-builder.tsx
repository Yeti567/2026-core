'use client';

/**
 * Form Builder Component
 * 
 * Main drag-and-drop interface for building form templates.
 */

import { useState, useCallback } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useFormBuilderStore } from '@/lib/stores/form-builder-store';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Save,
  Send,
  Eye,
  Pencil,
  Undo,
  Redo,
  AlertCircle,
  Loader2,
  CheckCircle,
  X,
} from 'lucide-react';
import { FieldTypeSidebar } from './field-type-sidebar';
import { FormCanvas } from './form-canvas';
import { FieldConfigPanel } from './field-config-panel';
import { TemplateMetadata } from './template-metadata';
import { WorkflowConfig } from './workflow-config';
import { FormPreview } from './form-preview';
import { FieldType } from '../types';

interface FormBuilderProps {
  onSave: () => Promise<void>;
  onPublish: () => Promise<void>;
  onCancel: () => void;
}

export function FormBuilder({ onSave, onPublish, onCancel }: FormBuilderProps) {
  const [activeTab, setActiveTab] = useState('design');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  const {
    template,
    sections,
    mode,
    isDirty,
    isSaving,
    lastSavedAt,
    validationErrors,
    selectedFieldId,
    selectedSectionId,
    setMode,
    toggleMode,
    undo,
    redo,
    canUndo,
    canRedo,
    addField,
    reorderFields,
    reorderSections,
    moveFieldToSection,
    selectField,
    selectSection,
    clearValidationErrors,
  } = useFormBuilderStore();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    setOverId(event.over?.id as string || null);
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setOverId(null);

    if (!over) return;

    const activeIdStr = active.id as string;
    const overIdStr = over.id as string;

    // Check if dragging a field type from sidebar
    if (activeIdStr.startsWith('fieldtype-')) {
      const fieldType = activeIdStr.replace('fieldtype-', '') as FieldType;

      // Determine target section
      let targetSectionId = overIdStr;
      if (overIdStr.startsWith('field-')) {
        // Find the section containing this field
        const store = useFormBuilderStore.getState();
        for (const section of store.sections) {
          const sectionFields = store.getSectionFields(section.id);
          if (sectionFields.some(f => f.id === overIdStr.replace('field-', ''))) {
            targetSectionId = section.id;
            break;
          }
        }
      }

      if (targetSectionId && !targetSectionId.startsWith('field-')) {
        addField(targetSectionId, {
          field_type: fieldType,
          label: getFieldTypeLabel(fieldType),
        });
      }
      return;
    }

    // Check if reordering sections
    if (activeIdStr.startsWith('section-') && overIdStr.startsWith('section-')) {
      const activeIndex = sections.findIndex(s => s.id === activeIdStr.replace('section-', ''));
      const overIndex = sections.findIndex(s => s.id === overIdStr.replace('section-', ''));

      if (activeIndex !== -1 && overIndex !== -1 && activeIndex !== overIndex) {
        reorderSections(activeIndex, overIndex);
      }
      return;
    }

    // Check if reordering fields within a section
    if (activeIdStr.startsWith('field-') && overIdStr.startsWith('field-')) {
      const store = useFormBuilderStore.getState();
      const activeFieldId = activeIdStr.replace('field-', '');
      const overFieldId = overIdStr.replace('field-', '');

      // Find sections containing these fields
      let activeSectionId: string | null = null;
      let activeIndex = -1;
      let overSectionId: string | null = null;
      let overIndex = -1;

      for (const section of store.sections) {
        const fields = store.getSectionFields(section.id);
        const activeIdx = fields.findIndex(f => f.id === activeFieldId);
        const overIdx = fields.findIndex(f => f.id === overFieldId);

        if (activeIdx !== -1) {
          activeSectionId = section.id;
          activeIndex = activeIdx;
        }
        if (overIdx !== -1) {
          overSectionId = section.id;
          overIndex = overIdx;
        }
      }

      if (activeSectionId && overSectionId) {
        if (activeSectionId === overSectionId) {
          // Same section - reorder
          reorderFields(activeSectionId, activeIndex, overIndex);
        } else {
          // Different sections - move
          moveFieldToSection(activeFieldId, activeSectionId, overSectionId, overIndex);
        }
      }
    }
  }, [sections, addField, reorderFields, reorderSections, moveFieldToSection]);

  // Keyboard shortcuts
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if ((event.metaKey || event.ctrlKey) && event.key === 'z') {
      if (event.shiftKey) {
        redo();
      } else {
        undo();
      }
      event.preventDefault();
    }
    if ((event.metaKey || event.ctrlKey) && event.key === 's') {
      event.preventDefault();
      onSave();
    }
  }, [undo, redo, onSave]);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="h-screen flex flex-col bg-background" onKeyDown={(e) => handleKeyDown(e.nativeEvent)}>
        {/* Header */}
        <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50">
          <div className="flex items-center justify-between h-14 px-4">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={onCancel}>
                <X className="h-4 w-4 mr-1" />
                Close
              </Button>
              <div className="h-6 w-px bg-border" />
              <h1 className="font-semibold">
                {template?.name || 'New Form Template'}
              </h1>
              {isDirty && (
                <span className="text-xs text-amber-600 bg-amber-100 px-2 py-0.5 rounded">
                  Unsaved
                </span>
              )}
              {lastSavedAt && !isDirty && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <CheckCircle className="h-3 w-3 text-green-500" />
                  Saved {lastSavedAt.toLocaleTimeString()}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={undo}
                disabled={!canUndo()}
                title="Undo (Ctrl+Z)"
              >
                <Undo className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={redo}
                disabled={!canRedo()}
                title="Redo (Ctrl+Shift+Z)"
              >
                <Redo className="h-4 w-4" />
              </Button>
              <div className="h-6 w-px bg-border mx-2" />
              <Button
                variant="outline"
                size="sm"
                onClick={toggleMode}
              >
                {mode === 'edit' ? (
                  <>
                    <Eye className="h-4 w-4 mr-1" />
                    Preview
                  </>
                ) : (
                  <>
                    <Pencil className="h-4 w-4 mr-1" />
                    Edit
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onSave}
                disabled={isSaving}
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-1" />
                )}
                Save Draft
              </Button>
              <Button
                size="sm"
                onClick={onPublish}
                disabled={isSaving}
              >
                <Send className="h-4 w-4 mr-1" />
                Publish
              </Button>
            </div>
          </div>
        </header>

        {/* Validation Errors */}
        {validationErrors.length > 0 && (
          <Alert variant="destructive" className="m-4 mb-0">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <ul className="list-disc pl-4">
                {validationErrors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </AlertDescription>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-2"
              onClick={clearValidationErrors}
            >
              <X className="h-4 w-4" />
            </Button>
          </Alert>
        )}

        {/* Main Content */}
        {mode === 'preview' ? (
          <FormPreview />
        ) : (
          <div className="flex-1 flex overflow-hidden">
            {/* Left Sidebar - Field Types */}
            <aside className="w-64 border-r bg-muted/30 flex-shrink-0">
              <Tabs defaultValue="fields" className="h-full flex flex-col">
                <TabsList className="mx-4 mt-4 grid grid-cols-2">
                  <TabsTrigger value="fields">Fields</TabsTrigger>
                  <TabsTrigger value="settings">Settings</TabsTrigger>
                </TabsList>
                <TabsContent value="fields" className="flex-1 overflow-hidden">
                  <ScrollArea className="h-full">
                    <FieldTypeSidebar />
                  </ScrollArea>
                </TabsContent>
                <TabsContent value="settings" className="flex-1 overflow-hidden">
                  <ScrollArea className="h-full p-4">
                    <TemplateMetadata />
                  </ScrollArea>
                </TabsContent>
              </Tabs>
            </aside>

            {/* Center - Form Canvas */}
            <main className="flex-1 overflow-hidden bg-muted/10">
              <ScrollArea className="h-full">
                <div className="p-6">
                  <FormCanvas activeId={activeId} overId={overId} />
                </div>
              </ScrollArea>
            </main>

            {/* Right Sidebar - Field Config */}
            <aside className="w-80 border-l bg-background flex-shrink-0">
              <Tabs defaultValue="field" className="h-full flex flex-col">
                <TabsList className="mx-4 mt-4 grid grid-cols-2">
                  <TabsTrigger value="field">Field</TabsTrigger>
                  <TabsTrigger value="workflow">Workflow</TabsTrigger>
                </TabsList>
                <TabsContent value="field" className="flex-1 overflow-hidden">
                  <ScrollArea className="h-full">
                    <div className="p-4">
                      {selectedFieldId ? (
                        <FieldConfigPanel fieldId={selectedFieldId} />
                      ) : selectedSectionId ? (
                        <SectionConfigPanel sectionId={selectedSectionId} />
                      ) : (
                        <div className="text-center text-muted-foreground py-8">
                          <p>Select a field or section to configure</p>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </TabsContent>
                <TabsContent value="workflow" className="flex-1 overflow-hidden">
                  <ScrollArea className="h-full">
                    <div className="p-4">
                      <WorkflowConfig />
                    </div>
                  </ScrollArea>
                </TabsContent>
              </Tabs>
            </aside>
          </div>
        )}
      </div>

      {/* Drag Overlay */}
      <DragOverlay>
        {activeId && (
          <div className="bg-background border rounded-lg shadow-lg p-3 opacity-80">
            {activeId.startsWith('fieldtype-') ? (
              <span className="text-sm font-medium">
                {getFieldTypeLabel(activeId.replace('fieldtype-', '') as FieldType)}
              </span>
            ) : activeId.startsWith('field-') ? (
              <span className="text-sm font-medium">Moving field...</span>
            ) : (
              <span className="text-sm font-medium">Moving section...</span>
            )}
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}

// Section config panel (inline for now)
function SectionConfigPanel({ sectionId }: { sectionId: string }) {
  const { getSection, updateSection, deleteSection } = useFormBuilderStore();
  const section = getSection(sectionId);

  if (!section) return null;

  return (
    <div className="space-y-4">
      <h3 className="font-semibold">Section Settings</h3>

      <div className="space-y-2">
        <label className="text-sm font-medium">Title</label>
        <input
          type="text"
          value={section.title}
          onChange={(e) => updateSection(sectionId, { title: e.target.value })}
          className="w-full px-3 py-2 border rounded-md"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Description</label>
        <textarea
          value={section.description || ''}
          onChange={(e) => updateSection(sectionId, { description: e.target.value || null })}
          className="w-full px-3 py-2 border rounded-md resize-none"
          rows={3}
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="is-repeatable"
          checked={section.is_repeatable}
          onChange={(e) => updateSection(sectionId, { is_repeatable: e.target.checked })}
          className="rounded"
        />
        <label htmlFor="is-repeatable" className="text-sm">
          Allow multiple entries (repeatable)
        </label>
      </div>

      {section.is_repeatable && (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Min Entries</label>
            <input
              type="number"
              value={section.min_repeats}
              onChange={(e) => updateSection(sectionId, { min_repeats: parseInt(e.target.value) || 1 })}
              min={1}
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Max Entries</label>
            <input
              type="number"
              value={section.max_repeats}
              onChange={(e) => updateSection(sectionId, { max_repeats: parseInt(e.target.value) || 10 })}
              min={1}
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>
        </div>
      )}

      <Button
        variant="destructive"
        size="sm"
        onClick={() => deleteSection(sectionId)}
        className="w-full mt-4"
      >
        Delete Section
      </Button>
    </div>
  );
}

function getFieldTypeLabel(type: FieldType): string {
  const labels: Record<FieldType, string> = {
    text: 'Text Input',
    textarea: 'Text Area',
    number: 'Number',
    date: 'Date',
    time: 'Time',
    datetime: 'Date & Time',
    dropdown: 'Dropdown',
    radio: 'Radio Buttons',
    checkbox: 'Checkbox',
    multiselect: 'Multi-select',
    signature: 'Signature',
    photo: 'Photo',
    file: 'File Upload',
    gps: 'GPS Location',
    worker_select: 'Worker Select',
    jobsite_select: 'Jobsite Select',
    equipment_select: 'Equipment Select',
    hazard_select: 'Hazard Select',
    hazard_multiselect: 'Hazard Multi-select',
    task_select: 'Task Select',
    rating: 'Rating',
    slider: 'Slider',
    yes_no: 'Yes/No',
    yes_no_na: 'Yes/No/N/A',
    email: 'Email',
    phone: 'Phone',
    currency: 'Currency',
    body_diagram: 'Body Diagram',
    weather: 'Weather',
    temperature: 'Temperature',
    hidden: 'Hidden Field',
  };
  // Safe: type is constrained to FieldType union
  // eslint-disable-next-line security/detect-object-injection
  return labels[type] || type;
}

export default FormBuilder;
