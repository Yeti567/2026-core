'use client';

import { useState, useEffect, useCallback } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { Task, TaskHazardMapping, RiskLevel } from '../components/types';

// Mock data for development
const MOCK_TASKS: Task[] = [
  {
    id: '1',
    company_id: null,
    task_code: 'CONC-001',
    name: 'Pour Concrete Foundation',
    description: 'Place and consolidate concrete for foundation walls and footings. Includes setup, placement, vibration, and initial finishing.',
    category: 'Concrete',
    trade: 'Concrete',
    typical_duration_hours: 6,
    crew_size_min: 4,
    crew_size_max: 6,
    procedure_steps: [
      'Verify formwork inspection complete and approved',
      'Confirm rebar placement and spacing per drawings',
      'Position concrete pump/chute for placement',
      'Begin pour at far end, work toward access point',
      'Vibrate concrete to eliminate voids',
      'Strike off and level concrete',
      'Apply initial floating as concrete sets',
      'Install curing blankets or compound',
    ],
    hazards: [
      { hazard_id: '1', hazard_name: 'Concrete Burns (Alkaline)', risk_level: 'high' },
      { hazard_id: '2', hazard_name: 'Silica Dust', risk_level: 'critical' },
      { hazard_id: '3', hazard_name: 'Manual Material Handling', risk_level: 'high' },
      { hazard_id: '4', hazard_name: 'Slips/Trips (Wet Concrete)', risk_level: 'medium' },
      { hazard_id: '5', hazard_name: 'Struck by Pump Hose', risk_level: 'medium' },
      { hazard_id: '6', hazard_name: 'Falls from Forms', risk_level: 'high' },
      { hazard_id: '7', hazard_name: 'Electrical (Vibrator)', risk_level: 'medium' },
      { hazard_id: '8', hazard_name: 'Noise Exposure', risk_level: 'medium' },
    ],
    required_equipment: ['Concrete Pump', 'Concrete Vibrator', 'Bull Float', 'Screed', 'Hand Tools'],
    required_certifications: [],
    ppe_required: ['Rubber Boots', 'Rubber/Neoprene Gloves', 'Safety Glasses', 'Hard Hat', 'N95 Respirator'],
    is_active: true,
    is_global: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: '2',
    company_id: null,
    task_code: 'CONC-002',
    name: 'Place & Tie Rebar',
    description: 'Install reinforcing steel bars according to structural drawings, including cutting, bending, and tying.',
    category: 'Concrete',
    trade: 'Rebar',
    typical_duration_hours: 4,
    crew_size_min: 2,
    crew_size_max: 4,
    procedure_steps: [
      'Review structural drawings for rebar schedule',
      'Cut rebar to required lengths',
      'Position rebar per drawings with correct spacing',
      'Tie intersections with wire ties',
      'Install chairs/supports for proper cover',
      'Cap exposed vertical bars',
      'Verify placement before concrete pour',
    ],
    hazards: [
      { hazard_id: '10', hazard_name: 'Rebar Impalement', risk_level: 'critical' },
      { hazard_id: '11', hazard_name: 'Cuts from Rebar/Wire', risk_level: 'high' },
      { hazard_id: '12', hazard_name: 'Manual Handling', risk_level: 'high' },
      { hazard_id: '13', hazard_name: 'Repetitive Motion (Tying)', risk_level: 'medium' },
      { hazard_id: '14', hazard_name: 'Falls (Working on Rebar)', risk_level: 'high' },
    ],
    required_equipment: ['Rebar Cutter', 'Rebar Bender', 'Wire Ties', 'Tie Wire Tool'],
    required_certifications: [],
    ppe_required: ['Cut-Resistant Gloves', 'Safety Glasses', 'Hard Hat', 'Safety Boots', 'Knee Pads'],
    is_active: true,
    is_global: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: '3',
    company_id: null,
    task_code: 'CONC-003',
    name: 'Erect Wall Forms',
    description: 'Set up formwork for concrete walls including bracing, alignment, and tie installation.',
    category: 'Concrete',
    trade: 'Formwork',
    typical_duration_hours: 8,
    crew_size_min: 4,
    crew_size_max: 6,
    procedure_steps: [
      'Review form drawings and layout',
      'Apply release agent to form surfaces',
      'Position and plumb first panel',
      'Continue setting panels with proper alignment',
      'Install form ties at specified intervals',
      'Install walers and bracing',
      'Check plumb and alignment',
      'Final inspection before pour',
    ],
    hazards: [
      { hazard_id: '20', hazard_name: 'Heavy Form Panels', risk_level: 'high' },
      { hazard_id: '21', hazard_name: 'Falls from Forms', risk_level: 'high' },
      { hazard_id: '22', hazard_name: 'Struck by Falling Forms', risk_level: 'high' },
      { hazard_id: '23', hazard_name: 'Pinch Points', risk_level: 'medium' },
      { hazard_id: '24', hazard_name: 'Form Oil Skin Irritation', risk_level: 'low' },
    ],
    required_equipment: ['Forms', 'Form Ties', 'Walers', 'Braces', 'Hand Tools', 'Crane (for gang forms)'],
    required_certifications: ['Working at Heights'],
    ppe_required: ['Hard Hat', 'Safety Glasses', 'Safety Gloves', 'Safety Boots', 'Full Body Harness'],
    is_active: true,
    is_global: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: '4',
    company_id: null,
    task_code: 'CONC-004',
    name: 'Cut Concrete with Saw',
    description: 'Cut concrete slabs, walls, or pavements using power saws. Includes control joints and demolition cuts.',
    category: 'Concrete',
    trade: 'Concrete',
    typical_duration_hours: 3,
    crew_size_min: 2,
    crew_size_max: 2,
    procedure_steps: [
      'Mark cut lines',
      'Set up water supply for wet cutting',
      'Verify blade is correct for material',
      'Begin cut at marked starting point',
      'Maintain steady pace and blade depth',
      'Clean and dispose of slurry properly',
    ],
    hazards: [
      { hazard_id: '30', hazard_name: 'Silica Dust', risk_level: 'critical' },
      { hazard_id: '31', hazard_name: 'Saw Kickback', risk_level: 'high' },
      { hazard_id: '32', hazard_name: 'Flying Debris', risk_level: 'high' },
      { hazard_id: '33', hazard_name: 'Noise Exposure', risk_level: 'high' },
      { hazard_id: '34', hazard_name: 'Vibration', risk_level: 'medium' },
    ],
    required_equipment: ['Concrete Saw', 'Diamond Blade', 'Water Tank', 'Chalk Line'],
    required_certifications: [],
    ppe_required: ['N100 Respirator', 'Safety Glasses', 'Face Shield', 'Hearing Protection', 'Safety Boots', 'Leg Chaps'],
    is_active: true,
    is_global: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: '5',
    company_id: null,
    task_code: 'FALL-001',
    name: 'Install Fall Protection Anchors',
    description: 'Install temporary or permanent fall protection anchor points for personal fall arrest systems.',
    category: 'Fall Protection',
    trade: 'General Construction',
    typical_duration_hours: 2,
    crew_size_min: 2,
    crew_size_max: 3,
    procedure_steps: [
      'Review anchor point requirements',
      'Identify suitable structural attachment',
      'Verify structural capacity for anchor load',
      'Install anchor per manufacturer specs',
      'Test anchor (if required)',
      'Tag anchor with load rating and date',
    ],
    hazards: [
      { hazard_id: '40', hazard_name: 'Falls (During Installation)', risk_level: 'critical' },
      { hazard_id: '41', hazard_name: 'Struck by Tools', risk_level: 'medium' },
    ],
    required_equipment: ['Anchors', 'Drill', 'Torque Wrench', 'Testing Equipment'],
    required_certifications: ['Working at Heights', 'Fall Protection Competent Person'],
    ppe_required: ['Full Body Harness', 'Hard Hat', 'Safety Glasses', 'Safety Boots'],
    is_active: true,
    is_global: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: '6',
    company_id: null,
    task_code: 'EXCAV-001',
    name: 'Excavate Trench',
    description: 'Dig trenches for utilities, foundations, or drainage using excavation equipment.',
    category: 'Excavation',
    trade: 'Excavation',
    typical_duration_hours: 4,
    crew_size_min: 2,
    crew_size_max: 4,
    procedure_steps: [
      'Obtain utility locates and review',
      'Mark excavation boundaries',
      'Set up traffic control if needed',
      'Begin excavation at specified depth',
      'Install shoring/sloping as depth increases',
      'Hand dig near utilities',
      'Keep spoil 1m back from edge',
      'Provide ladder access every 8m',
    ],
    hazards: [
      { hazard_id: '50', hazard_name: 'Trench Cave-In', risk_level: 'critical' },
      { hazard_id: '51', hazard_name: 'Struck by Equipment', risk_level: 'high' },
      { hazard_id: '52', hazard_name: 'Underground Utilities', risk_level: 'critical' },
      { hazard_id: '53', hazard_name: 'Falls into Excavation', risk_level: 'high' },
    ],
    required_equipment: ['Excavator', 'Trench Box', 'Ladder', 'Barricades'],
    required_certifications: ['Excavator Operator', 'Trenching Safety'],
    ppe_required: ['Hard Hat', 'Hi-Vis Vest', 'Safety Boots', 'Safety Glasses'],
    is_active: true,
    is_global: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
];

export function useTaskLibrary() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const fetchTasks = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('job_task_library')
        .select('*')
        .eq('is_active', true)
        .order('category')
        .order('name');

      if (fetchError) {
        console.warn('Using mock task data:', fetchError);
        setTasks(MOCK_TASKS);
        return;
      }

      if (data && data.length > 0) {
        // Transform database format to component format
        const transformedTasks = data.map(t => ({
          ...t,
          hazards: (t.typical_hazards || []).map((h: any) => ({
            hazard_id: h.hazard_id || '',
            hazard_name: h.name || h.hazard_name || '',
            risk_level: (h.risk_level || 'medium') as RiskLevel,
          })),
          procedure_steps: t.procedure_steps || [],
          required_equipment: t.required_equipment || [],
          required_certifications: t.required_certifications || [],
          ppe_required: t.ppe_required || [],
        }));
        setTasks(transformedTasks);
      } else {
        setTasks(MOCK_TASKS);
      }
    } catch (err) {
      console.error('Error fetching tasks:', err);
      setTasks(MOCK_TASKS);
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  const createTask = useCallback(async (taskData: Partial<Task>) => {
    try {
      const { data, error: createError } = await supabase
        .from('job_task_library')
        .insert({
          ...taskData,
          is_active: true,
        })
        .select()
        .single();

      if (createError) {
        throw createError;
      }

      await fetchTasks();
      return data;
    } catch (err) {
      console.error('Error creating task:', err);
      throw err;
    }
  }, [supabase, fetchTasks]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  return {
    tasks,
    isLoading,
    error,
    fetchTasks,
    createTask,
  };
}
