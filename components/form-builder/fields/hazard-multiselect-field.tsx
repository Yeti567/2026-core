'use client';

import { useState, useMemo, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { FieldWrapper } from './field-wrapper';
import { FormField, FieldValue, Hazard, HazardCategory, RiskLevel } from '../types';
import { createBrowserClient } from '@supabase/ssr';

// Risk level configuration
const RISK_CONFIG: Record<RiskLevel, { label: string; color: string; bgColor: string; textColor: string; icon: string }> = {
  critical: { label: 'Critical', color: 'border-black bg-black', bgColor: 'bg-black', textColor: 'text-white', icon: '⚫' },
  high: { label: 'High', color: 'border-red-600 bg-red-600', bgColor: 'bg-red-600', textColor: 'text-white', icon: '🔴' },
  medium: { label: 'Medium', color: 'border-orange-400 bg-orange-400', bgColor: 'bg-orange-400', textColor: 'text-black', icon: '🟠' },
  low: { label: 'Low', color: 'border-yellow-400 bg-yellow-400', bgColor: 'bg-yellow-400', textColor: 'text-black', icon: '🟡' },
  negligible: { label: 'Negligible', color: 'border-green-400 bg-green-400', bgColor: 'bg-green-400', textColor: 'text-black', icon: '🟢' },
};

// Category configuration
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

interface SelectedHazardValue {
  hazard_id: string;
  hazard_name: string;
  hazard_code: string;
  category: HazardCategory;
  risk_level: RiskLevel;
  controls_selected?: string[];
  ppe_selected?: string[];
  additional_notes?: string;
}

interface HazardMultiselectFieldProps {
  field: FormField;
  value: FieldValue;
  onChange: (value: SelectedHazardValue[]) => void;
  error?: string;
  disabled?: boolean;
  hazards?: Hazard[];
  tradeFilter?: string;
  showControls?: boolean;
  showPPE?: boolean;
}

export function HazardMultiselectField({
  field,
  value,
  onChange,
  error,
  disabled,
  hazards: providedHazards,
  tradeFilter,
  showControls = true,
  showPPE = true,
}: HazardMultiselectFieldProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<HazardCategory | ''>('');
  const [hazards, setHazards] = useState<Hazard[]>(providedHazards || []);
  const [isLoading, setIsLoading] = useState(!providedHazards);
  const [expandedHazard, setExpandedHazard] = useState<string | null>(null);
  
  // Parse value
  const selectedHazards: SelectedHazardValue[] =
    Array.isArray(value) &&
    (value as unknown[]).every((v) => !!v && typeof v === 'object' && 'hazard_id' in (v as any))
      ? (value as unknown as SelectedHazardValue[])
      : [];
  const selectedIds = new Set(selectedHazards.map(h => h.hazard_id));
  
  // Fetch hazards from database if not provided
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
        
        const { data, error: fetchError } = await supabase
          .from('hazard_library')
          .select('*')
          .eq('is_active', true)
          .order('default_risk_level')
          .order('category')
          .order('name');
        
        if (fetchError) {
          console.error('Error fetching hazards:', fetchError);
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
  
  // Filter hazards
  const filteredHazards = useMemo(() => {
    return hazards.filter((hazard) => {
      // Search filter
      if (searchTerm) {
        const searchStr = `${hazard.name} ${hazard.description || ''} ${hazard.hazard_code}`.toLowerCase();
        if (!searchStr.includes(searchTerm.toLowerCase())) return false;
      }
      
      // Category filter
      if (categoryFilter && hazard.category !== categoryFilter) return false;
      
      // Trade filter
      if (tradeFilter) {
        const hasTrade = hazard.applicable_trades?.includes(tradeFilter) || 
                         hazard.applicable_trades?.includes('General Construction') ||
                         hazard.applicable_trades?.includes('All Trades');
        if (!hasTrade) return false;
      }
      
      return true;
    });
  }, [hazards, searchTerm, categoryFilter, tradeFilter]);
  
  // Group by category for display
  const hazardsByCategory = useMemo(() => {
    const grouped: Record<HazardCategory, Hazard[]> = {} as Record<HazardCategory, Hazard[]>;
    filteredHazards.forEach(hazard => {
      if (!grouped[hazard.category]) {
        grouped[hazard.category] = [];
      }
      grouped[hazard.category].push(hazard);
    });
    return grouped;
  }, [filteredHazards]);
  
  // Get unique categories for filter
  const availableCategories = useMemo(() => {
    const cats = new Set<HazardCategory>();
    hazards.forEach(h => cats.add(h.category));
    return Array.from(cats);
  }, [hazards]);
  
  // Toggle hazard selection
  const toggleHazard = (hazard: Hazard) => {
    if (disabled) return;
    
    if (selectedIds.has(hazard.id)) {
      // Remove hazard
      onChange(selectedHazards.filter(h => h.hazard_id !== hazard.id));
    } else {
      // Add hazard with default values
      const newHazard: SelectedHazardValue = {
        hazard_id: hazard.id,
        hazard_name: hazard.name,
        hazard_code: hazard.hazard_code,
        category: hazard.category,
        risk_level: hazard.default_risk_level,
        controls_selected: [],
        ppe_selected: hazard.required_ppe || [],
      };
      onChange([...selectedHazards, newHazard]);
    }
  };
  
  // Update hazard controls/PPE
  const updateHazard = (hazardId: string, updates: Partial<SelectedHazardValue>) => {
    onChange(selectedHazards.map(h => 
      h.hazard_id === hazardId ? { ...h, ...updates } : h
    ));
  };
  
  // Get full hazard details
  const getHazardDetails = (hazardId: string) => {
    return hazards.find(h => h.id === hazardId);
  };
  
  if (isLoading) {
    return (
      <FieldWrapper
        label={field.label}
        fieldCode={field.field_code}
        required={field.validation_rules?.required}
        helpText={field.help_text}
        error={error}
      >
        <div className="h-20 flex items-center justify-center border rounded-md bg-muted/50">
          <span className="text-sm text-muted-foreground">Loading hazards...</span>
        </div>
      </FieldWrapper>
    );
  }
  
  return (
    <FieldWrapper
      label={field.label}
      fieldCode={field.field_code}
      required={field.validation_rules?.required}
      helpText={field.help_text}
      error={error}
    >
      <div className="border rounded-lg overflow-hidden">
        {/* Selected Hazards Summary */}
        {selectedHazards.length > 0 && (
          <div className="p-3 bg-muted/30 border-b">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">
                Selected Hazards ({selectedHazards.length})
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onChange([])}
                disabled={disabled}
              >
                Clear All
              </Button>
            </div>
            <div className="flex flex-wrap gap-1">
              {selectedHazards.map(h => {
                const config = RISK_CONFIG[h.risk_level];
                return (
                  <Badge
                    key={h.hazard_id}
                    variant="outline"
                    className={`cursor-pointer ${config.color} ${config.textColor}`}
                    onClick={() => setExpandedHazard(expandedHazard === h.hazard_id ? null : h.hazard_id)}
                  >
                    {config.icon} {h.hazard_name}
                    <button
                      type="button"
                      className="ml-1 hover:text-destructive"
                      onClick={(e) => { e.stopPropagation(); toggleHazard(getHazardDetails(h.hazard_id)!); }}
                    >
                      ×
                    </button>
                  </Badge>
                );
              })}
            </div>
          </div>
        )}
        
        {/* Expanded Hazard Details (for editing controls/PPE) */}
        {expandedHazard && (
          <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border-b">
            {(() => {
              const selected = selectedHazards.find(h => h.hazard_id === expandedHazard);
              const hazardDetails = getHazardDetails(expandedHazard);
              if (!selected || !hazardDetails) return null;
              
              return (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">{selected.hazard_name}</h4>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setExpandedHazard(null)}
                    >
                      Close
                    </Button>
                  </div>
                  
                  {/* Controls Selection */}
                  {showControls && hazardDetails.recommended_controls && hazardDetails.recommended_controls.length > 0 && (
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Controls to Implement:</label>
                      <div className="mt-1 space-y-1 max-h-32 overflow-auto">
                        {hazardDetails.recommended_controls.map((ctrl: any, i: number) => (
                          <label key={i} className="flex items-start gap-2 text-sm cursor-pointer">
                            <Checkbox
                              checked={selected.controls_selected?.includes(ctrl.control)}
                              onCheckedChange={(checked) => {
                                const current = selected.controls_selected || [];
                                const updated = checked
                                  ? [...current, ctrl.control]
                                  : current.filter(c => c !== ctrl.control);
                                updateHazard(expandedHazard, { controls_selected: updated });
                              }}
                              disabled={disabled}
                            />
                            <span className="flex-1">
                              <span className="text-xs text-muted-foreground mr-1">
                                [{ctrl.type}]
                              </span>
                              {ctrl.control}
                              {ctrl.required && <span className="text-red-500 ml-1">*</span>}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* PPE Selection */}
                  {showPPE && hazardDetails.required_ppe && hazardDetails.required_ppe.length > 0 && (
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Required PPE:</label>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {hazardDetails.required_ppe.map((ppe: string, i: number) => (
                          <Badge
                            key={i}
                            variant={selected.ppe_selected?.includes(ppe) ? 'default' : 'outline'}
                            className="cursor-pointer"
                            onClick={() => {
                              if (disabled) return;
                              const current = selected.ppe_selected || [];
                              const updated = current.includes(ppe)
                                ? current.filter(p => p !== ppe)
                                : [...current, ppe];
                              updateHazard(expandedHazard, { ppe_selected: updated });
                            }}
                          >
                            🦺 {ppe}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Additional Notes */}
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Additional Notes:</label>
                    <Input
                      value={selected.additional_notes || ''}
                      onChange={(e) => updateHazard(expandedHazard, { additional_notes: e.target.value })}
                      placeholder="Site-specific notes..."
                      disabled={disabled}
                      className="mt-1 h-8 text-sm"
                    />
                  </div>
                </div>
              );
            })()}
          </div>
        )}
        
        {/* Search and Filters */}
        <div className="p-3 border-b bg-background">
          <div className="flex gap-2">
            <Input
              placeholder="Search hazards..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-8 flex-1"
            />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as HazardCategory | '')}
              className="h-8 px-2 text-sm border rounded-md bg-background"
            >
              <option value="">All Categories</option>
              {availableCategories.map(cat => (
                <option key={cat} value={cat}>
                  {/* Safe: cat is from availableCategories which is derived from HazardCategory type */}
                  {/* eslint-disable-next-line security/detect-object-injection */}
                  {CATEGORY_CONFIG[cat]?.icon} {CATEGORY_CONFIG[cat]?.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        {/* Hazard List */}
        <div className="max-h-64 overflow-auto">
          {Object.entries(hazardsByCategory).length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No hazards found
            </div>
          ) : (
            Object.entries(hazardsByCategory).map(([category, categoryHazards]) => (
              <div key={category}>
                <div className="px-3 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50 sticky top-0">
                  {CATEGORY_CONFIG[category as HazardCategory]?.icon} {CATEGORY_CONFIG[category as HazardCategory]?.label} ({categoryHazards.length})
                </div>
                {categoryHazards.map((hazard) => {
                  const isSelected = selectedIds.has(hazard.id);
                  const config = RISK_CONFIG[hazard.default_risk_level];
                  
                  return (
                    <label
                      key={hazard.id}
                      className={`flex items-start gap-3 px-3 py-2 cursor-pointer hover:bg-muted/30 transition-colors ${isSelected ? 'bg-primary/5' : ''}`}
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
                          <span className={`flex-shrink-0 text-xs px-1.5 py-0.5 rounded ${config.bgColor} ${config.textColor}`}>
                            {config.icon} {config.label}
                          </span>
                        </div>
                        {hazard.description && (
                          <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                            {hazard.description}
                          </p>
                        )}
                        {hazard.required_ppe && hazard.required_ppe.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {hazard.required_ppe.slice(0, 3).map((ppe, i) => (
                              <span key={i} className="text-xs text-muted-foreground bg-muted px-1 rounded">
                                {ppe}
                              </span>
                            ))}
                            {hazard.required_ppe.length > 3 && (
                              <span className="text-xs text-muted-foreground">
                                +{hazard.required_ppe.length - 3} more
                              </span>
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
    </FieldWrapper>
  );
}

export default HazardMultiselectField;
