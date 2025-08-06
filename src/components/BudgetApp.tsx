import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { 
  TrendingUp, 
  Target, 
  AlertTriangle,
  Wallet
} from 'lucide-react';
import { IncomeManager } from './IncomeManager';
import { DebtManager } from './DebtManager';
import { SavingsManager } from './SavingsManager';
import { SettingsManager } from './SettingsManager';

// TypeScript Interface Definitions
interface Income {
  id: string;
  description: string;
  amount: number;
  date: string;
  category: string;
  monthlyRepeat?: boolean;
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
  monthlyRepeat?: boolean;
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

export const BudgetApp = () => {
  // State Management
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [savingGoals, setSavingGoals] = useState<SavingGoal[]>([]);
  const [settings, setSettings] = useState<Settings>({ debtPercentage: 30, savingsPercentage: 20, debtStrategy: 'snowball' });
  const [activeTab, setActiveTab] = useState('dashboard');
  const { toast } = useToast();

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
    setSettings(loadFromStorage('budgetApp_settings', { debtPercentage: 30, savingsPercentage: 20, debtStrategy: 'snowball' }));
  }, []);

  // Save data when state changes
  useEffect(() => { saveToStorage('budgetApp_incomes', incomes); }, [incomes]);
  useEffect(() => { saveToStorage('budgetApp_debts', debts); }, [debts]);
  useEffect(() => { saveToStorage('budgetApp_savingGoals', savingGoals); }, [savingGoals]);
  useEffect(() => { saveToStorage('budgetApp_settings', settings); }, [settings]);

  // Calculations
  const totalIncome = incomes.reduce((sum, income) => sum + income.amount, 0);
  const activeDebtsCount = debts.filter(debt => {
    const totalPaid = debt.payments.reduce((sum, payment) => sum + payment.amount, 0);
    return totalPaid < debt.totalAmount;
  }).length;
  const availableFund = (totalIncome * (settings.debtPercentage + settings.savingsPercentage)) / 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted p-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">
            💰 Kişisel Borç Takip Uygulaması
          </h1>
          <p className="text-muted-foreground">
            Finansal hedeflerinize ulaşmak için akıllı borç ve tasarruf yönetimi
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="incomes">Gelirler</TabsTrigger>
            <TabsTrigger value="debts">Borçlar</TabsTrigger>
            <TabsTrigger value="savings">Hedefler</TabsTrigger>
            <TabsTrigger value="ai">AI Asistan</TabsTrigger>
            <TabsTrigger value="settings">Ayarlar</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-green-500" />
                    Toplam Gelir
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(totalIncome)}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-500" />
                    Aktif Borçlar
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-red-600">
                    {activeDebtsCount}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Target className="w-5 h-5 text-blue-500" />
                    Tasarruf Hedefleri
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-blue-600">
                    {savingGoals.length}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Wallet className="w-5 h-5 text-purple-500" />
                    Kullanılabilir Fon
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-purple-600">
                    {formatCurrency(Math.max(0, availableFund))}
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Hızlı Aksiyonlar</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Finansal yönetiminizi hızlandırmak için yukarıdaki sekmelerden işlemlerinizi yapabilirsiniz.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Finansal Durum</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Borç Fonu ({settings.debtPercentage}%)</span>
                      <span>{formatCurrency((totalIncome * settings.debtPercentage) / 100)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Tasarruf Fonu ({settings.savingsPercentage}%)</span>
                      <span>{formatCurrency((totalIncome * settings.savingsPercentage) / 100)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="incomes">
            <IncomeManager 
              incomes={incomes} 
              setIncomes={setIncomes} 
              toast={toast} 
            />
          </TabsContent>

          <TabsContent value="debts">
            <DebtManager 
              debts={debts} 
              setDebts={setDebts} 
              toast={toast} 
            />
          </TabsContent>

          <TabsContent value="savings">
            <SavingsManager 
              savingGoals={savingGoals} 
              setSavingGoals={setSavingGoals} 
              toast={toast} 
            />
          </TabsContent>

          <TabsContent value="ai">
            <Card>
              <CardHeader>
                <CardTitle>AI Asistan</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  AI asistan özellikleri geliştirilmeye devam ediyor...
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings">
            <SettingsManager 
              settings={settings} 
              setSettings={setSettings} 
              totalIncome={totalIncome} 
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};