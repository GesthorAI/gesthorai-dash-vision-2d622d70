-- Fix security warnings from the previous migration

-- 1. Fix the function search path security issue
CREATE OR REPLACE FUNCTION log_sensitive_data_access()
RETURNS trigger AS $$
BEGIN
  -- Log any access to leads table for security monitoring
  INSERT INTO audit_logs (table_name, action, user_id, record_id, timestamp)
  VALUES (
    TG_TABLE_NAME,
    TG_OP,
    auth.uid(),
    COALESCE(NEW.id, OLD.id),
    NOW()
  );
  
  RETURN COALESCE(NEW, OLD);
EXCEPTION
  WHEN OTHERS THEN
    -- If audit logging fails, don't block the operation
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public;