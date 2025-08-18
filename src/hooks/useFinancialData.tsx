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
  debt_id?: string;
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
  category?: 'credit-card' | 'loan' | 'mortgage' | 'car-loan' | 'bill' | 'installment' | 'other';
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

  // Load data when user is authenticated
  useEffect(() => {
    if (user) {
      loadAllData();
    } else {
      // Clear data when user is not authenticated
      setIncomes([]);
      setDebts([]);
      setSavingGoals([]);
      setSettings({ debtPercentage: 30, savingsPercentage: 20, debtStrategy: 'snowball' });
    }
  }, [user]);

  const loadAllData = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      await Promise.all([
        loadIncomes(),
        loadDebts(),
        loadSavingGoals(),
        loadSettings()
      ]);
    } catch (error) {
      console.error('Error loading financial data:', error);
      toast({
        title: "Veri Yükleme Hatası",
        description: "Verileriniz yüklenirken bir hata oluştu.",
        variant: "destructive"
      });
    }
    setLoading(false);
  };

  const loadIncomes = async () => {
    if (!user) return;
    
    const { data, error } = await (supabase as any)
      .from('incomes')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error loading incomes:', error);
      return;
    }
    
    const formattedIncomes: Income[] = (data || []).map((income: any) => ({
      id: income.id,
      description: income.description,
      amount: Number(income.amount),
      date: income.date,
      category: income.category,
      monthlyRepeat: income.monthly_repeat || false,
      nextIncomeDate: income.next_income_date || undefined
    }));
    
    setIncomes(formattedIncomes);
  };

  const loadDebts = async () => {
    if (!user) return;
    
    const { data: debtsData, error: debtsError } = await (supabase as any)
      .from('debts')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    
    if (debtsError) {
      console.error('Error loading debts:', debtsError);
      return;
    }
    
    // Load payments for each debt
    const debtsWithPayments: Debt[] = [];
    for (const debt of debtsData || []) {
      const { data: paymentsData, error: paymentsError } = await (supabase as any)
        .from('payments')
        .select('*')
        .eq('debt_id', debt.id)
        .order('date', { ascending: false });
      
      if (paymentsError) {
        console.error('Error loading payments for debt:', debt.id, paymentsError);
        continue;
      }
      
      const payments: Payment[] = (paymentsData || []).map((payment: any) => ({
        id: payment.id,
        amount: Number(payment.amount),
        date: payment.date,
        debt_id: payment.debt_id
      }));
      
      debtsWithPayments.push({
        id: debt.id,
        description: debt.description,
        totalAmount: Number(debt.total_amount),
        dueDate: debt.due_date,
        installmentCount: debt.installment_count,
        payments,
        monthlyRepeat: debt.monthly_repeat || false,
        nextPaymentDate: debt.next_payment_date || undefined,
        category: debt.category as Debt['category'] || 'other'
      });
    }
    
    setDebts(debtsWithPayments);
  };

  const loadSavingGoals = async () => {
    if (!user) return;
    
    const { data, error } = await (supabase as any)
      .from('saving_goals')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error loading saving goals:', error);
      return;
    }
    
    const formattedGoals: SavingGoal[] = (data || []).map((goal: any) => ({
      id: goal.id,
      title: goal.title,
      targetAmount: Number(goal.target_amount),
      currentAmount: Number(goal.current_amount),
      category: goal.category as SavingGoal['category'],
      deadline: goal.deadline
    }));
    
    setSavingGoals(formattedGoals);
  };

  const loadSettings = async () => {
    if (!user) return;
    
    const { data, error } = await (supabase as any)
      .from('user_settings')
      .select('*')
      .eq('user_id', user.id)
      .single();
    
    if (error && error.code !== 'PGRST116') {
      console.error('Error loading settings:', error);
      return;
    }
    
    if (data) {
      setSettings({
        debtPercentage: data.debt_percentage || 30,
        savingsPercentage: data.savings_percentage || 20,
        debtStrategy: data.debt_strategy as Settings['debtStrategy'] || 'snowball'
      });
    }
  };

  // Income operations
  const addIncome = async (income: Omit<Income, 'id'>) => {
    if (!user) return;
    
    const { data, error } = await (supabase as any)
      .from('incomes')
      .insert({
        user_id: user.id,
        description: income.description,
        amount: income.amount,
        date: income.date,
        category: income.category,
        monthly_repeat: income.monthlyRepeat,
        next_income_date: income.nextIncomeDate
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error adding income:', error);
      toast({
        title: "Hata",
        description: "Gelir eklenirken bir hata oluştu.",
        variant: "destructive"
      });
      return;
    }
    
    const newIncome: Income = {
      id: data.id,
      description: data.description,
      amount: Number(data.amount),
      date: data.date,
      category: data.category,
      monthlyRepeat: data.monthly_repeat || false,
      nextIncomeDate: data.next_income_date || undefined
    };
    
    setIncomes(prev => [newIncome, ...prev]);
    toast({ title: "Başarılı", description: "Gelir eklendi" });
  };

  const deleteIncome = async (id: string) => {
    if (!user) return;
    
    const { error } = await (supabase as any)
      .from('incomes')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);
    
    if (error) {
      console.error('Error deleting income:', error);
      toast({
        title: "Hata",
        description: "Gelir silinirken bir hata oluştu.",
        variant: "destructive"
      });
      return;
    }
    
    setIncomes(prev => prev.filter(income => income.id !== id));
    toast({ title: "Başarılı", description: "Gelir silindi" });
  };

  // Debt operations
  const addDebt = async (debt: Omit<Debt, 'id' | 'payments'>) => {
    if (!user) return;
    
    const { data, error } = await (supabase as any)
      .from('debts')
      .insert({
        user_id: user.id,
        description: debt.description,
        total_amount: debt.totalAmount,
        due_date: debt.dueDate,
        installment_count: debt.installmentCount,
        monthly_repeat: debt.monthlyRepeat,
        next_payment_date: debt.nextPaymentDate,
        category: debt.category || 'other'
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error adding debt:', error);
      toast({
        title: "Hata",
        description: "Borç eklenirken bir hata oluştu.",
        variant: "destructive"
      });
      return;
    }
    
    const newDebt: Debt = {
      id: data.id,
      description: data.description,
      totalAmount: Number(data.total_amount),
      dueDate: data.due_date,
      installmentCount: data.installment_count,
      payments: [],
      monthlyRepeat: data.monthly_repeat || false,
      nextPaymentDate: data.next_payment_date || undefined,
      category: data.category as Debt['category'] || 'other'
    };
    
    setDebts(prev => [newDebt, ...prev]);
    toast({ title: "Başarılı", description: "Borç eklendi" });
  };

  const addPayment = async (debtId: string, payment: Omit<Payment, 'id' | 'debt_id'>) => {
    if (!user) return;
    
    const { data, error } = await (supabase as any)
      .from('payments')
      .insert({
        debt_id: debtId,
        amount: payment.amount,
        date: payment.date
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error adding payment:', error);
      toast({
        title: "Hata",
        description: "Ödeme eklenirken bir hata oluştu.",
        variant: "destructive"
      });
      return;
    }
    
    const newPayment: Payment = {
      id: data.id,
      amount: Number(data.amount),
      date: data.date,
      debt_id: data.debt_id
    };
    
    // Borcu bul ve sonraki ödeme tarihini hesapla
    const targetDebt = debts.find(d => d.id === debtId);
    let nextPaymentDate = undefined;
    
    if (targetDebt?.monthlyRepeat) {
      const currentDate = new Date();
      const nextMonth = new Date(currentDate);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      nextPaymentDate = nextMonth.toISOString();
      
      // Borç tablosunda da güncelle
      await (supabase as any)
        .from('debts')
        .update({ next_payment_date: nextPaymentDate })
        .eq('id', debtId);
    }
    
    setDebts(prev => prev.map(debt => 
      debt.id === debtId 
        ? { 
            ...debt, 
            payments: [newPayment, ...debt.payments],
            nextPaymentDate: nextPaymentDate || debt.nextPaymentDate
          }
        : debt
    ));
    
    toast({ title: "Başarılı", description: "Ödeme eklendi" });
  };

  const deleteDebt = async (id: string) => {
    if (!user) return;
    
    const { error } = await (supabase as any)
      .from('debts')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);
    
    if (error) {
      console.error('Error deleting debt:', error);
      toast({
        title: "Hata",
        description: "Borç silinirken bir hata oluştu.",
        variant: "destructive"
      });
      return;
    }
    
    setDebts(prev => prev.filter(debt => debt.id !== id));
    toast({ title: "Başarılı", description: "Borç silindi" });
  };

  const updateDebt = async (id: string, updates: Partial<Omit<Debt, 'id' | 'payments'>>) => {
    if (!user) return;
    
    const { data, error } = await (supabase as any)
      .from('debts')
      .update({
        description: updates.description,
        total_amount: updates.totalAmount,
        due_date: updates.dueDate,
        installment_count: updates.installmentCount,
        monthly_repeat: updates.monthlyRepeat,
        next_payment_date: updates.nextPaymentDate,
        category: updates.category
      })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating debt:', error);
      toast({
        title: "Hata",
        description: "Borç güncellenirken bir hata oluştu.",
        variant: "destructive"
      });
      return;
    }
    
    setDebts(prev => prev.map(debt => 
      debt.id === id 
        ? {
            ...debt,
            description: data.description,
            totalAmount: Number(data.total_amount),
            dueDate: data.due_date,
            installmentCount: data.installment_count,
            monthlyRepeat: data.monthly_repeat || false,
            nextPaymentDate: data.next_payment_date || undefined,
            category: data.category as Debt['category'] || 'other'
          }
        : debt
    ));
    
    toast({ title: "Başarılı", description: "Borç güncellendi" });
  };

  // Saving goals operations
  const addSavingGoal = async (goal: Omit<SavingGoal, 'id'>) => {
    if (!user) return;
    
    const { data, error } = await (supabase as any)
      .from('saving_goals')
      .insert({
        user_id: user.id,
        title: goal.title,
        target_amount: goal.targetAmount,
        current_amount: goal.currentAmount,
        category: goal.category,
        deadline: goal.deadline
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error adding saving goal:', error);
      toast({
        title: "Hata",
        description: "Birikim hedefi eklenirken bir hata oluştu.",
        variant: "destructive"
      });
      return;
    }
    
    const newGoal: SavingGoal = {
      id: data.id,
      title: data.title,
      targetAmount: Number(data.target_amount),
      currentAmount: Number(data.current_amount),
      category: data.category,
      deadline: data.deadline
    };
    
    setSavingGoals(prev => [newGoal, ...prev]);
    toast({ title: "Başarılı", description: "Birikim hedefi eklendi" });
  };

  const updateSavingGoal = async (id: string, updates: Partial<Omit<SavingGoal, 'id'>>) => {
    if (!user) return;
    
    const { data, error } = await (supabase as any)
      .from('saving_goals')
      .update({
        title: updates.title,
        target_amount: updates.targetAmount,
        current_amount: updates.currentAmount,
        category: updates.category,
        deadline: updates.deadline
      })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating saving goal:', error);
      toast({
        title: "Hata",
        description: "Birikim hedefi güncellenirken bir hata oluştu.",
        variant: "destructive"
      });
      return;
    }
    
    setSavingGoals(prev => prev.map(goal => 
      goal.id === id 
        ? {
            id: data.id,
            title: data.title,
            targetAmount: Number(data.target_amount),
            currentAmount: Number(data.current_amount),
            category: data.category,
            deadline: data.deadline
          }
        : goal
    ));
    
    toast({ title: "Başarılı", description: "Birikim hedefi güncellendi" });
  };

  const deleteSavingGoal = async (id: string) => {
    if (!user) return;
    
    const { error } = await (supabase as any)
      .from('saving_goals')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);
    
    if (error) {
      console.error('Error deleting saving goal:', error);
      toast({
        title: "Hata",
        description: "Birikim hedefi silinirken bir hata oluştu.",
        variant: "destructive"
      });
      return;
    }
    
    setSavingGoals(prev => prev.filter(goal => goal.id !== id));
    toast({ title: "Başarılı", description: "Birikim hedefi silindi" });
  };

  // Settings operations
  const updateSettings = async (newSettings: Settings) => {
    if (!user) return;
    
    // First try to update existing record
    const { data: updateData, error: updateError } = await (supabase as any)
      .from('user_settings')
      .update({
        debt_percentage: newSettings.debtPercentage,
        savings_percentage: newSettings.savingsPercentage,
        debt_strategy: newSettings.debtStrategy
      })
      .eq('user_id', user.id)
      .select()
      .single();
    
    // If no record exists, insert a new one
    if (updateError && updateError.code === 'PGRST116') {
      const { data, error } = await (supabase as any)
        .from('user_settings')
        .insert({
          user_id: user.id,
          debt_percentage: newSettings.debtPercentage,
          savings_percentage: newSettings.savingsPercentage,
          debt_strategy: newSettings.debtStrategy
        })
        .select()
        .single();
      
      if (error) {
        console.error('Error inserting settings:', error);
        toast({
          title: "Hata",
          description: "Ayarlar kaydedilirken bir hata oluştu.",
          variant: "destructive"
        });
        return;
      }
    } else if (updateError) {
      console.error('Error updating settings:', updateError);
      toast({
        title: "Hata",
        description: "Ayarlar güncellenirken bir hata oluştu.",
        variant: "destructive"
      });
      return;
    }
    
    setSettings(newSettings);
    toast({ title: "Başarılı", description: "Ayarlar güncellendi" });
  };

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
    updateDebt,
    addSavingGoal,
    updateSavingGoal,
    deleteSavingGoal,
    updateSettings,
    refreshData: loadAllData
  };
};