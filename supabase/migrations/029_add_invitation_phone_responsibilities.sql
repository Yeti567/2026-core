-- ============================================================================
-- Add Phone and Responsibilities to Worker Invitations
-- ============================================================================
-- Adds phone number and responsibilities fields to worker_invitations table

ALTER TABLE worker_invitations
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS responsibilities TEXT;

COMMENT ON COLUMN worker_invitations.phone IS 'Phone number of the invited worker';
COMMENT ON COLUMN worker_invitations.responsibilities IS 'Key responsibilities description for the invited worker';

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
