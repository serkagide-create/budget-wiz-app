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
import { useTheme } from "next-themes";
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
  Check
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
  const { theme, setTheme } = useTheme();
  
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
    <div className="space-y-4">
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
          onClick={() => setActiveTab('incomes')} 
          className="h-16 text-left justify-start"
          variant="outline"
        >
          <div className="flex items-center gap-3">
            <div className="bg-income/10 p-2 rounded-lg">
              <PlusCircle className="w-5 h-5 text-income" />
            </div>
            <div>
              <p className="font-medium">Gelir Ekle</p>
              <p className="text-sm text-muted-foreground">{incomes.length} kayıt</p>
            </div>
          </div>
        </Button>

        <Button 
          onClick={() => setActiveTab('debts')} 
          className="h-16 text-left justify-start"
          variant="outline"
        >
          <div className="flex items-center gap-3">
            <div className="bg-expense/10 p-2 rounded-lg">
              <Target className="w-5 h-5 text-expense" />
            </div>
            <div>
              <p className="font-medium">Borç Yönet</p>
              <p className="text-sm text-muted-foreground">{debts.length} borç</p>
            </div>
          </div>
        </Button>
      </div>
    </div>
  );

  const renderIncomes = () => (
    <div className="space-y-4">
      {/* Add Income Form */}
      <Card>
        <CardContent className="p-4">
          <div className="space-y-3">
            <Input
              placeholder="Gelir açıklaması (maaş, freelance vb.)"
              value={incomeForm.description}
              onChange={(e) => setIncomeForm(prev => ({ ...prev, description: e.target.value }))}
            />
            <div className="flex gap-2">
              <Input
                type="number"
                placeholder="Tutar (₺)"
                value={incomeForm.amount}
                onChange={(e) => setIncomeForm(prev => ({ ...prev, amount: e.target.value }))}
              />
              <Button onClick={addIncome}>
                <PlusCircle className="w-4 h-4" />
              </Button>
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
            <Card key={income.id}>
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{income.description}</p>
                    <p className="text-sm text-muted-foreground">{formatDate(income.date)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-income">{formatCurrency(income.amount)}</span>
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
    const totalDebtAmount = debts.reduce((sum, debt) => sum + debt.totalAmount, 0);
    
    return (
      <div className="space-y-4">
        {/* Debt Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="number"
                placeholder="Tutar (₺)"
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
            <div className="flex gap-2">
              <Input
                type="date"
                value={debtForm.dueDate}
                onChange={(e) => setDebtForm(prev => ({ ...prev, dueDate: e.target.value }))}
              />
              <Button onClick={addDebt}>
                <PlusCircle className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Debt List */}
      {debts.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          Henüz borç eklenmemiş
        </div>
      ) : (
        <div className="space-y-3">
          {debts.map((debt) => {
            const totalPaid = debt.payments.reduce((sum, payment) => sum + payment.amount, 0);
            const remaining = debt.totalAmount - totalPaid;
            const progress = (totalPaid / debt.totalAmount) * 100;
            const daysLeft = getDaysUntilDue(debt.dueDate);
            
            let isWarning = false;
            let warningText = '';
            
            if (daysLeft < 0) {
              isWarning = true;
              warningText = `${Math.abs(daysLeft)} gün gecikmiş!`;
            } else if (daysLeft === 0) {
              isWarning = true;
              warningText = 'Son gün!';
            } else if (daysLeft <= 3) {
              isWarning = true;
              warningText = `${daysLeft} gün kaldı!`;
            }

            return (
              <Card key={debt.id} className={isWarning ? 'border-destructive' : ''}>
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium">{debt.description}</h3>
                          {isWarning && (
                            <Badge variant="destructive" className="text-xs">
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              {warningText}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(debt.dueDate)} • {debt.installmentCount} taksit
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteDebt(debt.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>İlerleme ({progress.toFixed(0)}%)</span>
                        <span>{formatCurrency(totalPaid)} / {formatCurrency(debt.totalAmount)}</span>
                      </div>
                      <Progress value={progress} className="h-2" />
                    </div>

                    {progress >= 100 ? (
                      <div className="text-center p-2 bg-income/20 rounded text-income text-sm font-medium">
                        ✅ Tamamlandı
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <Input
                          placeholder="Ödeme tutarı"
                          type="number"
                          value={paymentForms[debt.id] || ''}
                          onChange={(e) => setPaymentForms(prev => ({ ...prev, [debt.id]: e.target.value }))}
                        />
                        <Button onClick={() => addPayment(debt.id)} size="sm">
                          Öde
                        </Button>
                      </div>
                    )}

                    {debt.payments.length > 0 && (
                      <div className="pt-2 border-t">
                        <p className="text-xs text-muted-foreground mb-2">
                          Ödemeler ({debt.payments.length}/{debt.installmentCount})
                        </p>
                        <div className="space-y-1 max-h-32 overflow-y-auto">
                          {debt.payments.map((payment, index) => (
                            <div key={payment.id} className="flex justify-between items-center text-xs bg-secondary/30 p-2 rounded">
                              <div className="flex items-center gap-2">
                                <Check className="w-3 h-3 text-green-500" />
                                <span>{formatCurrency(payment.amount)}</span>
                                <span className="text-muted-foreground">
                                  {new Date(payment.date).toLocaleDateString('tr-TR')}
                                </span>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deletePayment(debt.id, payment.id)}
                                className="h-6 w-6 p-0"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
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
              <select
                className="p-2 border rounded-md bg-background text-sm"
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
            <div className="flex gap-2">
              <Input
                type="date"
                value={savingForm.deadline}
                onChange={(e) => setSavingForm(prev => ({ ...prev, deadline: e.target.value }))}
              />
              <Button onClick={addSavingGoal}>
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
        <div className="space-y-3">
          {savingGoals.map((goal) => {
            const progress = Math.min((goal.currentAmount / goal.targetAmount) * 100, 100);
            const isCompleted = progress >= 100;

            return (
              <Card key={goal.id} className={isCompleted ? 'border-income' : ''}>
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{getCategoryEmoji(goal.category)}</span>
                          <h3 className="font-medium">{goal.title}</h3>
                          {isCompleted && (
                            <Badge className="text-xs bg-income text-income-foreground">
                              ✅ Tamamlandı
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Hedef: {formatDate(goal.deadline)}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteSavingGoal(goal.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>İlerleme ({progress.toFixed(0)}%)</span>
                        <span>{formatCurrency(goal.currentAmount)} / {formatCurrency(goal.targetAmount)}</span>
                      </div>
                      <Progress value={progress} className="h-2" />
                    </div>

                    {isCompleted ? (
                      <div className="text-center p-2 bg-income/20 rounded text-income text-sm font-medium">
                        🎉 Hedefe Ulaşıldı!
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <Input
                          placeholder="Eklenecek tutar"
                          type="number"
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
                        <Button 
                          onClick={(e) => {
                            const input = e.currentTarget.parentElement?.querySelector('input') as HTMLInputElement;
                            const amount = parseFloat(input?.value || '0');
                            if (amount > 0) {
                              addSavingAmount(goal.id, amount);
                              if (input) input.value = '';
                            }
                          }}
                          size="sm"
                        >
                          Ekle
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
      {/* Theme Settings Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Tema Ayarları
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Uygulama Teması</Label>
              <p className="text-sm text-muted-foreground">Gündüz veya gece modunu seçin</p>
            </div>
            <div className="flex gap-2">
              <Button
                variant={theme === "light" ? "default" : "outline"}
                size="sm"
                onClick={() => setTheme("light")}
              >
                <Sun className="h-4 w-4 mr-2" />
                Gündüz
              </Button>
              <Button
                variant={theme === "dark" ? "default" : "outline"}
                size="sm"
                onClick={() => setTheme("dark")}
              >
                <Moon className="h-4 w-4 mr-2" />
                Gece
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Budget Settings Card */}
      <Card className="bg-gradient-card shadow-card">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
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