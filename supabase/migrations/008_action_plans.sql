-- ============================================================================
-- Action Plan System Migration
-- ============================================================================
-- Tables for managing COR certification action plans and tasks
-- Converts compliance gaps into assignable, trackable tasks
-- ============================================================================

-- Action Plans Table (top-level plan)
CREATE TABLE action_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    created_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
    title TEXT NOT NULL DEFAULT 'COR Certification Action Plan',
    overall_goal TEXT NOT NULL,
    target_completion_date DATE NOT NULL,
    total_tasks INTEGER NOT NULL DEFAULT 0,
    completed_tasks INTEGER NOT NULL DEFAULT 0,
    progress_percentage INTEGER NOT NULL DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    estimated_hours NUMERIC(10,2) NOT NULL DEFAULT 0,
    actual_hours NUMERIC(10,2) NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('draft', 'in_progress', 'on_track', 'at_risk', 'behind', 'completed', 'cancelled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Action Phases Table (groups of related tasks)
CREATE TABLE action_phases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID NOT NULL REFERENCES action_plans(id) ON DELETE CASCADE,
    phase_number INTEGER NOT NULL,
    phase_name TEXT NOT NULL,
    description TEXT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'blocked')),
    total_tasks INTEGER NOT NULL DEFAULT 0,
    completed_tasks INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(plan_id, phase_number)
);

-- Action Tasks Table (individual tasks)
CREATE TABLE action_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID NOT NULL REFERENCES action_plans(id) ON DELETE CASCADE,
    phase_id UUID REFERENCES action_phases(id) ON DELETE SET NULL,
    gap_id TEXT, -- Reference to gap from compliance scoring
    element_number INTEGER NOT NULL CHECK (element_number >= 1 AND element_number <= 14),
    title TEXT NOT NULL,
    description TEXT,
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('critical', 'high', 'medium', 'low')),
    assigned_to UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
    due_date DATE NOT NULL,
    estimated_hours NUMERIC(10,2) NOT NULL DEFAULT 1,
    actual_hours NUMERIC(10,2),
    status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'blocked', 'review', 'completed', 'cancelled')),
    completion_date TIMESTAMPTZ,
    completed_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
    notes TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Task Subtasks Table
CREATE TABLE action_subtasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES action_tasks(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    completed BOOLEAN NOT NULL DEFAULT false,
    completed_at TIMESTAMPTZ,
    completed_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
    due_date DATE,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Task Comments/Notes
CREATE TABLE action_task_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES action_tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Task Dependencies (task A must complete before task B)
CREATE TABLE action_task_dependencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES action_tasks(id) ON DELETE CASCADE,
    depends_on_task_id UUID NOT NULL REFERENCES action_tasks(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(task_id, depends_on_task_id),
    CHECK (task_id != depends_on_task_id)
);

-- Create indexes for performance
CREATE INDEX idx_action_plans_company_id ON action_plans(company_id);
CREATE INDEX idx_action_plans_status ON action_plans(status);
CREATE INDEX idx_action_phases_plan_id ON action_phases(plan_id);
CREATE INDEX idx_action_tasks_plan_id ON action_tasks(plan_id);
CREATE INDEX idx_action_tasks_phase_id ON action_tasks(phase_id);
CREATE INDEX idx_action_tasks_assigned_to ON action_tasks(assigned_to);
CREATE INDEX idx_action_tasks_status ON action_tasks(status);
CREATE INDEX idx_action_tasks_due_date ON action_tasks(due_date);
CREATE INDEX idx_action_tasks_element ON action_tasks(element_number);
CREATE INDEX idx_action_subtasks_task_id ON action_subtasks(task_id);
CREATE INDEX idx_action_task_notes_task_id ON action_task_notes(task_id);

-- Enable Row Level Security
ALTER TABLE action_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE action_phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE action_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE action_subtasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE action_task_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE action_task_dependencies ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- RLS POLICIES
-- ----------------------------------------------------------------------------

-- ACTION_PLANS policies
CREATE POLICY "action_plans_select_policy" ON action_plans
    FOR SELECT USING (company_id = get_user_company_id() OR is_super_admin());

CREATE POLICY "action_plans_insert_policy" ON action_plans
    FOR INSERT WITH CHECK (company_id = get_user_company_id() OR is_super_admin());

CREATE POLICY "action_plans_update_policy" ON action_plans
    FOR UPDATE USING (company_id = get_user_company_id() OR is_super_admin())
    WITH CHECK (company_id = get_user_company_id() OR is_super_admin());

CREATE POLICY "action_plans_delete_policy" ON action_plans
    FOR DELETE USING (company_id = get_user_company_id() OR is_super_admin());

-- ACTION_PHASES policies
CREATE POLICY "action_phases_select_policy" ON action_phases
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM action_plans WHERE id = action_phases.plan_id AND (company_id = get_user_company_id() OR is_super_admin()))
    );

CREATE POLICY "action_phases_insert_policy" ON action_phases
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM action_plans WHERE id = action_phases.plan_id AND (company_id = get_user_company_id() OR is_super_admin()))
    );

CREATE POLICY "action_phases_update_policy" ON action_phases
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM action_plans WHERE id = action_phases.plan_id AND (company_id = get_user_company_id() OR is_super_admin()))
    );

CREATE POLICY "action_phases_delete_policy" ON action_phases
    FOR DELETE USING (
        EXISTS (SELECT 1 FROM action_plans WHERE id = action_phases.plan_id AND (company_id = get_user_company_id() OR is_super_admin()))
    );

-- ACTION_TASKS policies
CREATE POLICY "action_tasks_select_policy" ON action_tasks
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM action_plans WHERE id = action_tasks.plan_id AND (company_id = get_user_company_id() OR is_super_admin()))
    );

CREATE POLICY "action_tasks_insert_policy" ON action_tasks
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM action_plans WHERE id = action_tasks.plan_id AND (company_id = get_user_company_id() OR is_super_admin()))
    );

CREATE POLICY "action_tasks_update_policy" ON action_tasks
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM action_plans WHERE id = action_tasks.plan_id AND (company_id = get_user_company_id() OR is_super_admin()))
    );

CREATE POLICY "action_tasks_delete_policy" ON action_tasks
    FOR DELETE USING (
        EXISTS (SELECT 1 FROM action_plans WHERE id = action_tasks.plan_id AND (company_id = get_user_company_id() OR is_super_admin()))
    );

-- ACTION_SUBTASKS policies
CREATE POLICY "action_subtasks_select_policy" ON action_subtasks
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM action_tasks t
            JOIN action_plans p ON t.plan_id = p.id
            WHERE t.id = action_subtasks.task_id AND (p.company_id = get_user_company_id() OR is_super_admin())
        )
    );

CREATE POLICY "action_subtasks_insert_policy" ON action_subtasks
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM action_tasks t
            JOIN action_plans p ON t.plan_id = p.id
            WHERE t.id = action_subtasks.task_id AND (p.company_id = get_user_company_id() OR is_super_admin())
        )
    );

CREATE POLICY "action_subtasks_update_policy" ON action_subtasks
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM action_tasks t
            JOIN action_plans p ON t.plan_id = p.id
            WHERE t.id = action_subtasks.task_id AND (p.company_id = get_user_company_id() OR is_super_admin())
        )
    );

CREATE POLICY "action_subtasks_delete_policy" ON action_subtasks
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM action_tasks t
            JOIN action_plans p ON t.plan_id = p.id
            WHERE t.id = action_subtasks.task_id AND (p.company_id = get_user_company_id() OR is_super_admin())
        )
    );

-- ACTION_TASK_NOTES policies
CREATE POLICY "action_task_notes_select_policy" ON action_task_notes
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM action_tasks t
            JOIN action_plans p ON t.plan_id = p.id
            WHERE t.id = action_task_notes.task_id AND (p.company_id = get_user_company_id() OR is_super_admin())
        )
    );

CREATE POLICY "action_task_notes_insert_policy" ON action_task_notes
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM action_tasks t
            JOIN action_plans p ON t.plan_id = p.id
            WHERE t.id = action_task_notes.task_id AND (p.company_id = get_user_company_id() OR is_super_admin())
        )
    );

CREATE POLICY "action_task_notes_delete_policy" ON action_task_notes
    FOR DELETE USING (user_id = (SELECT id FROM user_profiles WHERE user_id = auth.uid()));

-- ACTION_TASK_DEPENDENCIES policies
CREATE POLICY "action_task_dependencies_select_policy" ON action_task_dependencies
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM action_tasks t
            JOIN action_plans p ON t.plan_id = p.id
            WHERE t.id = action_task_dependencies.task_id AND (p.company_id = get_user_company_id() OR is_super_admin())
        )
    );

CREATE POLICY "action_task_dependencies_insert_policy" ON action_task_dependencies
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM action_tasks t
            JOIN action_plans p ON t.plan_id = p.id
            WHERE t.id = action_task_dependencies.task_id AND (p.company_id = get_user_company_id() OR is_super_admin())
        )
    );

CREATE POLICY "action_task_dependencies_delete_policy" ON action_task_dependencies
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM action_tasks t
            JOIN action_plans p ON t.plan_id = p.id
            WHERE t.id = action_task_dependencies.task_id AND (p.company_id = get_user_company_id() OR is_super_admin())
        )
    );

-- Function to update plan progress when tasks change
CREATE OR REPLACE FUNCTION update_action_plan_progress()
RETURNS TRIGGER AS $$
BEGIN
    -- Update phase statistics
    IF NEW.phase_id IS NOT NULL THEN
        UPDATE action_phases
        SET 
            total_tasks = (SELECT COUNT(*) FROM action_tasks WHERE phase_id = NEW.phase_id),
            completed_tasks = (SELECT COUNT(*) FROM action_tasks WHERE phase_id = NEW.phase_id AND status = 'completed'),
            status = CASE
                WHEN (SELECT COUNT(*) FROM action_tasks WHERE phase_id = NEW.phase_id AND status = 'completed') = 
                     (SELECT COUNT(*) FROM action_tasks WHERE phase_id = NEW.phase_id) 
                     AND (SELECT COUNT(*) FROM action_tasks WHERE phase_id = NEW.phase_id) > 0
                THEN 'completed'
                WHEN (SELECT COUNT(*) FROM action_tasks WHERE phase_id = NEW.phase_id AND status IN ('in_progress', 'completed')) > 0
                THEN 'in_progress'
                ELSE 'pending'
            END
        WHERE id = NEW.phase_id;
    END IF;
    
    -- Update plan statistics
    UPDATE action_plans
    SET 
        total_tasks = (SELECT COUNT(*) FROM action_tasks WHERE plan_id = NEW.plan_id),
        completed_tasks = (SELECT COUNT(*) FROM action_tasks WHERE plan_id = NEW.plan_id AND status = 'completed'),
        progress_percentage = CASE 
            WHEN (SELECT COUNT(*) FROM action_tasks WHERE plan_id = NEW.plan_id) = 0 THEN 0
            ELSE ROUND(
                (SELECT COUNT(*) FROM action_tasks WHERE plan_id = NEW.plan_id AND status = 'completed')::NUMERIC / 
                (SELECT COUNT(*) FROM action_tasks WHERE plan_id = NEW.plan_id) * 100
            )
        END,
        actual_hours = COALESCE((SELECT SUM(actual_hours) FROM action_tasks WHERE plan_id = NEW.plan_id), 0),
        status = CASE
            WHEN (SELECT COUNT(*) FROM action_tasks WHERE plan_id = NEW.plan_id AND status = 'completed') = 
                 (SELECT COUNT(*) FROM action_tasks WHERE plan_id = NEW.plan_id) 
                 AND (SELECT COUNT(*) FROM action_tasks WHERE plan_id = NEW.plan_id) > 0
            THEN 'completed'
            WHEN (SELECT COUNT(*) FROM action_tasks WHERE plan_id = NEW.plan_id AND status != 'completed' AND due_date < CURRENT_DATE) > 0
            THEN 'behind'
            WHEN (SELECT COUNT(*) FROM action_tasks WHERE plan_id = NEW.plan_id AND status != 'completed' AND due_date < CURRENT_DATE + INTERVAL '7 days') > 2
            THEN 'at_risk'
            ELSE 'on_track'
        END,
        updated_at = NOW()
    WHERE id = NEW.plan_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER action_tasks_progress_trigger
AFTER INSERT OR UPDATE ON action_tasks
FOR EACH ROW
EXECUTE FUNCTION update_action_plan_progress();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON action_plans TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON action_phases TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON action_tasks TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON action_subtasks TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON action_task_notes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON action_task_dependencies TO authenticated;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
