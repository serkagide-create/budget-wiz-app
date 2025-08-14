-- Add category column to debts table
ALTER TABLE public.debts 
ADD COLUMN category TEXT DEFAULT 'other' CHECK (category IN ('credit-card', 'loan', 'mortgage', 'car-loan', 'bill', 'installment', 'other'));