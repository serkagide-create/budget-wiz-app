import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useFinancialData } from '@/hooks/useFinancialData';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { DebtAccordion } from '@/components/DebtAccordion';
import FundTransfer from '@/components/FundTransfer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useTheme } from "next-themes";
import { formatCurrency, formatDate, getDaysUntilDue } from '@/lib/utils';
import { useCurrency, CURRENCIES } from '@/hooks/useCurrency';
import { DebtStrategyAnalysis } from '@/components/DebtStrategyAnalysis';
import { BudgetAnalysis } from '@/components/BudgetAnalysis';
import { FinancialPlanning } from '@/components/FinancialPlanning';
import { GoalTracking } from '@/components/GoalTracking';
import { 
  PlusCircle, 
  Trash2, 
  TrendingUp, 
  Target, 
  AlertTriangle,
  Home,
  Car,
  Plane,
  BookOpen,
  Wallet,
  CreditCard,
  Settings,
  ChevronRight,
  Calendar,
  DollarSign,
  Sun,
  Moon,
  Check,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  LogOut,
  User,
  Building2,
  FileText,
  ShoppingCart,
  Receipt,
  Edit,
  ArrowLeftRight,
  BarChart3
} from 'lucide-react';

import brandLogo from '@/assets/borc-yok-logo-1.png';

// TypeScript Interface Definitions
interface Income {
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

interface Payment {
  id: string;
  amount: number;
  date: string;
}

interface Debt {
  id: string;
  description: string;
  totalAmount: number;
  originalAmount?: number;
  currency?: string;
  dueDate: string;
  installmentCount: number;
  payments: Payment[];
  monthlyRepeat?: boolean;
  nextPaymentDate?: string;
  category?: 'credit-card' | 'loan' | 'mortgage' | 'car-loan' | 'bill' | 'installment' | 'other';
}

interface SavingGoal {
  id: string;
  title: string;
  targetAmount: number;
  originalAmount?: number;
  currency?: string;
  currentAmount: number;
  category: 'house' | 'car' | 'vacation' | 'education' | 'other';
  deadline: string;
}

interface Settings {
  debtPercentage: number;
  savingsPercentage: number;
  debtStrategy: 'snowball' | 'avalanche';
}

const BudgetApp = () => {
  const { theme, setTheme } = useTheme();
  const { user, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Use currency hook
  const { convertToTRY, formatAmount, exchangeRates, loading: currencyLoading } = useCurrency();
  const {
    incomes,
    debts,
    savingGoals,
    transfers,
    expenses,
    budgets,
    settings,
    loading: dataLoading,
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
    addExpense,
    deleteExpense,
    refreshData
  } = useFinancialData();

  // Giriş yapılmadıysa auth sayfasına yönlendir
  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  const [activeTab, setActiveTab] = useState<'dashboard' | 'incomes' | 'debts' | 'saving-goals' | 'transfers' | 'expenses' | 'settings'>('dashboard');
  const hasShownSyncToastRef = useRef(false);

  // AI Assistant State
  const [chatMessages, setChatMessages] = useState<Array<{id: string, type: 'user' | 'assistant', message: string, timestamp: Date}>>([]);
  const [chatInput, setChatInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Voice Assistant State
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [elevenlabsApiKey, setElevenlabsApiKey] = useState('');
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<any>(null);

  // Form States
  const [incomeForm, setIncomeForm] = useState({ description: '', amount: '', category: '', monthlyRepeat: false, date: new Date().toISOString().split('T')[0], currency: 'TRY' });
  const [debtForm, setDebtForm] = useState({ description: '', amount: '', dueDate: '', installmentCount: '', monthlyRepeat: false, category: 'other' as Debt['category'], currency: 'TRY' });
  const [savingForm, setSavingForm] = useState({ 
    title: '', 
    targetAmount: '', 
    category: 'other' as SavingGoal['category'],
    deadline: '',
    currency: 'TRY'
  });
  const [expenseForm, setExpenseForm] = useState({ 
    description: '', 
    amount: '', 
    category: '',
    date: new Date().toISOString().split('T')[0]
  });
  const [paymentForms, setPaymentForms] = useState<{[key: string]: string}>({});
  const [savingContributionForms, setSavingContributionForms] = useState<{[key: string]: string}>({});
  const [savingContributionsByGoal, setSavingContributionsByGoal] = useState<Record<string, Array<{id: string; amount: number; date: string; description?: string}>>>({});
  
  // Edit States
  const [editingDebtId, setEditingDebtId] = useState<string | null>(null);
  const [editDebtForm, setEditDebtForm] = useState({ description: '', totalAmount: '', dueDate: '', installmentCount: '', category: 'other' as Debt['category'] });

  // Utility Functions
  const formatMsgTime = (ts: any): string => {
    try {
      const d = ts instanceof Date ? ts : new Date(ts);
      if (isNaN(d.getTime())) return '';
      return d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const getDebtCategoryIcon = (category: string) => {
    const icons = {
      'credit-card': <CreditCard className="w-5 h-5" />,
      'loan': <Building2 className="w-5 h-5" />,
      'mortgage': <Home className="w-5 h-5" />,
      'car-loan': <Car className="w-5 h-5" />,
      'bill': <FileText className="w-5 h-5" />,
      'installment': <ShoppingCart className="w-5 h-5" />,
      'other': <Wallet className="w-5 h-5" />
    };
    return icons[category as keyof typeof icons] || icons.other;
  };

  const getCategoryIcon = (category: string) => {
    const icons = {
      house: <Home className="w-6 h-6" />,
      car: <Car className="w-6 h-6" />,
      vacation: <Plane className="w-6 h-6" />,
      education: <BookOpen className="w-6 h-6" />,
      other: <Wallet className="w-6 h-6" />
    };
    return icons[category as keyof typeof icons] || icons.other;
  };


  const getCategoryEmoji = (category: string) => {
    const emojis = {
      house: '🏠',
      car: '🚗',
      vacation: '🏖️',
      education: '📚',
      other: '💰'
    };
    return emojis[category as keyof typeof emojis] || emojis.other;
  };

  // Form submission handlers
  const handleAddIncome = async () => {
    if (!incomeForm.description || !incomeForm.amount || !incomeForm.category) {
      toast({ title: "Hata", description: "Lütfen tüm alanları doldurun", variant: "destructive" });
      return;
    }

    try {
      const originalAmount = parseFloat(incomeForm.amount);
      const totalAmountInTRY = convertToTRY(originalAmount, incomeForm.currency);
      
      await addIncome({
        description: incomeForm.description,
        amount: totalAmountInTRY,
        originalAmount: originalAmount,
        currency: incomeForm.currency,
        date: incomeForm.date,
        category: incomeForm.category,
        monthlyRepeat: incomeForm.monthlyRepeat,
        nextIncomeDate: incomeForm.monthlyRepeat ? 
          new Date(new Date(incomeForm.date).setMonth(new Date(incomeForm.date).getMonth() + 1)).toISOString() : 
          undefined
      });
      
      setIncomeForm({ description: '', amount: '', category: '', monthlyRepeat: false, date: new Date().toISOString().split('T')[0], currency: 'TRY' });
      toast({ title: "Başarılı", description: "Gelir eklendi" });
    } catch (error) {
      toast({ title: "Hata", description: "Gelir eklenirken hata oluştu", variant: "destructive" });
    }
  };

  const handleAddDebt = async () => {
    if (!debtForm.description || !debtForm.amount || !debtForm.dueDate || !debtForm.installmentCount) {
      toast({ title: "Hata", description: "Lütfen tüm alanları doldurun", variant: "destructive" });
      return;
    }

    try {
      const originalAmount = parseFloat(debtForm.amount);
      const totalAmountInTRY = convertToTRY(originalAmount, debtForm.currency);
      
      await addDebt({
        description: debtForm.description,
        totalAmount: totalAmountInTRY,
        originalAmount: originalAmount,
        currency: debtForm.currency,
        dueDate: debtForm.dueDate,
        installmentCount: parseInt(debtForm.installmentCount),
        monthlyRepeat: debtForm.monthlyRepeat,
        nextPaymentDate: debtForm.monthlyRepeat ? 
          new Date(new Date(debtForm.dueDate).setMonth(new Date(debtForm.dueDate).getMonth() + 1)).toISOString() : 
          undefined,
        category: debtForm.category
      });
      
      setDebtForm({ description: '', amount: '', dueDate: '', installmentCount: '', monthlyRepeat: false, category: 'other', currency: 'TRY' });
      toast({ title: "Başarılı", description: "Borç eklendi" });
    } catch (error) {
      toast({ title: "Hata", description: "Borç eklenirken hata oluştu", variant: "destructive" });
    }
  };

  const handleAddSavingGoal = async () => {
    if (!savingForm.title || !savingForm.targetAmount || !savingForm.category || !savingForm.deadline) {
      toast({ title: "Hata", description: "Lütfen tüm alanları doldurun", variant: "destructive" });
      return;
    }

    try {
      const originalAmount = parseFloat(savingForm.targetAmount);
      const targetAmountInTRY = convertToTRY(originalAmount, savingForm.currency);
      
      await addSavingGoal({
        title: savingForm.title,
        category: savingForm.category,
        targetAmount: targetAmountInTRY,
        originalAmount: originalAmount,
        currency: savingForm.currency,
        currentAmount: 0,
        deadline: savingForm.deadline
      });
      
      setSavingForm({ title: '', targetAmount: '', category: 'other', deadline: '', currency: 'TRY' });
      toast({ title: "Başarılı", description: "Birikim hedefi eklendi" });
    } catch (error) {
      toast({ title: "Hata", description: "Birikim hedefi eklenirken hata oluştu", variant: "destructive" });
    }
  };

  const handleAddExpense = async () => {
    if (!expenseForm.description || !expenseForm.amount || !expenseForm.category) {
      toast({ title: "Hata", description: "Lütfen tüm alanları doldurun", variant: "destructive" });
      return;
    }

    try {
      await addExpense({
        description: expenseForm.description,
        amount: parseFloat(expenseForm.amount),
        category: expenseForm.category,
        date: expenseForm.date
      });
      
      setExpenseForm({ description: '', amount: '', category: '', date: new Date().toISOString().split('T')[0] });
      toast({ title: "Başarılı", description: "Gider eklendi" });
    } catch (error) {
      toast({ title: "Hata", description: "Gider eklenirken hata oluştu", variant: "destructive" });
    }
  };


  // Load saving contributions for a goal
  const loadSavingContributions = async (goalId: string) => {
    try {
      const { data, error } = await supabase
        .from('saving_contributions')
        .select('*')
        .eq('saving_goal_id', goalId)
        .order('date', { ascending: false });

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error loading contributions:', error);
      return [];
    }
  };

  // Load all contributions for all goals
  const loadAllSavingContributions = async () => {
    if (savingGoals.length === 0) {
      setSavingContributionsByGoal({});
      return;
    }

    try {
      const goalIds = savingGoals.map(g => g.id);
      const { data, error } = await supabase
        .from('saving_contributions')
        .select('*')
        .in('saving_goal_id', goalIds)
        .order('date', { ascending: false });

      if (error) throw error;

      const grouped: Record<string, Array<{id: string; amount: number; date: string; description?: string}>> = {};
      (data || []).forEach((c: any) => {
        const gid = c.saving_goal_id as string;
        if (!grouped[gid]) grouped[gid] = [];
        grouped[gid].push({ id: c.id, amount: Number(c.amount), date: c.date, description: c.description });
      });

      setSavingContributionsByGoal(grouped);
    } catch (e) {
      console.error('Error loading contributions:', e);
      setSavingContributionsByGoal({});
    }
  };

  // Load contributions when saving goals change
  useEffect(() => {
    if (savingGoals.length > 0) {
      loadAllSavingContributions();
    }
  }, [savingGoals]);

  const handleAddSavingAmount = async (goalId: string, amount: number) => {
    const nowIso = new Date().toISOString();
    const tempId = `temp-${Date.now()}`;

    // Optimistic UI update
    setSavingContributionsByGoal(prev => ({
      ...prev,
      [goalId]: [
        { id: tempId, amount, date: nowIso, description: 'Tasarruf katkısı' },
        ...(prev[goalId] || [])
      ]
    }));

    try {
      const { data: contributionData, error: contributionError } = await supabase
        .from('saving_contributions')
        .insert({
          saving_goal_id: goalId,
          amount,
          date: nowIso,
          description: 'Tasarruf katkısı'
        })
        .select()
        .single();

      if (contributionError) throw contributionError;

      const goal = savingGoals.find(g => g.id === goalId);
      if (goal) {
        await updateSavingGoal(goalId, { currentAmount: goal.currentAmount + amount });
      }

      // Replace temp id with actual id
      setSavingContributionsByGoal(prev => ({
        ...prev,
        [goalId]: (prev[goalId] || []).map(c => c.id === tempId ? {
          id: contributionData.id,
          amount: Number(contributionData.amount),
          date: contributionData.date,
          description: contributionData.description
        } : c)
      }));

      toast({ title: "Başarılı", description: `${formatCurrency(amount)} eklendi` });
    } catch (error) {
      console.error('Error adding contribution:', error);
      // Rollback optimistic update
      setSavingContributionsByGoal(prev => ({
        ...prev,
        [goalId]: (prev[goalId] || []).filter(c => c.id !== tempId)
      }));
      toast({ title: "Hata", description: "Katkı eklenirken hata oluştu", variant: "destructive" });
    }
  };

  // Delete a saving contribution
  const deleteSavingContribution = async (contributionId: string, goalId: string, amount: number) => {
    const prevState = savingContributionsByGoal;
    // Optimistic UI update
    setSavingContributionsByGoal(prev => ({
      ...prev,
      [goalId]: (prev[goalId] || []).filter(c => c.id !== contributionId)
    }));

    try {
      const { error } = await supabase
        .from('saving_contributions')
        .delete()
        .eq('id', contributionId);

      if (error) throw error;

      const goal = savingGoals.find(g => g.id === goalId);
      if (goal) {
        await updateSavingGoal(goalId, { currentAmount: Math.max(0, goal.currentAmount - amount) });
      }

      toast({ title: "Başarılı", description: "Katkı silindi" });
    } catch (error) {
      console.error('Error deleting contribution:', error);
      // Rollback
      setSavingContributionsByGoal(prevState);
      toast({ title: "Hata", description: "Katkı silinirken hata oluştu", variant: "destructive" });
    }
  };

  // Debt editing functions
  const handleEditDebt = (debt: Debt) => {
    setEditingDebtId(debt.id);
    setEditDebtForm({
      description: debt.description,
      totalAmount: debt.totalAmount.toString(),
      dueDate: debt.dueDate.split('T')[0], // Format date for input
      installmentCount: debt.installmentCount.toString(),
      category: debt.category || 'other'
    });
  };

  const handleSaveDebtEdit = async () => {
    if (!editingDebtId || !editDebtForm.description || !editDebtForm.totalAmount || !editDebtForm.dueDate || !editDebtForm.installmentCount) {
      toast({ title: "Hata", description: "Lütfen tüm alanları doldurun", variant: "destructive" });
      return;
    }

    try {
      await updateDebt(editingDebtId, {
        description: editDebtForm.description,
        totalAmount: parseFloat(editDebtForm.totalAmount),
        dueDate: editDebtForm.dueDate,
        installmentCount: parseInt(editDebtForm.installmentCount),
        category: editDebtForm.category
      });

      setEditingDebtId(null);
      setEditDebtForm({ description: '', totalAmount: '', dueDate: '', installmentCount: '', category: 'other' });
      toast({ title: "Başarılı", description: "Borç güncellendi" });
    } catch (error) {
      toast({ title: "Hata", description: "Borç güncellenirken hata oluştu", variant: "destructive" });
    }
  };

  const handleCancelDebtEdit = () => {
    setEditingDebtId(null);
    setEditDebtForm({ description: '', totalAmount: '', dueDate: '', installmentCount: '', category: 'other' });
  };

  // Payment functions with useCallback for optimization
  const payInstallment = React.useCallback(async (debtId: string) => {
    const debt = debts.find(d => d.id === debtId);
    if (!debt) return;
    
    const totalPaid = debt.payments.reduce((sum, payment) => sum + payment.amount, 0);
    const remaining = debt.totalAmount - totalPaid;
    const installmentAmount = Math.min(Math.ceil(debt.totalAmount / debt.installmentCount), remaining);
    
    try {
      await addPayment(debtId, {
        amount: installmentAmount,
        date: new Date().toISOString()
      });
      
      // Refresh data to get updated state immediately
      await refreshData();
      
      toast({ title: "Ödeme Yapıldı", description: `${formatCurrency(installmentAmount)} ödendi` });
    } catch (error) {
      toast({ title: "Hata", description: "Ödeme eklenirken hata oluştu", variant: "destructive" });
    }
  }, [debts, addPayment, refreshData, toast]);

  const makeCustomPayment = React.useCallback(async (debtId: string, amount: number) => {
    try {
      await addPayment(debtId, {
        amount: amount,
        date: new Date().toISOString()
      });
      
      // Refresh data to get updated state immediately
      await refreshData();
      
      setPaymentForms(prev => ({ ...prev, [debtId]: '' }));
      toast({ title: "Ödeme Yapıldı", description: `${formatCurrency(amount)} ödendi` });
    } catch (error) {
      toast({ title: "Hata", description: "Ödeme eklenirken hata oluştu", variant: "destructive" });
    }
  }, [addPayment, refreshData, setPaymentForms, toast]);

  // Calculations
  const totalIncome = incomes.reduce((sum, income) => sum + income.amount, 0);
  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);

  // Calculate fund allocations based on income percentages (this is the correct total allocation)
  const debtFund = (totalIncome * settings.debtPercentage) / 100;
  const savingsFund = (totalIncome * settings.savingsPercentage) / 100;
  const livingExpensesFund = (totalIncome * settings.livingExpensesPercentage) / 100;
  const usedDebtFund = debts.reduce((sum, debt) => 
    sum + debt.payments.reduce((paySum, payment) => paySum + payment.amount, 0), 0
  );
  const usedSavingsFund = savingGoals.reduce((sum, goal) => sum + goal.currentAmount, 0);
  const availableDebtFund = Math.max(0, debtFund - usedDebtFund);
  const availableSavingsFund = Math.max(0, savingsFund - usedSavingsFund);
  const availableLivingExpensesFund = Math.max(0, livingExpensesFund - totalExpenses);

  // Debt Strategy Logic
  const getSortedDebts = () => {
    const debtsWithCalculations = debts.map(debt => {
      const totalPaid = debt.payments.reduce((sum, payment) => sum + payment.amount, 0);
      const remaining = debt.totalAmount - totalPaid;
      const estimatedInterestRate = 15; // Default %15 faiz oranı
      
      return {
        ...debt,
        totalPaid,
        remaining,
        estimatedInterestRate,
        isCompleted: remaining <= 0
      };
    });

    // Tamamlanmamış borçları filtrele
    const activeDebts = debtsWithCalculations.filter(debt => !debt.isCompleted);

    if (settings.debtStrategy === 'snowball') {
      return activeDebts.sort((a, b) => a.remaining - b.remaining);
    } else {
      return activeDebts.sort((a, b) => b.estimatedInterestRate - a.estimatedInterestRate);
    }
  };

  // Render Functions
  const renderDashboard = () => (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="bg-gradient-income border-0">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-income-foreground/80">Toplam Gelir</p>
                <p className="text-xl font-bold text-income-foreground">
                  {formatCurrency(totalIncome)}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-income-foreground/60" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-expense border-0">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-expense-foreground/80">Borç Fonu (%{settings.debtPercentage})</p>
                <p className="text-xl font-bold text-expense-foreground">
                  {formatCurrency(availableDebtFund)}
                </p>
              </div>
              <Target className="w-8 h-8 text-expense-foreground/60" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-savings border-0">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-savings-foreground/80">Birikim Fonu (%{settings.savingsPercentage})</p>
                <p className="text-xl font-bold text-savings-foreground">
                  {formatCurrency(availableSavingsFund)}
                </p>
              </div>
              <Wallet className="w-8 h-8 text-savings-foreground/60" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-spendable border-0">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-spendable-foreground/80">Harcanabilir Fon (%{settings.livingExpensesPercentage})</p>
                <p className="text-xl font-bold text-spendable-foreground">
                  {formatCurrency(availableLivingExpensesFund)}
                </p>
              </div>
              <CreditCard className="w-8 h-8 text-spendable-foreground/60" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Button 
          variant="outline" 
          className="h-16 text-left justify-start" 
          onClick={() => setActiveTab('incomes')} 
        >
          <div className="flex items-center gap-3">
            <div className="bg-income/20 p-2 rounded-lg">
              <TrendingUp className="w-5 h-5 text-income" />
            </div>
            <div>
              <p className="font-medium">Gelir Ekle</p>
              <p className="text-sm text-muted-foreground">Maaş, kira geliri vb.</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 ml-auto" />
        </Button>

        <Button 
          variant="outline" 
          className="h-16 text-left justify-start" 
          onClick={() => setActiveTab('debts')} 
        >
          <div className="flex items-center gap-3">
            <div className="bg-expense/20 p-2 rounded-lg">
              <Target className="w-5 h-5 text-expense" />
            </div>
            <div>
              <p className="font-medium">Borç Ekle</p>
              <p className="text-sm text-muted-foreground">Kredi kartı, kredi vb.</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 ml-auto" />
        </Button>
      </div>

      {/* Finansal Planlama & Analiz */}
      <div className="space-y-6">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold">Finansal Planlama & Analiz</h2>
          <p className="text-muted-foreground text-sm">Borç stratejinizi analiz edin ve geleceği planlayın</p>
        </div>

        <Tabs defaultValue="strategy" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="strategy">Strateji</TabsTrigger>
            <TabsTrigger value="budget">Bütçe</TabsTrigger>
            <TabsTrigger value="planning">Planlama</TabsTrigger>
            <TabsTrigger value="goals">Hedefler</TabsTrigger>
          </TabsList>
          
          <TabsContent value="strategy" className="space-y-4">
            <DebtStrategyAnalysis
              debts={debts}
              strategy={settings.debtStrategy}
              availableDebtFund={availableDebtFund}
            />
          </TabsContent>
          
          <TabsContent value="budget" className="space-y-4">
            <BudgetAnalysis
              totalIncome={totalIncome}
              totalExpenses={totalExpenses}
              debtPayments={totalIncome * settings.debtPercentage / 100}
              savings={totalIncome * settings.savingsPercentage / 100}
              settings={settings}
            />
          </TabsContent>
          
          <TabsContent value="planning" className="space-y-4">
            <FinancialPlanning
              debts={debts}
              savingGoals={savingGoals}
              monthlyIncome={totalIncome}
              debtPercentage={settings.debtPercentage}
              savingsPercentage={settings.savingsPercentage}
            />
          </TabsContent>
          
          <TabsContent value="goals" className="space-y-4">
            <GoalTracking
              debts={debts}
              monthlyIncome={totalIncome}
              savingsPercentage={settings.savingsPercentage}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );

  const renderIncomes = () => (
    <div className="space-y-4">
      {/* Income distribution cards */}
      <div className="grid grid-cols-1 gap-3">
        <Card className="bg-gradient-income border-0">
          <CardContent className="p-4 text-center">
            <p className="text-sm text-income-foreground/80">Toplam Gelir</p>
            <p className="text-2xl font-bold text-income-foreground">
              {formatCurrency(totalIncome)}
            </p>
          </CardContent>
        </Card>

        {/* Fund Distribution */}
        <div className="grid grid-cols-3 gap-2">
          <Card className="bg-gradient-expense border-0">
            <CardContent className="p-3 text-center">
              <p className="text-xs text-expense-foreground/80">Kalan Borç Fonu</p>
              <p className="text-sm font-bold text-expense-foreground">%{settings.debtPercentage}</p>
              <p className="text-xs text-expense-foreground/60">
                {formatCurrency(availableDebtFund)}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-savings border-0">
            <CardContent className="p-3 text-center">
              <p className="text-xs text-savings-foreground/80">Kalan Tasarruf Fonu</p>
              <p className="text-sm font-bold text-savings-foreground">%{settings.savingsPercentage}</p>
              <p className="text-xs text-savings-foreground/60">
                {formatCurrency(availableSavingsFund)}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-accent border-0">
            <CardContent className="p-3 text-center">
              <p className="text-xs text-primary-foreground/80">Harcanabilir Fon</p>
              <p className="text-sm font-bold text-primary-foreground">%{settings.livingExpensesPercentage}</p>
              <p className="text-xs text-primary-foreground/60">
                {formatCurrency(availableLivingExpensesFund)}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Add Income Form */}
      <Card>
        <CardContent className="p-4">
          <div className="space-y-3">
            <Input
              placeholder="Gelir açıklaması"
              value={incomeForm.description}
              onChange={(e) => setIncomeForm(prev => ({ ...prev, description: e.target.value }))}
            />
            <div className="grid grid-cols-3 gap-2">
              <Select
                value={incomeForm.currency}
                onValueChange={(value) => setIncomeForm(prev => ({ ...prev, currency: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Para birimi" />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((currency) => (
                    <SelectItem key={currency.code} value={currency.code}>
                      {currency.flag} {currency.code} - {currency.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="number"
                placeholder={`Tutar (${incomeForm.currency === 'TRY' ? '₺' : CURRENCIES.find(c => c.code === incomeForm.currency)?.symbol || ''})`}
                value={incomeForm.amount}
                onChange={(e) => setIncomeForm(prev => ({ ...prev, amount: e.target.value }))}
              />
              <Select
                value={incomeForm.category}
                onValueChange={(value) => setIncomeForm(prev => ({ ...prev, category: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Kategori" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="salary">💼 Maaş</SelectItem>
                  <SelectItem value="freelance">💻 Serbest İş</SelectItem>
                  <SelectItem value="rental">🏠 Kira Geliri</SelectItem>
                  <SelectItem value="investment">📈 Yatırım</SelectItem>
                  <SelectItem value="gold">🟡 Altın</SelectItem>
                  <SelectItem value="other">📋 Diğer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {incomeForm.currency !== 'TRY' && incomeForm.amount && (
              <div className="text-sm text-muted-foreground bg-muted/50 p-2 rounded">
                TRY karşılığı: {formatCurrency(convertToTRY(parseFloat(incomeForm.amount), incomeForm.currency))}
              </div>
            )}
            <div className="flex gap-2">
              <Input
                type="date"
                value={incomeForm.date}
                onChange={(e) => setIncomeForm(prev => ({ ...prev, date: e.target.value }))}
              />
              <Button onClick={handleAddIncome}>
                <PlusCircle className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="monthlyRepeatIncome"
                checked={incomeForm.monthlyRepeat}
                onChange={(e) => setIncomeForm(prev => ({ ...prev, monthlyRepeat: e.target.checked }))}
                className="w-4 h-4"
              />
              <Label htmlFor="monthlyRepeatIncome" className="text-sm">
                Her ay tekrarlansın
              </Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Income List Grouped by Category */}
      {incomes.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          Henüz gelir eklenmemiş
        </div>
      ) : (
        <Accordion type="multiple" className="space-y-4">
          {(() => {
            const incomeCategories = {
              salary: { name: '💼 Maaş', incomes: [] as any[] },
              freelance: { name: '💻 Serbest İş', incomes: [] as any[] },
              rental: { name: '🏠 Kira Geliri', incomes: [] as any[] },
              investment: { name: '📈 Yatırım', incomes: [] as any[] },
              gold: { name: '🟡 Altın', incomes: [] as any[] },
              other: { name: '📋 Diğer', incomes: [] as any[] }
            };

            // Group incomes by category
            incomes.forEach(income => {
              if (incomeCategories[income.category as keyof typeof incomeCategories]) {
                incomeCategories[income.category as keyof typeof incomeCategories].incomes.push(income);
              } else {
                incomeCategories.other.incomes.push(income);
              }
            });

            // Filter out empty categories and render
            return Object.entries(incomeCategories)
              .filter(([_, data]) => data.incomes.length > 0)
              .map(([category, categoryData]) => {
                const totalAmount = categoryData.incomes.reduce((sum, income) => sum + income.amount, 0);
                
                return (
                  <AccordionItem 
                    key={category} 
                    value={category}
                    className="bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-950/40 dark:to-green-950/20 border border-emerald-200/50 dark:border-emerald-800/30 rounded-xl overflow-hidden"
                  >
                    <AccordionTrigger className="px-6 py-4 hover:no-underline">
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-3">
                          <div className="text-2xl">{categoryData.name.split(' ')[0]}</div>
                          <div>
                            <h3 className="text-lg font-semibold text-emerald-800 dark:text-emerald-200 text-left">
                              {categoryData.name.split(' ').slice(1).join(' ')}
                            </h3>
                            <p className="text-sm text-emerald-600 dark:text-emerald-400 text-left">
                              {categoryData.incomes.length} gelir kalemi
                            </p>
                          </div>
                        </div>
                        <div className="text-right mr-4">
                          <div className="text-xl font-bold text-emerald-700 dark:text-emerald-300">
                            +{formatCurrency(totalAmount)}
                          </div>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-6 pb-3">
                      <div className="space-y-2 border-t border-emerald-500/20 pt-3">
                        {categoryData.incomes
                          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                          .map((income, index) => (
                            <div key={income.id} className="bg-gradient-to-r from-emerald-50 to-green-100 dark:from-emerald-950/30 dark:to-green-900/20 rounded-lg p-3 border border-emerald-200/50 dark:border-emerald-800/30">
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-xs text-muted-foreground">
                                      {formatDate(income.date)}
                                    </span>
                                    {income.currency && income.currency !== 'TRY' && (
                                      <Badge variant="outline" className="text-xs">
                                        {income.currency}
                                      </Badge>
                                    )}
                                  </div>
                                  <h5 className="font-medium text-gray-800 dark:text-gray-200">
                                    {income.description}
                                  </h5>
                                </div>
                                <div className="flex items-center gap-2 ml-4">
                                  <div className="text-right">
                                    <div className="text-lg font-bold text-emerald-700 dark:text-emerald-400">
                                      +{formatCurrency(income.amount)}
                                    </div>
                                    {income.currency && income.currency !== 'TRY' && income.originalAmount && (
                                      <div className="text-xs text-muted-foreground">
                                        {formatAmount(income.originalAmount, income.currency)}
                                      </div>
                                    )}
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => deleteIncome(income.id)}
                                    className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              });
          })()}
        </Accordion>
      )}
    </div>
  );

  const renderDebts = () => {
    const sortedDebts = getSortedDebts();
    const totalDebtAmount = debts.reduce((sum, debt) => sum + debt.totalAmount, 0);
    
    return (
      <div className="space-y-4">
        {/* Summary cards */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="bg-gradient-expense border-0">
            <CardContent className="p-4 text-center">
              <p className="text-sm text-expense-foreground/80">Toplam Borç</p>
              <p className="text-2xl font-bold text-expense-foreground">
                {formatCurrency(totalDebtAmount)}
              </p>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-expense border-0">
            <CardContent className="p-4 text-center">
              <p className="text-sm text-expense-foreground/80">Kullanılabilir Borç Fonu</p>
              <p className="text-2xl font-bold text-expense-foreground">
                {formatCurrency(availableDebtFund)}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Add Debt Form */}
        <Card>
          <CardContent className="p-4">
            <div className="space-y-3">
               <div className="flex gap-2">
                 <Input
                   placeholder="Borç açıklaması"
                   value={debtForm.description}
                   onChange={(e) => setDebtForm(prev => ({ ...prev, description: e.target.value }))}
                 />
                 <Button 
                   variant="outline" 
                   size="sm"
                   onClick={() => setDebtForm({
                     description: 'Ev Kirası',
                     amount: '15000',
                     dueDate: new Date(new Date().getFullYear(), new Date().getMonth(), 15).toISOString().split('T')[0],
                     installmentCount: '1',
                     monthlyRepeat: true,
                     category: 'bill',
                     currency: 'TRY'
                   })}
                   className="whitespace-nowrap"
                 >
                   Örnek Ekle
                 </Button>
               </div>
               <div className="flex items-center space-x-2">
                 <input
                   type="checkbox"
                   id="monthlyRepeatDebt"
                   checked={debtForm.monthlyRepeat}
                   onChange={(e) => setDebtForm(prev => ({ ...prev, monthlyRepeat: e.target.checked }))}
                   className="rounded border-gray-300"
                 />
                 <Label htmlFor="monthlyRepeatDebt" className="text-sm">
                   Aylık tekrarla
                 </Label>
               </div>
              <Select
                value={debtForm.category}
                onValueChange={(value) => setDebtForm(prev => ({ ...prev, category: value as Debt['category'] }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Borç türü seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="credit-card">💳 Kredi Kartı</SelectItem>
                  <SelectItem value="loan">🏦 Kredi</SelectItem>
                  <SelectItem value="mortgage">🏠 Konut Kredisi</SelectItem>
                  <SelectItem value="car-loan">🚗 Araç Kredisi</SelectItem>
                  <SelectItem value="bill">📄 Fatura</SelectItem>
                  <SelectItem value="installment">🛒 Taksitli Alışveriş</SelectItem>
                  <SelectItem value="other">📋 Diğer</SelectItem>
                </SelectContent>
              </Select>
              <div className="grid grid-cols-3 gap-2">
                <Select
                  value={debtForm.currency}
                  onValueChange={(value) => setDebtForm(prev => ({ ...prev, currency: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Para birimi" />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((currency) => (
                      <SelectItem key={currency.code} value={currency.code}>
                        {currency.flag} {currency.code} - {currency.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  placeholder={`Tutar (${debtForm.currency === 'TRY' ? '₺' : CURRENCIES.find(c => c.code === debtForm.currency)?.symbol || ''})`}
                  value={debtForm.amount}
                  onChange={(e) => setDebtForm(prev => ({ ...prev, amount: e.target.value }))}
                />
                <Input
                  type="number"
                  placeholder="Taksit sayısı"
                  value={debtForm.installmentCount}
                  onChange={(e) => setDebtForm(prev => ({ ...prev, installmentCount: e.target.value }))}
                />
              </div>
              {debtForm.currency !== 'TRY' && debtForm.amount && (
                <div className="text-sm text-muted-foreground bg-muted/50 p-2 rounded">
                  TL Karşılığı: <span className="font-medium">{formatCurrency(convertToTRY(parseFloat(debtForm.amount || '0'), debtForm.currency))}</span>
                  {currencyLoading && <span className="ml-2 animate-pulse">📊 Kurlar güncelleniyor...</span>}
                </div>
              )}
              <div className="flex gap-2">
                <Input
                  type="date"
                  value={debtForm.dueDate}
                  onChange={(e) => setDebtForm(prev => ({ ...prev, dueDate: e.target.value }))}
                />
                <Button onClick={handleAddDebt}>
                  <PlusCircle className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Debt List with Accordion */}
        {debts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Henüz borç eklenmemiş
          </div>
        ) : (
          <DebtAccordion
            debts={debts}
            sortedDebts={sortedDebts}
            editingDebtId={editingDebtId}
            editDebtForm={editDebtForm}
            paymentForms={paymentForms}
            getDebtCategoryIcon={getDebtCategoryIcon}
            setEditDebtForm={setEditDebtForm}
            setPaymentForms={setPaymentForms}
            handleEditDebt={handleEditDebt}
            handleSaveDebtEdit={handleSaveDebtEdit}
            handleCancelDebtEdit={handleCancelDebtEdit}
            payInstallment={payInstallment}
            makeCustomPayment={makeCustomPayment}
            deleteDebt={deleteDebt}
            deletePayment={deletePayment}
          />
        )}
      </div>
    );
  };

  const renderSavingGoals = () => (
    <div className="space-y-4">
      {/* Available Savings Fund */}
      <Card className="bg-gradient-savings border-0">
        <CardContent className="p-4 text-center">
          <p className="text-sm text-savings-foreground/80">Kullanılabilir Birikim Fonu</p>
          <p className="text-2xl font-bold text-savings-foreground">
            {formatCurrency(availableSavingsFund)}
          </p>
        </CardContent>
      </Card>

      {/* Add Saving Goal Form */}
      <Card>
        <CardContent className="p-4">
          <div className="space-y-3">
            <Input
              placeholder="Hedef adı (ev, araba, tatil vb.)"
              value={savingForm.title}
              onChange={(e) => setSavingForm(prev => ({ ...prev, title: e.target.value }))}
            />
            <div className="grid grid-cols-3 gap-2">
              <Select
                value={savingForm.currency}
                onValueChange={(value) => setSavingForm(prev => ({ ...prev, currency: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Para birimi" />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((currency) => (
                    <SelectItem key={currency.code} value={currency.code}>
                      {currency.flag} {currency.code} - {currency.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="number"
                placeholder={`Hedef tutar (${savingForm.currency === 'TRY' ? '₺' : CURRENCIES.find(c => c.code === savingForm.currency)?.symbol || ''})`}
                value={savingForm.targetAmount}
                onChange={(e) => setSavingForm(prev => ({ ...prev, targetAmount: e.target.value }))}
              />
              <Select
                value={savingForm.category}
                onValueChange={(value) => setSavingForm(prev => ({ ...prev, category: value as SavingGoal['category'] }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Kategori" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="house">🏠 Ev</SelectItem>
                  <SelectItem value="car">🚗 Araba</SelectItem>
                  <SelectItem value="vacation">🏖️ Tatil</SelectItem>
                  <SelectItem value="education">📚 Eğitim</SelectItem>
                  <SelectItem value="gold">🟡 Altın</SelectItem>
                  <SelectItem value="other">💰 Diğer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {savingForm.currency !== 'TRY' && savingForm.targetAmount && (
              <div className="text-sm text-muted-foreground bg-muted/50 p-2 rounded">
                TRY karşılığı: {formatCurrency(convertToTRY(parseFloat(savingForm.targetAmount), savingForm.currency))}
              </div>
            )}
            <div className="flex gap-2">
              <Input
                type="date"
                value={savingForm.deadline}
                onChange={(e) => setSavingForm(prev => ({ ...prev, deadline: e.target.value }))}
              />
              <Button onClick={handleAddSavingGoal}>
                <PlusCircle className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Saving Goals Accordion */}
      {savingGoals.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          Henüz birikim hedefi eklenmemiş
        </div>
      ) : (
        <Accordion type="multiple" className="space-y-4">
          {savingGoals.map((goal, index) => {
            const progress = (goal.currentAmount / goal.targetAmount) * 100;
            const remaining = goal.targetAmount - goal.currentAmount;
            const isCompleted = progress >= 100;
            const daysLeft = getDaysUntilDue(goal.deadline);
            
            let isWarning = false;
            let warningText = '';
            
            if (!isCompleted) {
              if (daysLeft < 0) {
                isWarning = true;
                warningText = `${Math.abs(daysLeft)} gün gecikmiş!`;
              } else if (daysLeft === 0) {
                isWarning = true;
                warningText = 'Son gün!';
              } else if (daysLeft <= 30) {
                isWarning = true;
                warningText = `${daysLeft} gün kaldı!`;
              }
            }

            const contributions = savingContributionsByGoal[goal.id] || [];
            
            return (
              <AccordionItem key={goal.id} value={goal.id} className={`
                border-2 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300
                ${isWarning 
                  ? 'border-warning border-warning/80 bg-gradient-to-br from-warning/15 to-warning/5 shadow-warning/30' 
                  : index % 2 === 0 
                    ? 'border-savings border-savings/40 bg-gradient-to-br from-card to-muted/30 shadow-savings/10' 
                    : 'border-secondary border-secondary/40 bg-gradient-to-br from-muted/50 to-card shadow-secondary/10'
                } 
                overflow-hidden mb-4 backdrop-blur-sm
              `}>
                <AccordionTrigger className="hover:no-underline p-0">
                  <div className="w-full">
                    {/* Header with goal name */}
                    <div className="bg-muted/30 px-4 py-2 border-b">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`text-xs px-2 py-1 rounded-full ${
                            index === 0 ? 'bg-savings text-savings-foreground' : 
                            index === 1 ? 'bg-secondary text-secondary-foreground' :
                            'bg-muted text-muted-foreground'
                          }`}>
                            {index === 0 ? '🎯 #1' : `#${index + 1}`}
                          </div>
                          <div className="text-2xl">
                            {getCategoryEmoji(goal.category)}
                          </div>
                          <h3 className="font-semibold text-foreground">{goal.title}</h3>
                        </div>
                        {isWarning && (
                          <Badge variant="destructive" className="text-xs">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            {warningText}
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    {/* Content with progress and action */}
                    <div className="px-4 py-3">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-4">
                            <div className="text-sm">
                              <span className="text-muted-foreground">Kalan:</span>
                              <span className="font-bold text-warning ml-1">
                                {formatCurrency(goal.targetAmount - goal.currentAmount)}
                              </span>
                            </div>
                            <div className="flex-1 max-w-32">
                              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                                <span>{progress.toFixed(0)}%</span>
                              </div>
                              <Progress value={Math.min(progress, 100)} className="h-1.5" />
                            </div>
                          </div>
                        </div>
                        
                        <div className="ml-4">
                          {isCompleted ? (
                            <Badge className="bg-income text-income-foreground">
                              ✅ Tamamlandı
                            </Badge>
                          ) : (
                            <div 
                              onClick={(e) => {
                                e.stopPropagation();
                                const defaultAmount = Math.min(500, Math.ceil(goal.targetAmount * 0.05));
                                handleAddSavingAmount(goal.id, defaultAmount);
                              }} 
                              className="px-3 py-1.5 text-sm font-medium rounded-md bg-savings text-savings-foreground hover:bg-savings/90 cursor-pointer transition-colors"
                            >
                              + Ekle
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </AccordionTrigger>
                
                <AccordionContent className="px-4 pb-4">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>İlerleme ({progress.toFixed(0)}%)</span>
                        <span>
                          {formatCurrency(goal.currentAmount)} / {formatCurrency(goal.targetAmount)}
                          {goal.currency && goal.currency !== 'TRY' && goal.originalAmount && (
                            <div className="text-xs text-muted-foreground">
                              {formatAmount(goal.originalAmount, goal.currency)}
                            </div>
                          )}
                        </span>
                      </div>
                      <Progress value={Math.min(progress, 100)} className="h-2" />
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Hedef Tarih</p>
                        <p className="font-medium">{formatDate(goal.deadline)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Kategori</p>
                        <p className="font-medium capitalize">{goal.category}</p>
                      </div>
                    </div>

                    {!isCompleted && (
                      <div className="space-y-3">
                        <div className="flex gap-2">
                          <Input
                            placeholder="Katkı miktarı girin"
                            type="number"
                            value={savingContributionForms[goal.id] || ''}
                            onChange={(e) => setSavingContributionForms(prev => ({ ...prev, [goal.id]: e.target.value }))}
                            className="flex-1"
                          />
                          <Button 
                            onClick={() => {
                              const amount = parseFloat(savingContributionForms[goal.id] || '0');
                              if (amount > 0) {
                                handleAddSavingAmount(goal.id, amount);
                                setSavingContributionForms(prev => ({ ...prev, [goal.id]: '' }));
                              }
                            }} 
                            size="sm"
                            disabled={!savingContributionForms[goal.id] || parseFloat(savingContributionForms[goal.id] || '0') <= 0}
                            className="bg-savings text-savings-foreground hover:bg-savings/90"
                          >
                            <Target className="w-3 h-3 mr-1" />
                            Ekle
                          </Button>
                        </div>
                      </div>
                    )}

                    {contributions.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium">
                          Katkı Geçmişi ({contributions.length} katkı)
                        </p>
                        <div className="space-y-1 max-h-32 overflow-y-auto">
                          {contributions.map((contribution) => (
                            <div key={contribution.id} className="flex justify-between items-center text-xs bg-savings/10 p-2 rounded">
                              <div className="flex items-center gap-2">
                                <Target className="w-3 h-3 text-savings" />
                                <span className="font-medium">{formatCurrency(contribution.amount)}</span>
                                <span className="text-muted-foreground">
                                  {new Date(contribution.date).toLocaleDateString('tr-TR')}
                                </span>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteSavingContribution(contribution.id, goal.id, contribution.amount);
                                }}
                                className="h-6 w-6 p-0 hover:bg-destructive/10 hover:text-destructive"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2 pt-2 border-t">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteSavingGoal(goal.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Hedefi Sil
                      </Button>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      )}
    </div>
  );

  const renderExpenses = () => {
    // Get all unique categories from expenses
    const allCategories = Array.from(new Set(expenses.map(e => e.category || 'other')));
    
    // Pre-defined category mappings
    const predefinedCategories = {
      food: { name: '🍽️ Yemek', expenses: [] as any[] },
      transport: { name: '🚗 Ulaşım', expenses: [] as any[] },
      shopping: { name: '🛒 Alışveriş', expenses: [] as any[] },
      utilities: { name: '⚡ Faturalar', expenses: [] as any[] },
      health: { name: '🏥 Sağlık', expenses: [] as any[] },
      entertainment: { name: '🎬 Eğlence', expenses: [] as any[] },
      education: { name: '📚 Eğitim', expenses: [] as any[] },
      children: { name: '👶 Çocuk Masrafları', expenses: [] as any[] },
      clothing: { name: '👕 Giyim', expenses: [] as any[] },
      other: { name: '📋 Diğer', expenses: [] as any[] }
    };

    // Create expense categories object including custom ones
    const expenseCategories = { ...predefinedCategories };
    
    // Add custom categories
    allCategories.forEach(category => {
      if (!expenseCategories[category as keyof typeof expenseCategories]) {
        expenseCategories[category as keyof typeof expenseCategories] = {
          name: `📂 ${category.charAt(0).toUpperCase() + category.slice(1)}`,
          expenses: []
        };
      }
    });

    // Group expenses into categories
    expenses.forEach(expense => {
      const category = expense.category || 'other';
      if (expenseCategories[category as keyof typeof expenseCategories]) {
        expenseCategories[category as keyof typeof expenseCategories].expenses.push(expense);
      }
    });

    // Filter out categories with no expenses
    const categoriesWithExpenses = Object.entries(expenseCategories)
      .filter(([_, data]) => data.expenses.length > 0)
      .sort(([_, a], [__, b]) => {
        const totalA = a.expenses.reduce((sum, exp) => sum + exp.amount, 0);
        const totalB = b.expenses.reduce((sum, exp) => sum + exp.amount, 0);
        return totalB - totalA; // Sort by total amount descending
      });

    return (
      <div className="space-y-4">
        {/* Available Living Expenses Fund */}
        <Card className="bg-gradient-to-b from-orange-500/20 to-orange-500/5 border border-orange-500/20">
          <CardContent className="p-4 text-center">
            <p className="text-sm text-orange-700 dark:text-orange-300/80">Kullanılabilir Yaşam Masrafları Fonu</p>
            <p className="text-2xl font-bold text-orange-800 dark:text-orange-300">
              {formatCurrency(availableLivingExpensesFund)}
            </p>
            <p className="text-xs text-orange-600 dark:text-orange-400/80 mt-1">
              %{settings.livingExpensesPercentage} - Toplam: {formatCurrency(livingExpensesFund)}
            </p>
          </CardContent>
        </Card>

        {/* Add Expense Form */}
        <Card>
          <CardContent className="p-4">
            <div className="space-y-3">
              <Input
                placeholder="Gider açıklaması"
                value={expenseForm.description}
                onChange={(e) => setExpenseForm(prev => ({ ...prev, description: e.target.value }))}
              />
              <div className="grid grid-cols-3 gap-2">
                <Input
                  type="number"
                  placeholder="Tutar"
                  value={expenseForm.amount}
                  onChange={(e) => setExpenseForm(prev => ({ ...prev, amount: e.target.value }))}
                />
                <div className="relative">
                  <Select
                    value={expenseForm.category === '' ? 'custom' : expenseForm.category}
                    onValueChange={(value) => {
                      if (value === 'custom') {
                        setExpenseForm(prev => ({ ...prev, category: '' }));
                      } else {
                        setExpenseForm(prev => ({ ...prev, category: value }));
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Kategori" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="food">🍽️ Yemek</SelectItem>
                      <SelectItem value="transport">🚗 Ulaşım</SelectItem>
                      <SelectItem value="shopping">🛒 Alışveriş</SelectItem>
                      <SelectItem value="utilities">⚡ Faturalar</SelectItem>
                      <SelectItem value="health">🏥 Sağlık</SelectItem>
                      <SelectItem value="entertainment">🎬 Eğlence</SelectItem>
                      <SelectItem value="education">📚 Eğitim</SelectItem>
                      <SelectItem value="children">👶 Çocuk Masrafları</SelectItem>
                      <SelectItem value="clothing">👕 Giyim</SelectItem>
                      <SelectItem value="other">📋 Diğer</SelectItem>
                      <SelectItem value="custom">➕ Özel Kategori Ekle</SelectItem>
                      {expenseForm.category === '' && (
                        <div className="px-2 py-2">
                          <Input
                            placeholder="Kategori adı girin"
                            value={expenseForm.category}
                            onChange={(e) => setExpenseForm(prev => ({ ...prev, category: e.target.value }))}
                            className="w-full"
                            autoFocus
                          />
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <Input
                  type="date"
                  value={expenseForm.date}
                  onChange={(e) => setExpenseForm(prev => ({ ...prev, date: e.target.value }))}
                />
              </div>
              <Button onClick={handleAddExpense} className="w-full">
                <PlusCircle className="w-4 h-4 mr-2" />
                Gider Ekle
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Expenses by Category */}
        {expenses.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Receipt className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">Henüz gider eklenmedi</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            <h3 className="font-medium text-lg">Gider Kategorilerim</h3>
            <div className="space-y-3">
              {categoriesWithExpenses.map(([categoryKey, categoryData]) => {
                const totalAmount = categoryData.expenses.reduce((sum, expense) => sum + expense.amount, 0);
                
                return (
                  <Card key={categoryKey} className="border-2 border-orange-500/30 hover:border-orange-500/50 transition-colors">
                    <Accordion type="multiple" className="w-full">
                      <AccordionItem value={categoryKey} className="border-none">
                        <AccordionTrigger className="px-6 py-4 hover:no-underline">
                          <div className="flex items-center justify-between w-full">
                            <div className="flex items-center gap-4">
                              <div className="text-2xl">{categoryData.name.split(' ')[0]}</div>
                              <div>
                                <h3 className="font-semibold text-lg text-left">{categoryData.name.substring(2)}</h3>
                                <p className="text-sm text-muted-foreground text-left">
                                  {categoryData.expenses.length} adet gider
                                </p>
                              </div>
                            </div>
                            <div className="text-right mr-4">
                              <div className="text-xl font-bold text-orange-600 dark:text-orange-400">
                                -{formatCurrency(totalAmount)}
                              </div>
                              <p className="text-xs text-muted-foreground">
                                Toplam harcama
                              </p>
                            </div>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-6 pb-3">
                          <div className="space-y-2 border-t border-orange-500/20 pt-3">
                            {categoryData.expenses
                              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                              .map((expense, index) => (
                                <div key={expense.id} className="bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-950/30 dark:to-orange-900/20 rounded-lg p-3 border border-orange-200/50 dark:border-orange-800/30">
                                  <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-1">
                                        <span className="text-xs text-muted-foreground">
                                          {formatDate(expense.date)}
                                        </span>
                                      </div>
                                      <h5 className="font-medium text-gray-800 dark:text-gray-200">
                                        {expense.description}
                                      </h5>
                                    </div>
                                    <div className="flex items-center gap-2 ml-4">
                                      <div className="text-right">
                                        <div className="text-lg font-bold text-orange-700 dark:text-orange-400">
                                          -{formatCurrency(expense.amount)}
                                        </div>
                                      </div>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => deleteExpense(expense.id)}
                                        className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  </Card>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };


  const renderSettings = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Bütçe Ayarları</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <Label>Borç Ödeme Oranı: %{settings.debtPercentage}</Label>
            <Slider
              value={[settings.debtPercentage]}
              onValueChange={([value]) => updateSettings({ debtPercentage: value })}
              max={100}
              step={5}
              className="w-full"
            />
            <p className="text-sm text-muted-foreground">
              Gelirinizin {formatCurrency((totalIncome * settings.debtPercentage) / 100)} tutarı borç ödemelerine ayrılacak
            </p>
          </div>

          <div className="space-y-3">
            <Label>Birikim Oranı: %{settings.savingsPercentage}</Label>
            <Slider
              value={[settings.savingsPercentage]}
              onValueChange={([value]) => updateSettings({ savingsPercentage: value })}
              max={100}
              step={5}
              className="w-full"
            />
            <p className="text-sm text-muted-foreground">
              Gelirinizin {formatCurrency((totalIncome * settings.savingsPercentage) / 100)} tutarı birikimlere ayrılacak
            </p>
          </div>

          <div className="space-y-3">
            <Label>Yaşam Masrafları Oranı: %{settings.livingExpensesPercentage}</Label>
            <Slider
              value={[settings.livingExpensesPercentage]}
              onValueChange={([value]) => updateSettings({ livingExpensesPercentage: value })}
              max={100}
              step={5}
              className="w-full"
            />
            <p className="text-sm text-muted-foreground">
              Gelirinizin {formatCurrency((totalIncome * settings.livingExpensesPercentage) / 100)} tutarı yaşam masraflarına ayrılacak
            </p>
          </div>

          <div className="space-y-3">
            <Label>Borç Ödeme Stratejisi</Label>
            <Select
              value={settings.debtStrategy}
              onValueChange={(value: 'snowball' | 'avalanche') => updateSettings({ debtStrategy: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="snowball">⚡ Kartopu Yöntemi (En küçük borçtan başla)</SelectItem>
                <SelectItem value="avalanche">🏔️ Çığ Yöntemi (En yüksek faizden başla)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              {settings.debtStrategy === 'snowball' 
                ? 'En küçük borçlardan başlayarak motivasyonu artırır'
                : 'En yüksek faizli borçlardan başlayarak toplam maliyeti azaltır'
              }
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tema Ayarları</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Button
              variant={theme === 'light' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTheme('light')}
            >
              <Sun className="w-4 h-4 mr-2" />
              Açık Tema
            </Button>
            <Button
              variant={theme === 'dark' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTheme('dark')}
            >
              <Moon className="w-4 h-4 mr-2" />
              Koyu Tema
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Hesap</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <User className="w-5 h-5" />
              <span>{user?.email}</span>
            </div>
            <Button variant="outline" onClick={signOut}>
              <LogOut className="w-4 h-4 mr-2" />
              Çıkış Yap
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  if (loading || dataLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border">
        <div className="max-w-md mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src={brandLogo} alt="Borç Yok" className="w-8 h-8" />
              <div>
                <h1 className="font-bold text-lg">Borç Yok</h1>
                <p className="text-xs text-muted-foreground">Finansal Özgürlük</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="pb-20">
        <div className="max-w-md mx-auto px-4 py-6">
          {activeTab === 'dashboard' && renderDashboard()}
          {activeTab === 'incomes' && renderIncomes()}
          {activeTab === 'debts' && renderDebts()}
          {activeTab === 'saving-goals' && renderSavingGoals()}
          {activeTab === 'expenses' && renderExpenses()}
          {activeTab === 'transfers' && (
            <FundTransfer 
              settings={settings} 
              transfers={transfers}
              availableDebtFund={availableDebtFund}
              availableSavingsFund={availableSavingsFund}
              availableLivingExpensesFund={availableLivingExpensesFund}
              onTransfer={transferFunds}
              onDeleteTransfer={deleteTransfer}
            />
          )}
          
          {activeTab === 'settings' && renderSettings()}
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border">
        <div className="max-w-md mx-auto px-4 py-2">
          <div className="flex justify-around">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex flex-col items-center justify-center gap-1 ${
                activeTab === 'dashboard' ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              <Home className="w-5 h-5" />
              <span className="text-xs">Anasayfa</span>
            </button>
            <button
              onClick={() => setActiveTab('incomes')}
              className={`flex flex-col items-center justify-center gap-1 ${
                activeTab === 'incomes' ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              <TrendingUp className="w-5 h-5" />
              <span className="text-xs">Gelirler</span>
            </button>
            <button
              onClick={() => setActiveTab('debts')}
              className={`flex flex-col items-center justify-center gap-1 ${
                activeTab === 'debts' ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              <Target className="w-5 h-5" />
              <span className="text-xs">Borçlar</span>
            </button>
            <button
              onClick={() => setActiveTab('saving-goals')}
              className={`flex flex-col items-center justify-center gap-1 ${
                activeTab === 'saving-goals' ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              <Wallet className="w-5 h-5" />
              <span className="text-xs">Birikimler</span>
            </button>
            <button
              onClick={() => setActiveTab('expenses')}
              className={`flex flex-col items-center justify-center gap-1 ${
                activeTab === 'expenses' ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              <Receipt className="w-5 h-5" />
              <span className="text-xs">Giderler</span>
            </button>
            <button
              onClick={() => setActiveTab('transfers')}
              className={`flex flex-col items-center justify-center gap-1 ${
                activeTab === 'transfers' ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              <ArrowLeftRight className="w-5 h-5" />
              <span className="text-xs">Transfer</span>
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`flex flex-col items-center justify-center gap-1 ${
                activeTab === 'settings' ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              <Settings className="w-5 h-5" />
              <span className="text-xs">Ayarlar</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  if (loading || dataLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Yükleniyor...</p>
        </div>
      </div>
    );
  }
};

export default BudgetApp;