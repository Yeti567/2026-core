'use client';

/**
 * LibrarySearchDialog
 * 
 * A searchable command dialog for selecting items from large libraries.
 * Uses shadcn/ui Command component for keyboard-accessible search.
 */

import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Plus, Search, AlertTriangle, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

import { LibrarySource } from '../types';
import {
  LibraryItem,
  HazardLibraryItem,
  EquipmentLibraryItem,
  TaskLibraryItem,
  WorkerLibraryItem,
  JobsiteLibraryItem,
  SDSLibraryItem,
} from '@/lib/forms/library-integration';

// =============================================================================
// Types
// =============================================================================

interface LibrarySearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  source: LibrarySource;
  items: LibraryItem[];
  onSelect: (item: LibraryItem) => void;
  onQuickAdd?: () => void;
  selectedIds?: Set<string>;
  placeholder?: string;
  allowMultiple?: boolean;
}

interface GroupedItems {
  category: string;
  items: LibraryItem[];
  icon?: string;
}

// =============================================================================
// Configuration
// =============================================================================

const RISK_BADGES: Record<string, { color: string; icon: string }> = {
  critical: { color: 'bg-black text-white', icon: '⚫' },
  high: { color: 'bg-red-500 text-white', icon: '🔴' },
  medium: { color: 'bg-orange-500 text-white', icon: '🟠' },
  low: { color: 'bg-yellow-500 text-black', icon: '🟡' },
  negligible: { color: 'bg-green-500 text-white', icon: '🟢' },
};

const CATEGORY_ICONS: Record<string, string> = {
  // Hazard categories
  physical: '💥',
  chemical: '🧪',
  biological: '🦠',
  ergonomic: '🏋️',
  psychosocial: '🧠',
  electrical: '⚡',
  mechanical: '⚙️',
  fall: '⬇️',
  struck_by: '🎯',
  caught_in: '🔒',
  environmental: '🌡️',
  fire_explosion: '🔥',
  confined_space: '🚪',
  radiation: '☢️',
  // Task categories
  concrete: '🏗️',
  excavation: '🕳️',
  demolition: '🔨',
  electrical_work: '⚡',
  plumbing: '🔧',
  framing: '🪵',
  roofing: '🏠',
  finishing: '🎨',
  // Equipment categories
  heavy_equipment: '🚜',
  power_tools: '🔌',
  hand_tools: '🔧',
  safety_equipment: '🦺',
  lifting_equipment: '🏗️',
  // Default
  other: '📌',
};

// =============================================================================
// Component
// =============================================================================

export function LibrarySearchDialog({
  open,
  onOpenChange,
  source,
  items,
  onSelect,
  onQuickAdd,
  selectedIds = new Set(),
  placeholder,
  allowMultiple = false,
}: LibrarySearchDialogProps) {
  const [search, setSearch] = useState('');

  // Reset search when dialog opens
  useEffect(() => {
    if (open) {
      setSearch('');
    }
  }, [open]);

  // Filter items based on search
  const filteredItems = useMemo(() => {
    if (!search.trim()) return items;

    const term = search.toLowerCase();
    return items.filter(item => {
      const label = getItemLabel(item, source).toLowerCase();
      const description = getItemDescription(item, source)?.toLowerCase() || '';
      const code = getItemCode(item, source)?.toLowerCase() || '';
      return label.includes(term) || description.includes(term) || code.includes(term);
    });
  }, [items, search, source]);

  // Group items by category
  const groupedItems = useMemo(() => {
    return groupItemsByCategory(filteredItems, source);
  }, [filteredItems, source]);

  // Handle selection
  const handleSelect = useCallback((item: LibraryItem) => {
    onSelect(item);
    if (!allowMultiple) {
      onOpenChange(false);
    }
  }, [onSelect, onOpenChange, allowMultiple]);

  const searchPlaceholder = placeholder || `Search ${getSourceLabel(source)}...`;

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder={searchPlaceholder}
        value={search}
        onValueChange={setSearch}
      />
      <CommandList className="max-h-[400px]">
        <CommandEmpty>
          <div className="py-6 text-center">
            <Search className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground mb-4">
              No {getSourceLabel(source).toLowerCase()} found matching &quot;{search}&quot;
            </p>
            {onQuickAdd && (
              <Button variant="outline" size="sm" onClick={onQuickAdd}>
                <Plus className="h-4 w-4 mr-1" />
                Add Custom {getSingularLabel(source)}
              </Button>
            )}
          </div>
        </CommandEmpty>

        {groupedItems.map((group, index) => (
          <div key={group.category}>
            {index > 0 && <CommandSeparator />}
            <CommandGroup heading={
              <span className="flex items-center gap-2">
                <span>{group.icon || CATEGORY_ICONS[group.category.toLowerCase()] || '📁'}</span>
                <span>{formatCategory(group.category)}</span>
                <Badge variant="secondary" className="text-xs ml-auto">
                  {group.items.length}
                </Badge>
              </span>
            }>
              {group.items.map(item => {
                const isSelected = selectedIds.has(getItemId(item));
                
                return (
                  <CommandItem
                    key={getItemId(item)}
                    value={getItemLabel(item, source)}
                    onSelect={() => handleSelect(item)}
                    className={cn(
                      'flex items-start gap-3 py-2',
                      isSelected && 'bg-primary/5'
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {isSelected && (
                          <CheckCircle className="h-4 w-4 text-primary flex-shrink-0" />
                        )}
                        <span className="font-medium truncate">
                          {getItemLabel(item, source)}
                        </span>
                        {getItemCode(item, source) && (
                          <span className="text-xs text-muted-foreground font-mono">
                            {getItemCode(item, source)}
                          </span>
                        )}
                      </div>
                      {getItemDescription(item, source) && (
                        <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                          {getItemDescription(item, source)}
                        </p>
                      )}
                      {renderItemMeta(item, source)}
                    </div>
                    {renderItemBadge(item, source)}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </div>
        ))}

        {/* Quick add option at bottom */}
        {onQuickAdd && filteredItems.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup>
              <CommandItem onSelect={onQuickAdd} className="text-primary">
                <Plus className="h-4 w-4 mr-2" />
                Add Custom {getSingularLabel(source)}
              </CommandItem>
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}

// =============================================================================
// Helper Functions
// =============================================================================

function getSourceLabel(source: LibrarySource): string {
  const labels: Record<LibrarySource, string> = {
    hazards: 'Hazards',
    equipment: 'Equipment',
    tasks: 'Tasks',
    workers: 'Workers',
    jobsites: 'Jobsites',
    sds: 'SDS Products',
    legislation: 'Legislation',
  };
  // Safe: source is constrained to LibrarySource type
  // eslint-disable-next-line security/detect-object-injection
  return labels[source] || source;
}

function getSingularLabel(source: LibrarySource): string {
  const labels: Record<LibrarySource, string> = {
    hazards: 'Hazard',
    equipment: 'Equipment',
    tasks: 'Task',
    workers: 'Worker',
    jobsites: 'Jobsite',
    sds: 'SDS',
    legislation: 'Regulation',
  };
  // Safe: source is constrained to LibrarySource type
  // eslint-disable-next-line security/detect-object-injection
  return labels[source] || source;
}

function getItemId(item: LibraryItem): string {
  return (item as { id: string }).id;
}

function getItemLabel(item: LibraryItem, source: LibrarySource): string {
  switch (source) {
    case 'hazards':
      return (item as HazardLibraryItem).name;
    case 'equipment':
      return `${(item as EquipmentLibraryItem).equipment_number}: ${(item as EquipmentLibraryItem).name}`;
    case 'tasks':
      return (item as TaskLibraryItem).name;
    case 'workers':
      return `${(item as WorkerLibraryItem).first_name} ${(item as WorkerLibraryItem).last_name}`;
    case 'jobsites':
      return `${(item as JobsiteLibraryItem).jobsite_number}: ${(item as JobsiteLibraryItem).name}`;
    case 'sds':
      return (item as SDSLibraryItem).product_name;
    default:
      return 'Unknown';
  }
}

function getItemDescription(item: LibraryItem, source: LibrarySource): string | null {
  switch (source) {
    case 'hazards':
      return (item as HazardLibraryItem).description;
    case 'equipment':
      return [(item as EquipmentLibraryItem).make, (item as EquipmentLibraryItem).model].filter(Boolean).join(' ') || null;
    case 'tasks':
      return (item as TaskLibraryItem).description;
    case 'workers':
      return (item as WorkerLibraryItem).position;
    case 'jobsites':
      return (item as JobsiteLibraryItem).address;
    case 'sds':
      return (item as SDSLibraryItem).manufacturer;
    default:
      return null;
  }
}

function getItemCode(item: LibraryItem, source: LibrarySource): string | null {
  switch (source) {
    case 'hazards':
      return (item as HazardLibraryItem).hazard_code;
    case 'equipment':
      return (item as EquipmentLibraryItem).serial_number;
    case 'tasks':
      return (item as TaskLibraryItem).task_code;
    case 'jobsites':
      return null; // Already in label
    case 'sds':
      return (item as SDSLibraryItem).sds_number;
    default:
      return null;
  }
}

function getItemCategory(item: LibraryItem, source: LibrarySource): string {
  switch (source) {
    case 'hazards':
      return (item as HazardLibraryItem).category;
    case 'equipment':
      return (item as EquipmentLibraryItem).category || (item as EquipmentLibraryItem).equipment_type;
    case 'tasks':
      return (item as TaskLibraryItem).category;
    case 'workers':
      return (item as WorkerLibraryItem).position || 'Staff';
    case 'jobsites':
      return (item as JobsiteLibraryItem).status === 'active' ? 'Active Sites' : 'Completed Sites';
    case 'sds':
      return 'Products';
    default:
      return 'Other';
  }
}

function groupItemsByCategory(items: LibraryItem[], source: LibrarySource): GroupedItems[] {
  const groups: Record<string, LibraryItem[]> = {};

  items.forEach(item => {
    const category = getItemCategory(item, source);
    // Safe: category is derived from item properties via getItemCategory
    // eslint-disable-next-line security/detect-object-injection
    if (!groups[category]) {
      // eslint-disable-next-line security/detect-object-injection
      groups[category] = [];
    }
    // eslint-disable-next-line security/detect-object-injection
    groups[category].push(item);
  });

  return Object.entries(groups)
    .map(([category, items]) => ({
      category,
      items,
      icon: CATEGORY_ICONS[category.toLowerCase().replace(/\s+/g, '_')],
    }))
    .sort((a, b) => a.category.localeCompare(b.category));
}

function formatCategory(category: string): string {
  return category
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function renderItemBadge(item: LibraryItem, source: LibrarySource): React.ReactNode {
  if (source === 'hazards') {
    const hazard = item as HazardLibraryItem;
    const risk = RISK_BADGES[hazard.default_risk_level];
    if (risk) {
      return (
        <Badge className={cn('text-xs flex-shrink-0', risk.color)}>
          {risk.icon} {hazard.default_risk_level}
        </Badge>
      );
    }
  }

  if (source === 'equipment') {
    const equipment = item as EquipmentLibraryItem;
    const statusColors: Record<string, string> = {
      in_service: 'bg-green-500 text-white',
      out_of_service: 'bg-red-500 text-white',
      maintenance: 'bg-yellow-500 text-black',
    };
    return (
      <Badge className={cn('text-xs flex-shrink-0', statusColors[equipment.status] || '')}>
        {equipment.status.replace('_', ' ')}
      </Badge>
    );
  }

  if (source === 'jobsites') {
    const jobsite = item as JobsiteLibraryItem;
    return (
      <Badge variant={jobsite.is_active ? 'default' : 'secondary'} className="text-xs flex-shrink-0">
        {jobsite.is_active ? 'Active' : 'Inactive'}
      </Badge>
    );
  }

  return null;
}

function renderItemMeta(item: LibraryItem, source: LibrarySource): React.ReactNode {
  if (source === 'hazards') {
    const hazard = item as HazardLibraryItem;
    if (hazard.required_ppe && hazard.required_ppe.length > 0) {
      return (
        <div className="flex flex-wrap gap-1 mt-1">
          {hazard.required_ppe.slice(0, 3).map((ppe, i) => (
            <span key={i} className="text-xs bg-muted px-1 rounded">
              🦺 {ppe}
            </span>
          ))}
          {hazard.required_ppe.length > 3 && (
            <span className="text-xs text-muted-foreground">
              +{hazard.required_ppe.length - 3} more
            </span>
          )}
        </div>
      );
    }
  }

  if (source === 'tasks') {
    const task = item as TaskLibraryItem;
    const meta: string[] = [];
    if (task.typical_duration_hours) meta.push(`⏱️ ${task.typical_duration_hours}h`);
    if (task.crew_size_min) meta.push(`👥 ${task.crew_size_min}+`);
    if (task.typical_hazards?.length) meta.push(`⚠️ ${task.typical_hazards.length} hazards`);
    
    if (meta.length > 0) {
      return (
        <div className="flex gap-2 mt-1 text-xs text-muted-foreground">
          {meta.map((m, i) => <span key={i}>{m}</span>)}
        </div>
      );
    }
  }

  if (source === 'sds') {
    const sds = item as SDSLibraryItem;
    if (sds.whmis_pictograms && sds.whmis_pictograms.length > 0) {
      return (
        <div className="flex gap-1 mt-1">
          {sds.whmis_pictograms.slice(0, 4).map((pic, i) => (
            <span key={i} className="text-lg">{pic}</span>
          ))}
        </div>
      );
    }
  }

  return null;
}

export default LibrarySearchDialog;
