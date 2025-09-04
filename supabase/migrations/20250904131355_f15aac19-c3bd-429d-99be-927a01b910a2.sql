-- Add missing RLS policies for complete security coverage

-- Add DELETE policy for profiles table
CREATE POLICY "Users can delete their own profile" 
ON public.profiles 
FOR DELETE 
USING (auth.uid() = user_id);

-- Add UPDATE and DELETE policies for financial_milestones_log table
CREATE POLICY "Users can update their own milestone logs" 
ON public.financial_milestones_log 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own milestone logs" 
ON public.financial_milestones_log 
FOR DELETE 
USING (auth.uid() = user_id);

-- Add UPDATE policy for transfers table
CREATE POLICY "Users can update their own transfers" 
ON public.transfers 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Update database functions with proper search_path for security
CREATE OR REPLACE FUNCTION public.transfer_funds(p_from_fund text, p_to_fund text, p_amount numeric, p_description text DEFAULT NULL::text, p_transfer_type text DEFAULT 'manual'::text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
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
$function$;

-- Update revert_transfer function with proper search_path
CREATE OR REPLACE FUNCTION public.revert_transfer(p_transfer_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
    transfer_record RECORD;
BEGIN
    -- Get the transfer details
    SELECT from_fund, to_fund, amount, user_id
    INTO transfer_record
    FROM public.transfers
    WHERE id = p_transfer_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Transfer not found';
    END IF;
    
    -- Revert the transfer by moving the amount back from toFund to fromFund
    CASE transfer_record.from_fund
        WHEN 'balance' THEN
            UPDATE public.user_settings 
            SET balance = balance + transfer_record.amount
            WHERE user_id = transfer_record.user_id;
        WHEN 'debt_fund' THEN
            UPDATE public.user_settings 
            SET debt_fund = debt_fund + transfer_record.amount
            WHERE user_id = transfer_record.user_id;
        WHEN 'savings_fund' THEN
            UPDATE public.user_settings 
            SET savings_fund = savings_fund + transfer_record.amount
            WHERE user_id = transfer_record.user_id;
    END CASE;
    
    -- Subtract from the destination fund
    CASE transfer_record.to_fund
        WHEN 'balance' THEN
            UPDATE public.user_settings 
            SET balance = balance - transfer_record.amount
            WHERE user_id = transfer_record.user_id;
        WHEN 'debt_fund' THEN
            UPDATE public.user_settings 
            SET debt_fund = debt_fund - transfer_record.amount
            WHERE user_id = transfer_record.user_id;
        WHEN 'savings_fund' THEN
            UPDATE public.user_settings 
            SET savings_fund = savings_fund - transfer_record.amount
            WHERE user_id = transfer_record.user_id;
    END CASE;
    
    -- Make sure no fund goes negative
    UPDATE public.user_settings 
    SET 
        balance = GREATEST(0, balance),
        debt_fund = GREATEST(0, debt_fund),
        savings_fund = GREATEST(0, savings_fund)
    WHERE user_id = transfer_record.user_id;
END;
$function$;