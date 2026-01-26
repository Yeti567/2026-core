-- ============================================================================
-- CLEANUP MIGRATION
-- ============================================================================
-- Drops tables and types created by the now-deleted 004_form_templates_system.sql
-- to allow 00301_form_builder_system.sql to run cleanly.
-- ============================================================================

DROP TABLE IF EXISTS form_template_assignments CASCADE;
DROP TABLE IF EXISTS form_template_versions CASCADE;
-- form_templates will be recreated by 00301, so we drop the old version
DROP TABLE IF EXISTS form_templates CASCADE;

-- Drop types if they exist (they were in 004)
DROP TYPE IF EXISTS form_field_type CASCADE;
DROP TYPE IF EXISTS form_template_status CASCADE;

-- Also cleanup potentially partial 00301 objects if they exist
DROP TABLE IF EXISTS form_evidence_mappings CASCADE;
DROP TABLE IF EXISTS form_submissions CASCADE;
DROP TABLE IF EXISTS form_workflows CASCADE;
DROP TABLE IF EXISTS form_fields CASCADE;
DROP TABLE IF EXISTS form_sections CASCADE;
