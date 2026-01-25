'use client';

import { useState, useEffect, useCallback } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { Equipment } from '../components/types';

// Mock data for development (will be replaced with actual Supabase data)
const MOCK_EQUIPMENT: Equipment[] = [
  {
    id: '1',
    company_id: '1',
    equipment_code: 'EQP-001',
    name: 'Extension Ladder 28\'',
    equipment_type: 'Ladder',
    category: 'Fall Protection',
    make: 'Werner',
    model: 'D6228-2',
    serial_number: 'WRN2024-001',
    purchase_date: '2024-03-15',
    status: 'active',
    current_location: 'Main Warehouse',
    assigned_to: null,
    assigned_jobsite_id: null,
    inspection_frequency_days: 30,
    last_inspection_date: '2025-01-10',
    next_inspection_date: '2025-02-09',
    inspection_status: 'current',
    notes: 'CSA Type 1A rated, 300 lb capacity',
    photo_url: null,
    certifications_required: [],
    created_at: '2024-03-15T00:00:00Z',
    updated_at: '2025-01-10T00:00:00Z',
  },
  {
    id: '2',
    company_id: '1',
    equipment_code: 'EQP-002',
    name: 'Concrete Mixer 9cf',
    equipment_type: 'Concrete Equipment',
    category: 'Concrete',
    make: 'Crown',
    model: 'C90',
    serial_number: 'CRN2023-102',
    purchase_date: '2023-06-20',
    status: 'active',
    current_location: 'Jobsite A - 123 Main St',
    assigned_to: 'Mike Johnson',
    assigned_jobsite_id: 'js-1',
    inspection_frequency_days: 30,
    last_inspection_date: '2025-01-05',
    next_inspection_date: '2025-02-04',
    inspection_status: 'current',
    notes: 'Gas powered, regular oil changes required',
    photo_url: null,
    certifications_required: [],
    created_at: '2023-06-20T00:00:00Z',
    updated_at: '2025-01-05T00:00:00Z',
  },
  {
    id: '3',
    company_id: '1',
    equipment_code: 'EQP-003',
    name: 'Scissor Lift GS-2632',
    equipment_type: 'Aerial Platform',
    category: 'Elevated Work',
    make: 'Genie',
    model: 'GS-2632',
    serial_number: 'GN2022-543',
    purchase_date: '2022-09-01',
    status: 'active',
    current_location: 'Jobsite B - 456 Oak Ave',
    assigned_to: 'Sarah Williams',
    assigned_jobsite_id: 'js-2',
    inspection_frequency_days: 30,
    last_inspection_date: '2024-12-15',
    next_inspection_date: '2025-01-14',
    inspection_status: 'overdue',
    notes: 'Electric, indoor use only. Annual load test March 2025.',
    photo_url: null,
    certifications_required: ['Aerial Work Platform', 'Working at Heights'],
    created_at: '2022-09-01T00:00:00Z',
    updated_at: '2024-12-15T00:00:00Z',
  },
  {
    id: '4',
    company_id: '1',
    equipment_code: 'EQP-004',
    name: 'Power Trowel 36"',
    equipment_type: 'Concrete Equipment',
    category: 'Concrete Finishing',
    make: 'Wacker Neuson',
    model: 'CT36-5A',
    serial_number: 'WN2021-789',
    purchase_date: '2021-04-10',
    status: 'maintenance',
    current_location: 'Repair Shop',
    assigned_to: null,
    assigned_jobsite_id: null,
    inspection_frequency_days: 30,
    last_inspection_date: '2025-01-08',
    next_inspection_date: null,
    inspection_status: 'na',
    notes: 'Engine overhaul in progress. Expected back Jan 25.',
    photo_url: null,
    certifications_required: [],
    created_at: '2021-04-10T00:00:00Z',
    updated_at: '2025-01-08T00:00:00Z',
  },
  {
    id: '5',
    company_id: '1',
    equipment_code: 'EQP-005',
    name: 'Concrete Vibrator',
    equipment_type: 'Concrete Equipment',
    category: 'Concrete Consolidation',
    make: 'Minnich',
    model: 'A1-3',
    serial_number: 'MN2024-321',
    purchase_date: '2024-01-15',
    status: 'active',
    current_location: 'Main Warehouse',
    assigned_to: null,
    assigned_jobsite_id: null,
    inspection_frequency_days: 30,
    last_inspection_date: '2025-01-12',
    next_inspection_date: '2025-02-11',
    inspection_status: 'current',
    notes: 'Electric, 115V. Includes 10ft flexible shaft.',
    photo_url: null,
    certifications_required: [],
    created_at: '2024-01-15T00:00:00Z',
    updated_at: '2025-01-12T00:00:00Z',
  },
  {
    id: '6',
    company_id: '1',
    equipment_code: 'EQP-006',
    name: 'Concrete Saw 14"',
    equipment_type: 'Concrete Equipment',
    category: 'Cutting',
    make: 'Stihl',
    model: 'GS 461',
    serial_number: 'STL2023-456',
    purchase_date: '2023-08-22',
    status: 'active',
    current_location: 'Jobsite A - 123 Main St',
    assigned_to: 'Mike Johnson',
    assigned_jobsite_id: 'js-1',
    inspection_frequency_days: 14,
    last_inspection_date: '2025-01-10',
    next_inspection_date: '2025-01-24',
    inspection_status: 'due_soon',
    notes: 'Gas powered. Use with water suppression for dust control.',
    photo_url: null,
    certifications_required: [],
    created_at: '2023-08-22T00:00:00Z',
    updated_at: '2025-01-10T00:00:00Z',
  },
];

export function useEquipmentInventory() {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const fetchEquipment = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('equipment_inventory')
        .select('*')
        .order('equipment_code');

      if (fetchError) {
        // If table doesn't exist or other error, use mock data
        console.warn('Using mock equipment data:', fetchError);
        setEquipment(MOCK_EQUIPMENT);
        return;
      }

      if (data && data.length > 0) {
        setEquipment(data);
      } else {
        // Use mock data if no real data
        setEquipment(MOCK_EQUIPMENT);
      }
    } catch (err) {
      console.error('Error fetching equipment:', err);
      setEquipment(MOCK_EQUIPMENT);
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  const createEquipment = useCallback(async (equipmentData: Partial<Equipment>) => {
    try {
      // Generate equipment code
      const codePrefix = 'EQP';
      const codeNum = String(equipment.length + 1).padStart(3, '0');
      const equipment_code = `${codePrefix}-${codeNum}`;

      const newEquipment: Equipment = {
        id: Date.now().toString(),
        company_id: '1',
        equipment_code,
        name: equipmentData.name || '',
        equipment_type: equipmentData.equipment_type || '',
        category: equipmentData.category || '',
        make: equipmentData.make || null,
        model: equipmentData.model || null,
        serial_number: equipmentData.serial_number || null,
        purchase_date: equipmentData.purchase_date || null,
        status: equipmentData.status || 'active',
        current_location: equipmentData.current_location || null,
        assigned_to: null,
        assigned_jobsite_id: null,
        inspection_frequency_days: equipmentData.inspection_frequency_days || 30,
        last_inspection_date: null,
        next_inspection_date: null,
        inspection_status: 'na',
        notes: equipmentData.notes || null,
        photo_url: null,
        certifications_required: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Try to insert into database
      const { data, error: createError } = await supabase
        .from('equipment_inventory')
        .insert(newEquipment)
        .select()
        .single();

      if (createError) {
        // Add to local state if database insert fails
        setEquipment(prev => [...prev, newEquipment]);
        return newEquipment;
      }

      await fetchEquipment();
      return data;
    } catch (err) {
      console.error('Error creating equipment:', err);
      throw err;
    }
  }, [supabase, equipment.length, fetchEquipment]);

  const updateEquipment = useCallback(async (id: string, updates: Partial<Equipment>) => {
    try {
      const { data, error: updateError } = await supabase
        .from('equipment_inventory')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (updateError) {
        // Update local state
        setEquipment(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));
        return;
      }

      await fetchEquipment();
      return data;
    } catch (err) {
      console.error('Error updating equipment:', err);
      throw err;
    }
  }, [supabase, fetchEquipment]);

  const getOverdueInspections = useCallback(() => {
    return equipment.filter(e => e.inspection_status === 'overdue');
  }, [equipment]);

  const getUpcomingInspections = useCallback((days: number = 7) => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + days);
    
    return equipment.filter(e => {
      if (!e.next_inspection_date) return false;
      const inspDate = new Date(e.next_inspection_date);
      return inspDate <= cutoff && e.inspection_status !== 'overdue';
    });
  }, [equipment]);

  useEffect(() => {
    fetchEquipment();
  }, [fetchEquipment]);

  return {
    equipment,
    isLoading,
    error,
    fetchEquipment,
    createEquipment,
    updateEquipment,
    getOverdueInspections,
    getUpcomingInspections,
  };
}
