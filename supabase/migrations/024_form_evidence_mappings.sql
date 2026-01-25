-- =============================================================================
-- FORM EVIDENCE MAPPINGS & CONVERSION ANALYTICS
-- =============================================================================
-- Tables for linking converted forms to COR audit elements and tracking
-- conversion analytics for reporting.

-- =============================================================================
-- FORM EVIDENCE MAPPINGS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS form_evidence_mappings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  form_template_id UUID NOT NULL REFERENCES form_templates(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  cor_element INTEGER NOT NULL CHECK (cor_element >= 1 AND cor_element <= 14),
  evidence_type TEXT NOT NULL DEFAULT 'form_submission',
  auto_link BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create unique constraint to prevent duplicates
CREATE UNIQUE INDEX IF NOT EXISTS idx_form_evidence_unique 
  ON form_evidence_mappings(form_template_id, cor_element);

-- Index for querying by element
CREATE INDEX IF NOT EXISTS idx_form_evidence_element 
  ON form_evidence_mappings(company_id, cor_element);

-- Index for querying by template
CREATE INDEX IF NOT EXISTS idx_form_evidence_template 
  ON form_evidence_mappings(form_template_id);

-- =============================================================================
-- CONVERSION ANALYTICS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS conversion_analytics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversion_id UUID REFERENCES pdf_form_conversions(id) ON DELETE SET NULL,
  template_id UUID REFERENCES form_templates(id) ON DELETE SET NULL,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  fields_count INTEGER NOT NULL DEFAULT 0,
  sections_count INTEGER NOT NULL DEFAULT 0,
  cor_elements INTEGER[] DEFAULT '{}',
  source_pdf_name TEXT,
  ocr_duration_ms INTEGER,
  ai_duration_ms INTEGER,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for company analytics
CREATE INDEX IF NOT EXISTS idx_conversion_analytics_company 
  ON conversion_analytics(company_id, published_at DESC);

-- Index for time-based analytics
CREATE INDEX IF NOT EXISTS idx_conversion_analytics_time 
  ON conversion_analytics(published_at DESC);

-- =============================================================================
-- ADD SOURCE COLUMNS TO FORM_TEMPLATES
-- =============================================================================

-- Add source and source_pdf_path columns if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'form_templates' AND column_name = 'source'
  ) THEN
    ALTER TABLE form_templates ADD COLUMN source TEXT DEFAULT 'manual';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'form_templates' AND column_name = 'source_pdf_path'
  ) THEN
    ALTER TABLE form_templates ADD COLUMN source_pdf_path TEXT;
  END IF;
END $$;

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

-- Enable RLS
ALTER TABLE form_evidence_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversion_analytics ENABLE ROW LEVEL SECURITY;

-- Form Evidence Mappings Policies
CREATE POLICY "Users can view their company's evidence mappings"
  ON form_evidence_mappings FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM user_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage evidence mappings"
  ON form_evidence_mappings FOR ALL
  USING (
    company_id IN (
      SELECT company_id FROM user_profiles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'internal_auditor')
    )
  );

-- Conversion Analytics Policies
CREATE POLICY "Users can view their company's analytics"
  ON conversion_analytics FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM user_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can insert analytics"
  ON conversion_analytics FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM user_profiles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'internal_auditor')
    )
  );

-- =============================================================================
-- HELPER FUNCTIONS
-- =============================================================================

-- Function to get evidence summary for an element
CREATE OR REPLACE FUNCTION get_element_evidence_summary(
  p_company_id UUID,
  p_element INTEGER
)
RETURNS TABLE (
  total_forms BIGINT,
  converted_forms BIGINT,
  submissions_90_days BIGINT,
  evidence_status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_forms BIGINT;
  v_converted_forms BIGINT;
  v_submissions BIGINT;
  v_status TEXT;
BEGIN
  -- Count forms for this element
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE source = 'pdf_conversion')
  INTO v_total_forms, v_converted_forms
  FROM form_templates
  WHERE company_id = p_company_id
    AND cor_element = p_element
    AND is_active = true;
  
  -- Count submissions in last 90 days
  SELECT COUNT(*)
  INTO v_submissions
  FROM form_submissions fs
  JOIN form_templates ft ON fs.form_template_id = ft.id
  WHERE ft.company_id = p_company_id
    AND ft.cor_element = p_element
    AND fs.submitted_at >= NOW() - INTERVAL '90 days';
  
  -- Determine status
  IF v_total_forms >= 2 AND v_submissions >= 10 THEN
    v_status := 'sufficient';
  ELSIF v_total_forms >= 1 AND v_submissions >= 5 THEN
    v_status := 'partial';
  ELSE
    v_status := 'insufficient';
  END IF;
  
  RETURN QUERY SELECT v_total_forms, v_converted_forms, v_submissions, v_status;
END;
$$;

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON TABLE form_evidence_mappings IS 
  'Links form templates to COR audit elements for automatic evidence tracking';

COMMENT ON TABLE conversion_analytics IS 
  'Tracks PDF-to-form conversion metrics for analytics and reporting';

COMMENT ON COLUMN form_evidence_mappings.auto_link IS 
  'When true, form submissions automatically appear as audit evidence';

COMMENT ON COLUMN conversion_analytics.cor_elements IS 
  'Array of COR element numbers this conversion was linked to';
