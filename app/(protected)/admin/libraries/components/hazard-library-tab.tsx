'use client';

import { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Hazard, 
  HazardCategory, 
  RiskLevel, 
  HazardFilters,
  HAZARD_CATEGORY_CONFIG,
  RISK_LEVEL_CONFIG,
} from './types';
import { useHazardLibrary } from '../hooks/use-hazard-library';

// Risk level badge component
function RiskBadge({ level }: { level: RiskLevel }) {
  // Safe: level is typed as RiskLevel enum, not arbitrary user input
  // eslint-disable-next-line security/detect-object-injection
  const config = RISK_LEVEL_CONFIG[level];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${config.bgColor} ${config.color}`}>
      {config.icon} {config.label}
    </span>
  );
}

// Category accordion header
function CategoryHeader({ 
  category, 
  count, 
  isExpanded, 
  onToggle 
}: { 
  category: HazardCategory; 
  count: number; 
  isExpanded: boolean;
  onToggle: () => void;
}) {
  // Safe: category is typed as HazardCategory enum, not arbitrary user input
  // eslint-disable-next-line security/detect-object-injection
  const config = HAZARD_CATEGORY_CONFIG[category];
  
  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between p-4 bg-[var(--card)] hover:bg-[var(--muted)]/10 rounded-lg border border-[var(--border)] transition-colors"
    >
      <div className="flex items-center gap-3">
        <span className="text-2xl">{config.icon}</span>
        <div className="text-left">
          <h3 className="font-semibold">{config.label} Hazards</h3>
          <p className="text-sm text-[var(--muted)]">{config.description}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Badge variant="secondary" className="bg-[var(--muted)]/20">
          {count} hazards
        </Badge>
        <span className="text-[var(--muted)] transition-transform" style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
          ▼
        </span>
      </div>
    </button>
  );
}

// Hazard card component
function HazardCard({ hazard, onEdit, onUseInForm }: { 
  hazard: Hazard; 
  onEdit: (hazard: Hazard) => void;
  onUseInForm: (hazard: Hazard) => void;
}) {
  const [showDetails, setShowDetails] = useState(false);
  
  const engineeringControls = hazard.recommended_controls.filter(c => c.type === 'engineering');
  const adminControls = hazard.recommended_controls.filter(c => c.type === 'administrative');
  const ppeControls = hazard.recommended_controls.filter(c => c.type === 'ppe');
  
  return (
    <div className="p-4 bg-[var(--background)] rounded-lg border border-[var(--border)] hover:border-[var(--primary)]/50 transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h4 className="font-medium truncate">{hazard.name}</h4>
            {!hazard.is_global && (
              <Badge variant="outline" className="text-xs border-amber-500 text-amber-500">
                Custom
              </Badge>
            )}
          </div>
          <p className="text-xs text-[var(--muted)] font-mono mb-2">{hazard.hazard_code}</p>
          
          {showDetails && (
            <p className="text-sm text-[var(--muted)] mb-3 line-clamp-2">
              {hazard.description}
            </p>
          )}
        </div>
        
        <div className="flex-shrink-0">
          <RiskBadge level={hazard.default_risk_level} />
        </div>
      </div>
      
      {showDetails && (
        <div className="mt-4 space-y-3 border-t border-[var(--border)] pt-4">
          {/* Trades */}
          {hazard.applicable_trades.length > 0 && (
            <div>
              <p className="text-xs text-[var(--muted)] mb-1">Applicable Trades:</p>
              <div className="flex flex-wrap gap-1">
                {hazard.applicable_trades.slice(0, 5).map((trade, i) => (
                  <Badge key={i} variant="secondary" className="text-xs">
                    {trade}
                  </Badge>
                ))}
                {hazard.applicable_trades.length > 5 && (
                  <Badge variant="secondary" className="text-xs">
                    +{hazard.applicable_trades.length - 5} more
                  </Badge>
                )}
              </div>
            </div>
          )}
          
          {/* Engineering Controls */}
          {engineeringControls.length > 0 && (
            <div>
              <p className="text-xs text-[var(--muted)] mb-1">🔧 Engineering Controls:</p>
              <ul className="text-sm pl-4 space-y-0.5">
                {engineeringControls.slice(0, 3).map((c, i) => (
                  <li key={i} className="text-[var(--foreground)]">• {c.control}</li>
                ))}
                {engineeringControls.length > 3 && (
                  <li className="text-[var(--muted)]">+{engineeringControls.length - 3} more...</li>
                )}
              </ul>
            </div>
          )}
          
          {/* Administrative Controls */}
          {adminControls.length > 0 && (
            <div>
              <p className="text-xs text-[var(--muted)] mb-1">📋 Administrative Controls:</p>
              <ul className="text-sm pl-4 space-y-0.5">
                {adminControls.slice(0, 3).map((c, i) => (
                  <li key={i} className="text-[var(--foreground)]">• {c.control}</li>
                ))}
                {adminControls.length > 3 && (
                  <li className="text-[var(--muted)]">+{adminControls.length - 3} more...</li>
                )}
              </ul>
            </div>
          )}
          
          {/* PPE */}
          {hazard.required_ppe.length > 0 && (
            <div>
              <p className="text-xs text-[var(--muted)] mb-1">🦺 Required PPE:</p>
              <div className="flex flex-wrap gap-1">
                {hazard.required_ppe.map((ppe, i) => (
                  <Badge key={i} variant="outline" className="text-xs">
                    {ppe}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          
          {/* Regulations */}
          {hazard.regulatory_references.length > 0 && (
            <div>
              <p className="text-xs text-[var(--muted)] mb-1">⚖️ Regulations:</p>
              <ul className="text-xs pl-4 space-y-0.5 text-[var(--muted)]">
                {hazard.regulatory_references.map((ref, i) => (
                  <li key={i}>• {ref.regulation} {ref.section} - {ref.title}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
      
      {/* Actions */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-[var(--border)]">
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="text-xs text-[var(--primary)] hover:underline"
        >
          {showDetails ? 'Hide Details' : 'Show Details'}
        </button>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => onEdit(hazard)}>
            Edit
          </Button>
          <Button size="sm" onClick={() => onUseInForm(hazard)}>
            Use in Form
          </Button>
        </div>
      </div>
    </div>
  );
}

// Filter bar component
function FilterBar({ 
  filters, 
  onFiltersChange,
  availableTrades 
}: { 
  filters: HazardFilters;
  onFiltersChange: (filters: HazardFilters) => void;
  availableTrades: string[];
}) {
  return (
    <div className="flex flex-wrap gap-3 items-center p-4 bg-[var(--card)] rounded-lg border border-[var(--border)]">
      {/* Search */}
      <div className="flex-1 min-w-[200px]">
        <Input
          type="search"
          placeholder="🔍 Search hazards..."
          value={filters.search}
          onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
          className="w-full"
        />
      </div>
      
      {/* Category Filter */}
      <select
        value={filters.categories[0] || ''}
        onChange={(e) => onFiltersChange({ 
          ...filters, 
          categories: e.target.value ? [e.target.value as HazardCategory] : [] 
        })}
        className="px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-sm"
      >
        <option value="">All Categories</option>
        {Object.entries(HAZARD_CATEGORY_CONFIG).map(([key, config]) => (
          <option key={key} value={key}>
            {config.icon} {config.label}
          </option>
        ))}
      </select>
      
      {/* Trade Filter */}
      <select
        value={filters.trades[0] || ''}
        onChange={(e) => onFiltersChange({ 
          ...filters, 
          trades: e.target.value ? [e.target.value] : [] 
        })}
        className="px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-sm"
      >
        <option value="">All Trades</option>
        {availableTrades.map((trade) => (
          <option key={trade} value={trade}>{trade}</option>
        ))}
      </select>
      
      {/* Risk Level Filter */}
      <select
        value={filters.riskLevels[0] || ''}
        onChange={(e) => onFiltersChange({ 
          ...filters, 
          riskLevels: e.target.value ? [e.target.value as RiskLevel] : [] 
        })}
        className="px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-sm"
      >
        <option value="">All Risk Levels</option>
        {Object.entries(RISK_LEVEL_CONFIG).map(([key, config]) => (
          <option key={key} value={key}>
            {config.icon} {config.label}
          </option>
        ))}
      </select>
      
      {/* Clear Filters */}
      {(filters.search || filters.categories.length > 0 || filters.trades.length > 0 || filters.riskLevels.length > 0) && (
        <button
          onClick={() => onFiltersChange({ 
            search: '', 
            categories: [], 
            trades: [], 
            riskLevels: [], 
            showInactive: false 
          })}
          className="text-sm text-[var(--muted)] hover:text-[var(--foreground)]"
        >
          Clear filters ✕
        </button>
      )}
    </div>
  );
}

// Add Hazard Modal
function AddHazardModal({ isOpen, onClose, onSave }: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (hazard: Partial<Hazard>) => void;
}) {
  const [formData, setFormData] = useState<{
    name: string;
    category: HazardCategory;
    subcategory: string;
    description: string;
    applicable_trades: string[];
    default_severity: number;
    default_likelihood: number;
    engineering_controls: string[];
    admin_controls: string[];
    required_ppe: string[];
  }>({
    name: '',
    category: 'physical',
    subcategory: '',
    description: '',
    applicable_trades: [],
    default_severity: 3,
    default_likelihood: 3,
    engineering_controls: [],
    admin_controls: [],
    required_ppe: [],
  });
  
  const [newControl, setNewControl] = useState('');
  const [newPpe, setNewPpe] = useState('');
  
  const riskScore = formData.default_severity * formData.default_likelihood;
  const riskLevel: RiskLevel = 
    riskScore >= 20 ? 'critical' :
    riskScore >= 15 ? 'high' :
    riskScore >= 10 ? 'medium' :
    riskScore >= 5 ? 'low' : 'negligible';
  
  const handleSubmit = () => {
    const controls = [
      ...formData.engineering_controls.map(c => ({ type: 'engineering' as const, control: c, required: true })),
      ...formData.admin_controls.map(c => ({ type: 'administrative' as const, control: c, required: true })),
    ];
    
    onSave({
      name: formData.name,
      category: formData.category,
      subcategory: formData.subcategory,
      description: formData.description,
      applicable_trades: formData.applicable_trades,
      default_severity: formData.default_severity,
      default_likelihood: formData.default_likelihood,
      default_risk_level: riskLevel,
      recommended_controls: controls,
      required_ppe: formData.required_ppe,
    });
    
    onClose();
  };
  
  if (!isOpen) return null;
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Custom Hazard</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 mt-4">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Hazard Name *</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Working at Heights"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Category *</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as HazardCategory })}
                className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg"
              >
                {Object.entries(HAZARD_CATEGORY_CONFIG).map(([key, config]) => (
                  <option key={key} value={key}>{config.icon} {config.label}</option>
                ))}
              </select>
            </div>
          </div>
          
          <div>
            <label className="text-sm font-medium">Subcategory</label>
            <Input
              value={formData.subcategory}
              onChange={(e) => setFormData({ ...formData, subcategory: e.target.value })}
              placeholder="e.g., Ladders, Scaffolds"
            />
          </div>
          
          <div>
            <label className="text-sm font-medium">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Detailed description of the hazard..."
              className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg min-h-[80px]"
            />
          </div>
          
          {/* Risk Rating */}
          <div className="p-4 bg-[var(--muted)]/10 rounded-lg">
            <h4 className="font-medium mb-3">Risk Assessment</h4>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-sm text-[var(--muted)]">Likelihood (1-5)</label>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={formData.default_likelihood}
                  onChange={(e) => setFormData({ ...formData, default_likelihood: Number(e.target.value) })}
                  className="w-full"
                />
                <p className="text-center font-medium">{formData.default_likelihood}</p>
              </div>
              <div>
                <label className="text-sm text-[var(--muted)]">Severity (1-5)</label>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={formData.default_severity}
                  onChange={(e) => setFormData({ ...formData, default_severity: Number(e.target.value) })}
                  className="w-full"
                />
                <p className="text-center font-medium">{formData.default_severity}</p>
              </div>
              <div className="text-center">
                <label className="text-sm text-[var(--muted)]">Risk Level</label>
                <div className="mt-2">
                  <RiskBadge level={riskLevel} />
                </div>
                <p className="text-xs text-[var(--muted)] mt-1">Score: {riskScore}</p>
              </div>
            </div>
          </div>
          
          {/* Engineering Controls */}
          <div>
            <label className="text-sm font-medium">Engineering Controls</label>
            <div className="flex gap-2 mt-1">
              <Input
                value={newControl}
                onChange={(e) => setNewControl(e.target.value)}
                placeholder="Add control measure..."
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && newControl) {
                    setFormData({ 
                      ...formData, 
                      engineering_controls: [...formData.engineering_controls, newControl] 
                    });
                    setNewControl('');
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (newControl) {
                    setFormData({ 
                      ...formData, 
                      engineering_controls: [...formData.engineering_controls, newControl] 
                    });
                    setNewControl('');
                  }
                }}
              >
                Add
              </Button>
            </div>
            {formData.engineering_controls.length > 0 && (
              <ul className="mt-2 space-y-1">
                {formData.engineering_controls.map((c, i) => (
                  <li key={i} className="flex items-center justify-between text-sm p-2 bg-[var(--muted)]/10 rounded">
                    <span>🔧 {c}</span>
                    <button 
                      onClick={() => setFormData({
                        ...formData,
                        engineering_controls: formData.engineering_controls.filter((_, idx) => idx !== i)
                      })}
                      className="text-red-500 hover:text-red-600"
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          
          {/* PPE Required */}
          <div>
            <label className="text-sm font-medium">Required PPE</label>
            <div className="flex gap-2 mt-1">
              <Input
                value={newPpe}
                onChange={(e) => setNewPpe(e.target.value)}
                placeholder="Add PPE item..."
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && newPpe) {
                    setFormData({ 
                      ...formData, 
                      required_ppe: [...formData.required_ppe, newPpe] 
                    });
                    setNewPpe('');
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (newPpe) {
                    setFormData({ 
                      ...formData, 
                      required_ppe: [...formData.required_ppe, newPpe] 
                    });
                    setNewPpe('');
                  }
                }}
              >
                Add
              </Button>
            </div>
            {formData.required_ppe.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {formData.required_ppe.map((ppe, i) => (
                  <Badge key={i} variant="secondary" className="flex items-center gap-1">
                    {ppe}
                    <button 
                      onClick={() => setFormData({
                        ...formData,
                        required_ppe: formData.required_ppe.filter((_, idx) => idx !== i)
                      })}
                      className="ml-1 hover:text-red-500"
                    >
                      ✕
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
          
          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t border-[var(--border)]">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={!formData.name}>
              Create Hazard
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Main component
export function HazardLibraryTab() {
  const { hazards, isLoading, error, createHazard } = useHazardLibrary();
  const [filters, setFilters] = useState<HazardFilters>({
    search: '',
    categories: [],
    trades: [],
    riskLevels: [],
    showInactive: false,
  });
  const [expandedCategories, setExpandedCategories] = useState<Set<HazardCategory>>(new Set(['fall' as HazardCategory, 'chemical' as HazardCategory]));
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingHazard, setEditingHazard] = useState<Hazard | null>(null);
  
  // Get unique trades from hazards
  const availableTrades = useMemo(() => {
    const tradesSet = new Set<string>();
    hazards.forEach(h => h.applicable_trades.forEach(t => tradesSet.add(t)));
    return Array.from(tradesSet).sort();
  }, [hazards]);
  
  // Filter hazards
  const filteredHazards = useMemo(() => {
    return hazards.filter(hazard => {
      // Search filter
      if (filters.search) {
        const search = filters.search.toLowerCase();
        const matchesSearch = 
          hazard.name.toLowerCase().includes(search) ||
          (hazard.description?.toLowerCase().includes(search)) ||
          hazard.hazard_code.toLowerCase().includes(search);
        if (!matchesSearch) return false;
      }
      
      // Category filter
      if (filters.categories.length > 0 && !filters.categories.includes(hazard.category)) {
        return false;
      }
      
      // Trade filter
      if (filters.trades.length > 0) {
        const hasTrade = filters.trades.some(t => hazard.applicable_trades.includes(t));
        if (!hasTrade) return false;
      }
      
      // Risk level filter
      if (filters.riskLevels.length > 0 && !filters.riskLevels.includes(hazard.default_risk_level)) {
        return false;
      }
      
      return true;
    });
  }, [hazards, filters]);
  
  // Group hazards by category
  const hazardsByCategory = useMemo(() => {
    const grouped: Record<HazardCategory, Hazard[]> = {} as Record<HazardCategory, Hazard[]>;
    
    filteredHazards.forEach(hazard => {
      if (!grouped[hazard.category]) {
        grouped[hazard.category] = [];
      }
      grouped[hazard.category].push(hazard);
    });
    
    // Sort hazards within each category by risk level
    Object.keys(grouped).forEach(category => {
      grouped[category as HazardCategory].sort((a, b) => {
        const riskOrder: Record<RiskLevel, number> = { critical: 0, high: 1, medium: 2, low: 3, negligible: 4 };
        return riskOrder[a.default_risk_level] - riskOrder[b.default_risk_level];
      });
    });
    
    return grouped;
  }, [filteredHazards]);
  
  const toggleCategory = useCallback((category: HazardCategory) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return newSet;
    });
  }, []);
  
  const handleUseInForm = (hazard: Hazard) => {
    // TODO: Navigate to form builder with hazard pre-selected
    console.log('Use in form:', hazard);
  };
  
  const handleSaveHazard = (hazardData: Partial<Hazard>) => {
    createHazard(hazardData);
  };
  
  // Stats
  const stats = useMemo(() => ({
    total: hazards.length,
    filtered: filteredHazards.length,
    critical: filteredHazards.filter(h => h.default_risk_level === 'critical').length,
    high: filteredHazards.filter(h => h.default_risk_level === 'high').length,
    custom: filteredHazards.filter(h => !h.is_global).length,
  }), [hazards, filteredHazards]);
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-2">⏳</div>
          <p className="text-[var(--muted)]">Loading hazard library...</p>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <Card className="border-red-500/50">
        <CardContent className="p-6">
          <p className="text-red-500">Error loading hazards: {error}</p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            🚨 Hazard Library
          </h2>
          <p className="text-[var(--muted)] mt-1">
            {stats.filtered} of {stats.total} hazards
            {stats.critical > 0 && <span className="text-red-500 ml-2">• {stats.critical} critical</span>}
            {stats.high > 0 && <span className="text-orange-500 ml-2">• {stats.high} high risk</span>}
          </p>
        </div>
        
        <Button onClick={() => setShowAddModal(true)}>
          + Add Custom Hazard
        </Button>
      </div>
      
      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {Object.entries(RISK_LEVEL_CONFIG).map(([level, config]) => {
          const count = filteredHazards.filter(h => h.default_risk_level === level).length;
          return (
            <Card key={level} className="cursor-pointer hover:border-[var(--primary)]/50" onClick={() => {
              setFilters(prev => ({
                ...prev,
                riskLevels: prev.riskLevels.includes(level as RiskLevel) 
                  ? [] 
                  : [level as RiskLevel]
              }));
            }}>
              <CardContent className="p-3 text-center">
                <div className="text-2xl">{config.icon}</div>
                <div className="text-xl font-bold">{count}</div>
                <div className="text-xs text-[var(--muted)]">{config.label}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      
      {/* Filters */}
      <FilterBar 
        filters={filters} 
        onFiltersChange={setFilters}
        availableTrades={availableTrades}
      />
      
      {/* Hazard Categories */}
      <div className="space-y-3">
        {/* Safe: category keys come from typed HAZARD_CATEGORY_CONFIG object, not user input */}
        {(Object.keys(HAZARD_CATEGORY_CONFIG) as HazardCategory[])
          // eslint-disable-next-line security/detect-object-injection
          .filter(category => hazardsByCategory[category]?.length > 0)
          // eslint-disable-next-line security/detect-object-injection
          .sort((a, b) => (hazardsByCategory[b]?.length || 0) - (hazardsByCategory[a]?.length || 0))
          .map(category => (
            <div key={category} className="space-y-2">
              <CategoryHeader
                category={category}
                // Safe: category is from typed HazardCategory enum iteration
                // eslint-disable-next-line security/detect-object-injection
                count={hazardsByCategory[category]?.length || 0}
                isExpanded={expandedCategories.has(category)}
                onToggle={() => toggleCategory(category)}
              />
              
              {expandedCategories.has(category) && (
                <div className="pl-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {/* Safe: category is from typed HazardCategory enum iteration */}
                  {/* eslint-disable-next-line security/detect-object-injection */}
                  {hazardsByCategory[category]?.map(hazard => (
                    <HazardCard
                      key={hazard.id}
                      hazard={hazard}
                      onEdit={setEditingHazard}
                      onUseInForm={handleUseInForm}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
      </div>
      
      {filteredHazards.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="text-4xl mb-4">🔍</div>
            <h3 className="font-semibold mb-2">No hazards found</h3>
            <p className="text-[var(--muted)]">
              Try adjusting your filters or search terms
            </p>
          </CardContent>
        </Card>
      )}
      
      {/* Add Hazard Modal */}
      <AddHazardModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSave={handleSaveHazard}
      />
    </div>
  );
}
