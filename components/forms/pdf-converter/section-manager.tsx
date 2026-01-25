'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  FolderPlus, 
  Edit2, 
  Trash2, 
  ChevronUp, 
  ChevronDown,
  ArrowRight,
  GripVertical
} from 'lucide-react';
import type { FormFieldMapping } from '@/lib/forms/pdf-conversion-types';

// =============================================================================
// TYPES
// =============================================================================

interface SectionManagerProps {
  fields: FormFieldMapping[];
  onFieldsUpdate: (fields: FormFieldMapping[]) => void;
  onAddSection: (name: string) => void;
}

interface MoveFieldDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  field: FormFieldMapping | null;
  sections: string[];
  onMove: (fieldId: string, targetSection: string) => void;
}

// =============================================================================
// SECTION MANAGER COMPONENT
// =============================================================================

export function SectionManager({ 
  fields, 
  onFieldsUpdate, 
  onAddSection 
}: SectionManagerProps) {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [showMoveDialog, setShowMoveDialog] = useState(false);
  const [newSectionName, setNewSectionName] = useState('');
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [selectedField, setSelectedField] = useState<FormFieldMapping | null>(null);

  // Get unique section names with order
  const sections = React.useMemo(() => {
    const sectionMap = new Map<string, { order: number; fieldCount: number }>();
    
    for (const field of fields) {
      const name = field.section_name || 'Section 1';
      if (!sectionMap.has(name)) {
        sectionMap.set(name, { order: field.section_order, fieldCount: 0 });
      }
      sectionMap.get(name)!.fieldCount++;
    }
    
    return Array.from(sectionMap.entries())
      .sort((a, b) => a[1].order - b[1].order)
      .map(([name, data]) => ({ name, ...data }));
  }, [fields]);

  const handleAddSection = () => {
    if (!newSectionName.trim()) return;
    
    onAddSection(newSectionName.trim());
    setNewSectionName('');
    setShowAddDialog(false);
  };

  const handleRenameSection = () => {
    if (!selectedSection || !newSectionName.trim()) return;
    
    const updatedFields = fields.map(field => {
      if (field.section_name === selectedSection) {
        return { ...field, section_name: newSectionName.trim() };
      }
      return field;
    });
    
    onFieldsUpdate(updatedFields);
    setNewSectionName('');
    setSelectedSection(null);
    setShowRenameDialog(false);
  };

  const handleDeleteSection = (sectionName: string) => {
    // Move all fields from this section to the first section
    const firstSection = sections[0]?.name || 'Section 1';
    if (sectionName === firstSection) return; // Can't delete first section
    
    const updatedFields = fields.map(field => {
      if (field.section_name === sectionName) {
        return { 
          ...field, 
          section_name: firstSection,
          section_order: 0
        };
      }
      return field;
    });
    
    onFieldsUpdate(updatedFields);
  };

  const handleMoveSection = (sectionName: string, direction: 'up' | 'down') => {
    const currentIndex = sections.findIndex(s => s.name === sectionName);
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    
    if (newIndex < 0 || newIndex >= sections.length) return;
    
    const otherSection = sections[newIndex];
    
    const updatedFields = fields.map(field => {
      if (field.section_name === sectionName) {
        return { ...field, section_order: otherSection.order };
      }
      if (field.section_name === otherSection.name) {
        return { ...field, section_order: sections[currentIndex].order };
      }
      return field;
    });
    
    onFieldsUpdate(updatedFields);
  };

  const handleMoveField = (fieldId: string, targetSection: string) => {
    const targetSectionOrder = sections.find(s => s.name === targetSection)?.order || 0;
    const fieldsInTarget = fields.filter(f => f.section_name === targetSection);
    const maxOrder = Math.max(0, ...fieldsInTarget.map(f => f.field_order));
    
    const updatedFields = fields.map(field => {
      if (field.field_id === fieldId) {
        return {
          ...field,
          section_name: targetSection,
          section_order: targetSectionOrder,
          field_order: maxOrder + 1
        };
      }
      return field;
    });
    
    onFieldsUpdate(updatedFields);
    setShowMoveDialog(false);
    setSelectedField(null);
  };

  const openMoveFieldDialog = (field: FormFieldMapping) => {
    setSelectedField(field);
    setShowMoveDialog(true);
  };

  return (
    <div className="space-y-2">
      {/* Section List */}
      {sections.map((section, index) => (
        <div
          key={section.name}
          className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg border border-gray-200"
        >
          <GripVertical className="w-4 h-4 text-gray-400 cursor-grab" />
          
          <div className="flex-1">
            <span className="text-sm font-medium text-gray-900">{section.name}</span>
            <span className="text-xs text-gray-500 ml-2">
              ({section.fieldCount} field{section.fieldCount !== 1 ? 's' : ''})
            </span>
          </div>
          
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleMoveSection(section.name, 'up')}
              disabled={index === 0}
              className="h-7 w-7 p-0"
            >
              <ChevronUp className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleMoveSection(section.name, 'down')}
              disabled={index === sections.length - 1}
              className="h-7 w-7 p-0"
            >
              <ChevronDown className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedSection(section.name);
                setNewSectionName(section.name);
                setShowRenameDialog(true);
              }}
              className="h-7 w-7 p-0"
            >
              <Edit2 className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDeleteSection(section.name)}
              disabled={index === 0 || section.fieldCount > 0}
              className="h-7 w-7 p-0 text-red-500 hover:text-red-700"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      ))}

      {/* Add Section Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowAddDialog(true)}
        className="w-full"
      >
        <FolderPlus className="w-4 h-4 mr-2" />
        Add Section
      </Button>

      {/* Add Section Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Section</DialogTitle>
            <DialogDescription>
              Create a new section to organize your form fields.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <label className="text-sm font-medium text-gray-700">Section Name</label>
            <Input
              value={newSectionName}
              onChange={(e) => setNewSectionName(e.target.value)}
              placeholder="e.g., Employee Information"
              className="mt-1"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddSection();
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddSection} disabled={!newSectionName.trim()}>
              Add Section
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Section Dialog */}
      <Dialog open={showRenameDialog} onOpenChange={setShowRenameDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Section</DialogTitle>
            <DialogDescription>
              Change the name of "{selectedSection}"
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <label className="text-sm font-medium text-gray-700">New Name</label>
            <Input
              value={newSectionName}
              onChange={(e) => setNewSectionName(e.target.value)}
              placeholder="Enter new section name"
              className="mt-1"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRenameDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleRenameSection} disabled={!newSectionName.trim()}>
              Rename
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Move Field Dialog */}
      <MoveFieldDialog
        open={showMoveDialog}
        onOpenChange={setShowMoveDialog}
        field={selectedField}
        sections={sections.map(s => s.name)}
        onMove={handleMoveField}
      />
    </div>
  );
}

// =============================================================================
// MOVE FIELD DIALOG
// =============================================================================

function MoveFieldDialog({
  open,
  onOpenChange,
  field,
  sections,
  onMove
}: MoveFieldDialogProps) {
  const [targetSection, setTargetSection] = useState('');

  React.useEffect(() => {
    if (field) {
      setTargetSection(field.section_name || sections[0] || '');
    }
  }, [field, sections]);

  if (!field) return null;

  const handleMove = () => {
    if (!targetSection || targetSection === field.section_name) return;
    onMove(field.field_id, targetSection);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Move Field</DialogTitle>
          <DialogDescription>
            Move "{field.label}" to a different section
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex-1 p-3 bg-gray-100 rounded-lg">
              <p className="text-xs text-gray-500 mb-1">Current Section</p>
              <p className="font-medium text-gray-900">{field.section_name || 'Section 1'}</p>
            </div>
            <ArrowRight className="w-5 h-5 text-gray-400" />
            <div className="flex-1">
              <p className="text-xs text-gray-500 mb-1">Target Section</p>
              <Select value={targetSection} onValueChange={setTargetSection}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sections.map(section => (
                    <SelectItem 
                      key={section} 
                      value={section}
                      disabled={section === field.section_name}
                    >
                      {section}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleMove}
            disabled={!targetSection || targetSection === field.section_name}
          >
            Move Field
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default SectionManager;
