-- Create tables for financial data
CREATE TABLE public.incomes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  date TIMESTAMP WITH TIME ZONE NOT NULL,
  category TEXT NOT NULL,
  monthly_repeat BOOLEAN DEFAULT false,
  next_income_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.debts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  total_amount DECIMAL(15,2) NOT NULL,
  due_date TIMESTAMP WITH TIME ZONE NOT NULL,
  installment_count INTEGER NOT NULL,
  monthly_repeat BOOLEAN DEFAULT false,
  next_payment_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  debt_id UUID NOT NULL REFERENCES public.debts(id) ON DELETE CASCADE,
  amount DECIMAL(15,2) NOT NULL,
  date TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.saving_goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  target_amount DECIMAL(15,2) NOT NULL,
  current_amount DECIMAL(15,2) DEFAULT 0,
  category TEXT NOT NULL,
  deadline TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.user_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  debt_percentage INTEGER DEFAULT 30,
  savings_percentage INTEGER DEFAULT 20,
  debt_strategy TEXT DEFAULT 'snowball',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.incomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saving_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for incomes
CREATE POLICY "Users can view their own incomes" 
ON public.incomes 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own incomes" 
ON public.incomes 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own incomes" 
ON public.incomes 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own incomes" 
ON public.incomes 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create RLS policies for debts
CREATE POLICY "Users can view their own debts" 
ON public.debts 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own debts" 
ON public.debts 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own debts" 
ON public.debts 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own debts" 
ON public.debts 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create RLS policies for payments
CREATE POLICY "Users can view payments for their debts" 
ON public.payments 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.debts 
  WHERE debts.id = payments.debt_id 
  AND debts.user_id = auth.uid()
));

CREATE POLICY "Users can create payments for their debts" 
ON public.payments 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.debts 
  WHERE debts.id = payments.debt_id 
  AND debts.user_id = auth.uid()
));

CREATE POLICY "Users can update payments for their debts" 
ON public.payments 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM public.debts 
  WHERE debts.id = payments.debt_id 
  AND debts.user_id = auth.uid()
));

CREATE POLICY "Users can delete payments for their debts" 
ON public.payments 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM public.debts 
  WHERE debts.id = payments.debt_id 
  AND debts.user_id = auth.uid()
));

-- Create RLS policies for saving_goals
CREATE POLICY "Users can view their own saving goals" 
ON public.saving_goals 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own saving goals" 
ON public.saving_goals 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own saving goals" 
ON public.saving_goals 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own saving goals" 
ON public.saving_goals 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create RLS policies for user_settings
CREATE POLICY "Users can view their own settings" 
ON public.user_settings 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own settings" 
ON public.user_settings 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings" 
ON public.user_settings 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_incomes_updated_at
BEFORE UPDATE ON public.incomes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_debts_updated_at
BEFORE UPDATE ON public.debts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_saving_goals_updated_at
BEFORE UPDATE ON public.saving_goals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_settings_updated_at
BEFORE UPDATE ON public.user_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();