-- Add message sequence fields to followup_run_items table
ALTER TABLE followup_run_items 
ADD COLUMN IF NOT EXISTS message_sequence INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS total_messages INTEGER DEFAULT 1;