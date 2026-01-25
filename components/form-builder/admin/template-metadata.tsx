'use client';

/**
 * Template Metadata Editor
 * 
 * Edit form template basic information.
 */

import { useFormBuilderStore } from '@/lib/stores/form-builder-store';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';

const COR_ELEMENTS = [
  { value: '2', label: 'Element 2 - Hazard Assessment' },
  { value: '3', label: 'Element 3 - Hazard Control' },
  { value: '4', label: 'Element 4 - Competency' },
  { value: '5', label: 'Element 5 - Training' },
  { value: '6', label: 'Element 6 - PPE' },
  { value: '7', label: 'Element 7 - Inspections' },
  { value: '8', label: 'Element 8 - Communication' },
  { value: '9', label: 'Element 9 - Investigation' },
  { value: '10', label: 'Element 10 - Emergency Response' },
  { value: '11', label: 'Element 11 - Statistics' },
  { value: '12', label: 'Element 12 - Legislation' },
  { value: '13', label: 'Element 13 - OH&S Program' },
  { value: '14', label: 'Element 14 - Management Review' },
];

const FREQUENCIES = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'annual', label: 'Annual' },
  { value: 'as_needed', label: 'As Needed' },
  { value: 'per_shift', label: 'Per Shift' },
];

const ICONS = [
  { value: 'file-text', label: 'Document' },
  { value: 'alert-triangle', label: 'Alert' },
  { value: 'shield', label: 'Shield' },
  { value: 'clipboard-check', label: 'Checklist' },
  { value: 'hard-hat', label: 'Safety Hat' },
  { value: 'users', label: 'Team' },
  { value: 'building-2', label: 'Building' },
  { value: 'truck', label: 'Vehicle' },
  { value: 'wrench', label: 'Equipment' },
  { value: 'heart-pulse', label: 'First Aid' },
  { value: 'flame', label: 'Fire' },
  { value: 'thermometer', label: 'Temperature' },
  { value: 'eye', label: 'Inspection' },
  { value: 'graduation-cap', label: 'Training' },
];

const COLORS = [
  { value: '#ef4444', label: 'Red' },
  { value: '#f97316', label: 'Orange' },
  { value: '#f59e0b', label: 'Amber' },
  { value: '#eab308', label: 'Yellow' },
  { value: '#84cc16', label: 'Lime' },
  { value: '#22c55e', label: 'Green' },
  { value: '#10b981', label: 'Emerald' },
  { value: '#14b8a6', label: 'Teal' },
  { value: '#06b6d4', label: 'Cyan' },
  { value: '#0ea5e9', label: 'Sky' },
  { value: '#3b82f6', label: 'Blue' },
  { value: '#6366f1', label: 'Indigo' },
  { value: '#8b5cf6', label: 'Violet' },
  { value: '#a855f7', label: 'Purple' },
  { value: '#d946ef', label: 'Fuchsia' },
  { value: '#ec4899', label: 'Pink' },
];

export function TemplateMetadata() {
  const { template, updateTemplate } = useFormBuilderStore();

  if (!template) return null;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold">Form Settings</h3>
        <p className="text-sm text-muted-foreground">
          Configure the form template
        </p>
      </div>

      <Separator />

      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Form Name *</Label>
          <Input
            value={template.name || ''}
            onChange={(e) => updateTemplate({ name: e.target.value })}
            placeholder="e.g., Hazard Reporting Form"
          />
        </div>

        <div className="space-y-2">
          <Label>Form Code *</Label>
          <Input
            value={template.form_code || ''}
            onChange={(e) => updateTemplate({
              form_code: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_')
            })}
            placeholder="e.g., hazard_reporting"
            className="font-mono"
          />
          <p className="text-xs text-muted-foreground">
            Unique identifier used in URLs and form numbers
          </p>
        </div>

        <div className="space-y-2">
          <Label>Description</Label>
          <Textarea
            value={template.description || ''}
            onChange={(e) => updateTemplate({ description: e.target.value })}
            placeholder="What is this form for?"
            rows={3}
          />
        </div>

        <Separator />

        <div className="space-y-2">
          <Label>COR Element</Label>
          <Select
            value={template.cor_element?.toString() || ''}
            onValueChange={(value) => updateTemplate({ cor_element: value ? parseInt(value) : null })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select COR element" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">None</SelectItem>
              {COR_ELEMENTS.map((el) => (
                <SelectItem key={el.value} value={el.value}>
                  {el.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Frequency</Label>
          <Select
            value={template.frequency || 'as_needed'}
            onValueChange={(value) => updateTemplate({ frequency: value as 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual' | 'as_needed' | 'per_shift' })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FREQUENCIES.map((f) => (
                <SelectItem key={f.value} value={f.value}>
                  {f.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Estimated Time (minutes)</Label>
          <Input
            type="number"
            value={template.estimated_time_minutes || 5}
            onChange={(e) => updateTemplate({ estimated_time_minutes: parseInt(e.target.value) || 5 })}
            min={1}
          />
        </div>

        <Separator />

        <div className="space-y-2">
          <Label>Icon</Label>
          <Select
            value={template.icon || 'file-text'}
            onValueChange={(value) => updateTemplate({ icon: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ICONS.map((icon) => (
                <SelectItem key={icon.value} value={icon.value}>
                  {icon.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Color</Label>
          <div className="grid grid-cols-8 gap-1">
            {COLORS.map((color) => (
              <button
                key={color.value}
                className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${template.color === color.value ? 'border-foreground scale-110' : 'border-transparent'
                  }`}
                style={{ backgroundColor: color.value }}
                onClick={() => updateTemplate({ color: color.value })}
                title={color.label}
              />
            ))}
          </div>
        </div>

        <Separator />

        <div className="flex items-center justify-between">
          <div>
            <Label>Mandatory Form</Label>
            <p className="text-xs text-muted-foreground">
              Required by COR certification
            </p>
          </div>
          <Switch
            checked={template.is_mandatory || false}
            onCheckedChange={(checked) => updateTemplate({ is_mandatory: checked })}
          />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <Label>Active</Label>
            <p className="text-xs text-muted-foreground">
              Available for workers to fill out
            </p>
          </div>
          <Switch
            checked={template.is_active || false}
            onCheckedChange={(checked) => updateTemplate({ is_active: checked })}
          />
        </div>
      </div>
    </div>
  );
}

export default TemplateMetadata;
