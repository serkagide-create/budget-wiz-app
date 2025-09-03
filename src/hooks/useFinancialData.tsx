import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export interface Income {
  id: string;
  description: string;
  amount: number;
  originalAmount?: number;
  currency?: string;
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
  currency?: string;
  originalAmount?: number; // Amount in original currency
}

export interface SavingGoal {
  id: string;
  title: string;
  targetAmount: number;
  originalAmount?: number;
  currency?: string;
  currentAmount: number;
  category: 'house' | 'car' | 'vacation' | 'education' | 'other';
  deadline: string;
}

export interface Settings {
  debtPercentage: number;
  savingsPercentage: number;
  debtStrategy: 'snowball' | 'avalanche';
  balance?: number;
  debtFund?: number;
  savingsFund?: number;
}

export interface Transfer {
  id: string;
  fromFund: 'balance' | 'debt_fund' | 'savings_fund';
  toFund: 'balance' | 'debt_fund' | 'savings_fund';
  amount: number;
  description?: string;
  transferType: 'manual' | 'automatic';
  createdAt: string;
}

export const useFinancialData = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [savingGoals, setSavingGoals] = useState<SavingGoal[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [settings, setSettings] = useState<Settings>({ 
    debtPercentage: 30, 
    savingsPercentage: 20, 
    debtStrategy: 'snowball',
    balance: 0,
    debtFund: 0,
    savingsFund: 0
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
      setTransfers([]);
      setSettings({ 
        debtPercentage: 30, 
        savingsPercentage: 20, 
        debtStrategy: 'snowball',
        balance: 0,
        debtFund: 0,
        savingsFund: 0
      });
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
        loadSettings(),
        loadTransfers()
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

  const retryOperation = async <T,>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000
  ): Promise<T> => {
    let lastError: any;
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await operation();
      } catch (error: any) {
        lastError = error;
        console.log(`Operation failed (attempt ${i + 1}/${maxRetries}):`, error);
        
        // If JWT expired, try to refresh the session
        if (error?.code === 'PGRST301' || error?.code === 'PGRST303' || error?.message?.includes('JWT')) {
          console.log('JWT issue detected, refreshing session...');
          try {
            const { data, error: refreshError } = await supabase.auth.refreshSession();
            if (refreshError) {
              console.error('Session refresh failed:', refreshError);
            } else {
              console.log('Session refreshed successfully');
            }
          } catch (refreshError) {
            console.error('Session refresh error:', refreshError);
          }
        }
        
        if (i < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
        }
      }
    }
    
    throw lastError;
  };

  const loadIncomes = async () => {
    if (!user) return;
    
    try {
      const result = await retryOperation(async () => {
        const { data, error } = await (supabase as any)
          .from('incomes')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
        
        if (error) {
          throw error;
        }
        
        return data;
      });
      
      const formattedIncomes: Income[] = (result || []).map((income: any) => ({
        id: income.id,
        description: income.description,
        amount: Number(income.amount),
        originalAmount: income.original_amount ? Number(income.original_amount) : undefined,
        currency: income.currency || 'TRY',
        date: income.date,
        category: income.category,
        monthlyRepeat: income.monthly_repeat || false,
        nextIncomeDate: income.next_income_date || undefined
      }));
      
      setIncomes(formattedIncomes);
    } catch (error) {
      console.error('Error loading incomes:', error);
    }
  };

  const loadDebts = async () => {
    if (!user) return;
    
    try {
      // First load debts
      const debtsData = await retryOperation(async () => {
        const { data, error } = await (supabase as any)
          .from('debts')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        return data;
      });
      
      // If no debts, just set empty array
      if (!debtsData || debtsData.length === 0) {
        setDebts([]);
        return;
      }
    
      // Load all payments for these debts in one query
      const debtIds = debtsData.map((d: any) => d.id);
      const allPaymentsData = await retryOperation(async () => {
        const { data, error } = await (supabase as any)
          .from('payments')
          .select('*')
          .in('debt_id', debtIds)
          .order('date', { ascending: false });
        
        if (error) throw error;
        return data;
      });
    
    // Group payments by debt_id for efficient lookup
    const paymentsByDebtId = new Map<string, Payment[]>();
    (allPaymentsData || []).forEach((payment: any) => {
      const debtId = payment.debt_id;
      if (!paymentsByDebtId.has(debtId)) {
        paymentsByDebtId.set(debtId, []);
      }
      paymentsByDebtId.get(debtId)?.push({
        id: payment.id,
        amount: Number(payment.amount),
        date: payment.date,
        debt_id: payment.debt_id
      });
    });
    
    // Build debts with their payments
    const debtsWithPayments: Debt[] = debtsData.map((debt: any) => ({
      id: debt.id,
      description: debt.description,
      totalAmount: Number(debt.total_amount),
      originalAmount: debt.original_amount ? Number(debt.original_amount) : Number(debt.total_amount),
      currency: debt.currency || 'TRY',
      dueDate: debt.due_date,
      installmentCount: debt.installment_count,
      payments: paymentsByDebtId.get(debt.id) || [],
      monthlyRepeat: debt.monthly_repeat || false,
      nextPaymentDate: debt.next_payment_date || undefined,
      category: debt.category as Debt['category'] || 'other'
    }));
      
      setDebts(debtsWithPayments);
    } catch (error) {
      console.error('Error loading debts:', error);
    }
  };

  const loadSavingGoals = async () => {
    if (!user) return;
    
    try {
      const result = await retryOperation(async () => {
        const { data, error } = await (supabase as any)
          .from('saving_goals')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        return data;
      });
      
      const formattedGoals: SavingGoal[] = (result || []).map((goal: any) => ({
        id: goal.id,
        title: goal.title,
        targetAmount: Number(goal.target_amount),
        originalAmount: goal.original_amount ? Number(goal.original_amount) : undefined,
        currency: goal.currency || 'TRY',
        currentAmount: Number(goal.current_amount),
        category: goal.category as SavingGoal['category'],
        deadline: goal.deadline
      }));
      
      setSavingGoals(formattedGoals);
    } catch (error) {
      console.error('Error loading saving goals:', error);
    }
  };

  const loadSettings = async () => {
    if (!user) return;
    
    console.log('Loading settings for user:', user.id);
    
    try {
      const result = await retryOperation(async () => {
        const { data, error } = await (supabase as any)
          .from('user_settings')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (error && error.code !== 'PGRST116') {
          throw error;
        }
        
        return data;
      });
      
      console.log('Settings loaded from DB:', result);
      
      if (result) {
        const loadedSettings = {
          debtPercentage: result.debt_percentage !== null ? result.debt_percentage : 30,
          savingsPercentage: result.savings_percentage !== null ? result.savings_percentage : 20,
          debtStrategy: result.debt_strategy as Settings['debtStrategy'] || 'snowball',
          balance: result.balance || 0,
          debtFund: result.debt_fund || 0,
          savingsFund: result.savings_fund || 0
        };
        console.log('Setting loaded settings:', loadedSettings);
        setSettings(loadedSettings);
      } else {
        console.log('No settings found in DB, using defaults');
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const loadTransfers = async () => {
    if (!user) return;
    
    try {
      const result = await retryOperation(async () => {
        const { data, error } = await (supabase as any)
          .from('transfers')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        return data;
      });

      if (result) {
        setTransfers(result.map((transfer: any) => ({
          id: transfer.id,
          fromFund: transfer.from_fund as 'balance' | 'debt_fund' | 'savings_fund',
          toFund: transfer.to_fund as 'balance' | 'debt_fund' | 'savings_fund',
          amount: parseFloat(transfer.amount?.toString() || '0'),
          description: transfer.description || '',
          transferType: transfer.transfer_type as 'manual' | 'automatic',
          createdAt: transfer.created_at
        })));
      }
    } catch (error) {
      console.error('Error loading transfers:', error);
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
        original_amount: income.originalAmount,
        currency: income.currency || 'TRY',
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
      originalAmount: data.original_amount ? Number(data.original_amount) : undefined,
      currency: data.currency || 'TRY',
      date: data.date,
      category: data.category,
      monthlyRepeat: data.monthly_repeat || false,
      nextIncomeDate: data.next_income_date || undefined
    };
    
    setIncomes(prev => [newIncome, ...prev]);
    
    // Otomatik dağıtım
    await distributeIncome(newIncome.amount);
    
    toast({ 
      title: "Başarılı", 
      description: "Gelir eklendi ve fonlara dağıtıldı." 
    });
  };

  const deleteIncome = async (id: string) => {
    if (!user) return;
    
    // Önce geliri sil
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
    
    // Bu gelir ile oluşturulmuş otomatik transferleri de sil
    // (Gelir ekleme tarihi ile transfer oluşturma tarihi karşılaştırılarak)
    const deletedIncome = incomes.find(income => income.id === id);
    if (deletedIncome) {
      const incomeDate = new Date(deletedIncome.date);
      const startOfDay = new Date(incomeDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(incomeDate);
      endOfDay.setHours(23, 59, 59, 999);
      
      // O günkü otomatik transferleri sil
      await (supabase as any)
        .from('transfers')
        .delete()
        .eq('user_id', user.id)
        .eq('transfer_type', 'automatic')
        .gte('created_at', startOfDay.toISOString())
        .lte('created_at', endOfDay.toISOString());
      
      // Gelir dağıtımını geri al - fonlardan düş
      const debtAmount = (deletedIncome.amount * settings.debtPercentage) / 100;
      const savingsAmount = (deletedIncome.amount * settings.savingsPercentage) / 100;
      const remainingAmount = deletedIncome.amount - debtAmount - savingsAmount;

      await updateSettings({
        balance: Math.max(0, (settings.balance || 0) - remainingAmount),
        debtFund: Math.max(0, (settings.debtFund || 0) - debtAmount),
        savingsFund: Math.max(0, (settings.savingsFund || 0) - savingsAmount)
      });

      // Transfer listesini yenile
      await loadTransfers();
    }
    
    setIncomes(prev => prev.filter(income => income.id !== id));
    toast({ title: "Başarılı", description: "Gelir ve ilişkili transferler silindi" });
  };

  // Debt operations
  const addDebt = async (debt: Omit<Debt, 'id' | 'payments'> & { originalAmount?: number; currency?: string }) => {
    if (!user) return;
    
    let retries = 3;
    while (retries > 0) {
      try {
        const { data, error } = await (supabase as any)
          .from('debts')
          .insert({
            user_id: user.id,
            description: debt.description,
            total_amount: debt.totalAmount,
            original_amount: debt.originalAmount || debt.totalAmount,
            currency: debt.currency || 'TRY',
            due_date: debt.dueDate,
            installment_count: debt.installmentCount,
            monthly_repeat: debt.monthlyRepeat,
            next_payment_date: debt.nextPaymentDate,
            category: debt.category || 'other'
          })
          .select()
          .single();
        
        if (error) throw error;
        
        const newDebt: Debt = {
          id: data.id,
          description: data.description,
          totalAmount: Number(data.total_amount),
          originalAmount: Number(data.original_amount),
          currency: data.currency,
          dueDate: data.due_date,
          installmentCount: data.installment_count,
          payments: [],
          monthlyRepeat: data.monthly_repeat || false,
          nextPaymentDate: data.next_payment_date || undefined,
          category: data.category as Debt['category'] || 'other'
        };
        
        setDebts(prev => [newDebt, ...prev]);
        toast({ title: "Başarılı", description: "Borç eklendi" });
        return;
        
      } catch (error: any) {
        retries--;
        
        // Kaspersky veya connection hatası kontrolü
        if (error.message?.includes('Failed to fetch') || error.name === 'TypeError') {
          if (retries === 0) {
            toast({
              title: "Bağlantı Hatası",
              description: "İnternet bağlantınızı kontrol edin veya antivirus yazılımınızın (Kaspersky) engellemiş olabileceğini kontrol edin.",
              variant: "destructive"
            });
          } else {
            // Kısa bir bekleme süresi ekle
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        } else {
          console.error('Error adding debt:', error);
          toast({
            title: "Hata",
            description: "Borç eklenirken bir hata oluştu.",
            variant: "destructive"
          });
          return;
        }
      }
    }
  };

  const addPayment = async (debtId: string, payment: Omit<Payment, 'id' | 'debt_id'>) => {
    if (!user) return;
    
    // Retry mekanizması ile ödeme ekleme
    let retryCount = 0;
    const maxRetries = 3;
    
    while (retryCount < maxRetries) {
      try {
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
          throw error;
        }
        
        // Başarılı olursa devam et
        const newPayment: Payment = {
          id: data.id,
          amount: Number(data.amount),
          date: data.date,
          debt_id: data.debt_id
        };
        
        // Borcu bul ve sonraki ödeme tarihini hesapla
        const targetDebt = debts.find(d => d.id === debtId);
        let nextPaymentDate = undefined;
        
        if (targetDebt?.monthlyRepeat || (targetDebt?.installmentCount && targetDebt.installmentCount > 0)) {
          // Mevcut next_payment_date varsa onu kullan, yoksa due_date kullan
          const baseDate = targetDebt.nextPaymentDate ? 
            new Date(targetDebt.nextPaymentDate) : 
            new Date(targetDebt.dueDate);
          
          // Bir sonraki ay aynı güne geç
          const nextMonth = new Date(baseDate);
          nextMonth.setMonth(nextMonth.getMonth() + 1);
          
          nextPaymentDate = nextMonth.toISOString();
          
          console.log('🔄 Updating next payment date for debt:', debtId);
          console.log('📅 Previous date:', targetDebt.nextPaymentDate || targetDebt.dueDate);
          console.log('📅 New next date:', nextPaymentDate);
          
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
        return; // Başarılı olursa fonksiyondan çık
        
      } catch (error: any) {
        console.error('Error adding payment:', error);
        retryCount++;
        
        // Son deneme değilse bekle ve tekrar dene
        if (retryCount < maxRetries) {
          console.log(`Retrying payment addition (attempt ${retryCount + 1}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount)); // Exponential backoff
          continue;
        }
        
        // Tüm denemeler başarısız olursa hata mesajı göster
        const errorMessage = error.message?.includes('Failed to fetch') 
          ? "Bağlantı sorunu tespit edildi. Lütfen antivirus yazılımınızı kontrol edin veya tekrar deneyin."
          : "Ödeme eklenirken bir hata oluştu.";
          
        toast({
          title: "Hata",
          description: errorMessage,
          variant: "destructive"
        });
        return;
      }
    }
  };

  const deletePayment = async (paymentId: string) => {
    if (!user) return;
    
    try {
      // Önce payment'ı bul ki hangi debt'e ait olduğunu bilelim
      const targetDebt = debts.find(debt => 
        debt.payments.some(payment => payment.id === paymentId)
      );
      
      if (!targetDebt) {
        toast({
          title: "Hata",
          description: "Ödeme bulunamadı.",
          variant: "destructive"
        });
        return;
      }

      // Payment'ı sil
      const { error } = await (supabase as any)
        .from('payments')
        .delete()
        .eq('id', paymentId);
      
      if (error) throw error;
      
      // State'i güncelle - payment'ı kaldır
      setDebts(prev => prev.map(debt => 
        debt.id === targetDebt.id 
          ? { 
              ...debt, 
              payments: debt.payments.filter(payment => payment.id !== paymentId)
            }
          : debt
      ));
      
      toast({ 
        title: "Başarılı", 
        description: "Ödeme silindi" 
      });
      
    } catch (error: any) {
      console.error('Error deleting payment:', error);
      toast({
        title: "Hata",
        description: "Ödeme silinirken bir hata oluştu.",
        variant: "destructive"
      });
    }
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
        original_amount: goal.originalAmount,
        currency: goal.currency || 'TRY',
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
      originalAmount: data.original_amount ? Number(data.original_amount) : undefined,
      currency: data.currency || 'TRY',
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
        original_amount: updates.originalAmount,
        currency: updates.currency,
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
            originalAmount: data.original_amount ? Number(data.original_amount) : undefined,
            currency: data.currency || 'TRY',
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
  const updateSettings = async (newSettings: Partial<Settings>) => {
    if (!user) return;
    
    console.log('🔥 updateSettings called with:', newSettings);
    console.log('🔥 current settings:', settings);
    
    // Immediately update local state to prevent UI lag
    setSettings(prev => {
      const updated = { ...prev, ...newSettings };
      console.log('🔥 Immediate local state update:', updated);
      return updated;
    });
    
    const updateData = {
      debt_percentage: newSettings.debtPercentage !== undefined ? newSettings.debtPercentage : settings.debtPercentage,
      savings_percentage: newSettings.savingsPercentage !== undefined ? newSettings.savingsPercentage : settings.savingsPercentage,
      debt_strategy: newSettings.debtStrategy ?? settings.debtStrategy,
      balance: newSettings.balance !== undefined ? newSettings.balance : settings.balance,
      debt_fund: newSettings.debtFund !== undefined ? newSettings.debtFund : settings.debtFund,
      savings_fund: newSettings.savingsFund !== undefined ? newSettings.savingsFund : settings.savingsFund
    };
    
    console.log('🔥 Final updateData being sent to database:', updateData);
    
    console.log('preparing to update with data:', updateData);
    
    // Try to update existing record without .single() first
    const { data: updateResult, error: updateError } = await (supabase as any)
      .from('user_settings')
      .update(updateData)
      .eq('user_id', user.id)
      .select();
    
    console.log('update result:', updateResult, 'error:', updateError);
    
    // If no rows were updated, insert a new record
    if (!updateError && (!updateResult || updateResult.length === 0)) {
      console.log('No existing record found, inserting new one');
      const { data: insertResult, error: insertError } = await (supabase as any)
        .from('user_settings')
        .insert({
          user_id: user.id,
          ...updateData
        })
        .select();
      
      console.log('insert result:', insertResult, 'error:', insertError);
      
      if (insertError) {
        console.error('Error inserting settings:', insertError);
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
    
    console.log('Setting local state with:', newSettings);
    setSettings(prev => {
      const updated = { ...prev, ...newSettings };
      console.log('Local state updated to:', updated);
      return updated;
    });
    
    toast({ title: "Başarılı", description: "Ayarlar güncellendi" });
  };

  // Gelir dağıtım fonksiyonu
  const distributeIncome = async (amount: number) => {
    if (!user) return;

    try {
      const debtAmount = (amount * settings.debtPercentage) / 100;
      const savingsAmount = (amount * settings.savingsPercentage) / 100;
      const remainingAmount = amount - debtAmount - savingsAmount;

      // Balance'ı güncelle
      await updateSettings({
        balance: (settings.balance || 0) + remainingAmount,
        debtFund: (settings.debtFund || 0) + debtAmount,
        savingsFund: (settings.savingsFund || 0) + savingsAmount
      });

      // Transfer kayıtlarını oluştur
      if (debtAmount > 0) {
        await (supabase as any).from('transfers').insert({
          user_id: user.id,
          from_fund: 'balance',
          to_fund: 'debt_fund',
          amount: debtAmount,
          description: 'Otomatik borç fonu dağıtımı',
          transfer_type: 'automatic'
        });
      }

      if (savingsAmount > 0) {
        await (supabase as any).from('transfers').insert({
          user_id: user.id,
          from_fund: 'balance',
          to_fund: 'savings_fund',
          amount: savingsAmount,
          description: 'Otomatik birikim fonu dağıtımı',
          transfer_type: 'automatic'
        });
      }

      await loadTransfers(); // Transfer listesini yenile
    } catch (error) {
      console.error('Error distributing income:', error);
    }
  };

  // Manuel transfer fonksiyonu
  const transferFunds = async (
    fromFund: 'balance' | 'debt_fund' | 'savings_fund',
    toFund: 'balance' | 'debt_fund' | 'savings_fund',
    amount: number,
    description?: string
  ) => {
    if (!user) return { success: false, error: 'Kullanıcı bulunamadı' };

    try {
      const { data, error } = await (supabase as any).rpc('transfer_funds', {
        p_from_fund: fromFund,
        p_to_fund: toFund,
        p_amount: amount,
        p_description: description,
        p_transfer_type: 'manual'
      });

      if (error) throw error;

      const result = data as { success: boolean; error?: string; message?: string };
      
      if (result.success) {
        await Promise.all([loadSettings(), loadTransfers()]);
        toast({
          title: "Transfer Tamamlandı",
          description: result.message || "Para transferi başarıyla gerçekleştirildi.",
        });
        return { success: true };
      } else {
        toast({
          title: "Transfer Hatası",
          description: result.error || "Transfer işlemi başarısız oldu.",
          variant: "destructive"
        });
        return { success: false, error: result.error };
      }
    } catch (error: any) {
      console.error('Error transferring funds:', error);
      toast({
        title: "Hata",
        description: "Transfer işlemi sırasında bir hata oluştu.",
        variant: "destructive"
      });
      return { success: false, error: error.message };
    }
  };

  const deleteTransfer = async (transferId: string) => {
    if (!user) return { success: false, error: 'Kullanıcı bulunamadı' };

    try {
      // İlk önce transfer detaylarını al
      const { data: transferData, error: fetchError } = await (supabase as any)
        .from('transfers')
        .select('*')
        .eq('id', transferId)
        .eq('user_id', user.id)
        .single();

      if (fetchError) throw fetchError;
      if (!transferData) {
        return { success: false, error: 'Transfer bulunamadı' };
      }

      // Transfer işlemini geri al - fonları eski haline döndür
      const { error: revertError } = await (supabase as any).rpc('revert_transfer', {
        p_transfer_id: transferId
      });

      if (revertError) throw revertError;

      // Transfer kaydını sil
      const { error: deleteError } = await (supabase as any)
        .from('transfers')
        .delete()
        .eq('id', transferId)
        .eq('user_id', user.id);

      if (deleteError) throw deleteError;

      await Promise.all([loadSettings(), loadTransfers()]);
      
      toast({
        title: "Transfer Silindi",
        description: "Transfer başarıyla silindi ve fonlar eski haline döndürüldü.",
      });
      
      return { success: true };
    } catch (error: any) {
      console.error('Error deleting transfer:', error);
      toast({
        title: "Hata",
        description: "Transfer silinirken bir hata oluştu.",
        variant: "destructive"
      });
      return { success: false, error: error.message };
    }
  };

  return {
    incomes,
    debts,
    savingGoals,
    transfers,
    settings,
    loading,
    addIncome,
    deleteIncome,
    addDebt,
    addPayment,
    deletePayment,
    deleteDebt,
    updateDebt,
    addSavingGoal,
    updateSavingGoal,
    deleteSavingGoal,
    updateSettings,
    transferFunds,
    deleteTransfer,
    refreshData: loadAllData
  };
};