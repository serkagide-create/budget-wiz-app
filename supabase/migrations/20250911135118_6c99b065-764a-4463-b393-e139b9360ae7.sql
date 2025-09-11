-- Create saving_contributions table for tracking payments to saving goals
CREATE TABLE public.saving_contributions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  saving_goal_id UUID NOT NULL,
  amount NUMERIC NOT NULL,
  date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  description TEXT
);

-- Enable Row Level Security
ALTER TABLE public.saving_contributions ENABLE ROW LEVEL SECURITY;

-- Create policies for user access through saving goals
CREATE POLICY "Users can create contributions for their saving goals" 
ON public.saving_contributions 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM saving_goals 
  WHERE saving_goals.id = saving_contributions.saving_goal_id 
  AND saving_goals.user_id = auth.uid()
));

CREATE POLICY "Users can view contributions for their saving goals" 
ON public.saving_contributions 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM saving_goals 
  WHERE saving_goals.id = saving_contributions.saving_goal_id 
  AND saving_goals.user_id = auth.uid()
));

CREATE POLICY "Users can update contributions for their saving goals" 
ON public.saving_contributions 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM saving_goals 
  WHERE saving_goals.id = saving_contributions.saving_goal_id 
  AND saving_goals.user_id = auth.uid()
));

CREATE POLICY "Users can delete contributions for their saving goals" 
ON public.saving_contributions 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM saving_goals 
  WHERE saving_goals.id = saving_contributions.saving_goal_id 
  AND saving_goals.user_id = auth.uid()
));