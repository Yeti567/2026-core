-- Migration: Fix SECURITY DEFINER views
-- Changes all views from SECURITY DEFINER to SECURITY INVOKER
-- This ensures RLS policies are enforced based on the querying user, not the view creator

-- Note: In PostgreSQL, to change a view's security property, we need to recreate it
-- We'll use ALTER VIEW ... SET (security_invoker = on) for PostgreSQL 15+
-- For older versions, we'd need to DROP and recreate

-- Fix all SECURITY DEFINER views to use SECURITY INVOKER
DO $$
DECLARE
    view_names text[] := ARRAY[
        'unacknowledged_distributions',
        'equipment_maintenance_costs',
        'upcoming_maintenance',
        'company_compliance_summary',
        'expiring_certifications_dashboard',
        'worker_acknowledgment_status',
        'upcoming_maintenance_schedule',
        'work_order_status_summary',
        'active_documents',
        'worker_certification_matrix',
        'equipment_maintenance_summary',
        'documents_needing_review',
        'document_approval_status',
        'worker_document_portal',
        'equipment_availability'
    ];
    v_name text;
BEGIN
    FOREACH v_name IN ARRAY view_names
    LOOP
        -- Check if view exists before trying to alter it
        IF EXISTS (
            SELECT 1 FROM information_schema.views 
            WHERE table_schema = 'public' AND table_name = v_name
        ) THEN
            EXECUTE format('ALTER VIEW public.%I SET (security_invoker = on)', v_name);
            RAISE NOTICE 'Fixed security for view: %', v_name;
        ELSE
            RAISE NOTICE 'View does not exist, skipping: %', v_name;
        END IF;
    END LOOP;
END $$;
