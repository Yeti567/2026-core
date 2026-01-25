// COR 2020 Certification Roadmap Data
// Enhanced information for each element including documentation, timelines, and dependencies

export interface CORRoadmapElement {
  number: number;
  name: string;
  description: string;
  weight: number;
  completionPercentage: number;
  
  // Documentation requirements
  requiredDocumentation: {
    type: string;
    description: string;
    examples: string[];
  }[];
  
  // Timeline estimates
  estimatedTimeline: {
    weeks: number;
    complexity: 'low' | 'medium' | 'high';
    notes: string;
  };
  
  // Dependencies
  dependencies: number[]; // Element numbers this depends on
  blocks: number[]; // Element numbers that depend on this
  
  // Recommended order
  recommendedOrder: number;
  
  // Key activities
  keyActivities: string[];
  
  // Success criteria
  successCriteria: string[];
}

export const COR_ROADMAP_ELEMENTS: CORRoadmapElement[] = [
  {
    number: 1,
    name: 'Health & Safety Policy',
    description: 'Written health and safety policy signed by senior management',
    weight: 5,
    completionPercentage: 0,
    requiredDocumentation: [
      {
        type: 'Policy Document',
        description: 'Written health and safety policy statement',
        examples: ['Company Safety Policy Document', 'Policy signed by CEO/President', 'Policy review date']
      },
      {
        type: 'Acknowledgment Records',
        description: 'Proof that workers have reviewed and acknowledged the policy',
        examples: ['Policy acknowledgment forms', 'Orientation records', 'Training certificates']
      },
      {
        type: 'Communication Evidence',
        description: 'Evidence policy is communicated to all workers',
        examples: ['Posted in workplace', 'Included in employee handbook', 'Discussed in meetings']
      }
    ],
    estimatedTimeline: {
      weeks: 2,
      complexity: 'low',
      notes: 'Foundation element - should be completed first'
    },
    dependencies: [],
    blocks: [2, 5, 8, 14],
    recommendedOrder: 1,
    keyActivities: [
      'Draft health and safety policy statement',
      'Get senior management signature',
      'Post policy in all work areas',
      'Include in employee orientation',
      'Obtain worker acknowledgments'
    ],
    successCriteria: [
      'Policy document exists and is signed',
      'Policy is posted and accessible',
      'All workers have acknowledged policy',
      'Policy reviewed annually'
    ]
  },
  {
    number: 2,
    name: 'Hazard Assessment',
    description: 'Identifying, assessing, and controlling workplace hazards',
    weight: 10,
    completionPercentage: 0,
    requiredDocumentation: [
      {
        type: 'Hazard Assessment Forms',
        description: 'Formal hazard identification and assessment records',
        examples: ['Job Hazard Analysis (JHA)', 'Hazard Assessment Checklists', 'Risk Assessment Forms']
      },
      {
        type: 'Hazard Control Records',
        description: 'Documentation of hazard controls implemented',
        examples: ['Control measure documentation', 'Engineering controls', 'Administrative controls']
      },
      {
        type: 'Hazard Reporting System',
        description: 'System for workers to report hazards',
        examples: ['Hazard report forms', 'Near miss reports', 'Corrective action records']
      }
    ],
    estimatedTimeline: {
      weeks: 4,
      complexity: 'high',
      notes: 'Requires thorough workplace review and worker involvement'
    },
    dependencies: [1],
    blocks: [3, 4, 6, 9],
    recommendedOrder: 2,
    keyActivities: [
      'Conduct comprehensive workplace hazard assessment',
      'Document all identified hazards',
      'Assess risk levels (probability × severity)',
      'Develop control measures',
      'Implement controls and verify effectiveness',
      'Train workers on hazard identification'
    ],
    successCriteria: [
      'All work areas assessed',
      'Hazards documented and rated',
      'Controls implemented and effective',
      'Workers trained on hazard reporting'
    ]
  },
  {
    number: 3,
    name: 'Safe Work Practices',
    description: 'Written safe work procedures and practices',
    weight: 10,
    completionPercentage: 0,
    requiredDocumentation: [
      {
        type: 'Safe Work Practice Documents',
        description: 'Written procedures for common work activities',
        examples: ['SWP for concrete pouring', 'SWP for equipment operation', 'SWP for material handling']
      },
      {
        type: 'Training Records',
        description: 'Records of worker training on safe work practices',
        examples: ['Training attendance records', 'Competency assessments', 'Refresher training logs']
      },
      {
        type: 'Compliance Evidence',
        description: 'Evidence that safe work practices are followed',
        examples: ['Inspection reports', 'Observation records', 'Corrective action logs']
      }
    ],
    estimatedTimeline: {
      weeks: 6,
      complexity: 'high',
      notes: 'Must be based on hazard assessments - develop for all critical tasks'
    },
    dependencies: [2],
    blocks: [4],
    recommendedOrder: 3,
    keyActivities: [
      'Identify critical work tasks',
      'Develop safe work practices for each task',
      'Review with workers and supervisors',
      'Train all affected workers',
      'Monitor compliance through inspections',
      'Update practices based on incidents/feedback'
    ],
    successCriteria: [
      'SWPs documented for all critical tasks',
      'Workers trained and competent',
      'SWPs accessible in work areas',
      'Compliance verified through observations'
    ]
  },
  {
    number: 4,
    name: 'Safe Job Procedures',
    description: 'Step-by-step safe job procedures for critical tasks',
    weight: 10,
    completionPercentage: 0,
    requiredDocumentation: [
      {
        type: 'Safe Job Procedure Documents',
        description: 'Detailed step-by-step procedures for high-risk tasks',
        examples: ['SJP for lockout/tagout', 'SJP for working at heights', 'SJP for confined space entry']
      },
      {
        type: 'Task Analysis Records',
        description: 'Breakdown of tasks into steps with hazards',
        examples: ['Task breakdown forms', 'Step-by-step procedures', 'Hazard identification per step']
      },
      {
        type: 'Worker Competency',
        description: 'Evidence workers can perform tasks safely',
        examples: ['Competency assessments', 'Practical evaluations', 'Supervisor sign-offs']
      }
    ],
    estimatedTimeline: {
      weeks: 8,
      complexity: 'high',
      notes: 'Focus on high-risk tasks first - requires detailed analysis'
    },
    dependencies: [2, 3],
    blocks: [],
    recommendedOrder: 4,
    keyActivities: [
      'Identify high-risk critical tasks',
      'Break down tasks into steps',
      'Identify hazards at each step',
      'Develop control measures',
      'Write step-by-step procedures',
      'Train workers and verify competency',
      'Review and update procedures regularly'
    ],
    successCriteria: [
      'SJPs exist for all high-risk tasks',
      'Procedures are clear and step-by-step',
      'Workers trained and competent',
      'Procedures reviewed and updated'
    ]
  },
  {
    number: 5,
    name: 'Company Safety Rules',
    description: 'Established safety rules and enforcement procedures',
    weight: 5,
    completionPercentage: 0,
    requiredDocumentation: [
      {
        type: 'Safety Rules Document',
        description: 'Written company safety rules',
        examples: ['General safety rules', 'Site-specific rules', 'Equipment-specific rules']
      },
      {
        type: 'Discipline Policy',
        description: 'Progressive discipline system for rule violations',
        examples: ['Disciplinary action policy', 'Violation tracking', 'Progressive discipline records']
      },
      {
        type: 'Communication Records',
        description: 'Evidence rules are communicated',
        examples: ['Orientation records', 'Training certificates', 'Posted rules']
      }
    ],
    estimatedTimeline: {
      weeks: 2,
      complexity: 'low',
      notes: 'Can be developed in parallel with other elements'
    },
    dependencies: [1],
    blocks: [],
    recommendedOrder: 5,
    keyActivities: [
      'Develop company safety rules',
      'Establish progressive discipline system',
      'Communicate rules to all workers',
      'Post rules in work areas',
      'Enforce rules consistently',
      'Document violations and actions'
    ],
    successCriteria: [
      'Safety rules documented',
      'Discipline system in place',
      'Rules communicated and posted',
      'Consistent enforcement'
    ]
  },
  {
    number: 6,
    name: 'Personal Protective Equipment',
    description: 'PPE selection, provision, training, and use',
    weight: 5,
    completionPercentage: 0,
    requiredDocumentation: [
      {
        type: 'PPE Assessment',
        description: 'Hazard assessment for PPE requirements',
        examples: ['PPE hazard assessment forms', 'Task-specific PPE requirements']
      },
      {
        type: 'PPE Issuance Records',
        description: 'Records of PPE provided to workers',
        examples: ['PPE issuance forms', 'Equipment tracking', 'Replacement records']
      },
      {
        type: 'Training Records',
        description: 'Training on proper PPE use and maintenance',
        examples: ['PPE training certificates', 'Fit testing records', 'Inspection training']
      }
    ],
    estimatedTimeline: {
      weeks: 3,
      complexity: 'medium',
      notes: 'Requires hazard assessment completion'
    },
    dependencies: [2],
    blocks: [],
    recommendedOrder: 6,
    keyActivities: [
      'Assess PPE requirements for all tasks',
      'Select appropriate PPE',
      'Procure and issue PPE to workers',
      'Train workers on proper use',
      'Conduct fit testing where required',
      'Establish inspection and maintenance program',
      'Monitor compliance'
    ],
    successCriteria: [
      'PPE requirements assessed',
      'Appropriate PPE provided',
      'Workers trained and fitted',
      'Inspection program in place',
      'Compliance verified'
    ]
  },
  {
    number: 7,
    name: 'Preventative Maintenance',
    description: 'Equipment maintenance and inspection programs',
    weight: 5,
    completionPercentage: 0,
    requiredDocumentation: [
      {
        type: 'Maintenance Program',
        description: 'Written preventative maintenance program',
        examples: ['PM schedule', 'Equipment maintenance procedures', 'Maintenance frequency']
      },
      {
        type: 'Inspection Records',
        description: 'Regular equipment inspection documentation',
        examples: ['Daily inspection logs', 'Pre-use inspections', 'Monthly maintenance records']
      },
      {
        type: 'Maintenance Logs',
        description: 'Records of maintenance performed',
        examples: ['Maintenance work orders', 'Repair records', 'Equipment history']
      }
    ],
    estimatedTimeline: {
      weeks: 4,
      complexity: 'medium',
      notes: 'Requires equipment inventory and scheduling'
    },
    dependencies: [],
    blocks: [],
    recommendedOrder: 7,
    keyActivities: [
      'Inventory all equipment',
      'Develop maintenance schedules',
      'Create inspection checklists',
      'Train workers on inspections',
      'Establish maintenance tracking system',
      'Document all maintenance activities',
      'Remove defective equipment from service'
    ],
    successCriteria: [
      'PM program documented',
      'Schedules established',
      'Inspections conducted regularly',
      'Maintenance documented',
      'Defective equipment removed'
    ]
  },
  {
    number: 8,
    name: 'Training & Communication',
    description: 'Safety training and communication programs',
    weight: 10,
    completionPercentage: 0,
    requiredDocumentation: [
      {
        type: 'Training Program',
        description: 'Formal safety training program',
        examples: ['Training matrix', 'Training curriculum', 'Competency requirements']
      },
      {
        type: 'Training Records',
        description: 'Records of all safety training',
        examples: ['Training attendance', 'Certificates', 'Competency assessments', 'Refresher training']
      },
      {
        type: 'Communication Records',
        description: 'Evidence of safety communication',
        examples: ['Toolbox talks', 'Safety meetings', 'Bulletins', 'Newsletters']
      }
    ],
    estimatedTimeline: {
      weeks: 6,
      complexity: 'high',
      notes: 'Ongoing element - requires continuous effort'
    },
    dependencies: [1],
    blocks: [3, 4, 6],
    recommendedOrder: 8,
    keyActivities: [
      'Develop training matrix',
      'Create training materials',
      'Conduct orientation training',
      'Provide task-specific training',
      'Schedule regular toolbox talks',
      'Hold monthly safety meetings',
      'Maintain training records',
      'Assess competency'
    ],
    successCriteria: [
      'Training program documented',
      'All workers trained',
      'Training records maintained',
      'Regular communication occurring',
      'Competency verified'
    ]
  },
  {
    number: 9,
    name: 'Workplace Inspections',
    description: 'Regular workplace safety inspections',
    weight: 10,
    completionPercentage: 0,
    requiredDocumentation: [
      {
        type: 'Inspection Program',
        description: 'Written inspection program',
        examples: ['Inspection schedule', 'Inspection checklists', 'Frequency requirements']
      },
      {
        type: 'Inspection Reports',
        description: 'Completed inspection forms',
        examples: ['Daily inspections', 'Weekly inspections', 'Monthly comprehensive inspections']
      },
      {
        type: 'Corrective Action Records',
        description: 'Documentation of actions taken on findings',
        examples: ['Corrective action forms', 'Follow-up inspections', 'Completion verification']
      }
    ],
    estimatedTimeline: {
      weeks: 4,
      complexity: 'medium',
      notes: 'Requires hazard assessment to know what to inspect'
    },
    dependencies: [2],
    blocks: [],
    recommendedOrder: 9,
    keyActivities: [
      'Develop inspection checklists',
      'Establish inspection schedule',
      'Train inspectors',
      'Conduct regular inspections',
      'Document all findings',
      'Assign corrective actions',
      'Follow up on completion',
      'Review inspection trends'
    ],
    successCriteria: [
      'Inspection program documented',
      'Inspections conducted on schedule',
      'Findings documented',
      'Corrective actions completed',
      'Trends analyzed'
    ]
  },
  {
    number: 10,
    name: 'Incident Investigation',
    description: 'Incident reporting, investigation, and corrective actions',
    weight: 10,
    completionPercentage: 0,
    requiredDocumentation: [
      {
        type: 'Incident Reporting System',
        description: 'System for reporting incidents',
        examples: ['Incident report forms', 'Near miss forms', 'First aid forms']
      },
      {
        type: 'Investigation Reports',
        description: 'Completed incident investigations',
        examples: ['Investigation forms', 'Root cause analysis', 'Witness statements']
      },
      {
        type: 'Corrective Action Records',
        description: 'Actions taken to prevent recurrence',
        examples: ['Corrective action plans', 'Implementation records', 'Effectiveness verification']
      }
    ],
    estimatedTimeline: {
      weeks: 3,
      complexity: 'medium',
      notes: 'System must be ready before incidents occur'
    },
    dependencies: [],
    blocks: [],
    recommendedOrder: 10,
    keyActivities: [
      'Develop incident reporting procedures',
      'Create investigation forms',
      'Train investigators',
      'Establish reporting requirements',
      'Investigate all incidents',
      'Identify root causes',
      'Develop corrective actions',
      'Implement and verify effectiveness'
    ],
    successCriteria: [
      'Reporting system in place',
      'All incidents investigated',
      'Root causes identified',
      'Corrective actions implemented',
      'Effectiveness verified'
    ]
  },
  {
    number: 11,
    name: 'Emergency Preparedness',
    description: 'Emergency response plans, drills, and equipment',
    weight: 5,
    completionPercentage: 0,
    requiredDocumentation: [
      {
        type: 'Emergency Response Plan',
        description: 'Written emergency response procedures',
        examples: ['Fire evacuation plan', 'Medical emergency plan', 'Severe weather plan']
      },
      {
        type: 'Drill Records',
        description: 'Documentation of emergency drills',
        examples: ['Fire drill logs', 'Evacuation drill records', 'Drill evaluation forms']
      },
      {
        type: 'Equipment Records',
        description: 'Emergency equipment inspection and maintenance',
        examples: ['Fire extinguisher inspections', 'First aid kit logs', 'Emergency equipment checks']
      }
    ],
    estimatedTimeline: {
      weeks: 3,
      complexity: 'medium',
      notes: 'Can be developed independently'
    },
    dependencies: [],
    blocks: [],
    recommendedOrder: 11,
    keyActivities: [
      'Develop emergency response plans',
      'Identify emergency equipment needs',
      'Procure and install equipment',
      'Train workers on procedures',
      'Conduct regular drills',
      'Evaluate drill effectiveness',
      'Update plans based on learnings',
      'Maintain emergency equipment'
    ],
    successCriteria: [
      'Emergency plans documented',
      'Workers trained',
      'Drills conducted regularly',
      'Equipment maintained',
      'Plans updated as needed'
    ]
  },
  {
    number: 12,
    name: 'Statistics & Records',
    description: 'Safety statistics tracking and record keeping',
    weight: 5,
    completionPercentage: 0,
    requiredDocumentation: [
      {
        type: 'Injury Records',
        description: 'Records of workplace injuries',
        examples: ['Injury logs', 'First aid records', 'WSIB forms']
      },
      {
        type: 'Statistics Reports',
        description: 'Safety performance statistics',
        examples: ['Monthly statistics', 'Leading indicators', 'Lagging indicators']
      },
      {
        type: 'Record Keeping System',
        description: 'System for maintaining safety records',
        examples: ['Record retention policy', 'Filing system', 'Electronic records']
      }
    ],
    estimatedTimeline: {
      weeks: 2,
      complexity: 'low',
      notes: 'Requires incident reporting system to be in place'
    },
    dependencies: [10],
    blocks: [14],
    recommendedOrder: 12,
    keyActivities: [
      'Establish record keeping system',
      'Set up statistics tracking',
      'Document all injuries',
      'Calculate safety statistics',
      'Report statistics regularly',
      'Use statistics for improvement',
      'Maintain records per requirements'
    ],
    successCriteria: [
      'Records maintained',
      'Statistics calculated',
      'Reports generated',
      'Statistics used for improvement',
      'Records retained properly'
    ]
  },
  {
    number: 13,
    name: 'Legislation & Compliance',
    description: 'Compliance with health and safety legislation',
    weight: 5,
    completionPercentage: 0,
    requiredDocumentation: [
      {
        type: 'Compliance Checklist',
        description: 'Checklist of regulatory requirements',
        examples: ['OHSA compliance checklist', 'Regulatory requirements list']
      },
      {
        type: 'Legislation Access',
        description: 'Evidence legislation is accessible',
        examples: ['Posted legislation', 'Reference materials', 'Online access']
      },
      {
        type: 'Compliance Records',
        description: 'Records demonstrating compliance',
        examples: ['Inspection reports', 'Training records', 'Documentation']
      }
    ],
    estimatedTimeline: {
      weeks: 3,
      complexity: 'medium',
      notes: 'Ongoing - requires staying current with regulations'
    },
    dependencies: [],
    blocks: [],
    recommendedOrder: 13,
    keyActivities: [
      'Identify applicable legislation',
      'Create compliance checklist',
      'Assess current compliance',
      'Address gaps',
      'Make legislation accessible',
      'Train on regulatory requirements',
      'Monitor regulatory changes',
      'Update programs as needed'
    ],
    successCriteria: [
      'Legislation identified',
      'Compliance assessed',
      'Gaps addressed',
      'Legislation accessible',
      'Compliance maintained'
    ]
  },
  {
    number: 14,
    name: 'Management Review',
    description: 'Regular management review of safety program',
    weight: 5,
    completionPercentage: 0,
    requiredDocumentation: [
      {
        type: 'Review Records',
        description: 'Documentation of management reviews',
        examples: ['Management review minutes', 'Review agendas', 'Action items']
      },
      {
        type: 'Meeting Minutes',
        description: 'Safety meeting documentation',
        examples: ['Monthly safety meeting minutes', 'Annual review records']
      },
      {
        type: 'Improvement Plans',
        description: 'Plans for program improvement',
        examples: ['Action plans', 'Improvement initiatives', 'Resource allocation']
      }
    ],
    estimatedTimeline: {
      weeks: 2,
      complexity: 'low',
      notes: 'Requires other elements to be in place for meaningful review'
    },
    dependencies: [1, 12],
    blocks: [],
    recommendedOrder: 14,
    keyActivities: [
      'Schedule regular management reviews',
      'Review safety performance',
      'Analyze statistics and trends',
      'Identify improvement opportunities',
      'Allocate resources',
      'Document decisions',
      'Follow up on action items',
      'Demonstrate commitment'
    ],
    successCriteria: [
      'Reviews conducted regularly',
      'Performance analyzed',
      'Improvements identified',
      'Resources allocated',
      'Commitment demonstrated'
    ]
  }
];

// Calculate recommended path through elements
export function getRecommendedPath(): CORRoadmapElement[] {
  return [...COR_ROADMAP_ELEMENTS].sort((a, b) => a.recommendedOrder - b.recommendedOrder);
}

// Get element dependencies tree
export function getDependencyTree(elementNumber: number): number[] {
  const element = COR_ROADMAP_ELEMENTS.find(e => e.number === elementNumber);
  if (!element) return [];
  
  const dependencies: number[] = [];
  const visited = new Set<number>();
  
  function collectDeps(num: number) {
    if (visited.has(num)) return;
    visited.add(num);
    
    const el = COR_ROADMAP_ELEMENTS.find(e => e.number === num);
    if (el) {
      el.dependencies.forEach(dep => {
        dependencies.push(dep);
        collectDeps(dep);
      });
    }
  }
  
  collectDeps(elementNumber);
  return dependencies.reverse(); // Return in dependency order
}

// Calculate total timeline
export function calculateTotalTimeline(): { weeks: number; months: number } {
  // Account for parallel work
  const criticalPath = getRecommendedPath();
  let totalWeeks = 0;
  
  // Simple calculation - can be enhanced with critical path analysis
  criticalPath.forEach(element => {
    // If element has dependencies, some work can be parallel
    if (element.dependencies.length === 0) {
      totalWeeks += element.estimatedTimeline.weeks;
    } else {
      // Add only the incremental time (assuming dependencies done in parallel)
      totalWeeks += Math.max(element.estimatedTimeline.weeks - 2, element.estimatedTimeline.weeks * 0.5);
    }
  });
  
  return {
    weeks: Math.ceil(totalWeeks),
    months: Math.ceil(totalWeeks / 4.33)
  };
}
