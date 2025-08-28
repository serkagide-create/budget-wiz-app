-- Add currency fields to debts table
ALTER TABLE public.debts 
ADD COLUMN original_amount numeric,
ADD COLUMN currency text DEFAULT 'TRY';