-- ============================================================================
-- COR 2020 Audit Questions Seed Data
-- ============================================================================
-- Complete set of audit questions based on COR 2020 audit tool.
-- Approximately 80-100 questions across 14 elements.
-- ============================================================================

-- Clear existing data
TRUNCATE TABLE audit_questions CASCADE;

-- ============================================================================
-- ELEMENT 1: Health & Safety Management System (50 points)
-- ============================================================================

INSERT INTO audit_questions (element_number, question_number, question_text, verification_methods, required_evidence_types, point_value, sampling_requirements, category) VALUES
(1, '1.1', 'Does the organization have a written health and safety policy?', 
  ARRAY['document'], 
  ARRAY['safety_policy', 'health_safety_policy', 'policy_acknowledgment'], 
  8, 'Review the policy document', 'documentation'),

(1, '1.2', 'Is the policy signed by the most senior person in the organization?', 
  ARRAY['document'], 
  ARRAY['safety_policy', 'health_safety_policy'], 
  5, 'Check signature and date on policy', 'documentation'),

(1, '1.3', 'Does the policy include a commitment to comply with legislation?', 
  ARRAY['document'], 
  ARRAY['safety_policy', 'health_safety_policy'], 
  5, 'Review policy content for legislative commitment', 'documentation'),

(1, '1.4', 'Are health and safety responsibilities documented for all levels?', 
  ARRAY['document', 'interview'], 
  ARRAY['role_responsibility_matrix', 'safety_responsibilities', 'job_descriptions'], 
  8, 'Review responsibility documents and interview 2 supervisors', 'documentation'),

(1, '1.5', 'Is the policy communicated to all workers?', 
  ARRAY['document', 'interview'], 
  ARRAY['orientation_checklist', 'policy_acknowledgment', 'toolbox_talk'], 
  8, 'Review acknowledgment forms and interview 3 workers', 'implementation'),

(1, '1.6', 'Are health and safety objectives established annually?', 
  ARRAY['document'], 
  ARRAY['safety_objectives', 'annual_safety_plan', 'safety_targets'], 
  8, 'Review current year objectives document', 'documentation'),

(1, '1.7', 'Does management review the safety program regularly?', 
  ARRAY['document', 'interview'], 
  ARRAY['management_review', 'safety_meeting_minutes', 'annual_review'], 
  8, 'Review 4 quarterly meeting minutes', 'effectiveness');

-- ============================================================================
-- ELEMENT 2: Hazard Identification & Assessment (50 points)
-- ============================================================================

INSERT INTO audit_questions (element_number, question_number, question_text, verification_methods, required_evidence_types, point_value, sampling_requirements, category) VALUES
(2, '2.1', 'Does the organization have a process to identify and assess workplace hazards?', 
  ARRAY['document', 'observation', 'interview'], 
  ARRAY['hazard_assessment', 'jha_form', 'job_hazard_analysis', 'health_safety_policy'], 
  10, 'Review 5 recent hazard assessments from different jobsites', 'documentation'),

(2, '2.2', 'Are hazard assessments completed before starting new tasks?', 
  ARRAY['document', 'interview'], 
  ARRAY['hazard_assessment', 'jha_form', 'pre_task_hazard_assessment'], 
  8, 'Interview 3 workers about when they do hazard assessments', 'implementation'),

(2, '2.3', 'Is there a process for workers to report hazards?', 
  ARRAY['document', 'observation', 'interview'], 
  ARRAY['hazard_reporting', 'hazard_report', 'safety_concern'], 
  8, 'Review hazard reporting forms and interview 2 workers', 'documentation'),

(2, '2.4', 'Are reported hazards investigated and addressed?', 
  ARRAY['document'], 
  ARRAY['hazard_reporting', 'corrective_action', 'hazard_control'], 
  8, 'Review 5 hazard reports and their corrective actions', 'effectiveness'),

(2, '2.5', 'Do hazard assessments identify controls for each hazard?', 
  ARRAY['document'], 
  ARRAY['hazard_assessment', 'jha_form', 'risk_assessment'], 
  8, 'Review 5 assessments for documented controls', 'documentation'),

(2, '2.6', 'Are hazard assessments reviewed when conditions change?', 
  ARRAY['document', 'interview'], 
  ARRAY['hazard_assessment', 'jha_form', 'hazard_review'], 
  8, 'Interview supervisors about reassessment triggers', 'implementation');

-- ============================================================================
-- ELEMENT 3: Hazard Control (50 points)
-- ============================================================================

INSERT INTO audit_questions (element_number, question_number, question_text, verification_methods, required_evidence_types, point_value, sampling_requirements, category) VALUES
(3, '3.1', 'Does the organization use the hierarchy of controls?', 
  ARRAY['document', 'observation'], 
  ARRAY['hazard_control', 'control_implementation', 'jha_form'], 
  10, 'Review 5 hazard controls for hierarchy application', 'documentation'),

(3, '3.2', 'Are safe work practices documented for routine tasks?', 
  ARRAY['document'], 
  ARRAY['swp_form', 'safe_work_practice', 'sop_acknowledgment'], 
  10, 'Review 5 safe work practice documents', 'documentation'),

(3, '3.3', 'Are safe job procedures written for critical tasks?', 
  ARRAY['document'], 
  ARRAY['sjp_form', 'critical_task_analysis', 'task_analysis', 'lockout_tagout'], 
  10, 'Review procedures for high-risk tasks', 'documentation'),

(3, '3.4', 'Are workers trained on safe work practices?', 
  ARRAY['document', 'interview'], 
  ARRAY['training_record', 'sop_acknowledgment', 'competency_assessment'], 
  10, 'Review training records and interview 3 workers', 'implementation'),

(3, '3.5', 'Is the effectiveness of controls verified?', 
  ARRAY['document', 'observation'], 
  ARRAY['control_verification', 'workplace_inspection', 'safety_audit'], 
  10, 'Review inspection records for control verification', 'effectiveness');

-- ============================================================================
-- ELEMENT 4: Competency & Training (50 points)
-- ============================================================================

INSERT INTO audit_questions (element_number, question_number, question_text, verification_methods, required_evidence_types, point_value, sampling_requirements, category) VALUES
(4, '4.1', 'Is there an orientation program for new workers?', 
  ARRAY['document', 'interview'], 
  ARRAY['orientation_checklist', 'new_hire_orientation', 'worker_orientation'], 
  10, 'Review orientation program and 5 completed checklists', 'documentation'),

(4, '4.2', 'Does orientation cover site-specific hazards?', 
  ARRAY['document', 'interview'], 
  ARRAY['orientation_checklist', 'site_orientation'], 
  8, 'Review checklist content and interview 3 new workers', 'implementation'),

(4, '4.3', 'Are training needs identified for each position?', 
  ARRAY['document'], 
  ARRAY['training_matrix', 'training_plan', 'job_descriptions'], 
  8, 'Review training matrix for different positions', 'documentation'),

(4, '4.4', 'Is training provided for identified needs?', 
  ARRAY['document'], 
  ARRAY['training_record', 'training_attendance', 'certification_record'], 
  8, 'Review 10 worker training records', 'implementation'),

(4, '4.5', 'Are training records maintained?', 
  ARRAY['document'], 
  ARRAY['training_record', 'training_attendance', 'training_matrix'], 
  8, 'Verify training records for 10 workers', 'documentation'),

(4, '4.6', 'Is competency verified after training?', 
  ARRAY['document', 'interview'], 
  ARRAY['competency_assessment', 'skills_verification', 'practical_assessment'], 
  8, 'Review competency assessments and interview supervisors', 'effectiveness');

-- ============================================================================
-- ELEMENT 5: Workplace Behavior (45 points)
-- ============================================================================

INSERT INTO audit_questions (element_number, question_number, question_text, verification_methods, required_evidence_types, point_value, sampling_requirements, category) VALUES
(5, '5.1', 'Are company safety rules documented?', 
  ARRAY['document'], 
  ARRAY['safety_rules', 'company_rules', 'safety_handbook'], 
  10, 'Review safety rules document', 'documentation'),

(5, '5.2', 'Are rules communicated to all workers?', 
  ARRAY['document', 'interview'], 
  ARRAY['rule_acknowledgment', 'safety_rules_sign_off', 'orientation_checklist'], 
  8, 'Review acknowledgments and interview 3 workers', 'implementation'),

(5, '5.3', 'Is there a progressive discipline system?', 
  ARRAY['document'], 
  ARRAY['disciplinary_action', 'progressive_discipline', 'rule_violation_report'], 
  8, 'Review discipline policy and sample records', 'documentation'),

(5, '5.4', 'Are rule violations addressed consistently?', 
  ARRAY['document', 'interview'], 
  ARRAY['disciplinary_action', 'rule_violation_report'], 
  10, 'Review violation records and interview supervisors', 'effectiveness'),

(5, '5.5', 'Is there a safety recognition program?', 
  ARRAY['document', 'interview'], 
  ARRAY['safety_recognition', 'worker_recognition', 'safety_award'], 
  9, 'Review program and interview workers about recognition', 'implementation');

-- ============================================================================
-- ELEMENT 6: Personal Protective Equipment (45 points)
-- ============================================================================

INSERT INTO audit_questions (element_number, question_number, question_text, verification_methods, required_evidence_types, point_value, sampling_requirements, category) VALUES
(6, '6.1', 'Is a PPE hazard assessment conducted?', 
  ARRAY['document'], 
  ARRAY['ppe_assessment', 'ppe_hazard_assessment', 'ppe_matrix'], 
  10, 'Review PPE assessment document', 'documentation'),

(6, '6.2', 'Is appropriate PPE provided to workers?', 
  ARRAY['document', 'observation'], 
  ARRAY['ppe_issuance', 'ppe_sign_out', 'equipment_issuance'], 
  10, 'Review issuance records and observe workers', 'implementation'),

(6, '6.3', 'Are workers trained on PPE selection and use?', 
  ARRAY['document', 'interview'], 
  ARRAY['ppe_training', 'training_record', 'ppe_orientation'], 
  8, 'Review training records and interview 3 workers', 'implementation'),

(6, '6.4', 'Is PPE inspected regularly?', 
  ARRAY['document', 'observation'], 
  ARRAY['ppe_inspection', 'equipment_inspection', 'pre_use_inspection'], 
  8, 'Review inspection records and observe workers checking PPE', 'effectiveness'),

(6, '6.5', 'Is damaged PPE replaced promptly?', 
  ARRAY['document', 'interview'], 
  ARRAY['ppe_issuance', 'equipment_replacement', 'ppe_inspection'], 
  9, 'Review replacement records and interview workers', 'effectiveness');

-- ============================================================================
-- ELEMENT 7: Preventative Maintenance (45 points)
-- ============================================================================

INSERT INTO audit_questions (element_number, question_number, question_text, verification_methods, required_evidence_types, point_value, sampling_requirements, category) VALUES
(7, '7.1', 'Is there a preventative maintenance program?', 
  ARRAY['document'], 
  ARRAY['maintenance_program', 'pm_schedule', 'maintenance_plan'], 
  10, 'Review maintenance program document', 'documentation'),

(7, '7.2', 'Is a maintenance schedule maintained?', 
  ARRAY['document'], 
  ARRAY['maintenance_log', 'maintenance_schedule', 'equipment_maintenance'], 
  10, 'Review schedule and 3 months of maintenance logs', 'implementation'),

(7, '7.3', 'Are pre-use inspections conducted?', 
  ARRAY['document', 'observation'], 
  ARRAY['pre_use_inspection', 'equipment_inspection', 'vehicle_inspection'], 
  8, 'Review 10 pre-use inspection records', 'implementation'),

(7, '7.4', 'Are deficiencies corrected before use?', 
  ARRAY['document', 'interview'], 
  ARRAY['deficiency_report', 'equipment_repair', 'maintenance_request'], 
  8, 'Review deficiency correction records and interview operators', 'effectiveness'),

(7, '7.5', 'Is defective equipment taken out of service?', 
  ARRAY['document', 'observation', 'interview'], 
  ARRAY['deficiency_report', 'lockout_tagout', 'equipment_status'], 
  9, 'Review lockout records and interview 2 workers', 'effectiveness');

-- ============================================================================
-- ELEMENT 8: Training & Communication (50 points)
-- ============================================================================

INSERT INTO audit_questions (element_number, question_number, question_text, verification_methods, required_evidence_types, point_value, sampling_requirements, category) VALUES
(8, '8.1', 'Is there a formal training program?', 
  ARRAY['document'], 
  ARRAY['training_program', 'training_plan', 'annual_training_schedule'], 
  10, 'Review training program document', 'documentation'),

(8, '8.2', 'Are toolbox talks conducted regularly?', 
  ARRAY['document'], 
  ARRAY['toolbox_talk', 'safety_talk', 'tailgate_meeting'], 
  10, 'Review 12 weeks of toolbox talk records', 'implementation'),

(8, '8.3', 'Do toolbox talks cover relevant hazards?', 
  ARRAY['document', 'interview'], 
  ARRAY['toolbox_talk', 'safety_talk'], 
  8, 'Review talk topics and interview 3 workers', 'effectiveness'),

(8, '8.4', 'Are training records maintained?', 
  ARRAY['document'], 
  ARRAY['training_record', 'training_attendance', 'training_sign_in'], 
  8, 'Review training records for 10 workers', 'documentation'),

(8, '8.5', 'Is training effectiveness evaluated?', 
  ARRAY['document'], 
  ARRAY['training_evaluation', 'competency_assessment', 'training_feedback'], 
  7, 'Review training evaluations and feedback', 'effectiveness'),

(8, '8.6', 'Is safety information communicated effectively?', 
  ARRAY['observation', 'interview'], 
  ARRAY['safety_bulletin', 'safety_notice', 'communication_log'], 
  7, 'Observe postings and interview 3 workers', 'implementation');

-- ============================================================================
-- ELEMENT 9: Workplace Inspections (50 points)
-- ============================================================================

INSERT INTO audit_questions (element_number, question_number, question_text, verification_methods, required_evidence_types, point_value, sampling_requirements, category) VALUES
(9, '9.1', 'Is there an inspection schedule?', 
  ARRAY['document'], 
  ARRAY['inspection_schedule', 'inspection_plan'], 
  8, 'Review inspection schedule document', 'documentation'),

(9, '9.2', 'Are workplace inspections conducted regularly?', 
  ARRAY['document'], 
  ARRAY['workplace_inspection', 'site_inspection', 'safety_inspection'], 
  12, 'Review 12 weeks of inspection records', 'implementation'),

(9, '9.3', 'Are inspections documented properly?', 
  ARRAY['document'], 
  ARRAY['workplace_inspection', 'inspection_checklist'], 
  8, 'Review 5 inspection reports for completeness', 'documentation'),

(9, '9.4', 'Are inspection findings corrected?', 
  ARRAY['document'], 
  ARRAY['corrective_action', 'inspection_corrective_action', 'action_item'], 
  10, 'Review corrective actions for 5 inspections', 'effectiveness'),

(9, '9.5', 'Do workers participate in inspections?', 
  ARRAY['document', 'interview'], 
  ARRAY['workplace_inspection', 'joint_inspection', 'jhsc_inspection'], 
  6, 'Review records and interview workers about participation', 'implementation'),

(9, '9.6', 'Are inspection trends analyzed?', 
  ARRAY['document'], 
  ARRAY['trend_analysis', 'inspection_summary', 'quarterly_review'], 
  6, 'Review trend analysis documents', 'effectiveness');

-- ============================================================================
-- ELEMENT 10: Incident Investigation (50 points)
-- ============================================================================

INSERT INTO audit_questions (element_number, question_number, question_text, verification_methods, required_evidence_types, point_value, sampling_requirements, category) VALUES
(10, '10.1', 'Is there an incident reporting procedure?', 
  ARRAY['document'], 
  ARRAY['investigation_procedure', 'incident_policy', 'reporting_procedure'], 
  8, 'Review incident reporting procedure', 'documentation'),

(10, '10.2', 'Are incidents reported promptly?', 
  ARRAY['document', 'interview'], 
  ARRAY['incident_report', 'near_miss_report', 'accident_report'], 
  10, 'Review 5 incident reports for timeliness', 'implementation'),

(10, '10.3', 'Are incidents investigated to find root causes?', 
  ARRAY['document'], 
  ARRAY['incident_investigation', 'root_cause_analysis', 'investigation_report'], 
  12, 'Review 3 investigation reports for root cause analysis', 'effectiveness'),

(10, '10.4', 'Are corrective actions implemented?', 
  ARRAY['document'], 
  ARRAY['corrective_action', 'incident_followup', 'action_closeout'], 
  10, 'Review corrective actions for 3 investigations', 'effectiveness'),

(10, '10.5', 'Are near misses reported and investigated?', 
  ARRAY['document', 'interview'], 
  ARRAY['near_miss_report', 'incident_investigation'], 
  5, 'Review near miss reports and interview workers', 'implementation'),

(10, '10.6', 'Are investigation findings communicated?', 
  ARRAY['document', 'interview'], 
  ARRAY['safety_alert', 'lessons_learned', 'toolbox_talk'], 
  5, 'Review communication records and interview workers', 'effectiveness');

-- ============================================================================
-- ELEMENT 11: Emergency Preparedness (50 points)
-- ============================================================================

INSERT INTO audit_questions (element_number, question_number, question_text, verification_methods, required_evidence_types, point_value, sampling_requirements, category) VALUES
(11, '11.1', 'Is there a written emergency response plan?', 
  ARRAY['document'], 
  ARRAY['emergency_plan', 'emergency_response_plan', 'erp'], 
  10, 'Review emergency response plan document', 'documentation'),

(11, '11.2', 'Does the plan cover all potential emergencies?', 
  ARRAY['document'], 
  ARRAY['emergency_plan', 'emergency_procedures'], 
  8, 'Review plan for fire, medical, spill, evacuation', 'documentation'),

(11, '11.3', 'Are emergency drills conducted?', 
  ARRAY['document'], 
  ARRAY['emergency_drill', 'fire_drill_log', 'evacuation_drill', 'evacuation_record'], 
  10, 'Review drill records for past 12 months', 'implementation'),

(11, '11.4', 'Are workers trained on emergency procedures?', 
  ARRAY['document', 'interview'], 
  ARRAY['emergency_training', 'first_aid_training', 'fire_safety_training'], 
  8, 'Review training records and interview 3 workers', 'implementation'),

(11, '11.5', 'Is emergency equipment inspected?', 
  ARRAY['document', 'observation'], 
  ARRAY['fire_extinguisher_inspection', 'first_aid_inspection', 'emergency_equipment'], 
  7, 'Review inspection records and observe equipment', 'effectiveness'),

(11, '11.6', 'Are emergency contact numbers posted?', 
  ARRAY['observation'], 
  ARRAY['emergency_contacts', 'emergency_posting'], 
  7, 'Observe emergency postings at worksite', 'implementation');

-- ============================================================================
-- ELEMENT 12: Statistics & Records (45 points)
-- ============================================================================

INSERT INTO audit_questions (element_number, question_number, question_text, verification_methods, required_evidence_types, point_value, sampling_requirements, category) VALUES
(12, '12.1', 'Are safety statistics tracked?', 
  ARRAY['document'], 
  ARRAY['safety_statistics', 'monthly_stats', 'kpi_report'], 
  10, 'Review 12 months of safety statistics', 'documentation'),

(12, '12.2', 'Is an injury log maintained?', 
  ARRAY['document'], 
  ARRAY['injury_log', 'first_aid_log', 'wsib_form_7'], 
  8, 'Review injury/first aid log', 'documentation'),

(12, '12.3', 'Are frequency and severity rates calculated?', 
  ARRAY['document'], 
  ARRAY['safety_statistics', 'frequency_rate', 'severity_rate'], 
  8, 'Review rate calculations', 'documentation'),

(12, '12.4', 'Are trends analyzed and acted upon?', 
  ARRAY['document'], 
  ARRAY['trend_analysis', 'quarterly_review', 'safety_metrics'], 
  10, 'Review trend analysis and resulting actions', 'effectiveness'),

(12, '12.5', 'Are records retained as required?', 
  ARRAY['document'], 
  ARRAY['records_retention', 'document_control', 'records_index'], 
  9, 'Verify records retention for 3 years', 'documentation');

-- ============================================================================
-- ELEMENT 13: Regulatory Awareness (45 points)
-- ============================================================================

INSERT INTO audit_questions (element_number, question_number, question_text, verification_methods, required_evidence_types, point_value, sampling_requirements, category) VALUES
(13, '13.1', 'Are regulatory requirements identified?', 
  ARRAY['document'], 
  ARRAY['compliance_checklist', 'regulatory_register', 'legal_requirements'], 
  10, 'Review regulatory requirements register', 'documentation'),

(13, '13.2', 'Is legislation accessible to workers?', 
  ARRAY['observation', 'interview'], 
  ARRAY['legislation_access', 'regulation_posting'], 
  8, 'Observe accessibility and interview 2 workers', 'implementation'),

(13, '13.3', 'Are regulatory updates tracked?', 
  ARRAY['document'], 
  ARRAY['regulatory_update_log', 'legislation_review', 'compliance_update'], 
  8, 'Review regulatory update tracking system', 'documentation'),

(13, '13.4', 'Is compliance verified regularly?', 
  ARRAY['document'], 
  ARRAY['compliance_audit', 'regulatory_inspection', 'compliance_review'], 
  10, 'Review compliance verification records', 'effectiveness'),

(13, '13.5', 'Are workers informed of regulatory requirements?', 
  ARRAY['document', 'interview'], 
  ARRAY['training_record', 'toolbox_talk', 'safety_bulletin'], 
  9, 'Review training and interview 3 workers', 'implementation');

-- ============================================================================
-- ELEMENT 14: Management System Review (50 points)
-- ============================================================================

INSERT INTO audit_questions (element_number, question_number, question_text, verification_methods, required_evidence_types, point_value, sampling_requirements, category) VALUES
(14, '14.1', 'Is the safety program reviewed annually?', 
  ARRAY['document'], 
  ARRAY['annual_review', 'management_review', 'system_review'], 
  10, 'Review annual management review document', 'documentation'),

(14, '14.2', 'Are safety meetings held regularly?', 
  ARRAY['document'], 
  ARRAY['safety_meeting_minutes', 'jhsc_meeting', 'safety_committee'], 
  10, 'Review 12 months of meeting minutes', 'implementation'),

(14, '14.3', 'Does senior management participate in safety?', 
  ARRAY['document', 'interview'], 
  ARRAY['management_walkthrough', 'leadership_tour', 'visible_leadership'], 
  8, 'Review participation records and interview workers', 'implementation'),

(14, '14.4', 'Are improvement opportunities identified?', 
  ARRAY['document'], 
  ARRAY['improvement_plan', 'action_plan', 'corrective_action'], 
  8, 'Review improvement plans from reviews', 'effectiveness'),

(14, '14.5', 'Are improvements implemented?', 
  ARRAY['document'], 
  ARRAY['improvement_plan', 'action_closeout', 'implementation_record'], 
  7, 'Review implementation of planned improvements', 'effectiveness'),

(14, '14.6', 'Is the program effectiveness measured?', 
  ARRAY['document'], 
  ARRAY['program_evaluation', 'effectiveness_review', 'safety_metrics'], 
  7, 'Review program effectiveness measures', 'effectiveness');

-- ============================================================================
-- END OF SEED DATA
-- ============================================================================

-- Verify insertion
DO $$
DECLARE
    question_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO question_count FROM audit_questions;
    RAISE NOTICE 'Inserted % audit questions', question_count;
END $$;
