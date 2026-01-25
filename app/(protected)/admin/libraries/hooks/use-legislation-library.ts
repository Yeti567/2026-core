'use client';

import { useState, useEffect, useCallback } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { Legislation, LegislationSection } from '../components/types';

interface QuickReference {
  title: string;
  description: string;
  regulation: string;
  section: string;
  url?: string;
}

// Mock data for development
const MOCK_LEGISLATION: Legislation[] = [
  {
    id: '1',
    short_name: 'OHSA',
    full_name: 'Occupational Health and Safety Act',
    jurisdiction: 'Ontario',
    effective_date: '1990-01-01',
    last_amended: '2024-09-01',
    description: 'The primary occupational health and safety legislation in Ontario, establishing the rights and duties of all parties in the workplace.',
    url: 'https://www.ontario.ca/laws/statute/90o01',
    sections: [
      { id: '1', section_number: 's.25', title: 'Duties of Employers', summary: 'Employers shall ensure equipment, materials and protective devices are provided and maintained in good condition. Ensure measures and procedures prescribed are carried out.', full_text: null, is_bookmarked: true },
      { id: '2', section_number: 's.26', title: 'Additional Duties of Employers - Construction', summary: 'Additional duties specific to construction projects including provision of proper facilities and ensuring safety of workers.', full_text: null, is_bookmarked: false },
      { id: '3', section_number: 's.27', title: 'Duties of Supervisors', summary: 'Supervisors shall ensure workers work in a safe manner and use required equipment. Take every precaution reasonable for protection of workers.', full_text: null, is_bookmarked: true },
      { id: '4', section_number: 's.28', title: 'Duties of Workers', summary: 'Workers shall work in compliance with the Act and regulations, use equipment as required, and report hazards to employer or supervisor.', full_text: null, is_bookmarked: true },
      { id: '5', section_number: 's.43', title: 'Right to Refuse Unsafe Work', summary: 'A worker may refuse to work where they have reason to believe equipment is likely to endanger themselves or another worker.', full_text: null, is_bookmarked: true },
    ],
  },
  {
    id: '2',
    short_name: 'O. Reg. 213/91',
    full_name: 'Construction Projects Regulation',
    jurisdiction: 'Ontario',
    effective_date: '1991-10-01',
    last_amended: '2024-07-01',
    description: 'Regulations for construction projects under OHSA. Covers protective equipment, scaffolds, excavations, confined spaces, and more.',
    url: 'https://www.ontario.ca/laws/regulation/910213',
    sections: [
      { id: '10', section_number: 's.26', title: 'Fall Protection', summary: 'Workers shall be protected from falling where working at heights of 3m or more, near open edges, openings, or where there is a risk of falling.', full_text: null, is_bookmarked: true },
      { id: '11', section_number: 's.26.1', title: 'Working at Heights Training', summary: 'Workers shall complete a working at heights training program that meets specified requirements before working at heights.', full_text: null, is_bookmarked: true },
      { id: '12', section_number: 's.67', title: 'Signallers', summary: 'A signaller shall be stationed to warn the operator and other workers when a vehicle is about to be backed up.', full_text: null, is_bookmarked: false },
      { id: '13', section_number: 's.78-84', title: 'Ladders', summary: 'Requirements for ladders including proper setup, condition, securing, and use on construction projects.', full_text: null, is_bookmarked: false },
      { id: '14', section_number: 's.85-102', title: 'Formwork and Falsework', summary: 'Requirements for design, construction, and inspection of formwork and falsework. Engineered drawings required for certain heights.', full_text: null, is_bookmarked: true },
      { id: '15', section_number: 's.125-142', title: 'Scaffolds', summary: 'Requirements for scaffold construction, inspection, and use. Includes guardrails, load limits, and competent supervision.', full_text: null, is_bookmarked: false },
      { id: '16', section_number: 's.150-176', title: 'Cranes and Similar Devices', summary: 'Requirements for cranes, hoisting devices, and lifting operations. Includes operator qualifications and inspection requirements.', full_text: null, is_bookmarked: false },
      { id: '17', section_number: 's.181-195', title: 'Electrical Hazards', summary: 'Protection from electrical hazards including clearances from overhead and underground lines, and electrical safety.', full_text: null, is_bookmarked: true },
      { id: '18', section_number: 's.222-242', title: 'Excavations', summary: 'Requirements for excavations including soil classification, shoring, support systems, and worker protection from cave-ins.', full_text: null, is_bookmarked: true },
    ],
  },
  {
    id: '3',
    short_name: 'O. Reg. 851',
    full_name: 'Industrial Establishments Regulation',
    jurisdiction: 'Ontario',
    effective_date: '1990-01-01',
    last_amended: '2023-06-01',
    description: 'Regulations for industrial establishments covering machine guarding, materials handling, and workplace conditions.',
    url: 'https://www.ontario.ca/laws/regulation/900851',
    sections: [
      { id: '20', section_number: 's.24-42', title: 'Machine Guarding', summary: 'Requirements for guarding moving parts, point of operation, and in-running nip points on machinery.', full_text: null, is_bookmarked: false },
      { id: '21', section_number: 's.45-56', title: 'Materials Handling', summary: 'Requirements for safe storage and handling of materials.', full_text: null, is_bookmarked: false },
    ],
  },
  {
    id: '4',
    short_name: 'O. Reg. 490/09',
    full_name: 'Designated Substances Regulation',
    jurisdiction: 'Ontario',
    effective_date: '2009-01-01',
    last_amended: '2023-01-01',
    description: 'Regulations for designated substances including asbestos, silica, lead, and other hazardous materials.',
    url: 'https://www.ontario.ca/laws/regulation/090490',
    sections: [
      { id: '30', section_number: 's.4', title: 'Silica', summary: 'Exposure limits and control requirements for respirable crystalline silica.', full_text: null, is_bookmarked: true },
      { id: '31', section_number: 's.6', title: 'Lead', summary: 'Exposure limits and control requirements for lead.', full_text: null, is_bookmarked: false },
      { id: '32', section_number: 's.7', title: 'Isocyanates', summary: 'Exposure limits and control requirements for isocyanates.', full_text: null, is_bookmarked: false },
    ],
  },
  {
    id: '5',
    short_name: 'O. Reg. 278/05',
    full_name: 'Asbestos on Construction Projects and in Buildings and Repair Operations',
    jurisdiction: 'Ontario',
    effective_date: '2005-01-01',
    last_amended: '2022-07-01',
    description: 'Requirements for handling asbestos in construction, renovation, and demolition projects.',
    url: 'https://www.ontario.ca/laws/regulation/050278',
    sections: [
      { id: '40', section_number: 's.3-5', title: 'Type 1 Operations', summary: 'Low-risk asbestos operations with basic controls.', full_text: null, is_bookmarked: false },
      { id: '41', section_number: 's.6-9', title: 'Type 2 Operations', summary: 'Moderate-risk asbestos operations with additional controls.', full_text: null, is_bookmarked: false },
      { id: '42', section_number: 's.10-17', title: 'Type 3 Operations', summary: 'High-risk asbestos operations requiring licensed contractors and full containment.', full_text: null, is_bookmarked: true },
    ],
  },
];

const MOCK_QUICK_REFERENCES: QuickReference[] = [
  {
    title: 'Fall Protection Requirements',
    description: 'When fall protection is required and what methods are acceptable',
    regulation: 'O. Reg. 213/91',
    section: 's.26',
  },
  {
    title: 'Duties of Employers',
    description: 'Primary duties employers must fulfill under OHSA',
    regulation: 'OHSA',
    section: 's.25',
  },
  {
    title: 'Right to Refuse',
    description: 'Worker\'s right to refuse unsafe work',
    regulation: 'OHSA',
    section: 's.43',
  },
  {
    title: 'Excavation Safety',
    description: 'Requirements for trenches and excavations',
    regulation: 'O. Reg. 213/91',
    section: 's.222-242',
  },
  {
    title: 'Silica Exposure',
    description: 'Control requirements for crystalline silica',
    regulation: 'O. Reg. 490/09',
    section: 's.4',
  },
  {
    title: 'Working at Heights Training',
    description: 'Mandatory training requirements for height work',
    regulation: 'O. Reg. 213/91',
    section: 's.26.1',
  },
  {
    title: 'Scaffold Requirements',
    description: 'Construction and inspection of scaffolds',
    regulation: 'O. Reg. 213/91',
    section: 's.125-142',
  },
  {
    title: 'Electrical Clearances',
    description: 'Minimum distances from overhead powerlines',
    regulation: 'O. Reg. 213/91',
    section: 's.188-189',
  },
  {
    title: 'Formwork Engineering',
    description: 'When engineered formwork drawings are required',
    regulation: 'O. Reg. 213/91',
    section: 's.85-102',
  },
];

export function useLegislationLibrary() {
  const [legislation, setLegislation] = useState<Legislation[]>([]);
  const [quickReferences, setQuickReferences] = useState<QuickReference[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const fetchLegislation = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Try to fetch from database
      const { data: legData, error: legError } = await supabase
        .from('legislation_library')
        .select(`
          *,
          sections:legislation_sections(*)
        `)
        .order('short_name');

      if (legError) {
        console.warn('Using mock legislation data:', legError);
        setLegislation(MOCK_LEGISLATION);
        setQuickReferences(MOCK_QUICK_REFERENCES);
        return;
      }

      if (legData && legData.length > 0) {
        setLegislation(legData);
        
        // Fetch quick references
        const { data: qrData } = await supabase
          .from('legislative_quick_references')
          .select('*')
          .order('title');
        
        if (qrData && qrData.length > 0) {
          setQuickReferences(qrData);
        } else {
          setQuickReferences(MOCK_QUICK_REFERENCES);
        }
      } else {
        setLegislation(MOCK_LEGISLATION);
        setQuickReferences(MOCK_QUICK_REFERENCES);
      }
    } catch (err) {
      console.error('Error fetching legislation:', err);
      setLegislation(MOCK_LEGISLATION);
      setQuickReferences(MOCK_QUICK_REFERENCES);
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  const searchLegislation = useCallback(async (searchTerm: string) => {
    try {
      const { data, error: searchError } = await supabase
        .rpc('search_legislation', { search_term: searchTerm });

      if (searchError) {
        throw searchError;
      }

      return data;
    } catch (err) {
      console.error('Error searching legislation:', err);
      // Fall back to local search
      const searchLower = searchTerm.toLowerCase();
      return legislation.filter(l => 
        l.short_name.toLowerCase().includes(searchLower) ||
        l.full_name.toLowerCase().includes(searchLower) ||
        l.sections.some(s => 
          s.section_number.toLowerCase().includes(searchLower) ||
          s.title.toLowerCase().includes(searchLower)
        )
      );
    }
  }, [supabase, legislation]);

  const bookmarkSection = useCallback(async (sectionId: string, bookmarked: boolean) => {
    try {
      const { error: updateError } = await supabase
        .from('legislation_sections')
        .update({ is_bookmarked: bookmarked })
        .eq('id', sectionId);

      if (updateError) {
        throw updateError;
      }

      await fetchLegislation();
    } catch (err) {
      console.error('Error updating bookmark:', err);
    }
  }, [supabase, fetchLegislation]);

  useEffect(() => {
    fetchLegislation();
  }, [fetchLegislation]);

  return {
    legislation,
    quickReferences,
    isLoading,
    error,
    fetchLegislation,
    searchLegislation,
    bookmarkSection,
  };
}
