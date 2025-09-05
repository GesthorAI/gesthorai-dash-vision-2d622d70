-- Configure auth settings for better security
UPDATE auth.config SET 
  otp_exp = 300,  -- 5 minutes instead of default 1 hour
  password_min_length = 8,
  password_require_upper = true,
  password_require_lower = true,
  password_require_numbers = true,
  password_require_symbols = false,
  password_ban_weak_passwords = true;

-- Note: Leaked password protection needs to be enabled via Supabase dashboard Auth settings