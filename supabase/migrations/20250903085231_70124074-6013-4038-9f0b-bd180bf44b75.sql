-- Add currency support to incomes table
ALTER TABLE public.incomes 
ADD COLUMN currency text DEFAULT 'TRY',
ADD COLUMN original_amount numeric;