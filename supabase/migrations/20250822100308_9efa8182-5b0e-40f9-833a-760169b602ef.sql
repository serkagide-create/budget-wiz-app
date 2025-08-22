-- Create a function to revert a transfer by restoring the original fund balances
CREATE OR REPLACE FUNCTION public.revert_transfer(p_transfer_id UUID)
RETURNS VOID AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;