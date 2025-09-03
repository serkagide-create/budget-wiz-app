-- Add currency support to saving_goals table
ALTER TABLE public.saving_goals 
ADD COLUMN currency text DEFAULT 'TRY',
ADD COLUMN original_amount numeric;