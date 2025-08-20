-- Add fund balance columns to user_settings table
ALTER TABLE public.user_settings 
ADD COLUMN balance NUMERIC DEFAULT 0,
ADD COLUMN debt_fund NUMERIC DEFAULT 0,
ADD COLUMN savings_fund NUMERIC DEFAULT 0;

-- Create transfers table for tracking fund movements
CREATE TABLE public.transfers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  from_fund TEXT NOT NULL CHECK (from_fund IN ('balance', 'debt_fund', 'savings_fund')),
  to_fund TEXT NOT NULL CHECK (to_fund IN ('balance', 'debt_fund', 'savings_fund')),
  amount NUMERIC NOT NULL CHECK (amount > 0),
  description TEXT,
  transfer_type TEXT DEFAULT 'manual' CHECK (transfer_type IN ('manual', 'automatic')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Prevent transfers to same fund
  CONSTRAINT different_funds CHECK (from_fund != to_fund)
);

-- Enable RLS on transfers table
ALTER TABLE public.transfers ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for transfers
CREATE POLICY "Users can view their own transfers" 
ON public.transfers 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own transfers" 
ON public.transfers 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create function to handle fund transfers
CREATE OR REPLACE FUNCTION public.transfer_funds(
  p_from_fund TEXT,
  p_to_fund TEXT,
  p_amount NUMERIC,
  p_description TEXT DEFAULT NULL,
  p_transfer_type TEXT DEFAULT 'manual'
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_current_balance NUMERIC;
  v_settings_id UUID;
  result JSON;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Get user settings
  SELECT id INTO v_settings_id 
  FROM public.user_settings 
  WHERE user_id = v_user_id;

  -- Create settings if not exists
  IF v_settings_id IS NULL THEN
    INSERT INTO public.user_settings (user_id) VALUES (v_user_id) RETURNING id INTO v_settings_id;
  END IF;

  -- Get current balance of source fund
  IF p_from_fund = 'balance' THEN
    SELECT COALESCE(balance, 0) INTO v_current_balance FROM public.user_settings WHERE user_id = v_user_id;
  ELSIF p_from_fund = 'debt_fund' THEN
    SELECT COALESCE(debt_fund, 0) INTO v_current_balance FROM public.user_settings WHERE user_id = v_user_id;
  ELSIF p_from_fund = 'savings_fund' THEN
    SELECT COALESCE(savings_fund, 0) INTO v_current_balance FROM public.user_settings WHERE user_id = v_user_id;
  END IF;

  -- Check if sufficient balance
  IF v_current_balance < p_amount THEN
    RETURN json_build_object('success', false, 'error', 'Insufficient funds');
  END IF;

  -- Update fund balances
  IF p_from_fund = 'balance' THEN
    UPDATE public.user_settings SET balance = COALESCE(balance, 0) - p_amount WHERE user_id = v_user_id;
  ELSIF p_from_fund = 'debt_fund' THEN
    UPDATE public.user_settings SET debt_fund = COALESCE(debt_fund, 0) - p_amount WHERE user_id = v_user_id;
  ELSIF p_from_fund = 'savings_fund' THEN
    UPDATE public.user_settings SET savings_fund = COALESCE(savings_fund, 0) - p_amount WHERE user_id = v_user_id;
  END IF;

  IF p_to_fund = 'balance' THEN
    UPDATE public.user_settings SET balance = COALESCE(balance, 0) + p_amount WHERE user_id = v_user_id;
  ELSIF p_to_fund = 'debt_fund' THEN
    UPDATE public.user_settings SET debt_fund = COALESCE(debt_fund, 0) + p_amount WHERE user_id = v_user_id;
  ELSIF p_to_fund = 'savings_fund' THEN
    UPDATE public.user_settings SET savings_fund = COALESCE(savings_fund, 0) + p_amount WHERE user_id = v_user_id;
  END IF;

  -- Record the transfer
  INSERT INTO public.transfers (user_id, from_fund, to_fund, amount, description, transfer_type)
  VALUES (v_user_id, p_from_fund, p_to_fund, p_amount, p_description, p_transfer_type);

  RETURN json_build_object('success', true, 'message', 'Transfer completed successfully');
END;
$$;