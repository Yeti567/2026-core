'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { FieldWrapper } from './field-wrapper';
import { FormField, FieldValue, Hazard, HazardCategory, RiskLevel } from '../types';
import { createBrowserClient } from '@supabase/ssr';

// Risk level configuration
const RISK_CONFIG: Record<RiskLevel, { label: string; color: string; bgColor: string; icon: string }> = {
  critical: { label: 'Critical', color: 'text-white', bgColor: 'bg-black', icon: '⚫' },
  high: { label: 'High', color: 'text-white', bgColor: 'bg-red-600', icon: '🔴' },
  medium: { label: 'Medium', color: 'text-black', bgColor: 'bg-orange-400', icon: '🟠' },
  low: { label: 'Low', color: 'text-black', bgColor: 'bg-yellow-400', icon: '🟡' },
  negligible: { label: 'Negligible', color: 'text-black', bgColor: 'bg-green-400', icon: '🟢' },
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

interface HazardSelectFieldProps {
  field: FormField;
  value: FieldValue;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
  hazards?: Hazard[];
  tradeFilter?: string;
  categoryFilter?: HazardCategory;
}

export function HazardSelectField({
  field,
  value,
  onChange,
  error,
  disabled,
  hazards: providedHazards,
  tradeFilter,
  categoryFilter,
}: HazardSelectFieldProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [hazards, setHazards] = useState<Hazard[]>(providedHazards || []);
  const [isLoading, setIsLoading] = useState(!providedHazards);
  
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
        
        let query = supabase
          .from('hazard_library')
          .select('*')
          .eq('is_active', true)
          .order('category')
          .order('name');
        
        if (categoryFilter) {
          query = query.eq('category', categoryFilter);
        }
        
        const { data, error: fetchError } = await query;
        
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
  }, [providedHazards, categoryFilter]);
  
  // Filter hazards by search and trade
  const filteredHazards = useMemo(() => {
    return hazards.filter((hazard) => {
      // Search filter
      if (searchTerm) {
        const searchStr = `${hazard.name} ${hazard.description || ''} ${hazard.hazard_code}`.toLowerCase();
        if (!searchStr.includes(searchTerm.toLowerCase())) return false;
      }
      
      // Trade filter
      if (tradeFilter) {
        const hasTrade = hazard.applicable_trades?.includes(tradeFilter) || 
                         hazard.applicable_trades?.includes('General Construction') ||
                         hazard.applicable_trades?.includes('All Trades');
        if (!hasTrade) return false;
      }
      
      return true;
    });
  }, [hazards, searchTerm, tradeFilter]);
  
  // Group by category
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
  
  const selectedHazard = hazards.find(h => h.id === value);
  
  if (isLoading) {
    return (
      <FieldWrapper
        label={field.label}
        fieldCode={field.field_code}
        required={field.validation_rules?.required}
        helpText={field.help_text}
        error={error}
      >
        <div className="h-10 flex items-center justify-center border rounded-md bg-muted/50">
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
      <Select
        value={String(value ?? '')}
        onValueChange={onChange}
        disabled={disabled}
      >
        <SelectTrigger
          id={field.field_code}
          aria-invalid={!!error}
          className="w-full"
        >
          <SelectValue placeholder={field.placeholder || 'Select hazard'}>
            {selectedHazard && (
              <span className="flex items-center gap-2">
                <span>{CATEGORY_CONFIG[selectedHazard.category]?.icon}</span>
                <span className="truncate">{selectedHazard.name}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded ${RISK_CONFIG[selectedHazard.default_risk_level]?.bgColor} ${RISK_CONFIG[selectedHazard.default_risk_level]?.color}`}>
                  {RISK_CONFIG[selectedHazard.default_risk_level]?.icon}
                </span>
              </span>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="max-h-80">
          {/* Search */}
          <div className="p-2 border-b sticky top-0 bg-background z-10">
            <Input
              placeholder="Search hazards..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-8"
            />
          </div>
          
          {/* Hazards grouped by category */}
          <div className="max-h-60 overflow-auto">
            {Object.entries(hazardsByCategory).length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                No hazards found
              </div>
            ) : (
              Object.entries(hazardsByCategory).map(([category, categoryHazards]) => (
                <div key={category}>
                  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50 sticky top-0">
                    {CATEGORY_CONFIG[category as HazardCategory]?.icon} {CATEGORY_CONFIG[category as HazardCategory]?.label} ({categoryHazards.length})
                  </div>
                  {categoryHazards.map((hazard) => (
                    <SelectItem key={hazard.id} value={hazard.id}>
                      <div className="flex items-center gap-2 w-full">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{hazard.name}</div>
                          <div className="text-xs text-muted-foreground truncate">
                            {hazard.hazard_code}
                          </div>
                        </div>
                        <span className={`flex-shrink-0 text-xs px-1.5 py-0.5 rounded ${RISK_CONFIG[hazard.default_risk_level]?.bgColor} ${RISK_CONFIG[hazard.default_risk_level]?.color}`}>
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
    </FieldWrapper>
  );
}

export default HazardSelectField;
