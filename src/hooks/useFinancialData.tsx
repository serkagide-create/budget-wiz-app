import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export interface Income {
  id: string;
  description: string;
  amount: number;
  date: string;
  category: string;
  monthlyRepeat?: boolean;
  nextIncomeDate?: string;
}

export interface Payment {
  id: string;
  amount: number;
  date: string;
}

export interface Debt {
  id: string;
  description: string;
  totalAmount: number;
  dueDate: string;
  installmentCount: number;
  payments: Payment[];
  monthlyRepeat?: boolean;
  nextPaymentDate?: string;
}

export interface SavingGoal {
  id: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  category: 'house' | 'car' | 'vacation' | 'education' | 'other';
  deadline: string;
}

export interface Settings {
  debtPercentage: number;
  savingsPercentage: number;
  debtStrategy: 'snowball' | 'avalanche';
}

export const useFinancialData = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [savingGoals, setSavingGoals] = useState<SavingGoal[]>([]);
  const [settings, setSettings] = useState<Settings>({ 
    debtPercentage: 30, 
    savingsPercentage: 20, 
    debtStrategy: 'snowball' 
  });
  const [loading, setLoading] = useState(true);

  // Load all user data
  const loadData = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Load incomes
      const { data: incomesData, error: incomesError } = await supabase
        .from('incomes')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (incomesError) throw incomesError;

      // Load debts with payments
      const { data: debtsData, error: debtsError } = await supabase
        .from('debts')
        .select(`
          *,
          payments (*)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (debtsError) throw debtsError;

      // Load saving goals
      const { data: savingGoalsData, error: savingGoalsError } = await supabase
        .from('saving_goals')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (savingGoalsError) throw savingGoalsError;

      // Load settings
      const { data: settingsData, error: settingsError } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (settingsError && settingsError.code !== 'PGRST116') throw settingsError;

      // Transform and set data
      setIncomes(incomesData?.map(income => ({
        id: income.id,
        description: income.description,
        amount: parseFloat(income.amount.toString()),
        date: income.date,
        category: income.category,
        monthlyRepeat: income.monthly_repeat,
        nextIncomeDate: income.next_income_date
      })) || []);

      setDebts(debtsData?.map(debt => ({
        id: debt.id,
        description: debt.description,
        totalAmount: parseFloat(debt.total_amount.toString()),
        dueDate: debt.due_date,
        installmentCount: debt.installment_count,
        monthlyRepeat: debt.monthly_repeat,
        nextPaymentDate: debt.next_payment_date,
        payments: debt.payments?.map((payment: any) => ({
          id: payment.id,
          amount: parseFloat(payment.amount.toString()),
          date: payment.date
        })) || []
      })) || []);

      setSavingGoals(savingGoalsData?.map(goal => ({
        id: goal.id,
        title: goal.title,
        targetAmount: parseFloat(goal.target_amount.toString()),
        currentAmount: parseFloat(goal.current_amount.toString()),
        category: goal.category as SavingGoal['category'],
        deadline: goal.deadline
      })) || []);

      if (settingsData) {
        setSettings({
          debtPercentage: settingsData.debt_percentage,
          savingsPercentage: settingsData.savings_percentage,
          debtStrategy: settingsData.debt_strategy as 'snowball' | 'avalanche'
        });
      }

    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: "Veri Yükleme Hatası",
        description: "Verileriniz yüklenirken bir hata oluştu.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Save income
  const addIncome = async (incomeData: Omit<Income, 'id'>) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('incomes')
        .insert({
          user_id: user.id,
          description: incomeData.description,
          amount: incomeData.amount,
          date: incomeData.date,
          category: incomeData.category,
          monthly_repeat: incomeData.monthlyRepeat,
          next_income_date: incomeData.nextIncomeDate
        })
        .select()
        .single();

      if (error) throw error;

      const newIncome: Income = {
        id: data.id,
        description: data.description,
        amount: parseFloat(data.amount.toString()),
        date: data.date,
        category: data.category,
        monthlyRepeat: data.monthly_repeat,
        nextIncomeDate: data.next_income_date
      };

      setIncomes(prev => [newIncome, ...prev]);
      toast({ title: "Başarılı", description: "Gelir eklendi" });
    } catch (error) {
      console.error('Error adding income:', error);
      toast({
        title: "Hata",
        description: "Gelir eklenirken bir hata oluştu.",
        variant: "destructive"
      });
    }
  };

  // Delete income
  const deleteIncome = async (id: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('incomes')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      setIncomes(prev => prev.filter(income => income.id !== id));
      toast({ title: "Başarılı", description: "Gelir silindi" });
    } catch (error) {
      console.error('Error deleting income:', error);
      toast({
        title: "Hata", 
        description: "Gelir silinirken bir hata oluştu.",
        variant: "destructive"
      });
    }
  };

  // Add debt
  const addDebt = async (debtData: Omit<Debt, 'id' | 'payments'>) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('debts')
        .insert({
          user_id: user.id,
          description: debtData.description,
          total_amount: debtData.totalAmount,
          due_date: debtData.dueDate,
          installment_count: debtData.installmentCount,
          monthly_repeat: debtData.monthlyRepeat,
          next_payment_date: debtData.nextPaymentDate
        })
        .select()
        .single();

      if (error) throw error;

      const newDebt: Debt = {
        id: data.id,
        description: data.description,
        totalAmount: parseFloat(data.total_amount.toString()),
        dueDate: data.due_date,
        installmentCount: data.installment_count,
        monthlyRepeat: data.monthly_repeat,
        nextPaymentDate: data.next_payment_date,
        payments: []
      };

      setDebts(prev => [newDebt, ...prev]);
      toast({ title: "Başarılı", description: "Borç eklendi" });
    } catch (error) {
      console.error('Error adding debt:', error);
      toast({
        title: "Hata",
        description: "Borç eklenirken bir hata oluştu.",
        variant: "destructive"
      });
    }
  };

  // Add payment to debt
  const addPayment = async (debtId: string, amount: number) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('payments')
        .insert({
          debt_id: debtId,
          amount: amount,
          date: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      const newPayment: Payment = {
        id: data.id,
        amount: parseFloat(data.amount.toString()),
        date: data.date
      };

      setDebts(prev => prev.map(debt => 
        debt.id === debtId 
          ? { ...debt, payments: [newPayment, ...debt.payments] }
          : debt
      ));

      toast({ title: "Başarılı", description: "Ödeme yapıldı" });
    } catch (error) {
      console.error('Error adding payment:', error);
      toast({
        title: "Hata",
        description: "Ödeme yapılırken bir hata oluştu.",
        variant: "destructive"
      });
    }
  };

  // Delete debt
  const deleteDebt = async (id: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('debts')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      setDebts(prev => prev.filter(debt => debt.id !== id));
      toast({ title: "Başarılı", description: "Borç silindi" });
    } catch (error) {
      console.error('Error deleting debt:', error);
      toast({
        title: "Hata",
        description: "Borç silinirken bir hata oluştu.",
        variant: "destructive"
      });
    }
  };

  // Add saving goal
  const addSavingGoal = async (goalData: Omit<SavingGoal, 'id'>) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('saving_goals')
        .insert({
          user_id: user.id,
          title: goalData.title,
          target_amount: goalData.targetAmount,
          current_amount: goalData.currentAmount,
          category: goalData.category,
          deadline: goalData.deadline
        })
        .select()
        .single();

      if (error) throw error;

      const newGoal: SavingGoal = {
        id: data.id,
        title: data.title,
        targetAmount: parseFloat(data.target_amount.toString()),
        currentAmount: parseFloat(data.current_amount.toString()),
        category: data.category as SavingGoal['category'],
        deadline: data.deadline
      };

      setSavingGoals(prev => [newGoal, ...prev]);
      toast({ title: "Başarılı", description: "Hedef eklendi" });
    } catch (error) {
      console.error('Error adding saving goal:', error);
      toast({
        title: "Hata",
        description: "Hedef eklenirken bir hata oluştu.",
        variant: "destructive"
      });
    }
  };

  // Update saving goal amount
  const updateSavingGoalAmount = async (id: string, amount: number) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('saving_goals')
        .update({ current_amount: amount })
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      setSavingGoals(prev => prev.map(goal => 
        goal.id === id ? { ...goal, currentAmount: amount } : goal
      ));

      toast({ title: "Başarılı", description: "Hedef güncellendi" });
    } catch (error) {
      console.error('Error updating saving goal:', error);
      toast({
        title: "Hata",
        description: "Hedef güncellenirken bir hata oluştu.",
        variant: "destructive"
      });
    }
  };

  // Delete saving goal
  const deleteSavingGoal = async (id: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('saving_goals')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      setSavingGoals(prev => prev.filter(goal => goal.id !== id));
      toast({ title: "Başarılı", description: "Hedef silindi" });
    } catch (error) {
      console.error('Error deleting saving goal:', error);
      toast({
        title: "Hata",
        description: "Hedef silinirken bir hata oluştu.",
        variant: "destructive"
      });
    }
  };

  // Update settings
  const updateSettings = async (newSettings: Settings) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('user_settings')
        .upsert({
          user_id: user.id,
          debt_percentage: newSettings.debtPercentage,
          savings_percentage: newSettings.savingsPercentage,
          debt_strategy: newSettings.debtStrategy
        });

      if (error) throw error;

      setSettings(newSettings);
      toast({ title: "Başarılı", description: "Ayarlar kaydedildi" });
    } catch (error) {
      console.error('Error updating settings:', error);
      toast({
        title: "Hata",
        description: "Ayarlar kaydedilirken bir hata oluştu.",
        variant: "destructive"
      });
    }
  };

  // Load data when user changes
  useEffect(() => {
    if (user) {
      loadData();
    } else {
      setIncomes([]);
      setDebts([]);
      setSavingGoals([]);
      setSettings({ debtPercentage: 30, savingsPercentage: 20, debtStrategy: 'snowball' });
      setLoading(false);
    }
  }, [user]);

  return {
    incomes,
    debts,
    savingGoals,
    settings,
    loading,
    addIncome,
    deleteIncome,
    addDebt,
    addPayment,
    deleteDebt,
    addSavingGoal,
    updateSavingGoalAmount,
    deleteSavingGoal,
    updateSettings,
    reloadData: loadData
  };
};