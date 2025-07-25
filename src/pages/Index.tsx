import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/hooks/use-toast';
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
  DollarSign
} from 'lucide-react';

// TypeScript Interface Definitions
interface Income {
  id: string;
  description: string;
  amount: number;
  date: string;
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
  dueDate: string;
  installmentCount: number;
  payments: Payment[];
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
}

// Utility Functions
const formatCurrency = (amount: number): string => {
  const formatted = new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
  return formatted.replace('₺', '').trim() + ' ₺';
};

const formatDate = (dateString: string): string => {
  if (!dateString) return 'Tarih Yok';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Geçersiz Tarih';
    return date.toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  } catch {
    return 'Tarih Hatası';
  }
};

const getDaysUntilDue = (dueDate: string): number => {
  if (!dueDate) return Infinity;
  try {
    const due = new Date(dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    due.setHours(0, 0, 0, 0);
    const diffTime = due.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  } catch {
    return Infinity;
  }
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

const BudgetApp = () => {
  // State Management
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [savingGoals, setSavingGoals] = useState<SavingGoal[]>([]);
  const [settings, setSettings] = useState<Settings>({ debtPercentage: 30, savingsPercentage: 20 });
  const [activeTab, setActiveTab] = useState('dashboard');
  const { toast } = useToast();

  // Form States
  const [incomeForm, setIncomeForm] = useState({ description: '', amount: '' });
  const [debtForm, setDebtForm] = useState({ description: '', amount: '', dueDate: '', installmentCount: '' });
  const [savingForm, setSavingForm] = useState({ 
    title: '', 
    targetAmount: '', 
    category: 'other' as SavingGoal['category'],
    deadline: ''
  });
  const [paymentForms, setPaymentForms] = useState<{[key: string]: string}>({});

  // Local Storage Functions
  const saveToStorage = (key: string, data: any) => {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.error('Storage error:', error);
    }
  };

  const loadFromStorage = (key: string, defaultValue: any) => {
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : defaultValue;
    } catch (error) {
      console.error('Storage error:', error);
      return defaultValue;
    }
  };

  // Load data on mount
  useEffect(() => {
    setIncomes(loadFromStorage('budgetApp_incomes', []));
    setDebts(loadFromStorage('budgetApp_debts', []));
    setSavingGoals(loadFromStorage('budgetApp_savingGoals', []));
    setSettings(loadFromStorage('budgetApp_settings', { debtPercentage: 30, savingsPercentage: 20 }));
  }, []);

  // Save data when state changes
  useEffect(() => { saveToStorage('budgetApp_incomes', incomes); }, [incomes]);
  useEffect(() => { saveToStorage('budgetApp_debts', debts); }, [debts]);
  useEffect(() => { saveToStorage('budgetApp_savingGoals', savingGoals); }, [savingGoals]);
  useEffect(() => { saveToStorage('budgetApp_settings', settings); }, [settings]);

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

  // Income Functions
  const addIncome = () => {
    if (!incomeForm.description.trim() || !incomeForm.amount) {
      toast({ title: "Hata", description: "Lütfen tüm alanları doldurun", variant: "destructive" });
      return;
    }

    const newIncome: Income = {
      id: Date.now().toString(),
      description: incomeForm.description.trim(),
      amount: parseFloat(incomeForm.amount),
      date: new Date().toISOString()
    };

    setIncomes(prev => [newIncome, ...prev]);
    setIncomeForm({ description: '', amount: '' });
    toast({ title: "Başarılı", description: "Gelir eklendi" });
  };

  const deleteIncome = (id: string) => {
    setIncomes(prev => prev.filter(income => income.id !== id));
    toast({ title: "Başarılı", description: "Gelir silindi" });
  };

  // Debt Functions
  const addDebt = () => {
    if (!debtForm.description.trim() || !debtForm.amount || !debtForm.dueDate || !debtForm.installmentCount) {
      toast({ title: "Hata", description: "Lütfen tüm alanları doldurun", variant: "destructive" });
      return;
    }

    const installmentCount = parseInt(debtForm.installmentCount);
    if (installmentCount <= 0) {
      toast({ title: "Hata", description: "Taksit sayısı 0'dan büyük olmalı", variant: "destructive" });
      return;
    }

    const newDebt: Debt = {
      id: Date.now().toString(),
      description: debtForm.description.trim(),
      totalAmount: parseFloat(debtForm.amount),
      dueDate: debtForm.dueDate,
      installmentCount: installmentCount,
      payments: []
    };

    setDebts(prev => [newDebt, ...prev]);
    
    // Otomatik taksit dağıtımı
    autoDistributeInstallments(newDebt);
    
    setDebtForm({ description: '', amount: '', dueDate: '', installmentCount: '' });
    toast({ title: "Başarılı", description: "Borç eklendi ve taksitler dağıtıldı" });
  };

  // Otomatik taksit dağıtımı
  const autoDistributeInstallments = (debt: Debt) => {
    const installmentAmount = Math.floor(debt.totalAmount / debt.installmentCount);
    const remainingAmount = debt.totalAmount - (installmentAmount * debt.installmentCount);
    
    const payments: Payment[] = [];
    
    for (let i = 0; i < debt.installmentCount; i++) {
      let amount = installmentAmount;
      // Son taksitte kalan tutarı ekle
      if (i === debt.installmentCount - 1) {
        amount += remainingAmount;
      }
      
      if (amount > availableDebtFund) {
        toast({ 
          title: "Uyarı", 
          description: `Taksit ${i + 1} için borç fonu yetersiz`, 
          variant: "destructive" 
        });
        break;
      }
      
      const payment: Payment = {
        id: `${Date.now()}-${i}`,
        amount: amount,
        date: new Date().toISOString()
      };
      
      payments.push(payment);
    }
    
    if (payments.length > 0) {
      setDebts(prev => prev.map(d => 
        d.id === debt.id 
          ? { ...d, payments: payments }
          : d
      ));
    }
  };

  const addPayment = (debtId: string) => {
    const amount = parseFloat(paymentForms[debtId] || '0');
    if (!amount || amount <= 0) {
      toast({ title: "Hata", description: "Geçerli bir tutar girin", variant: "destructive" });
      return;
    }

    if (amount > availableDebtFund) {
      toast({ title: "Hata", description: "Borç fonu yetersiz", variant: "destructive" });
      return;
    }

    const debt = debts.find(d => d.id === debtId);
    if (!debt) return;

    const totalPaid = debt.payments.reduce((sum, payment) => sum + payment.amount, 0);
    if (totalPaid + amount > debt.totalAmount) {
      toast({ title: "Hata", description: "Borç tutarından fazla ödeme yapılamaz", variant: "destructive" });
      return;
    }

    const newPayment: Payment = {
      id: Date.now().toString(),
      amount,
      date: new Date().toISOString()
    };

    setDebts(prev => prev.map(d => 
      d.id === debtId 
        ? { ...d, payments: [newPayment, ...d.payments] }
        : d
    ));

    setPaymentForms(prev => ({ ...prev, [debtId]: '' }));
    toast({ title: "Başarılı", description: "Ödeme eklendi" });
  };

  const deletePayment = (debtId: string, paymentId: string) => {
    setDebts(prev => prev.map(debt =>
      debt.id === debtId
        ? { ...debt, payments: debt.payments.filter(p => p.id !== paymentId) }
        : debt
    ));
    toast({ title: "Başarılı", description: "Ödeme silindi" });
  };

  const deleteDebt = (id: string) => {
    setDebts(prev => prev.filter(debt => debt.id !== id));
    toast({ title: "Başarılı", description: "Borç silindi" });
  };

  // Saving Goal Functions
  const addSavingGoal = () => {
    if (!savingForm.title.trim() || !savingForm.targetAmount || !savingForm.deadline) {
      toast({ title: "Hata", description: "Lütfen tüm alanları doldurun", variant: "destructive" });
      return;
    }

    const newGoal: SavingGoal = {
      id: Date.now().toString(),
      title: savingForm.title.trim(),
      targetAmount: parseFloat(savingForm.targetAmount),
      currentAmount: 0,
      category: savingForm.category,
      deadline: savingForm.deadline
    };

    setSavingGoals(prev => [newGoal, ...prev]);
    setSavingForm({ title: '', targetAmount: '', category: 'other', deadline: '' });
    toast({ title: "Başarılı", description: "Hedef eklendi" });
  };

  const addSavingAmount = (goalId: string, amount: number) => {
    if (amount > availableSavingsFund) {
      toast({ title: "Hata", description: "Birikim fonu yetersiz", variant: "destructive" });
      return;
    }

    setSavingGoals(prev => prev.map(goal =>
      goal.id === goalId
        ? { ...goal, currentAmount: Math.min(goal.currentAmount + amount, goal.targetAmount) }
        : goal
    ));

    toast({ title: "Başarılı", description: "Birikim eklendi" });
  };

  const deleteSavingGoal = (id: string) => {
    setSavingGoals(prev => prev.filter(goal => goal.id !== id));
    toast({ title: "Başarılı", description: "Hedef silindi" });
  };

  // Render Functions
  const renderDashboard = () => (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-income border-income/20 shadow-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-income-foreground flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Toplam Gelir
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-income-foreground mb-2">
              {formatCurrency(totalIncome)}
            </div>
            <div className="text-sm text-income-foreground/80">
              {incomes.length} gelir kaydı
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-expense border-expense/20 shadow-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-expense-foreground flex items-center gap-2">
              <Target className="w-5 h-5" />
              Borç Fonu
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-expense-foreground mb-2">
              {formatCurrency(availableDebtFund)}
            </div>
            <div className="text-sm text-expense-foreground/80">
              %{settings.debtPercentage} • {formatCurrency(debtFund)} toplam
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-savings border-savings/20 shadow-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-savings-foreground flex items-center gap-2">
              <Wallet className="w-5 h-5" />
              Birikim Fonu
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-savings-foreground mb-2">
              {formatCurrency(availableSavingsFund)}
            </div>
            <div className="text-sm text-savings-foreground/80">
              %{settings.savingsPercentage} • {formatCurrency(savingsFund)} toplam
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-gradient-card shadow-card">
          <CardHeader>
            <CardTitle className="text-foreground">Borç Durumu</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {debts.length === 0 ? (
              <p className="text-muted-foreground">Henüz borç eklenmemiş</p>
            ) : (
              debts.slice(0, 3).map((debt) => {
                const totalPaid = debt.payments.reduce((sum, p) => sum + p.amount, 0);
                const progress = (totalPaid / debt.totalAmount) * 100;
                const daysLeft = getDaysUntilDue(debt.dueDate);
                
                return (
                  <div key={debt.id} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium truncate">{debt.description}</span>
                      {daysLeft <= 3 && daysLeft >= 0 && (
                        <Badge variant={daysLeft === 0 ? "destructive" : "secondary"} className="text-xs">
                          {daysLeft === 0 ? "Bugün" : `${daysLeft} gün`}
                        </Badge>
                      )}
                    </div>
                    <Progress value={progress} className="h-2" />
                    <div className="text-xs text-muted-foreground">
                      {formatCurrency(totalPaid)} / {formatCurrency(debt.totalAmount)}
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card className="bg-gradient-card shadow-card">
          <CardHeader>
            <CardTitle className="text-foreground">Birikim Hedefleri</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {savingGoals.length === 0 ? (
              <p className="text-muted-foreground">Henüz hedef eklenmemiş</p>
            ) : (
              savingGoals.slice(0, 3).map((goal) => {
                const progress = (goal.currentAmount / goal.targetAmount) * 100;
                
                return (
                  <div key={goal.id} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium truncate flex items-center gap-1">
                        <span>{getCategoryEmoji(goal.category)}</span>
                        {goal.title}
                      </span>
                      {progress >= 100 && (
                        <Badge className="text-xs bg-income text-income-foreground">Tamamlandı!</Badge>
                      )}
                    </div>
                    <Progress value={Math.min(progress, 100)} className="h-2" />
                    <div className="text-xs text-muted-foreground">
                      {formatCurrency(goal.currentAmount)} / {formatCurrency(goal.targetAmount)}
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderIncomes = () => (
    <div className="space-y-6">
      {/* Add Income Form */}
      <Card className="bg-gradient-card shadow-card">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            <PlusCircle className="w-5 h-5" />
            Yeni Gelir Ekle
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="income-description">Açıklama</Label>
            <Input
              id="income-description"
              placeholder="Maaş, freelance vb."
              value={incomeForm.description}
              onChange={(e) => setIncomeForm(prev => ({ ...prev, description: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="income-amount">Tutar (₺)</Label>
            <Input
              id="income-amount"
              type="number"
              placeholder="0"
              value={incomeForm.amount}
              onChange={(e) => setIncomeForm(prev => ({ ...prev, amount: e.target.value }))}
            />
          </div>
          <Button onClick={addIncome} className="w-full">
            Gelir Ekle
          </Button>
        </CardContent>
      </Card>

      {/* Income List */}
      <Card className="bg-gradient-card shadow-card">
        <CardHeader>
          <CardTitle className="text-foreground">Gelir Listesi</CardTitle>
        </CardHeader>
        <CardContent>
          {incomes.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Henüz gelir eklenmemiş</p>
          ) : (
            <div className="space-y-3">
              {incomes.map((income) => (
                <div key={income.id} className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium">{income.description}</div>
                    <div className="text-sm text-muted-foreground flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      {formatDate(income.date)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-income">{formatCurrency(income.amount)}</div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteIncome(income.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  const renderDebts = () => (
    <div className="space-y-6">
      {/* Available Debt Fund */}
      <Card className="bg-gradient-expense border-expense/20 shadow-card">
        <CardContent className="pt-6">
          <div className="text-center">
            <div className="text-sm text-expense-foreground/80 mb-2">Kullanılabilir Borç Fonu</div>
            <div className="text-3xl font-bold text-expense-foreground">
              {formatCurrency(availableDebtFund)}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add Debt Form */}
      <Card className="bg-gradient-card shadow-card">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            <PlusCircle className="w-5 h-5" />
            Yeni Borç Ekle
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="debt-description">Açıklama</Label>
            <Input
              id="debt-description"
              placeholder="Kredi kartı, kişisel borç vb."
              value={debtForm.description}
              onChange={(e) => setDebtForm(prev => ({ ...prev, description: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="debt-amount">Tutar (₺)</Label>
            <Input
              id="debt-amount"
              type="number"
              placeholder="0"
              value={debtForm.amount}
              onChange={(e) => setDebtForm(prev => ({ ...prev, amount: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="debt-dueDate">Son Ödeme Tarihi</Label>
            <Input
              id="debt-dueDate"
              type="date"
              value={debtForm.dueDate}
              onChange={(e) => setDebtForm(prev => ({ ...prev, dueDate: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="debt-installmentCount">Taksit Sayısı</Label>
            <Input
              id="debt-installmentCount"
              type="number"
              placeholder="1"
              min="1"
              value={debtForm.installmentCount}
              onChange={(e) => setDebtForm(prev => ({ ...prev, installmentCount: e.target.value }))}
            />
          </div>
          <Button onClick={addDebt} className="w-full">
            Borç Ekle (Otomatik Taksitlendir)
          </Button>
        </CardContent>
      </Card>

      {/* Debt List */}
      <div className="space-y-4">
        {debts.map((debt) => {
          const totalPaid = debt.payments.reduce((sum, payment) => sum + payment.amount, 0);
          const remaining = debt.totalAmount - totalPaid;
          const progress = (totalPaid / debt.totalAmount) * 100;
          const daysLeft = getDaysUntilDue(debt.dueDate);
          
          let warningLevel = '';
          let warningText = '';
          
          if (daysLeft < 0) {
            warningLevel = 'destructive';
            warningText = `${Math.abs(daysLeft)} gün gecikmiş!`;
          } else if (daysLeft === 0) {
            warningLevel = 'destructive';
            warningText = 'Son gün!';
          } else if (daysLeft <= 3) {
            warningLevel = 'warning';
            warningText = `${daysLeft} gün kaldı!`;
          }

          return (
            <Card key={debt.id} className={`bg-gradient-card shadow-card ${warningLevel === 'destructive' ? 'border-destructive' : warningLevel === 'warning' ? 'border-warning' : ''}`}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-foreground">{debt.description}</CardTitle>
                    <div className="text-sm text-muted-foreground mt-1">
                      Son Ödeme: {formatDate(debt.dueDate)} • {debt.installmentCount} Taksit
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {warningText && (
                      <Badge variant={warningLevel as any} className="flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        {warningText}
                      </Badge>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteDebt(debt.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Progress */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>İlerleme</span>
                    <span>{progress.toFixed(1)}%</span>
                  </div>
                  <Progress value={progress} className="h-3" />
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Ödenen: {formatCurrency(totalPaid)}</span>
                    <span>Kalan: {formatCurrency(remaining)}</span>
                  </div>
                </div>

                {/* Add Payment */}
                {remaining > 0 && (
                  <div className="flex gap-2">
                    <Input
                      placeholder="Ödeme tutarı"
                      type="number"
                      value={paymentForms[debt.id] || ''}
                      onChange={(e) => setPaymentForms(prev => ({ ...prev, [debt.id]: e.target.value }))}
                    />
                    <Button onClick={() => addPayment(debt.id)}>
                      Öde
                    </Button>
                  </div>
                )}

                {progress >= 100 && (
                  <div className="text-center p-3 bg-income/20 rounded-lg">
                    <div className="text-income font-bold">🎉 Borç Tamamen Ödendi! 🎉</div>
                  </div>
                )}

                 {/* Payment History */}
                {debt.payments.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-sm font-medium">Taksit Listesi ({debt.payments.length}/{debt.installmentCount})</div>
                    {debt.payments.map((payment, index) => (
                      <div key={payment.id} className="flex justify-between items-center p-2 bg-secondary/30 rounded">
                        <div className="text-sm">
                          Taksit {index + 1}: {formatCurrency(payment.amount)} - {formatDate(payment.date)}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deletePayment(debt.id, payment.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {debts.length === 0 && (
        <Card className="bg-gradient-card shadow-card">
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground">Henüz borç eklenmemiş</p>
          </CardContent>
        </Card>
      )}
    </div>
  );

  const renderSavingGoals = () => (
    <div className="space-y-6">
      {/* Add Saving Goal Form */}
      <Card className="bg-gradient-card shadow-card">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            <Target className="w-5 h-5" />
            Yeni Birikim Hedefi Ekle
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="saving-title">Hedef Adı</Label>
            <Input
              id="saving-title"
              placeholder="Ev, araba, tatil vb."
              value={savingForm.title}
              onChange={(e) => setSavingForm(prev => ({ ...prev, title: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="saving-amount">Hedef Tutar (₺)</Label>
            <Input
              id="saving-amount"
              type="number"
              placeholder="0"
              value={savingForm.targetAmount}
              onChange={(e) => setSavingForm(prev => ({ ...prev, targetAmount: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="saving-category">Kategori</Label>
            <select
              id="saving-category"
              className="w-full p-2 border rounded-md bg-background"
              value={savingForm.category}
              onChange={(e) => setSavingForm(prev => ({ ...prev, category: e.target.value as SavingGoal['category'] }))}
            >
              <option value="house">🏠 Ev</option>
              <option value="car">🚗 Araba</option>
              <option value="vacation">🏖️ Tatil</option>
              <option value="education">📚 Eğitim</option>
              <option value="other">💰 Diğer</option>
            </select>
          </div>
          <div>
            <Label htmlFor="saving-deadline">Hedef Tarihi</Label>
            <Input
              id="saving-deadline"
              type="date"
              value={savingForm.deadline}
              onChange={(e) => setSavingForm(prev => ({ ...prev, deadline: e.target.value }))}
            />
          </div>
          <Button onClick={addSavingGoal} className="w-full">
            Birikim Hedefi Ekle
          </Button>
        </CardContent>
      </Card>

      {/* Available Savings Fund */}
      <Card className="bg-gradient-savings border-savings/20 shadow-card">
        <CardContent className="pt-6">
          <div className="text-center">
            <div className="text-sm text-savings-foreground/80 mb-2">Kullanılabilir Birikim Fonu</div>
            <div className="text-3xl font-bold text-savings-foreground">
              {formatCurrency(availableSavingsFund)}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Saving Goals List */}
      <div className="space-y-4">
        {savingGoals.map((goal) => {
          const progress = Math.min((goal.currentAmount / goal.targetAmount) * 100, 100);
          const isCompleted = progress >= 100;

          return (
            <Card key={goal.id} className={`bg-gradient-card shadow-card ${isCompleted ? 'border-income' : ''}`}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-foreground flex items-center gap-2">
                      <span className="text-2xl">{getCategoryEmoji(goal.category)}</span>
                      {goal.title}
                    </CardTitle>
                    <div className="text-sm text-muted-foreground mt-1">
                      Hedef Tarihi: {formatDate(goal.deadline)}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteSavingGoal(goal.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Progress */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>İlerleme</span>
                    <span>{progress.toFixed(1)}%</span>
                  </div>
                  <Progress value={progress} className="h-3" />
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Biriken: {formatCurrency(goal.currentAmount)}</span>
                    <span>Hedef: {formatCurrency(goal.targetAmount)}</span>
                  </div>
                </div>

                {isCompleted ? (
                  <div className="text-center p-4 bg-income/20 rounded-lg">
                    <div className="text-income font-bold text-lg">🎉 Hedef Tamamlandı! 🎉</div>
                    <div className="text-sm text-income/80 mt-1">Tebrikler! Hedefinize ulaştınız.</div>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Input
                      placeholder="Eklenecek tutar"
                      type="number"
                       onChange={(e) => {
                         // onChange handler - just update the value
                       }}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          const amount = parseFloat(e.currentTarget.value) || 0;
                          if (amount > 0) {
                            addSavingAmount(goal.id, amount);
                            e.currentTarget.value = '';
                          }
                        }
                      }}
                    />
                    <Button onClick={(e) => {
                      const input = e.currentTarget.parentElement?.querySelector('input') as HTMLInputElement;
                      const amount = parseFloat(input?.value || '0');
                      if (amount > 0) {
                        addSavingAmount(goal.id, amount);
                        if (input) input.value = '';
                      }
                    }}>
                      Ekle
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {savingGoals.length === 0 && (
        <Card className="bg-gradient-card shadow-card">
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground">Henüz birikim hedefi eklenmemiş</p>
          </CardContent>
        </Card>
      )}
    </div>
  );

  const renderSettings = () => (
    <div className="space-y-6">
      <Card className="bg-gradient-card shadow-card">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Bütçe Ayarları
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="debt-percentage">Borç Fonu Yüzdesi: %{settings.debtPercentage}</Label>
              <Slider
                id="debt-percentage"
                min={0}
                max={100}
                step={5}
                value={[settings.debtPercentage]}
                onValueChange={(value) => setSettings(prev => ({ ...prev, debtPercentage: value[0] }))}
                className="mt-2"
              />
              <div className="text-sm text-muted-foreground mt-1">
                Toplam gelirin %{settings.debtPercentage}'i borçlar için ayrılır
              </div>
            </div>

            <div>
              <Label htmlFor="savings-percentage">Birikim Fonu Yüzdesi: %{settings.savingsPercentage}</Label>
              <Slider
                id="savings-percentage"
                min={0}
                max={100}
                step={5}
                value={[settings.savingsPercentage]}
                onValueChange={(value) => setSettings(prev => ({ ...prev, savingsPercentage: value[0] }))}
                className="mt-2"
              />
              <div className="text-sm text-muted-foreground mt-1">
                Toplam gelirin %{settings.savingsPercentage}'i birikim için ayrılır
              </div>
            </div>

            <div className="pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                Kalan %{100 - settings.debtPercentage - settings.savingsPercentage} gelir serbest kullanım içindir
              </div>
            </div>
          </div>

          {/* Fund Preview */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
            <div className="p-4 bg-expense/10 rounded-lg">
              <div className="text-sm text-muted-foreground">Borç Fonu</div>
              <div className="text-xl font-bold text-expense">{formatCurrency(debtFund)}</div>
            </div>
            <div className="p-4 bg-savings/10 rounded-lg">
              <div className="text-sm text-muted-foreground">Birikim Fonu</div>
              <div className="text-xl font-bold text-savings">{formatCurrency(savingsFund)}</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4 max-w-4xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground mb-2">💰 Akıllı Bütçe Asistanı</h1>
          <p className="text-muted-foreground">Gelirlerinizi yönetin, borçlarınızı takip edin, hedeflerinize ulaşın</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5 mb-6">
            <TabsTrigger value="dashboard" className="text-xs sm:text-sm">Ana Sayfa</TabsTrigger>
            <TabsTrigger value="incomes" className="text-xs sm:text-sm">Gelirler</TabsTrigger>
            <TabsTrigger value="debts" className="text-xs sm:text-sm">Borçlar</TabsTrigger>
            <TabsTrigger value="goals" className="text-xs sm:text-sm">Birikimler</TabsTrigger>
            <TabsTrigger value="settings" className="text-xs sm:text-sm">Ayarlar</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            {renderDashboard()}
          </TabsContent>

          <TabsContent value="incomes" className="space-y-6">
            {renderIncomes()}
          </TabsContent>

          <TabsContent value="debts" className="space-y-6">
            {renderDebts()}
          </TabsContent>

          <TabsContent value="goals" className="space-y-6">
            {renderSavingGoals()}
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            {renderSettings()}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default BudgetApp;