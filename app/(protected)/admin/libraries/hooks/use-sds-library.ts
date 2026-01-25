'use client';

import { useState, useEffect, useCallback } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { SDSEntry, WHMISHazardClass } from '../components/types';

// Mock data for development
const MOCK_SDS: SDSEntry[] = [
  {
    id: '1',
    company_id: '1',
    product_name: 'Concrete Accelerator Type A',
    manufacturer: 'ABC Chemicals Inc',
    product_identifier: 'CA-100',
    sds_revision_date: '2024-03-15',
    whmis_hazard_classes: ['skin_corrosion', 'serious_eye_damage'] as WHMISHazardClass[],
    hazard_statements: [
      'H314 - Causes severe skin burns and eye damage',
      'H318 - Causes serious eye damage',
    ],
    precautionary_statements: [
      'P260 - Do not breathe mist/vapours',
      'P280 - Wear protective gloves/eye protection',
      'P303+P361+P353 - IF ON SKIN: Rinse immediately with plenty of water',
    ],
    first_aid_measures: {
      'Inhalation': 'Move to fresh air. Seek medical attention if symptoms persist.',
      'Skin Contact': 'Immediately flush with plenty of water for at least 20 minutes.',
      'Eye Contact': 'Rinse cautiously with water for several minutes. Seek immediate medical attention.',
      'Ingestion': 'Do NOT induce vomiting. Rinse mouth. Seek immediate medical attention.',
    },
    ppe_required: ['Chemical-Resistant Gloves', 'Safety Goggles', 'Face Shield', 'Coveralls'],
    storage_requirements: 'Store in cool, dry place. Keep container tightly closed.',
    disposal_requirements: 'Dispose in accordance with local regulations.',
    emergency_phone: '1-800-424-9300 (CHEMTREC)',
    sds_file_url: '/sds/concrete-accelerator-a.pdf',
    locations: ['Main Warehouse', 'Jobsite A'],
    review_date: '2027-03-15',
    is_current: true,
    created_at: '2024-03-15T00:00:00Z',
    updated_at: '2024-03-15T00:00:00Z',
  },
  {
    id: '2',
    company_id: '1',
    product_name: 'Form Release Agent Oil-Based',
    manufacturer: 'XYZ Products Ltd',
    product_identifier: 'FRA-200',
    sds_revision_date: '2023-01-20',
    whmis_hazard_classes: ['flammable_liquids'] as WHMISHazardClass[],
    hazard_statements: [
      'H226 - Flammable liquid and vapour',
    ],
    precautionary_statements: [
      'P210 - Keep away from heat/sparks/open flames',
      'P233 - Keep container tightly closed',
      'P240 - Ground container and receiving equipment',
    ],
    first_aid_measures: {
      'Inhalation': 'Move to fresh air. If symptoms persist, seek medical attention.',
      'Skin Contact': 'Wash with soap and water.',
      'Eye Contact': 'Rinse with water for 15 minutes.',
      'Ingestion': 'Do not induce vomiting. Seek medical attention.',
    },
    ppe_required: ['Safety Glasses', 'Chemical-Resistant Gloves'],
    storage_requirements: 'Store in flammable liquids cabinet away from ignition sources.',
    disposal_requirements: 'Dispose as hazardous waste per local regulations.',
    emergency_phone: '1-800-424-9300 (CHEMTREC)',
    sds_file_url: '/sds/form-release-agent.pdf',
    locations: ['Main Warehouse'],
    review_date: '2026-01-20',
    is_current: true,
    created_at: '2023-01-20T00:00:00Z',
    updated_at: '2023-01-20T00:00:00Z',
  },
  {
    id: '3',
    company_id: '1',
    product_name: 'Concrete Curing Compound',
    manufacturer: 'BuildChem Corp',
    product_identifier: 'CCC-300',
    sds_revision_date: '2024-08-10',
    whmis_hazard_classes: ['flammable_liquids', 'skin_sensitization'] as WHMISHazardClass[],
    hazard_statements: [
      'H226 - Flammable liquid and vapour',
      'H317 - May cause an allergic skin reaction',
    ],
    precautionary_statements: [
      'P210 - Keep away from heat/sparks/open flames',
      'P261 - Avoid breathing mist/vapours',
      'P280 - Wear protective gloves',
    ],
    first_aid_measures: {
      'Skin Contact': 'Wash thoroughly with soap and water.',
      'Eye Contact': 'Rinse with water for 15 minutes.',
    },
    ppe_required: ['N95 Respirator', 'Chemical-Resistant Gloves', 'Safety Glasses'],
    storage_requirements: 'Store in cool, well-ventilated area.',
    disposal_requirements: 'Dispose in accordance with local regulations.',
    emergency_phone: '1-800-535-5053',
    sds_file_url: '/sds/curing-compound.pdf',
    locations: ['Main Warehouse', 'Jobsite A', 'Jobsite B'],
    review_date: '2027-08-10',
    is_current: true,
    created_at: '2024-08-10T00:00:00Z',
    updated_at: '2024-08-10T00:00:00Z',
  },
  {
    id: '4',
    company_id: '1',
    product_name: 'Portland Cement Type 10',
    manufacturer: 'Lafarge Canada',
    product_identifier: 'PC-10',
    sds_revision_date: '2021-06-01',
    whmis_hazard_classes: ['skin_corrosion', 'serious_eye_damage', 'respiratory_sensitization', 'carcinogenicity'] as WHMISHazardClass[],
    hazard_statements: [
      'H315 - Causes skin irritation',
      'H317 - May cause an allergic skin reaction',
      'H318 - Causes serious eye damage',
      'H335 - May cause respiratory irritation',
      'H350i - May cause cancer by inhalation (crystalline silica)',
    ],
    precautionary_statements: [
      'P260 - Do not breathe dust',
      'P280 - Wear protective gloves/eye protection/respiratory protection',
      'P302+P352 - IF ON SKIN: Wash with plenty of water',
    ],
    first_aid_measures: {
      'Inhalation': 'Move to fresh air. Seek medical attention.',
      'Skin Contact': 'Immediately flush with water for at least 20 minutes.',
      'Eye Contact': 'Rinse with water for at least 20 minutes. Seek immediate medical attention.',
      'Ingestion': 'Do not induce vomiting. Rinse mouth. Seek medical attention.',
    },
    ppe_required: ['N100 Respirator', 'Chemical-Resistant Gloves', 'Safety Goggles', 'Coveralls'],
    storage_requirements: 'Store in dry area. Protect from moisture.',
    disposal_requirements: 'May be disposed as regular construction waste when hardened.',
    emergency_phone: '1-800-424-9300 (CHEMTREC)',
    sds_file_url: '/sds/portland-cement.pdf',
    locations: ['Main Warehouse', 'All Jobsites'],
    review_date: '2024-06-01',
    is_current: false,
    created_at: '2021-06-01T00:00:00Z',
    updated_at: '2021-06-01T00:00:00Z',
  },
  {
    id: '5',
    company_id: '1',
    product_name: 'Diesel Fuel',
    manufacturer: 'Petro-Canada',
    product_identifier: 'DF-ULSD',
    sds_revision_date: '2024-01-15',
    whmis_hazard_classes: ['flammable_liquids', 'acute_toxicity', 'carcinogenicity', 'aquatic_toxicity'] as WHMISHazardClass[],
    hazard_statements: [
      'H226 - Flammable liquid and vapour',
      'H304 - May be fatal if swallowed and enters airways',
      'H315 - Causes skin irritation',
      'H332 - Harmful if inhaled',
      'H351 - Suspected of causing cancer',
      'H411 - Toxic to aquatic life with long lasting effects',
    ],
    precautionary_statements: [
      'P210 - Keep away from heat/sparks/open flames',
      'P261 - Avoid breathing vapours',
      'P273 - Avoid release to the environment',
      'P280 - Wear protective gloves',
    ],
    first_aid_measures: {
      'Inhalation': 'Move to fresh air immediately.',
      'Skin Contact': 'Wash with soap and water.',
      'Eye Contact': 'Rinse with water for 15 minutes.',
      'Ingestion': 'Do NOT induce vomiting. Seek immediate medical attention.',
    },
    ppe_required: ['Safety Glasses', 'Chemical-Resistant Gloves', 'Coveralls'],
    storage_requirements: 'Store in approved containers away from heat sources.',
    disposal_requirements: 'Dispose as hazardous waste.',
    emergency_phone: '1-800-567-1234',
    sds_file_url: '/sds/diesel-fuel.pdf',
    locations: ['Fuel Storage Area'],
    review_date: '2027-01-15',
    is_current: true,
    created_at: '2024-01-15T00:00:00Z',
    updated_at: '2024-01-15T00:00:00Z',
  },
];

export function useSDSLibrary() {
  const [sdsEntries, setSdsEntries] = useState<SDSEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const fetchSDS = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('sds_library')
        .select('*')
        .order('product_name');

      if (fetchError) {
        console.warn('Using mock SDS data:', fetchError);
        setSdsEntries(MOCK_SDS);
        return;
      }

      if (data && data.length > 0) {
        setSdsEntries(data);
      } else {
        setSdsEntries(MOCK_SDS);
      }
    } catch (err) {
      console.error('Error fetching SDS:', err);
      setSdsEntries(MOCK_SDS);
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  const createSDS = useCallback(async (sdsData: Partial<SDSEntry>) => {
    try {
      const { data, error: createError } = await supabase
        .from('sds_library')
        .insert({
          ...sdsData,
          is_current: true,
        })
        .select()
        .single();

      if (createError) {
        throw createError;
      }

      await fetchSDS();
      return data;
    } catch (err) {
      console.error('Error creating SDS:', err);
      throw err;
    }
  }, [supabase, fetchSDS]);

  useEffect(() => {
    fetchSDS();
  }, [fetchSDS]);

  return {
    sdsEntries,
    isLoading,
    error,
    fetchSDS,
    createSDS,
  };
}
