-- ============================================================================
-- COR Phase Management System Migration
-- ============================================================================
-- This migration creates a comprehensive phase management system for tracking
-- company progress through the 12-phase COR certification process.
-- ============================================================================

-- ============================================================================
-- 1. CREATE PHASES TABLE
-- ============================================================================
-- Stores the 12 main phases of the COR certification process

CREATE TABLE IF NOT EXISTS cor_phases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Phase identification
    phase_number INTEGER NOT NULL UNIQUE CHECK (phase_number >= 1 AND phase_number <= 12),
    title TEXT NOT NULL,
    description TEXT,
    
    -- Phase metadata
    estimated_duration_days INTEGER,
    required_for_certification BOOLEAN DEFAULT TRUE,
    
    -- Ordering and display
    display_order INTEGER NOT NULL UNIQUE,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 2. CREATE PROMPTS TABLE
-- ============================================================================
-- Stores individual prompts/tasks within each phase

CREATE TABLE IF NOT EXISTS cor_prompts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Phase relationship
    phase_id UUID NOT NULL REFERENCES cor_phases(id) ON DELETE CASCADE,
    
    -- Prompt identification
    prompt_number INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    instructions TEXT,
    
    -- Prompt metadata
    prompt_type TEXT DEFAULT 'task' CHECK (prompt_type IN ('task', 'form', 'upload', 'review', 'approval')),
    required BOOLEAN DEFAULT TRUE,
    estimated_time_minutes INTEGER,
    
    -- Related resources
    related_form_template_id UUID,
    related_document_type TEXT,
    related_url TEXT,
    
    -- Ordering within phase
    display_order INTEGER NOT NULL,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Ensure unique prompt numbers within each phase
    UNIQUE(phase_id, prompt_number)
);

-- ============================================================================
-- 3. CREATE COMPANY PHASE PROGRESS TABLE
-- ============================================================================
-- Tracks each company's progress through phases

CREATE TABLE IF NOT EXISTS company_phase_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Company relationship
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    -- Phase relationship
    phase_id UUID NOT NULL REFERENCES cor_phases(id) ON DELETE CASCADE,
    
    -- Progress tracking
    status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed', 'blocked')),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    
    -- Completion metadata
    completed_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
    completion_notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- One progress record per company per phase
    UNIQUE(company_id, phase_id)
);

-- ============================================================================
-- 4. CREATE COMPANY PROMPT PROGRESS TABLE
-- ============================================================================
-- Tracks completion of individual prompts within phases

CREATE TABLE IF NOT EXISTS company_prompt_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Company relationship
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    -- Prompt relationship
    prompt_id UUID NOT NULL REFERENCES cor_prompts(id) ON DELETE CASCADE,
    
    -- Progress tracking
    status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed', 'skipped')),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    
    -- Completion metadata
    completed_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
    completion_data JSONB DEFAULT '{}',
    completion_notes TEXT,
    
    -- Related resources (for linking to actual work)
    related_form_submission_id UUID,
    related_document_id UUID,
    related_certification_id UUID,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- One progress record per company per prompt
    UNIQUE(company_id, prompt_id)
);

-- ============================================================================
-- 5. CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

-- Phase indexes
CREATE INDEX idx_cor_phases_number ON cor_phases(phase_number);
CREATE INDEX idx_cor_phases_display_order ON cor_phases(display_order);

-- Prompt indexes
CREATE INDEX idx_cor_prompts_phase_id ON cor_prompts(phase_id);
CREATE INDEX idx_cor_prompts_phase_display_order ON cor_prompts(phase_id, display_order);
CREATE INDEX idx_cor_prompts_type ON cor_prompts(prompt_type);

-- Company progress indexes
CREATE INDEX idx_company_phase_progress_company ON company_phase_progress(company_id);
CREATE INDEX idx_company_phase_progress_phase ON company_phase_progress(phase_id);
CREATE INDEX idx_company_phase_progress_status ON company_phase_progress(company_id, status);
CREATE INDEX idx_company_phase_progress_company_phase ON company_phase_progress(company_id, phase_id);

-- Prompt progress indexes
CREATE INDEX idx_company_prompt_progress_company ON company_prompt_progress(company_id);
CREATE INDEX idx_company_prompt_progress_prompt ON company_prompt_progress(prompt_id);
CREATE INDEX idx_company_prompt_progress_status ON company_prompt_progress(company_id, status);
CREATE INDEX idx_company_prompt_progress_company_prompt ON company_prompt_progress(company_id, prompt_id);

-- ============================================================================
-- 6. CREATE HELPER FUNCTIONS
-- ============================================================================

-- Function to get company's overall progress percentage
CREATE OR REPLACE FUNCTION get_company_progress_percentage(p_company_id UUID)
RETURNS NUMERIC
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    total_phases INTEGER;
    completed_phases INTEGER;
    progress_percentage NUMERIC;
BEGIN
    -- Get total number of phases
    SELECT COUNT(*) INTO total_phases
    FROM cor_phases;
    
    -- Get completed phases for company
    SELECT COUNT(*) INTO completed_phases
    FROM company_phase_progress
    WHERE company_id = p_company_id
      AND status = 'completed';
    
    -- Calculate percentage
    IF total_phases = 0 THEN
        RETURN 0;
    END IF;
    
    progress_percentage := (completed_phases::NUMERIC / total_phases::NUMERIC) * 100;
    RETURN ROUND(progress_percentage, 2);
END;
$$;

-- Function to get phase completion percentage
CREATE OR REPLACE FUNCTION get_phase_completion_percentage(
    p_company_id UUID,
    p_phase_id UUID
)
RETURNS NUMERIC
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    total_prompts INTEGER;
    completed_prompts INTEGER;
    completion_percentage NUMERIC;
BEGIN
    -- Get total prompts in phase
    SELECT COUNT(*) INTO total_prompts
    FROM cor_prompts
    WHERE phase_id = p_phase_id
      AND required = TRUE;
    
    -- Get completed prompts for company
    SELECT COUNT(*) INTO completed_prompts
    FROM company_prompt_progress
    WHERE company_id = p_company_id
      AND prompt_id IN (SELECT id FROM cor_prompts WHERE phase_id = p_phase_id)
      AND status = 'completed';
    
    -- Calculate percentage
    IF total_prompts = 0 THEN
        RETURN 0;
    END IF;
    
    completion_percentage := (completed_prompts::NUMERIC / total_prompts::NUMERIC) * 100;
    RETURN ROUND(completion_percentage, 2);
END;
$$;

-- Function to mark phase as completed (checks all prompts)
CREATE OR REPLACE FUNCTION complete_phase(
    p_company_id UUID,
    p_phase_id UUID,
    p_completed_by UUID,
    p_completion_notes TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_required_prompts INTEGER;
    v_completed_prompts INTEGER;
    v_result JSON;
BEGIN
    -- Check if all required prompts are completed
    SELECT COUNT(*) INTO v_required_prompts
    FROM cor_prompts
    WHERE phase_id = p_phase_id
      AND required = TRUE;
    
    SELECT COUNT(*) INTO v_completed_prompts
    FROM company_prompt_progress
    WHERE company_id = p_company_id
      AND prompt_id IN (SELECT id FROM cor_prompts WHERE phase_id = p_phase_id)
      AND status = 'completed';
    
    IF v_completed_prompts < v_required_prompts THEN
        RETURN json_build_object(
            'success', false,
            'error', format('Cannot complete phase: %s of %s required prompts completed', 
                          v_completed_prompts, v_required_prompts)
        );
    END IF;
    
    -- Update or insert phase progress
    INSERT INTO company_phase_progress (
        company_id,
        phase_id,
        status,
        started_at,
        completed_at,
        completed_by,
        completion_notes
    )
    VALUES (
        p_company_id,
        p_phase_id,
        'completed',
        COALESCE((SELECT started_at FROM company_phase_progress WHERE company_id = p_company_id AND phase_id = p_phase_id), NOW()),
        NOW(),
        p_completed_by,
        p_completion_notes
    )
    ON CONFLICT (company_id, phase_id)
    DO UPDATE SET
        status = 'completed',
        completed_at = NOW(),
        completed_by = p_completed_by,
        completion_notes = p_completion_notes,
        updated_at = NOW();
    
    RETURN json_build_object('success', true, 'message', 'Phase completed successfully');
END;
$$;

-- Function to update prompt progress
CREATE OR REPLACE FUNCTION update_prompt_progress(
    p_company_id UUID,
    p_prompt_id UUID,
    p_status TEXT,
    p_completed_by UUID DEFAULT NULL,
    p_completion_data JSONB DEFAULT '{}',
    p_completion_notes TEXT DEFAULT NULL,
    p_related_form_submission_id UUID DEFAULT NULL,
    p_related_document_id UUID DEFAULT NULL,
    p_related_certification_id UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_prompt cor_prompts%ROWTYPE;
    v_result JSON;
BEGIN
    -- Validate status
    IF p_status NOT IN ('not_started', 'in_progress', 'completed', 'skipped') THEN
        RETURN json_build_object('success', false, 'error', 'Invalid status');
    END IF;
    
    -- Get prompt info
    SELECT * INTO v_prompt FROM cor_prompts WHERE id = p_prompt_id;
    
    IF v_prompt.id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Prompt not found');
    END IF;
    
    -- Update or insert prompt progress
    INSERT INTO company_prompt_progress (
        company_id,
        prompt_id,
        status,
        started_at,
        completed_at,
        completed_by,
        completion_data,
        completion_notes,
        related_form_submission_id,
        related_document_id,
        related_certification_id
    )
    VALUES (
        p_company_id,
        p_prompt_id,
        p_status,
        CASE WHEN p_status IN ('in_progress', 'completed') AND NOT EXISTS (
            SELECT 1 FROM company_prompt_progress WHERE company_id = p_company_id AND prompt_id = p_prompt_id
        ) THEN NOW() ELSE NULL END,
        CASE WHEN p_status = 'completed' THEN NOW() ELSE NULL END,
        p_completed_by,
        p_completion_data,
        p_completion_notes,
        p_related_form_submission_id,
        p_related_document_id,
        p_related_certification_id
    )
    ON CONFLICT (company_id, prompt_id)
    DO UPDATE SET
        status = p_status,
        started_at = CASE 
            WHEN p_status IN ('in_progress', 'completed') AND company_prompt_progress.started_at IS NULL 
            THEN NOW() 
            ELSE company_prompt_progress.started_at 
        END,
        completed_at = CASE WHEN p_status = 'completed' THEN NOW() ELSE company_prompt_progress.completed_at END,
        completed_by = COALESCE(p_completed_by, company_prompt_progress.completed_by),
        completion_data = p_completion_data,
        completion_notes = p_completion_notes,
        related_form_submission_id = COALESCE(p_related_form_submission_id, company_prompt_progress.related_form_submission_id),
        related_document_id = COALESCE(p_related_document_id, company_prompt_progress.related_document_id),
        related_certification_id = COALESCE(p_related_certification_id, company_prompt_progress.related_certification_id),
        updated_at = NOW();
    
    -- If prompt is completed, check if phase should be updated
    IF p_status = 'completed' THEN
        -- Update phase status to in_progress if not already started
        INSERT INTO company_phase_progress (company_id, phase_id, status, started_at)
        SELECT p_company_id, v_prompt.phase_id, 'in_progress', NOW()
        WHERE NOT EXISTS (
            SELECT 1 FROM company_phase_progress 
            WHERE company_id = p_company_id AND phase_id = v_prompt.phase_id
        )
        ON CONFLICT (company_id, phase_id) DO NOTHING;
    END IF;
    
    RETURN json_build_object('success', true, 'message', 'Prompt progress updated');
END;
$$;

-- ============================================================================
-- 7. ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE cor_phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE cor_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_phase_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_prompt_progress ENABLE ROW LEVEL SECURITY;

-- Phases and Prompts: Readable by all authenticated users
CREATE POLICY "Phases are viewable by authenticated users"
    ON cor_phases FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Prompts are viewable by authenticated users"
    ON cor_prompts FOR SELECT
    TO authenticated
    USING (true);

-- Company Phase Progress: Users can view their company's progress
CREATE POLICY "Users can view their company's phase progress"
    ON company_phase_progress FOR SELECT
    TO authenticated
    USING (
        company_id IN (
            SELECT company_id FROM user_profiles WHERE user_id = auth.uid()
        )
    );

-- Company Phase Progress: Admins can update their company's phase progress
CREATE POLICY "Admins can update their company's phase progress"
    ON company_phase_progress FOR UPDATE
    TO authenticated
    USING (
        company_id IN (
            SELECT company_id FROM user_profiles 
            WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin')
        )
    );

CREATE POLICY "Admins can insert their company's phase progress"
    ON company_phase_progress FOR INSERT
    TO authenticated
    WITH CHECK (
        company_id IN (
            SELECT company_id FROM user_profiles 
            WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin')
        )
    );

-- Company Prompt Progress: Users can view their company's prompt progress
CREATE POLICY "Users can view their company's prompt progress"
    ON company_prompt_progress FOR SELECT
    TO authenticated
    USING (
        company_id IN (
            SELECT company_id FROM user_profiles WHERE user_id = auth.uid()
        )
    );

-- Company Prompt Progress: Users can update their company's prompt progress
CREATE POLICY "Users can update their company's prompt progress"
    ON company_prompt_progress FOR UPDATE
    TO authenticated
    USING (
        company_id IN (
            SELECT company_id FROM user_profiles WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert their company's prompt progress"
    ON company_prompt_progress FOR INSERT
    TO authenticated
    WITH CHECK (
        company_id IN (
            SELECT company_id FROM user_profiles WHERE user_id = auth.uid()
        )
    );

-- ============================================================================
-- 8. GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT ON cor_phases TO authenticated;
GRANT SELECT ON cor_prompts TO authenticated;
GRANT SELECT, INSERT, UPDATE ON company_phase_progress TO authenticated;
GRANT SELECT, INSERT, UPDATE ON company_prompt_progress TO authenticated;

GRANT EXECUTE ON FUNCTION get_company_progress_percentage(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_phase_completion_percentage(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION complete_phase(UUID, UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION update_prompt_progress(UUID, UUID, TEXT, UUID, JSONB, TEXT, UUID, UUID, UUID) TO authenticated;

-- ============================================================================
-- 9. CREATE UPDATED_AT TRIGGERS
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_cor_phases_updated_at
    BEFORE UPDATE ON cor_phases
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cor_prompts_updated_at
    BEFORE UPDATE ON cor_prompts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_company_phase_progress_updated_at
    BEFORE UPDATE ON company_phase_progress
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_company_prompt_progress_updated_at
    BEFORE UPDATE ON company_prompt_progress
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
