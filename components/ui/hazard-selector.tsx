'use client';

/**
 * HazardSelector - A reusable component for selecting hazards from the hazard library
 * 
 * This component can be used in any form to replace hardcoded hazard options.
 * It fetches hazards dynamically from the hazard_library table and provides
 * search, filtering, and category grouping.
 * 
 * @example Basic usage:
 * ```tsx
 * <HazardSelector
 *   value={selectedHazardId}
 *   onChange={(id) => setSelectedHazardId(id)}
 * />
 * ```
 * 
 * @example Multi-select usage:
 * ```tsx
 * <HazardSelector
 *   mode="multi"
 *   value={selectedHazards}
 *   onChange={(hazards) => setSelectedHazards(hazards)}
 *   tradeFilter="Concrete"
 * />
 * ```
 */

import { useState, useEffect, useMemo } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

export type HazardCategory =
  | 'physical'
  | 'chemical'
  | 'biological'
  | 'ergonomic'
  | 'psychosocial'
  | 'electrical'
  | 'mechanical'
  | 'fall'
  | 'struck_by'
  | 'caught_in'
  | 'environmental'
  | 'fire_explosion'
  | 'confined_space'
  | 'radiation'
  | 'other';

export type RiskLevel = 'negligible' | 'low' | 'medium' | 'high' | 'critical';

export interface HazardItem {
  id: string;
  hazard_code: string;
  name: string;
  description: string | null;
  category: HazardCategory;
  subcategory: string | null;
  applicable_trades: string[];
  default_severity: number;
  default_likelihood: number;
  default_risk_score: number;
  default_risk_level: RiskLevel;
  recommended_controls: Array<{ type: string; control: string; required: boolean }>;
  required_ppe: string[];
  regulatory_references: Array<{ regulation: string; section: string; title: string }>;
}

export interface SelectedHazard {
  hazard_id: string;
  hazard_name: string;
  hazard_code: string;
  category: HazardCategory;
  risk_level: RiskLevel;
  controls_selected?: string[];
  ppe_selected?: string[];
  additional_notes?: string;
}

// ============================================================================
// Configuration
// ============================================================================

const RISK_CONFIG: Record<RiskLevel, { label: string; color: string; bgColor: string; textColor: string; icon: string }> = {
  critical: { label: 'Critical', color: 'border-black', bgColor: 'bg-black', textColor: 'text-white', icon: '⚫' },
  high: { label: 'High', color: 'border-red-600', bgColor: 'bg-red-600', textColor: 'text-white', icon: '🔴' },
  medium: { label: 'Medium', color: 'border-orange-400', bgColor: 'bg-orange-400', textColor: 'text-black', icon: '🟠' },
  low: { label: 'Low', color: 'border-yellow-400', bgColor: 'bg-yellow-400', textColor: 'text-black', icon: '🟡' },
  negligible: { label: 'Negligible', color: 'border-green-400', bgColor: 'bg-green-400', textColor: 'text-black', icon: '🟢' },
};

const CATEGORY_CONFIG: Record<HazardCategory, { label: string; icon: string }> = {
  physical: { label: 'Physical', icon: '💥' },
  chemical: { label: 'Chemical', icon: '🧪' },
  biological: { label: 'Biological', icon: '🦠' },
  ergonomic: { label: 'Ergonomic', icon: '🏋️' },
  psychosocial: { label: 'Psychosocial', icon: '🧠' },
  electrical: { label: 'Electrical', icon: '⚡' },
  mechanical: { label: 'Mechanical', icon: '⚙️' },
  fall: { label: 'Falls', icon: '⬇️' },
  struck_by: { label: 'Struck By', icon: '🎯' },
  caught_in: { label: 'Caught In', icon: '🔒' },
  environmental: { label: 'Environmental', icon: '🌡️' },
  fire_explosion: { label: 'Fire/Explosion', icon: '🔥' },
  confined_space: { label: 'Confined Space', icon: '🚪' },
  radiation: { label: 'Radiation', icon: '☢️' },
  other: { label: 'Other', icon: '📌' },
};

// ============================================================================
// Single Select Component
// ============================================================================

interface HazardSelectorSingleProps {
  value: string | null;
  onChange: (hazardId: string, hazard?: HazardItem) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  tradeFilter?: string;
  categoryFilter?: HazardCategory;
  hazards?: HazardItem[];
}

function HazardSelectorSingle({
  value,
  onChange,
  placeholder = 'Select hazard...',
  disabled,
  className,
  tradeFilter,
  categoryFilter,
  hazards: providedHazards,
}: HazardSelectorSingleProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [hazards, setHazards] = useState<HazardItem[]>(providedHazards || []);
  const [isLoading, setIsLoading] = useState(!providedHazards);

  useEffect(() => {
    if (providedHazards) {
      setHazards(providedHazards);
      return;
    }

    const fetchHazards = async () => {
      try {
        const supabase = createBrowserClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        let query = supabase
          .from('hazard_library')
          .select('*')
          .eq('is_active', true)
          .order('category')
          .order('name');

        if (categoryFilter) {
          query = query.eq('category', categoryFilter);
        }

        const { data, error } = await query;

        if (error) {
          console.error('Error fetching hazards:', error);
          return;
        }

        setHazards(data || []);
      } catch (err) {
        console.error('Failed to fetch hazards:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHazards();
  }, [providedHazards, categoryFilter]);

  const filteredHazards = useMemo(() => {
    return hazards.filter((hazard) => {
      if (searchTerm) {
        const searchStr = `${hazard.name} ${hazard.description || ''} ${hazard.hazard_code}`.toLowerCase();
        if (!searchStr.includes(searchTerm.toLowerCase())) return false;
      }

      if (tradeFilter) {
        const hasTrade =
          hazard.applicable_trades?.includes(tradeFilter) ||
          hazard.applicable_trades?.includes('General Construction') ||
          hazard.applicable_trades?.includes('All Trades');
        if (!hasTrade) return false;
      }

      return true;
    });
  }, [hazards, searchTerm, tradeFilter]);

  const hazardsByCategory = useMemo(() => {
    const grouped: Record<HazardCategory, HazardItem[]> = {} as Record<HazardCategory, HazardItem[]>;
    filteredHazards.forEach((hazard) => {
      if (!grouped[hazard.category]) {
        grouped[hazard.category] = [];
      }
      grouped[hazard.category].push(hazard);
    });
    return grouped;
  }, [filteredHazards]);

  const selectedHazard = hazards.find((h) => h.id === value);

  if (isLoading) {
    return (
      <div className={cn('h-10 flex items-center justify-center border rounded-md bg-muted/50', className)}>
        <span className="text-sm text-muted-foreground">Loading hazards...</span>
      </div>
    );
  }

  return (
    <Select
      value={value ?? ''}
      onValueChange={(v) => {
        const hazard = hazards.find((h) => h.id === v);
        onChange(v, hazard);
      }}
      disabled={disabled}
    >
      <SelectTrigger className={cn('w-full', className)}>
        <SelectValue placeholder={placeholder}>
          {selectedHazard && (
            <span className="flex items-center gap-2">
              <span>{CATEGORY_CONFIG[selectedHazard.category]?.icon}</span>
              <span className="truncate">{selectedHazard.name}</span>
              <span
                className={cn(
                  'text-xs px-1.5 py-0.5 rounded',
                  RISK_CONFIG[selectedHazard.default_risk_level]?.bgColor,
                  RISK_CONFIG[selectedHazard.default_risk_level]?.textColor
                )}
              >
                {RISK_CONFIG[selectedHazard.default_risk_level]?.icon}
              </span>
            </span>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="max-h-80">
        <div className="p-2 border-b sticky top-0 bg-background z-10">
          <Input
            placeholder="Search hazards..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-8"
          />
        </div>

        <div className="max-h-60 overflow-auto">
          {Object.entries(hazardsByCategory).length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">No hazards found</div>
          ) : (
            Object.entries(hazardsByCategory).map(([category, categoryHazards]) => (
              <div key={category}>
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50 sticky top-0">
                  {CATEGORY_CONFIG[category as HazardCategory]?.icon} {CATEGORY_CONFIG[category as HazardCategory]?.label} (
                  {categoryHazards.length})
                </div>
                {categoryHazards.map((hazard) => (
                  <SelectItem key={hazard.id} value={hazard.id}>
                    <div className="flex items-center gap-2 w-full">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{hazard.name}</div>
                        <div className="text-xs text-muted-foreground truncate">{hazard.hazard_code}</div>
                      </div>
                      <span
                        className={cn(
                          'flex-shrink-0 text-xs px-1.5 py-0.5 rounded',
                          RISK_CONFIG[hazard.default_risk_level]?.bgColor,
                          RISK_CONFIG[hazard.default_risk_level]?.textColor
                        )}
                      >
                        {RISK_CONFIG[hazard.default_risk_level]?.label}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </div>
            ))
          )}
        </div>
      </SelectContent>
    </Select>
  );
}

// ============================================================================
// Multi Select Component
// ============================================================================

interface HazardSelectorMultiProps {
  value: SelectedHazard[];
  onChange: (hazards: SelectedHazard[]) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  tradeFilter?: string;
  categoryFilter?: HazardCategory;
  hazards?: HazardItem[];
  maxHeight?: string;
}

function HazardSelectorMulti({
  value,
  onChange,
  placeholder = 'Select hazards...',
  disabled,
  className,
  tradeFilter,
  categoryFilter,
  hazards: providedHazards,
  maxHeight = '300px',
}: HazardSelectorMultiProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [hazards, setHazards] = useState<HazardItem[]>(providedHazards || []);
  const [isLoading, setIsLoading] = useState(!providedHazards);
  const [categoryFilterState, setCategoryFilterState] = useState<HazardCategory | ''>('');

  const selectedIds = new Set(value.map((h) => h.hazard_id));

  useEffect(() => {
    if (providedHazards) {
      setHazards(providedHazards);
      return;
    }

    const fetchHazards = async () => {
      try {
        const supabase = createBrowserClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        const { data, error } = await supabase
          .from('hazard_library')
          .select('*')
          .eq('is_active', true)
          .order('default_risk_level')
          .order('category')
          .order('name');

        if (error) {
          console.error('Error fetching hazards:', error);
          return;
        }

        setHazards(data || []);
      } catch (err) {
        console.error('Failed to fetch hazards:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHazards();
  }, [providedHazards]);

  const filteredHazards = useMemo(() => {
    return hazards.filter((hazard) => {
      if (searchTerm) {
        const searchStr = `${hazard.name} ${hazard.description || ''} ${hazard.hazard_code}`.toLowerCase();
        if (!searchStr.includes(searchTerm.toLowerCase())) return false;
      }

      if (categoryFilterState && hazard.category !== categoryFilterState) return false;
      if (categoryFilter && hazard.category !== categoryFilter) return false;

      if (tradeFilter) {
        const hasTrade =
          hazard.applicable_trades?.includes(tradeFilter) ||
          hazard.applicable_trades?.includes('General Construction') ||
          hazard.applicable_trades?.includes('All Trades');
        if (!hasTrade) return false;
      }

      return true;
    });
  }, [hazards, searchTerm, categoryFilterState, categoryFilter, tradeFilter]);

  const hazardsByCategory = useMemo(() => {
    const grouped: Record<HazardCategory, HazardItem[]> = {} as Record<HazardCategory, HazardItem[]>;
    filteredHazards.forEach((hazard) => {
      if (!grouped[hazard.category]) {
        grouped[hazard.category] = [];
      }
      grouped[hazard.category].push(hazard);
    });
    return grouped;
  }, [filteredHazards]);

  const availableCategories = useMemo(() => {
    const cats = new Set<HazardCategory>();
    hazards.forEach((h) => cats.add(h.category));
    return Array.from(cats);
  }, [hazards]);

  const toggleHazard = (hazard: HazardItem) => {
    if (disabled) return;

    if (selectedIds.has(hazard.id)) {
      onChange(value.filter((h) => h.hazard_id !== hazard.id));
    } else {
      const newHazard: SelectedHazard = {
        hazard_id: hazard.id,
        hazard_name: hazard.name,
        hazard_code: hazard.hazard_code,
        category: hazard.category,
        risk_level: hazard.default_risk_level,
        controls_selected: [],
        ppe_selected: hazard.required_ppe || [],
      };
      onChange([...value, newHazard]);
    }
  };

  if (isLoading) {
    return (
      <div className={cn('h-20 flex items-center justify-center border rounded-md bg-muted/50', className)}>
        <span className="text-sm text-muted-foreground">Loading hazards...</span>
      </div>
    );
  }

  return (
    <div className={cn('border rounded-lg overflow-hidden', className)}>
      {/* Selected Hazards Summary */}
      {value.length > 0 && (
        <div className="p-3 bg-muted/30 border-b">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Selected Hazards ({value.length})</span>
            <Button type="button" variant="ghost" size="sm" onClick={() => onChange([])} disabled={disabled}>
              Clear All
            </Button>
          </div>
          <div className="flex flex-wrap gap-1">
            {value.map((h) => {
              const config = RISK_CONFIG[h.risk_level];
              return (
                <Badge key={h.hazard_id} variant="outline" className={cn('cursor-pointer', config.bgColor, config.textColor)}>
                  {config.icon} {h.hazard_name}
                  <button
                    type="button"
                    className="ml-1 hover:text-destructive"
                    onClick={() => onChange(value.filter((x) => x.hazard_id !== h.hazard_id))}
                  >
                    ×
                  </button>
                </Badge>
              );
            })}
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="p-3 border-b bg-background">
        <div className="flex gap-2">
          <Input
            placeholder={placeholder}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-8 flex-1"
          />
          {!categoryFilter && (
            <select
              value={categoryFilterState}
              onChange={(e) => setCategoryFilterState(e.target.value as HazardCategory | '')}
              className="h-8 px-2 text-sm border rounded-md bg-background"
            >
              <option value="">All Categories</option>
              {availableCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {/* Safe: cat is from availableCategories which is derived from HazardCategory type */}
                  {/* eslint-disable-next-line security/detect-object-injection */}
                  {CATEGORY_CONFIG[cat]?.icon} {CATEGORY_CONFIG[cat]?.label}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Hazard List */}
      <div className="overflow-auto" style={{ maxHeight }}>
        {Object.entries(hazardsByCategory).length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">No hazards found</div>
        ) : (
          Object.entries(hazardsByCategory).map(([category, categoryHazards]) => (
            <div key={category}>
              <div className="px-3 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50 sticky top-0">
                {CATEGORY_CONFIG[category as HazardCategory]?.icon} {CATEGORY_CONFIG[category as HazardCategory]?.label} (
                {categoryHazards.length})
              </div>
              {categoryHazards.map((hazard) => {
                const isSelected = selectedIds.has(hazard.id);
                const config = RISK_CONFIG[hazard.default_risk_level];

                return (
                  <label
                    key={hazard.id}
                    className={cn(
                      'flex items-start gap-3 px-3 py-2 cursor-pointer hover:bg-muted/30 transition-colors',
                      isSelected ? 'bg-primary/5' : ''
                    )}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleHazard(hazard)}
                      disabled={disabled}
                      className="mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">{hazard.name}</span>
                        <span className={cn('flex-shrink-0 text-xs px-1.5 py-0.5 rounded', config.bgColor, config.textColor)}>
                          {config.icon} {config.label}
                        </span>
                      </div>
                      {hazard.description && (
                        <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{hazard.description}</p>
                      )}
                      {hazard.required_ppe && hazard.required_ppe.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {hazard.required_ppe.slice(0, 3).map((ppe, i) => (
                            <span key={i} className="text-xs text-muted-foreground bg-muted px-1 rounded">
                              {ppe}
                            </span>
                          ))}
                          {hazard.required_ppe.length > 3 && (
                            <span className="text-xs text-muted-foreground">+{hazard.required_ppe.length - 3} more</span>
                          )}
                        </div>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Main Export - HazardSelector
// ============================================================================

export interface HazardSelectorProps {
  mode?: 'single' | 'multi';
  value: string | null | SelectedHazard[];
  onChange: ((hazardId: string, hazard?: HazardItem) => void) | ((hazards: SelectedHazard[]) => void);
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  tradeFilter?: string;
  categoryFilter?: HazardCategory;
  hazards?: HazardItem[];
  maxHeight?: string;
}

export function HazardSelector({
  mode = 'single',
  value,
  onChange,
  placeholder,
  disabled,
  className,
  tradeFilter,
  categoryFilter,
  hazards,
  maxHeight,
}: HazardSelectorProps) {
  if (mode === 'multi') {
    return (
      <HazardSelectorMulti
        value={(value as SelectedHazard[]) || []}
        onChange={onChange as (hazards: SelectedHazard[]) => void}
        placeholder={placeholder}
        disabled={disabled}
        className={className}
        tradeFilter={tradeFilter}
        categoryFilter={categoryFilter}
        hazards={hazards}
        maxHeight={maxHeight}
      />
    );
  }

  return (
    <HazardSelectorSingle
      value={value as string | null}
      onChange={onChange as (hazardId: string, hazard?: HazardItem) => void}
      placeholder={placeholder}
      disabled={disabled}
      className={className}
      tradeFilter={tradeFilter}
      categoryFilter={categoryFilter}
      hazards={hazards}
    />
  );
}

export default HazardSelector;

// Export sub-components for granular usage
export { HazardSelectorSingle, HazardSelectorMulti };

// Export configs for use in other components
export { RISK_CONFIG, CATEGORY_CONFIG };
