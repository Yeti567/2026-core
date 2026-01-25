-- ============================================================================
-- COR Form Builder: Core Forms Seed Data
-- ============================================================================
-- This script populates the database with 10 essential COR compliance forms.
-- These are global templates (company_id = null) that can be cloned and
-- customized by individual companies.
--
-- Forms included:
-- 1. Hazard Reporting Form (Element 2)
-- 2. First Aid Log (Element 12)
-- 3. Toolbox Talk Record (Element 8)
-- 4. Incident Witness Statement (Element 10)
-- 5. PPE Issuance Form (Element 6)
-- 6. Contractor Monitoring Checklist (Element 4)
-- 7. OHS Meeting Minutes (Element 8)
-- 8. Corrective Action Tracker (Element 9)
-- 9. Training Feedback Form (Element 8)
-- 10. Emergency Contact Update (Element 11)
-- ============================================================================

-- Clear existing global templates (for clean re-seeding)
DELETE FROM form_workflows WHERE form_template_id IN (SELECT id FROM form_templates WHERE company_id IS NULL);
DELETE FROM form_fields WHERE form_section_id IN (SELECT fs.id FROM form_sections fs JOIN form_templates ft ON fs.form_template_id = ft.id WHERE ft.company_id IS NULL);
DELETE FROM form_sections WHERE form_template_id IN (SELECT id FROM form_templates WHERE company_id IS NULL);
DELETE FROM form_templates WHERE company_id IS NULL;

-- ============================================================================
-- FORM 1: Hazard Reporting Form (Element 2)
-- ============================================================================
-- Purpose: Workers report identified hazards immediately for swift mitigation.
-- This is a critical form for proactive safety management.
-- ============================================================================

INSERT INTO form_templates (id, company_id, form_code, name, description, cor_element, frequency, estimated_time_minutes, icon, color, is_active, is_mandatory, version)
VALUES (
  'f1000000-0000-0000-0000-000000000001',
  NULL,
  'hazard_reporting',
  'Hazard Reporting Form',
  'Report any identified hazards immediately. Quick reporting helps prevent incidents and shows your commitment to workplace safety.',
  2,
  'as_needed',
  5,
  'alert-triangle',
  '#ef4444',
  true,
  true,
  1
);

-- Section 1: Hazard Details
INSERT INTO form_sections (id, form_template_id, title, description, order_index, is_repeatable)
VALUES (
  'f1000000-0000-0000-0001-000000000001',
  'f1000000-0000-0000-0000-000000000001',
  'Hazard Details',
  'Describe the hazard you identified. Be as specific as possible.',
  0,
  false
);

INSERT INTO form_fields (form_section_id, field_code, label, field_type, placeholder, help_text, options, validation_rules, order_index, width) VALUES
('f1000000-0000-0000-0001-000000000001', 'hazard_description', 'Describe the hazard', 'textarea', 'What did you observe? Include location, conditions, and potential consequences...', 'Be specific about what you saw, where you saw it, and why it is dangerous.', NULL, '{"required": true, "min_length": 10, "custom_message": "Please provide at least 10 characters describing the hazard"}', 0, 'full'),
('f1000000-0000-0000-0001-000000000001', 'hazard_type', 'Type of hazard', 'dropdown', NULL, 'Select the category that best describes this hazard', '["Slip/Trip/Fall", "Working at Heights", "Electrical", "Equipment/Machinery", "Chemical/Hazardous Materials", "Fire/Explosion", "Ergonomic", "Environmental", "Other"]', '{"required": true}', 1, 'half'),
('f1000000-0000-0000-0001-000000000001', 'hazard_severity', 'Severity level', 'dropdown', NULL, 'How serious could the consequences be?', '[{"value": "low", "label": "Low - Minor inconvenience"}, {"value": "medium", "label": "Medium - Could cause injury"}, {"value": "high", "label": "High - Serious injury possible"}, {"value": "critical", "label": "Critical - Life-threatening"}]', '{"required": true}', 2, 'half'),
('f1000000-0000-0000-0001-000000000001', 'hazard_location', 'Location of hazard', 'text', 'e.g., Building A, 2nd floor, near stairwell', 'Be specific so others can find and address the hazard', NULL, '{"required": true, "min_length": 3}', 3, 'full'),
('f1000000-0000-0000-0001-000000000001', 'hazard_photo', 'Photo of hazard', 'photo', NULL, 'Take a photo showing the hazard clearly (optional but helpful)', NULL, '{"required": false}', 4, 'full');

-- Section 2: Immediate Actions
INSERT INTO form_sections (id, form_template_id, title, description, order_index, is_repeatable)
VALUES (
  'f1000000-0000-0000-0001-000000000002',
  'f1000000-0000-0000-0000-000000000001',
  'Immediate Actions',
  'What have you done or what needs to be done to address this hazard?',
  1,
  false
);

INSERT INTO form_fields (form_section_id, field_code, label, field_type, placeholder, help_text, options, validation_rules, order_index, width) VALUES
('f1000000-0000-0000-0001-000000000002', 'action_taken', 'Immediate action taken', 'textarea', 'What did you do immediately to reduce the risk?', 'Describe any barriers, warnings, or controls you put in place', NULL, '{"required": true, "min_length": 5}', 0, 'full'),
('f1000000-0000-0000-0001-000000000002', 'area_cordoned', 'Area cordoned off or blocked?', 'yes_no', NULL, NULL, NULL, '{"required": true}', 1, 'half'),
('f1000000-0000-0000-0001-000000000002', 'workers_notified', 'Other workers notified?', 'yes_no', NULL, 'Did you warn nearby workers about the hazard?', NULL, '{"required": true}', 2, 'half'),
('f1000000-0000-0000-0001-000000000002', 'supervisor_notified', 'Supervisor notified?', 'yes_no', NULL, NULL, NULL, '{"required": true}', 3, 'half');

-- Section 3: Reporter Information
INSERT INTO form_sections (id, form_template_id, title, description, order_index, is_repeatable)
VALUES (
  'f1000000-0000-0000-0001-000000000003',
  'f1000000-0000-0000-0000-000000000001',
  'Reporter Information',
  NULL,
  2,
  false
);

INSERT INTO form_fields (form_section_id, field_code, label, field_type, placeholder, help_text, options, validation_rules, order_index, width) VALUES
('f1000000-0000-0000-0001-000000000003', 'gps_location', 'GPS Location', 'gps', NULL, 'Your current location will be recorded automatically', NULL, '{"required": false}', 0, 'full'),
('f1000000-0000-0000-0001-000000000003', 'reporter_signature', 'Your signature', 'signature', NULL, 'Sign to confirm this report is accurate', NULL, '{"required": true}', 1, 'full');

-- Workflow for Hazard Reporting
INSERT INTO form_workflows (form_template_id, submit_to_role, notify_roles, notify_emails, creates_task, task_template, requires_approval, sync_priority, auto_create_evidence, evidence_audit_element)
VALUES (
  'f1000000-0000-0000-0000-000000000001',
  'supervisor',
  ARRAY['safety_manager'],
  ARRAY[]::text[],
  true,
  '{"title": "Review Hazard Report", "assigned_to_role": "supervisor", "due_days": 1, "priority": "high"}',
  false,
  2,
  true,
  'Element 2'
);


-- ============================================================================
-- FORM 2: First Aid Log (Element 12)
-- ============================================================================
-- Purpose: Document all first aid treatments given on site.
-- Required by legislation and essential for tracking injury trends.
-- ============================================================================

INSERT INTO form_templates (id, company_id, form_code, name, description, cor_element, frequency, estimated_time_minutes, icon, color, is_active, is_mandatory, version)
VALUES (
  'f1000000-0000-0000-0000-000000000002',
  NULL,
  'first_aid_log',
  'First Aid Log',
  'Document all first aid treatments given on site. This record is required by law and helps track injury patterns.',
  12,
  'as_needed',
  8,
  'heart-pulse',
  '#ec4899',
  true,
  true,
  1
);

-- Section 1: Incident Information
INSERT INTO form_sections (id, form_template_id, title, description, order_index, is_repeatable)
VALUES (
  'f1000000-0000-0000-0002-000000000001',
  'f1000000-0000-0000-0000-000000000002',
  'Incident Information',
  'When and where did the incident occur?',
  0,
  false
);

INSERT INTO form_fields (form_section_id, field_code, label, field_type, placeholder, help_text, options, validation_rules, order_index, width) VALUES
('f1000000-0000-0000-0002-000000000001', 'incident_date', 'Date of incident', 'date', NULL, NULL, NULL, '{"required": true}', 0, 'half'),
('f1000000-0000-0000-0002-000000000001', 'incident_time', 'Time of incident', 'time', NULL, NULL, NULL, '{"required": true}', 1, 'half'),
('f1000000-0000-0000-0002-000000000001', 'incident_location', 'Location', 'text', 'Where did the incident occur?', NULL, NULL, '{"required": true}', 2, 'full'),
('f1000000-0000-0000-0002-000000000001', 'injured_worker', 'Injured worker', 'worker_select', NULL, 'Select the worker who was injured', NULL, '{"required": true}', 3, 'full');

-- Section 2: Injury Details
INSERT INTO form_sections (id, form_template_id, title, description, order_index, is_repeatable)
VALUES (
  'f1000000-0000-0000-0002-000000000002',
  'f1000000-0000-0000-0000-000000000002',
  'Injury Details',
  'Describe the injury and how it happened',
  1,
  false
);

INSERT INTO form_fields (form_section_id, field_code, label, field_type, placeholder, help_text, options, validation_rules, order_index, width) VALUES
('f1000000-0000-0000-0002-000000000002', 'injury_type', 'Type of injury', 'dropdown', NULL, NULL, '["Cut/Laceration", "Bruise/Contusion", "Burn", "Sprain/Strain", "Fracture", "Eye Injury", "Head Injury", "Allergic Reaction", "Illness", "Other"]', '{"required": true}', 0, 'half'),
('f1000000-0000-0000-0002-000000000002', 'body_part', 'Body part affected', 'dropdown', NULL, NULL, '["Head/Face", "Eye", "Neck", "Shoulder", "Arm", "Hand/Fingers", "Chest", "Back", "Abdomen", "Leg", "Knee", "Foot/Toes", "Multiple Areas", "Other"]', '{"required": true}', 1, 'half'),
('f1000000-0000-0000-0002-000000000002', 'injury_description', 'How did the injury happen?', 'textarea', 'Describe the circumstances leading to the injury...', NULL, NULL, '{"required": true, "min_length": 10}', 2, 'full');

-- Section 3: Treatment Given
INSERT INTO form_sections (id, form_template_id, title, description, order_index, is_repeatable)
VALUES (
  'f1000000-0000-0000-0002-000000000003',
  'f1000000-0000-0000-0000-000000000002',
  'Treatment Given',
  'What first aid was provided?',
  2,
  false
);

INSERT INTO form_fields (form_section_id, field_code, label, field_type, placeholder, help_text, options, validation_rules, order_index, width) VALUES
('f1000000-0000-0000-0002-000000000003', 'treatment_given', 'Treatment provided', 'textarea', 'Describe the first aid treatment given...', 'Include all supplies used and procedures performed', NULL, '{"required": true, "min_length": 10}', 0, 'full'),
('f1000000-0000-0000-0002-000000000003', 'supplies_used', 'Supplies used', 'multiselect', NULL, 'Select all that apply', '["Bandage", "Gauze", "Antiseptic", "Ice Pack", "Eye Wash", "Burn Cream", "Splint", "CPR/AED", "Epinephrine", "Other"]', '{"required": false}', 1, 'full'),
('f1000000-0000-0000-0002-000000000003', 'further_medical', 'Was further medical attention recommended?', 'dropdown', NULL, NULL, '[{"value": "none", "label": "No - Returned to work"}, {"value": "monitor", "label": "Monitor - Light duties"}, {"value": "clinic", "label": "Yes - Visit clinic/doctor"}, {"value": "hospital", "label": "Yes - Hospital/Emergency"}, {"value": "ambulance", "label": "Ambulance called"}]', '{"required": true}', 2, 'full');

-- Section 4: First Aider Sign-off
INSERT INTO form_sections (id, form_template_id, title, description, order_index, is_repeatable)
VALUES (
  'f1000000-0000-0000-0002-000000000004',
  'f1000000-0000-0000-0000-000000000002',
  'First Aider Sign-off',
  NULL,
  3,
  false
);

INSERT INTO form_fields (form_section_id, field_code, label, field_type, placeholder, help_text, options, validation_rules, order_index, width) VALUES
('f1000000-0000-0000-0002-000000000004', 'first_aider', 'First aider name', 'worker_select', NULL, 'Who provided the first aid?', NULL, '{"required": true}', 0, 'full'),
('f1000000-0000-0000-0002-000000000004', 'first_aider_signature', 'First aider signature', 'signature', NULL, 'Sign to confirm treatment was provided as described', NULL, '{"required": true}', 1, 'full');

-- Workflow for First Aid Log
INSERT INTO form_workflows (form_template_id, submit_to_role, notify_roles, notify_emails, creates_task, task_template, requires_approval, sync_priority, auto_create_evidence, evidence_audit_element)
VALUES (
  'f1000000-0000-0000-0000-000000000002',
  'safety_manager',
  ARRAY['hr_manager'],
  ARRAY[]::text[],
  false,
  NULL,
  false,
  2,
  true,
  'Element 12'
);


-- ============================================================================
-- FORM 3: Toolbox Talk Record (Element 8)
-- ============================================================================
-- Purpose: Document safety discussions held at the start of shifts/projects.
-- Essential for demonstrating ongoing safety communication.
-- ============================================================================

INSERT INTO form_templates (id, company_id, form_code, name, description, cor_element, frequency, estimated_time_minutes, icon, color, is_active, is_mandatory, version)
VALUES (
  'f1000000-0000-0000-0000-000000000003',
  NULL,
  'toolbox_talk',
  'Toolbox Talk Record',
  'Document safety discussions held with workers. These talks are essential for communicating hazards, procedures, and safety expectations.',
  8,
  'daily',
  10,
  'users',
  '#3b82f6',
  true,
  true,
  1
);

-- Section 1: Meeting Details
INSERT INTO form_sections (id, form_template_id, title, description, order_index, is_repeatable)
VALUES (
  'f1000000-0000-0000-0003-000000000001',
  'f1000000-0000-0000-0000-000000000003',
  'Meeting Details',
  NULL,
  0,
  false
);

INSERT INTO form_fields (form_section_id, field_code, label, field_type, placeholder, help_text, options, validation_rules, order_index, width) VALUES
('f1000000-0000-0000-0003-000000000001', 'talk_date', 'Date', 'date', NULL, NULL, NULL, '{"required": true}', 0, 'third'),
('f1000000-0000-0000-0003-000000000001', 'talk_time', 'Time', 'time', NULL, NULL, NULL, '{"required": true}', 1, 'third'),
('f1000000-0000-0000-0003-000000000001', 'duration_minutes', 'Duration (minutes)', 'number', '15', NULL, NULL, '{"required": true, "min_value": 1, "max_value": 120}', 2, 'third'),
('f1000000-0000-0000-0003-000000000001', 'jobsite', 'Jobsite', 'jobsite_select', NULL, NULL, NULL, '{"required": true}', 3, 'full'),
('f1000000-0000-0000-0003-000000000001', 'presented_by', 'Presented by', 'worker_select', NULL, 'Who led this toolbox talk?', NULL, '{"required": true}', 4, 'full');

-- Section 2: Topic & Content
INSERT INTO form_sections (id, form_template_id, title, description, order_index, is_repeatable)
VALUES (
  'f1000000-0000-0000-0003-000000000002',
  'f1000000-0000-0000-0000-000000000003',
  'Topic & Content',
  'What was discussed?',
  1,
  false
);

INSERT INTO form_fields (form_section_id, field_code, label, field_type, placeholder, help_text, options, validation_rules, order_index, width) VALUES
('f1000000-0000-0000-0003-000000000002', 'topic', 'Topic', 'text', 'e.g., Working at Heights Safety', 'Main topic of the toolbox talk', NULL, '{"required": true}', 0, 'full'),
('f1000000-0000-0000-0003-000000000002', 'topic_category', 'Category', 'dropdown', NULL, NULL, '["PPE", "Fall Protection", "Equipment Safety", "Chemical Safety", "Fire Safety", "Ergonomics", "Housekeeping", "Emergency Procedures", "Site-Specific Hazards", "Incident Review", "New Procedures", "Seasonal Safety", "Other"]', '{"required": true}', 1, 'half'),
('f1000000-0000-0000-0003-000000000002', 'related_hazards', 'Related hazards discussed', 'textarea', 'List specific hazards mentioned...', NULL, NULL, '{"required": true, "min_length": 10}', 2, 'full'),
('f1000000-0000-0000-0003-000000000002', 'key_points', 'Key points covered', 'textarea', 'Summarize the main messages...', NULL, NULL, '{"required": true, "min_length": 20}', 3, 'full');

-- Section 3: Questions & Concerns
INSERT INTO form_sections (id, form_template_id, title, description, order_index, is_repeatable)
VALUES (
  'f1000000-0000-0000-0003-000000000003',
  'f1000000-0000-0000-0000-000000000003',
  'Questions & Concerns',
  'Were there any questions or concerns raised?',
  2,
  false
);

INSERT INTO form_fields (form_section_id, field_code, label, field_type, placeholder, help_text, options, validation_rules, order_index, width) VALUES
('f1000000-0000-0000-0003-000000000003', 'questions_raised', 'Were questions or concerns raised?', 'yes_no', NULL, NULL, NULL, '{"required": true}', 0, 'half'),
('f1000000-0000-0000-0003-000000000003', 'questions_details', 'Questions/concerns details', 'textarea', 'Document questions asked and answers given...', 'Capture the discussion that occurred', NULL, '{"required": false}', 1, 'full');

-- Section 4: Attendance
INSERT INTO form_sections (id, form_template_id, title, description, order_index, is_repeatable)
VALUES (
  'f1000000-0000-0000-0003-000000000004',
  'f1000000-0000-0000-0000-000000000003',
  'Attendance',
  'Who attended this toolbox talk?',
  3,
  false
);

INSERT INTO form_fields (form_section_id, field_code, label, field_type, placeholder, help_text, options, validation_rules, order_index, width) VALUES
('f1000000-0000-0000-0003-000000000004', 'attendee_count', 'Number of attendees', 'number', NULL, NULL, NULL, '{"required": true, "min_value": 1}', 0, 'half'),
('f1000000-0000-0000-0003-000000000004', 'attendee_names', 'Attendee names', 'textarea', 'List all attendees or attach sign-in sheet...', 'You can also take a photo of the sign-in sheet', NULL, '{"required": true}', 1, 'full'),
('f1000000-0000-0000-0003-000000000004', 'attendance_photo', 'Attendance sheet photo', 'photo', NULL, 'Optional: Photo of physical sign-in sheet', NULL, '{"required": false}', 2, 'full');

-- Section 5: Presenter Sign-off
INSERT INTO form_sections (id, form_template_id, title, description, order_index, is_repeatable)
VALUES (
  'f1000000-0000-0000-0003-000000000005',
  'f1000000-0000-0000-0000-000000000003',
  'Presenter Sign-off',
  NULL,
  4,
  false
);

INSERT INTO form_fields (form_section_id, field_code, label, field_type, placeholder, help_text, options, validation_rules, order_index, width) VALUES
('f1000000-0000-0000-0003-000000000005', 'presenter_signature', 'Presenter signature', 'signature', NULL, 'Sign to confirm this toolbox talk was conducted', NULL, '{"required": true}', 0, 'full');

-- Workflow for Toolbox Talk
INSERT INTO form_workflows (form_template_id, submit_to_role, notify_roles, notify_emails, creates_task, task_template, requires_approval, sync_priority, auto_create_evidence, evidence_audit_element)
VALUES (
  'f1000000-0000-0000-0000-000000000003',
  NULL,
  ARRAY['safety_manager'],
  ARRAY[]::text[],
  false,
  NULL,
  false,
  3,
  true,
  'Element 8'
);


-- ============================================================================
-- FORM 4: Incident Witness Statement (Element 10)
-- ============================================================================
-- Purpose: Capture witness accounts for incident investigations.
-- Critical for thorough incident investigations.
-- ============================================================================

INSERT INTO form_templates (id, company_id, form_code, name, description, cor_element, frequency, estimated_time_minutes, icon, color, is_active, is_mandatory, version)
VALUES (
  'f1000000-0000-0000-0000-000000000004',
  NULL,
  'witness_statement',
  'Incident Witness Statement',
  'Capture witness accounts of workplace incidents. Your statement helps us understand what happened and prevent future incidents.',
  10,
  'as_needed',
  15,
  'eye',
  '#8b5cf6',
  true,
  false,
  1
);

-- Section 1: Witness Information
INSERT INTO form_sections (id, form_template_id, title, description, order_index, is_repeatable)
VALUES (
  'f1000000-0000-0000-0004-000000000001',
  'f1000000-0000-0000-0000-000000000004',
  'Witness Information',
  'Your contact details',
  0,
  false
);

INSERT INTO form_fields (form_section_id, field_code, label, field_type, placeholder, help_text, options, validation_rules, order_index, width) VALUES
('f1000000-0000-0000-0004-000000000001', 'witness_name', 'Your full name', 'text', NULL, NULL, NULL, '{"required": true}', 0, 'half'),
('f1000000-0000-0000-0004-000000000001', 'witness_position', 'Your position/role', 'text', NULL, NULL, NULL, '{"required": false}', 1, 'half'),
('f1000000-0000-0000-0004-000000000001', 'witness_phone', 'Contact phone', 'phone', NULL, 'In case we need to follow up', NULL, '{"required": true}', 2, 'half'),
('f1000000-0000-0000-0004-000000000001', 'witness_email', 'Email', 'email', NULL, NULL, NULL, '{"required": false}', 3, 'half');

-- Section 2: Incident Context
INSERT INTO form_sections (id, form_template_id, title, description, order_index, is_repeatable)
VALUES (
  'f1000000-0000-0000-0004-000000000002',
  'f1000000-0000-0000-0000-000000000004',
  'Incident Context',
  'Information about the incident you witnessed',
  1,
  false
);

INSERT INTO form_fields (form_section_id, field_code, label, field_type, placeholder, help_text, options, validation_rules, order_index, width) VALUES
('f1000000-0000-0000-0004-000000000002', 'incident_date', 'Date of incident', 'date', NULL, NULL, NULL, '{"required": true}', 0, 'half'),
('f1000000-0000-0000-0004-000000000002', 'incident_time_approx', 'Approximate time', 'time', NULL, 'Your best estimate', NULL, '{"required": true}', 1, 'half'),
('f1000000-0000-0000-0004-000000000002', 'your_location', 'Where were you when incident occurred?', 'text', 'e.g., Standing by forklift near warehouse door', NULL, NULL, '{"required": true}', 2, 'full');

-- Section 3: Your Statement
INSERT INTO form_sections (id, form_template_id, title, description, order_index, is_repeatable)
VALUES (
  'f1000000-0000-0000-0004-000000000003',
  'f1000000-0000-0000-0000-000000000004',
  'Your Statement',
  'Describe what you witnessed in your own words',
  2,
  false
);

INSERT INTO form_fields (form_section_id, field_code, label, field_type, placeholder, help_text, options, validation_rules, order_index, width) VALUES
('f1000000-0000-0000-0004-000000000003', 'what_you_saw', 'What did you see?', 'textarea', 'Describe exactly what you observed, in chronological order...', 'Include what led up to the incident, what happened during, and what happened immediately after. Be as detailed as possible.', NULL, '{"required": true, "min_length": 50, "custom_message": "Please provide a detailed statement (at least 50 characters)"}', 0, 'full'),
('f1000000-0000-0000-0004-000000000003', 'what_you_heard', 'Did you hear anything relevant?', 'textarea', 'Describe any sounds, conversations, or warnings...', NULL, NULL, '{"required": false}', 1, 'full'),
('f1000000-0000-0000-0004-000000000003', 'others_present', 'Were other witnesses present?', 'textarea', 'List anyone else who may have seen the incident...', NULL, NULL, '{"required": false}', 2, 'full'),
('f1000000-0000-0000-0004-000000000003', 'environmental_conditions', 'Environmental conditions', 'textarea', 'Note weather, lighting, noise levels, or other conditions...', NULL, NULL, '{"required": false}', 3, 'full');

-- Section 4: Sign-off
INSERT INTO form_sections (id, form_template_id, title, description, order_index, is_repeatable)
VALUES (
  'f1000000-0000-0000-0004-000000000004',
  'f1000000-0000-0000-0000-000000000004',
  'Declaration',
  'Please read and sign below',
  3,
  false
);

INSERT INTO form_fields (form_section_id, field_code, label, field_type, placeholder, help_text, options, validation_rules, order_index, width) VALUES
('f1000000-0000-0000-0004-000000000004', 'statement_declaration', 'I confirm this statement is true and accurate', 'checkbox', NULL, 'By checking this box and signing below, you confirm that your statement is truthful to the best of your knowledge', NULL, '{"required": true}', 0, 'full'),
('f1000000-0000-0000-0004-000000000004', 'witness_signature', 'Your signature', 'signature', NULL, NULL, NULL, '{"required": true}', 1, 'full'),
('f1000000-0000-0000-0004-000000000004', 'statement_date', 'Date', 'date', NULL, NULL, NULL, '{"required": true}', 2, 'half');

-- Workflow for Witness Statement
INSERT INTO form_workflows (form_template_id, submit_to_role, notify_roles, notify_emails, creates_task, task_template, requires_approval, sync_priority, auto_create_evidence, evidence_audit_element)
VALUES (
  'f1000000-0000-0000-0000-000000000004',
  'safety_manager',
  ARRAY[]::text[],
  ARRAY[]::text[],
  false,
  NULL,
  false,
  1,
  true,
  'Element 10'
);


-- ============================================================================
-- FORM 5: PPE Issuance Form (Element 6)
-- ============================================================================
-- Purpose: Document PPE issued to workers and obtain acknowledgment.
-- Essential for demonstrating PPE program compliance.
-- ============================================================================

INSERT INTO form_templates (id, company_id, form_code, name, description, cor_element, frequency, estimated_time_minutes, icon, color, is_active, is_mandatory, version)
VALUES (
  'f1000000-0000-0000-0000-000000000005',
  NULL,
  'ppe_issuance',
  'PPE Issuance Form',
  'Document personal protective equipment issued to workers. Workers acknowledge receipt and proper fit of PPE.',
  6,
  'as_needed',
  5,
  'hard-hat',
  '#f59e0b',
  true,
  true,
  1
);

-- Section 1: Worker Information
INSERT INTO form_sections (id, form_template_id, title, description, order_index, is_repeatable)
VALUES (
  'f1000000-0000-0000-0005-000000000001',
  'f1000000-0000-0000-0000-000000000005',
  'Worker Information',
  NULL,
  0,
  false
);

INSERT INTO form_fields (form_section_id, field_code, label, field_type, placeholder, help_text, options, validation_rules, order_index, width) VALUES
('f1000000-0000-0000-0005-000000000001', 'worker', 'Worker receiving PPE', 'worker_select', NULL, NULL, NULL, '{"required": true}', 0, 'full'),
('f1000000-0000-0000-0005-000000000001', 'date_issued', 'Date issued', 'date', NULL, NULL, NULL, '{"required": true}', 1, 'half'),
('f1000000-0000-0000-0005-000000000001', 'issue_reason', 'Reason for issue', 'dropdown', NULL, NULL, '["New hire", "Replacement (worn)", "Replacement (damaged)", "Replacement (lost)", "Size change", "Additional equipment"]', '{"required": true}', 2, 'half');

-- Section 2: PPE Items Issued
INSERT INTO form_sections (id, form_template_id, title, description, order_index, is_repeatable)
VALUES (
  'f1000000-0000-0000-0005-000000000002',
  'f1000000-0000-0000-0000-000000000005',
  'PPE Items Issued',
  'Select all items being issued and specify sizes where applicable',
  1,
  false
);

INSERT INTO form_fields (form_section_id, field_code, label, field_type, placeholder, help_text, options, validation_rules, conditional_logic, order_index, width) VALUES
('f1000000-0000-0000-0005-000000000002', 'hard_hat', 'Hard Hat', 'checkbox', NULL, NULL, NULL, '{"required": false}', NULL, 0, 'half'),
('f1000000-0000-0000-0005-000000000002', 'hard_hat_color', 'Hard Hat Color', 'dropdown', NULL, NULL, '["White", "Yellow", "Orange", "Red", "Blue", "Green", "Brown"]', '{"required": false}', '{"field_id": "hard_hat", "operator": "equals", "value": true}', 1, 'half'),
('f1000000-0000-0000-0005-000000000002', 'safety_glasses', 'Safety Glasses', 'checkbox', NULL, NULL, NULL, '{"required": false}', NULL, 2, 'half'),
('f1000000-0000-0000-0005-000000000002', 'glasses_type', 'Glasses Type', 'dropdown', NULL, NULL, '["Clear", "Tinted", "Prescription", "Over-glasses"]', '{"required": false}', '{"field_id": "safety_glasses", "operator": "equals", "value": true}', 3, 'half'),
('f1000000-0000-0000-0005-000000000002', 'safety_boots', 'Safety Boots', 'checkbox', NULL, NULL, NULL, '{"required": false}', NULL, 4, 'half'),
('f1000000-0000-0000-0005-000000000002', 'boot_size', 'Boot Size', 'text', 'e.g., 10, 11W', NULL, NULL, '{"required": false}', '{"field_id": "safety_boots", "operator": "equals", "value": true}', 5, 'half'),
('f1000000-0000-0000-0005-000000000002', 'high_vis_vest', 'High-Vis Vest', 'checkbox', NULL, NULL, NULL, '{"required": false}', NULL, 6, 'half'),
('f1000000-0000-0000-0005-000000000002', 'vest_size', 'Vest Size', 'dropdown', NULL, NULL, '["XS", "S", "M", "L", "XL", "2XL", "3XL"]', '{"required": false}', '{"field_id": "high_vis_vest", "operator": "equals", "value": true}', 7, 'half'),
('f1000000-0000-0000-0005-000000000002', 'gloves', 'Gloves', 'checkbox', NULL, NULL, NULL, '{"required": false}', NULL, 8, 'half'),
('f1000000-0000-0000-0005-000000000002', 'glove_type', 'Glove Type', 'dropdown', NULL, NULL, '["Leather", "Cut-resistant", "Chemical-resistant", "Insulated", "General purpose"]', '{"required": false}', '{"field_id": "gloves", "operator": "equals", "value": true}', 9, 'half'),
('f1000000-0000-0000-0005-000000000002', 'hearing_protection', 'Hearing Protection', 'checkbox', NULL, NULL, NULL, '{"required": false}', NULL, 10, 'half'),
('f1000000-0000-0000-0005-000000000002', 'hearing_type', 'Hearing Protection Type', 'dropdown', NULL, NULL, '["Ear plugs", "Ear muffs", "Banded plugs"]', '{"required": false}', '{"field_id": "hearing_protection", "operator": "equals", "value": true}', 11, 'half'),
('f1000000-0000-0000-0005-000000000002', 'respirator', 'Respirator', 'checkbox', NULL, NULL, NULL, '{"required": false}', NULL, 12, 'half'),
('f1000000-0000-0000-0005-000000000002', 'respirator_type', 'Respirator Type', 'dropdown', NULL, NULL, '["N95 Disposable", "Half-face APR", "Full-face APR", "PAPR"]', '{"required": false}', '{"field_id": "respirator", "operator": "equals", "value": true}', 13, 'half'),
('f1000000-0000-0000-0005-000000000002', 'other_ppe', 'Other PPE items', 'textarea', 'List any additional PPE items issued...', NULL, NULL, '{"required": false}', NULL, 14, 'full');

-- Section 3: Acknowledgment
INSERT INTO form_sections (id, form_template_id, title, description, order_index, is_repeatable)
VALUES (
  'f1000000-0000-0000-0005-000000000003',
  'f1000000-0000-0000-0000-000000000005',
  'Acknowledgment',
  'Worker and supervisor signatures',
  2,
  false
);

INSERT INTO form_fields (form_section_id, field_code, label, field_type, placeholder, help_text, options, validation_rules, order_index, width) VALUES
('f1000000-0000-0000-0005-000000000003', 'fit_confirmed', 'PPE fits properly and worker understands how to use it', 'checkbox', NULL, 'Worker confirms proper fit and understanding of use', NULL, '{"required": true}', 0, 'full'),
('f1000000-0000-0000-0005-000000000003', 'worker_signature', 'Worker signature', 'signature', NULL, 'I acknowledge receipt of the PPE items listed above', NULL, '{"required": true}', 1, 'full'),
('f1000000-0000-0000-0005-000000000003', 'issuer', 'Issued by', 'worker_select', NULL, 'Who issued this PPE?', NULL, '{"required": true}', 2, 'full'),
('f1000000-0000-0000-0005-000000000003', 'issuer_signature', 'Issuer signature', 'signature', NULL, NULL, NULL, '{"required": true}', 3, 'full');

-- Workflow for PPE Issuance
INSERT INTO form_workflows (form_template_id, submit_to_role, notify_roles, notify_emails, creates_task, task_template, requires_approval, sync_priority, auto_create_evidence, evidence_audit_element)
VALUES (
  'f1000000-0000-0000-0000-000000000005',
  NULL,
  ARRAY['hr_manager'],
  ARRAY[]::text[],
  false,
  NULL,
  false,
  3,
  true,
  'Element 6'
);


-- ============================================================================
-- FORM 6: Contractor Monitoring Checklist (Element 4)
-- ============================================================================
-- Purpose: Monitor contractor safety compliance on site.
-- Required for demonstrating due diligence with contractors.
-- ============================================================================

INSERT INTO form_templates (id, company_id, form_code, name, description, cor_element, frequency, estimated_time_minutes, icon, color, is_active, is_mandatory, version)
VALUES (
  'f1000000-0000-0000-0000-000000000006',
  NULL,
  'contractor_monitoring',
  'Contractor Monitoring Checklist',
  'Monitor contractor safety compliance on your site. Regular monitoring demonstrates due diligence and helps ensure contractor safety standards.',
  4,
  'weekly',
  10,
  'clipboard-check',
  '#14b8a6',
  true,
  false,
  1
);

-- Section 1: Contractor Information
INSERT INTO form_sections (id, form_template_id, title, description, order_index, is_repeatable)
VALUES (
  'f1000000-0000-0000-0006-000000000001',
  'f1000000-0000-0000-0000-000000000006',
  'Contractor Information',
  NULL,
  0,
  false
);

INSERT INTO form_fields (form_section_id, field_code, label, field_type, placeholder, help_text, options, validation_rules, order_index, width) VALUES
('f1000000-0000-0000-0006-000000000001', 'contractor_name', 'Contractor company name', 'text', NULL, NULL, NULL, '{"required": true}', 0, 'half'),
('f1000000-0000-0000-0006-000000000001', 'project_name', 'Project/Work being performed', 'text', NULL, NULL, NULL, '{"required": true}', 1, 'half'),
('f1000000-0000-0000-0006-000000000001', 'jobsite', 'Jobsite', 'jobsite_select', NULL, NULL, NULL, '{"required": true}', 2, 'half'),
('f1000000-0000-0000-0006-000000000001', 'monitor_date', 'Date of monitoring', 'date', NULL, NULL, NULL, '{"required": true}', 3, 'half'),
('f1000000-0000-0000-0006-000000000001', 'contractor_workers_onsite', 'Number of contractor workers on site', 'number', NULL, NULL, NULL, '{"required": true, "min_value": 1}', 4, 'half');

-- Section 2: Compliance Checks
INSERT INTO form_sections (id, form_template_id, title, description, order_index, is_repeatable)
VALUES (
  'f1000000-0000-0000-0006-000000000002',
  'f1000000-0000-0000-0000-000000000006',
  'Compliance Checks',
  'Evaluate contractor safety performance',
  1,
  false
);

INSERT INTO form_fields (form_section_id, field_code, label, field_type, placeholder, help_text, options, validation_rules, order_index, width) VALUES
('f1000000-0000-0000-0006-000000000002', 'workers_have_ppe', 'All workers wearing required PPE?', 'yes_no_na', NULL, NULL, NULL, '{"required": true}', 0, 'full'),
('f1000000-0000-0000-0006-000000000002', 'site_orientation_completed', 'Site orientation completed for all workers?', 'yes_no_na', NULL, 'Have all contractor workers completed your site orientation?', NULL, '{"required": true}', 1, 'full'),
('f1000000-0000-0000-0006-000000000002', 'equipment_inspected', 'Equipment/tools in good condition?', 'yes_no_na', NULL, NULL, NULL, '{"required": true}', 2, 'full'),
('f1000000-0000-0000-0006-000000000002', 'work_area_clean', 'Work area clean and organized?', 'yes_no_na', NULL, 'Housekeeping maintained?', NULL, '{"required": true}', 3, 'full'),
('f1000000-0000-0000-0006-000000000002', 'safety_plan_followed', 'Following safety plan/safe work procedures?', 'yes_no_na', NULL, NULL, NULL, '{"required": true}', 4, 'full'),
('f1000000-0000-0000-0006-000000000002', 'permits_in_place', 'Required permits in place?', 'yes_no_na', NULL, 'Hot work, confined space, etc. if applicable', NULL, '{"required": true}', 5, 'full'),
('f1000000-0000-0000-0006-000000000002', 'hazards_controlled', 'Hazards adequately controlled?', 'yes_no_na', NULL, NULL, NULL, '{"required": true}', 6, 'full');

-- Section 3: Issues & Actions
INSERT INTO form_sections (id, form_template_id, title, description, order_index, is_repeatable)
VALUES (
  'f1000000-0000-0000-0006-000000000003',
  'f1000000-0000-0000-0000-000000000006',
  'Issues & Corrective Actions',
  'Document any issues found',
  2,
  false
);

INSERT INTO form_fields (form_section_id, field_code, label, field_type, placeholder, help_text, options, validation_rules, order_index, width) VALUES
('f1000000-0000-0000-0006-000000000003', 'issues_found', 'Were any issues found?', 'yes_no', NULL, NULL, NULL, '{"required": true}', 0, 'half'),
('f1000000-0000-0000-0006-000000000003', 'issue_details', 'Describe issues found', 'textarea', 'Detail each issue observed...', NULL, NULL, '{"required": false}', 1, 'full'),
('f1000000-0000-0000-0006-000000000003', 'corrective_actions', 'Corrective actions required', 'textarea', 'What needs to be fixed?', NULL, NULL, '{"required": false}', 2, 'full'),
('f1000000-0000-0000-0006-000000000003', 'contractor_notified', 'Contractor supervisor notified of issues?', 'yes_no', NULL, NULL, NULL, '{"required": false}', 3, 'half'),
('f1000000-0000-0000-0006-000000000003', 'issue_photos', 'Photos of issues', 'photo', NULL, 'Optional: Document issues with photos', NULL, '{"required": false}', 4, 'full');

-- Section 4: Sign-off
INSERT INTO form_sections (id, form_template_id, title, description, order_index, is_repeatable)
VALUES (
  'f1000000-0000-0000-0006-000000000004',
  'f1000000-0000-0000-0000-000000000006',
  'Sign-off',
  NULL,
  3,
  false
);

INSERT INTO form_fields (form_section_id, field_code, label, field_type, placeholder, help_text, options, validation_rules, order_index, width) VALUES
('f1000000-0000-0000-0006-000000000004', 'overall_rating', 'Overall compliance rating', 'rating', NULL, 'Rate the contractor''s overall safety performance', NULL, '{"required": true}', 0, 'full'),
('f1000000-0000-0000-0006-000000000004', 'monitor_signature', 'Monitor signature', 'signature', NULL, NULL, NULL, '{"required": true}', 1, 'full');

-- Workflow for Contractor Monitoring
INSERT INTO form_workflows (form_template_id, submit_to_role, notify_roles, notify_emails, creates_task, task_template, requires_approval, sync_priority, auto_create_evidence, evidence_audit_element)
VALUES (
  'f1000000-0000-0000-0000-000000000006',
  'project_manager',
  ARRAY['safety_manager'],
  ARRAY[]::text[],
  false,
  NULL,
  false,
  3,
  true,
  'Element 4'
);


-- ============================================================================
-- FORM 7: OHS Meeting Minutes (Element 8)
-- ============================================================================
-- Purpose: Document occupational health & safety committee meetings.
-- Required by legislation for workplaces over a certain size.
-- ============================================================================

INSERT INTO form_templates (id, company_id, form_code, name, description, cor_element, frequency, estimated_time_minutes, icon, color, is_active, is_mandatory, version)
VALUES (
  'f1000000-0000-0000-0000-000000000007',
  NULL,
  'ohs_meeting_minutes',
  'OHS Meeting Minutes',
  'Document occupational health and safety committee meetings. Proper documentation is required by legislation and demonstrates safety commitment.',
  8,
  'monthly',
  15,
  'file-text',
  '#6366f1',
  true,
  true,
  1
);

-- Section 1: Meeting Information
INSERT INTO form_sections (id, form_template_id, title, description, order_index, is_repeatable)
VALUES (
  'f1000000-0000-0000-0007-000000000001',
  'f1000000-0000-0000-0000-000000000007',
  'Meeting Information',
  NULL,
  0,
  false
);

INSERT INTO form_fields (form_section_id, field_code, label, field_type, placeholder, help_text, options, validation_rules, order_index, width) VALUES
('f1000000-0000-0000-0007-000000000001', 'meeting_date', 'Meeting date', 'date', NULL, NULL, NULL, '{"required": true}', 0, 'third'),
('f1000000-0000-0000-0007-000000000001', 'meeting_time', 'Start time', 'time', NULL, NULL, NULL, '{"required": true}', 1, 'third'),
('f1000000-0000-0000-0007-000000000001', 'meeting_duration', 'Duration (minutes)', 'number', '60', NULL, NULL, '{"required": true, "min_value": 15}', 2, 'third'),
('f1000000-0000-0000-0007-000000000001', 'meeting_location', 'Location', 'text', 'e.g., Board Room, Virtual', NULL, NULL, '{"required": true}', 3, 'full'),
('f1000000-0000-0000-0007-000000000001', 'meeting_chair', 'Meeting chair', 'worker_select', NULL, 'Who led the meeting?', NULL, '{"required": true}', 4, 'half'),
('f1000000-0000-0000-0007-000000000001', 'minutes_recorder', 'Minutes recorded by', 'worker_select', NULL, NULL, NULL, '{"required": true}', 5, 'half');

-- Section 2: Attendance
INSERT INTO form_sections (id, form_template_id, title, description, order_index, is_repeatable)
VALUES (
  'f1000000-0000-0000-0007-000000000002',
  'f1000000-0000-0000-0000-000000000007',
  'Attendance',
  NULL,
  1,
  false
);

INSERT INTO form_fields (form_section_id, field_code, label, field_type, placeholder, help_text, options, validation_rules, order_index, width) VALUES
('f1000000-0000-0000-0007-000000000002', 'attendees', 'Attendees', 'textarea', 'List all attendees and their roles...', 'Include management and worker representatives', NULL, '{"required": true, "min_length": 10}', 0, 'full'),
('f1000000-0000-0000-0007-000000000002', 'absent', 'Absent/Regrets', 'textarea', 'List anyone who was expected but absent...', NULL, NULL, '{"required": false}', 1, 'full');

-- Section 3: Previous Meeting Review
INSERT INTO form_sections (id, form_template_id, title, description, order_index, is_repeatable)
VALUES (
  'f1000000-0000-0000-0007-000000000003',
  'f1000000-0000-0000-0000-000000000007',
  'Previous Meeting Review',
  NULL,
  2,
  false
);

INSERT INTO form_fields (form_section_id, field_code, label, field_type, placeholder, help_text, options, validation_rules, order_index, width) VALUES
('f1000000-0000-0000-0007-000000000003', 'previous_minutes_approved', 'Previous meeting minutes approved?', 'yes_no', NULL, NULL, NULL, '{"required": true}', 0, 'half'),
('f1000000-0000-0000-0007-000000000003', 'action_items_review', 'Status of previous action items', 'textarea', 'Update on action items from last meeting...', NULL, NULL, '{"required": true}', 1, 'full');

-- Section 4: Discussion Items (Repeatable)
INSERT INTO form_sections (id, form_template_id, title, description, order_index, is_repeatable, min_repeats, max_repeats)
VALUES (
  'f1000000-0000-0000-0007-000000000004',
  'f1000000-0000-0000-0000-000000000007',
  'Discussion Items',
  'Add each agenda item discussed',
  3,
  true,
  1,
  20
);

INSERT INTO form_fields (form_section_id, field_code, label, field_type, placeholder, help_text, options, validation_rules, order_index, width) VALUES
('f1000000-0000-0000-0007-000000000004', 'agenda_topic', 'Topic', 'text', 'e.g., PPE Compliance Review', NULL, NULL, '{"required": true}', 0, 'full'),
('f1000000-0000-0000-0007-000000000004', 'discussion_notes', 'Discussion summary', 'textarea', 'Key points discussed...', NULL, NULL, '{"required": true}', 1, 'full'),
('f1000000-0000-0000-0007-000000000004', 'action_required', 'Action required?', 'yes_no', NULL, NULL, NULL, '{"required": true}', 2, 'third'),
('f1000000-0000-0000-0007-000000000004', 'action_description', 'Action item', 'text', 'What needs to be done?', NULL, NULL, '{"required": false}', 3, 'third'),
('f1000000-0000-0000-0007-000000000004', 'action_assigned_to', 'Assigned to', 'text', 'Name or role', NULL, NULL, '{"required": false}', 4, 'third');

-- Section 5: New Business & Next Meeting
INSERT INTO form_sections (id, form_template_id, title, description, order_index, is_repeatable)
VALUES (
  'f1000000-0000-0000-0007-000000000005',
  'f1000000-0000-0000-0000-000000000007',
  'Next Meeting',
  NULL,
  4,
  false
);

INSERT INTO form_fields (form_section_id, field_code, label, field_type, placeholder, help_text, options, validation_rules, order_index, width) VALUES
('f1000000-0000-0000-0007-000000000005', 'next_meeting_date', 'Next meeting date', 'date', NULL, NULL, NULL, '{"required": false}', 0, 'half'),
('f1000000-0000-0000-0007-000000000005', 'next_meeting_agenda', 'Proposed agenda items', 'textarea', 'Topics to cover next time...', NULL, NULL, '{"required": false}', 1, 'full'),
('f1000000-0000-0000-0007-000000000005', 'chair_signature', 'Meeting chair signature', 'signature', NULL, NULL, NULL, '{"required": true}', 2, 'full');

-- Workflow for OHS Meeting Minutes
INSERT INTO form_workflows (form_template_id, submit_to_role, notify_roles, notify_emails, creates_task, task_template, requires_approval, sync_priority, auto_create_evidence, evidence_audit_element)
VALUES (
  'f1000000-0000-0000-0000-000000000007',
  NULL,
  ARRAY['safety_manager', 'company_admin'],
  ARRAY[]::text[],
  false,
  NULL,
  false,
  4,
  true,
  'Element 8'
);


-- ============================================================================
-- FORM 8: Corrective Action Tracker (Element 9)
-- ============================================================================
-- Purpose: Track corrective actions from incidents, inspections, and audits.
-- Essential for demonstrating continuous improvement.
-- ============================================================================

INSERT INTO form_templates (id, company_id, form_code, name, description, cor_element, frequency, estimated_time_minutes, icon, color, is_active, is_mandatory, version)
VALUES (
  'f1000000-0000-0000-0000-000000000008',
  NULL,
  'corrective_action',
  'Corrective Action Tracker',
  'Track corrective actions from incidents, inspections, and audits. Ensures issues are addressed and demonstrates continuous improvement.',
  9,
  'as_needed',
  8,
  'check-circle',
  '#22c55e',
  true,
  false,
  1
);

-- Section 1: Issue Details
INSERT INTO form_sections (id, form_template_id, title, description, order_index, is_repeatable)
VALUES (
  'f1000000-0000-0000-0008-000000000001',
  'f1000000-0000-0000-0000-000000000008',
  'Issue Details',
  'What needs to be corrected?',
  0,
  false
);

INSERT INTO form_fields (form_section_id, field_code, label, field_type, placeholder, help_text, options, validation_rules, order_index, width) VALUES
('f1000000-0000-0000-0008-000000000001', 'issue_source', 'Source of issue', 'dropdown', NULL, 'Where was this issue identified?', '["Workplace Inspection", "Incident Investigation", "Internal Audit", "External Audit", "Worker Report", "Near Miss Report", "Management Observation", "Other"]', '{"required": true}', 0, 'half'),
('f1000000-0000-0000-0008-000000000001', 'reference_number', 'Reference number', 'text', 'e.g., INS-2024-042', 'Link to inspection/incident report if applicable', NULL, '{"required": false}', 1, 'half'),
('f1000000-0000-0000-0008-000000000001', 'identified_date', 'Date identified', 'date', NULL, NULL, NULL, '{"required": true}', 2, 'half'),
('f1000000-0000-0000-0008-000000000001', 'location', 'Location', 'text', NULL, 'Where is this issue?', NULL, '{"required": true}', 3, 'half'),
('f1000000-0000-0000-0008-000000000001', 'issue_description', 'Issue description', 'textarea', 'Describe the issue that needs to be corrected...', 'Be specific about what is wrong and the potential consequences', NULL, '{"required": true, "min_length": 20}', 4, 'full'),
('f1000000-0000-0000-0008-000000000001', 'issue_photo', 'Photo of issue', 'photo', NULL, NULL, NULL, '{"required": false}', 5, 'full');

-- Section 2: Corrective Action Plan
INSERT INTO form_sections (id, form_template_id, title, description, order_index, is_repeatable)
VALUES (
  'f1000000-0000-0000-0008-000000000002',
  'f1000000-0000-0000-0000-000000000008',
  'Corrective Action Plan',
  'How will this be fixed?',
  1,
  false
);

INSERT INTO form_fields (form_section_id, field_code, label, field_type, placeholder, help_text, options, validation_rules, order_index, width) VALUES
('f1000000-0000-0000-0008-000000000002', 'corrective_action', 'Corrective action required', 'textarea', 'What needs to be done to fix this issue?', 'Be specific about the steps needed', NULL, '{"required": true, "min_length": 10}', 0, 'full'),
('f1000000-0000-0000-0008-000000000002', 'root_cause', 'Root cause (if known)', 'textarea', 'Why did this issue occur?', NULL, NULL, '{"required": false}', 1, 'full'),
('f1000000-0000-0000-0008-000000000002', 'assigned_to', 'Assigned to', 'worker_select', NULL, 'Who is responsible for completing this action?', NULL, '{"required": true}', 2, 'half'),
('f1000000-0000-0000-0008-000000000002', 'target_date', 'Target completion date', 'date', NULL, NULL, NULL, '{"required": true}', 3, 'half'),
('f1000000-0000-0000-0008-000000000002', 'priority', 'Priority', 'dropdown', NULL, NULL, '[{"value": "low", "label": "Low - Complete when convenient"}, {"value": "medium", "label": "Medium - Complete within target date"}, {"value": "high", "label": "High - Complete ASAP"}, {"value": "critical", "label": "Critical - Stop work until fixed"}]', '{"required": true}', 4, 'half'),
('f1000000-0000-0000-0008-000000000002', 'estimated_cost', 'Estimated cost', 'currency', NULL, 'If applicable', NULL, '{"required": false}', 5, 'half');

-- Section 3: Completion & Verification
INSERT INTO form_sections (id, form_template_id, title, description, order_index, is_repeatable)
VALUES (
  'f1000000-0000-0000-0008-000000000003',
  'f1000000-0000-0000-0000-000000000008',
  'Completion & Verification',
  'To be completed when action is finished',
  2,
  false
);

INSERT INTO form_fields (form_section_id, field_code, label, field_type, placeholder, help_text, options, validation_rules, order_index, width) VALUES
('f1000000-0000-0000-0008-000000000003', 'status', 'Status', 'dropdown', NULL, NULL, '[{"value": "open", "label": "Open - Not started"}, {"value": "in_progress", "label": "In Progress"}, {"value": "completed", "label": "Completed"}, {"value": "verified", "label": "Verified Effective"}, {"value": "cancelled", "label": "Cancelled"}]', '{"required": true}', 0, 'half'),
('f1000000-0000-0000-0008-000000000003', 'completion_date', 'Actual completion date', 'date', NULL, NULL, NULL, '{"required": false}', 1, 'half'),
('f1000000-0000-0000-0008-000000000003', 'completion_notes', 'Completion notes', 'textarea', 'Describe what was done to address the issue...', NULL, NULL, '{"required": false}', 2, 'full'),
('f1000000-0000-0000-0008-000000000003', 'completion_photo', 'Photo showing issue resolved', 'photo', NULL, NULL, NULL, '{"required": false}', 3, 'full'),
('f1000000-0000-0000-0008-000000000003', 'verified_by', 'Verified by', 'worker_select', NULL, 'Who verified the action was effective?', NULL, '{"required": false}', 4, 'half'),
('f1000000-0000-0000-0008-000000000003', 'verification_date', 'Verification date', 'date', NULL, NULL, NULL, '{"required": false}', 5, 'half'),
('f1000000-0000-0000-0008-000000000003', 'verification_notes', 'Verification notes', 'textarea', 'How was effectiveness verified?', NULL, NULL, '{"required": false}', 6, 'full');

-- Workflow for Corrective Action
INSERT INTO form_workflows (form_template_id, submit_to_role, notify_roles, notify_emails, creates_task, task_template, requires_approval, sync_priority, auto_create_evidence, evidence_audit_element)
VALUES (
  'f1000000-0000-0000-0000-000000000008',
  'safety_manager',
  ARRAY[]::text[],
  ARRAY[]::text[],
  true,
  '{"title": "Complete Corrective Action", "assigned_to_role": "supervisor", "due_days": 7, "priority": "medium"}',
  false,
  3,
  true,
  'Element 9'
);


-- ============================================================================
-- FORM 9: Training Feedback Form (Element 8)
-- ============================================================================
-- Purpose: Gather feedback from workers after training sessions.
-- Helps improve training quality and effectiveness.
-- ============================================================================

INSERT INTO form_templates (id, company_id, form_code, name, description, cor_element, frequency, estimated_time_minutes, icon, color, is_active, is_mandatory, version)
VALUES (
  'f1000000-0000-0000-0000-000000000009',
  NULL,
  'training_feedback',
  'Training Feedback Form',
  'Share your feedback about training you received. Your input helps us improve our training programs.',
  8,
  'as_needed',
  5,
  'graduation-cap',
  '#0ea5e9',
  true,
  false,
  1
);

-- Section 1: Training Information
INSERT INTO form_sections (id, form_template_id, title, description, order_index, is_repeatable)
VALUES (
  'f1000000-0000-0000-0009-000000000001',
  'f1000000-0000-0000-0000-000000000009',
  'Training Information',
  NULL,
  0,
  false
);

INSERT INTO form_fields (form_section_id, field_code, label, field_type, placeholder, help_text, options, validation_rules, order_index, width) VALUES
('f1000000-0000-0000-0009-000000000001', 'training_topic', 'Training topic/course', 'text', 'e.g., WHMIS, Fall Protection', NULL, NULL, '{"required": true}', 0, 'full'),
('f1000000-0000-0000-0009-000000000001', 'trainer_name', 'Trainer/Instructor', 'text', NULL, NULL, NULL, '{"required": true}', 1, 'half'),
('f1000000-0000-0000-0009-000000000001', 'training_date', 'Training date', 'date', NULL, NULL, NULL, '{"required": true}', 2, 'half'),
('f1000000-0000-0000-0009-000000000001', 'training_format', 'Training format', 'dropdown', NULL, NULL, '["In-person classroom", "Hands-on practical", "Online/Virtual", "Video/E-learning", "On-the-job", "Combination"]', '{"required": true}', 3, 'half'),
('f1000000-0000-0000-0009-000000000001', 'training_duration', 'Duration (hours)', 'number', NULL, NULL, NULL, '{"required": true, "min_value": 0.5}', 4, 'half');

-- Section 2: Rating
INSERT INTO form_sections (id, form_template_id, title, description, order_index, is_repeatable)
VALUES (
  'f1000000-0000-0000-0009-000000000002',
  'f1000000-0000-0000-0000-000000000009',
  'Rating',
  'Rate your training experience',
  1,
  false
);

INSERT INTO form_fields (form_section_id, field_code, label, field_type, placeholder, help_text, options, validation_rules, order_index, width) VALUES
('f1000000-0000-0000-0009-000000000002', 'content_quality', 'Content quality', 'rating', NULL, 'Was the content relevant and informative?', NULL, '{"required": true}', 0, 'full'),
('f1000000-0000-0000-0009-000000000002', 'trainer_effectiveness', 'Trainer effectiveness', 'rating', NULL, 'How well did the trainer explain the material?', NULL, '{"required": true}', 1, 'full'),
('f1000000-0000-0000-0009-000000000002', 'materials_helpful', 'Training materials were helpful', 'dropdown', NULL, NULL, '[{"value": "yes", "label": "Yes, very helpful"}, {"value": "somewhat", "label": "Somewhat helpful"}, {"value": "no", "label": "Not helpful"}, {"value": "na", "label": "No materials provided"}]', '{"required": true}', 2, 'half'),
('f1000000-0000-0000-0009-000000000002', 'pace_appropriate', 'Training pace was appropriate', 'dropdown', NULL, NULL, '[{"value": "too_slow", "label": "Too slow"}, {"value": "just_right", "label": "Just right"}, {"value": "too_fast", "label": "Too fast"}]', '{"required": true}', 3, 'half'),
('f1000000-0000-0000-0009-000000000002', 'can_apply', 'I can apply what I learned to my job', 'dropdown', NULL, NULL, '[{"value": "strongly_agree", "label": "Strongly agree"}, {"value": "agree", "label": "Agree"}, {"value": "neutral", "label": "Neutral"}, {"value": "disagree", "label": "Disagree"}, {"value": "strongly_disagree", "label": "Strongly disagree"}]', '{"required": true}', 4, 'full');

-- Section 3: Feedback
INSERT INTO form_sections (id, form_template_id, title, description, order_index, is_repeatable)
VALUES (
  'f1000000-0000-0000-0009-000000000003',
  'f1000000-0000-0000-0000-000000000009',
  'Your Feedback',
  'Help us improve',
  2,
  false
);

INSERT INTO form_fields (form_section_id, field_code, label, field_type, placeholder, help_text, options, validation_rules, order_index, width) VALUES
('f1000000-0000-0000-0009-000000000003', 'what_worked_well', 'What worked well?', 'textarea', 'What did you like about this training?', NULL, NULL, '{"required": false}', 0, 'full'),
('f1000000-0000-0000-0009-000000000003', 'suggestions', 'Suggestions for improvement', 'textarea', 'How could this training be improved?', NULL, NULL, '{"required": false}', 1, 'full'),
('f1000000-0000-0000-0009-000000000003', 'additional_training', 'Additional training needed', 'textarea', 'What other training would help you do your job safely?', NULL, NULL, '{"required": false}', 2, 'full'),
('f1000000-0000-0000-0009-000000000003', 'other_comments', 'Other comments', 'textarea', NULL, NULL, NULL, '{"required": false}', 3, 'full');

-- Section 4: Trainee
INSERT INTO form_sections (id, form_template_id, title, description, order_index, is_repeatable)
VALUES (
  'f1000000-0000-0000-0009-000000000004',
  'f1000000-0000-0000-0000-000000000009',
  'Your Information',
  'Optional - helps us follow up if needed',
  3,
  false
);

INSERT INTO form_fields (form_section_id, field_code, label, field_type, placeholder, help_text, options, validation_rules, order_index, width) VALUES
('f1000000-0000-0000-0009-000000000004', 'anonymous', 'Submit anonymously?', 'checkbox', NULL, 'If checked, your name will not be attached to this feedback', NULL, '{"required": false}', 0, 'full'),
('f1000000-0000-0000-0009-000000000004', 'trainee', 'Your name', 'worker_select', NULL, NULL, NULL, '{"required": false}', 1, 'full');

-- Workflow for Training Feedback
INSERT INTO form_workflows (form_template_id, submit_to_role, notify_roles, notify_emails, creates_task, task_template, requires_approval, sync_priority, auto_create_evidence, evidence_audit_element)
VALUES (
  'f1000000-0000-0000-0000-000000000009',
  NULL,
  ARRAY['safety_manager'],
  ARRAY[]::text[],
  false,
  NULL,
  false,
  4,
  true,
  'Element 8'
);


-- ============================================================================
-- FORM 10: Emergency Contact Update (Element 11)
-- ============================================================================
-- Purpose: Allow workers to update their emergency contact information.
-- Essential for emergency response.
-- ============================================================================

INSERT INTO form_templates (id, company_id, form_code, name, description, cor_element, frequency, estimated_time_minutes, icon, color, is_active, is_mandatory, version)
VALUES (
  'f1000000-0000-0000-0000-000000000010',
  NULL,
  'emergency_contact_update',
  'Emergency Contact Update',
  'Keep your emergency contact information current. This ensures we can reach your family in case of an emergency.',
  11,
  'annual',
  5,
  'phone',
  '#dc2626',
  true,
  false,
  1
);

-- Section 1: Worker Information
INSERT INTO form_sections (id, form_template_id, title, description, order_index, is_repeatable)
VALUES (
  'f1000000-0000-0000-0010-000000000001',
  'f1000000-0000-0000-0000-000000000010',
  'Your Information',
  NULL,
  0,
  false
);

INSERT INTO form_fields (form_section_id, field_code, label, field_type, placeholder, help_text, options, validation_rules, order_index, width) VALUES
('f1000000-0000-0000-0010-000000000001', 'worker', 'Your name', 'worker_select', NULL, NULL, NULL, '{"required": true}', 0, 'full'),
('f1000000-0000-0000-0010-000000000001', 'personal_phone', 'Your personal phone', 'phone', 'e.g., 403-555-1234', NULL, NULL, '{"required": true}', 1, 'half'),
('f1000000-0000-0000-0010-000000000001', 'personal_email', 'Your personal email', 'email', NULL, NULL, NULL, '{"required": false}', 2, 'half'),
('f1000000-0000-0000-0010-000000000001', 'home_address', 'Home address', 'textarea', 'Street, City, Province, Postal Code', NULL, NULL, '{"required": false}', 3, 'full');

-- Section 2: Primary Emergency Contact
INSERT INTO form_sections (id, form_template_id, title, description, order_index, is_repeatable)
VALUES (
  'f1000000-0000-0000-0010-000000000002',
  'f1000000-0000-0000-0000-000000000010',
  'Primary Emergency Contact',
  'Who should we contact in case of emergency?',
  1,
  false
);

INSERT INTO form_fields (form_section_id, field_code, label, field_type, placeholder, help_text, options, validation_rules, order_index, width) VALUES
('f1000000-0000-0000-0010-000000000002', 'emergency_name', 'Contact name', 'text', NULL, NULL, NULL, '{"required": true}', 0, 'full'),
('f1000000-0000-0000-0010-000000000002', 'emergency_relationship', 'Relationship', 'dropdown', NULL, NULL, '["Spouse/Partner", "Parent", "Child", "Sibling", "Other Family", "Friend", "Other"]', '{"required": true}', 1, 'half'),
('f1000000-0000-0000-0010-000000000002', 'emergency_phone', 'Primary phone', 'phone', NULL, 'Best number to reach them', NULL, '{"required": true}', 2, 'half'),
('f1000000-0000-0000-0010-000000000002', 'emergency_phone_alt', 'Alternate phone', 'phone', NULL, 'Secondary number if available', NULL, '{"required": false}', 3, 'half'),
('f1000000-0000-0000-0010-000000000002', 'emergency_email', 'Email', 'email', NULL, NULL, NULL, '{"required": false}', 4, 'half');

-- Section 3: Secondary Emergency Contact
INSERT INTO form_sections (id, form_template_id, title, description, order_index, is_repeatable)
VALUES (
  'f1000000-0000-0000-0010-000000000003',
  'f1000000-0000-0000-0000-000000000010',
  'Secondary Emergency Contact',
  'Optional backup contact',
  2,
  false
);

INSERT INTO form_fields (form_section_id, field_code, label, field_type, placeholder, help_text, options, validation_rules, order_index, width) VALUES
('f1000000-0000-0000-0010-000000000003', 'emergency2_name', 'Contact name', 'text', NULL, NULL, NULL, '{"required": false}', 0, 'full'),
('f1000000-0000-0000-0010-000000000003', 'emergency2_relationship', 'Relationship', 'dropdown', NULL, NULL, '["Spouse/Partner", "Parent", "Child", "Sibling", "Other Family", "Friend", "Other"]', '{"required": false}', 1, 'half'),
('f1000000-0000-0000-0010-000000000003', 'emergency2_phone', 'Phone', 'phone', NULL, NULL, NULL, '{"required": false}', 2, 'half');

-- Section 4: Medical Information (Optional)
INSERT INTO form_sections (id, form_template_id, title, description, order_index, is_repeatable)
VALUES (
  'f1000000-0000-0000-0010-000000000004',
  'f1000000-0000-0000-0000-000000000010',
  'Medical Information',
  'Optional but helpful for first responders',
  3,
  false
);

INSERT INTO form_fields (form_section_id, field_code, label, field_type, placeholder, help_text, options, validation_rules, order_index, width) VALUES
('f1000000-0000-0000-0010-000000000004', 'blood_type', 'Blood type', 'dropdown', NULL, 'If known', '["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "Unknown"]', '{"required": false}', 0, 'half'),
('f1000000-0000-0000-0010-000000000004', 'allergies', 'Allergies', 'textarea', 'e.g., Penicillin, bee stings, latex', 'List any known allergies that first responders should know about', NULL, '{"required": false}', 1, 'full'),
('f1000000-0000-0000-0010-000000000004', 'medical_conditions', 'Medical conditions', 'textarea', 'e.g., Diabetes, heart condition, epilepsy', 'List any conditions that may affect treatment in an emergency', NULL, '{"required": false}', 2, 'full'),
('f1000000-0000-0000-0010-000000000004', 'medications', 'Current medications', 'textarea', NULL, NULL, NULL, '{"required": false}', 3, 'full'),
('f1000000-0000-0000-0010-000000000004', 'doctor_name', 'Doctor/Physician name', 'text', NULL, NULL, NULL, '{"required": false}', 4, 'half'),
('f1000000-0000-0000-0010-000000000004', 'doctor_phone', 'Doctor phone', 'phone', NULL, NULL, NULL, '{"required": false}', 5, 'half');

-- Section 5: Acknowledgment
INSERT INTO form_sections (id, form_template_id, title, description, order_index, is_repeatable)
VALUES (
  'f1000000-0000-0000-0010-000000000005',
  'f1000000-0000-0000-0000-000000000010',
  'Acknowledgment',
  NULL,
  4,
  false
);

INSERT INTO form_fields (form_section_id, field_code, label, field_type, placeholder, help_text, options, validation_rules, order_index, width) VALUES
('f1000000-0000-0000-0010-000000000005', 'consent', 'I authorize the company to contact the above individuals in case of emergency', 'checkbox', NULL, NULL, NULL, '{"required": true}', 0, 'full'),
('f1000000-0000-0000-0010-000000000005', 'medical_consent', 'I authorize sharing my medical information with emergency responders', 'checkbox', NULL, NULL, NULL, '{"required": false}', 1, 'full'),
('f1000000-0000-0000-0010-000000000005', 'worker_signature', 'Your signature', 'signature', NULL, NULL, NULL, '{"required": true}', 2, 'full'),
('f1000000-0000-0000-0010-000000000005', 'update_date', 'Date', 'date', NULL, NULL, NULL, '{"required": true}', 3, 'half');

-- Workflow for Emergency Contact Update
INSERT INTO form_workflows (form_template_id, submit_to_role, notify_roles, notify_emails, creates_task, task_template, requires_approval, sync_priority, auto_create_evidence, evidence_audit_element)
VALUES (
  'f1000000-0000-0000-0000-000000000010',
  'hr_manager',
  ARRAY[]::text[],
  ARRAY[]::text[],
  false,
  NULL,
  false,
  4,
  true,
  'Element 11'
);


-- ============================================================================
-- VERIFICATION QUERY
-- Run this after seeding to verify all forms were created correctly
-- ============================================================================

-- SELECT 
--   ft.form_code,
--   ft.name,
--   ft.cor_element,
--   COUNT(DISTINCT fs.id) as section_count,
--   COUNT(ff.id) as field_count
-- FROM form_templates ft
-- LEFT JOIN form_sections fs ON fs.form_template_id = ft.id
-- LEFT JOIN form_fields ff ON ff.form_section_id = fs.id
-- WHERE ft.company_id IS NULL
-- GROUP BY ft.id, ft.form_code, ft.name, ft.cor_element
-- ORDER BY ft.form_code;

-- ============================================================================
-- END OF SEED DATA
-- ============================================================================
