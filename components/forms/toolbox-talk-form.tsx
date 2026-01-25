'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import {
  submitForm,
  saveDraft,
  loadDraft,
  deleteDraft,
  createAutoSave,
  type BaseFormData,
} from '@/lib/sync/form-submission';
import PhotoCapture, { type CapturedPhoto } from '@/components/ui/photo-capture';
import SignaturePad from '@/components/ui/signature-pad';

// =============================================================================
// CONSTANTS
// =============================================================================

const FORM_TYPE = 'toolbox_talk';
const AUTO_SAVE_INTERVAL = 30000;

const TOOLBOX_TOPICS = [
  { value: 'working_at_heights', label: 'Working at Heights' },
  { value: 'excavation_safety', label: 'Excavation Safety' },
  { value: 'electrical_safety', label: 'Electrical Safety' },
  { value: 'confined_spaces', label: 'Confined Spaces' },
  { value: 'whmis_chemical', label: 'WHMIS & Chemical Safety' },
  { value: 'ppe_requirements', label: 'PPE Requirements' },
  { value: 'heat_stress', label: 'Heat Stress' },
  { value: 'cold_stress', label: 'Cold Stress' },
  { value: 'back_safety', label: 'Back Safety & Lifting' },
  { value: 'ladder_safety', label: 'Ladder Safety' },
  { value: 'scaffolding_safety', label: 'Scaffolding Safety' },
  { value: 'hand_power_tools', label: 'Hand & Power Tools' },
  { value: 'mobile_equipment', label: 'Mobile Equipment' },
  { value: 'emergency_procedures', label: 'Emergency Procedures' },
  { value: 'incident_investigation', label: 'Incident Investigation' },
  { value: 'housekeeping', label: 'Housekeeping' },
  { value: 'custom', label: 'Custom Topic' },
] as const;

// Pre-written toolbox talk content library
const TOOLBOX_TALK_LIBRARY: Record<string, {
  title: string;
  objectives: string[];
  keyPoints: string[];
  discussionQuestions: string[];
  regulations: string[];
  procedures: string[];
}> = {
  working_at_heights: {
    title: 'Working at Heights',
    objectives: [
      'Understand fall hazards on this site',
      'Know proper fall protection equipment',
      'Identify anchor points and safe work areas',
    ],
    keyPoints: [
      'Fall protection required at 3 meters (10 feet) or more',
      'Always inspect harness and lanyards before use',
      'Tie off to rated anchor points only (5,000 lbs minimum)',
      'Never remove guardrails without fall protection in place',
      'Report any damaged equipment immediately',
    ],
    discussionQuestions: [
      'Where are the tie-off points on this site?',
      'What do you do if you find damaged fall protection equipment?',
      'When was your last fall protection training?',
    ],
    regulations: ['O. Reg. 213/91 Section 26', 'O. Reg. 297/13 Working at Heights'],
    procedures: ['SWP-001 Fall Protection', 'SWP-002 Roof Work'],
  },
  excavation_safety: {
    title: 'Excavation Safety',
    objectives: [
      'Recognize excavation hazards',
      'Understand shoring requirements',
      'Know safe entry/exit procedures',
    ],
    keyPoints: [
      'Excavations over 1.2m deep require protection (shoring, sloping, or trench box)',
      'Never enter an unprotected excavation',
      'Keep spoil pile at least 1m from edge',
      'Always use ladder for entry/exit within 7.5m of work',
      'Check for underground utilities before digging',
    ],
    discussionQuestions: [
      'What type of soil are we working in?',
      'Where are the safe entry/exit points?',
      'What utilities have been located?',
    ],
    regulations: ['O. Reg. 213/91 Sections 222-242'],
    procedures: ['SWP-010 Excavation Safety'],
  },
  electrical_safety: {
    title: 'Electrical Safety',
    objectives: [
      'Identify electrical hazards',
      'Understand safe work distances',
      'Know lockout/tagout procedures',
    ],
    keyPoints: [
      'Assume all wires are live until verified otherwise',
      'Maintain safe approach distances from power lines',
      'Use GFCI protection for all portable tools',
      'Never remove grounds from cords or plugs',
      'Report damaged cords and equipment immediately',
    ],
    discussionQuestions: [
      'Where are the electrical panels on site?',
      'Who is qualified to perform lockout/tagout?',
      'What is the safe approach distance for overhead lines?',
    ],
    regulations: ['O. Reg. 213/91 Sections 181-195', 'CSA Z462'],
    procedures: ['SWP-015 Electrical Safety', 'SWP-016 Lockout/Tagout'],
  },
  confined_spaces: {
    title: 'Confined Spaces',
    objectives: [
      'Identify confined spaces',
      'Understand entry requirements',
      'Know emergency procedures',
    ],
    keyPoints: [
      'Never enter a confined space without a permit',
      'Atmospheric testing required before and during entry',
      'Attendant must be present at all times',
      'Have rescue plan in place before entry',
      'Only trained workers may enter confined spaces',
    ],
    discussionQuestions: [
      'What confined spaces exist on this site?',
      'Who is the trained attendant?',
      'What is our rescue procedure?',
    ],
    regulations: ['O. Reg. 632/05 Confined Spaces'],
    procedures: ['SWP-020 Confined Space Entry'],
  },
  whmis_chemical: {
    title: 'WHMIS & Chemical Safety',
    objectives: [
      'Read and understand SDS sheets',
      'Use proper PPE for chemicals',
      'Know spill response procedures',
    ],
    keyPoints: [
      'Check SDS before using any chemical product',
      'Wear required PPE as specified on SDS',
      'Never mix chemicals unless approved',
      'Store chemicals properly in designated areas',
      'Know location of spill kit and how to use it',
    ],
    discussionQuestions: [
      'Where is the SDS binder located?',
      'What chemicals are used on this site?',
      'What PPE is required for [specific chemical]?',
    ],
    regulations: ['Hazardous Products Act', 'WHMIS 2015'],
    procedures: ['SWP-025 Chemical Safety', 'SWP-026 Spill Response'],
  },
  ppe_requirements: {
    title: 'PPE Requirements',
    objectives: [
      'Know site-specific PPE requirements',
      'Inspect PPE before each use',
      'Wear PPE correctly',
    ],
    keyPoints: [
      'Hard hat required at all times on construction sites',
      'Safety glasses/goggles when flying particles risk',
      'High-visibility vest required in vehicle areas',
      'Steel-toed boots minimum CSA Grade 1',
      'Hearing protection when noise exceeds 85 dB',
    ],
    discussionQuestions: [
      'What task-specific PPE is needed today?',
      'When was your hard hat last inspected?',
      'Is your PPE properly fitted?',
    ],
    regulations: ['O. Reg. 213/91 Sections 21-27'],
    procedures: ['SWP-030 Personal Protective Equipment'],
  },
  heat_stress: {
    title: 'Heat Stress',
    objectives: [
      'Recognize signs of heat stress',
      'Know prevention measures',
      'Understand first aid response',
    ],
    keyPoints: [
      'Drink water frequently (1 cup every 15-20 minutes)',
      'Take breaks in shaded/cool areas',
      'Wear light, loose-fitting clothing when possible',
      'Watch coworkers for signs of heat illness',
      'Signs: heavy sweating, weakness, confusion, nausea',
    ],
    discussionQuestions: [
      'Where are the cool-down stations?',
      'What is the humidex today?',
      'What are the signs of heat stroke?',
    ],
    regulations: ['Occupational Health and Safety Act Section 25(2)(h)'],
    procedures: ['SWP-035 Heat Stress Prevention'],
  },
  cold_stress: {
    title: 'Cold Stress',
    objectives: [
      'Recognize cold-related illnesses',
      'Use proper layering techniques',
      'Know warming procedures',
    ],
    keyPoints: [
      'Dress in layers - inner wicking, middle insulating, outer windproof',
      'Keep extremities covered (hands, feet, ears, head)',
      'Take warming breaks as needed',
      'Signs of hypothermia: shivering, confusion, slurred speech',
      'Frostbite appears as white/gray waxy skin',
    ],
    discussionQuestions: [
      'Where is the warming shelter?',
      'What is the wind chill today?',
      'What PPE do you need for cold weather?',
    ],
    regulations: ['Occupational Health and Safety Act Section 25(2)(h)'],
    procedures: ['SWP-036 Cold Stress Prevention'],
  },
  ladder_safety: {
    title: 'Ladder Safety',
    objectives: [
      'Select the right ladder for the job',
      'Set up ladders safely',
      'Climb and work safely on ladders',
    ],
    keyPoints: [
      'Inspect ladder before each use - check rungs, rails, feet',
      'Set at 4:1 angle (1 foot out for every 4 feet up)',
      'Extend 1 meter above landing surface',
      'Maintain 3-point contact at all times',
      'Never stand on top 3 rungs of stepladder',
    ],
    discussionQuestions: [
      'What type of ladder is appropriate for electrical work?',
      'How do you secure a ladder at the top?',
      'When should a ladder be taken out of service?',
    ],
    regulations: ['O. Reg. 213/91 Sections 78-84'],
    procedures: ['SWP-040 Ladder Safety'],
  },
  scaffolding_safety: {
    title: 'Scaffolding Safety',
    objectives: [
      'Inspect scaffolding before use',
      'Understand load limits',
      'Use proper access methods',
    ],
    keyPoints: [
      'Only competent persons may erect/modify scaffolding',
      'Inspect daily and after any modification',
      'Guardrails required on all open sides at 2.4m or more',
      'Know the load rating - never exceed it',
      'Use internal access ladders or stairs, not cross braces',
    ],
    discussionQuestions: [
      'Who inspected the scaffold this morning?',
      'What is the load rating for this scaffold?',
      'Where are the scaffold tags?',
    ],
    regulations: ['O. Reg. 213/91 Sections 125-142'],
    procedures: ['SWP-045 Scaffolding Safety'],
  },
  hand_power_tools: {
    title: 'Hand & Power Tools',
    objectives: [
      'Inspect tools before use',
      'Use correct tool for the job',
      'Store tools safely',
    ],
    keyPoints: [
      'Inspect all tools before each use',
      'Use guards on all power tools',
      'Disconnect power before changing blades/bits',
      'Keep work area clean and organized',
      'Never use damaged or defective tools',
    ],
    discussionQuestions: [
      'What tools will you be using today?',
      'How do you report a damaged tool?',
      'What PPE is required for grinding?',
    ],
    regulations: ['O. Reg. 213/91 Sections 93-116'],
    procedures: ['SWP-050 Hand and Power Tools'],
  },
  mobile_equipment: {
    title: 'Mobile Equipment',
    objectives: [
      'Complete pre-operation inspections',
      'Understand blind spots',
      'Communicate with ground workers',
    ],
    keyPoints: [
      'Complete daily pre-operation checklist',
      'Wear seatbelt when equipped',
      'Know your blind spots - use spotter when needed',
      'Pedestrians have right of way',
      'Never exceed rated capacity',
    ],
    discussionQuestions: [
      'What equipment will be operating today?',
      'Where are the designated travel routes?',
      'Who are the trained spotters?',
    ],
    regulations: ['O. Reg. 213/91 Sections 93-116'],
    procedures: ['SWP-055 Mobile Equipment'],
  },
  emergency_procedures: {
    title: 'Emergency Procedures',
    objectives: [
      'Know emergency assembly points',
      'Understand alarm signals',
      'Know first aid locations',
    ],
    keyPoints: [
      'Emergency assembly point is at [location]',
      'Fire alarm: continuous horn - evacuate immediately',
      'First aid station located at [location]',
      'Emergency contact numbers posted at site office',
      'Know your role in an emergency',
    ],
    discussionQuestions: [
      'Where is the nearest first aid kit?',
      'Who are the trained first aiders on site?',
      'What is the muster point?',
    ],
    regulations: ['O. Reg. 213/91 Section 17'],
    procedures: ['SWP-060 Emergency Response Plan'],
  },
  housekeeping: {
    title: 'Housekeeping',
    objectives: [
      'Maintain clean work areas',
      'Properly dispose of materials',
      'Prevent slips, trips, and falls',
    ],
    keyPoints: [
      'Clean as you go - don\'t let debris accumulate',
      'Keep walkways and exits clear at all times',
      'Dispose of waste in proper containers',
      'Stack materials safely and securely',
      'Report spills immediately and clean up',
    ],
    discussionQuestions: [
      'What areas need attention today?',
      'Where are the waste disposal areas?',
      'Who is responsible for end-of-day cleanup?',
    ],
    regulations: ['O. Reg. 213/91 Section 35'],
    procedures: ['SWP-065 Housekeeping'],
  },
  incident_investigation: {
    title: 'Incident Investigation',
    objectives: [
      'Report all incidents immediately',
      'Preserve incident scene',
      'Participate in investigations',
    ],
    keyPoints: [
      'Report ALL incidents, injuries, and near misses immediately',
      'Do not disturb the scene until investigated',
      'Provide honest, accurate information during investigation',
      'Investigations find causes, not blame',
      'Follow up on corrective actions',
    ],
    discussionQuestions: [
      'What is our reporting procedure?',
      'What qualifies as a near miss?',
      'Have there been any recent incidents to discuss?',
    ],
    regulations: ['OHSA Section 51-53'],
    procedures: ['SWP-070 Incident Reporting'],
  },
};

const WIZARD_STEPS = [
  { id: 'details', label: 'Details', number: 1 },
  { id: 'content', label: 'Content', number: 2 },
  { id: 'discussion', label: 'Discussion', number: 3 },
  { id: 'attendance', label: 'Attendance', number: 4 },
  { id: 'photos', label: 'Photos', number: 5 },
  { id: 'review', label: 'Review', number: 6 },
] as const;

// =============================================================================
// TYPES
// =============================================================================

export type AttendeeStatus = 'present' | 'absent' | 'excused';
export type ActionItemStatus = 'open' | 'completed';

export interface Attendee {
  worker_id: string;
  worker_name?: string;
  status: AttendeeStatus;
  excuse_reason?: string;
  signature?: string;
  signed_at?: string;
}

export interface ActionItem {
  id: string;
  description: string;
  assigned_to_id: string;
  assigned_to_name?: string;
  due_date: string;
  status: ActionItemStatus;
}

export interface ToolboxTalk extends BaseFormData {
  id?: string;
  talk_number: string;
  company_id: string;
  date: string;
  time_started: string;
  time_ended?: string;
  duration_minutes?: number;
  jobsite_id: string;
  presenter_id: string;
  presenter_name?: string;
  topic: string;
  custom_topic?: string;

  // Content
  key_messages: string;
  regulations_cited: string[];
  procedures_referenced: string[];

  // Discussion
  questions_asked: string[];
  answers_provided: string[];
  concerns_raised: string;
  action_items: ActionItem[];

  // Attendance
  attendees: Attendee[];
  paper_signin_used: boolean;
  paper_signin_photo?: CapturedPhoto;

  // Photos & materials
  photos: CapturedPhoto[];
  handouts: string[];
  reference_links: string[];

  // Effectiveness
  questions_asked_flag: boolean;
  workers_engaged: boolean;
  followup_training_needed: boolean;
  followup_training_type?: string;

  // Notes
  went_well: string;
  could_improve: string;
  suggested_topics: string[];

  // Signatures
  presenter_signature?: string;
  presenter_date?: string;
  supervisor_signature?: string;
  supervisor_date?: string;

  form_status: 'draft' | 'completed' | 'reviewed';
  audit_element: string;
}

interface ToolboxTalkFormProps {
  companyId: string;
  userId: string;
  userName: string;
  jobsites: Array<{ id: string; name: string }>;
  workers: Array<{ id: string; name: string }>;
  supervisors: Array<{ id: string; name: string }>;
  suggestedTopic?: string;
  onSubmitSuccess?: (formId: string, talkNumber: string) => void;
  onDraftSaved?: (formId: string) => void;
}

interface FormErrors {
  [key: string]: string | undefined;
}

type ToastType = 'success' | 'info' | 'warning' | 'error';

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function getCurrentDate(): string {
  return new Date().toISOString().split('T')[0];
}

function getCurrentTime(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

function generateTalkNumber(): string {
  const year = new Date().getFullYear();
  const sequence = String(Math.floor(Math.random() * 9999) + 1).padStart(3, '0');
  return `TBT-${year}-${sequence}`;
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  return date.toLocaleDateString();
}

function calculateDuration(startTime: string, endTime: string): number {
  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;
  return Math.max(0, endMinutes - startMinutes);
}

function getInitialFormData(
  companyId: string,
  userId: string,
  userName: string,
  suggestedTopic?: string
): ToolboxTalk {
  const topic = suggestedTopic || 'ppe_requirements';
  const template = TOOLBOX_TALK_LIBRARY[topic];
  
  return {
    talk_number: generateTalkNumber(),
    company_id: companyId,
    date: getCurrentDate(),
    time_started: getCurrentTime(),
    jobsite_id: '',
    presenter_id: userId,
    presenter_name: userName,
    topic,
    key_messages: template?.keyPoints?.join('\n• ') ? `• ${template.keyPoints.join('\n• ')}` : '',
    regulations_cited: template?.regulations || [],
    procedures_referenced: template?.procedures || [],
    questions_asked: [],
    answers_provided: [],
    concerns_raised: '',
    action_items: [],
    attendees: [],
    paper_signin_used: false,
    photos: [],
    handouts: [],
    reference_links: [],
    questions_asked_flag: false,
    workers_engaged: true,
    followup_training_needed: false,
    went_well: '',
    could_improve: '',
    suggested_topics: [],
    form_status: 'draft',
    audit_element: 'Element 8',
    status: 'draft',
  };
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function ToolboxTalkForm({
  companyId,
  userId,
  userName,
  jobsites,
  workers,
  supervisors,
  suggestedTopic,
  onSubmitSuccess,
  onDraftSaved,
}: ToolboxTalkFormProps) {
  const { isOnline } = useNetworkStatus();

  // Form state
  const [formData, setFormData] = useState<ToolboxTalk>(() =>
    getInitialFormData(companyId, userId, userName, suggestedTopic)
  );
  const [currentStep, setCurrentStep] = useState(0);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [showDraftBanner, setShowDraftBanner] = useState(false);
  const [draftInfo, setDraftInfo] = useState<{ formId: string; updatedAt: string } | null>(null);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const [lastAutoSave, setLastAutoSave] = useState<string | null>(null);
  const [activeSignatureWorker, setActiveSignatureWorker] = useState<string | null>(null);

  // Refs
  const autoSaveRef = useRef<ReturnType<typeof createAutoSave<ToolboxTalk>> | null>(null);
  const formRef = useRef<HTMLDivElement>(null);

  // Derived state
  const currentStepConfig = WIZARD_STEPS[currentStep];
  const selectedTemplate = TOOLBOX_TALK_LIBRARY[formData.topic];
  const presentAttendees = formData.attendees.filter(a => a.status === 'present');
  const signedAttendees = formData.attendees.filter(a => a.signature);

  // ==========================================================================
  // TOAST MANAGEMENT
  // ==========================================================================

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  // ==========================================================================
  // DRAFT MANAGEMENT
  // ==========================================================================

  useEffect(() => {
    const checkDraft = async () => {
      const draft = await loadDraft<ToolboxTalk>(FORM_TYPE, companyId);
      if (draft) {
        setDraftInfo({ formId: draft.formId, updatedAt: draft.updatedAt });
        setShowDraftBanner(true);
      }
    };
    checkDraft();
  }, [companyId]);

  useEffect(() => {
    autoSaveRef.current = createAutoSave<ToolboxTalk>(
      FORM_TYPE,
      { companyId, workerId: userId, formType: FORM_TYPE },
      AUTO_SAVE_INTERVAL
    );
    autoSaveRef.current.start(formData);
    return () => autoSaveRef.current?.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId, userId]);

  useEffect(() => {
    autoSaveRef.current?.update(formData);
  }, [formData]);

  const handleRestoreDraft = async () => {
    if (draftInfo) {
      const draft = await loadDraft<ToolboxTalk>(FORM_TYPE, companyId);
      if (draft) {
        setFormData(draft.data);
        showToast('Draft restored', 'info');
      }
    }
    setShowDraftBanner(false);
  };

  const handleDiscardDraft = async () => {
    if (draftInfo) {
      await deleteDraft(FORM_TYPE, companyId, draftInfo.formId);
    }
    setShowDraftBanner(false);
    setDraftInfo(null);
  };

  // ==========================================================================
  // FORM HANDLERS
  // ==========================================================================

  const updateField = <K extends keyof ToolboxTalk>(
    field: K,
    value: ToolboxTalk[K]
  ) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      
      // Load template content when topic changes
      if (field === 'topic' && value !== 'custom') {
        const template = TOOLBOX_TALK_LIBRARY[value as string];
        if (template) {
          updated.key_messages = `• ${template.keyPoints.join('\n• ')}`;
          updated.regulations_cited = template.regulations;
          updated.procedures_referenced = template.procedures;
        }
      }
      
      return updated;
    });
    
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const addAllWorkers = () => {
    const newAttendees = workers.map(worker => ({
      worker_id: worker.id,
      worker_name: worker.name,
      status: 'present' as AttendeeStatus,
    }));
    setFormData(prev => ({ ...prev, attendees: newAttendees }));
  };

  const toggleAttendee = (workerId: string) => {
    setFormData(prev => {
      const exists = prev.attendees.find(a => a.worker_id === workerId);
      if (exists) {
        return {
          ...prev,
          attendees: prev.attendees.filter(a => a.worker_id !== workerId),
        };
      } else {
        const worker = workers.find(w => w.id === workerId);
        return {
          ...prev,
          attendees: [
            ...prev.attendees,
            {
              worker_id: workerId,
              worker_name: worker?.name,
              status: 'present' as AttendeeStatus,
            },
          ],
        };
      }
    });
  };

  const updateAttendeeStatus = (workerId: string, status: AttendeeStatus, excuseReason?: string) => {
    setFormData(prev => ({
      ...prev,
      attendees: prev.attendees.map(a =>
        a.worker_id === workerId
          ? { ...a, status, excuse_reason: excuseReason }
          : a
      ),
    }));
  };

  const updateAttendeeSignature = (workerId: string, signature: string) => {
    setFormData(prev => ({
      ...prev,
      attendees: prev.attendees.map(a =>
        a.worker_id === workerId
          ? { ...a, signature, signed_at: new Date().toISOString() }
          : a
      ),
    }));
    setActiveSignatureWorker(null);
  };

  const addQuestion = () => {
    setFormData(prev => ({
      ...prev,
      questions_asked: [...prev.questions_asked, ''],
      answers_provided: [...prev.answers_provided, ''],
    }));
  };

  const updateQuestion = (index: number, question: string) => {
    setFormData(prev => ({
      ...prev,
      questions_asked: prev.questions_asked.map((q, i) => (i === index ? question : q)),
    }));
  };

  const updateAnswer = (index: number, answer: string) => {
    setFormData(prev => ({
      ...prev,
      answers_provided: prev.answers_provided.map((a, i) => (i === index ? answer : a)),
    }));
  };

  const removeQuestion = (index: number) => {
    setFormData(prev => ({
      ...prev,
      questions_asked: prev.questions_asked.filter((_, i) => i !== index),
      answers_provided: prev.answers_provided.filter((_, i) => i !== index),
    }));
  };

  const addActionItem = () => {
    const newItem: ActionItem = {
      id: `action_${Date.now()}`,
      description: '',
      assigned_to_id: '',
      due_date: '',
      status: 'open',
    };
    setFormData(prev => ({
      ...prev,
      action_items: [...prev.action_items, newItem],
    }));
  };

  const updateActionItem = (id: string, updates: Partial<ActionItem>) => {
    setFormData(prev => ({
      ...prev,
      action_items: prev.action_items.map(item =>
        item.id === id ? { ...item, ...updates } : item
      ),
    }));
  };

  const removeActionItem = (id: string) => {
    setFormData(prev => ({
      ...prev,
      action_items: prev.action_items.filter(item => item.id !== id),
    }));
  };

  const toggleSuggestedTopic = (topic: string) => {
    setFormData(prev => ({
      ...prev,
      suggested_topics: prev.suggested_topics.includes(topic)
        ? prev.suggested_topics.filter(t => t !== topic)
        : [...prev.suggested_topics, topic],
    }));
  };

  // ==========================================================================
  // VALIDATION
  // ==========================================================================

  const validateStep = (step: number): FormErrors => {
    const newErrors: FormErrors = {};

    switch (step) {
      case 0: // Details
        if (!formData.jobsite_id) newErrors.jobsite_id = 'Please select a jobsite';
        if (!formData.topic) newErrors.topic = 'Please select a topic';
        if (formData.topic === 'custom' && !formData.custom_topic) {
          newErrors.custom_topic = 'Please enter the custom topic';
        }
        break;

      case 1: // Content
        if (!formData.key_messages || formData.key_messages.length < 20) {
          newErrors.key_messages = 'Please add key messages (minimum 20 characters)';
        }
        break;

      case 3: // Attendance
        if (presentAttendees.length === 0) {
          newErrors.attendees = 'At least one worker must be present';
        }
        if (!formData.paper_signin_used && signedAttendees.length === 0) {
          newErrors.signatures = 'Workers must sign or use paper sign-in sheet';
        }
        break;

      case 5: // Review
        if (!formData.presenter_signature) {
          newErrors.presenter_signature = 'Presenter signature required';
        }
        break;
    }

    return newErrors;
  };

  const validateAllSteps = (): boolean => {
    let allErrors: FormErrors = {};
    for (let i = 0; i <= 5; i++) {
      const stepErrors = validateStep(i);
      allErrors = { ...allErrors, ...stepErrors };
    }
    setErrors(allErrors);
    return Object.keys(allErrors).length === 0;
  };

  // ==========================================================================
  // NAVIGATION
  // ==========================================================================

  const handleNext = () => {
    const stepErrors = validateStep(currentStep);
    
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      showToast('Please complete all required fields', 'error');
      return;
    }
    
    if (currentStep < 5) {
      setCurrentStep(currentStep + 1);
      formRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      formRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const goToStep = (step: number) => {
    if (step <= currentStep) {
      setCurrentStep(step);
    }
  };

  // ==========================================================================
  // SUBMIT / SAVE HANDLERS
  // ==========================================================================

  const handleSaveDraft = async () => {
    setIsSavingDraft(true);
    const result = await saveDraft(FORM_TYPE, formData, {
      companyId,
      workerId: userId,
      formType: FORM_TYPE,
    });

    setIsSavingDraft(false);

    if (result.success && result.formId) {
      setFormData(prev => ({ ...prev, id: result.formId }));
      setLastAutoSave(new Date().toISOString());
      showToast('📝 Draft saved', 'info');
      onDraftSaved?.(result.formId);
    } else {
      showToast('Failed to save draft', 'error');
    }
  };

  const handleSubmit = async () => {
    if (!validateAllSteps()) {
      showToast('Please complete all required fields', 'error');
      return;
    }

    setIsSubmitting(true);
    autoSaveRef.current?.stop();

    const timeEnded = getCurrentTime();
    const duration = calculateDuration(formData.time_started, timeEnded);

    const finalData: ToolboxTalk = {
      ...formData,
      status: 'submitted',
      form_status: 'completed',
      time_ended: timeEnded,
      duration_minutes: duration,
      presenter_date: new Date().toISOString(),
      questions_asked_flag: formData.questions_asked.length > 0,
    };

    const result = await submitForm(FORM_TYPE, finalData, {
      companyId,
      workerId: userId,
      formType: FORM_TYPE,
      priority: 3,
    });

    setIsSubmitting(false);

    if (result.success && result.formId) {
      showToast('✅ Toolbox talk submitted', 'success');
      onSubmitSuccess?.(result.formId, finalData.talk_number);
    } else {
      showToast(result.error || 'Submission failed', 'error');
      autoSaveRef.current?.start(formData);
    }
  };

  // ==========================================================================
  // RENDER HELPERS
  // ==========================================================================

  const renderProgressBar = () => (
    <div className="sticky top-0 z-30 bg-[var(--card)] border-b border-[var(--border)] px-4 py-3">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-lg font-bold">Toolbox Talk</h1>
        <span className="text-sm text-[var(--muted)]">
          Step {currentStep + 1} of 6
        </span>
      </div>
      
      <div className="flex gap-1">
        {WIZARD_STEPS.map((step, index) => (
          <button
            key={step.id}
            type="button"
            onClick={() => goToStep(index)}
            disabled={index > currentStep}
            className={`flex-1 h-2 rounded-full transition-all ${
              index === currentStep
                ? 'bg-[var(--primary)]'
                : index < currentStep
                ? 'bg-emerald-500'
                : 'bg-[var(--border)]'
            }`}
            title={step.label}
          />
        ))}
      </div>
      
      <div className="flex justify-between items-center mt-2">
        <p className="text-sm text-[var(--primary)] font-medium">
          {currentStepConfig.label}
        </p>
        <span className="text-xs text-[var(--muted)]">
          {presentAttendees.length} attendee{presentAttendees.length !== 1 ? 's' : ''}
        </span>
      </div>
    </div>
  );

  const renderStep0Details = () => (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold border-b border-[var(--border)] pb-2">
        Section A: Meeting Details
      </h2>

      {/* Date & Time */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="block text-sm font-medium">Date</label>
          <input
            type="date"
            value={formData.date}
            readOnly
            className="w-full h-12 px-4 rounded-xl bg-[var(--card)] border border-[var(--border)] text-base opacity-70"
          />
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-medium">Time Started</label>
          <input
            type="time"
            value={formData.time_started}
            readOnly
            className="w-full h-12 px-4 rounded-xl bg-[var(--card)] border border-[var(--border)] text-base opacity-70"
          />
        </div>
      </div>

      {/* Jobsite */}
      <div className="space-y-2">
        <label htmlFor="jobsite_id" className="block text-sm font-medium">
          Jobsite <span className="text-red-400">*</span>
        </label>
        <select
          id="jobsite_id"
          value={formData.jobsite_id}
          onChange={(e) => updateField('jobsite_id', e.target.value)}
          className={`w-full h-12 px-4 rounded-xl bg-[var(--card)] border text-base appearance-none ${
            errors.jobsite_id ? 'border-red-500' : 'border-[var(--border)]'
          }`}
        >
          <option value="">Select a jobsite...</option>
          {jobsites.map((site) => (
            <option key={site.id} value={site.id}>
              {site.name}
            </option>
          ))}
        </select>
        {errors.jobsite_id && (
          <p className="text-red-400 text-sm">{errors.jobsite_id}</p>
        )}
      </div>

      {/* Presenter (read-only) */}
      <div className="space-y-2">
        <label className="block text-sm font-medium">Presenter</label>
        <input
          type="text"
          value={formData.presenter_name || userName}
          readOnly
          className="w-full h-12 px-4 rounded-xl bg-[var(--card)] border border-[var(--border)] text-base opacity-70"
        />
      </div>

      {/* Topic Selection */}
      <div className="space-y-2">
        <label htmlFor="topic" className="block text-sm font-medium">
          Topic <span className="text-red-400">*</span>
        </label>
        <select
          id="topic"
          value={formData.topic}
          onChange={(e) => updateField('topic', e.target.value)}
          className={`w-full h-12 px-4 rounded-xl bg-[var(--card)] border text-base appearance-none ${
            errors.topic ? 'border-red-500' : 'border-[var(--border)]'
          }`}
        >
          {TOOLBOX_TOPICS.map((topic) => (
            <option key={topic.value} value={topic.value}>
              {topic.label}
            </option>
          ))}
        </select>
        {errors.topic && (
          <p className="text-red-400 text-sm">{errors.topic}</p>
        )}
      </div>

      {/* Custom Topic */}
      {formData.topic === 'custom' && (
        <div className="space-y-2">
          <label htmlFor="custom_topic" className="block text-sm font-medium">
            Custom Topic Title <span className="text-red-400">*</span>
          </label>
          <input
            id="custom_topic"
            type="text"
            value={formData.custom_topic || ''}
            onChange={(e) => updateField('custom_topic', e.target.value)}
            placeholder="Enter your custom topic..."
            className={`w-full h-12 px-4 rounded-xl bg-[var(--card)] border text-base ${
              errors.custom_topic ? 'border-red-500' : 'border-[var(--border)]'
            }`}
          />
          {errors.custom_topic && (
            <p className="text-red-400 text-sm">{errors.custom_topic}</p>
          )}
        </div>
      )}

      {/* Template Preview */}
      {selectedTemplate && formData.topic !== 'custom' && (
        <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/30 space-y-3">
          <p className="text-sm font-medium text-blue-400">📚 Template Loaded</p>
          <div>
            <p className="text-xs text-[var(--muted)]">Learning Objectives:</p>
            <ul className="text-sm list-disc list-inside mt-1">
              {selectedTemplate.objectives.map((obj, i) => (
                <li key={i}>{obj}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );

  const renderStep1Content = () => (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold border-b border-[var(--border)] pb-2">
        Section B: Topic Content
      </h2>

      {/* Key Messages */}
      <div className="space-y-2">
        <label htmlFor="key_messages" className="block text-sm font-medium">
          Key Messages <span className="text-red-400">*</span>
        </label>
        <textarea
          id="key_messages"
          value={formData.key_messages}
          onChange={(e) => updateField('key_messages', e.target.value)}
          placeholder="Enter key safety messages to cover..."
          rows={8}
          className={`w-full p-4 rounded-xl bg-[var(--card)] border text-base resize-none ${
            errors.key_messages ? 'border-red-500' : 'border-[var(--border)]'
          }`}
        />
        {errors.key_messages && (
          <p className="text-red-400 text-sm">{errors.key_messages}</p>
        )}
        <p className="text-xs text-[var(--muted)]">
          Edit the pre-filled content to customize for your specific site conditions
        </p>
      </div>

      {/* Regulations Cited */}
      <div className="space-y-2">
        <label className="block text-sm font-medium">Regulations Cited</label>
        <div className="flex flex-wrap gap-2">
          {formData.regulations_cited.map((reg, index) => (
            <span
              key={index}
              className="px-3 py-1 rounded-full bg-[var(--background)] border border-[var(--border)] text-sm"
            >
              {reg}
            </span>
          ))}
          {formData.regulations_cited.length === 0 && (
            <span className="text-sm text-[var(--muted)]">No regulations specified</span>
          )}
        </div>
      </div>

      {/* Procedures Referenced */}
      <div className="space-y-2">
        <label className="block text-sm font-medium">Company Procedures Referenced</label>
        <div className="flex flex-wrap gap-2">
          {formData.procedures_referenced.map((proc, index) => (
            <span
              key={index}
              className="px-3 py-1 rounded-full bg-[var(--primary)]/10 border border-[var(--primary)]/30 text-sm text-[var(--primary)]"
            >
              📄 {proc}
            </span>
          ))}
          {formData.procedures_referenced.length === 0 && (
            <span className="text-sm text-[var(--muted)]">No procedures specified</span>
          )}
        </div>
      </div>

      {/* Discussion Questions (from template) */}
      {selectedTemplate?.discussionQuestions && (
        <div className="p-4 rounded-xl bg-[var(--background)] border border-[var(--border)]">
          <p className="text-sm font-medium mb-2">💬 Suggested Discussion Questions:</p>
          <ul className="text-sm space-y-1">
            {selectedTemplate.discussionQuestions.map((q, i) => (
              <li key={i} className="text-[var(--muted)]">• {q}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );

  const renderStep2Discussion = () => (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold border-b border-[var(--border)] pb-2">
        Section C: Discussion Points
      </h2>

      {/* Questions & Answers */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <label className="block text-sm font-medium">Questions Asked by Workers</label>
          <button
            type="button"
            onClick={addQuestion}
            className="text-sm text-[var(--primary)] hover:underline"
          >
            + Add Question
          </button>
        </div>
        
        {formData.questions_asked.length === 0 ? (
          <div className="p-4 rounded-xl border-2 border-dashed border-[var(--border)] text-center">
            <p className="text-[var(--muted)]">No questions recorded yet</p>
            <button
              type="button"
              onClick={addQuestion}
              className="mt-2 text-[var(--primary)] text-sm hover:underline"
            >
              + Add a question
            </button>
          </div>
        ) : (
          formData.questions_asked.map((question, index) => (
            <div key={index} className="p-4 rounded-xl bg-[var(--background)] border border-[var(--border)] space-y-3">
              <div className="flex justify-between items-start">
                <span className="text-sm font-medium">Q{index + 1}</span>
                <button
                  type="button"
                  onClick={() => removeQuestion(index)}
                  className="text-red-400 text-sm hover:underline"
                >
                  Remove
                </button>
              </div>
              <input
                type="text"
                value={question}
                onChange={(e) => updateQuestion(index, e.target.value)}
                placeholder="What question was asked?"
                className="w-full h-10 px-3 rounded-lg bg-[var(--card)] border border-[var(--border)] text-sm"
              />
              <textarea
                value={formData.answers_provided[index] || ''}
                onChange={(e) => updateAnswer(index, e.target.value)}
                placeholder="What answer was provided?"
                rows={2}
                className="w-full p-3 rounded-lg bg-[var(--card)] border border-[var(--border)] text-sm resize-none"
              />
            </div>
          ))
        )}
      </div>

      {/* Concerns Raised */}
      <div className="space-y-2">
        <label htmlFor="concerns_raised" className="block text-sm font-medium">
          Concerns Raised
        </label>
        <textarea
          id="concerns_raised"
          value={formData.concerns_raised}
          onChange={(e) => updateField('concerns_raised', e.target.value)}
          placeholder="Any safety concerns raised by workers..."
          rows={3}
          className="w-full p-4 rounded-xl bg-[var(--card)] border border-[var(--border)] text-base resize-none"
        />
      </div>

      {/* Action Items */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <label className="block text-sm font-medium">Action Items Identified</label>
          <button
            type="button"
            onClick={addActionItem}
            className="text-sm text-[var(--primary)] hover:underline"
          >
            + Add Action Item
          </button>
        </div>
        
        {formData.action_items.map((item) => (
          <div key={item.id} className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-3">
            <div className="flex justify-between items-start">
              <span className="text-sm font-medium text-amber-400">⚡ Action Required</span>
              <button
                type="button"
                onClick={() => removeActionItem(item.id)}
                className="text-red-400 text-sm hover:underline"
              >
                Remove
              </button>
            </div>
            <input
              type="text"
              value={item.description}
              onChange={(e) => updateActionItem(item.id, { description: e.target.value })}
              placeholder="What needs to be done?"
              className="w-full h-10 px-3 rounded-lg bg-[var(--card)] border border-[var(--border)] text-sm"
            />
            <div className="grid grid-cols-2 gap-3">
              <select
                value={item.assigned_to_id}
                onChange={(e) => updateActionItem(item.id, { assigned_to_id: e.target.value })}
                className="h-10 px-3 rounded-lg bg-[var(--card)] border border-[var(--border)] text-sm appearance-none"
              >
                <option value="">Assign to...</option>
                {supervisors.map((sup) => (
                  <option key={sup.id} value={sup.id}>{sup.name}</option>
                ))}
              </select>
              <input
                type="date"
                value={item.due_date}
                min={getCurrentDate()}
                onChange={(e) => updateActionItem(item.id, { due_date: e.target.value })}
                className="h-10 px-3 rounded-lg bg-[var(--card)] border border-[var(--border)] text-sm"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderStep3Attendance = () => (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold border-b border-[var(--border)] pb-2">
        Section D: Attendance
      </h2>

      {errors.attendees && (
        <p className="text-red-400 text-sm">{errors.attendees}</p>
      )}

      {/* Quick Actions */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={addAllWorkers}
          className="flex-1 h-12 rounded-xl bg-[var(--primary)]/10 border border-[var(--primary)]/30 text-[var(--primary)] font-medium"
        >
          + Add All Workers
        </button>
        <button
          type="button"
          onClick={() => setFormData(prev => ({ ...prev, attendees: [] }))}
          className="h-12 px-4 rounded-xl bg-[var(--card)] border border-[var(--border)] text-[var(--muted)]"
        >
          Clear
        </button>
      </div>

      {/* Worker Selection */}
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {workers.map((worker) => {
          const attendee = formData.attendees.find(a => a.worker_id === worker.id);
          const isSelected = !!attendee;
          
          return (
            <div
              key={worker.id}
              className={`p-3 rounded-xl border-2 transition-all ${
                isSelected
                  ? 'border-[var(--primary)] bg-[var(--primary)]/10'
                  : 'border-[var(--border)] bg-[var(--card)]'
              }`}
            >
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-3 flex-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleAttendee(worker.id)}
                    className="w-5 h-5 rounded accent-[var(--primary)]"
                  />
                  <span className="font-medium">{worker.name}</span>
                </label>
                
                {isSelected && (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => updateAttendeeStatus(worker.id, 'present')}
                      className={`px-3 py-1 rounded text-xs font-medium ${
                        attendee?.status === 'present'
                          ? 'bg-emerald-500 text-white'
                          : 'bg-[var(--background)] text-[var(--muted)]'
                      }`}
                    >
                      Present
                    </button>
                    <button
                      type="button"
                      onClick={() => updateAttendeeStatus(worker.id, 'excused')}
                      className={`px-3 py-1 rounded text-xs font-medium ${
                        attendee?.status === 'excused'
                          ? 'bg-amber-500 text-white'
                          : 'bg-[var(--background)] text-[var(--muted)]'
                      }`}
                    >
                      Excused
                    </button>
                  </div>
                )}
              </div>
              
              {attendee?.status === 'excused' && (
                <input
                  type="text"
                  value={attendee.excuse_reason || ''}
                  onChange={(e) => updateAttendeeStatus(worker.id, 'excused', e.target.value)}
                  placeholder="Reason for absence..."
                  className="mt-2 w-full h-9 px-3 rounded-lg bg-[var(--card)] border border-[var(--border)] text-sm"
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Section E: Worker Acknowledgment */}
      <h2 className="text-lg font-semibold border-b border-[var(--border)] pb-2 pt-4">
        Section E: Worker Acknowledgment
      </h2>

      {errors.signatures && (
        <p className="text-red-400 text-sm">{errors.signatures}</p>
      )}

      {/* Paper Sign-in Option */}
      <label className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
        formData.paper_signin_used
          ? 'border-[var(--primary)] bg-[var(--primary)]/10'
          : 'border-[var(--border)] bg-[var(--card)]'
      }`}>
        <input
          type="checkbox"
          checked={formData.paper_signin_used}
          onChange={(e) => updateField('paper_signin_used', e.target.checked)}
          className="w-5 h-5 rounded accent-[var(--primary)]"
        />
        <div>
          <span className="font-medium">Paper sign-in sheet used</span>
          <p className="text-sm text-[var(--muted)]">Upload a photo of the signed attendance sheet</p>
        </div>
      </label>

      {formData.paper_signin_used && (
        <PhotoCapture
          label="Paper sign-in sheet photo"
          photos={formData.paper_signin_photo ? [formData.paper_signin_photo] : []}
          onPhotosChange={(photos) => updateField('paper_signin_photo', photos[0])}
          maxPhotos={1}
          required
        />
      )}

      {/* Digital Signatures */}
      {!formData.paper_signin_used && presentAttendees.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm text-[var(--muted)]">
            Tap each worker's name to collect their signature
          </p>
          {presentAttendees.map((attendee) => (
            <div
              key={attendee.worker_id}
              className={`p-4 rounded-xl border-2 ${
                attendee.signature
                  ? 'border-emerald-500 bg-emerald-500/10'
                  : 'border-[var(--border)] bg-[var(--card)]'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">{attendee.worker_name}</span>
                {attendee.signature ? (
                  <span className="text-emerald-400 text-sm">✓ Signed</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setActiveSignatureWorker(attendee.worker_id)}
                    className="px-3 py-1 rounded-lg bg-[var(--primary)] text-white text-sm"
                  >
                    Sign
                  </button>
                )}
              </div>
              
              {attendee.signature && (
                <div className="mt-2 h-16 rounded-lg bg-[var(--background)] overflow-hidden">
                  <img
                    src={attendee.signature}
                    alt="Signature"
                    className="h-full w-auto mx-auto object-contain"
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Signature Modal */}
      {activeSignatureWorker && (
        <div className="fixed inset-0 z-50 bg-black/90 flex flex-col">
          <div className="bg-[var(--card)] border-b border-[var(--border)] p-4">
            <h3 className="text-lg font-semibold">
              Worker Acknowledgment
            </h3>
            <p className="text-sm text-[var(--muted)] mt-1">
              {formData.attendees.find(a => a.worker_id === activeSignatureWorker)?.worker_name}
            </p>
          </div>
          
          <div className="p-4 bg-[var(--background)]">
            <p className="text-sm mb-4">
              By signing, I acknowledge:
            </p>
            <ul className="text-sm text-[var(--muted)] space-y-1 mb-4">
              <li>• I attended this toolbox talk</li>
              <li>• I understand the safety procedures discussed</li>
              <li>• I will follow the procedures outlined</li>
            </ul>
          </div>
          
          <div className="flex-1 p-4">
            <SignaturePad
              label="Signature"
              onSignatureChange={(sig) => {
                if (sig?.data) {
                  updateAttendeeSignature(activeSignatureWorker, sig.data);
                }
              }}
              required
            />
          </div>
          
          <div className="bg-[var(--card)] border-t border-[var(--border)] p-4">
            <button
              type="button"
              onClick={() => setActiveSignatureWorker(null)}
              className="w-full h-12 rounded-xl bg-[var(--border)] font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Attendance Summary */}
      <div className="p-4 rounded-xl bg-[var(--background)] border border-[var(--border)]">
        <div className="flex justify-between text-sm">
          <span>Present:</span>
          <span className="font-medium text-emerald-400">{presentAttendees.length}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span>Excused:</span>
          <span className="font-medium text-amber-400">
            {formData.attendees.filter(a => a.status === 'excused').length}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span>Signed:</span>
          <span className="font-medium">
            {formData.paper_signin_used ? 'Paper sheet' : `${signedAttendees.length}/${presentAttendees.length}`}
          </span>
        </div>
      </div>
    </div>
  );

  const renderStep4Photos = () => (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold border-b border-[var(--border)] pb-2">
        Section F: Photos & Materials
      </h2>

      <PhotoCapture
        label="Photos from meeting"
        photos={formData.photos}
        onPhotosChange={(photos) => updateField('photos', photos)}
        maxPhotos={5}
      />

      {/* Section G: Effectiveness */}
      <h2 className="text-lg font-semibold border-b border-[var(--border)] pb-2 pt-4">
        Section G: Effectiveness
      </h2>

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">Workers asked questions?</legend>
        <div className="flex gap-4">
          <label className={`flex-1 flex items-center justify-center h-12 rounded-xl border-2 cursor-pointer ${
            formData.questions_asked_flag ? 'border-emerald-500 bg-emerald-500/10' : 'border-[var(--border)]'
          }`}>
            <input
              type="radio"
              checked={formData.questions_asked_flag}
              onChange={() => updateField('questions_asked_flag', true)}
              className="sr-only"
            />
            <span>Yes</span>
          </label>
          <label className={`flex-1 flex items-center justify-center h-12 rounded-xl border-2 cursor-pointer ${
            !formData.questions_asked_flag ? 'border-[var(--primary)] bg-[var(--primary)]/10' : 'border-[var(--border)]'
          }`}>
            <input
              type="radio"
              checked={!formData.questions_asked_flag}
              onChange={() => updateField('questions_asked_flag', false)}
              className="sr-only"
            />
            <span>No</span>
          </label>
        </div>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">Workers seemed engaged?</legend>
        <div className="flex gap-4">
          <label className={`flex-1 flex items-center justify-center h-12 rounded-xl border-2 cursor-pointer ${
            formData.workers_engaged ? 'border-emerald-500 bg-emerald-500/10' : 'border-[var(--border)]'
          }`}>
            <input
              type="radio"
              checked={formData.workers_engaged}
              onChange={() => updateField('workers_engaged', true)}
              className="sr-only"
            />
            <span>Yes</span>
          </label>
          <label className={`flex-1 flex items-center justify-center h-12 rounded-xl border-2 cursor-pointer ${
            !formData.workers_engaged ? 'border-red-500 bg-red-500/10' : 'border-[var(--border)]'
          }`}>
            <input
              type="radio"
              checked={!formData.workers_engaged}
              onChange={() => updateField('workers_engaged', false)}
              className="sr-only"
            />
            <span>No</span>
          </label>
        </div>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">Follow-up training needed?</legend>
        <div className="flex gap-4">
          <label className={`flex-1 flex items-center justify-center h-12 rounded-xl border-2 cursor-pointer ${
            formData.followup_training_needed ? 'border-amber-500 bg-amber-500/10' : 'border-[var(--border)]'
          }`}>
            <input
              type="radio"
              checked={formData.followup_training_needed}
              onChange={() => updateField('followup_training_needed', true)}
              className="sr-only"
            />
            <span>Yes</span>
          </label>
          <label className={`flex-1 flex items-center justify-center h-12 rounded-xl border-2 cursor-pointer ${
            !formData.followup_training_needed ? 'border-emerald-500 bg-emerald-500/10' : 'border-[var(--border)]'
          }`}>
            <input
              type="radio"
              checked={!formData.followup_training_needed}
              onChange={() => updateField('followup_training_needed', false)}
              className="sr-only"
            />
            <span>No</span>
          </label>
        </div>
      </fieldset>

      {formData.followup_training_needed && (
        <div className="space-y-2">
          <label htmlFor="followup_training_type" className="block text-sm font-medium">
            What type of training?
          </label>
          <input
            id="followup_training_type"
            type="text"
            value={formData.followup_training_type || ''}
            onChange={(e) => updateField('followup_training_type', e.target.value)}
            placeholder="e.g., Fall protection refresher"
            className="w-full h-12 px-4 rounded-xl bg-[var(--card)] border border-[var(--border)] text-base"
          />
        </div>
      )}

      {/* Section H: Presenter Notes */}
      <h2 className="text-lg font-semibold border-b border-[var(--border)] pb-2 pt-4">
        Section H: Presenter Notes
      </h2>

      <div className="space-y-2">
        <label htmlFor="went_well" className="block text-sm font-medium">
          What went well?
        </label>
        <textarea
          id="went_well"
          value={formData.went_well}
          onChange={(e) => updateField('went_well', e.target.value)}
          placeholder="What aspects of the talk were effective..."
          rows={3}
          className="w-full p-4 rounded-xl bg-[var(--card)] border border-[var(--border)] text-base resize-none"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="could_improve" className="block text-sm font-medium">
          What could be improved?
        </label>
        <textarea
          id="could_improve"
          value={formData.could_improve}
          onChange={(e) => updateField('could_improve', e.target.value)}
          placeholder="Ideas for improving future talks..."
          rows={3}
          className="w-full p-4 rounded-xl bg-[var(--card)] border border-[var(--border)] text-base resize-none"
        />
      </div>

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">Suggested topics for next talk</legend>
        <div className="grid grid-cols-2 gap-2">
          {TOOLBOX_TOPICS.filter(t => t.value !== 'custom' && t.value !== formData.topic).slice(0, 8).map((topic) => (
            <label
              key={topic.value}
              className={`flex items-center gap-2 p-3 rounded-xl border-2 cursor-pointer text-sm ${
                formData.suggested_topics.includes(topic.value)
                  ? 'border-[var(--primary)] bg-[var(--primary)]/10'
                  : 'border-[var(--border)] bg-[var(--card)]'
              }`}
            >
              <input
                type="checkbox"
                checked={formData.suggested_topics.includes(topic.value)}
                onChange={() => toggleSuggestedTopic(topic.value)}
                className="w-4 h-4 rounded accent-[var(--primary)]"
              />
              <span className="truncate">{topic.label}</span>
            </label>
          ))}
        </div>
      </fieldset>
    </div>
  );

  const renderStep5Review = () => {
    const jobsite = jobsites.find(j => j.id === formData.jobsite_id);
    const topicLabel = TOOLBOX_TOPICS.find(t => t.value === formData.topic)?.label || formData.custom_topic;
    
    return (
      <div className="space-y-6">
        <h2 className="text-lg font-semibold border-b border-[var(--border)] pb-2">
          Review & Submit
        </h2>

        {/* Summary */}
        <div className="p-4 rounded-xl bg-[var(--background)] border border-[var(--border)] space-y-2">
          <div className="flex justify-between">
            <span className="text-[var(--muted)]">Talk Number</span>
            <span className="font-mono font-medium">{formData.talk_number}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--muted)]">Topic</span>
            <span className="font-medium">{topicLabel}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--muted)]">Date</span>
            <span className="font-medium">{formData.date}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--muted)]">Time</span>
            <span className="font-medium">{formData.time_started}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--muted)]">Jobsite</span>
            <span className="font-medium">{jobsite?.name || '-'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--muted)]">Presenter</span>
            <span className="font-medium">{formData.presenter_name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--muted)]">Attendees</span>
            <span className="font-medium text-emerald-400">{presentAttendees.length} present</span>
          </div>
        </div>

        {/* Low Attendance Warning */}
        {presentAttendees.length < 3 && presentAttendees.length > 0 && (
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/50">
            <p className="text-amber-400 text-sm">
              ⚠️ Low attendance ({presentAttendees.length} workers). Supervisor will be notified.
            </p>
          </div>
        )}

        {/* Action Items Summary */}
        {formData.action_items.length > 0 && (
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
            <p className="font-medium text-amber-400 mb-2">
              ⚡ {formData.action_items.length} Action Item{formData.action_items.length !== 1 ? 's' : ''}
            </p>
            <ul className="text-sm space-y-1">
              {formData.action_items.map((item, i) => (
                <li key={i}>• {item.description || '(No description)'}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Section I: Signatures */}
        <h2 className="text-lg font-semibold border-b border-[var(--border)] pb-2 pt-4">
          Section I: Signatures
        </h2>

        <SignaturePad
          label="Presenter Signature"
          value={formData.presenter_signature}
          onSignatureChange={(sig) => {
            updateField('presenter_signature', sig?.data);
            if (sig) {
              updateField('presenter_date', sig.timestamp);
            }
          }}
          required
          error={errors.presenter_signature}
        />

        <SignaturePad
          label="Supervisor Review (optional)"
          value={formData.supervisor_signature}
          onSignatureChange={(sig) => {
            updateField('supervisor_signature', sig?.data);
            if (sig) {
              updateField('supervisor_date', sig.timestamp);
            }
          }}
        />

        {/* COR Audit Info */}
        <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/30">
          <p className="text-sm text-blue-400">
            📋 This talk will be tagged as COR audit evidence for <strong>{formData.audit_element}</strong>
          </p>
          <p className="text-xs text-[var(--muted)] mt-1">
            COR requirement: minimum 52 toolbox talks per year (weekly)
          </p>
        </div>
      </div>
    );
  };

  // ==========================================================================
  // MAIN RENDER
  // ==========================================================================

  return (
    <div className="min-h-screen bg-[var(--background)] pb-32">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-16 left-4 right-4 z-50 p-4 rounded-xl shadow-lg animate-slide-down ${
            toast.type === 'success' ? 'bg-emerald-500 text-white'
            : toast.type === 'error' ? 'bg-red-500 text-white'
            : toast.type === 'warning' ? 'bg-amber-500 text-black'
            : 'bg-blue-500 text-white'
          }`}
        >
          <p className="font-medium text-center">{toast.message}</p>
        </div>
      )}

      {/* Draft Banner */}
      {showDraftBanner && draftInfo && (
        <div className="sticky top-0 z-40 bg-amber-500 text-black px-4 py-3">
          <p className="text-sm font-medium mb-2">
            📝 Resume your draft from {formatRelativeTime(draftInfo.updatedAt)}?
          </p>
          <div className="flex gap-3">
            <button type="button" onClick={handleRestoreDraft} className="flex-1 bg-black/20 py-2 px-4 rounded-lg font-semibold">
              Yes, restore
            </button>
            <button type="button" onClick={handleDiscardDraft} className="flex-1 bg-white/20 py-2 px-4 rounded-lg font-semibold">
              No, start fresh
            </button>
          </div>
        </div>
      )}

      {/* Progress Bar */}
      {renderProgressBar()}

      {/* Form Content */}
      <div ref={formRef} className="px-4 py-6 overflow-y-auto">
        {currentStep === 0 && renderStep0Details()}
        {currentStep === 1 && renderStep1Content()}
        {currentStep === 2 && renderStep2Discussion()}
        {currentStep === 3 && renderStep3Attendance()}
        {currentStep === 4 && renderStep4Photos()}
        {currentStep === 5 && renderStep5Review()}
      </div>

      {/* Bottom Buttons */}
      <div className="fixed bottom-0 left-0 right-0 bg-[var(--card)] border-t border-[var(--border)] px-4 py-4 z-50">
        <div className="flex gap-3 max-w-lg mx-auto">
          {currentStep > 0 && (
            <button
              type="button"
              onClick={handleBack}
              className="flex-1 h-14 rounded-xl bg-[var(--card)] border-2 border-[var(--border)] font-semibold"
            >
              ← Back
            </button>
          )}
          
          {currentStep === 0 && (
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={isSavingDraft}
              className="flex-1 h-14 rounded-xl bg-[var(--card)] border-2 border-[var(--border)] font-semibold disabled:opacity-50"
            >
              {isSavingDraft ? 'Saving...' : '💾 Save Draft'}
            </button>
          )}

          {currentStep < 5 ? (
            <button
              type="button"
              onClick={handleNext}
              className="flex-1 h-14 rounded-xl bg-[var(--primary)] text-white font-semibold"
            >
              Continue →
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex-1 h-14 rounded-xl bg-emerald-500 text-white font-semibold disabled:opacity-50"
            >
              {isSubmitting ? '⟳ Submitting...' : '✅ Submit Talk'}
            </button>
          )}
        </div>

        <div className="flex justify-between items-center mt-2 text-xs text-[var(--muted)]">
          <span>{isOnline ? '🟢 Online' : '🔴 Offline'}</span>
          {lastAutoSave && <span>Auto-saved {formatRelativeTime(lastAutoSave)}</span>}
        </div>
      </div>
    </div>
  );
}

export type { ToolboxTalkFormProps };
