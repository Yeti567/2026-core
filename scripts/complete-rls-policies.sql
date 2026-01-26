-- Complete Row Level Security (RLS) Policies
-- Ensures proper tenant isolation and data access control

-- Enable RLS on all user-facing tables if not already enabled
DO $$
BEGIN
  -- Core tables
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'companies') THEN
    ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'departments') THEN
    ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'company_users') THEN
    ALTER TABLE company_users ENABLE ROW LEVEL SECURITY;
  END IF;
  
  -- Registration and auth tables
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'registration_tokens') THEN
    ALTER TABLE registration_tokens ENABLE ROW LEVEL SECURITY;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'registration_attempts') THEN
    ALTER TABLE registration_attempts ENABLE ROW LEVEL SECURITY;
  END IF;
  
  -- Push notifications
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'push_subscriptions') THEN
    ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notification_logs') THEN
    ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notification_preferences') THEN
    ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
  END IF;
  
  -- Forms and submissions
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'forms') THEN
    ALTER TABLE forms ENABLE ROW LEVEL SECURITY;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'form_submissions') THEN
    ALTER TABLE form_submissions ENABLE ROW LEVEL SECURITY;
  END IF;
  
  -- Tasks and projects
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tasks') THEN
    ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
  END IF;
  
  -- Hazard library
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'hazard_library') THEN
    ALTER TABLE hazard_library ENABLE ROW LEVEL SECURITY;
  END IF;
  
  -- Audit and compliance
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_questions') THEN
    ALTER TABLE audit_questions ENABLE ROW LEVEL SECURITY;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_reports') THEN
    ALTER TABLE audit_reports ENABLE ROW LEVEL SECURITY;
  END IF;
  
  -- Certifications
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'certifications') THEN
    ALTER TABLE certifications ENABLE ROW LEVEL SECURITY;
  END IF;
  
  -- Documents
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'documents') THEN
    ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
  END IF;
  
  -- COR phases
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'cor_phases') THEN
    ALTER TABLE cor_phases ENABLE ROW LEVEL SECURITY;
  END IF;
  
  -- Invitations
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'invitations') THEN
    ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
  END IF;
  
  -- File uploads
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'file_uploads') THEN
    ALTER TABLE file_uploads ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Companies table RLS policies
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'companies') THEN
    -- Drop existing policies
    DROP POLICY IF EXISTS "Companies can view own company" ON companies;
    DROP POLICY IF EXISTS "Companies can update own company" ON companies;
    DROP POLICY IF EXISTS "Service role full access companies" ON companies;
    
    -- Users can view their own company
    CREATE POLICY "Companies can view own company" ON companies
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM company_users 
          WHERE company_users.company_id = companies.id 
          AND company_users.user_id = auth.uid()
          AND company_users.status = 'active'
        )
      );
    
    -- Users can update their own company (admin/super_admin only)
    CREATE POLICY "Companies can update own company" ON companies
      FOR UPDATE
      USING (
        EXISTS (
          SELECT 1 FROM company_users 
          WHERE company_users.company_id = companies.id 
          AND company_users.user_id = auth.uid()
          AND company_users.status = 'active'
          AND company_users.role IN ('admin', 'super_admin')
        )
      );
    
    -- Service role has full access
    CREATE POLICY "Service role full access companies" ON companies
      FOR ALL
      USING (auth.jwt() ->> 'role' = 'service_role');
  END IF;
END $$;

-- Departments table RLS policies
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'departments') THEN
    -- Drop existing policies
    DROP POLICY IF EXISTS "Users can view own company departments" ON departments;
    DROP POLICY IF EXISTS "Users can manage own company departments" ON departments;
    DROP POLICY IF EXISTS "Service role full access departments" ON departments;
    
    -- Users can view departments in their company
    CREATE POLICY "Users can view own company departments" ON departments
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM company_users 
          WHERE company_users.company_id = departments.company_id 
          AND company_users.user_id = auth.uid()
          AND company_users.status = 'active'
        )
      );
    
    -- Admin users can manage departments
    CREATE POLICY "Users can manage own company departments" ON departments
      FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM company_users 
          WHERE company_users.company_id = departments.company_id 
          AND company_users.user_id = auth.uid()
          AND company_users.status = 'active'
          AND company_users.role IN ('admin', 'super_admin')
        )
      );
    
    -- Service role has full access
    CREATE POLICY "Service role full access departments" ON departments
      FOR ALL
      USING (auth.jwt() ->> 'role' = 'service_role');
  END IF;
END $$;

-- Company Users table RLS policies
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'company_users') THEN
    -- Drop existing policies
    DROP POLICY IF EXISTS "Users can view company users" ON company_users;
    DROP POLICY IF EXISTS "Users can manage company users" ON company_users;
    DROP POLICY IF EXISTS "Service role full access company_users" ON company_users;
    
    -- Users can view users in their company
    CREATE POLICY "Users can view company users" ON company_users
      FOR SELECT
      USING (
        company_users.company_id IN (
          SELECT cu.company_id FROM company_users cu 
          WHERE cu.user_id = auth.uid() AND cu.status = 'active'
        )
      );
    
    -- Admin users can manage company users
    CREATE POLICY "Users can manage company users" ON company_users
      FOR ALL
      USING (
        company_users.company_id IN (
          SELECT cu.company_id FROM company_users cu 
          WHERE cu.user_id = auth.uid() 
          AND cu.status = 'active'
          AND cu.role IN ('admin', 'super_admin')
        )
      );
    
    -- Users can update their own profile
    CREATE POLICY "Users can update own profile" ON company_users
      FOR UPDATE
      USING (company_users.user_id = auth.uid());
    
    -- Service role has full access
    CREATE POLICY "Service role full access company_users" ON company_users
      FOR ALL
      USING (auth.jwt() ->> 'role' = 'service_role');
  END IF;
END $$;

-- Push Subscriptions table RLS policies
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'push_subscriptions') THEN
    -- Drop existing policies
    DROP POLICY IF EXISTS "Users can view own subscriptions" ON push_subscriptions;
    DROP POLICY IF EXISTS "Users can manage own subscriptions" ON push_subscriptions;
    DROP POLICY IF EXISTS "Service role full access push_subscriptions" ON push_subscriptions;
    
    -- Users can view their own subscriptions
    CREATE POLICY "Users can view own subscriptions" ON push_subscriptions
      FOR SELECT
      USING (push_subscriptions.user_id = auth.uid());
    
    -- Users can manage their own subscriptions
    CREATE POLICY "Users can manage own subscriptions" ON push_subscriptions
      FOR ALL
      USING (push_subscriptions.user_id = auth.uid());
    
    -- Service role has full access
    CREATE POLICY "Service role full access push_subscriptions" ON push_subscriptions
      FOR ALL
      USING (auth.jwt() ->> 'role' = 'service_role');
  END IF;
END $$;

-- Notification Logs table RLS policies
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notification_logs') THEN
    -- Drop existing policies
    DROP POLICY IF EXISTS "Users can view own notification logs" ON notification_logs;
    DROP POLICY IF EXISTS "Service role full access notification_logs" ON notification_logs;
    
    -- Users can view their own notification logs
    CREATE POLICY "Users can view own notification logs" ON notification_logs
      FOR SELECT
      USING (notification_logs.user_id = auth.uid());
    
    -- Users can view company notification logs (admin only)
    CREATE POLICY "Admins can view company notification logs" ON notification_logs
      FOR SELECT
      USING (
        notification_logs.company_id IN (
          SELECT cu.company_id FROM company_users cu 
          WHERE cu.user_id = auth.uid() 
          AND cu.status = 'active'
          AND cu.role IN ('admin', 'super_admin')
        )
      );
    
    -- Service role has full access
    CREATE POLICY "Service role full access notification_logs" ON notification_logs
      FOR ALL
      USING (auth.jwt() ->> 'role' = 'service_role');
  END IF;
END $$;

-- Notification Preferences table RLS policies
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notification_preferences') THEN
    -- Drop existing policies
    DROP POLICY IF EXISTS "Users can manage own preferences" ON notification_preferences;
    DROP POLICY IF EXISTS "Service role full access notification_preferences" ON notification_preferences;
    
    -- Users can manage their own preferences
    CREATE POLICY "Users can manage own preferences" ON notification_preferences
      FOR ALL
      USING (notification_preferences.user_id = auth.uid());
    
    -- Service role has full access
    CREATE POLICY "Service role full access notification_preferences" ON notification_preferences
      FOR ALL
      USING (auth.jwt() ->> 'role' = 'service_role');
  END IF;
END $$;

-- Forms table RLS policies
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'forms') THEN
    -- Drop existing policies
    DROP POLICY IF EXISTS "Users can view company forms" ON forms;
    DROP POLICY IF EXISTS "Users can manage company forms" ON forms;
    DROP POLICY IF EXISTS "Service role full access forms" ON forms;
    
    -- Users can view forms in their company
    CREATE POLICY "Users can view company forms" ON forms
      FOR SELECT
      USING (
        forms.company_id IN (
          SELECT cu.company_id FROM company_users cu 
          WHERE cu.user_id = auth.uid() AND cu.status = 'active'
        )
      );
    
    -- Admin users can manage company forms
    CREATE POLICY "Users can manage company forms" ON forms
      FOR ALL
      USING (
        forms.company_id IN (
          SELECT cu.company_id FROM company_users cu 
          WHERE cu.user_id = auth.uid() 
          AND cu.status = 'active'
          AND cu.role IN ('admin', 'super_admin')
        )
      );
    
    -- Service role has full access
    CREATE POLICY "Service role full access forms" ON forms
      FOR ALL
      USING (auth.jwt() ->> 'role' = 'service_role');
  END IF;
END $$;

-- Form Submissions table RLS policies
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'form_submissions') THEN
    -- Drop existing policies
    DROP POLICY IF EXISTS "Users can view own submissions" ON form_submissions;
    DROP POLICY IF EXISTS "Users can view company submissions" ON form_submissions;
    DROP POLICY IF EXISTS "Service role full access form_submissions" ON form_submissions;
    
    -- Users can view their own submissions
    CREATE POLICY "Users can view own submissions" ON form_submissions
      FOR SELECT
      USING (form_submissions.user_id = auth.uid());
    
    -- Admin users can view all company submissions
    CREATE POLICY "Users can view company submissions" ON form_submissions
      FOR SELECT
      USING (
        form_submissions.company_id IN (
          SELECT cu.company_id FROM company_users cu 
          WHERE cu.user_id = auth.uid() 
          AND cu.status = 'active'
          AND cu.role IN ('admin', 'super_admin')
        )
      );
    
    -- Users can update their own submissions
    CREATE POLICY "Users can update own submissions" ON form_submissions
      FOR UPDATE
      USING (form_submissions.user_id = auth.uid());
    
    -- Service role has full access
    CREATE POLICY "Service role full access form_submissions" ON form_submissions
      FOR ALL
      USING (auth.jwt() ->> 'role' = 'service_role');
  END IF;
END $$;

-- Tasks table RLS policies
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tasks') THEN
    -- Drop existing policies
    DROP POLICY IF EXISTS "Users can view own tasks" ON tasks;
    DROP POLICY IF EXISTS "Users can view company tasks" ON tasks;
    DROP POLICY IF EXISTS "Users can manage own tasks" ON tasks;
    DROP POLICY IF EXISTS "Service role full access tasks" ON tasks;
    
    -- Users can view their own tasks
    CREATE POLICY "Users can view own tasks" ON tasks
      FOR SELECT
      USING (tasks.user_id = auth.uid());
    
    -- Admin users can view all company tasks
    CREATE POLICY "Users can view company tasks" ON tasks
      FOR SELECT
      USING (
        tasks.company_id IN (
          SELECT cu.company_id FROM company_users cu 
          WHERE cu.user_id = auth.uid() 
          AND cu.status = 'active'
          AND cu.role IN ('admin', 'super_admin')
        )
      );
    
    -- Users can manage their own tasks
    CREATE POLICY "Users can manage own tasks" ON tasks
      FOR ALL
      USING (tasks.user_id = auth.uid());
    
    -- Admin users can manage company tasks
    CREATE POLICY "Admins can manage company tasks" ON tasks
      FOR ALL
      USING (
        tasks.company_id IN (
          SELECT cu.company_id FROM company_users cu 
          WHERE cu.user_id = auth.uid() 
          AND cu.status = 'active'
          AND cu.role IN ('admin', 'super_admin')
        )
      );
    
    -- Service role has full access
    CREATE POLICY "Service role full access tasks" ON tasks
      FOR ALL
      USING (auth.jwt() ->> 'role' = 'service_role');
  END IF;
END $$;

-- Certifications table RLS policies
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'certifications') THEN
    -- Drop existing policies
    DROP POLICY IF EXISTS "Users can view own certifications" ON certifications;
    DROP POLICY IF EXISTS "Users can view company certifications" ON certifications;
    DROP POLICY IF EXISTS "Users can manage own certifications" ON certifications;
    DROP POLICY IF EXISTS "Service role full access certifications" ON certifications;
    
    -- Users can view their own certifications
    CREATE POLICY "Users can view own certifications" ON certifications
      FOR SELECT
      USING (certifications.user_id = auth.uid());
    
    -- Admin users can view all company certifications
    CREATE POLICY "Users can view company certifications" ON certifications
      FOR SELECT
      USING (
        certifications.company_id IN (
          SELECT cu.company_id FROM company_users cu 
          WHERE cu.user_id = auth.uid() 
          AND cu.status = 'active'
          AND cu.role IN ('admin', 'super_admin', 'internal_auditor')
        )
      );
    
    -- Users can manage their own certifications
    CREATE POLICY "Users can manage own certifications" ON certifications
      FOR ALL
      USING (certifications.user_id = auth.uid());
    
    -- Service role has full access
    CREATE POLICY "Service role full access certifications" ON certifications
      FOR ALL
      USING (auth.jwt() ->> 'role' = 'service_role');
  END IF;
END $$;

-- Documents table RLS policies
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'documents') THEN
    -- Drop existing policies
    DROP POLICY IF EXISTS "Users can view own documents" ON documents;
    DROP POLICY IF EXISTS "Users can view company documents" ON documents;
    DROP POLICY IF EXISTS "Users can manage own documents" ON documents;
    DROP POLICY IF EXISTS "Service role full access documents" ON documents;
    
    -- Users can view their own documents
    CREATE POLICY "Users can view own documents" ON documents
      FOR SELECT
      USING (documents.user_id = auth.uid());
    
    -- Admin users can view all company documents
    CREATE POLICY "Users can view company documents" ON documents
      FOR SELECT
      USING (
        documents.company_id IN (
          SELECT cu.company_id FROM company_users cu 
          WHERE cu.user_id = auth.uid() 
          AND cu.status = 'active'
          AND cu.role IN ('admin', 'super_admin')
        )
      );
    
    -- Users can manage their own documents
    CREATE POLICY "Users can manage own documents" ON documents
      FOR ALL
      USING (documents.user_id = auth.uid());
    
    -- Service role has full access
    CREATE POLICY "Service role full access documents" ON documents
      FOR ALL
      USING (auth.jwt() ->> 'role' = 'service_role');
  END IF;
END $$;

-- Invitations table RLS policies
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'invitations') THEN
    -- Drop existing policies
    DROP POLICY IF EXISTS "Users can view company invitations" ON invitations;
    DROP POLICY IF EXISTS "Users can manage company invitations" ON invitations;
    DROP POLICY IF EXISTS "Service role full access invitations" ON invitations;
    
    -- Admin users can view company invitations
    CREATE POLICY "Users can view company invitations" ON invitations
      FOR SELECT
      USING (
        invitations.company_id IN (
          SELECT cu.company_id FROM company_users cu 
          WHERE cu.user_id = auth.uid() 
          AND cu.status = 'active'
          AND cu.role IN ('admin', 'super_admin')
        )
      );
    
    -- Admin users can manage company invitations
    CREATE POLICY "Users can manage company invitations" ON invitations
      FOR ALL
      USING (
        invitations.company_id IN (
          SELECT cu.company_id FROM company_users cu 
          WHERE cu.user_id = auth.uid() 
          AND cu.status = 'active'
          AND cu.role IN ('admin', 'super_admin')
        )
      );
    
    -- Service role has full access
    CREATE POLICY "Service role full access invitations" ON invitations
      FOR ALL
      USING (auth.jwt() ->> 'role' = 'service_role');
  END IF;
END $$;

-- File Uploads table RLS policies
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'file_uploads') THEN
    -- Drop existing policies
    DROP POLICY IF EXISTS "Users can view own files" ON file_uploads;
    DROP POLICY IF EXISTS "Users can view company files" ON file_uploads;
    DROP POLICY IF EXISTS "Users can manage own files" ON file_uploads;
    DROP POLICY IF EXISTS "Service role full access file_uploads" ON file_uploads;
    
    -- Users can view their own files
    CREATE POLICY "Users can view own files" ON file_uploads
      FOR SELECT
      USING (file_uploads.user_id = auth.uid());
    
    -- Admin users can view all company files
    CREATE POLICY "Users can view company files" ON file_uploads
      FOR SELECT
      USING (
        file_uploads.company_id IN (
          SELECT cu.company_id FROM company_users cu 
          WHERE cu.user_id = auth.uid() 
          AND cu.status = 'active'
          AND cu.role IN ('admin', 'super_admin')
        )
      );
    
    -- Users can manage their own files
    CREATE POLICY "Users can manage own files" ON file_uploads
      FOR ALL
      USING (file_uploads.user_id = auth.uid());
    
    -- Service role has full access
    CREATE POLICY "Service role full access file_uploads" ON file_uploads
      FOR ALL
      USING (auth.jwt() ->> 'role' = 'service_role');
  END IF;
END $$;

-- Create function to check if user is admin of company
CREATE OR REPLACE FUNCTION is_company_admin(user_id uuid, company_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM company_users 
    WHERE company_users.user_id = user_id 
    AND company_users.company_id = company_id 
    AND company_users.status = 'active'
    AND company_users.role IN ('admin', 'super_admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to check if user belongs to company
CREATE OR REPLACE FUNCTION user_belongs_to_company(user_id uuid, company_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM company_users 
    WHERE company_users.user_id = user_id 
    AND company_users.company_id = company_id 
    AND company_users.status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get user's company ID
CREATE OR REPLACE FUNCTION get_user_company_id(user_id uuid)
RETURNS uuid AS $$
BEGIN
  RETURN (
    SELECT company_id FROM company_users 
    WHERE company_users.user_id = user_id 
    AND company_users.status = 'active'
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to check RLS policy compliance
CREATE OR REPLACE FUNCTION check_rls_compliance(table_name text, operation text)
RETURNS TABLE(
  policy_name text,
  policy_cmd text,
  policy_roles text,
  is_enabled boolean
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pg_policy.polname as policy_name,
    pg_policy.polcmd as policy_cmd,
    pg_policy.polroles as policy_roles,
    pg_class.relrowsecurity as is_enabled
  FROM pg_policy
  JOIN pg_class ON pg_class.oid = pg_policy.polrelid
  WHERE pg_class.relname = table_name
  AND (operation = 'ALL' OR pg_policy.polcmd = operation);
END;
$$ LANGUAGE plpgsql;

-- Create audit function for RLS violations
CREATE OR REPLACE FUNCTION log_rls_violation(
  table_name text,
  operation text,
  user_id uuid,
  violation_details text
)
RETURNS void AS $$
BEGIN
  -- Log RLS violations for security monitoring
  INSERT INTO rls_audit_log (table_name, operation, user_id, violation_details, created_at)
  VALUES (table_name, operation, user_id, violation_details, NOW());
  
  -- Also raise a notice for immediate visibility
  RAISE NOTICE 'RLS violation detected: % on % by user % - %', operation, table_name, user_id, violation_details;
EXCEPTION
  WHEN OTHERS THEN
    -- Don't let logging errors break the application
    RAISE WARNING 'Failed to log RLS violation: %', SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- Create RLS audit table if it doesn't exist
CREATE TABLE IF NOT EXISTS rls_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name text NOT NULL,
  operation text NOT NULL,
  user_id uuid,
  violation_details text,
  created_at timestamptz NOT NULL DEFAULT NOW()
);

-- Enable RLS on the audit table
ALTER TABLE rls_audit_log ENABLE ROW LEVEL SECURITY;

-- Only service role can view RLS audit logs
CREATE POLICY "Service role only RLS audit" ON rls_audit_log
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Create function to test RLS policies
CREATE OR REPLACE FUNCTION test_rls_policy(
  table_name text,
  test_user_id uuid,
  test_operation text DEFAULT 'SELECT'
)
RETURNS TABLE(
  accessible_rows bigint,
  total_rows bigint,
  access_ratio numeric
) AS $$
DECLARE
  accessible_count bigint;
  total_count bigint;
BEGIN
  -- Get count of rows visible to test user
  EXECUTE format('SELECT COUNT(*) FROM %I WHERE $1 = $1', table_name) 
  INTO accessible_count
  USING test_user_id;
  
  -- Get total count of rows (service role bypasses RLS)
  EXECUTE format('SELECT COUNT(*) FROM %I', table_name) 
  INTO total_count;
  
  RETURN QUERY
  SELECT 
    accessible_count,
    total_count,
    CASE 
      WHEN total_count > 0 THEN (accessible_count::numeric / total_count::numeric) * 100
      ELSE 0
    END as access_ratio;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment to document the purpose of this script
COMMENT ON SCRIPT complete-rls-policies.sql IS 'Implements comprehensive Row Level Security policies for tenant isolation and data access control';
