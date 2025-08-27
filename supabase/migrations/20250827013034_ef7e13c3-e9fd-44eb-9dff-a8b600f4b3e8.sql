-- Add normalized columns for phone and email deduplication
ALTER TABLE public.leads 
ADD COLUMN normalized_phone text GENERATED ALWAYS AS (
  CASE 
    WHEN phone IS NOT NULL AND phone != '' 
    THEN regexp_replace(phone, '\D', '', 'g') 
    ELSE NULL 
  END
) STORED,
ADD COLUMN normalized_email text GENERATED ALWAYS AS (
  CASE 
    WHEN email IS NOT NULL AND email != '' 
    THEN lower(trim(email)) 
    ELSE NULL 
  END
) STORED;

-- Remove existing duplicates by phone (keep oldest)
WITH phone_duplicates AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, normalized_phone 
      ORDER BY created_at ASC
    ) as rn
  FROM public.leads 
  WHERE normalized_phone IS NOT NULL
)
DELETE FROM public.leads 
WHERE id IN (
  SELECT id FROM phone_duplicates WHERE rn > 1
);

-- Remove existing duplicates by email (keep oldest)  
WITH email_duplicates AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, normalized_email 
      ORDER BY created_at ASC
    ) as rn
  FROM public.leads 
  WHERE normalized_email IS NOT NULL
  AND normalized_phone IS NULL -- Only for leads without phone
)
DELETE FROM public.leads 
WHERE id IN (
  SELECT id FROM email_duplicates WHERE rn > 1
);

-- Create unique partial indexes for deduplication
CREATE UNIQUE INDEX CONCURRENTLY idx_leads_user_phone_unique 
ON public.leads (user_id, normalized_phone) 
WHERE normalized_phone IS NOT NULL;

CREATE UNIQUE INDEX CONCURRENTLY idx_leads_user_email_unique 
ON public.leads (user_id, normalized_email) 
WHERE normalized_email IS NOT NULL AND normalized_phone IS NULL;