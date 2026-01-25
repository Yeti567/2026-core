-- ============================================================================
-- Form Builder Seed Data - Global Form Templates
-- ============================================================================
-- Inserts 10 high-frequency COR compliance forms as global templates.
-- Companies can clone and customize these for their specific needs.
-- ============================================================================

-- ============================================================================
-- 1. HAZARD REPORTING FORM (COR Element 3)
-- ============================================================================
-- Used daily by workers to report hazards they identify

INSERT INTO form_templates (id, company_id, form_code, name, description, cor_element, frequency, estimated_time_minutes, icon, color, is_mandatory)
VALUES (
    'f0000001-0000-0000-0000-000000000001',
    NULL, -- Global template
    'hazard_report',
    'Hazard Report',
    'Report workplace hazards for immediate attention and tracking',
    3,
    'as_needed',
    5,
    'alert-triangle',
    '#ef4444',
    true
);

-- Sections
INSERT INTO form_sections (id, form_template_id, title, description, order_index)
VALUES 
    ('s1000001-0001-0000-0000-000000000001', 'f0000001-0000-0000-0000-000000000001', 'Location & Timing', 'Where and when was the hazard observed?', 1),
    ('s1000001-0001-0000-0000-000000000002', 'f0000001-0000-0000-0000-000000000001', 'Hazard Details', 'Describe the hazard in detail', 2),
    ('s1000001-0001-0000-0000-000000000003', 'f0000001-0000-0000-0000-000000000001', 'Risk Assessment', 'Evaluate the risk level', 3),
    ('s1000001-0001-0000-0000-000000000004', 'f0000001-0000-0000-0000-000000000001', 'Immediate Actions', 'What was done to address the hazard?', 4);

-- Fields
INSERT INTO form_fields (form_section_id, field_code, label, field_type, validation_rules, order_index, width) VALUES
    ('s1000001-0001-0000-0000-000000000001', 'jobsite', 'Jobsite', 'jobsite_select', '{"required": true}', 1, 'half'),
    ('s1000001-0001-0000-0000-000000000001', 'location_detail', 'Specific Location', 'text', '{"required": true, "min_length": 5}', 2, 'half'),
    ('s1000001-0001-0000-0000-000000000001', 'date_observed', 'Date Observed', 'date', '{"required": true}', 3, 'half'),
    ('s1000001-0001-0000-0000-000000000001', 'time_observed', 'Time Observed', 'time', '{"required": true}', 4, 'half'),
    ('s1000001-0001-0000-0000-000000000002', 'hazard_type', 'Hazard Type', 'dropdown', '{"required": true}', 1, 'half'),
    ('s1000001-0001-0000-0000-000000000002', 'description', 'Hazard Description', 'textarea', '{"required": true, "min_length": 20}', 2, 'full'),
    ('s1000001-0001-0000-0000-000000000002', 'photo', 'Photo Evidence', 'photo', '{"required": false}', 3, 'full'),
    ('s1000001-0001-0000-0000-000000000003', 'severity', 'Severity', 'dropdown', '{"required": true}', 1, 'half'),
    ('s1000001-0001-0000-0000-000000000003', 'likelihood', 'Likelihood', 'dropdown', '{"required": true}', 2, 'half'),
    ('s1000001-0001-0000-0000-000000000004', 'immediate_action', 'Immediate Action Taken', 'textarea', '{"required": true}', 1, 'full'),
    ('s1000001-0001-0000-0000-000000000004', 'area_secured', 'Area Secured?', 'yes_no', '{"required": true}', 2, 'half'),
    ('s1000001-0001-0000-0000-000000000004', 'reporter_signature', 'Your Signature', 'signature', '{"required": true}', 3, 'full');

-- Update options for dropdown fields
UPDATE form_fields SET options = '["Slip/Trip/Fall", "Struck By", "Caught In/Between", "Electrical", "Chemical", "Fire/Explosion", "Ergonomic", "Working at Heights", "Confined Space", "Other"]'
WHERE field_code = 'hazard_type' AND form_section_id = 's1000001-0001-0000-0000-000000000002';

UPDATE form_fields SET options = '[{"value": "1", "label": "Minor - First aid only"}, {"value": "2", "label": "Moderate - Medical treatment"}, {"value": "3", "label": "Serious - Lost time"}, {"value": "4", "label": "Critical - Permanent disability"}, {"value": "5", "label": "Catastrophic - Fatality possible"}]'
WHERE field_code = 'severity' AND form_section_id = 's1000001-0001-0000-0000-000000000003';

UPDATE form_fields SET options = '[{"value": "1", "label": "Rare"}, {"value": "2", "label": "Unlikely"}, {"value": "3", "label": "Possible"}, {"value": "4", "label": "Likely"}, {"value": "5", "label": "Almost Certain"}]'
WHERE field_code = 'likelihood' AND form_section_id = 's1000001-0001-0000-0000-000000000003';

-- Workflow
INSERT INTO form_workflows (form_template_id, submit_to_role, notify_roles, sync_priority, auto_create_evidence, evidence_audit_element, creates_task, task_template)
VALUES (
    'f0000001-0000-0000-0000-000000000001',
    'supervisor',
    ARRAY['safety_manager'],
    1,
    true,
    'Element 3',
    true,
    '{"title": "Review Hazard Report", "assigned_to_role": "supervisor", "due_days": 1, "priority": "high"}'
);


-- ============================================================================
-- 2. DAILY SITE INSPECTION (COR Element 7)
-- ============================================================================

INSERT INTO form_templates (id, company_id, form_code, name, description, cor_element, frequency, estimated_time_minutes, icon, color, is_mandatory)
VALUES (
    'f0000001-0000-0000-0000-000000000002',
    NULL,
    'daily_inspection',
    'Daily Site Inspection',
    'Daily workplace inspection checklist for supervisors',
    7,
    'daily',
    15,
    'clipboard-check',
    '#3b82f6',
    true
);

INSERT INTO form_sections (id, form_template_id, title, description, order_index)
VALUES 
    ('s1000002-0001-0000-0000-000000000001', 'f0000001-0000-0000-0000-000000000002', 'Site Information', NULL, 1),
    ('s1000002-0001-0000-0000-000000000002', 'f0000001-0000-0000-0000-000000000002', 'Housekeeping', 'General cleanliness and organization', 2),
    ('s1000002-0001-0000-0000-000000000003', 'f0000001-0000-0000-0000-000000000002', 'Fire Safety', 'Fire prevention and equipment', 3),
    ('s1000002-0001-0000-0000-000000000004', 'f0000001-0000-0000-0000-000000000002', 'PPE Compliance', 'Personal protective equipment', 4),
    ('s1000002-0001-0000-0000-000000000005', 'f0000001-0000-0000-0000-000000000002', 'Hazards Found', 'Document any issues discovered', 5),
    ('s1000002-0001-0000-0000-000000000006', 'f0000001-0000-0000-0000-000000000002', 'Sign-Off', NULL, 6);

INSERT INTO form_fields (form_section_id, field_code, label, field_type, validation_rules, order_index, width) VALUES
    ('s1000002-0001-0000-0000-000000000001', 'jobsite', 'Jobsite', 'jobsite_select', '{"required": true}', 1, 'half'),
    ('s1000002-0001-0000-0000-000000000001', 'inspection_date', 'Date', 'date', '{"required": true}', 2, 'half'),
    ('s1000002-0001-0000-0000-000000000001', 'weather', 'Weather Conditions', 'weather', '{"required": true}', 3, 'half'),
    ('s1000002-0001-0000-0000-000000000001', 'workers_present', 'Workers on Site', 'number', '{"required": true, "min_value": 0}', 4, 'half'),
    ('s1000002-0001-0000-0000-000000000002', 'walkways_clear', 'Walkways clear of obstructions', 'yes_no_na', '{"required": true}', 1, 'half'),
    ('s1000002-0001-0000-0000-000000000002', 'materials_stored', 'Materials properly stored', 'yes_no_na', '{"required": true}', 2, 'half'),
    ('s1000002-0001-0000-0000-000000000002', 'waste_disposed', 'Waste disposed properly', 'yes_no_na', '{"required": true}', 3, 'half'),
    ('s1000002-0001-0000-0000-000000000002', 'spills_cleaned', 'No spills present', 'yes_no_na', '{"required": true}', 4, 'half'),
    ('s1000002-0001-0000-0000-000000000003', 'extinguishers_accessible', 'Fire extinguishers accessible', 'yes_no_na', '{"required": true}', 1, 'half'),
    ('s1000002-0001-0000-0000-000000000003', 'exits_clear', 'Emergency exits clear', 'yes_no_na', '{"required": true}', 2, 'half'),
    ('s1000002-0001-0000-0000-000000000003', 'no_smoking_enforced', 'No smoking policy enforced', 'yes_no_na', '{"required": true}', 3, 'half'),
    ('s1000002-0001-0000-0000-000000000003', 'flammables_stored', 'Flammables stored properly', 'yes_no_na', '{"required": true}', 4, 'half'),
    ('s1000002-0001-0000-0000-000000000004', 'hard_hats', 'Hard hats worn where required', 'yes_no_na', '{"required": true}', 1, 'half'),
    ('s1000002-0001-0000-0000-000000000004', 'safety_glasses', 'Safety glasses worn where required', 'yes_no_na', '{"required": true}', 2, 'half'),
    ('s1000002-0001-0000-0000-000000000004', 'hi_vis', 'High-visibility vests worn', 'yes_no_na', '{"required": true}', 3, 'half'),
    ('s1000002-0001-0000-0000-000000000004', 'safety_footwear', 'Safety footwear worn', 'yes_no_na', '{"required": true}', 4, 'half'),
    ('s1000002-0001-0000-0000-000000000005', 'hazards_found', 'Were any hazards found?', 'yes_no', '{"required": true}', 1, 'full'),
    ('s1000002-0001-0000-0000-000000000005', 'hazard_details', 'Describe hazards found', 'textarea', '{"required": false}', 2, 'full'),
    ('s1000002-0001-0000-0000-000000000005', 'corrective_actions', 'Corrective actions taken', 'textarea', '{"required": false}', 3, 'full'),
    ('s1000002-0001-0000-0000-000000000005', 'photos', 'Photo Evidence', 'photo', '{"required": false}', 4, 'full'),
    ('s1000002-0001-0000-0000-000000000006', 'overall_rating', 'Overall Site Rating', 'rating', '{"required": true}', 1, 'half'),
    ('s1000002-0001-0000-0000-000000000006', 'additional_notes', 'Additional Notes', 'textarea', '{"required": false}', 2, 'full'),
    ('s1000002-0001-0000-0000-000000000006', 'inspector_signature', 'Inspector Signature', 'signature', '{"required": true}', 3, 'full');

-- Conditional logic for hazard details
UPDATE form_fields SET conditional_logic = '{"field_id": "hazards_found", "operator": "equals", "value": true}'
WHERE field_code IN ('hazard_details', 'corrective_actions') AND form_section_id = 's1000002-0001-0000-0000-000000000005';

INSERT INTO form_workflows (form_template_id, submit_to_role, notify_roles, sync_priority, auto_create_evidence, evidence_audit_element)
VALUES ('f0000001-0000-0000-0000-000000000002', 'safety_manager', ARRAY['admin'], 2, true, 'Element 7');


-- ============================================================================
-- 3. TOOLBOX TALK RECORD (COR Element 8)
-- ============================================================================

INSERT INTO form_templates (id, company_id, form_code, name, description, cor_element, frequency, estimated_time_minutes, icon, color, is_mandatory)
VALUES (
    'f0000001-0000-0000-0000-000000000003',
    NULL,
    'toolbox_talk',
    'Toolbox Talk Record',
    'Document safety toolbox talks and worker attendance',
    8,
    'weekly',
    10,
    'users',
    '#10b981',
    true
);

INSERT INTO form_sections (id, form_template_id, title, description, order_index, is_repeatable)
VALUES 
    ('s1000003-0001-0000-0000-000000000001', 'f0000001-0000-0000-0000-000000000003', 'Meeting Details', NULL, 1, false),
    ('s1000003-0001-0000-0000-000000000002', 'f0000001-0000-0000-0000-000000000003', 'Topic & Content', NULL, 2, false),
    ('s1000003-0001-0000-0000-000000000003', 'f0000001-0000-0000-0000-000000000003', 'Attendees', 'Record all attendees', 3, true),
    ('s1000003-0001-0000-0000-000000000004', 'f0000001-0000-0000-0000-000000000003', 'Discussion & Sign-Off', NULL, 4, false);

UPDATE form_sections SET min_repeats = 1, max_repeats = 50 WHERE id = 's1000003-0001-0000-0000-000000000003';

INSERT INTO form_fields (form_section_id, field_code, label, field_type, validation_rules, order_index, width, options) VALUES
    ('s1000003-0001-0000-0000-000000000001', 'jobsite', 'Jobsite', 'jobsite_select', '{"required": true}', 1, 'half', NULL),
    ('s1000003-0001-0000-0000-000000000001', 'date', 'Date', 'date', '{"required": true}', 2, 'half', NULL),
    ('s1000003-0001-0000-0000-000000000001', 'start_time', 'Start Time', 'time', '{"required": true}', 3, 'half', NULL),
    ('s1000003-0001-0000-0000-000000000001', 'duration_minutes', 'Duration (minutes)', 'number', '{"required": true, "min_value": 5, "max_value": 120}', 4, 'half', NULL),
    ('s1000003-0001-0000-0000-000000000001', 'presenter', 'Presenter', 'worker_select', '{"required": true}', 5, 'half', NULL),
    ('s1000003-0001-0000-0000-000000000002', 'topic', 'Topic', 'dropdown', '{"required": true}', 1, 'full', '["PPE", "Fall Protection", "Ladder Safety", "Electrical Safety", "Heat Stress", "Cold Weather", "Housekeeping", "Fire Safety", "Manual Handling", "Hazard Communication", "Lockout/Tagout", "Confined Spaces", "Other"]'),
    ('s1000003-0001-0000-0000-000000000002', 'custom_topic', 'Custom Topic', 'text', '{"required": false}', 2, 'full', NULL),
    ('s1000003-0001-0000-0000-000000000002', 'key_points', 'Key Points Covered', 'textarea', '{"required": true, "min_length": 50}', 3, 'full', NULL),
    ('s1000003-0001-0000-0000-000000000003', 'attendee_name', 'Worker', 'worker_select', '{"required": true}', 1, 'half', NULL),
    ('s1000003-0001-0000-0000-000000000003', 'attendee_signature', 'Signature', 'signature', '{"required": true}', 2, 'half', NULL),
    ('s1000003-0001-0000-0000-000000000004', 'questions_raised', 'Questions Raised', 'textarea', '{"required": false}', 1, 'full', NULL),
    ('s1000003-0001-0000-0000-000000000004', 'action_items', 'Action Items', 'textarea', '{"required": false}', 2, 'full', NULL),
    ('s1000003-0001-0000-0000-000000000004', 'presenter_signature', 'Presenter Signature', 'signature', '{"required": true}', 3, 'full', NULL);

-- Conditional logic for custom topic
UPDATE form_fields SET conditional_logic = '{"field_id": "topic", "operator": "equals", "value": "Other"}'
WHERE field_code = 'custom_topic' AND form_section_id = 's1000003-0001-0000-0000-000000000002';

INSERT INTO form_workflows (form_template_id, submit_to_role, notify_roles, sync_priority, auto_create_evidence, evidence_audit_element)
VALUES ('f0000001-0000-0000-0000-000000000003', 'safety_manager', ARRAY[]::TEXT[], 2, true, 'Element 8');


-- ============================================================================
-- 4. INCIDENT REPORT (COR Element 10)
-- ============================================================================

INSERT INTO form_templates (id, company_id, form_code, name, description, cor_element, frequency, estimated_time_minutes, icon, color, is_mandatory)
VALUES (
    'f0000001-0000-0000-0000-000000000004',
    NULL,
    'incident_report',
    'Incident Report',
    'Report workplace incidents, injuries, and near misses',
    10,
    'as_needed',
    20,
    'alert-octagon',
    '#dc2626',
    true
);

INSERT INTO form_sections (id, form_template_id, title, description, order_index, conditional_logic)
VALUES 
    ('s1000004-0001-0000-0000-000000000001', 'f0000001-0000-0000-0000-000000000004', 'Incident Information', NULL, 1, NULL),
    ('s1000004-0001-0000-0000-000000000002', 'f0000001-0000-0000-0000-000000000004', 'Injury Details', 'Complete if injury occurred', 2, '{"field_id": "incident_type", "operator": "equals", "value": "injury"}'),
    ('s1000004-0001-0000-0000-000000000003', 'f0000001-0000-0000-0000-000000000004', 'Description', NULL, 3, NULL),
    ('s1000004-0001-0000-0000-000000000004', 'f0000001-0000-0000-0000-000000000004', 'Witnesses', NULL, 4, NULL),
    ('s1000004-0001-0000-0000-000000000005', 'f0000001-0000-0000-0000-000000000004', 'Root Cause Analysis', NULL, 5, NULL),
    ('s1000004-0001-0000-0000-000000000006', 'f0000001-0000-0000-0000-000000000004', 'Corrective Actions', NULL, 6, NULL),
    ('s1000004-0001-0000-0000-000000000007', 'f0000001-0000-0000-0000-000000000004', 'Evidence & Sign-Off', NULL, 7, NULL);

INSERT INTO form_fields (form_section_id, field_code, label, field_type, validation_rules, order_index, width, options) VALUES
    ('s1000004-0001-0000-0000-000000000001', 'incident_type', 'Incident Type', 'dropdown', '{"required": true}', 1, 'half', '[{"value": "injury", "label": "Injury"}, {"value": "near_miss", "label": "Near Miss"}, {"value": "property_damage", "label": "Property Damage"}, {"value": "environmental", "label": "Environmental"}]'),
    ('s1000004-0001-0000-0000-000000000001', 'jobsite', 'Jobsite', 'jobsite_select', '{"required": true}', 2, 'half', NULL),
    ('s1000004-0001-0000-0000-000000000001', 'incident_date', 'Date of Incident', 'date', '{"required": true}', 3, 'half', NULL),
    ('s1000004-0001-0000-0000-000000000001', 'incident_time', 'Time of Incident', 'time', '{"required": true}', 4, 'half', NULL),
    ('s1000004-0001-0000-0000-000000000001', 'specific_location', 'Specific Location', 'text', '{"required": true}', 5, 'full', NULL),
    ('s1000004-0001-0000-0000-000000000002', 'injured_worker', 'Injured Worker', 'worker_select', '{"required": true}', 1, 'half', NULL),
    ('s1000004-0001-0000-0000-000000000002', 'body_parts', 'Body Parts Affected', 'body_diagram', '{"required": true}', 2, 'full', NULL),
    ('s1000004-0001-0000-0000-000000000002', 'injury_nature', 'Nature of Injury', 'dropdown', '{"required": true}', 3, 'half', '["Cut/Laceration", "Bruise/Contusion", "Sprain/Strain", "Fracture", "Burn", "Eye Injury", "Hearing Loss", "Respiratory", "Other"]'),
    ('s1000004-0001-0000-0000-000000000002', 'first_aid_given', 'First Aid Given?', 'yes_no', '{"required": true}', 4, 'half', NULL),
    ('s1000004-0001-0000-0000-000000000002', 'medical_treatment', 'Medical Treatment Required?', 'yes_no', '{"required": true}', 5, 'half', NULL),
    ('s1000004-0001-0000-0000-000000000002', 'lost_time', 'Lost Time Injury?', 'yes_no', '{"required": true}', 6, 'half', NULL),
    ('s1000004-0001-0000-0000-000000000003', 'description', 'Description of Incident', 'textarea', '{"required": true, "min_length": 50}', 1, 'full', NULL),
    ('s1000004-0001-0000-0000-000000000003', 'activity', 'Activity at Time of Incident', 'text', '{"required": true}', 2, 'full', NULL),
    ('s1000004-0001-0000-0000-000000000003', 'equipment_involved', 'Equipment/Tools Involved', 'text', '{"required": false}', 3, 'full', NULL),
    ('s1000004-0001-0000-0000-000000000004', 'has_witnesses', 'Were there witnesses?', 'yes_no', '{"required": true}', 1, 'half', NULL),
    ('s1000004-0001-0000-0000-000000000004', 'witness_names', 'Witness Names', 'textarea', '{"required": false}', 2, 'full', NULL),
    ('s1000004-0001-0000-0000-000000000004', 'witness_statements', 'Witness Statements', 'textarea', '{"required": false}', 3, 'full', NULL),
    ('s1000004-0001-0000-0000-000000000005', 'immediate_cause', 'Immediate Cause', 'dropdown', '{"required": true}', 1, 'half', '[{"value": "unsafe_act", "label": "Unsafe Act"}, {"value": "unsafe_condition", "label": "Unsafe Condition"}, {"value": "both", "label": "Both"}]'),
    ('s1000004-0001-0000-0000-000000000005', 'contributing_factors', 'Contributing Factors', 'multiselect', '{"required": true}', 2, 'full', '["Lack of Training", "Inadequate Procedures", "Equipment Failure", "Environmental Conditions", "Time Pressure", "Fatigue", "PPE Not Worn", "PPE Inadequate", "Communication", "Supervision", "Other"]'),
    ('s1000004-0001-0000-0000-000000000005', 'root_cause', 'Root Cause Analysis', 'textarea', '{"required": true, "min_length": 30}', 3, 'full', NULL),
    ('s1000004-0001-0000-0000-000000000006', 'immediate_actions', 'Immediate Actions Taken', 'textarea', '{"required": true}', 1, 'full', NULL),
    ('s1000004-0001-0000-0000-000000000006', 'long_term_actions', 'Long-Term Corrective Actions', 'textarea', '{"required": true}', 2, 'full', NULL),
    ('s1000004-0001-0000-0000-000000000006', 'responsible_person', 'Person Responsible', 'worker_select', '{"required": true}', 3, 'half', NULL),
    ('s1000004-0001-0000-0000-000000000006', 'target_completion', 'Target Completion Date', 'date', '{"required": true}', 4, 'half', NULL),
    ('s1000004-0001-0000-0000-000000000007', 'photos', 'Incident Photos', 'photo', '{"required": false}', 1, 'full', NULL),
    ('s1000004-0001-0000-0000-000000000007', 'gps', 'GPS Location', 'gps', '{"required": false}', 2, 'full', NULL),
    ('s1000004-0001-0000-0000-000000000007', 'reporter_signature', 'Reporter Signature', 'signature', '{"required": true}', 3, 'half', NULL),
    ('s1000004-0001-0000-0000-000000000007', 'supervisor_signature', 'Supervisor Signature', 'signature', '{"required": true}', 4, 'half', NULL);

-- Conditional logic
UPDATE form_fields SET conditional_logic = '{"field_id": "has_witnesses", "operator": "equals", "value": true}'
WHERE field_code IN ('witness_names', 'witness_statements') AND form_section_id = 's1000004-0001-0000-0000-000000000004';

INSERT INTO form_workflows (form_template_id, submit_to_role, notify_roles, sync_priority, auto_create_evidence, evidence_audit_element, requires_approval, approval_workflow, creates_task, task_template)
VALUES (
    'f0000001-0000-0000-0000-000000000004',
    'safety_manager',
    ARRAY['admin', 'hr'],
    1,
    true,
    'Element 10',
    true,
    '[{"step": 1, "role": "supervisor", "required": true}, {"step": 2, "role": "safety_manager", "required": true}]',
    true,
    '{"title": "Investigate Incident", "assigned_to_role": "safety_manager", "due_days": 3, "priority": "high"}'
);


-- ============================================================================
-- 5. FIRST AID LOG (COR Element 10)
-- ============================================================================

INSERT INTO form_templates (id, company_id, form_code, name, description, cor_element, frequency, estimated_time_minutes, icon, color, is_mandatory)
VALUES (
    'f0000001-0000-0000-0000-000000000005',
    NULL,
    'first_aid_log',
    'First Aid Log',
    'Record first aid treatment provided',
    10,
    'as_needed',
    5,
    'heart-pulse',
    '#ec4899',
    true
);

INSERT INTO form_sections (id, form_template_id, title, description, order_index)
VALUES 
    ('s1000005-0001-0000-0000-000000000001', 'f0000001-0000-0000-0000-000000000005', 'Incident Details', NULL, 1),
    ('s1000005-0001-0000-0000-000000000002', 'f0000001-0000-0000-0000-000000000005', 'Treatment Provided', NULL, 2),
    ('s1000005-0001-0000-0000-000000000003', 'f0000001-0000-0000-0000-000000000005', 'Sign-Off', NULL, 3);

INSERT INTO form_fields (form_section_id, field_code, label, field_type, validation_rules, order_index, width, options) VALUES
    ('s1000005-0001-0000-0000-000000000001', 'date', 'Date', 'date', '{"required": true}', 1, 'half', NULL),
    ('s1000005-0001-0000-0000-000000000001', 'time', 'Time', 'time', '{"required": true}', 2, 'half', NULL),
    ('s1000005-0001-0000-0000-000000000001', 'injured_person', 'Injured Person', 'worker_select', '{"required": true}', 3, 'half', NULL),
    ('s1000005-0001-0000-0000-000000000001', 'jobsite', 'Jobsite', 'jobsite_select', '{"required": true}', 4, 'half', NULL),
    ('s1000005-0001-0000-0000-000000000001', 'injury_description', 'Injury Description', 'textarea', '{"required": true}', 5, 'full', NULL),
    ('s1000005-0001-0000-0000-000000000001', 'body_part', 'Body Part', 'body_diagram', '{"required": true}', 6, 'full', NULL),
    ('s1000005-0001-0000-0000-000000000002', 'treatment_type', 'Treatment Type', 'multiselect', '{"required": true}', 1, 'full', '["Bandage/Dressing", "Ice Pack", "Wound Cleaning", "Eye Wash", "Burn Treatment", "Splint/Sling", "CPR", "AED", "Medication Administered", "Other"]'),
    ('s1000005-0001-0000-0000-000000000002', 'treatment_details', 'Treatment Details', 'textarea', '{"required": true}', 2, 'full', NULL),
    ('s1000005-0001-0000-0000-000000000002', 'supplies_used', 'Supplies Used', 'text', '{"required": false}', 3, 'full', NULL),
    ('s1000005-0001-0000-0000-000000000002', 'further_treatment', 'Further Treatment Required?', 'dropdown', '{"required": true}', 4, 'full', '[{"value": "none", "label": "None - Returned to work"}, {"value": "modified", "label": "Modified duties"}, {"value": "medical", "label": "Sent for medical treatment"}, {"value": "hospital", "label": "Sent to hospital"}]'),
    ('s1000005-0001-0000-0000-000000000003', 'first_aider', 'First Aider', 'worker_select', '{"required": true}', 1, 'half', NULL),
    ('s1000005-0001-0000-0000-000000000003', 'first_aider_signature', 'First Aider Signature', 'signature', '{"required": true}', 2, 'half', NULL),
    ('s1000005-0001-0000-0000-000000000003', 'patient_signature', 'Patient Signature', 'signature', '{"required": false}', 3, 'half', NULL);

INSERT INTO form_workflows (form_template_id, submit_to_role, notify_roles, sync_priority, auto_create_evidence, evidence_audit_element)
VALUES ('f0000001-0000-0000-0000-000000000005', 'supervisor', ARRAY['safety_manager'], 1, true, 'Element 10');


-- ============================================================================
-- 6. EQUIPMENT INSPECTION (COR Element 13)
-- ============================================================================

INSERT INTO form_templates (id, company_id, form_code, name, description, cor_element, frequency, estimated_time_minutes, icon, color, is_mandatory)
VALUES (
    'f0000001-0000-0000-0000-000000000006',
    NULL,
    'equipment_inspection',
    'Equipment Pre-Use Inspection',
    'Daily equipment inspection before use',
    13,
    'daily',
    10,
    'wrench',
    '#8b5cf6',
    true
);

INSERT INTO form_sections (id, form_template_id, title, description, order_index)
VALUES 
    ('s1000006-0001-0000-0000-000000000001', 'f0000001-0000-0000-0000-000000000006', 'Equipment Information', NULL, 1),
    ('s1000006-0001-0000-0000-000000000002', 'f0000001-0000-0000-0000-000000000006', 'Inspection Checklist', NULL, 2),
    ('s1000006-0001-0000-0000-000000000003', 'f0000001-0000-0000-0000-000000000006', 'Deficiencies', 'Record any issues found', 3),
    ('s1000006-0001-0000-0000-000000000004', 'f0000001-0000-0000-0000-000000000006', 'Result & Sign-Off', NULL, 4);

INSERT INTO form_fields (form_section_id, field_code, label, field_type, validation_rules, order_index, width, options) VALUES
    ('s1000006-0001-0000-0000-000000000001', 'equipment', 'Equipment', 'equipment_select', '{"required": true}', 1, 'half', NULL),
    ('s1000006-0001-0000-0000-000000000001', 'equipment_id', 'Equipment ID/Serial', 'text', '{"required": true}', 2, 'half', NULL),
    ('s1000006-0001-0000-0000-000000000001', 'date', 'Inspection Date', 'date', '{"required": true}', 3, 'half', NULL),
    ('s1000006-0001-0000-0000-000000000001', 'jobsite', 'Jobsite', 'jobsite_select', '{"required": true}', 4, 'half', NULL),
    ('s1000006-0001-0000-0000-000000000001', 'hours_meter', 'Hour Meter Reading', 'number', '{"required": false}', 5, 'half', NULL),
    ('s1000006-0001-0000-0000-000000000002', 'visual_damage', 'No visible damage', 'yes_no_na', '{"required": true}', 1, 'half', NULL),
    ('s1000006-0001-0000-0000-000000000002', 'guards_in_place', 'All guards in place', 'yes_no_na', '{"required": true}', 2, 'half', NULL),
    ('s1000006-0001-0000-0000-000000000002', 'controls_working', 'Controls functioning', 'yes_no_na', '{"required": true}', 3, 'half', NULL),
    ('s1000006-0001-0000-0000-000000000002', 'safety_devices', 'Safety devices working', 'yes_no_na', '{"required": true}', 4, 'half', NULL),
    ('s1000006-0001-0000-0000-000000000002', 'fluid_levels', 'Fluid levels adequate', 'yes_no_na', '{"required": true}', 5, 'half', NULL),
    ('s1000006-0001-0000-0000-000000000002', 'no_leaks', 'No fluid leaks', 'yes_no_na', '{"required": true}', 6, 'half', NULL),
    ('s1000006-0001-0000-0000-000000000002', 'tires_condition', 'Tires in good condition', 'yes_no_na', '{"required": true}', 7, 'half', NULL),
    ('s1000006-0001-0000-0000-000000000002', 'lights_horn', 'Lights and horn working', 'yes_no_na', '{"required": true}', 8, 'half', NULL),
    ('s1000006-0001-0000-0000-000000000003', 'deficiencies_found', 'Deficiencies found?', 'yes_no', '{"required": true}', 1, 'full', NULL),
    ('s1000006-0001-0000-0000-000000000003', 'deficiency_details', 'Describe deficiencies', 'textarea', '{"required": false}', 2, 'full', NULL),
    ('s1000006-0001-0000-0000-000000000003', 'deficiency_photos', 'Deficiency Photos', 'photo', '{"required": false}', 3, 'full', NULL),
    ('s1000006-0001-0000-0000-000000000004', 'overall_result', 'Equipment Status', 'dropdown', '{"required": true}', 1, 'half', '[{"value": "pass", "label": "Pass - Safe to Use"}, {"value": "conditional", "label": "Conditional Pass - Minor Issues"}, {"value": "fail", "label": "Fail - Do Not Use"}]'),
    ('s1000006-0001-0000-0000-000000000004', 'out_of_service', 'Tagged Out of Service?', 'yes_no', '{"required": false}', 2, 'half', NULL),
    ('s1000006-0001-0000-0000-000000000004', 'operator_signature', 'Operator Signature', 'signature', '{"required": true}', 3, 'full', NULL);

-- Conditional logic for deficiency details
UPDATE form_fields SET conditional_logic = '{"field_id": "deficiencies_found", "operator": "equals", "value": true}'
WHERE field_code IN ('deficiency_details', 'deficiency_photos') AND form_section_id = 's1000006-0001-0000-0000-000000000003';

UPDATE form_fields SET conditional_logic = '{"field_id": "overall_result", "operator": "equals", "value": "fail"}'
WHERE field_code = 'out_of_service' AND form_section_id = 's1000006-0001-0000-0000-000000000004';

INSERT INTO form_workflows (form_template_id, submit_to_role, notify_roles, sync_priority, auto_create_evidence, evidence_audit_element, creates_task, task_template)
VALUES (
    'f0000001-0000-0000-0000-000000000006',
    'supervisor',
    ARRAY[]::TEXT[],
    2,
    true,
    'Element 13',
    false,
    NULL
);


-- ============================================================================
-- 7. EMERGENCY DRILL RECORD (COR Element 11)
-- ============================================================================

INSERT INTO form_templates (id, company_id, form_code, name, description, cor_element, frequency, estimated_time_minutes, icon, color, is_mandatory)
VALUES (
    'f0000001-0000-0000-0000-000000000007',
    NULL,
    'emergency_drill',
    'Emergency Drill Record',
    'Document emergency drills and evacuations',
    11,
    'quarterly',
    15,
    'siren',
    '#f97316',
    true
);

INSERT INTO form_sections (id, form_template_id, title, description, order_index)
VALUES 
    ('s1000007-0001-0000-0000-000000000001', 'f0000001-0000-0000-0000-000000000007', 'Drill Information', NULL, 1),
    ('s1000007-0001-0000-0000-000000000002', 'f0000001-0000-0000-0000-000000000007', 'Drill Observations', NULL, 2),
    ('s1000007-0001-0000-0000-000000000003', 'f0000001-0000-0000-0000-000000000007', 'Evaluation', NULL, 3),
    ('s1000007-0001-0000-0000-000000000004', 'f0000001-0000-0000-0000-000000000007', 'Sign-Off', NULL, 4);

INSERT INTO form_fields (form_section_id, field_code, label, field_type, validation_rules, order_index, width, options) VALUES
    ('s1000007-0001-0000-0000-000000000001', 'drill_type', 'Drill Type', 'dropdown', '{"required": true}', 1, 'half', '["Fire Evacuation", "Medical Emergency", "Severe Weather", "Chemical Spill", "Active Threat", "Other"]'),
    ('s1000007-0001-0000-0000-000000000001', 'jobsite', 'Jobsite', 'jobsite_select', '{"required": true}', 2, 'half', NULL),
    ('s1000007-0001-0000-0000-000000000001', 'date', 'Date', 'date', '{"required": true}', 3, 'half', NULL),
    ('s1000007-0001-0000-0000-000000000001', 'start_time', 'Start Time', 'time', '{"required": true}', 4, 'half', NULL),
    ('s1000007-0001-0000-0000-000000000001', 'announced', 'Announced Drill?', 'yes_no', '{"required": true}', 5, 'half', NULL),
    ('s1000007-0001-0000-0000-000000000001', 'participants', 'Number of Participants', 'number', '{"required": true, "min_value": 1}', 6, 'half', NULL),
    ('s1000007-0001-0000-0000-000000000002', 'evacuation_time', 'Evacuation Time (minutes)', 'number', '{"required": true, "min_value": 0}', 1, 'half', NULL),
    ('s1000007-0001-0000-0000-000000000002', 'all_accounted', 'All Personnel Accounted For?', 'yes_no', '{"required": true}', 2, 'half', NULL),
    ('s1000007-0001-0000-0000-000000000002', 'alarm_audible', 'Alarm Audible Throughout?', 'yes_no', '{"required": true}', 3, 'half', NULL),
    ('s1000007-0001-0000-0000-000000000002', 'routes_clear', 'Evacuation Routes Clear?', 'yes_no', '{"required": true}', 4, 'half', NULL),
    ('s1000007-0001-0000-0000-000000000002', 'assembly_point', 'Assembly Point Used Correctly?', 'yes_no', '{"required": true}', 5, 'half', NULL),
    ('s1000007-0001-0000-0000-000000000002', 'observations', 'Observations', 'textarea', '{"required": true}', 6, 'full', NULL),
    ('s1000007-0001-0000-0000-000000000003', 'overall_rating', 'Overall Drill Rating', 'dropdown', '{"required": true}', 1, 'half', '[{"value": "excellent", "label": "Excellent"}, {"value": "good", "label": "Good"}, {"value": "satisfactory", "label": "Satisfactory"}, {"value": "needs_improvement", "label": "Needs Improvement"}]'),
    ('s1000007-0001-0000-0000-000000000003', 'improvements_needed', 'Areas for Improvement', 'textarea', '{"required": false}', 2, 'full', NULL),
    ('s1000007-0001-0000-0000-000000000003', 'corrective_actions', 'Corrective Actions Required', 'textarea', '{"required": false}', 3, 'full', NULL),
    ('s1000007-0001-0000-0000-000000000003', 'next_drill_date', 'Recommended Next Drill', 'date', '{"required": false}', 4, 'half', NULL),
    ('s1000007-0001-0000-0000-000000000004', 'photos', 'Drill Photos', 'photo', '{"required": false}', 1, 'full', NULL),
    ('s1000007-0001-0000-0000-000000000004', 'coordinator_signature', 'Drill Coordinator Signature', 'signature', '{"required": true}', 2, 'half', NULL),
    ('s1000007-0001-0000-0000-000000000004', 'manager_signature', 'Site Manager Signature', 'signature', '{"required": true}', 3, 'half', NULL);

INSERT INTO form_workflows (form_template_id, submit_to_role, notify_roles, sync_priority, auto_create_evidence, evidence_audit_element)
VALUES ('f0000001-0000-0000-0000-000000000007', 'safety_manager', ARRAY['admin'], 2, true, 'Element 11');


-- ============================================================================
-- 8. WORKER ORIENTATION CHECKLIST (COR Element 4)
-- ============================================================================

INSERT INTO form_templates (id, company_id, form_code, name, description, cor_element, frequency, estimated_time_minutes, icon, color, is_mandatory)
VALUES (
    'f0000001-0000-0000-0000-000000000008',
    NULL,
    'orientation_checklist',
    'Worker Orientation Checklist',
    'New worker safety orientation documentation',
    4,
    'as_needed',
    30,
    'graduation-cap',
    '#06b6d4',
    true
);

INSERT INTO form_sections (id, form_template_id, title, description, order_index)
VALUES 
    ('s1000008-0001-0000-0000-000000000001', 'f0000001-0000-0000-0000-000000000008', 'Worker Information', NULL, 1),
    ('s1000008-0001-0000-0000-000000000002', 'f0000001-0000-0000-0000-000000000008', 'General Safety Topics', 'Topics covered during orientation', 2),
    ('s1000008-0001-0000-0000-000000000003', 'f0000001-0000-0000-0000-000000000008', 'Site-Specific Topics', 'Site-specific hazards and procedures', 3),
    ('s1000008-0001-0000-0000-000000000004', 'f0000001-0000-0000-0000-000000000008', 'PPE Issued', NULL, 4),
    ('s1000008-0001-0000-0000-000000000005', 'f0000001-0000-0000-0000-000000000008', 'Acknowledgment', NULL, 5);

INSERT INTO form_fields (form_section_id, field_code, label, field_type, validation_rules, order_index, width, options) VALUES
    ('s1000008-0001-0000-0000-000000000001', 'worker', 'Worker', 'worker_select', '{"required": true}', 1, 'half', NULL),
    ('s1000008-0001-0000-0000-000000000001', 'orientation_date', 'Orientation Date', 'date', '{"required": true}', 2, 'half', NULL),
    ('s1000008-0001-0000-0000-000000000001', 'hire_date', 'Hire Date', 'date', '{"required": true}', 3, 'half', NULL),
    ('s1000008-0001-0000-0000-000000000001', 'jobsite', 'Primary Jobsite', 'jobsite_select', '{"required": true}', 4, 'half', NULL),
    ('s1000008-0001-0000-0000-000000000001', 'position', 'Position/Role', 'text', '{"required": true}', 5, 'half', NULL),
    ('s1000008-0001-0000-0000-000000000001', 'supervisor', 'Direct Supervisor', 'worker_select', '{"required": true}', 6, 'half', NULL),
    ('s1000008-0001-0000-0000-000000000002', 'safety_policy', 'Safety Policy Reviewed', 'checkbox', '{"required": true}', 1, 'half', NULL),
    ('s1000008-0001-0000-0000-000000000002', 'worker_rights', 'Worker Rights (Right to Know, Participate, Refuse)', 'checkbox', '{"required": true}', 2, 'half', NULL),
    ('s1000008-0001-0000-0000-000000000002', 'hazard_reporting', 'Hazard Reporting Procedures', 'checkbox', '{"required": true}', 3, 'half', NULL),
    ('s1000008-0001-0000-0000-000000000002', 'emergency_procedures', 'Emergency Procedures', 'checkbox', '{"required": true}', 4, 'half', NULL),
    ('s1000008-0001-0000-0000-000000000002', 'ppe_requirements', 'PPE Requirements', 'checkbox', '{"required": true}', 5, 'half', NULL),
    ('s1000008-0001-0000-0000-000000000002', 'incident_reporting', 'Incident Reporting', 'checkbox', '{"required": true}', 6, 'half', NULL),
    ('s1000008-0001-0000-0000-000000000002', 'first_aid_location', 'First Aid Kit Locations', 'checkbox', '{"required": true}', 7, 'half', NULL),
    ('s1000008-0001-0000-0000-000000000002', 'whmis', 'WHMIS Training', 'checkbox', '{"required": true}', 8, 'half', NULL),
    ('s1000008-0001-0000-0000-000000000003', 'site_hazards', 'Site-Specific Hazards Reviewed', 'checkbox', '{"required": true}', 1, 'half', NULL),
    ('s1000008-0001-0000-0000-000000000003', 'safe_work_procedures', 'Safe Work Procedures', 'checkbox', '{"required": true}', 2, 'half', NULL),
    ('s1000008-0001-0000-0000-000000000003', 'restricted_areas', 'Restricted Areas Identified', 'checkbox', '{"required": true}', 3, 'half', NULL),
    ('s1000008-0001-0000-0000-000000000003', 'emergency_contacts', 'Emergency Contacts Provided', 'checkbox', '{"required": true}', 4, 'half', NULL),
    ('s1000008-0001-0000-0000-000000000003', 'assembly_points', 'Emergency Assembly Points', 'checkbox', '{"required": true}', 5, 'half', NULL),
    ('s1000008-0001-0000-0000-000000000003', 'site_tour', 'Site Tour Completed', 'checkbox', '{"required": true}', 6, 'half', NULL),
    ('s1000008-0001-0000-0000-000000000004', 'ppe_issued', 'PPE Issued', 'multiselect', '{"required": true}', 1, 'full', '["Hard Hat", "Safety Glasses", "Hi-Vis Vest", "Safety Boots", "Gloves", "Hearing Protection", "Respirator", "Fall Protection Harness", "Other"]'),
    ('s1000008-0001-0000-0000-000000000004', 'ppe_notes', 'PPE Notes', 'textarea', '{"required": false}', 2, 'full', NULL),
    ('s1000008-0001-0000-0000-000000000005', 'worker_acknowledges', 'Worker understands and agrees to comply with safety requirements', 'checkbox', '{"required": true}', 1, 'full', NULL),
    ('s1000008-0001-0000-0000-000000000005', 'worker_signature', 'Worker Signature', 'signature', '{"required": true}', 2, 'half', NULL),
    ('s1000008-0001-0000-0000-000000000005', 'orientor_signature', 'Orientor Signature', 'signature', '{"required": true}', 3, 'half', NULL);

INSERT INTO form_workflows (form_template_id, submit_to_role, notify_roles, sync_priority, auto_create_evidence, evidence_audit_element)
VALUES ('f0000001-0000-0000-0000-000000000008', 'hr', ARRAY['supervisor', 'safety_manager'], 2, true, 'Element 4');


-- ============================================================================
-- 9. JOB SAFETY ANALYSIS (COR Element 3)
-- ============================================================================

INSERT INTO form_templates (id, company_id, form_code, name, description, cor_element, frequency, estimated_time_minutes, icon, color, is_mandatory)
VALUES (
    'f0000001-0000-0000-0000-000000000009',
    NULL,
    'job_safety_analysis',
    'Job Safety Analysis (JSA)',
    'Step-by-step hazard analysis for specific tasks',
    3,
    'as_needed',
    25,
    'list-checks',
    '#14b8a6',
    true
);

INSERT INTO form_sections (id, form_template_id, title, description, order_index, is_repeatable, min_repeats, max_repeats)
VALUES 
    ('s1000009-0001-0000-0000-000000000001', 'f0000001-0000-0000-0000-000000000009', 'Task Information', NULL, 1, false, 1, 1),
    ('s1000009-0001-0000-0000-000000000002', 'f0000001-0000-0000-0000-000000000009', 'Task Steps & Hazards', 'Add each step of the task', 2, true, 1, 20),
    ('s1000009-0001-0000-0000-000000000003', 'f0000001-0000-0000-0000-000000000009', 'Required PPE', NULL, 3, false, 1, 1),
    ('s1000009-0001-0000-0000-000000000004', 'f0000001-0000-0000-0000-000000000009', 'Approval', NULL, 4, false, 1, 1);

INSERT INTO form_fields (form_section_id, field_code, label, field_type, validation_rules, order_index, width, options) VALUES
    ('s1000009-0001-0000-0000-000000000001', 'task_name', 'Task/Activity Name', 'text', '{"required": true}', 1, 'full', NULL),
    ('s1000009-0001-0000-0000-000000000001', 'jobsite', 'Jobsite', 'jobsite_select', '{"required": true}', 2, 'half', NULL),
    ('s1000009-0001-0000-0000-000000000001', 'date', 'Date', 'date', '{"required": true}', 3, 'half', NULL),
    ('s1000009-0001-0000-0000-000000000001', 'prepared_by', 'Prepared By', 'worker_select', '{"required": true}', 4, 'half', NULL),
    ('s1000009-0001-0000-0000-000000000001', 'crew_size', 'Crew Size', 'number', '{"required": true, "min_value": 1}', 5, 'half', NULL),
    ('s1000009-0001-0000-0000-000000000002', 'step_number', 'Step #', 'number', '{"required": true, "min_value": 1}', 1, 'quarter', NULL),
    ('s1000009-0001-0000-0000-000000000002', 'step_description', 'Task Step', 'textarea', '{"required": true}', 2, 'full', NULL),
    ('s1000009-0001-0000-0000-000000000002', 'hazards', 'Potential Hazards', 'textarea', '{"required": true}', 3, 'full', NULL),
    ('s1000009-0001-0000-0000-000000000002', 'controls', 'Controls/Safe Procedures', 'textarea', '{"required": true}', 4, 'full', NULL),
    ('s1000009-0001-0000-0000-000000000002', 'responsible', 'Responsible Person', 'worker_select', '{"required": false}', 5, 'half', NULL),
    ('s1000009-0001-0000-0000-000000000003', 'required_ppe', 'Required PPE', 'multiselect', '{"required": true}', 1, 'full', '["Hard Hat", "Safety Glasses", "Face Shield", "Hi-Vis Vest", "Safety Boots", "Gloves", "Hearing Protection", "Respirator", "Fall Protection", "Fire Resistant Clothing", "Other"]'),
    ('s1000009-0001-0000-0000-000000000003', 'special_equipment', 'Special Equipment/Tools Required', 'textarea', '{"required": false}', 2, 'full', NULL),
    ('s1000009-0001-0000-0000-000000000003', 'permits_required', 'Permits Required', 'multiselect', '{"required": false}', 3, 'full', '["None", "Hot Work", "Confined Space", "Excavation", "Lockout/Tagout", "Working at Heights", "Electrical", "Other"]'),
    ('s1000009-0001-0000-0000-000000000004', 'reviewed_with_crew', 'JSA Reviewed with Crew?', 'yes_no', '{"required": true}', 1, 'half', NULL),
    ('s1000009-0001-0000-0000-000000000004', 'preparer_signature', 'Preparer Signature', 'signature', '{"required": true}', 2, 'half', NULL),
    ('s1000009-0001-0000-0000-000000000004', 'supervisor_signature', 'Supervisor Approval', 'signature', '{"required": true}', 3, 'half', NULL);

INSERT INTO form_workflows (form_template_id, submit_to_role, notify_roles, sync_priority, auto_create_evidence, evidence_audit_element, requires_approval)
VALUES ('f0000001-0000-0000-0000-000000000009', 'supervisor', ARRAY['safety_manager'], 2, true, 'Element 3', true);


-- ============================================================================
-- 10. SAFETY MEETING MINUTES (COR Element 8)
-- ============================================================================

INSERT INTO form_templates (id, company_id, form_code, name, description, cor_element, frequency, estimated_time_minutes, icon, color, is_mandatory)
VALUES (
    'f0000001-0000-0000-0000-000000000010',
    NULL,
    'safety_meeting',
    'Safety Meeting Minutes',
    'Document monthly safety committee meetings',
    8,
    'monthly',
    15,
    'users-round',
    '#6366f1',
    true
);

INSERT INTO form_sections (id, form_template_id, title, description, order_index, is_repeatable, min_repeats, max_repeats)
VALUES 
    ('s1000010-0001-0000-0000-000000000001', 'f0000001-0000-0000-0000-000000000010', 'Meeting Details', NULL, 1, false, 1, 1),
    ('s1000010-0001-0000-0000-000000000002', 'f0000001-0000-0000-0000-000000000010', 'Attendees', 'Record all attendees', 2, true, 2, 30),
    ('s1000010-0001-0000-0000-000000000003', 'f0000001-0000-0000-0000-000000000010', 'Previous Actions Review', NULL, 3, false, 1, 1),
    ('s1000010-0001-0000-0000-000000000004', 'f0000001-0000-0000-0000-000000000010', 'Topics Discussed', NULL, 4, false, 1, 1),
    ('s1000010-0001-0000-0000-000000000005', 'f0000001-0000-0000-0000-000000000010', 'Action Items', 'New actions from this meeting', 5, true, 0, 20),
    ('s1000010-0001-0000-0000-000000000006', 'f0000001-0000-0000-0000-000000000010', 'Sign-Off', NULL, 6, false, 1, 1);

INSERT INTO form_fields (form_section_id, field_code, label, field_type, validation_rules, order_index, width, options) VALUES
    ('s1000010-0001-0000-0000-000000000001', 'meeting_type', 'Meeting Type', 'dropdown', '{"required": true}', 1, 'half', '["Safety Committee", "Management Review", "Department Safety", "Toolbox Talk", "Other"]'),
    ('s1000010-0001-0000-0000-000000000001', 'date', 'Date', 'date', '{"required": true}', 2, 'half', NULL),
    ('s1000010-0001-0000-0000-000000000001', 'start_time', 'Start Time', 'time', '{"required": true}', 3, 'half', NULL),
    ('s1000010-0001-0000-0000-000000000001', 'end_time', 'End Time', 'time', '{"required": true}', 4, 'half', NULL),
    ('s1000010-0001-0000-0000-000000000001', 'location', 'Location', 'text', '{"required": true}', 5, 'full', NULL),
    ('s1000010-0001-0000-0000-000000000001', 'chairperson', 'Meeting Chair', 'worker_select', '{"required": true}', 6, 'half', NULL),
    ('s1000010-0001-0000-0000-000000000001', 'minute_taker', 'Minutes By', 'worker_select', '{"required": true}', 7, 'half', NULL),
    ('s1000010-0001-0000-0000-000000000002', 'attendee_name', 'Attendee', 'worker_select', '{"required": true}', 1, 'half', NULL),
    ('s1000010-0001-0000-0000-000000000002', 'attendee_role', 'Role', 'text', '{"required": false}', 2, 'half', NULL),
    ('s1000010-0001-0000-0000-000000000003', 'previous_actions_reviewed', 'Previous Action Items Reviewed?', 'yes_no', '{"required": true}', 1, 'half', NULL),
    ('s1000010-0001-0000-0000-000000000003', 'actions_completed', 'Actions Completed', 'textarea', '{"required": false}', 2, 'full', NULL),
    ('s1000010-0001-0000-0000-000000000003', 'actions_outstanding', 'Outstanding Actions', 'textarea', '{"required": false}', 3, 'full', NULL),
    ('s1000010-0001-0000-0000-000000000004', 'incidents_review', 'Incidents Since Last Meeting', 'textarea', '{"required": false}', 1, 'full', NULL),
    ('s1000010-0001-0000-0000-000000000004', 'hazards_raised', 'Hazards/Concerns Raised', 'textarea', '{"required": false}', 2, 'full', NULL),
    ('s1000010-0001-0000-0000-000000000004', 'training_discussed', 'Training Items Discussed', 'textarea', '{"required": false}', 3, 'full', NULL),
    ('s1000010-0001-0000-0000-000000000004', 'other_business', 'Other Business', 'textarea', '{"required": false}', 4, 'full', NULL),
    ('s1000010-0001-0000-0000-000000000005', 'action_description', 'Action Item', 'textarea', '{"required": true}', 1, 'full', NULL),
    ('s1000010-0001-0000-0000-000000000005', 'action_assigned_to', 'Assigned To', 'worker_select', '{"required": true}', 2, 'half', NULL),
    ('s1000010-0001-0000-0000-000000000005', 'action_due_date', 'Due Date', 'date', '{"required": true}', 3, 'half', NULL),
    ('s1000010-0001-0000-0000-000000000005', 'action_priority', 'Priority', 'dropdown', '{"required": true}', 4, 'half', '[{"value": "high", "label": "High"}, {"value": "medium", "label": "Medium"}, {"value": "low", "label": "Low"}]'),
    ('s1000010-0001-0000-0000-000000000006', 'next_meeting_date', 'Next Meeting Date', 'date', '{"required": false}', 1, 'half', NULL),
    ('s1000010-0001-0000-0000-000000000006', 'chairperson_signature', 'Chair Signature', 'signature', '{"required": true}', 2, 'half', NULL);

INSERT INTO form_workflows (form_template_id, submit_to_role, notify_roles, sync_priority, auto_create_evidence, evidence_audit_element, creates_task, task_template)
VALUES (
    'f0000001-0000-0000-0000-000000000010',
    'safety_manager',
    ARRAY['admin'],
    3,
    true,
    'Element 8',
    true,
    '{"title": "Review Safety Meeting Minutes", "assigned_to_role": "admin", "due_days": 7, "priority": "low"}'
);


-- ============================================================================
-- END OF SEED DATA
-- ============================================================================
