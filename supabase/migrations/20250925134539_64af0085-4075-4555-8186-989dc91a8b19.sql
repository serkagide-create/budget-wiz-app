-- Add missing DELETE policy for user_settings table
CREATE POLICY "Users can delete their own settings" 
ON public.user_settings 
FOR DELETE 
USING (auth.uid() = user_id);

-- Fix database function security issues by updating search_path
CREATE OR REPLACE FUNCTION public.update_budget_spent_amount()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
  IF NEW.budget_id IS NOT NULL THEN
    UPDATE public.budgets 
    SET spent_amount = COALESCE(spent_amount, 0) + NEW.amount
    WHERE id = NEW.budget_id;
  END IF;
  
  -- Update budget based on category match if no direct budget_id
  IF NEW.budget_id IS NULL THEN
    UPDATE public.budgets 
    SET spent_amount = COALESCE(spent_amount, 0) + NEW.amount
    WHERE user_id = NEW.user_id 
    AND category = NEW.category
    AND DATE_TRUNC('month', period_start) = DATE_TRUNC('month', NEW.date);
  END IF;
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.recalculate_budget_spent_amounts()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
  UPDATE public.budgets 
  SET spent_amount = COALESCE(expense_totals.total_spent, 0)
  FROM (
    SELECT 
      b.id as budget_id,
      COALESCE(SUM(e.amount), 0) as total_spent
    FROM public.budgets b
    LEFT JOIN public.expenses e ON (
      e.user_id = b.user_id 
      AND e.category = b.category 
      AND DATE_TRUNC('month', e.date) = DATE_TRUNC('month', b.period_start)
    )
    GROUP BY b.id
  ) expense_totals
  WHERE id = expense_totals.budget_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (new.id, new.raw_user_meta_data ->> 'display_name');
  RETURN new;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
  new.updated_at = now();
  return new;
END;
$function$;