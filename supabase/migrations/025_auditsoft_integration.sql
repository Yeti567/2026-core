-- =============================================================================
-- AUDITSOFT API INTEGRATION SYSTEM
-- =============================================================================
-- Complete integration with AuditSoft for one-click COR audit evidence export.
-- Includes secure API key storage, sync tracking, and item mappings.
-- =============================================================================

-- =============================================================================
-- 1. TABLE: auditsoft_connections (Store API credentials & connection info)
-- =============================================================================

CREATE TABLE IF NOT EXISTS auditsoft_connections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- API Credentials (encrypted)
  api_key TEXT NOT NULL, -- Encrypted API key from AuditSoft
  api_endpoint TEXT DEFAULT 'https://api.auditsoft.co', -- Base API URL
  organization_id TEXT, -- Company's org ID in AuditSoft
  audit_id TEXT, -- Current audit ID
  
  -- Connection Status
  connection_status TEXT DEFAULT 'disconnected' 
    CHECK (connection_status IN ('active', 'invalid_key', 'expired', 'disconnected')),
  last_validated_at TIMESTAMPTZ,
  last_sync_at TIMESTAMPTZ,
  last_sync_status TEXT CHECK (last_sync_status IN ('success', 'failed', 'partial')),
  last_sync_error TEXT,
  
  -- Sync Configuration
  sync_enabled BOOLEAN DEFAULT false, -- Auto-sync on/off
  sync_frequency TEXT DEFAULT 'manual' 
    CHECK (sync_frequency IN ('realtime', 'daily', 'manual')),
  
  -- Audit Information
  audit_scheduled_date DATE, -- When audit is scheduled
  audit_status TEXT DEFAULT 'pending' 
    CHECK (audit_status IN ('pending', 'in_progress', 'completed')),
  auditor_name TEXT,
  auditor_email TEXT,
  
  -- Statistics
  total_items_synced INTEGER DEFAULT 0,
  last_export_summary JSONB DEFAULT '{}',
  /*
  Example last_export_summary:
  {
    "exported_at": "2025-01-18T10:30:00Z",
    "items_exported": {
      "form_submissions": 156,
      "documents": 47,
      "certifications": 23,
      "maintenance_records": 89,
      "training_records": 45
    },
    "elements_exported": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14],
    "date_range": "2024-01-01 to 2025-01-18"
  }
  */
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES user_profiles(id),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- One connection per company
  UNIQUE(company_id)
);

-- =============================================================================
-- 2. TABLE: auditsoft_sync_log (Track all sync operations)
-- =============================================================================

CREATE TABLE IF NOT EXISTS auditsoft_sync_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  connection_id UUID REFERENCES auditsoft_connections(id) ON DELETE SET NULL,
  
  -- Sync Type & Trigger
  sync_type TEXT NOT NULL 
    CHECK (sync_type IN ('full_export', 'incremental', 'single_item', 'manual')),
  sync_trigger TEXT NOT NULL 
    CHECK (sync_trigger IN ('user_initiated', 'auto_sync', 'scheduled', 'api_webhook')),
  
  -- Timing
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  duration_seconds INTEGER GENERATED ALWAYS AS (
    CASE 
      WHEN completed_at IS NOT NULL 
      THEN EXTRACT(EPOCH FROM (completed_at - started_at))::INTEGER 
      ELSE NULL 
    END
  ) STORED,
  
  -- Status & Results
  status TEXT DEFAULT 'in_progress' 
    CHECK (status IN ('in_progress', 'completed', 'failed', 'partial')),
  items_attempted INTEGER DEFAULT 0,
  items_succeeded INTEGER DEFAULT 0,
  items_failed INTEGER DEFAULT 0,
  
  -- Details
  error_details JSONB DEFAULT '[]', -- Array of errors
  sync_details JSONB DEFAULT '{}', -- What was synced (breakdown by type)
  /*
  Example sync_details:
  {
    "date_range": { "start": "2024-01-01", "end": "2025-01-18" },
    "elements": [1, 2, 3, 4, 5],
    "by_type": {
      "form_submissions": { "attempted": 100, "succeeded": 98, "failed": 2 },
      "documents": { "attempted": 50, "succeeded": 50, "failed": 0 }
    }
  }
  */
  
  -- Who initiated
  initiated_by UUID REFERENCES user_profiles(id)
);

-- =============================================================================
-- 3. TABLE: auditsoft_item_mappings (Map internal items to AuditSoft IDs)
-- =============================================================================

CREATE TABLE IF NOT EXISTS auditsoft_item_mappings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Internal Reference
  internal_item_type TEXT NOT NULL 
    CHECK (internal_item_type IN (
      'form_submission', 
      'document', 
      'certification', 
      'training_record',
      'maintenance_record',
      'incident_report',
      'meeting_minutes',
      'inspection',
      'hazard_assessment',
      'corrective_action'
    )),
  internal_item_id UUID NOT NULL,
  
  -- AuditSoft Reference
  auditsoft_item_id TEXT NOT NULL, -- ID in AuditSoft system
  auditsoft_item_type TEXT, -- 'evidence', 'document', 'training_record', etc.
  
  -- COR Mapping
  cor_element INTEGER CHECK (cor_element >= 1 AND cor_element <= 14),
  audit_question_id TEXT, -- Specific audit question this answers
  
  -- Sync Status
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  last_updated_at TIMESTAMPTZ,
  sync_status TEXT DEFAULT 'synced' 
    CHECK (sync_status IN ('synced', 'needs_update', 'deleted', 'failed')),
  sync_error TEXT,
  
  -- Prevent duplicate mappings
  UNIQUE(company_id, internal_item_type, internal_item_id)
);

-- =============================================================================
-- 4. INDEXES
-- =============================================================================

-- Connections
CREATE INDEX IF NOT EXISTS idx_auditsoft_connections_company 
  ON auditsoft_connections(company_id);

CREATE INDEX IF NOT EXISTS idx_auditsoft_connections_status 
  ON auditsoft_connections(connection_status);

-- Sync Log
CREATE INDEX IF NOT EXISTS idx_auditsoft_sync_log_company 
  ON auditsoft_sync_log(company_id, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_auditsoft_sync_log_connection 
  ON auditsoft_sync_log(connection_id);

CREATE INDEX IF NOT EXISTS idx_auditsoft_sync_log_status 
  ON auditsoft_sync_log(status, started_at DESC);

-- Item Mappings
CREATE INDEX IF NOT EXISTS idx_auditsoft_mappings_internal 
  ON auditsoft_item_mappings(internal_item_type, internal_item_id);

CREATE INDEX IF NOT EXISTS idx_auditsoft_mappings_auditsoft 
  ON auditsoft_item_mappings(auditsoft_item_id);

CREATE INDEX IF NOT EXISTS idx_auditsoft_mappings_company_element 
  ON auditsoft_item_mappings(company_id, cor_element);

CREATE INDEX IF NOT EXISTS idx_auditsoft_mappings_sync_status 
  ON auditsoft_item_mappings(company_id, sync_status) 
  WHERE sync_status = 'needs_update';

-- =============================================================================
-- 5. ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE auditsoft_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE auditsoft_sync_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE auditsoft_item_mappings ENABLE ROW LEVEL SECURITY;

-- Connections: Only admins can view/manage
CREATE POLICY "Admins can view their company connections"
  ON auditsoft_connections FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM user_profiles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Admins can manage connections"
  ON auditsoft_connections FOR ALL
  USING (
    company_id IN (
      SELECT company_id FROM user_profiles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

-- Sync Log: Admins and auditors can view
CREATE POLICY "Users can view their company sync logs"
  ON auditsoft_sync_log FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM user_profiles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'internal_auditor', 'super_admin')
    )
  );

CREATE POLICY "Admins can manage sync logs"
  ON auditsoft_sync_log FOR ALL
  USING (
    company_id IN (
      SELECT company_id FROM user_profiles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

-- Item Mappings: Admins and auditors can view
CREATE POLICY "Users can view their company item mappings"
  ON auditsoft_item_mappings FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM user_profiles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'internal_auditor', 'super_admin')
    )
  );

CREATE POLICY "System can manage item mappings"
  ON auditsoft_item_mappings FOR ALL
  USING (
    company_id IN (
      SELECT company_id FROM user_profiles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

-- =============================================================================
-- 6. HELPER FUNCTIONS
-- =============================================================================

-- Update connection's last sync info
CREATE OR REPLACE FUNCTION update_connection_sync_stats(
  p_company_id UUID,
  p_status TEXT,
  p_error TEXT DEFAULT NULL,
  p_items_synced INTEGER DEFAULT 0,
  p_summary JSONB DEFAULT '{}'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE auditsoft_connections
  SET 
    last_sync_at = NOW(),
    last_sync_status = p_status,
    last_sync_error = p_error,
    total_items_synced = total_items_synced + p_items_synced,
    last_export_summary = CASE 
      WHEN p_summary != '{}' THEN p_summary 
      ELSE last_export_summary 
    END,
    updated_at = NOW()
  WHERE company_id = p_company_id;
END;
$$;

-- Get items needing sync
CREATE OR REPLACE FUNCTION get_items_needing_sync(p_company_id UUID)
RETURNS TABLE (
  internal_item_type TEXT,
  internal_item_id UUID,
  auditsoft_item_id TEXT,
  cor_element INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.internal_item_type,
    m.internal_item_id,
    m.auditsoft_item_id,
    m.cor_element
  FROM auditsoft_item_mappings m
  WHERE m.company_id = p_company_id
    AND m.sync_status = 'needs_update';
END;
$$;

-- Get sync statistics
CREATE OR REPLACE FUNCTION get_auditsoft_stats(p_company_id UUID)
RETURNS TABLE (
  is_connected BOOLEAN,
  connection_status TEXT,
  total_items_synced BIGINT,
  last_sync_at TIMESTAMPTZ,
  last_sync_status TEXT,
  pending_sync_items BIGINT,
  total_sync_operations BIGINT,
  successful_syncs BIGINT,
  failed_syncs BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (c.connection_status = 'active') as is_connected,
    c.connection_status,
    COALESCE(c.total_items_synced, 0)::BIGINT as total_items_synced,
    c.last_sync_at,
    c.last_sync_status,
    COALESCE((
      SELECT COUNT(*) FROM auditsoft_item_mappings m 
      WHERE m.company_id = p_company_id AND m.sync_status = 'needs_update'
    ), 0)::BIGINT as pending_sync_items,
    COALESCE((
      SELECT COUNT(*) FROM auditsoft_sync_log l 
      WHERE l.company_id = p_company_id
    ), 0)::BIGINT as total_sync_operations,
    COALESCE((
      SELECT COUNT(*) FROM auditsoft_sync_log l 
      WHERE l.company_id = p_company_id AND l.status = 'completed'
    ), 0)::BIGINT as successful_syncs,
    COALESCE((
      SELECT COUNT(*) FROM auditsoft_sync_log l 
      WHERE l.company_id = p_company_id AND l.status = 'failed'
    ), 0)::BIGINT as failed_syncs
  FROM auditsoft_connections c
  WHERE c.company_id = p_company_id;
END;
$$;

-- =============================================================================
-- 7. GRANTS
-- =============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON auditsoft_connections TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON auditsoft_sync_log TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON auditsoft_item_mappings TO authenticated;
GRANT EXECUTE ON FUNCTION update_connection_sync_stats(UUID, TEXT, TEXT, INTEGER, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION get_items_needing_sync(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_auditsoft_stats(UUID) TO authenticated;

-- =============================================================================
-- 8. TRIGGER: Auto-update updated_at
-- =============================================================================

CREATE OR REPLACE FUNCTION update_auditsoft_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auditsoft_connections_updated_at
  BEFORE UPDATE ON auditsoft_connections
  FOR EACH ROW
  EXECUTE FUNCTION update_auditsoft_updated_at();

-- =============================================================================
-- 9. COMMENTS
-- =============================================================================

COMMENT ON TABLE auditsoft_connections IS 
  'Stores encrypted API credentials and connection info for AuditSoft integration';

COMMENT ON TABLE auditsoft_sync_log IS 
  'Tracks all synchronization operations with AuditSoft';

COMMENT ON TABLE auditsoft_item_mappings IS 
  'Maps internal system items (forms, docs, etc.) to their AuditSoft counterparts';

COMMENT ON COLUMN auditsoft_connections.api_key IS 
  'AES-256-GCM encrypted API key. Format: iv:authTag:encrypted';

COMMENT ON COLUMN auditsoft_connections.last_export_summary IS 
  'JSON summary of the last export: items by type, elements, date range';
