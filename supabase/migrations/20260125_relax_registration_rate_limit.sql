-- Relax rate limit to 10 per hour
CREATE OR REPLACE FUNCTION check_registration_rate_limit(p_ip_address TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    attempt_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO attempt_count
    FROM registration_attempts
    WHERE ip_address = p_ip_address
      AND created_at > NOW() - INTERVAL '1 hour';
    
    RETURN attempt_count < 10;
END;
$$;

-- Clear previous attempts to unblock the current session
DELETE FROM registration_attempts;
DELETE FROM registration_tokens;
