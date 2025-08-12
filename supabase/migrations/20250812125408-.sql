-- Add push_token column to profiles for storing device push tokens
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS push_token text;

-- Optional index to speed up lookups by token (useful for targeted pushes)
CREATE INDEX IF NOT EXISTS idx_profiles_push_token ON public.profiles (push_token);
