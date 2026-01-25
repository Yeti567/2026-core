'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Equipment, EquipmentStatus } from './types';
import { useEquipmentInventory } from '../hooks/use-equipment-inventory';

const STATUS_CONFIG: Record<EquipmentStatus, { label: string; color: string; icon: string }> = {
  active: { label: 'Active', color: 'bg-green-500', icon: '✅' },
  inactive: { label: 'Inactive', color: 'bg-gray-500', icon: '⏸️' },
  maintenance: { label: 'In Maintenance', color: 'bg-yellow-500', icon: '🔧' },
  retired: { label: 'Retired', color: 'bg-red-500', icon: '❌' },
};

const INSPECTION_STATUS_CONFIG = {
  current: { label: 'Current', color: 'text-green-500 bg-green-500/10', icon: '✅' },
  due_soon: { label: 'Due Soon', color: 'text-yellow-500 bg-yellow-500/10', icon: '⚠️' },
  overdue: { label: 'Overdue', color: 'text-red-500 bg-red-500/10', icon: '❌' },
  na: { label: 'N/A', color: 'text-gray-500 bg-gray-500/10', icon: '➖' },
};

function StatusBadge({ status }: { status: EquipmentStatus }) {
  // Safe: status is typed as EquipmentStatus enum, not arbitrary user input
  // eslint-disable-next-line security/detect-object-injection
  const config = STATUS_CONFIG[status];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-white ${config.color}`}>
      {config.icon} {config.label}
    </span>
  );
}

function InspectionBadge({ status }: { status: 'current' | 'due_soon' | 'overdue' | 'na' }) {
  // Safe: status is typed as a union literal, not arbitrary user input
  // eslint-disable-next-line security/detect-object-injection
  const config = INSPECTION_STATUS_CONFIG[status];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
      {config.icon} {config.label}
    </span>
  );
}

function EquipmentDetailModal({ equipment, isOpen, onClose }: {
  equipment: Equipment | null;
  isOpen: boolean;
  onClose: () => void;
}) {
  if (!equipment) return null;
  
  const daysUntilInspection = equipment.next_inspection_date 
    ? Math.ceil((new Date(equipment.next_inspection_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            🔧 Equipment Details - {equipment.equipment_code}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 mt-4">
          {/* Photo placeholder */}
          <div className="aspect-video bg-[var(--muted)]/10 rounded-lg flex items-center justify-center border border-dashed border-[var(--border)]">
            {equipment.photo_url ? (
              <img src={equipment.photo_url} alt={equipment.name} className="w-full h-full object-cover rounded-lg" />
            ) : (
              <div className="text-center text-[var(--muted)]">
                <div className="text-4xl mb-2">📷</div>
                <p>No photo available</p>
              </div>
            )}
          </div>
          
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-[var(--muted)]">Equipment Name</label>
              <p className="font-medium">{equipment.name}</p>
            </div>
            <div>
              <label className="text-xs text-[var(--muted)]">Type</label>
              <p className="font-medium">{equipment.equipment_type}</p>
            </div>
            <div>
              <label className="text-xs text-[var(--muted)]">Make/Model</label>
              <p className="font-medium">{equipment.make || '-'} / {equipment.model || '-'}</p>
            </div>
            <div>
              <label className="text-xs text-[var(--muted)]">Serial Number</label>
              <p className="font-medium font-mono text-sm">{equipment.serial_number || '-'}</p>
            </div>
            <div>
              <label className="text-xs text-[var(--muted)]">Purchase Date</label>
              <p className="font-medium">
                {equipment.purchase_date 
                  ? new Date(equipment.purchase_date).toLocaleDateString() 
                  : '-'}
              </p>
            </div>
            <div>
              <label className="text-xs text-[var(--muted)]">Status</label>
              <div className="mt-1"><StatusBadge status={equipment.status} /></div>
            </div>
          </div>
          
          {/* Inspection Status */}
          <Card className={`border-l-4 ${
            equipment.inspection_status === 'overdue' ? 'border-l-red-500 bg-red-500/5' :
            equipment.inspection_status === 'due_soon' ? 'border-l-yellow-500 bg-yellow-500/5' :
            'border-l-green-500 bg-green-500/5'
          }`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold flex items-center gap-2">
                  📋 Inspection Status
                  <InspectionBadge status={equipment.inspection_status} />
                </h4>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <label className="text-xs text-[var(--muted)]">Last Inspection</label>
                  <p className="font-medium">
                    {equipment.last_inspection_date 
                      ? new Date(equipment.last_inspection_date).toLocaleDateString()
                      : 'Never inspected'}
                  </p>
                </div>
                <div>
                  <label className="text-xs text-[var(--muted)]">Next Due</label>
                  <p className={`font-medium ${
                    daysUntilInspection !== null && daysUntilInspection < 0 ? 'text-red-500' :
                    daysUntilInspection !== null && daysUntilInspection <= 7 ? 'text-yellow-500' :
                    ''
                  }`}>
                    {equipment.next_inspection_date 
                      ? new Date(equipment.next_inspection_date).toLocaleDateString()
                      : 'Not scheduled'}
                    {daysUntilInspection !== null && (
                      <span className="text-xs ml-1">
                        ({daysUntilInspection < 0 ? `${Math.abs(daysUntilInspection)} days overdue` : 
                          daysUntilInspection === 0 ? 'Today' :
                          `in ${daysUntilInspection} days`})
                      </span>
                    )}
                  </p>
                </div>
                <div>
                  <label className="text-xs text-[var(--muted)]">Frequency</label>
                  <p className="font-medium">Every {equipment.inspection_frequency_days} days</p>
                </div>
              </div>
              
              <Button className="w-full mt-4" variant="default">
                📋 Conduct Inspection Now
              </Button>
            </CardContent>
          </Card>
          
          {/* Location & Assignment */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-[var(--muted)]/10 rounded-lg">
            <div>
              <label className="text-xs text-[var(--muted)]">Current Location</label>
              <p className="font-medium">{equipment.current_location || 'Not assigned'}</p>
            </div>
            <div>
              <label className="text-xs text-[var(--muted)]">Assigned To</label>
              <p className="font-medium">{equipment.assigned_to || 'Unassigned'}</p>
            </div>
          </div>
          
          {/* Certifications Required */}
          {equipment.certifications_required.length > 0 && (
            <div>
              <label className="text-xs text-[var(--muted)]">Required Certifications</label>
              <div className="flex flex-wrap gap-1 mt-1">
                {equipment.certifications_required.map((cert, i) => (
                  <Badge key={i} variant="secondary">{cert}</Badge>
                ))}
              </div>
            </div>
          )}
          
          {/* Notes */}
          {equipment.notes && (
            <div>
              <label className="text-xs text-[var(--muted)]">Notes</label>
              <p className="text-sm mt-1 p-3 bg-[var(--muted)]/10 rounded-lg">{equipment.notes}</p>
            </div>
          )}
          
          {/* Actions */}
          <div className="flex gap-2 pt-4 border-t border-[var(--border)]">
            <Button variant="outline" className="flex-1">Edit</Button>
            <Button variant="outline" className="flex-1">Move Equipment</Button>
            <Button variant="outline" className="flex-1">🔲 QR Code</Button>
            <Button variant="outline" className="flex-1">📜 History</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AddEquipmentModal({ isOpen, onClose, onSave }: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (equipment: Partial<Equipment>) => void;
}) {
  const [formData, setFormData] = useState({
    name: '',
    equipment_type: '',
    category: '',
    make: '',
    model: '',
    serial_number: '',
    purchase_date: '',
    current_location: '',
    inspection_frequency_days: 30,
    notes: '',
  });
  
  const handleSubmit = () => {
    onSave({
      ...formData,
      status: 'active' as EquipmentStatus,
      inspection_status: 'current',
    });
    onClose();
  };
  
  if (!isOpen) return null;
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add New Equipment</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 mt-4">
          <div>
            <label className="text-sm font-medium">Equipment Name *</label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Extension Ladder 28'"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Type *</label>
              <select
                value={formData.equipment_type}
                onChange={(e) => setFormData({ ...formData, equipment_type: e.target.value })}
                className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg"
              >
                <option value="">Select type...</option>
                <option value="Ladder">Ladder</option>
                <option value="Scaffold">Scaffold</option>
                <option value="Power Tool">Power Tool</option>
                <option value="Heavy Equipment">Heavy Equipment</option>
                <option value="Aerial Platform">Aerial Platform</option>
                <option value="Concrete Equipment">Concrete Equipment</option>
                <option value="Safety Equipment">Safety Equipment</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Category</label>
              <Input
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                placeholder="e.g., Fall Protection"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Make</label>
              <Input
                value={formData.make}
                onChange={(e) => setFormData({ ...formData, make: e.target.value })}
                placeholder="e.g., Werner"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Model</label>
              <Input
                value={formData.model}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                placeholder="e.g., D6228-2"
              />
            </div>
          </div>
          
          <div>
            <label className="text-sm font-medium">Serial Number</label>
            <Input
              value={formData.serial_number}
              onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
              placeholder="Serial/Asset number"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Purchase Date</label>
              <Input
                type="date"
                value={formData.purchase_date}
                onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Inspection Frequency (days)</label>
              <Input
                type="number"
                value={formData.inspection_frequency_days}
                onChange={(e) => setFormData({ ...formData, inspection_frequency_days: Number(e.target.value) })}
              />
            </div>
          </div>
          
          <div>
            <label className="text-sm font-medium">Current Location</label>
            <Input
              value={formData.current_location}
              onChange={(e) => setFormData({ ...formData, current_location: e.target.value })}
              placeholder="e.g., Main Warehouse"
            />
          </div>
          
          <div>
            <label className="text-sm font-medium">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg min-h-[80px]"
              placeholder="Additional notes..."
            />
          </div>
          
          <div className="flex justify-end gap-2 pt-4 border-t border-[var(--border)]">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={!formData.name || !formData.equipment_type}>
              Add Equipment
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function EquipmentInventoryTab() {
  const { equipment, isLoading, error, createEquipment } = useEquipmentInventory();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [inspectionFilter, setInspectionFilter] = useState('');
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  
  // Get unique types
  const equipmentTypes = useMemo(() => {
    const types = new Set<string>();
    equipment.forEach(e => types.add(e.equipment_type));
    return Array.from(types).sort();
  }, [equipment]);
  
  // Filter equipment
  const filteredEquipment = useMemo(() => {
    return equipment.filter(e => {
      if (search) {
        const searchLower = search.toLowerCase();
        const matches = 
          e.name.toLowerCase().includes(searchLower) ||
          e.equipment_code.toLowerCase().includes(searchLower) ||
          e.serial_number?.toLowerCase().includes(searchLower) ||
          e.current_location?.toLowerCase().includes(searchLower);
        if (!matches) return false;
      }
      
      if (typeFilter && e.equipment_type !== typeFilter) return false;
      if (statusFilter && e.status !== statusFilter) return false;
      if (inspectionFilter && e.inspection_status !== inspectionFilter) return false;
      
      return true;
    });
  }, [equipment, search, typeFilter, statusFilter, inspectionFilter]);
  
  // Stats
  const stats = useMemo(() => ({
    total: equipment.length,
    active: equipment.filter(e => e.status === 'active').length,
    maintenance: equipment.filter(e => e.status === 'maintenance').length,
    overdue: equipment.filter(e => e.inspection_status === 'overdue').length,
    dueSoon: equipment.filter(e => e.inspection_status === 'due_soon').length,
  }), [equipment]);
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-2">⏳</div>
          <p className="text-[var(--muted)]">Loading equipment inventory...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            🔧 Equipment Inventory
          </h2>
          <p className="text-[var(--muted)] mt-1">
            {filteredEquipment.length} of {stats.total} items
            {stats.overdue > 0 && <span className="text-red-500 ml-2">• {stats.overdue} overdue inspections</span>}
          </p>
        </div>
        
        <Button onClick={() => setShowAddModal(true)}>
          + Add Equipment
        </Button>
      </div>
      
      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="cursor-pointer hover:border-[var(--primary)]/50" onClick={() => setStatusFilter('')}>
          <CardContent className="p-3 text-center">
            <div className="text-2xl">📦</div>
            <div className="text-xl font-bold">{stats.total}</div>
            <div className="text-xs text-[var(--muted)]">Total Equipment</div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:border-[var(--primary)]/50" onClick={() => setStatusFilter('active')}>
          <CardContent className="p-3 text-center">
            <div className="text-2xl">✅</div>
            <div className="text-xl font-bold">{stats.active}</div>
            <div className="text-xs text-[var(--muted)]">Active</div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:border-[var(--primary)]/50" onClick={() => setStatusFilter('maintenance')}>
          <CardContent className="p-3 text-center">
            <div className="text-2xl">🔧</div>
            <div className="text-xl font-bold">{stats.maintenance}</div>
            <div className="text-xs text-[var(--muted)]">In Maintenance</div>
          </CardContent>
        </Card>
        <Card className={`cursor-pointer hover:border-[var(--primary)]/50 ${stats.overdue > 0 ? 'border-red-500/50' : ''}`} onClick={() => setInspectionFilter('overdue')}>
          <CardContent className="p-3 text-center">
            <div className="text-2xl">❌</div>
            <div className={`text-xl font-bold ${stats.overdue > 0 ? 'text-red-500' : ''}`}>{stats.overdue}</div>
            <div className="text-xs text-[var(--muted)]">Overdue Inspections</div>
          </CardContent>
        </Card>
        <Card className={`cursor-pointer hover:border-[var(--primary)]/50 ${stats.dueSoon > 0 ? 'border-yellow-500/50' : ''}`} onClick={() => setInspectionFilter('due_soon')}>
          <CardContent className="p-3 text-center">
            <div className="text-2xl">⚠️</div>
            <div className={`text-xl font-bold ${stats.dueSoon > 0 ? 'text-yellow-500' : ''}`}>{stats.dueSoon}</div>
            <div className="text-xs text-[var(--muted)]">Due Soon</div>
          </CardContent>
        </Card>
      </div>
      
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center p-4 bg-[var(--card)] rounded-lg border border-[var(--border)]">
        <div className="flex-1 min-w-[200px]">
          <Input
            type="search"
            placeholder="🔍 Search equipment..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-sm"
        >
          <option value="">All Types</option>
          {equipmentTypes.map(type => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>
        
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-sm"
        >
          <option value="">All Status</option>
          {Object.entries(STATUS_CONFIG).map(([key, config]) => (
            <option key={key} value={key}>{config.icon} {config.label}</option>
          ))}
        </select>
        
        <select
          value={inspectionFilter}
          onChange={(e) => setInspectionFilter(e.target.value)}
          className="px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-sm"
        >
          <option value="">All Inspections</option>
          {Object.entries(INSPECTION_STATUS_CONFIG).map(([key, config]) => (
            <option key={key} value={key}>{config.icon} {config.label}</option>
          ))}
        </select>
        
        {(search || typeFilter || statusFilter || inspectionFilter) && (
          <button
            onClick={() => {
              setSearch('');
              setTypeFilter('');
              setStatusFilter('');
              setInspectionFilter('');
            }}
            className="text-sm text-[var(--muted)] hover:text-[var(--foreground)]"
          >
            Clear filters ✕
          </button>
        )}
      </div>
      
      {/* Equipment Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[var(--muted)]/10 border-b border-[var(--border)]">
              <tr>
                <th className="text-left p-4 font-medium text-sm">Equipment #</th>
                <th className="text-left p-4 font-medium text-sm">Name / Type</th>
                <th className="text-left p-4 font-medium text-sm">Location</th>
                <th className="text-left p-4 font-medium text-sm">Status</th>
                <th className="text-left p-4 font-medium text-sm">Next Inspection</th>
                <th className="text-left p-4 font-medium text-sm">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredEquipment.map((item) => {
                const daysUntil = item.next_inspection_date 
                  ? Math.ceil((new Date(item.next_inspection_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                  : null;
                
                return (
                  <tr 
                    key={item.id} 
                    className="border-b border-[var(--border)] hover:bg-[var(--muted)]/5 cursor-pointer"
                    onClick={() => setSelectedEquipment(item)}
                  >
                    <td className="p-4 font-mono text-sm">{item.equipment_code}</td>
                    <td className="p-4">
                      <div className="font-medium">{item.name}</div>
                      <div className="text-xs text-[var(--muted)]">{item.equipment_type}</div>
                    </td>
                    <td className="p-4 text-sm">{item.current_location || '-'}</td>
                    <td className="p-4"><StatusBadge status={item.status} /></td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <InspectionBadge status={item.inspection_status} />
                        {item.next_inspection_date && (
                          <span className={`text-xs ${
                            daysUntil !== null && daysUntil < 0 ? 'text-red-500' :
                            daysUntil !== null && daysUntil <= 7 ? 'text-yellow-500' :
                            'text-[var(--muted)]'
                          }`}>
                            {new Date(item.next_inspection_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedEquipment(item);
                        }}
                      >
                        View
                      </Button>
                    </td>
                  </tr>
                );
              })}
              
              {filteredEquipment.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-[var(--muted)]">
                    <div className="text-4xl mb-2">📦</div>
                    <p>No equipment found</p>
                    <p className="text-sm">Try adjusting your filters or add new equipment</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
      
      {/* Detail Modal */}
      <EquipmentDetailModal
        equipment={selectedEquipment}
        isOpen={!!selectedEquipment}
        onClose={() => setSelectedEquipment(null)}
      />
      
      {/* Add Modal */}
      <AddEquipmentModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSave={createEquipment}
      />
    </div>
  );
}
