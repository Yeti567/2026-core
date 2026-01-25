/**
 * COR Interview Question Bank
 * 
 * Questions based on COR 2020 audit standards and common auditor interview questions.
 * Organized by category and COR element for targeted practice.
 */

export interface InterviewQuestion {
  id: string;
  elementNumber: number;
  category: 'worker_rights' | 'hazards' | 'training' | 'ppe' | 'equipment' | 'emergency' | 'incidents' | 'culture' | 'inspections';
  question: string;
  keyPoints: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  role: 'worker' | 'supervisor' | 'management' | 'all';
  followUpQuestions?: string[];
}

/**
 * Comprehensive question bank organized by category
 */
export const COR_INTERVIEW_QUESTIONS: Record<string, InterviewQuestion[]> = {
  // Worker Rights (Element 1-2)
  worker_rights: [
    {
      id: 'wr-1',
      elementNumber: 1,
      category: 'worker_rights',
      question: "What are your rights as a worker under Ontario's Occupational Health and Safety Act?",
      keyPoints: ['right to know', 'right to participate', 'right to refuse unsafe work', 'OHSA', 'three rights'],
      difficulty: 'easy',
      role: 'all',
      followUpQuestions: ['Can you tell me more about what "right to know" means?']
    },
    {
      id: 'wr-2',
      elementNumber: 2,
      category: 'worker_rights',
      question: "If you see something unsafe, what do you do?",
      keyPoints: ['report', 'supervisor', 'immediately', 'hazard', 'document', 'form'],
      difficulty: 'easy',
      role: 'all',
      followUpQuestions: ['Who specifically would you report to?', 'Is there a form you would fill out?']
    },
    {
      id: 'wr-3',
      elementNumber: 1,
      category: 'worker_rights',
      question: "Can you refuse work if you believe it's unsafe? How would you do that?",
      keyPoints: ['yes', 'right to refuse', 'report supervisor', 'stay in safe area', 'investigation', 'Ministry of Labour'],
      difficulty: 'medium',
      role: 'all',
      followUpQuestions: ['What happens after you refuse?', 'Can you be disciplined for refusing unsafe work?']
    },
    {
      id: 'wr-4',
      elementNumber: 1,
      category: 'worker_rights',
      question: "Who is your workplace Health and Safety Representative or Joint Health and Safety Committee member?",
      keyPoints: ['name', 'JHSC', 'health and safety representative', 'committee', 'worker rep'],
      difficulty: 'easy',
      role: 'all'
    },
    {
      id: 'wr-5',
      elementNumber: 2,
      category: 'worker_rights',
      question: "How do you report a hazard or near-miss?",
      keyPoints: ['form', 'supervisor', 'report', 'document', 'near miss', 'verbally', 'writing'],
      difficulty: 'easy',
      role: 'all'
    },
    {
      id: 'wr-6',
      elementNumber: 1,
      category: 'worker_rights',
      question: "Where can you find the company's health and safety policy?",
      keyPoints: ['posted', 'bulletin board', 'handbook', 'office', 'visible', 'accessible'],
      difficulty: 'easy',
      role: 'all'
    },
    {
      id: 'wr-7',
      elementNumber: 1,
      category: 'worker_rights',
      question: "What would you do if your supervisor asked you to do something you felt was unsafe?",
      keyPoints: ['refuse', 'explain concern', 'report', 'right to refuse', 'discuss', 'not retaliation'],
      difficulty: 'medium',
      role: 'all'
    }
  ],

  // Hazard Recognition (Element 2-3)
  hazards: [
    {
      id: 'hz-1',
      elementNumber: 2,
      category: 'hazards',
      question: "What hazards are present in your work area?",
      keyPoints: ['specific hazards', 'physical', 'chemical', 'biological', 'ergonomic', 'falls', 'struck by'],
      difficulty: 'easy',
      role: 'all',
      followUpQuestions: ['What controls are in place for those hazards?']
    },
    {
      id: 'hz-2',
      elementNumber: 2,
      category: 'hazards',
      question: "How do you know what hazards to look for before starting work?",
      keyPoints: ['JHA', 'job hazard analysis', 'hazard assessment', 'toolbox talk', 'SWP', 'pre-task planning'],
      difficulty: 'medium',
      role: 'all'
    },
    {
      id: 'hz-3',
      elementNumber: 2,
      category: 'hazards',
      question: "Tell me about the last hazard assessment or JHA you completed or participated in.",
      keyPoints: ['recent', 'specific task', 'hazards identified', 'controls', 'documented'],
      difficulty: 'medium',
      role: 'all'
    },
    {
      id: 'hz-4',
      elementNumber: 3,
      category: 'hazards',
      question: "What controls are in place for the main hazard in your work area?",
      keyPoints: ['elimination', 'substitution', 'engineering', 'administrative', 'PPE', 'hierarchy of controls'],
      difficulty: 'medium',
      role: 'all'
    },
    {
      id: 'hz-5',
      elementNumber: 2,
      category: 'hazards',
      question: "Have you ever identified a hazard that wasn't on the hazard assessment?",
      keyPoints: ['yes/no', 'reported', 'documented', 'updated', 'supervisor'],
      difficulty: 'medium',
      role: 'all'
    },
    {
      id: 'hz-6',
      elementNumber: 2,
      category: 'hazards',
      question: "What is a hazard assessment and why is it important?",
      keyPoints: ['identify hazards', 'before work', 'prevent injuries', 'controls', 'planning'],
      difficulty: 'easy',
      role: 'all'
    },
    {
      id: 'hz-7',
      elementNumber: 3,
      category: 'hazards',
      question: "Can you explain the hierarchy of controls?",
      keyPoints: ['elimination', 'substitution', 'engineering controls', 'administrative controls', 'PPE', 'order'],
      difficulty: 'hard',
      role: 'supervisor'
    }
  ],

  // Training (Element 4, 8)
  training: [
    {
      id: 'tr-1',
      elementNumber: 8,
      category: 'training',
      question: "What safety training have you received?",
      keyPoints: ['orientation', 'WHMIS', 'job-specific', 'fall protection', 'first aid', 'equipment'],
      difficulty: 'easy',
      role: 'all'
    },
    {
      id: 'tr-2',
      elementNumber: 8,
      category: 'training',
      question: "When was your last toolbox talk or safety meeting? What was it about?",
      keyPoints: ['recent', 'topic', 'weekly', 'daily', 'participation', 'documented'],
      difficulty: 'easy',
      role: 'all'
    },
    {
      id: 'tr-3',
      elementNumber: 8,
      category: 'training',
      question: "Do you feel you have adequate training to do your job safely?",
      keyPoints: ['yes', 'confident', 'ask questions', 'ongoing', 'refresher'],
      difficulty: 'easy',
      role: 'all'
    },
    {
      id: 'tr-4',
      elementNumber: 8,
      category: 'training',
      question: "Who would you ask if you're unsure how to do something safely?",
      keyPoints: ['supervisor', 'foreman', 'H&S rep', 'coworker', 'experienced worker'],
      difficulty: 'easy',
      role: 'all'
    },
    {
      id: 'tr-5',
      elementNumber: 8,
      category: 'training',
      question: "What training certificates do you hold?",
      keyPoints: ['WHMIS', 'fall protection', 'first aid', 'equipment specific', 'current', 'valid'],
      difficulty: 'easy',
      role: 'all'
    },
    {
      id: 'tr-6',
      elementNumber: 4,
      category: 'training',
      question: "Have you been trained on the safe job procedure for your main tasks?",
      keyPoints: ['yes', 'SJP', 'documented', 'signed off', 'understand'],
      difficulty: 'medium',
      role: 'all'
    },
    {
      id: 'tr-7',
      elementNumber: 8,
      category: 'training',
      question: "How do you know when your certifications are about to expire?",
      keyPoints: ['tracking', 'notification', 'supervisor', 'card expiry', 'recertification'],
      difficulty: 'medium',
      role: 'all'
    }
  ],

  // PPE (Element 6)
  ppe: [
    {
      id: 'ppe-1',
      elementNumber: 6,
      category: 'ppe',
      question: "What PPE are you required to wear for your job?",
      keyPoints: ['hard hat', 'safety glasses', 'steel toe boots', 'gloves', 'hi-vis', 'hearing protection'],
      difficulty: 'easy',
      role: 'all'
    },
    {
      id: 'ppe-2',
      elementNumber: 6,
      category: 'ppe',
      question: "Where do you get your PPE if it's damaged or worn out?",
      keyPoints: ['supervisor', 'supply room', 'company provides', 'request', 'replacement'],
      difficulty: 'easy',
      role: 'all'
    },
    {
      id: 'ppe-3',
      elementNumber: 6,
      category: 'ppe',
      question: "How do you know when to replace your PPE?",
      keyPoints: ['inspect', 'damaged', 'worn', 'manufacturer guidelines', 'expiry', 'visual check'],
      difficulty: 'medium',
      role: 'all'
    },
    {
      id: 'ppe-4',
      elementNumber: 6,
      category: 'ppe',
      question: "Have you been fit-tested for respiratory protection?",
      keyPoints: ['yes/no', 'fit test', 'annual', 'documented', 'seal check'],
      difficulty: 'medium',
      role: 'all'
    },
    {
      id: 'ppe-5',
      elementNumber: 6,
      category: 'ppe',
      question: "What do you do if you see someone not wearing required PPE?",
      keyPoints: ['remind them', 'report', 'supervisor', 'speak up', 'safety concern'],
      difficulty: 'medium',
      role: 'all'
    },
    {
      id: 'ppe-6',
      elementNumber: 6,
      category: 'ppe',
      question: "Do you inspect your PPE before each use?",
      keyPoints: ['yes', 'daily', 'before use', 'visual inspection', 'condition'],
      difficulty: 'easy',
      role: 'all'
    },
    {
      id: 'ppe-7',
      elementNumber: 6,
      category: 'ppe',
      question: "How were you trained on the proper use of your PPE?",
      keyPoints: ['orientation', 'supervisor', 'demonstration', 'hands-on', 'documented'],
      difficulty: 'medium',
      role: 'all'
    }
  ],

  // Equipment (Element 7, 13)
  equipment: [
    {
      id: 'eq-1',
      elementNumber: 7,
      category: 'equipment',
      question: "Do you inspect your equipment before use? What do you check?",
      keyPoints: ['yes', 'pre-use inspection', 'checklist', 'damage', 'function', 'safety devices'],
      difficulty: 'easy',
      role: 'all'
    },
    {
      id: 'eq-2',
      elementNumber: 7,
      category: 'equipment',
      question: "What do you do if you find defective equipment?",
      keyPoints: ['tag out', 'report', 'don\'t use', 'remove from service', 'supervisor', 'document'],
      difficulty: 'easy',
      role: 'all'
    },
    {
      id: 'eq-3',
      elementNumber: 7,
      category: 'equipment',
      question: "Where is the equipment inspection log kept?",
      keyPoints: ['location', 'documented', 'accessible', 'forms', 'records'],
      difficulty: 'medium',
      role: 'all'
    },
    {
      id: 'eq-4',
      elementNumber: 8,
      category: 'equipment',
      question: "Have you been trained on all the equipment you use?",
      keyPoints: ['yes', 'certified', 'documented', 'competent', 'authorized'],
      difficulty: 'easy',
      role: 'all'
    },
    {
      id: 'eq-5',
      elementNumber: 7,
      category: 'equipment',
      question: "What would you do if you saw someone using equipment incorrectly?",
      keyPoints: ['stop work', 'speak up', 'report', 'correct', 'supervisor', 'safety'],
      difficulty: 'medium',
      role: 'all'
    },
    {
      id: 'eq-6',
      elementNumber: 7,
      category: 'equipment',
      question: "How often is major equipment inspected or serviced?",
      keyPoints: ['regular schedule', 'maintenance', 'documented', 'certified', 'manufacturer'],
      difficulty: 'medium',
      role: 'supervisor'
    },
    {
      id: 'eq-7',
      elementNumber: 7,
      category: 'equipment',
      question: "What does the lockout/tagout procedure involve?",
      keyPoints: ['isolate energy', 'lock', 'tag', 'verify', 'authorized', 'zero energy'],
      difficulty: 'hard',
      role: 'all'
    }
  ],

  // Emergency Preparedness (Element 11)
  emergency: [
    {
      id: 'em-1',
      elementNumber: 11,
      category: 'emergency',
      question: "What do you do if the fire alarm sounds?",
      keyPoints: ['stop work', 'evacuate', 'nearest exit', 'muster point', 'don\'t use elevator', 'assembly'],
      difficulty: 'easy',
      role: 'all'
    },
    {
      id: 'em-2',
      elementNumber: 11,
      category: 'emergency',
      question: "Where is the assembly point or muster area?",
      keyPoints: ['specific location', 'parking lot', 'designated area', 'away from building'],
      difficulty: 'easy',
      role: 'all'
    },
    {
      id: 'em-3',
      elementNumber: 11,
      category: 'emergency',
      question: "Where is the nearest first aid kit?",
      keyPoints: ['specific location', 'accessible', 'marked', 'know location'],
      difficulty: 'easy',
      role: 'all'
    },
    {
      id: 'em-4',
      elementNumber: 11,
      category: 'emergency',
      question: "Who is the first aid attendant on site?",
      keyPoints: ['name', 'certified', 'know who', 'multiple people'],
      difficulty: 'easy',
      role: 'all'
    },
    {
      id: 'em-5',
      elementNumber: 11,
      category: 'emergency',
      question: "What's the emergency phone number for this site?",
      keyPoints: ['911', 'site specific', 'posted', 'know number'],
      difficulty: 'easy',
      role: 'all'
    },
    {
      id: 'em-6',
      elementNumber: 11,
      category: 'emergency',
      question: "Have you participated in an emergency drill recently?",
      keyPoints: ['yes', 'fire drill', 'evacuation', 'participated', 'documented'],
      difficulty: 'easy',
      role: 'all'
    },
    {
      id: 'em-7',
      elementNumber: 11,
      category: 'emergency',
      question: "What would you do if a coworker was seriously injured?",
      keyPoints: ['call for help', 'first aid', 'don\'t move', 'notify supervisor', '911', 'stay calm'],
      difficulty: 'medium',
      role: 'all'
    }
  ],

  // Incidents (Element 10)
  incidents: [
    {
      id: 'in-1',
      elementNumber: 10,
      category: 'incidents',
      question: "Have you witnessed or been involved in any incidents here?",
      keyPoints: ['details if yes', 'reported', 'investigated', 'no is okay'],
      difficulty: 'easy',
      role: 'all'
    },
    {
      id: 'in-2',
      elementNumber: 10,
      category: 'incidents',
      question: "How do you report an injury or incident?",
      keyPoints: ['supervisor', 'form', 'immediately', 'documented', 'first aid log'],
      difficulty: 'easy',
      role: 'all'
    },
    {
      id: 'in-3',
      elementNumber: 10,
      category: 'incidents',
      question: "What happens after an incident is reported?",
      keyPoints: ['investigation', 'root cause', 'corrective action', 'documented', 'prevent recurrence'],
      difficulty: 'medium',
      role: 'all'
    },
    {
      id: 'in-4',
      elementNumber: 10,
      category: 'incidents',
      question: "What is a near-miss? Can you give an example?",
      keyPoints: ['close call', 'could have caused injury', 'no injury', 'example', 'still report'],
      difficulty: 'easy',
      role: 'all'
    },
    {
      id: 'in-5',
      elementNumber: 10,
      category: 'incidents',
      question: "If you cut your finger at work, what would you do?",
      keyPoints: ['first aid', 'report', 'supervisor', 'document', 'first aid log'],
      difficulty: 'easy',
      role: 'all'
    },
    {
      id: 'in-6',
      elementNumber: 10,
      category: 'incidents',
      question: "Why is it important to report near-misses?",
      keyPoints: ['prevent future incidents', 'identify hazards', 'improve safety', 'learning opportunity'],
      difficulty: 'medium',
      role: 'all'
    },
    {
      id: 'in-7',
      elementNumber: 10,
      category: 'incidents',
      question: "Have you ever been part of an incident investigation?",
      keyPoints: ['details if yes', 'root cause', 'witness', 'interview', 'corrective actions'],
      difficulty: 'medium',
      role: 'all'
    }
  ],

  // Company Culture (Element 14)
  culture: [
    {
      id: 'cu-1',
      elementNumber: 14,
      category: 'culture',
      question: "Does management support safety here? How do you know?",
      keyPoints: ['resources', 'meetings', 'visible', 'listens', 'takes action', 'priority'],
      difficulty: 'medium',
      role: 'all'
    },
    {
      id: 'cu-2',
      elementNumber: 14,
      category: 'culture',
      question: "Can you stop work if something is unsafe?",
      keyPoints: ['yes', 'no repercussions', 'encouraged', 'supported', 'right'],
      difficulty: 'easy',
      role: 'all'
    },
    {
      id: 'cu-3',
      elementNumber: 14,
      category: 'culture',
      question: "How does your supervisor respond when you raise safety concerns?",
      keyPoints: ['listens', 'takes action', 'follows up', 'supportive', 'thanks'],
      difficulty: 'easy',
      role: 'all'
    },
    {
      id: 'cu-4',
      elementNumber: 14,
      category: 'culture',
      question: "Do you feel comfortable reporting hazards?",
      keyPoints: ['yes', 'no retaliation', 'encouraged', 'safe', 'anonymous option'],
      difficulty: 'easy',
      role: 'all'
    },
    {
      id: 'cu-5',
      elementNumber: 14,
      category: 'culture',
      question: "What would happen if you refused unsafe work?",
      keyPoints: ['investigation', 'no punishment', 'protected', 'management support', 'follow process'],
      difficulty: 'medium',
      role: 'all'
    },
    {
      id: 'cu-6',
      elementNumber: 14,
      category: 'culture',
      question: "How does the company recognize good safety behavior?",
      keyPoints: ['recognition', 'awards', 'verbal praise', 'incentives', 'positive reinforcement'],
      difficulty: 'medium',
      role: 'all'
    },
    {
      id: 'cu-7',
      elementNumber: 1,
      category: 'culture',
      question: "What is the company's safety policy in your own words?",
      keyPoints: ['everyone safe', 'no injuries', 'priority', 'responsibility', 'commitment'],
      difficulty: 'medium',
      role: 'all'
    }
  ],

  // Workplace Inspections (Element 9)
  inspections: [
    {
      id: 'wi-1',
      elementNumber: 9,
      category: 'inspections',
      question: "Have you participated in a workplace inspection?",
      keyPoints: ['yes/no', 'role', 'frequency', 'findings', 'follow-up'],
      difficulty: 'medium',
      role: 'all'
    },
    {
      id: 'wi-2',
      elementNumber: 9,
      category: 'inspections',
      question: "How often are workplace inspections done here?",
      keyPoints: ['weekly', 'monthly', 'regular', 'scheduled', 'documented'],
      difficulty: 'medium',
      role: 'all'
    },
    {
      id: 'wi-3',
      elementNumber: 9,
      category: 'inspections',
      question: "What happens when an inspection finds a hazard?",
      keyPoints: ['documented', 'corrected', 'assigned', 'timeline', 'follow-up'],
      difficulty: 'medium',
      role: 'supervisor'
    },
    {
      id: 'wi-4',
      elementNumber: 9,
      category: 'inspections',
      question: "Do you do any informal inspections of your work area?",
      keyPoints: ['daily', 'before work', 'visual check', 'report issues'],
      difficulty: 'easy',
      role: 'all'
    }
  ]
};

/**
 * Get all questions as a flat array
 */
export function getAllQuestions(): InterviewQuestion[] {
  return Object.values(COR_INTERVIEW_QUESTIONS).flat();
}

/**
 * Get questions for a specific category
 */
export function getQuestionsByCategory(category: string): InterviewQuestion[] {
  // Safe: category is a controlled string key matching the question bank categories
  // eslint-disable-next-line security/detect-object-injection
  return COR_INTERVIEW_QUESTIONS[category] || [];
}

/**
 * Get questions for a specific COR element
 */
export function getQuestionsByElement(elementNumber: number): InterviewQuestion[] {
  return getAllQuestions().filter(q => q.elementNumber === elementNumber);
}

/**
 * Get questions appropriate for a specific role
 */
export function getQuestionsByRole(role: 'worker' | 'supervisor' | 'management'): InterviewQuestion[] {
  return getAllQuestions().filter(q => q.role === 'all' || q.role === role);
}

/**
 * Select random questions for an interview
 */
export function selectQuestionsForInterview(
  auditType: 'full' | 'quick' | 'element_specific',
  role: 'worker' | 'supervisor' | 'management',
  focusElement?: number
): InterviewQuestion[] {
  let pool: InterviewQuestion[];
  let count: number;

  if (auditType === 'element_specific' && focusElement) {
    pool = getQuestionsByElement(focusElement).filter(q => q.role === 'all' || q.role === role);
    count = Math.min(8, pool.length);
  } else if (auditType === 'quick') {
    // Quick check focuses on critical areas
    pool = getQuestionsByRole(role).filter(q => 
      ['worker_rights', 'emergency', 'hazards', 'ppe'].includes(q.category)
    );
    count = 6;
  } else {
    // Full audit covers all categories
    pool = getQuestionsByRole(role);
    count = 15;
  }

  // Shuffle and select
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  
  // Try to get variety across categories
  const selectedIds = new Set<string>();
  const selected: InterviewQuestion[] = [];
  const categoryCount: Record<string, number> = {};

  for (const q of shuffled) {
    if (selected.length >= count) break;
    
    // Safe: q.category is from internal InterviewQuestion object with controlled category type
     
    const catCount = categoryCount[q.category] || 0;
    const maxPerCategory = auditType === 'full' ? 3 : 2;
    
    if (catCount < maxPerCategory && !selectedIds.has(q.id)) {
      selected.push(q);
      selectedIds.add(q.id);
      // Safe: q.category is from internal InterviewQuestion object with controlled category type
       
      categoryCount[q.category] = catCount + 1;
    }
  }

  // Fill remaining slots if needed
  for (const q of shuffled) {
    if (selected.length >= count) break;
    if (!selectedIds.has(q.id)) {
      selected.push(q);
      selectedIds.add(q.id);
    }
  }

  return selected;
}
