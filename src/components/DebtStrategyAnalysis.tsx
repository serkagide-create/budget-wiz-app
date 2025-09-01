import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { TrendingDown, Calculator, Clock, DollarSign } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface Debt {
  id: string;
  description: string;
  totalAmount: number;
  installmentCount: number;
  payments: Array<{ amount: number; date: string }>;
  dueDate: string; // due_date yerine dueDate kullanıyoruz çünkü useFinancialData'da böyle
}

interface DebtStrategyAnalysisProps {
  debts: Debt[];
  strategy: 'snowball' | 'avalanche';
  availableDebtFund: number;
}

export const DebtStrategyAnalysis: React.FC<DebtStrategyAnalysisProps> = ({
  debts,
  strategy,
  availableDebtFund
}) => {
  // Borç analizi hesaplamaları
  const calculateDebtAnalysis = () => {
    const totalDebt = debts.reduce((sum, debt) => {
      const paidAmount = debt.payments.reduce((pSum, payment) => pSum + payment.amount, 0);
      return sum + (debt.totalAmount - paidAmount);
    }, 0);

    const monthlyMinimum = debts.reduce((sum, debt) => {
      const remainingAmount = debt.totalAmount - debt.payments.reduce((pSum, p) => pSum + p.amount, 0);
      const remainingInstallments = Math.max(1, debt.installmentCount - debt.payments.length);
      return sum + (remainingAmount / remainingInstallments);
    }, 0);

    // Stratejiye göre borç sıralaması
    const sortedDebts = [...debts].sort((a, b) => {
      const aRemaining = a.totalAmount - a.payments.reduce((sum, p) => sum + p.amount, 0);
      const bRemaining = b.totalAmount - b.payments.reduce((sum, p) => sum + p.amount, 0);
      
      if (strategy === 'snowball') {
        return aRemaining - bRemaining; // En küçük borç önce
      } else {
        // Avalanche stratejisi için faiz oranı yerine taksit tutarını kullanıyoruz
        const aMonthly = aRemaining / Math.max(1, a.installmentCount - a.payments.length);
        const bMonthly = bRemaining / Math.max(1, b.installmentCount - b.payments.length);
        return bMonthly - aMonthly; // En yüksek taksit önce
      }
    });

    // Tahmini ödeme süresi
    const estimatedMonths = availableDebtFund > 0 ? Math.ceil(totalDebt / availableDebtFund) : 0;

    return {
      totalDebt,
      monthlyMinimum,
      sortedDebts,
      estimatedMonths,
      extraPayment: Math.max(0, availableDebtFund - monthlyMinimum)
    };
  };

  const analysis = calculateDebtAnalysis();

  const getStrategyDescription = () => {
    if (strategy === 'snowball') {
      return {
        title: 'Kar Topu Stratejisi',
        description: 'En küçük borçları önce ödeyin. Bu size motivasyon sağlar.',
        icon: <TrendingDown className="w-5 h-5" />
      };
    } else {
      return {
        title: 'Çığ Stratejisi', 
        description: 'En yüksek faizli borçları önce ödeyin. Daha az faiz ödersiniz.',
        icon: <Calculator className="w-5 h-5" />
      };
    }
  };

  const strategyInfo = getStrategyDescription();

  if (debts.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Analiz edilecek borç bulunmuyor.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Strateji Bilgisi */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {strategyInfo.icon}
            {strategyInfo.title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            {strategyInfo.description}
          </p>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-destructive">
                {formatCurrency(analysis.totalDebt)}
              </p>
              <p className="text-xs text-muted-foreground">Toplam Borç</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">
                {analysis.estimatedMonths}
              </p>
              <p className="text-xs text-muted-foreground">Tahmini Ay</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Aylık Ödeme Planı */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Aylık Ödeme Planı
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between">
            <span className="text-sm">Minimum Ödeme:</span>
            <span className="font-medium">{formatCurrency(analysis.monthlyMinimum)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm">Kullanılabilir Fon:</span>
            <span className="font-medium">{formatCurrency(availableDebtFund)}</span>
          </div>
          <div className="flex justify-between border-t pt-2">
            <span className="text-sm font-medium">Ek Ödeme:</span>
            <span className="font-bold text-primary">{formatCurrency(analysis.extraPayment)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Öncelik Sırası */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Ödeme Öncelik Sırası
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {analysis.sortedDebts.slice(0, 3).map((debt, index) => {
            const remainingAmount = debt.totalAmount - debt.payments.reduce((sum, p) => sum + p.amount, 0);
            const progress = ((debt.totalAmount - remainingAmount) / debt.totalAmount) * 100;
            
            return (
              <div key={debt.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant={index === 0 ? "default" : "secondary"}>
                      {index + 1}
                    </Badge>
                    <span className="text-sm font-medium">{debt.description}</span>
                  </div>
                  <span className="text-sm font-bold">{formatCurrency(remainingAmount)}</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            );
          })}
          
          {analysis.sortedDebts.length > 3 && (
            <p className="text-xs text-muted-foreground text-center pt-2">
              +{analysis.sortedDebts.length - 3} borç daha
            </p>
          )}
        </CardContent>
      </Card>

      {/* Motivasyon */}
      {analysis.extraPayment > 0 && (
        <Card className="bg-gradient-primary border-0">
          <CardContent className="p-4 text-center">
            <p className="text-sm text-primary-foreground/80">
              Ayda {formatCurrency(analysis.extraPayment)} ek ödeme ile
            </p>
            <p className="text-lg font-bold text-primary-foreground">
              {analysis.estimatedMonths} ayda borçsuz olabilirsiniz!
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};