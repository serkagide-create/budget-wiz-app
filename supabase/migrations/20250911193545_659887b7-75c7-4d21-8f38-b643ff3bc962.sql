-- Add currency tracking columns to saving_contributions table
ALTER TABLE public.saving_contributions 
ADD COLUMN original_amount DECIMAL,
ADD COLUMN original_currency TEXT;