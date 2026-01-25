-- ============================================================================
-- HAZARD LIBRARY VIEWS AND HELPER FUNCTIONS
-- ============================================================================
-- Views and functions to support hazard selection in forms and workflows
-- ============================================================================

-- ============================================================================
-- VIEW: hazard_selector
-- Quick hazard selection for forms with display name
-- ============================================================================

CREATE OR REPLACE VIEW hazard_selector AS
SELECT 
  id,
  hazard_code,
  name AS hazard_name,
  category AS hazard_category,
  subcategory,
  applicable_trades AS trade_specific,
  required_ppe AS ppe_required,
  default_risk_level AS risk_level_default,
  default_severity,
  default_likelihood,
  CONCAT(name, ' (', INITCAP(category::TEXT), ')') AS display_name,
  CONCAT(name, ' - ', subcategory, ' (', INITCAP(category::TEXT), ')') AS display_name_full
FROM hazard_library
WHERE is_active = true
ORDER BY category, name;

-- Grant access to authenticated users
GRANT SELECT ON hazard_selector TO authenticated;

-- ============================================================================
-- VIEW: hazard_by_category
-- Hazards organized by category for easy browsing
-- ============================================================================

CREATE OR REPLACE VIEW hazard_by_category AS
SELECT 
  id,
  hazard_code,
  name,
  category,
  subcategory,
  description,
  default_severity,
  default_likelihood,
  default_risk_level,
  applicable_trades,
  required_ppe,
  CASE 
    WHEN default_risk_level = 'critical' THEN 1
    WHEN default_risk_level = 'high' THEN 2
    WHEN default_risk_level = 'medium' THEN 3
    WHEN default_risk_level = 'low' THEN 4
    ELSE 5
  END AS risk_order
FROM hazard_library
WHERE is_active = true
ORDER BY risk_order, category, name;

GRANT SELECT ON hazard_by_category TO authenticated;

-- ============================================================================
-- VIEW: concrete_hazards
-- NCCI-specific concrete hazards view
-- ============================================================================

CREATE OR REPLACE VIEW concrete_hazards AS
SELECT 
  id,
  hazard_code,
  name,
  category,
  subcategory,
  description,
  default_severity,
  default_likelihood,
  default_risk_level,
  recommended_controls,
  required_ppe,
  regulatory_references
FROM hazard_library
WHERE is_active = true
  AND (
    'Concrete' = ANY(applicable_trades)
    OR 'Formwork' = ANY(applicable_trades)
    OR 'Rebar' = ANY(applicable_trades)
    OR hazard_code LIKE 'CONC-%'
  )
ORDER BY 
  CASE 
    WHEN default_risk_level = 'critical' THEN 1
    WHEN default_risk_level = 'high' THEN 2
    WHEN default_risk_level = 'medium' THEN 3
    WHEN default_risk_level = 'low' THEN 4
    ELSE 5
  END,
  name;

GRANT SELECT ON concrete_hazards TO authenticated;

-- ============================================================================
-- VIEW: critical_hazards
-- All critical and high risk hazards for priority focus
-- ============================================================================

CREATE OR REPLACE VIEW critical_hazards AS
SELECT 
  id,
  hazard_code,
  name,
  category,
  subcategory,
  description,
  default_risk_level,
  required_ppe,
  regulatory_references
FROM hazard_library
WHERE is_active = true
  AND default_risk_level IN ('critical', 'high')
ORDER BY 
  CASE 
    WHEN default_risk_level = 'critical' THEN 1
    ELSE 2
  END,
  category, name;

GRANT SELECT ON critical_hazards TO authenticated;

-- ============================================================================
-- FUNCTION: get_recommended_hazards_for_task
-- Returns recommended hazards based on task/trade type
-- ============================================================================

CREATE OR REPLACE FUNCTION get_recommended_hazards_for_task(task_type TEXT)
RETURNS TABLE (
  hazard_id UUID, 
  hazard_code TEXT,
  hazard_name TEXT, 
  hazard_category hazard_category,
  likelihood INTEGER,
  severity INTEGER,
  risk_level TEXT,
  ppe_required TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    h.id,
    h.hazard_code,
    h.name,
    h.category,
    h.default_likelihood,
    h.default_severity,
    h.default_risk_level::TEXT,
    h.required_ppe
  FROM hazard_library h
  WHERE (task_type = ANY(h.applicable_trades)
     OR task_type = ANY(h.applicable_activities)
     OR 'General Construction' = ANY(h.applicable_trades)
     OR 'All Trades' = ANY(h.applicable_trades))
    AND h.is_active = true
  ORDER BY 
    CASE 
      WHEN h.default_risk_level = 'critical' THEN 1
      WHEN h.default_risk_level = 'high' THEN 2
      WHEN h.default_risk_level = 'medium' THEN 3
      WHEN h.default_risk_level = 'low' THEN 4
      ELSE 5
    END,
    h.name;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- FUNCTION: get_hazards_by_trade
-- Returns all hazards applicable to a specific trade
-- ============================================================================

CREATE OR REPLACE FUNCTION get_hazards_by_trade(trade_name TEXT)
RETURNS TABLE (
  hazard_id UUID,
  hazard_code TEXT,
  hazard_name TEXT,
  hazard_category hazard_category,
  subcategory TEXT,
  risk_level TEXT,
  description TEXT,
  ppe_required TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    h.id,
    h.hazard_code,
    h.name,
    h.category,
    h.subcategory,
    h.default_risk_level::TEXT,
    h.description,
    h.required_ppe
  FROM hazard_library h
  WHERE trade_name = ANY(h.applicable_trades)
     OR 'General Construction' = ANY(h.applicable_trades)
     OR 'All Trades' = ANY(h.applicable_trades)
  ORDER BY 
    CASE 
      WHEN h.default_risk_level = 'critical' THEN 1
      WHEN h.default_risk_level = 'high' THEN 2
      WHEN h.default_risk_level = 'medium' THEN 3
      WHEN h.default_risk_level = 'low' THEN 4
      ELSE 5
    END,
    h.category, h.name;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- FUNCTION: get_hazards_by_category
-- Returns all hazards in a specific category
-- ============================================================================

CREATE OR REPLACE FUNCTION get_hazards_by_category(cat hazard_category)
RETURNS TABLE (
  hazard_id UUID,
  hazard_code TEXT,
  hazard_name TEXT,
  subcategory TEXT,
  risk_level TEXT,
  likelihood INTEGER,
  severity INTEGER,
  description TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    h.id,
    h.hazard_code,
    h.name,
    h.subcategory,
    h.default_risk_level::TEXT,
    h.default_likelihood,
    h.default_severity,
    h.description
  FROM hazard_library h
  WHERE h.category = cat
    AND h.is_active = true
  ORDER BY 
    CASE 
      WHEN h.default_risk_level = 'critical' THEN 1
      WHEN h.default_risk_level = 'high' THEN 2
      WHEN h.default_risk_level = 'medium' THEN 3
      WHEN h.default_risk_level = 'low' THEN 4
      ELSE 5
    END,
    h.name;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- FUNCTION: search_hazards
-- Full-text search for hazards
-- ============================================================================

CREATE OR REPLACE FUNCTION search_hazards(search_term TEXT)
RETURNS TABLE (
  hazard_id UUID,
  hazard_code TEXT,
  hazard_name TEXT,
  hazard_category hazard_category,
  subcategory TEXT,
  risk_level TEXT,
  description TEXT,
  match_rank REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    h.id,
    h.hazard_code,
    h.name,
    h.category,
    h.subcategory,
    h.default_risk_level::TEXT,
    h.description,
    ts_rank(
      to_tsvector('english', COALESCE(h.name, '') || ' ' || COALESCE(h.description, '') || ' ' || COALESCE(h.subcategory, '')),
      plainto_tsquery('english', search_term)
    ) AS match_rank
  FROM hazard_library h
  WHERE h.is_active = true
    AND (
      to_tsvector('english', COALESCE(h.name, '') || ' ' || COALESCE(h.description, '') || ' ' || COALESCE(h.subcategory, ''))
      @@ plainto_tsquery('english', search_term)
      OR h.name ILIKE '%' || search_term || '%'
      OR h.hazard_code ILIKE '%' || search_term || '%'
    )
  ORDER BY match_rank DESC, h.name;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- FUNCTION: get_hazard_controls
-- Returns detailed control information for a specific hazard
-- ============================================================================

CREATE OR REPLACE FUNCTION get_hazard_controls(hazard_uuid UUID)
RETURNS TABLE (
  control_type TEXT,
  control_description TEXT,
  is_required BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c->>'type' AS control_type,
    c->>'control' AS control_description,
    (c->>'required')::BOOLEAN AS is_required
  FROM hazard_library h,
       LATERAL jsonb_array_elements(h.recommended_controls) AS c
  WHERE h.id = hazard_uuid;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- FUNCTION: get_ppe_for_hazards
-- Returns required PPE for a list of hazard IDs
-- ============================================================================

CREATE OR REPLACE FUNCTION get_ppe_for_hazards(hazard_ids UUID[])
RETURNS TABLE (
  ppe_item TEXT,
  hazard_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    UNNEST(h.required_ppe) AS ppe_item,
    COUNT(*) AS hazard_count
  FROM hazard_library h
  WHERE h.id = ANY(hazard_ids)
    AND h.required_ppe IS NOT NULL
  GROUP BY UNNEST(h.required_ppe)
  ORDER BY hazard_count DESC, ppe_item;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- FUNCTION: get_hazard_summary_stats
-- Returns summary statistics of hazard library
-- ============================================================================

CREATE OR REPLACE FUNCTION get_hazard_summary_stats()
RETURNS TABLE (
  total_hazards BIGINT,
  critical_hazards BIGINT,
  high_hazards BIGINT,
  medium_hazards BIGINT,
  low_hazards BIGINT,
  categories_count BIGINT,
  concrete_hazards BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) AS total_hazards,
    COUNT(*) FILTER (WHERE default_risk_level = 'critical') AS critical_hazards,
    COUNT(*) FILTER (WHERE default_risk_level = 'high') AS high_hazards,
    COUNT(*) FILTER (WHERE default_risk_level = 'medium') AS medium_hazards,
    COUNT(*) FILTER (WHERE default_risk_level = 'low') AS low_hazards,
    COUNT(DISTINCT category) AS categories_count,
    COUNT(*) FILTER (WHERE 'Concrete' = ANY(applicable_trades) OR hazard_code LIKE 'CONC-%') AS concrete_hazards
  FROM hazard_library
  WHERE is_active = true;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- INDEX: Add search index for hazard text search
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_hazard_library_search 
ON hazard_library 
USING GIN (to_tsvector('english', COALESCE(name, '') || ' ' || COALESCE(description, '') || ' ' || COALESCE(subcategory, '')));

-- Index for trade lookups
CREATE INDEX IF NOT EXISTS idx_hazard_library_trades 
ON hazard_library 
USING GIN (applicable_trades);

-- Index for activity lookups
CREATE INDEX IF NOT EXISTS idx_hazard_library_activities 
ON hazard_library 
USING GIN (applicable_activities);

-- Index for risk level filtering
CREATE INDEX IF NOT EXISTS idx_hazard_library_risk_level 
ON hazard_library (default_risk_level);

-- ============================================================================
-- GRANT EXECUTE on functions to authenticated users
-- ============================================================================

GRANT EXECUTE ON FUNCTION get_recommended_hazards_for_task(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_hazards_by_trade(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_hazards_by_category(hazard_category) TO authenticated;
GRANT EXECUTE ON FUNCTION search_hazards(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_hazard_controls(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_ppe_for_hazards(UUID[]) TO authenticated;
GRANT EXECUTE ON FUNCTION get_hazard_summary_stats() TO authenticated;
