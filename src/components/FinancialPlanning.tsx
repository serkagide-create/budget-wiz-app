import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Calendar, TrendingUp, Target, Clock, Calculator } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';

interface Debt {
  id: string;
  description: string;
  totalAmount: number;
  installmentCount: number;
  payments: Array<{ amount: number; date: string }>;
  dueDate: string; // due_date yerine dueDate kullanıyoruz çünkü useFinancialData'da böyle
}

interface SavingGoal {
  id: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string;
}

interface FinancialPlanningProps {
  debts: Debt[];
  savingGoals: SavingGoal[];
  monthlyIncome: number;
  debtPercentage: number;
  savingsPercentage: number;
}

export const FinancialPlanning: React.FC<FinancialPlanningProps> = ({
  debts,
  savingGoals,
  monthlyIncome,
  debtPercentage,
  savingsPercentage
}) => {
  const [planningPeriod, setPlanningPeriod] = useState<6 | 12 | 24>(12);

  // Gelecek borç tahminleri
  const calculateDebtProjection = () => {
    const monthlyDebtBudget = (monthlyIncome * debtPercentage) / 100;
    const projections = [];
    
    let remainingDebts = debts.map(debt => ({
      ...debt,
      remaining: debt.totalAmount - debt.payments.reduce((sum, p) => sum + p.amount, 0)
    }));

    for (let month = 1; month <= planningPeriod; month++) {
      let monthlyBudget = monthlyDebtBudget;
      let totalRemaining = 0;

      // Bu ay ödenecek borçları hesapla
      remainingDebts = remainingDebts.map(debt => {
        if (debt.remaining > 0 && monthlyBudget > 0) {
          const monthlyPayment = Math.min(debt.remaining, debt.remaining / (planningPeriod - month + 1), monthlyBudget);
          monthlyBudget -= monthlyPayment;
          return {
            ...debt,
            remaining: debt.remaining - monthlyPayment
          };
        }
        return debt;
      });

      totalRemaining = remainingDebts.reduce((sum, debt) => sum + debt.remaining, 0);

      projections.push({
        month: `${month}. Ay`,
        totalDebt: totalRemaining,
        paidThisMonth: monthlyDebtBudget - monthlyBudget
      });
    }

    return projections;
  };

  // Tasarruf tahminleri
  const calculateSavingsProjection = () => {
    const monthlySavings = (monthlyIncome * savingsPercentage) / 100;
    const projections = [];
    
    let currentTotal = savingGoals.reduce((sum, goal) => sum + goal.currentAmount, 0);

    for (let month = 1; month <= planningPeriod; month++) {
      currentTotal += monthlySavings;
      projections.push({
        month: `${month}. Ay`,
        totalSavings: currentTotal,
        monthlyContribution: monthlySavings
      });
    }

    return projections;
  };

  // Hedef analizi
  const analyzeGoals = () => {
    const monthlySavings = (monthlyIncome * savingsPercentage) / 100;
    
    return savingGoals.map(goal => {
      const remaining = goal.targetAmount - goal.currentAmount;
      const monthsToTarget = remaining > 0 ? Math.ceil(remaining / monthlySavings) : 0;
      const targetDate = new Date();
      targetDate.setMonth(targetDate.getMonth() + monthsToTarget);
      
      const deadlineDate = new Date(goal.deadline);
      const monthsUntilDeadline = Math.ceil((deadlineDate.getTime() - Date.now()) / (30 * 24 * 60 * 60 * 1000));
      
      return {
        ...goal,
        remaining,
        monthsToTarget,
        targetDate,
        monthsUntilDeadline,
        isAchievable: monthsToTarget <= monthsUntilDeadline,
        requiredMonthlySavings: monthsUntilDeadline > 0 ? remaining / monthsUntilDeadline : 0
      };
    });
  };

  const debtProjections = calculateDebtProjection();
  const savingsProjections = calculateSavingsProjection();
  const goalAnalysis = analyzeGoals();

  // Birleşik grafik verisi
  const combinedData = debtProjections.map((debt, index) => ({
    month: debt.month,
    borç: debt.totalDebt,
    tasarruf: savingsProjections[index]?.totalSavings || 0
  }));

  const getGoalStatusColor = (isAchievable: boolean) => {
    return isAchievable ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
  };

  const currentDebtTotal = debts.reduce((sum, debt) => {
    const remaining = debt.totalAmount - debt.payments.reduce((pSum, p) => pSum + p.amount, 0);
    return sum + remaining;
  }, 0);

  const debtFreeMonth = debtProjections.find(p => p.totalDebt === 0)?.month || `${planningPeriod}+ ay`;

  return (
    <div className="space-y-4">
      {/* Planlama Periyodu Seçimi */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Finansal Planlama
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-4">
            {[6, 12, 24].map((period) => (
              <Button
                key={period}
                variant={planningPeriod === period ? "default" : "outline"}
                size="sm"
                onClick={() => setPlanningPeriod(period as 6 | 12 | 24)}
              >
                {period} Ay
              </Button>
            ))}
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">{debtFreeMonth}</p>
              <p className="text-xs text-muted-foreground">Borçsuz Olma Tahmini</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(savingsProjections[planningPeriod - 1]?.totalSavings || 0)}
              </p>
              <p className="text-xs text-muted-foreground">{planningPeriod} Ay Sonrası Tasarruf</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Finansal Projeksiyon Grafiği */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            {planningPeriod} Aylık Projeksiyon
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={combinedData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                <Line 
                  type="monotone" 
                  dataKey="borç" 
                  stroke="#ef4444" 
                  strokeWidth={2}
                  name="Kalan Borç"
                />
                <Line 
                  type="monotone" 
                  dataKey="tasarruf" 
                  stroke="#22c55e" 
                  strokeWidth={2}
                  name="Toplam Tasarruf"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Hedef Analizi */}
      {goalAnalysis.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              Tasarruf Hedefleri Analizi
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {goalAnalysis.map((goal) => (
              <div key={goal.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{goal.title}</span>
                  <Badge className={getGoalStatusColor(goal.isAchievable)}>
                    {goal.isAchievable ? 'Ulaşılabilir' : 'Risk'}
                  </Badge>
                </div>
                
                <Progress 
                  value={(goal.currentAmount / goal.targetAmount) * 100} 
                  className="h-2"
                />
                
                <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground">
                  <div>
                    <p>Mevcut: {formatCurrency(goal.currentAmount)}</p>
                    <p>Hedef: {formatCurrency(goal.targetAmount)}</p>
                  </div>
                  <div>
                    <p>Kalan Süre: {goal.monthsUntilDeadline} ay</p>
                    <p>Gereken Aylık: {formatCurrency(goal.requiredMonthlySavings)}</p>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Aylık Özet */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="w-5 h-5" />
            Aylık Plan Özeti
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between">
            <span className="text-sm">Toplam Gelir:</span>
            <span className="font-medium">{formatCurrency(monthlyIncome)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm">Borç Ödeme Bütçesi:</span>
            <span className="font-medium">{formatCurrency((monthlyIncome * debtPercentage) / 100)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm">Tasarruf Bütçesi:</span>
            <span className="font-medium">{formatCurrency((monthlyIncome * savingsPercentage) / 100)}</span>
          </div>
          <div className="flex justify-between border-t pt-2">
            <span className="text-sm font-medium">Serbest Miktar:</span>
            <span className="font-bold">
              {formatCurrency(monthlyIncome - ((monthlyIncome * debtPercentage) / 100) - ((monthlyIncome * savingsPercentage) / 100))}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Tavsiyeler */}
      <Card className="bg-gradient-primary border-0">
        <CardContent className="p-4">
          <div className="text-primary-foreground">
            <h3 className="font-medium mb-2">💡 Planlama Tavsiyeleri</h3>
            <ul className="text-sm space-y-1 opacity-90">
              <li>• Borçlarınızı {planningPeriod} ay içinde kapatabilirsiniz</li>
              <li>• Tasarruf hedefinize odaklanın</li>
              <li>• Aylık bütçenizi gözden geçirin</li>
              <li>• Beklenmedik giderler için fon ayırın</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};