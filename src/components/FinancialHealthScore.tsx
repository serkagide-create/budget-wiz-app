import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  Target,
  PiggyBank,
  Shield
} from 'lucide-react';

interface FinancialData {
  totalIncome: number;
  totalDebtRemaining: number;
  totalSavings: number;
  monthlyExpenses: number;
  emergencyFund: number;
}

interface FinancialHealthScoreProps {
  data: FinancialData;
}

interface ScoreBreakdown {
  category: string;
  score: number;
  maxScore: number;
  description: string;
  status: 'excellent' | 'good' | 'warning' | 'critical';
}

export const FinancialHealthScore: React.FC<FinancialHealthScoreProps> = ({ data }) => {
  const calculateFinancialHealthScore = (): { totalScore: number; breakdown: ScoreBreakdown[] } => {
    const breakdown: ScoreBreakdown[] = [];

    // 1. Borç/Gelir Oranı (25 puan)
    const debtToIncomeRatio = data.totalIncome > 0 ? (data.totalDebtRemaining / data.totalIncome) * 100 : 0;
    let debtScore = 25;
    let debtStatus: 'excellent' | 'good' | 'warning' | 'critical' = 'excellent';
    
    if (debtToIncomeRatio > 40) {
      debtScore = 5;
      debtStatus = 'critical';
    } else if (debtToIncomeRatio > 30) {
      debtScore = 10;
      debtStatus = 'warning';
    } else if (debtToIncomeRatio > 20) {
      debtScore = 18;
      debtStatus = 'good';
    }

    breakdown.push({
      category: 'Borç Yönetimi',
      score: debtScore,
      maxScore: 25,
      description: `Borç/Gelir Oranı: %${debtToIncomeRatio.toFixed(1)}`,
      status: debtStatus
    });

    // 2. Birikim Oranı (25 puan)
    const savingsRate = data.totalIncome > 0 ? (data.totalSavings / data.totalIncome) * 100 : 0;
    let savingsScore = 0;
    let savingsStatus: 'excellent' | 'good' | 'warning' | 'critical' = 'critical';
    
    if (savingsRate >= 20) {
      savingsScore = 25;
      savingsStatus = 'excellent';
    } else if (savingsRate >= 15) {
      savingsScore = 20;
      savingsStatus = 'good';
    } else if (savingsRate >= 10) {
      savingsScore = 15;
      savingsStatus = 'warning';
    } else if (savingsRate >= 5) {
      savingsScore = 10;
      savingsStatus = 'warning';
    } else {
      savingsScore = 5;
      savingsStatus = 'critical';
    }

    breakdown.push({
      category: 'Birikim Alışkanlığı',
      score: savingsScore,
      maxScore: 25,
      description: `Birikim Oranı: %${savingsRate.toFixed(1)}`,
      status: savingsStatus
    });

    // 3. Acil Durum Fonu (25 puan)
    const monthsOfExpensesCovered = data.monthlyExpenses > 0 ? data.emergencyFund / data.monthlyExpenses : 0;
    let emergencyScore = 0;
    let emergencyStatus: 'excellent' | 'good' | 'warning' | 'critical' = 'critical';
    
    if (monthsOfExpensesCovered >= 6) {
      emergencyScore = 25;
      emergencyStatus = 'excellent';
    } else if (monthsOfExpensesCovered >= 4) {
      emergencyScore = 20;
      emergencyStatus = 'good';
    } else if (monthsOfExpensesCovered >= 2) {
      emergencyScore = 15;
      emergencyStatus = 'warning';
    } else if (monthsOfExpensesCovered >= 1) {
      emergencyScore = 10;
      emergencyStatus = 'warning';
    } else {
      emergencyScore = 5;
      emergencyStatus = 'critical';
    }

    breakdown.push({
      category: 'Acil Durum Fonu',
      score: emergencyScore,
      maxScore: 25,
      description: `${monthsOfExpensesCovered.toFixed(1)} aylık harcama karşılığı`,
      status: emergencyStatus
    });

    // 4. Gelir Çeşitliliği (25 puan)
    // Bu örnekte basit bir hesaplama yapıyoruz, gerçek uygulamada gelir kaynaklarını analiz edebiliriz
    const incomeStabilityScore = data.totalIncome > 0 ? 20 : 5;
    let incomeStatus: 'excellent' | 'good' | 'warning' | 'critical' = data.totalIncome > 0 ? 'good' : 'critical';

    breakdown.push({
      category: 'Gelir Durumu',
      score: incomeStabilityScore,
      maxScore: 25,
      description: `Aylık Gelir: ${data.totalIncome.toLocaleString('tr-TR')} ₺`,
      status: incomeStatus
    });

    const totalScore = breakdown.reduce((sum, item) => sum + item.score, 0);

    return { totalScore, breakdown };
  };

  const { totalScore, breakdown } = calculateFinancialHealthScore();

  const getScoreColor = (score: number): string => {
    if (score >= 80) return 'hsl(var(--success))';
    if (score >= 60) return 'hsl(var(--warning))';
    if (score >= 40) return 'hsl(var(--info))';
    return 'hsl(var(--destructive))';
  };

  const getScoreDescription = (score: number): { title: string; description: string } => {
    if (score >= 80) {
      return {
        title: 'Mükemmel! 🎉',
        description: 'Finansal sağlığınız çok iyi durumda. Bu başarınızı sürdürün!'
      };
    }
    if (score >= 60) {
      return {
        title: 'İyi 👍',
        description: 'Finansal durumunuz iyi, bazı iyileştirmeler yapabilirsiniz.'
      };
    }
    if (score >= 40) {
      return {
        title: 'Geliştirilmeli ⚠️',
        description: 'Finansal sağlığınızı iyileştirmek için çalışmanız gerekiyor.'
      };
    }
    return {
      title: 'Dikkat! 🚨',
      description: 'Finansal durumunuz acil müdahale gerektiriyor.'
    };
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'excellent':
        return <CheckCircle className="w-4 h-4 text-success" />;
      case 'good':
        return <TrendingUp className="w-4 h-4 text-info" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-warning" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-destructive" />;
    }
  };

  const scoreInfo = getScoreDescription(totalScore);

  return (
    <Card className="bg-gradient-to-br from-primary/5 to-secondary/5 border-primary/20">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" />
          Finansal Sağlık Skoru
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Ana Skor */}
        <div className="text-center space-y-4">
          <div className="relative">
            <div className="w-32 h-32 mx-auto relative">
              <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 36 36">
                <path
                  d="M18 2.0845
                    a 15.9155 15.9155 0 0 1 0 31.831
                    a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="hsl(var(--muted))"
                  strokeWidth="3"
                />
                <path
                  d="M18 2.0845
                    a 15.9155 15.9155 0 0 1 0 31.831
                    a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke={getScoreColor(totalScore)}
                  strokeWidth="3"
                  strokeDasharray={`${totalScore}, 100`}
                  className="transition-all duration-1000 ease-out"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-3xl font-bold" style={{ color: getScoreColor(totalScore) }}>
                    {totalScore}
                  </div>
                  <div className="text-sm text-muted-foreground">/ 100</div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="space-y-2">
            <h3 className="text-xl font-semibold">{scoreInfo.title}</h3>
            <p className="text-muted-foreground">{scoreInfo.description}</p>
          </div>
        </div>

        {/* Detaylı Analiz */}
        <div className="space-y-4">
          <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
            Detaylı Analiz
          </h4>
          
          {breakdown.map((item, index) => (
            <div key={index} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getStatusIcon(item.status)}
                  <span className="font-medium text-sm">{item.category}</span>
                </div>
                <Badge variant="outline" className="text-xs">
                  {item.score}/{item.maxScore}
                </Badge>
              </div>
              
              <Progress 
                value={(item.score / item.maxScore) * 100} 
                className="h-2"
              />
              
              <p className="text-xs text-muted-foreground">{item.description}</p>
            </div>
          ))}
        </div>

        {/* İyileştirme Önerileri */}
        {totalScore < 80 && (
          <div className="mt-6 p-4 bg-muted/50 rounded-lg">
            <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
              <Target className="w-4 h-4" />
              Puanınızı Artırmanın Yolları
            </h4>
            <ul className="text-xs space-y-1 text-muted-foreground">
              {breakdown.filter(item => item.score < item.maxScore * 0.8).map((item, index) => (
                <li key={index} className="flex items-start gap-1">
                  <span>•</span>
                  <span>{item.category} alanında iyileştirme yapın</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
};