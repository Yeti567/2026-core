'use client';

/**
 * LibraryFieldWrapper
 * 
 * Wraps form fields that fetch data from master libraries.
 * Provides auto-population, search mode, and quick-add functionality.
 */

import { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Plus, Search, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

import { FormField, LibrarySource, FieldValue } from '../types';
import { useLibraryOptions } from '@/lib/forms/use-library-options';
import {
  LibraryItem,
  formatLibraryItemLabel,
  formatLibraryItemDescription,
  getLibraryItemId,
  quickAddLibraryItem,
  getAutoPopulateValues,
} from '@/lib/forms/library-integration';

// =============================================================================
// Types
// =============================================================================

interface LibraryFieldWrapperProps {
  field: FormField;
  value: FieldValue;
  onChange: (value: unknown) => void;
  onAutoPopulate?: (values: Record<string, unknown>) => void;
  companyId: string;
  disabled?: boolean;
  error?: string;
  children: (props: LibraryFieldChildProps) => React.ReactNode;
}

interface LibraryFieldChildProps {
  options: LibraryItem[];
  isLoading: boolean;
  selectedItem: LibraryItem | undefined;
  getLabel: (item: LibraryItem) => string;
  getDescription: (item: LibraryItem) => string | null;
  getId: (item: LibraryItem) => string;
  onSelect: (itemId: string) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  filteredOptions: LibraryItem[];
}

// =============================================================================
// Component
// =============================================================================

export function LibraryFieldWrapper({
  field,
  value,
  onChange,
  onAutoPopulate,
  companyId,
  disabled,
  error,
  children,
}: LibraryFieldWrapperProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickAddName, setQuickAddName] = useState('');
  const [isQuickAdding, setIsQuickAdding] = useState(false);
  const [showSearchDialog, setShowSearchDialog] = useState(false);
  
  const {
    library_source,
    library_filters,
    auto_populate_fields,
    auto_populate_mappings,
    allow_quick_add,
    use_search_mode,
    search_mode_threshold = 50,
  } = field;
  
  // Fetch library data
  const {
    data: options,
    isLoading,
    getItem,
    getLabel,
    getDescription,
    getId,
    search,
  } = useLibraryOptions({
    source: library_source as LibrarySource,
    filters: library_filters,
    companyId,
    enabled: !!library_source,
  });
  
  // Determine if we should use search mode
  const shouldUseSearchMode = use_search_mode || (options.length > search_mode_threshold);
  
  // Get selected item
  const selectedItem = value ? getItem(String(value)) : undefined;
  
  // Filter options based on search term
  const filteredOptions = searchTerm ? search(searchTerm) : options;
  
  // Handle selection with auto-populate
  const handleSelect = useCallback((itemId: string) => {
    onChange(itemId);
    
    // Trigger auto-populate if configured
    if (onAutoPopulate && (auto_populate_fields?.length || auto_populate_mappings?.length)) {
      const item = getItem(itemId);
      if (item && library_source) {
        const fieldsToPopulate = auto_populate_fields || 
          auto_populate_mappings?.map(m => m.target_field) || [];
        
        const mappings = auto_populate_mappings?.map(m => ({
          sourceField: m.source_field,
          targetField: m.target_field,
          transform: m.transform ? createTransform(m.transform) : undefined,
        }));
        
        const values = getAutoPopulateValues(
          item,
          library_source as LibrarySource,
          fieldsToPopulate,
          mappings
        );
        
        onAutoPopulate(values);
      }
    }
    
    setShowSearchDialog(false);
  }, [onChange, onAutoPopulate, auto_populate_fields, auto_populate_mappings, getItem, library_source]);
  
  // Handle quick add
  const handleQuickAdd = async () => {
    if (!quickAddName.trim() || !library_source) return;
    
    setIsQuickAdding(true);
    try {
      const newItem = await quickAddLibraryItem(
        library_source as LibrarySource,
        { name: quickAddName.trim() },
        companyId
      );
      
      if (newItem) {
        // Select the newly added item
        handleSelect(getLibraryItemId(newItem));
        setQuickAddName('');
        setShowQuickAdd(false);
      }
    } catch (err) {
      console.error('Quick add failed:', err);
    } finally {
      setIsQuickAdding(false);
    }
  };
  
  // Render search dialog for large lists
  if (shouldUseSearchMode) {
    return (
      <div className="space-y-2">
        {/* Selected value display */}
        <div
          className={cn(
            'flex items-center gap-2 p-2 border rounded-md cursor-pointer hover:bg-muted/50',
            disabled && 'opacity-50 cursor-not-allowed',
            error && 'border-destructive'
          )}
          onClick={() => !disabled && setShowSearchDialog(true)}
        >
          {selectedItem ? (
            <div className="flex-1">
              <div className="font-medium">{getLabel(selectedItem)}</div>
              {getDescription(selectedItem) && (
                <div className="text-sm text-muted-foreground">{getDescription(selectedItem)}</div>
              )}
            </div>
          ) : (
            <div className="flex-1 text-muted-foreground">
              {field.placeholder || `Select ${field.label}...`}
            </div>
          )}
          <Search className="h-4 w-4 text-muted-foreground" />
        </div>
        
        {/* Search dialog */}
        <CommandDialog open={showSearchDialog} onOpenChange={setShowSearchDialog}>
          <CommandInput placeholder={`Search ${field.label}...`} />
          <CommandList>
            <CommandEmpty>
              No results found.
              {allow_quick_add && (
                <Button
                  variant="link"
                  className="mt-2"
                  onClick={() => {
                    setShowSearchDialog(false);
                    setShowQuickAdd(true);
                  }}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add new item
                </Button>
              )}
            </CommandEmpty>
            {groupOptionsByCategory(options, library_source as LibrarySource).map(group => (
              <CommandGroup key={group.category} heading={group.category}>
                {group.items.map(item => (
                  <CommandItem
                    key={getId(item)}
                    value={getLabel(item)}
                    onSelect={() => handleSelect(getId(item))}
                  >
                    <div className="flex-1">
                      <div>{getLabel(item)}</div>
                      {getDescription(item) && (
                        <div className="text-xs text-muted-foreground">{getDescription(item)}</div>
                      )}
                    </div>
                    {getRiskBadge(item, library_source as LibrarySource)}
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </CommandDialog>
        
        {/* Quick add dialog */}
        {allow_quick_add && (
          <Dialog open={showQuickAdd} onOpenChange={setShowQuickAdd}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New {field.label}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <Input
                  placeholder={`Enter ${field.label} name...`}
                  value={quickAddName}
                  onChange={(e) => setQuickAddName(e.target.value)}
                />
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowQuickAdd(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleQuickAdd} disabled={isQuickAdding || !quickAddName.trim()}>
                    {isQuickAdding && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                    Add
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
        
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    );
  }
  
  // Render standard dropdown with library data
  return (
    <div className="space-y-2">
      {children({
        options: filteredOptions,
        isLoading,
        selectedItem,
        getLabel,
        getDescription,
        getId,
        onSelect: handleSelect,
        searchTerm,
        setSearchTerm,
        filteredOptions,
      })}
      
      {/* Quick add button */}
      {allow_quick_add && !disabled && (
        <Dialog open={showQuickAdd} onOpenChange={setShowQuickAdd}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm" className="text-xs">
              <Plus className="h-3 w-3 mr-1" />
              Can&apos;t find it? Add new
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New {field.label}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <Input
                placeholder={`Enter ${field.label} name...`}
                value={quickAddName}
                onChange={(e) => setQuickAddName(e.target.value)}
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowQuickAdd(false)}>
                  Cancel
                </Button>
                <Button onClick={handleQuickAdd} disabled={isQuickAdding || !quickAddName.trim()}>
                  {isQuickAdding && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                  Add
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
      
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

// =============================================================================
// Helper Functions
// =============================================================================

function createTransform(type: string): ((value: unknown) => unknown) | undefined {
  switch (type) {
    case 'join':
      return (value) => Array.isArray(value) ? value.join(', ') : value;
    case 'first':
      return (value) => Array.isArray(value) ? value[0] : value;
    case 'count':
      return (value) => Array.isArray(value) ? value.length : 0;
    case 'sum':
      return (value) => Array.isArray(value) ? value.reduce((a, b) => a + b, 0) : value;
    case 'json':
      return (value) => JSON.stringify(value);
    default:
      return undefined;
  }
}

interface GroupedOptions {
  category: string;
  items: LibraryItem[];
}

function groupOptionsByCategory(
  items: LibraryItem[],
  source: LibrarySource
): GroupedOptions[] {
  const groups: Record<string, LibraryItem[]> = {};
  
  items.forEach(item => {
    let category = 'Other';
    
    if ('category' in item) {
      category = formatCategory((item as { category: string }).category);
    } else if ('trade' in item) {
      category = (item as { trade: string }).trade || 'General';
    } else if ('position' in item) {
      category = (item as { position?: string }).position || 'Staff';
    }
    
    // Safe: category is derived from item properties or defaulted to 'Other'
    // eslint-disable-next-line security/detect-object-injection
    if (!groups[category]) {
      // eslint-disable-next-line security/detect-object-injection
      groups[category] = [];
    }
    // eslint-disable-next-line security/detect-object-injection
    groups[category].push(item);
  });
  
  return Object.entries(groups).map(([category, items]) => ({
    category,
    items,
  }));
}

function formatCategory(category: string): string {
  return category
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function getRiskBadge(item: LibraryItem, source: LibrarySource): React.ReactNode {
  if (source !== 'hazards') return null;
  
  const hazard = item as { default_risk_level?: string };
  if (!hazard.default_risk_level) return null;
  
  const riskColors: Record<string, string> = {
    critical: 'bg-black text-white',
    high: 'bg-red-500 text-white',
    medium: 'bg-orange-500 text-white',
    low: 'bg-yellow-500 text-black',
    negligible: 'bg-green-500 text-white',
  };
  
  return (
    <Badge className={cn('text-xs', riskColors[hazard.default_risk_level] || '')}>
      {hazard.default_risk_level}
    </Badge>
  );
}

export default LibraryFieldWrapper;
