-- Update user settings to match the expected values
UPDATE user_settings 
SET 
  balance = 80000,
  debt_fund = 1905, 
  savings_fund = 6915,
  updated_at = now()
WHERE balance = 131200 AND debt_fund = 32000;