'use client';

import { useState, useEffect, useCallback } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { Jobsite } from '../components/types';

// Mock data for development
const MOCK_JOBSITES: Jobsite[] = [
  {
    id: '1',
    company_id: '1',
    jobsite_code: 'JS-2025-001',
    name: '123 Main St Condos',
    address: '123 Main Street',
    city: 'Ottawa',
    province: 'ON',
    postal_code: 'K1A 0B1',
    latitude: 45.4215,
    longitude: -75.6972,
    client_name: 'ABC Development Corp',
    project_value: 2500000,
    start_date: '2025-01-02',
    expected_end_date: '2025-06-30',
    actual_end_date: null,
    status: 'active',
    supervisor_id: '1',
    supervisor_name: 'Mark Lim',
    emergency_contacts: [
      { name: 'Mark Lim', role: 'Site Supervisor', phone: '613-555-0101' },
      { name: 'Jane Smith', role: 'Safety Officer', phone: '613-555-0102' },
    ],
    site_specific_hazards: ['Overhead powerlines', 'Adjacent traffic', 'Confined spaces'],
    nearest_hospital: 'Ottawa General Hospital - 15 min',
    emergency_assembly_point: 'Southwest corner parking lot',
    access_instructions: 'Enter via west gate. Sign in at site office trailer.',
    worker_count: 8,
    equipment_count: 12,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-17T00:00:00Z',
  },
  {
    id: '2',
    company_id: '1',
    jobsite_code: 'JS-2025-002',
    name: '456 Oak Ave Commercial',
    address: '456 Oak Avenue',
    city: 'Kanata',
    province: 'ON',
    postal_code: 'K2K 1X3',
    latitude: 45.3088,
    longitude: -75.8986,
    client_name: 'XYZ Retail Inc',
    project_value: 1800000,
    start_date: '2025-01-10',
    expected_end_date: '2025-05-15',
    actual_end_date: null,
    status: 'active',
    supervisor_id: '2',
    supervisor_name: 'Sarah Williams',
    emergency_contacts: [
      { name: 'Sarah Williams', role: 'Site Supervisor', phone: '613-555-0201' },
    ],
    site_specific_hazards: ['Excavation near utilities', 'Public access area'],
    nearest_hospital: 'Queensway Carleton Hospital - 10 min',
    emergency_assembly_point: 'North side of parking structure',
    access_instructions: 'Park in designated contractor area. Hard hats required past gate.',
    worker_count: 6,
    equipment_count: 8,
    created_at: '2025-01-05T00:00:00Z',
    updated_at: '2025-01-15T00:00:00Z',
  },
  {
    id: '3',
    company_id: '1',
    jobsite_code: 'JS-2024-015',
    name: 'Riverside Foundation Repair',
    address: '789 Riverside Drive',
    city: 'Ottawa',
    province: 'ON',
    postal_code: 'K1S 2T5',
    latitude: 45.3948,
    longitude: -75.6862,
    client_name: 'City of Ottawa',
    project_value: 450000,
    start_date: '2024-11-01',
    expected_end_date: '2025-02-28',
    actual_end_date: null,
    status: 'active',
    supervisor_id: '3',
    supervisor_name: 'Tom Chen',
    emergency_contacts: [
      { name: 'Tom Chen', role: 'Site Supervisor', phone: '613-555-0301' },
    ],
    site_specific_hazards: ['Waterfront hazard', 'Structural instability', 'Limited access'],
    nearest_hospital: 'Riverside Hospital - 5 min',
    emergency_assembly_point: 'Upper parking lot near street',
    access_instructions: 'Access via service road only. Check in with City inspector.',
    worker_count: 4,
    equipment_count: 5,
    created_at: '2024-10-15T00:00:00Z',
    updated_at: '2025-01-10T00:00:00Z',
  },
  {
    id: '4',
    company_id: '1',
    jobsite_code: 'JS-2025-003',
    name: 'Industrial Park Expansion',
    address: '1000 Industrial Way',
    city: 'Nepean',
    province: 'ON',
    postal_code: 'K2E 7V7',
    latitude: 45.3341,
    longitude: -75.7256,
    client_name: 'Industrial Developments Ltd',
    project_value: 5000000,
    start_date: '2025-02-15',
    expected_end_date: '2025-12-31',
    actual_end_date: null,
    status: 'planning',
    supervisor_id: null,
    supervisor_name: null,
    emergency_contacts: [],
    site_specific_hazards: [],
    nearest_hospital: 'CHEO - 20 min',
    emergency_assembly_point: 'TBD',
    access_instructions: null,
    worker_count: 0,
    equipment_count: 0,
    created_at: '2025-01-10T00:00:00Z',
    updated_at: '2025-01-10T00:00:00Z',
  },
  {
    id: '5',
    company_id: '1',
    jobsite_code: 'JS-2024-010',
    name: 'Wellington St Office Reno',
    address: '500 Wellington Street',
    city: 'Ottawa',
    province: 'ON',
    postal_code: 'K1A 0A1',
    latitude: 45.4236,
    longitude: -75.7009,
    client_name: 'Federal Properties Inc',
    project_value: 350000,
    start_date: '2024-09-01',
    expected_end_date: '2024-12-20',
    actual_end_date: '2024-12-18',
    status: 'completed',
    supervisor_id: '1',
    supervisor_name: 'Mark Lim',
    emergency_contacts: [
      { name: 'Mark Lim', role: 'Site Supervisor', phone: '613-555-0101' },
    ],
    site_specific_hazards: ['Occupied building', 'Heritage structure'],
    nearest_hospital: 'Ottawa General Hospital - 10 min',
    emergency_assembly_point: 'Sparks Street pedestrian area',
    access_instructions: 'Access via loading dock. Security escort required.',
    worker_count: 0,
    equipment_count: 0,
    created_at: '2024-08-15T00:00:00Z',
    updated_at: '2024-12-20T00:00:00Z',
  },
];

export function useJobsiteRegistry() {
  const [jobsites, setJobsites] = useState<Jobsite[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const fetchJobsites = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('jobsites')
        .select('*')
        .order('status')
        .order('start_date', { ascending: false });

      if (fetchError) {
        console.warn('Using mock jobsite data:', fetchError);
        setJobsites(MOCK_JOBSITES);
        return;
      }

      if (data && data.length > 0) {
        setJobsites(data);
      } else {
        setJobsites(MOCK_JOBSITES);
      }
    } catch (err) {
      console.error('Error fetching jobsites:', err);
      setJobsites(MOCK_JOBSITES);
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  const createJobsite = useCallback(async (jobsiteData: Partial<Jobsite>) => {
    try {
      const { data, error: createError } = await supabase
        .from('jobsites')
        .insert({
          ...jobsiteData,
          status: 'planning',
        })
        .select()
        .single();

      if (createError) {
        throw createError;
      }

      await fetchJobsites();
      return data;
    } catch (err) {
      console.error('Error creating jobsite:', err);
      throw err;
    }
  }, [supabase, fetchJobsites]);

  useEffect(() => {
    fetchJobsites();
  }, [fetchJobsites]);

  return {
    jobsites,
    isLoading,
    error,
    fetchJobsites,
    createJobsite,
  };
}
