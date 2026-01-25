'use client';

/**
 * LibraryQuickAdd
 * 
 * A modal component for quickly adding new items to master libraries
 * directly from a form, without leaving the current context.
 */

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Loader2, Plus, AlertTriangle } from 'lucide-react';

import { LibrarySource } from '../types';
import { quickAddLibraryItem, LibraryItem } from '@/lib/forms/library-integration';

// =============================================================================
// Types
// =============================================================================

interface LibraryQuickAddProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  source: LibrarySource;
  companyId: string;
  onSuccess: (item: LibraryItem) => void;
  /** Pre-fill the name field */
  initialName?: string;
  /** Additional context fields to pre-fill */
  context?: Record<string, unknown>;
}

interface QuickAddFormData {
  name: string;
  description?: string;
  category?: string;
  [key: string]: unknown;
}

// =============================================================================
// Configuration
// =============================================================================

const SOURCE_CONFIGS: Record<LibrarySource, {
  title: string;
  description: string;
  fields: Array<{
    key: string;
    label: string;
    type: 'text' | 'textarea' | 'select' | 'multiselect' | 'checkbox';
    required?: boolean;
    placeholder?: string;
    options?: Array<{ value: string; label: string }>;
  }>;
}> = {
  hazards: {
    title: 'Add Custom Hazard',
    description: 'Add a new hazard to your company library. This will be available for selection in all forms.',
    fields: [
      { key: 'name', label: 'Hazard Name', type: 'text', required: true, placeholder: 'e.g., Overhead Power Lines' },
      { key: 'description', label: 'Description', type: 'textarea', placeholder: 'Describe the hazard and when it may be present...' },
      {
        key: 'category',
        label: 'Category',
        type: 'select',
        required: true,
        options: [
          { value: 'physical', label: 'Physical' },
          { value: 'chemical', label: 'Chemical' },
          { value: 'biological', label: 'Biological' },
          { value: 'ergonomic', label: 'Ergonomic' },
          { value: 'psychosocial', label: 'Psychosocial' },
          { value: 'electrical', label: 'Electrical' },
          { value: 'mechanical', label: 'Mechanical' },
          { value: 'fall', label: 'Fall' },
          { value: 'struck_by', label: 'Struck By' },
          { value: 'caught_in', label: 'Caught In' },
          { value: 'environmental', label: 'Environmental' },
          { value: 'fire_explosion', label: 'Fire/Explosion' },
          { value: 'confined_space', label: 'Confined Space' },
          { value: 'radiation', label: 'Radiation' },
          { value: 'other', label: 'Other' },
        ],
      },
      {
        key: 'default_risk_level',
        label: 'Risk Level',
        type: 'select',
        options: [
          { value: 'negligible', label: '🟢 Negligible' },
          { value: 'low', label: '🟡 Low' },
          { value: 'medium', label: '🟠 Medium' },
          { value: 'high', label: '🔴 High' },
          { value: 'critical', label: '⚫ Critical' },
        ],
      },
    ],
  },
  equipment: {
    title: 'Add Equipment',
    description: 'Add a new piece of equipment to your inventory.',
    fields: [
      { key: 'name', label: 'Equipment Name', type: 'text', required: true, placeholder: 'e.g., 20ft Extension Ladder' },
      { key: 'equipment_type', label: 'Equipment Type', type: 'text', required: true, placeholder: 'e.g., Ladder' },
      { key: 'serial_number', label: 'Serial Number', type: 'text', placeholder: 'Enter serial number if applicable' },
      { key: 'make', label: 'Make/Brand', type: 'text', placeholder: 'e.g., Werner' },
      { key: 'model', label: 'Model', type: 'text', placeholder: 'e.g., D1520-2' },
    ],
  },
  tasks: {
    title: 'Add Task',
    description: 'Add a new task to your task library.',
    fields: [
      { key: 'name', label: 'Task Name', type: 'text', required: true, placeholder: 'e.g., Pour Concrete Foundation' },
      { key: 'description', label: 'Description', type: 'textarea', placeholder: 'Describe the task and its requirements...' },
      { key: 'category', label: 'Category', type: 'text', required: true, placeholder: 'e.g., Concrete Work' },
      { key: 'trade', label: 'Trade', type: 'text', required: true, placeholder: 'e.g., Concrete' },
    ],
  },
  workers: {
    title: 'Add Worker',
    description: 'Add a new worker to your team.',
    fields: [
      { key: 'first_name', label: 'First Name', type: 'text', required: true, placeholder: 'John' },
      { key: 'last_name', label: 'Last Name', type: 'text', required: true, placeholder: 'Smith' },
      { key: 'email', label: 'Email', type: 'text', placeholder: 'john.smith@company.com' },
      { key: 'phone', label: 'Phone', type: 'text', placeholder: '(555) 123-4567' },
      { key: 'position', label: 'Position', type: 'text', placeholder: 'e.g., Labourer' },
    ],
  },
  jobsites: {
    title: 'Add Jobsite',
    description: 'Add a new jobsite to your registry.',
    fields: [
      { key: 'name', label: 'Jobsite Name', type: 'text', required: true, placeholder: 'e.g., 123 Main St Commercial Build' },
      { key: 'address', label: 'Address', type: 'text', required: true, placeholder: '123 Main Street' },
      { key: 'city', label: 'City', type: 'text', placeholder: 'Toronto' },
      { key: 'client_name', label: 'Client Name', type: 'text', placeholder: 'ABC Construction Ltd.' },
    ],
  },
  sds: {
    title: 'Add SDS Product',
    description: 'Add a new Safety Data Sheet product.',
    fields: [
      { key: 'product_name', label: 'Product Name', type: 'text', required: true, placeholder: 'e.g., Concrete Accelerator' },
      { key: 'manufacturer', label: 'Manufacturer', type: 'text', required: true, placeholder: 'e.g., Sika' },
      { key: 'emergency_phone', label: 'Emergency Phone', type: 'text', placeholder: '1-800-XXX-XXXX' },
    ],
  },
  legislation: {
    title: 'Add Regulation Reference',
    description: 'Add a regulation reference.',
    fields: [
      { key: 'name', label: 'Regulation Name', type: 'text', required: true, placeholder: 'e.g., O.Reg. 213/91' },
      { key: 'description', label: 'Description', type: 'textarea', placeholder: 'Describe the regulation...' },
    ],
  },
};

// =============================================================================
// Component
// =============================================================================

export function LibraryQuickAdd({
  open,
  onOpenChange,
  source,
  companyId,
  onSuccess,
  initialName,
  context,
}: LibraryQuickAddProps) {
  const [formData, setFormData] = useState<QuickAddFormData>({
    name: initialName || '',
    ...context,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Safe: source is constrained to LibrarySource type
  // eslint-disable-next-line security/detect-object-injection
  const config = SOURCE_CONFIGS[source];

  // Handle field change
  const handleFieldChange = (key: string, value: unknown) => {
    setFormData(prev => ({ ...prev, [key]: value }));
    setError(null);
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      // Validate required fields
      for (const field of config.fields) {
        if (field.required && !formData[field.key]) {
          throw new Error(`${field.label} is required`);
        }
      }

      // Prepare data for submission
      const submitData = { ...formData };
      
      // Generate codes where needed
      if (source === 'hazards') {
        submitData.hazard_code = generateCode('HAZ', Date.now());
        submitData.default_severity = 3;
        submitData.default_likelihood = 3;
        submitData.is_active = true;
      } else if (source === 'equipment') {
        submitData.equipment_number = generateCode('EQP', Date.now());
        submitData.status = 'in_service';
      } else if (source === 'tasks') {
        submitData.task_code = generateCode('TSK', Date.now());
        submitData.is_active = true;
      } else if (source === 'jobsites') {
        submitData.jobsite_number = generateCode('JS', Date.now());
        submitData.status = 'active';
        submitData.is_active = true;
      } else if (source === 'sds') {
        submitData.sds_number = generateCode('SDS', Date.now());
        submitData.is_active = true;
      }

      // Submit to library
      const newItem = await quickAddLibraryItem(source, submitData, companyId);

      if (!newItem) {
        throw new Error('Failed to add item to library');
      }

      // Success!
      onSuccess(newItem);
      onOpenChange(false);
      
      // Reset form
      setFormData({ name: '' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset form when dialog closes
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setFormData({ name: initialName || '' });
      setError(null);
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              {config.title}
            </DialogTitle>
            <DialogDescription>{config.description}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {error && (
              <div className="flex items-center gap-2 p-3 text-sm text-destructive bg-destructive/10 rounded-md">
                <AlertTriangle className="h-4 w-4" />
                {error}
              </div>
            )}

            {config.fields.map(field => (
              <div key={field.key} className="space-y-2">
                <Label htmlFor={field.key}>
                  {field.label}
                  {field.required && <span className="text-destructive ml-1">*</span>}
                </Label>

                {field.type === 'text' && (
                  <Input
                    id={field.key}
                    value={(formData[field.key] as string) || ''}
                    onChange={e => handleFieldChange(field.key, e.target.value)}
                    placeholder={field.placeholder}
                    disabled={isSubmitting}
                  />
                )}

                {field.type === 'textarea' && (
                  <Textarea
                    id={field.key}
                    value={(formData[field.key] as string) || ''}
                    onChange={e => handleFieldChange(field.key, e.target.value)}
                    placeholder={field.placeholder}
                    disabled={isSubmitting}
                    rows={3}
                  />
                )}

                {field.type === 'select' && field.options && (
                  <Select
                    value={(formData[field.key] as string) || ''}
                    onValueChange={value => handleFieldChange(field.key, value)}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger id={field.key}>
                      <SelectValue placeholder={`Select ${field.label.toLowerCase()}...`} />
                    </SelectTrigger>
                    <SelectContent>
                      {field.options.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                {field.type === 'checkbox' && (
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id={field.key}
                      checked={formData[field.key] as boolean}
                      onCheckedChange={checked => handleFieldChange(field.key, checked)}
                      disabled={isSubmitting}
                    />
                    <label
                      htmlFor={field.key}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {field.placeholder || field.label}
                    </label>
                  </div>
                )}
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Add to Library
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// =============================================================================
// Helper Functions
// =============================================================================

function generateCode(prefix: string, timestamp: number): string {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${year}-${random}`;
}

export default LibraryQuickAdd;
