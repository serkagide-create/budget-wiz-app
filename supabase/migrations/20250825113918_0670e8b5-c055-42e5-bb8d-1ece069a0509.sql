-- Add DELETE policy for transfers table so users can delete their own transfers
CREATE POLICY "Users can delete their own transfers" 
ON public.transfers 
FOR DELETE 
USING (auth.uid() = user_id);