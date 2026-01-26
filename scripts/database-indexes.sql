-- Database Performance Indexes
-- Adds missing indexes to improve query performance and prevent DoS via slow queries

-- Companies table indexes
CREATE INDEX IF NOT EXISTS idx_companies_wsib_number ON companies(wsib_number);
CREATE INDEX IF NOT EXISTS idx_companies_email ON companies(email);
CREATE INDEX IF NOT EXISTS idx_companies_industry ON companies(industry);
CREATE INDEX IF NOT EXISTS idx_companies_status ON companies(status);
CREATE INDEX IF NOT EXISTS idx_companies_created_at ON companies(created_at);
CREATE INDEX IF NOT EXISTS idx_companies_updated_at ON companies(updated_at);
CREATE INDEX IF NOT EXISTS idx_companies_city_province ON companies(city, province);
CREATE INDEX IF NOT EXISTS idx_companies_employee_count ON companies(employee_count) WHERE employee_count IS NOT NULL;

-- Departments table indexes
CREATE INDEX IF NOT EXISTS idx_departments_company_id ON departments(company_id);
CREATE INDEX IF NOT EXISTS idx_departments_name ON departments(name);
CREATE INDEX IF NOT EXISTS idx_departments_created_at ON departments(created_at);
CREATE INDEX IF NOT EXISTS idx_departments_company_name ON departments(company_id, name);

-- Company users table indexes (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'company_users') THEN
    CREATE INDEX IF NOT EXISTS idx_company_users_user_id ON company_users(user_id);
    CREATE INDEX IF NOT EXISTS idx_company_users_company_id ON company_users(company_id);
    CREATE INDEX IF NOT EXISTS idx_company_users_email ON company_users(email);
    CREATE INDEX IF NOT EXISTS idx_company_users_role ON company_users(role);
    CREATE INDEX IF NOT EXISTS idx_company_users_status ON company_users(status);
    CREATE INDEX IF NOT EXISTS idx_company_users_company_role ON company_users(company_id, role);
    CREATE INDEX IF NOT EXISTS idx_company_users_active_users ON company_users(company_id, status) WHERE status = 'active';
  END IF;
END $$;

-- Users table indexes (auth schema)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'users') THEN
    CREATE INDEX IF NOT EXISTS idx_auth_users_email ON auth.users(email);
    CREATE INDEX IF NOT EXISTS idx_auth_users_created_at ON auth.users(created_at);
  END IF;
END $$;

-- User passwords table indexes (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_passwords') THEN
    CREATE INDEX IF NOT EXISTS idx_user_passwords_user_id ON user_passwords(user_id);
    CREATE INDEX IF NOT EXISTS idx_user_passwords_created_at ON user_passwords(created_at);
  END IF;
END $$;

-- Registration tokens table indexes
CREATE INDEX IF NOT EXISTS idx_registration_tokens_token ON registration_tokens(token);
CREATE INDEX IF NOT EXISTS idx_registration_tokens_expires_at ON registration_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_registration_tokens_created_at ON registration_tokens(created_at);
CREATE INDEX IF NOT EXISTS idx_registration_tokens_industry ON registration_tokens(industry) WHERE industry IS NOT NULL;

-- Registration attempts table indexes (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'registration_attempts') THEN
    CREATE INDEX IF NOT EXISTS idx_registration_attempts_ip_address ON registration_attempts(ip_address);
    CREATE INDEX IF NOT EXISTS idx_registration_attempts_created_at ON registration_attempts(created_at);
    CREATE INDEX IF NOT EXISTS idx_registration_attempts_success ON registration_attempts(success);
    CREATE INDEX IF NOT EXISTS idx_registration_attempts_ip_time ON registration_attempts(ip_address, created_at);
    CREATE INDEX IF NOT EXISTS idx_registration_attempts_failed_attempts ON registration_attempts(ip_address, success, created_at) WHERE success = false;
  END IF;
END $$;

-- Push subscriptions table indexes
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'push_subscriptions') THEN
    CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON push_subscriptions(user_id);
    CREATE INDEX IF NOT EXISTS idx_push_subscriptions_company_id ON push_subscriptions(company_id);
    CREATE INDEX IF NOT EXISTS idx_push_subscriptions_endpoint ON push_subscriptions(endpoint);
    CREATE INDEX IF NOT EXISTS idx_push_subscriptions_active ON push_subscriptions(is_active) WHERE is_active = true;
    CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_active ON push_subscriptions(user_id, is_active) WHERE is_active = true;
    CREATE INDEX IF NOT EXISTS idx_push_subscriptions_company_active ON push_subscriptions(company_id, is_active) WHERE is_active = true;
    CREATE INDEX IF NOT EXISTS idx_push_subscriptions_last_used ON push_subscriptions(last_used_at);
  END IF;
END $$;

-- Notification logs table indexes (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notification_logs') THEN
    CREATE INDEX IF NOT EXISTS idx_notification_logs_user_id ON notification_logs(user_id);
    CREATE INDEX IF NOT EXISTS idx_notification_logs_company_id ON notification_logs(company_id);
    CREATE INDEX IF NOT EXISTS idx_notification_logs_created_at ON notification_logs(created_at);
    CREATE INDEX IF NOT EXISTS idx_notification_logs_company_time ON notification_logs(company_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_notification_logs_user_time ON notification_logs(user_id, created_at);
  END IF;
END $$;

-- Notification preferences table indexes (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notification_preferences') THEN
    CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id ON notification_preferences(user_id);
    CREATE INDEX IF NOT EXISTS idx_notification_preferences_created_at ON notification_preferences(created_at);
  END IF;
END $$;

-- Forms table indexes (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'forms') THEN
    CREATE INDEX IF NOT EXISTS idx_forms_company_id ON forms(company_id);
    CREATE INDEX IF NOT EXISTS idx_forms_status ON forms(status);
    CREATE INDEX IF NOT EXISTS idx_forms_type ON forms(type);
    CREATE INDEX IF NOT EXISTS idx_forms_created_at ON forms(created_at);
    CREATE INDEX IF NOT EXISTS idx_forms_updated_at ON forms(updated_at);
    CREATE INDEX IF NOT EXISTS idx_forms_company_status ON forms(company_id, status);
    CREATE INDEX IF NOT EXISTS idx_forms_company_type ON forms(company_id, type);
  END IF;
END $$;

-- Form submissions table indexes (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'form_submissions') THEN
    CREATE INDEX IF NOT EXISTS idx_form_submissions_form_id ON form_submissions(form_id);
    CREATE INDEX IF NOT EXISTS idx_form_submissions_user_id ON form_submissions(user_id);
    CREATE INDEX IF NOT EXISTS idx_form_submissions_company_id ON form_submissions(company_id);
    CREATE INDEX IF NOT EXISTS idx_form_submissions_status ON form_submissions(status);
    CREATE INDEX IF NOT EXISTS idx_form_submissions_created_at ON form_submissions(created_at);
    CREATE INDEX IF NOT EXISTS idx_form_submissions_company_status ON form_submissions(company_id, status);
    CREATE INDEX IF NOT EXISTS idx_form_submissions_user_time ON form_submissions(user_id, created_at);
  END IF;
END $$;

-- Tasks table indexes (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tasks') THEN
    CREATE INDEX IF NOT EXISTS idx_tasks_company_id ON tasks(company_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
    CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
    CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date) WHERE due_date IS NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at);
    CREATE INDEX IF NOT EXISTS idx_tasks_updated_at ON tasks(updated_at);
    CREATE INDEX IF NOT EXISTS idx_tasks_company_status ON tasks(company_id, status);
    CREATE INDEX IF NOT EXISTS idx_tasks_user_status ON tasks(user_id, status);
    CREATE INDEX IF NOT EXISTS idx_tasks_company_priority ON tasks(company_id, priority);
  END IF;
END $$;

-- Hazard library table indexes (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'hazard_library') THEN
    CREATE INDEX IF NOT EXISTS idx_hazard_library_category ON hazard_library(category);
    CREATE INDEX IF NOT EXISTS idx_hazard_library_type ON hazard_library(type);
    CREATE INDEX IF NOT EXISTS idx_hazard_library_industry ON hazard_library(industry) WHERE industry IS NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_hazard_library_active ON hazard_library(is_active) WHERE is_active = true;
    CREATE INDEX IF NOT EXISTS idx_hazard_library_category_type ON hazard_library(category, type);
  END IF;
END $$;

-- Audit questions table indexes (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_questions') THEN
    CREATE INDEX IF NOT EXISTS idx_audit_questions_category ON audit_questions(category);
    CREATE INDEX IF NOT EXISTS idx_audit_questions_type ON audit_questions(type);
    CREATE INDEX IF NOT EXISTS idx_audit_questions_industry ON audit_questions(industry) WHERE industry IS NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_audit_questions_active ON audit_questions(is_active) WHERE is_active = true;
    CREATE INDEX IF NOT EXISTS idx_audit_questions_category_type ON audit_questions(category, type);
  END IF;
END $$;

-- Certifications table indexes (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'certifications') THEN
    CREATE INDEX IF NOT EXISTS idx_certifications_user_id ON certifications(user_id);
    CREATE INDEX IF NOT EXISTS idx_certifications_company_id ON certifications(company_id);
    CREATE INDEX IF NOT EXISTS idx_certifications_type ON certifications(type);
    CREATE INDEX IF NOT EXISTS idx_certifications_status ON certifications(status);
    CREATE INDEX IF NOT EXISTS idx_certifications_expiry_date ON certifications(expiry_date) WHERE expiry_date IS NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_certifications_created_at ON certifications(created_at);
    CREATE INDEX IF NOT EXISTS idx_certifications_company_status ON certifications(company_id, status);
    CREATE INDEX IF NOT EXISTS idx_certifications_expiring_soon ON certifications(expiry_date, status) 
      WHERE expiry_date IS NOT NULL AND status = 'active';
  END IF;
END $$;

-- Documents table indexes (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'documents') THEN
    CREATE INDEX IF NOT EXISTS idx_documents_company_id ON documents(company_id);
    CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);
    CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(type);
    CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
    CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents(created_at);
    CREATE INDEX IF NOT EXISTS idx_documents_updated_at ON documents(updated_at);
    CREATE INDEX IF NOT EXISTS idx_documents_company_type ON documents(company_id, type);
    CREATE INDEX IF NOT EXISTS idx_documents_user_type ON documents(user_id, type);
  END IF;
END $$;

-- Audit reports table indexes (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_reports') THEN
    CREATE INDEX IF NOT EXISTS idx_audit_reports_company_id ON audit_reports(company_id);
    CREATE INDEX IF NOT EXISTS idx_audit_reports_user_id ON audit_reports(user_id);
    CREATE INDEX IF NOT EXISTS idx_audit_reports_status ON audit_reports(status);
    CREATE INDEX IF NOT EXISTS idx_audit_reports_type ON audit_reports(type);
    CREATE INDEX IF NOT EXISTS idx_audit_reports_created_at ON audit_reports(created_at);
    CREATE INDEX IF NOT EXISTS idx_audit_reports_company_status ON audit_reports(company_id, status);
    CREATE INDEX IF NOT EXISTS idx_audit_reports_company_type ON audit_reports(company_id, type);
  END IF;
END $$;

-- COR phases table indexes (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'cor_phases') THEN
    CREATE INDEX IF NOT EXISTS idx_cor_phases_company_id ON cor_phases(company_id);
    CREATE INDEX IF NOT EXISTS idx_cor_phases_status ON cor_phases(status);
    CREATE INDEX IF NOT EXISTS idx_cor_phases_phase_number ON cor_phases(phase_number);
    CREATE INDEX IF NOT EXISTS idx_cor_phases_created_at ON cor_phases(created_at);
    CREATE INDEX IF NOT EXISTS idx_cor_phases_updated_at ON cor_phases(updated_at);
    CREATE INDEX IF NOT EXISTS idx_cor_phases_company_status ON cor_phases(company_id, status);
  END IF;
END $$;

-- Invitations table indexes (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'invitations') THEN
    CREATE INDEX IF NOT EXISTS idx_invitations_token ON invitations(token);
    CREATE INDEX IF NOT EXISTS idx_invitations_email ON invitations(email);
    CREATE INDEX IF NOT EXISTS idx_invitations_company_id ON invitations(company_id);
    CREATE INDEX IF NOT EXISTS idx_invitations_status ON invitations(status);
    CREATE INDEX IF NOT EXISTS idx_invitations_expires_at ON invitations(expires_at);
    CREATE INDEX IF NOT EXISTS idx_invitations_created_at ON invitations(created_at);
    CREATE INDEX IF NOT EXISTS idx_invitations_company_status ON invitations(company_id, status);
    CREATE INDEX IF NOT EXISTS idx_invitations_email_company ON invitations(email, company_id);
  END IF;
END $$;

-- Rate limiting table indexes (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'rate_limits') THEN
    CREATE INDEX IF NOT EXISTS idx_rate_limits_identifier ON rate_limits(identifier);
    CREATE INDEX IF NOT EXISTS idx_rate_limits_reset_at ON rate_limits(reset_at);
    CREATE INDEX IF NOT EXISTS idx_rate_limits_identifier_reset ON rate_limits(identifier, reset_at);
  END IF;
END $$;

-- File uploads table indexes (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'file_uploads') THEN
    CREATE INDEX IF NOT EXISTS idx_file_uploads_user_id ON file_uploads(user_id);
    CREATE INDEX IF NOT EXISTS idx_file_uploads_company_id ON file_uploads(company_id);
    CREATE INDEX IF NOT EXISTS idx_file_uploads_type ON file_uploads(type);
    CREATE INDEX IF NOT EXISTS idx_file_uploads_status ON file_uploads(status);
    CREATE INDEX IF NOT EXISTS idx_file_uploads_created_at ON file_uploads(created_at);
    CREATE INDEX IF NOT EXISTS idx_file_uploads_company_type ON file_uploads(company_id, type);
    CREATE INDEX IF NOT EXISTS idx_file_uploads_user_type ON file_uploads(user_id, type);
  END IF;
END $$;

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_companies_search ON companies(name, city, province) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_company_users_lookup ON company_users(company_id, email, status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_tasks_dashboard ON tasks(company_id, status, due_date) WHERE due_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_certifications_expiring ON certifications(company_id, expiry_date, status) 
  WHERE expiry_date IS NOT NULL AND status = 'active';

-- Partial indexes for better performance on filtered queries
CREATE INDEX IF NOT EXISTS idx_companies_active ON companies(id) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_departments_active ON departments(id, company_id) WHERE company_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_active ON auth.users(id) WHERE created_at > NOW() - INTERVAL '1 year';

-- Text search indexes (if using PostgreSQL full-text search)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'companies') THEN
    -- Add text search configuration if not exists
    CREATE EXTENSION IF NOT EXISTS pg_trgm;
    
    -- GIN indexes for text search
    CREATE INDEX IF NOT EXISTS idx_companies_name_trgm ON companies USING gin(name gin_trgm_ops);
    CREATE INDEX IF NOT EXISTS idx_companies_name_gin ON companies USING gin(to_tsvector('english', name));
  END IF;
END $$;

-- Function to update index statistics
CREATE OR REPLACE FUNCTION update_table_statistics()
RETURNS void AS $$
BEGIN
  -- Update statistics for better query planning
  ANALYZE companies;
  ANALYZE departments;
  
  -- Update other tables if they exist
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'company_users') THEN
    ANALYZE company_users;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'users') THEN
    ANALYZE auth.users;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'registration_attempts') THEN
    ANALYZE registration_attempts;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'push_subscriptions') THEN
    ANALYZE push_subscriptions;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Create function to monitor index usage
CREATE OR REPLACE FUNCTION get_unused_indexes()
RETURNS TABLE(
  schemaname text,
  tablename text,
  indexname text,
  idx_scan bigint,
  idx_tup_read bigint,
  idx_tup_fetch bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
  FROM pg_stat_user_indexes
  WHERE idx_scan = 0
  ORDER BY schemaname, tablename, indexname;
END;
$$ LANGUAGE plpgsql;

-- Create function to get slow queries (requires pg_stat_statements extension)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_stat_statements') THEN
    CREATE OR REPLACE FUNCTION get_slow_queries()
    RETURNS TABLE(
      query text,
      calls bigint,
      total_time double precision,
      mean_time double precision,
      rows double precision
    ) AS $$
    BEGIN
      RETURN QUERY
      SELECT 
        query,
        calls,
        total_time,
        mean_time,
        rows
      FROM pg_stat_statements
      WHERE mean_time > 100  -- queries taking more than 100ms on average
      ORDER BY mean_time DESC
      LIMIT 20;
    END;
    $$ LANGUAGE plpgsql;
  END IF;
END $$;

-- Create maintenance function
CREATE OR REPLACE FUNCTION maintenance_indexes()
RETURNS void AS $$
BEGIN
  -- Update statistics
  PERFORM update_table_statistics();
  
  -- Reindex fragmented indexes if needed (PostgreSQL 13+)
  -- This is expensive, so run only during maintenance windows
  -- REINDEX INDEX CONCURRENTLY idx_companies_wsib_number;
  
  -- Log index usage stats
  RAISE NOTICE 'Index maintenance completed. Check get_unused_indexes() for unused indexes.';
END;
$$ LANGUAGE plpgsql;

-- Add comment to document the purpose of this script
COMMENT ON SCRIPT database-indexes.sql IS 'Creates performance indexes for all tables to improve query performance and prevent DoS attacks via slow queries';
