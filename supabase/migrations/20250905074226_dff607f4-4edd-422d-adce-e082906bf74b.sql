-- Add living expenses percentage to user settings
ALTER TABLE public.user_settings 
ADD COLUMN living_expenses_percentage INTEGER DEFAULT 50;

-- Add budget tracking and alerts
ALTER TABLE public.budgets 
ADD COLUMN spent_amount NUMERIC DEFAULT 0,
ADD COLUMN alert_threshold NUMERIC DEFAULT 0.8; -- Alert when 80% of budget is spent

-- Add budget categories if they don't exist
INSERT INTO public.budgets (user_id, category, amount, spent_amount, alert_threshold)
SELECT 
  us.user_id,
  'yemek' as category,
  5000 as amount,
  0 as spent_amount,
  0.8 as alert_threshold
FROM public.user_settings us
WHERE NOT EXISTS (
  SELECT 1 FROM public.budgets b 
  WHERE b.user_id = us.user_id AND b.category = 'yemek'
)
ON CONFLICT DO NOTHING;

-- Add expense tracking improvements
ALTER TABLE public.expenses 
ADD COLUMN budget_id UUID REFERENCES public.budgets(id);

-- Create function to update budget spent amount when expense is added
CREATE OR REPLACE FUNCTION public.update_budget_spent_amount()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for budget updates
CREATE TRIGGER update_budget_on_expense_insert
  AFTER INSERT ON public.expenses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_budget_spent_amount();

-- Create function to recalculate budget spent amounts
CREATE OR REPLACE FUNCTION public.recalculate_budget_spent_amounts()
RETURNS void AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Run the recalculation
SELECT public.recalculate_budget_spent_amounts();