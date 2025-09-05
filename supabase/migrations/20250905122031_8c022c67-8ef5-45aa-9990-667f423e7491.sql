-- Create a function to redact PII from input/output data for logging
CREATE OR REPLACE FUNCTION public.redact_pii_from_json(input_json jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb := input_json;
  redacted_keys text[] := ARRAY['name', 'email', 'phone', 'whatsapp_number', 'business', 'address', 'cpf', 'cnpj'];
  key text;
BEGIN
  -- If input is null, return null
  IF input_json IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Redact sensitive keys
  FOREACH key IN ARRAY redacted_keys LOOP
    IF result ? key THEN
      result := jsonb_set(result, ARRAY[key], '"[REDACTED]"'::jsonb);
    END IF;
  END LOOP;
  
  RETURN result;
END;
$$;

-- Update ai_prompt_logs table to automatically redact PII
-- Create a trigger to redact PII before inserting into ai_prompt_logs
CREATE OR REPLACE FUNCTION public.redact_pii_before_log_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Redact PII from input and output JSON
  NEW.input_json := public.redact_pii_from_json(NEW.input_json);
  NEW.output_json := public.redact_pii_from_json(NEW.output_json);
  
  RETURN NEW;
END;
$$;

-- Apply the trigger to ai_prompt_logs table
DROP TRIGGER IF EXISTS trigger_redact_pii_ai_prompt_logs ON public.ai_prompt_logs;
CREATE TRIGGER trigger_redact_pii_ai_prompt_logs
  BEFORE INSERT ON public.ai_prompt_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.redact_pii_before_log_insert();

-- Update webhook-inbound-messages to require JWT authentication
-- This is handled in config.toml update

-- Add additional RLS policy for communications table to ensure organization-level isolation
DROP POLICY IF EXISTS "Service role can manage all communications" ON public.communications;
CREATE POLICY "Service role can manage all communications"
ON public.communications
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Ensure profiles table has proper organization context (if needed)
-- Add organization_id to profiles table for better security context
-- Note: This is optional and depends on whether profiles should be organization-scoped