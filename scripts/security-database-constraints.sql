-- Security Database Constraints Fix
-- Adds missing constraints to improve data integrity and prevent injection attacks

-- Companies table constraints
ALTER TABLE companies 
  ADD CONSTRAINT chk_companies_name_not_empty CHECK (length(trim(name)) > 0),
  ADD CONSTRAINT chk_companies_employee_count_positive CHECK (employee_count IS NULL OR employee_count > 0),
  ADD CONSTRAINT chk_companies_years_in_business_positive CHECK (years_in_business IS NULL OR years_in_business >= 0),
  ADD CONSTRAINT chk_companies_valid_province CHECK (province IN ('ON', 'QC', 'BC', 'AB', 'MB', 'SK', 'NS', 'NB', 'NL', 'PE', 'NT', 'YT', 'NU'));

-- Departments table constraints
ALTER TABLE departments 
  ADD CONSTRAINT chk_departments_name_not_empty CHECK (length(trim(name)) > 0);

-- Registration tokens table constraints
ALTER TABLE registration_tokens 
  ADD CONSTRAINT chk_registration_tokens_token_not_empty CHECK (length(trim(token)) > 0),
  ADD CONSTRAINT chk_registration_tokens_expires_future CHECK (expires_at > created_at);

-- Add unique constraints for critical fields
ALTER TABLE companies 
  ADD CONSTRAINT uniq_companies_wsib_number UNIQUE (wsib_number);

-- Company users table constraints (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'company_users') THEN
    ALTER TABLE company_users 
      ADD CONSTRAINT chk_company_users_email_not_empty CHECK (length(trim(email)) > 0),
      ADD CONSTRAINT chk_company_users_valid_role CHECK (role IN ('admin', 'member', 'internal_auditor', 'super_admin')),
      ADD CONSTRAINT chk_company_users_valid_status CHECK (status IN ('active', 'inactive', 'pending'));
  END IF;
END $$;

-- Users table constraints (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'users') THEN
    ALTER TABLE auth.users 
      ADD CONSTRAINT chk_users_email_not_empty CHECK (length(trim(email)) > 0),
      ADD CONSTRAINT chk_users_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');
  END IF;
END $$;

-- Add indexes for frequently queried fields
CREATE INDEX IF NOT EXISTS idx_companies_wsib_number ON companies(wsib_number);
CREATE INDEX IF NOT EXISTS idx_companies_email ON companies(email);
CREATE INDEX IF NOT EXISTS idx_company_users_email ON company_users(email);
CREATE INDEX IF NOT EXISTS idx_company_users_company_id ON company_users(company_id);
CREATE INDEX IF NOT EXISTS idx_registration_tokens_token ON registration_tokens(token);
CREATE INDEX IF NOT EXISTS idx_registration_tokens_expires_at ON registration_tokens(expires_at);

-- Add check constraints for common data validation patterns
DO $$
BEGIN
  -- Companies phone number format (if phone field exists)
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'phone') THEN
    ALTER TABLE companies 
      ADD CONSTRAINT chk_companies_phone_format CHECK (phone IS NULL OR phone ~* '^\d{10}$' OR phone ~* '^\(\d{3}\) \d{3}-\d{4}$');
  END IF;

  -- Companies postal code format (if postal_code field exists)
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'postal_code') THEN
    ALTER TABLE companies 
      ADD CONSTRAINT chk_companies_postal_code_format CHECK (postal_code IS NULL OR postal_code ~* '^[A-Za-z]\d[A-Za-z] ?\d[A-Za-z]\d$');
  END IF;
END $$;

-- Enable row level security on all user-facing tables if not already enabled
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'companies') THEN
    ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'departments') THEN
    ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'company_users') THEN
    ALTER TABLE company_users ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;
