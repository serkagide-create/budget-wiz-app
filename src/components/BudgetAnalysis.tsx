import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import { AlertTriangle, TrendingUp, Target, DollarSign } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface BudgetAnalysisProps {
  totalIncome: number;
  totalExpenses: number;
  debtPayments: number;
  savings: number;
  settings: {
    debtPercentage: number;
    savingsPercentage: number;
  };
}

export const BudgetAnalysis: React.FC<BudgetAnalysisProps> = ({
  totalIncome,
  totalExpenses,
  debtPayments,
  savings,
  settings
}) => {
  // Bütçe hesaplamaları
  const recommendedDebt = (totalIncome * settings.debtPercentage) / 100;
  const recommendedSavings = (totalIncome * settings.savingsPercentage) / 100;
  const remainingIncome = totalIncome - debtPayments - savings - totalExpenses;
  
  // Kategori analizi
  const budgetCategories = [
    {
      name: 'Borç Ödemeleri',
      actual: debtPayments,
      recommended: recommendedDebt,
      color: '#ef4444',
      percentage: (debtPayments / totalIncome) * 100
    },
    {
      name: 'Tasarruf',
      actual: savings,
      recommended: recommendedSavings,
      color: '#22c55e',
      percentage: (savings / totalIncome) * 100
    },
    {
      name: 'Giderler',
      actual: totalExpenses,
      recommended: totalIncome * 0.5, // Örnek olarak %50
      color: '#f59e0b',
      percentage: (totalExpenses / totalIncome) * 100
    },
    {
      name: 'Kalan',
      actual: remainingIncome,
      recommended: totalIncome * 0.1, // Örnek olarak %10
      color: '#6366f1',
      percentage: (remainingIncome / totalIncome) * 100
    }
  ];

  // Sağlık skoru hesaplama
  const calculateHealthScore = () => {
    let score = 100;
    
    // Borç oranı kontrol
    const debtRatio = (debtPayments / totalIncome) * 100;
    if (debtRatio > 40) score -= 30;
    else if (debtRatio > 30) score -= 15;
    
    // Tasarruf oranı kontrol
    const savingsRatio = (savings / totalIncome) * 100;
    if (savingsRatio < 10) score -= 25;
    else if (savingsRatio < 20) score -= 10;
    
    // Kalan gelir kontrol
    if (remainingIncome < 0) score -= 40;
    else if (remainingIncome < totalIncome * 0.05) score -= 15;
    
    return Math.max(0, score);
  };

  const healthScore = calculateHealthScore();

  // Öneriler
  const getRecommendations = () => {
    const recommendations = [];
    
    if (debtPayments > recommendedDebt) {
      recommendations.push({
        type: 'warning',
        title: 'Yüksek Borç Oranı',
        description: `Borç ödemeleriniz gelirin %${((debtPayments / totalIncome) * 100).toFixed(1)}'ini oluşturuyor. İdeal oran %${settings.debtPercentage}.`
      });
    }
    
    if (savings < recommendedSavings) {
      recommendations.push({
        type: 'info',
        title: 'Tasarruf Artırın',
        description: `Tasarruf oranınızı %${settings.savingsPercentage}'ye çıkarabilirsiniz. ${formatCurrency(recommendedSavings - savings)} daha tasarruf edin.`
      });
    }
    
    if (remainingIncome < 0) {
      recommendations.push({
        type: 'error',
        title: 'Bütçe Açığı',
        description: `Aylık ${formatCurrency(Math.abs(remainingIncome))} açığınız var. Giderlerinizi gözden geçirin.`
      });
    }
    
    if (remainingIncome > totalIncome * 0.3) {
      recommendations.push({
        type: 'success',
        title: 'İyi Durumdaşınız',
        description: 'Fazla paranızı ek tasarruf veya yatırım için değerlendirebilirsiniz.'
      });
    }
    
    return recommendations;
  };

  const recommendations = getRecommendations();

  const pieData = budgetCategories.map(cat => ({
    name: cat.name,
    value: Math.max(0, cat.actual),
    color: cat.color
  }));

  const getHealthScoreColor = () => {
    if (healthScore >= 80) return 'text-green-600';
    if (healthScore >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-4">
      {/* Bütçe Sağlık Skoru */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            Bütçe Sağlık Skoru
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <div className={`text-4xl font-bold mb-2 ${getHealthScoreColor()}`}>
            {healthScore}/100
          </div>
          <Progress value={healthScore} className="mb-4" />
          <p className="text-sm text-muted-foreground">
            {healthScore >= 80 ? 'Mükemmel!' : 
             healthScore >= 60 ? 'İyi durumdaşınız' : 
             'İyileştirme gerekiyor'}
          </p>
        </CardContent>
      </Card>

      {/* Gelir Dağılımı Grafiği */}
      <Card>
        <CardHeader>
          <CardTitle>Gelir Dağılımı</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48 mb-4">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={80}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            {budgetCategories.map((category, index) => (
              <div key={index} className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: category.color }}
                />
                <span className="text-xs">{category.name}</span>
                <span className="text-xs font-medium ml-auto">
                  %{category.percentage.toFixed(1)}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Kategori Karşılaştırması */}
      <Card>
        <CardHeader>
          <CardTitle>Gerçek vs Önerilen</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={budgetCategories.slice(0, 2)}>
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                <Bar dataKey="actual" fill="#3b82f6" name="Gerçek" />
                <Bar dataKey="recommended" fill="#e5e7eb" name="Önerilen" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Öneriler */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Öneriler
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {recommendations.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Bütçeniz dengeli görünüyor! 👍
            </p>
          ) : (
            recommendations.map((rec, index) => (
              <div key={index} className="flex gap-3 p-3 rounded-lg bg-muted/50">
                <div className="flex-shrink-0 mt-0.5">
                  {rec.type === 'error' && <AlertTriangle className="w-4 h-4 text-red-500" />}
                  {rec.type === 'warning' && <AlertTriangle className="w-4 h-4 text-yellow-500" />}
                  {rec.type === 'info' && <DollarSign className="w-4 h-4 text-blue-500" />}
                  {rec.type === 'success' && <TrendingUp className="w-4 h-4 text-green-500" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{rec.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">{rec.description}</p>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Özet Kart */}
      <Card className="bg-gradient-primary border-0">
        <CardContent className="p-4">
          <div className="grid grid-cols-2 gap-4 text-primary-foreground">
            <div className="text-center">
              <p className="text-lg font-bold">{formatCurrency(totalIncome)}</p>
              <p className="text-xs opacity-80">Toplam Gelir</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold">{formatCurrency(remainingIncome)}</p>
              <p className="text-xs opacity-80">Kalan Miktar</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};