-- ============================================================================
-- Departments and Organization Structure System
-- ============================================================================
-- Creates a flexible department/division system for organizing workers and equipment
-- Supports hierarchy, assignments, and org chart visualization

-- ============================================================================
-- 1. CREATE DEPARTMENTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    -- Department identification
    name TEXT NOT NULL,
    code TEXT, -- Short code like "FND", "FLT", "STR"
    description TEXT,
    
    -- Hierarchy support
    parent_department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    
    -- Leadership
    superintendent_id UUID REFERENCES workers(id) ON DELETE SET NULL,
    manager_id UUID REFERENCES workers(id) ON DELETE SET NULL,
    
    -- Department metadata
    department_type TEXT DEFAULT 'division' CHECK (department_type IN ('division', 'department', 'crew', 'team', 'section')),
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Display and ordering
    display_order INTEGER DEFAULT 0,
    color_code TEXT, -- For org chart visualization
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Ensure unique department names per company
    UNIQUE(company_id, name)
);

-- ============================================================================
-- 2. ADD DEPARTMENT REFERENCES TO WORKERS
-- ============================================================================

-- Add department_id to workers if it doesn't exist
ALTER TABLE workers
ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES departments(id) ON DELETE SET NULL;

-- Add index for department lookups
CREATE INDEX IF NOT EXISTS idx_workers_department ON workers(department_id) WHERE department_id IS NOT NULL;

-- ============================================================================
-- 3. ADD DEPARTMENT REFERENCES TO EQUIPMENT
-- ============================================================================

-- Add department_id to equipment_inventory if it doesn't exist
ALTER TABLE equipment_inventory
ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES departments(id) ON DELETE SET NULL;

-- Add index for department lookups
CREATE INDEX IF NOT EXISTS idx_equipment_department ON equipment_inventory(department_id) WHERE department_id IS NOT NULL;

-- ============================================================================
-- 4. CREATE INDEXES
-- ============================================================================

CREATE INDEX idx_departments_company ON departments(company_id);
CREATE INDEX idx_departments_parent ON departments(parent_department_id) WHERE parent_department_id IS NOT NULL;
CREATE INDEX idx_departments_active ON departments(company_id, is_active) WHERE is_active = TRUE;
CREATE INDEX idx_departments_superintendent ON departments(superintendent_id) WHERE superintendent_id IS NOT NULL;
CREATE INDEX idx_departments_manager ON departments(manager_id) WHERE manager_id IS NOT NULL;

-- ============================================================================
-- 5. CREATE HELPER FUNCTIONS
-- ============================================================================

-- Function to get department hierarchy (all children)
CREATE OR REPLACE FUNCTION get_department_children(p_department_id UUID)
RETURNS TABLE(id UUID, name TEXT, level INTEGER)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    WITH RECURSIVE department_tree AS (
        -- Base case: the department itself
        SELECT d.id, d.name, 0 AS level
        FROM departments d
        WHERE d.id = p_department_id
        
        UNION ALL
        
        -- Recursive case: children
        SELECT d.id, d.name, dt.level + 1
        FROM departments d
        INNER JOIN department_tree dt ON d.parent_department_id = dt.id
    )
    SELECT dt.id, dt.name, dt.level
    FROM department_tree dt
    ORDER BY dt.level, dt.name;
END;
$$;

-- Function to get department stats (worker count, equipment count)
CREATE OR REPLACE FUNCTION get_department_stats(p_department_id UUID)
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_worker_count INTEGER;
    v_equipment_count INTEGER;
    v_result JSON;
BEGIN
    -- Count workers in department (including sub-departments)
    WITH RECURSIVE dept_tree AS (
        SELECT id FROM departments WHERE id = p_department_id
        UNION ALL
        SELECT d.id FROM departments d
        INNER JOIN dept_tree dt ON d.parent_department_id = dt.id
    )
    SELECT COUNT(*) INTO v_worker_count
    FROM workers w
    WHERE w.department_id IN (SELECT id FROM dept_tree)
      AND w.is_active = TRUE;
    
    -- Count equipment in department (including sub-departments)
    WITH RECURSIVE dept_tree AS (
        SELECT id FROM departments WHERE id = p_department_id
        UNION ALL
        SELECT d.id FROM departments d
        INNER JOIN dept_tree dt ON d.parent_department_id = dt.id
    )
    SELECT COUNT(*) INTO v_equipment_count
    FROM equipment_inventory e
    WHERE e.department_id IN (SELECT id FROM dept_tree)
      AND e.status != 'retired';
    
    RETURN json_build_object(
        'worker_count', v_worker_count,
        'equipment_count', v_equipment_count
    );
END;
$$;

-- ============================================================================
-- 6. ROW LEVEL SECURITY POLICIES
-- ============================================================================

ALTER TABLE departments ENABLE ROW LEVEL SECURITY;

-- Users can view their company's departments
CREATE POLICY "Users can view their company's departments"
    ON departments FOR SELECT
    TO authenticated
    USING (
        company_id IN (
            SELECT company_id FROM user_profiles WHERE user_id = auth.uid()
        )
    );

-- Admins can manage their company's departments
CREATE POLICY "Admins can manage their company's departments"
    ON departments FOR ALL
    TO authenticated
    USING (
        company_id IN (
            SELECT company_id FROM user_profiles 
            WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin')
        )
    );

-- ============================================================================
-- 7. GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON departments TO authenticated;
GRANT EXECUTE ON FUNCTION get_department_children(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_department_stats(UUID) TO authenticated;

-- ============================================================================
-- 8. CREATE UPDATED_AT TRIGGER
-- ============================================================================

CREATE TRIGGER update_departments_updated_at
    BEFORE UPDATE ON departments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
