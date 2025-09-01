import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useFinancialData } from '@/hooks/useFinancialData';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { FinancialHealthScore } from '@/components/FinancialHealthScore';
import { AchievementBadges } from '@/components/AchievementBadges';
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
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useTheme } from "next-themes";
import { formatCurrency, formatDate, getDaysUntilDue } from '@/lib/utils';
import { useCurrency, CURRENCIES } from '@/hooks/useCurrency';
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
  CreditCard,
  Building2,
  FileText,
  ShoppingCart,
  Receipt,
  Edit,
  ArrowLeftRight
} from 'lucide-react';

import brandLogo from '@/assets/borc-yok-logo-1.png';

// TypeScript Interface Definitions
interface Income {
  id: string;
  description: string;
  amount: number;
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
    refreshData
  } = useFinancialData();

  // Giriş yapılmadıysa auth sayfasına yönlendir
  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  const [activeTab, setActiveTab] = useState<'dashboard' | 'incomes' | 'debts' | 'saving-goals' | 'transfers' | 'settings'>('dashboard');
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
  const [incomeForm, setIncomeForm] = useState({ description: '', amount: '', category: '', monthlyRepeat: false, date: new Date().toISOString().split('T')[0] });
  const [debtForm, setDebtForm] = useState({ description: '', amount: '', dueDate: '', installmentCount: '', monthlyRepeat: false, category: 'other' as Debt['category'], currency: 'TRY' });
  const [savingForm, setSavingForm] = useState({ 
    title: '', 
    targetAmount: '', 
    category: 'other' as SavingGoal['category'],
    deadline: ''
  });
  const [paymentForms, setPaymentForms] = useState<{[key: string]: string}>({});
  
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
      await addIncome({
        description: incomeForm.description,
        amount: parseFloat(incomeForm.amount),
        date: incomeForm.date,
        category: incomeForm.category,
        monthlyRepeat: incomeForm.monthlyRepeat,
        nextIncomeDate: incomeForm.monthlyRepeat ? 
          new Date(new Date(incomeForm.date).setMonth(new Date(incomeForm.date).getMonth() + 1)).toISOString() : 
          undefined
      });
      
      setIncomeForm({ description: '', amount: '', category: '', monthlyRepeat: false, date: new Date().toISOString().split('T')[0] });
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
      await addSavingGoal({
        title: savingForm.title,
        category: savingForm.category,
        targetAmount: parseFloat(savingForm.targetAmount),
        currentAmount: 0,
        deadline: savingForm.deadline
      });
      
      setSavingForm({ title: '', targetAmount: '', category: 'house', deadline: '' });
      toast({ title: "Başarılı", description: "Birikim hedefi eklendi" });
    } catch (error) {
      toast({ title: "Hata", description: "Birikim hedefi eklenirken hata oluştu", variant: "destructive" });
    }
  };

  const handleAddSavingAmount = async (goalId: string, amount: number) => {
    try {
      const goal = savingGoals.find(g => g.id === goalId);
      if (!goal) return;
      
      const newCurrentAmount = goal.currentAmount + amount;
      await updateSavingGoal(goalId, { currentAmount: newCurrentAmount });
      toast({ title: "Başarılı", description: `${formatCurrency(amount)} eklendi` });
    } catch (error) {
      toast({ title: "Hata", description: "Tutar eklenirken hata oluştu", variant: "destructive" });
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
  const debtFund = (totalIncome * settings.debtPercentage) / 100;
  const savingsFund = (totalIncome * settings.savingsPercentage) / 100;
  const usedDebtFund = debts.reduce((sum, debt) => 
    sum + debt.payments.reduce((paySum, payment) => paySum + payment.amount, 0), 0
  );
  const usedSavingsFund = savingGoals.reduce((sum, goal) => sum + goal.currentAmount, 0);
  const availableDebtFund = Math.max(0, debtFund - usedDebtFund);
  const availableSavingsFund = Math.max(0, savingsFund - usedSavingsFund);

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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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

      {/* Financial Health Score */}
      <FinancialHealthScore data={{
        totalIncome,
        totalDebtRemaining: debts.reduce((sum, debt) => {
          const totalPaid = debt.payments.reduce((sum, payment) => sum + payment.amount, 0);
          return sum + Math.max(0, debt.totalAmount - totalPaid);
        }, 0),
        totalSavings: usedSavingsFund,
        monthlyExpenses: totalIncome * 0.6,
        emergencyFund: usedSavingsFund * 0.3
      }} />

      {/* Achievement Badges */}
      <AchievementBadges data={{
        totalIncome,
        totalDebtRemaining: debts.reduce((sum, debt) => {
          const totalPaid = debt.payments.reduce((sum, payment) => sum + payment.amount, 0);
          return sum + Math.max(0, debt.totalAmount - totalPaid);
        }, 0),
        totalSavings: usedSavingsFund,
        completedGoals: savingGoals.filter(goal => goal.currentAmount >= goal.targetAmount).length,
        totalGoals: savingGoals.length,
        monthsTracking: 1
      }} />
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

          <Card className="bg-gradient-to-b from-primary/20 to-primary/5 border border-primary/20">
            <CardContent className="p-3 text-center">
              <p className="text-xs text-primary/80">Kalan Harcanabilir</p>
              <p className="text-sm font-bold text-primary">%{100 - settings.debtPercentage - settings.savingsPercentage}</p>
              <p className="text-xs text-primary/60">
                {formatCurrency(totalIncome - (totalIncome * settings.debtPercentage) / 100 - (totalIncome * settings.savingsPercentage) / 100)}
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
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="number"
                placeholder="Tutar (₺)"
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
                  <SelectItem value="other">📋 Diğer</SelectItem>
                </SelectContent>
              </Select>
            </div>
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

      {/* Income List */}
      {incomes.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          Henüz gelir eklenmemiş
        </div>
      ) : (
        <div className="space-y-2">
          {incomes.map((income) => (
            <Card key={income.id} className="border border-income/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">{income.description}</h3>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(income.date)} • {income.category}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-income">
                      {formatCurrency(income.amount)}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteIncome(income.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
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
              <Input
                placeholder="Borç açıklaması"
                value={debtForm.description}
                onChange={(e) => setDebtForm(prev => ({ ...prev, description: e.target.value }))}
              />
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
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="number"
                placeholder="Hedef tutar (₺)"
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
                  <SelectItem value="other">💰 Diğer</SelectItem>
                </SelectContent>
              </Select>
            </div>
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

      {/* Saving Goals List */}
      {savingGoals.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          Henüz birikim hedefi eklenmemiş
        </div>
      ) : (
        <div className="space-y-4">
          {savingGoals.map((goal) => {
            const progress = (goal.currentAmount / goal.targetAmount) * 100;
            const isCompleted = progress >= 100;
            
            return (
              <Card key={goal.id} className="border border-savings/20">
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="text-2xl">
                          {getCategoryEmoji(goal.category)}
                        </div>
                        <div>
                          <h3 className="font-medium">{goal.title}</h3>
                          <p className="text-sm text-muted-foreground">
                            Son tarih: {formatDate(goal.deadline)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-savings">
                          {formatCurrency(goal.currentAmount)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          / {formatCurrency(goal.targetAmount)}
                        </p>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>İlerleme ({progress.toFixed(0)}%)</span>
                        <span>
                          {isCompleted ? '✅ Tamamlandı!' : `${formatCurrency(goal.targetAmount - goal.currentAmount)} kaldı`}
                        </span>
                      </div>
                      <Progress value={Math.min(progress, 100)} className="h-2" />
                    </div>

                    {!isCompleted && (
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          placeholder="Eklenecek tutar"
                          className="flex-1"
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              const amount = parseFloat((e.target as HTMLInputElement).value);
                              if (amount > 0) {
                                handleAddSavingAmount(goal.id, amount);
                                (e.target as HTMLInputElement).value = '';
                              }
                            }
                          }}
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteSavingGoal(goal.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );

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
          {activeTab === 'transfers' && (
            <FundTransfer 
              settings={{...settings, balance: totalIncome - (totalIncome * settings.debtPercentage) / 100 - (totalIncome * settings.savingsPercentage) / 100}} 
              transfers={transfers}
              availableDebtFund={availableDebtFund}
              availableSavingsFund={availableSavingsFund}
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
};

export default BudgetApp;