import React, { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import { Trophy, Target, Calendar, TrendingUp, Clock, CheckCircle, Home, Car, Gift, Briefcase } from 'lucide-react';
import { formatCurrency, formatDate, getDaysUntilDue } from '@/lib/utils';
import { SavingGoalAccordion } from './SavingGoalAccordion';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import 'react-circular-progressbar/dist/styles.css';

interface SavingGoal {
  id: string;
  title: string;
  target_amount: number;
  current_amount: number;
  deadline: string;
  category: string;
  contributions?: Array<{ 
    id: string;
    amount: number; 
    date: string; 
    description?: string;
  }>;
}

interface Debt {
  id: string;
  description: string;
  totalAmount: number;
  payments: Array<{ amount: number; date: string }>;
}

interface GoalTrackingProps {
  debts: Debt[];
  monthlyIncome: number;
  savingsPercentage: number;
}

export const GoalTracking: React.FC<GoalTrackingProps> = ({
  debts,
  monthlyIncome,
  savingsPercentage
}) => {
  const [savingGoalsData, setSavingGoalsData] = useState<SavingGoal[]>([]);
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [editGoalForm, setEditGoalForm] = useState<any>({});
  const [contributionForms, setContributionForms] = useState<Record<string, string>>({});
  const { toast } = useToast();
  
  const monthlySavings = (monthlyIncome * savingsPercentage) / 100;

  // Load saving goals with contributions
  const loadSavingGoals = useCallback(async () => {
    try {
      const { data: goals, error: goalsError } = await supabase
        .from('saving_goals')
        .select('*')
        .order('created_at', { ascending: false });

      if (goalsError) throw goalsError;

      if (goals) {
        // Load contributions for each goal
        const goalsWithContributions = await Promise.all(
          goals.map(async (goal) => {
            const { data: contributions, error: contribError } = await supabase
              .from('saving_contributions')
              .select('*')
              .eq('saving_goal_id', goal.id)
              .order('date', { ascending: false });

            if (contribError) console.error('Contributions error:', contribError);

            return {
              ...goal,
              contributions: contributions || []
            };
          })
        );

        setSavingGoalsData(goalsWithContributions);
      }
    } catch (error) {
      console.error('Error loading saving goals:', error);
      toast({
        title: 'Hata',
        description: 'Tasarruf hedefleri yüklenirken hata oluştu',
        variant: 'destructive'
      });
    }
  }, [toast]);

  useEffect(() => {
    loadSavingGoals();
  }, [loadSavingGoals]);

  // Add contribution to saving goal
  const addContribution = useCallback(async (goalId: string, amount: number) => {
    try {
      const { error } = await supabase
        .from('saving_contributions')
        .insert({
          saving_goal_id: goalId,
          amount,
          date: new Date().toISOString(),
          description: 'Tasarruf katkısı'
        });

      if (error) throw error;

      // Update saving goal current amount
      const goal = savingGoalsData.find(g => g.id === goalId);
      if (goal) {
        const { error: updateError } = await supabase
          .from('saving_goals')
          .update({
            current_amount: goal.current_amount + amount
          })
          .eq('id', goalId);

        if (updateError) throw updateError;
      }

      await loadSavingGoals();
      
      toast({
        title: 'Başarılı',
        description: `${formatCurrency(amount)} tasarrufa eklendi`,
        variant: 'default'
      });
    } catch (error) {
      console.error('Error adding contribution:', error);
      toast({
        title: 'Hata',
        description: 'Katkı eklenirken hata oluştu',
        variant: 'destructive'
      });
    }
  }, [savingGoalsData, loadSavingGoals, toast]);

  // Delete contribution
  const deleteContribution = useCallback(async (contributionId: string) => {
    try {
      // Get contribution details first
      const { data: contribution, error: getError } = await supabase
        .from('saving_contributions')
        .select('*, saving_goal_id')
        .eq('id', contributionId)
        .single();

      if (getError) throw getError;

      // Delete contribution
      const { error: deleteError } = await supabase
        .from('saving_contributions')
        .delete()
        .eq('id', contributionId);

      if (deleteError) throw deleteError;

      // Update saving goal current amount
      const goal = savingGoalsData.find(g => g.id === contribution.saving_goal_id);
      if (goal) {
        const { error: updateError } = await supabase
          .from('saving_goals')
          .update({
            current_amount: Math.max(0, goal.current_amount - contribution.amount)
          })
          .eq('id', contribution.saving_goal_id);

        if (updateError) throw updateError;
      }

      await loadSavingGoals();
      
      toast({
        title: 'Başarılı',
        description: 'Katkı silindi',
        variant: 'default'
      });
    } catch (error) {
      console.error('Error deleting contribution:', error);
      toast({
        title: 'Hata',
        description: 'Katkı silinirken hata oluştu',
        variant: 'destructive'
      });
    }
  }, [savingGoalsData, loadSavingGoals, toast]);

  // Edit saving goal
  const handleEditGoal = useCallback((goal: SavingGoal) => {
    setEditingGoalId(goal.id);
    setEditGoalForm({
      title: goal.title,
      target_amount: goal.target_amount.toString(),
      deadline: goal.deadline.split('T')[0]
    });
  }, []);

  const handleSaveGoalEdit = useCallback(async () => {
    try {
      if (!editingGoalId) return;

      const { error } = await supabase
        .from('saving_goals')
        .update({
          title: editGoalForm.title,
          target_amount: parseFloat(editGoalForm.target_amount),
          deadline: editGoalForm.deadline
        })
        .eq('id', editingGoalId);

      if (error) throw error;

      await loadSavingGoals();
      setEditingGoalId(null);
      setEditGoalForm({});
      
      toast({
        title: 'Başarılı',
        description: 'Tasarruf hedefi güncellendi',
        variant: 'default'
      });
    } catch (error) {
      console.error('Error updating goal:', error);
      toast({
        title: 'Hata',
        description: 'Hedef güncellenirken hata oluştu',
        variant: 'destructive'
      });
    }
  }, [editingGoalId, editGoalForm, loadSavingGoals, toast]);

  const handleCancelGoalEdit = useCallback(() => {
    setEditingGoalId(null);
    setEditGoalForm({});
  }, []);

  // Delete saving goal
  const deleteGoal = useCallback(async (goalId: string) => {
    try {
      // Delete all contributions first
      const { error: contribError } = await supabase
        .from('saving_contributions')
        .delete()
        .eq('saving_goal_id', goalId);

      if (contribError) throw contribError;

      // Delete the goal
      const { error } = await supabase
        .from('saving_goals')
        .delete()
        .eq('id', goalId);

      if (error) throw error;

      await loadSavingGoals();
      
      toast({
        title: 'Başarılı',
        description: 'Tasarruf hedefi silindi',
        variant: 'default'
      });
    } catch (error) {
      console.error('Error deleting goal:', error);
      toast({
        title: 'Hata',
        description: 'Hedef silinirken hata oluştu',
        variant: 'destructive'
      });
    }
  }, [loadSavingGoals, toast]);

  // Category icons
  const getSavingCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'home': case 'ev': return <Home className="w-4 h-4" />;
      case 'car': case 'araba': return <Car className="w-4 h-4" />;
      case 'vacation': case 'tatil': return <Gift className="w-4 h-4" />;
      case 'education': case 'eğitim': return <Briefcase className="w-4 h-4" />;
      default: return <Target className="w-4 h-4" />;
    }
  };

  // Hedef analizi
  const analyzeGoals = () => {
    return savingGoalsData.map(goal => {
      const progress = (goal.current_amount / goal.target_amount) * 100;
      const remaining = goal.target_amount - goal.current_amount;
      const daysUntilDeadline = getDaysUntilDue(goal.deadline);
      const monthsUntilDeadline = Math.max(1, Math.ceil(daysUntilDeadline / 30));
      
      let status: 'completed' | 'on-track' | 'behind' | 'at-risk' = 'on-track';
      
      if (progress >= 100) {
        status = 'completed';
      } else if (daysUntilDeadline < 0) {
        status = 'at-risk';
      } else {
        const requiredMonthlySavings = remaining / monthsUntilDeadline;
        if (requiredMonthlySavings > monthlySavings * 1.2) {
          status = 'at-risk';
        } else if (requiredMonthlySavings > monthlySavings) {
          status = 'behind';
        }
      }

      return {
        ...goal,
        progress,
        remaining,
        daysUntilDeadline,
        monthsUntilDeadline,
        status,
        requiredMonthlySavings: remaining / Math.max(1, monthsUntilDeadline),
        estimatedCompletionDate: new Date(Date.now() + (remaining / monthlySavings) * 30 * 24 * 60 * 60 * 1000)
      };
    });
  };

  // Borç tamamlanma analizi
  const analyzeDebtProgress = () => {
    return debts.map(debt => {
      const totalPaid = debt.payments.reduce((sum, payment) => sum + payment.amount, 0);
      const progress = (totalPaid / debt.totalAmount) * 100;
      const remaining = debt.totalAmount - totalPaid;
      
      return {
        ...debt,
        totalPaid,
        progress,
        remaining,
        status: progress >= 100 ? 'completed' : 'in-progress'
      };
    });
  };

  // Genel başarı metrikleri
  const calculateOverallMetrics = () => {
    const goalAnalysis = analyzeGoals();
    const debtAnalysis = analyzeDebtProgress();
    
    const completedGoals = goalAnalysis.filter(g => g.status === 'completed').length;
    const totalGoals = goalAnalysis.length;
    const completedDebts = debtAnalysis.filter(d => d.status === 'completed').length;
    const totalDebts = debtAnalysis.length;
    
    const totalSavingsProgress = goalAnalysis.reduce((sum, goal) => sum + goal.progress, 0) / Math.max(1, totalGoals);
    const totalDebtProgress = debtAnalysis.reduce((sum, debt) => sum + debt.progress, 0) / Math.max(1, totalDebts);
    
    return {
      completedGoals,
      totalGoals,
      completedDebts,
      totalDebts,
      savingsProgress: totalSavingsProgress,
      debtProgress: totalDebtProgress,
      overallScore: (totalSavingsProgress + totalDebtProgress) / 2
    };
  };

  const goalAnalysis = analyzeGoals();
  const debtAnalysis = analyzeDebtProgress();
  const metrics = calculateOverallMetrics();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'on-track': return 'bg-blue-100 text-blue-800';
      case 'behind': return 'bg-yellow-100 text-yellow-800';
      case 'at-risk': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'on-track': return <TrendingUp className="w-4 h-4 text-blue-600" />;
      case 'behind': return <Clock className="w-4 h-4 text-yellow-600" />;
      case 'at-risk': return <Target className="w-4 h-4 text-red-600" />;
      default: return <Target className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return 'Tamamlandı';
      case 'on-track': return 'Yolunda';
      case 'behind': return 'Geride';
      case 'at-risk': return 'Risk';
      default: return 'Devam Ediyor';
    }
  };

  return (
    <div className="space-y-4">
      {/* Genel Başarı Özeti */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            Başarı Özeti
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-2">
                <CircularProgressbar
                  value={metrics.savingsProgress}
                  text={`${Math.round(metrics.savingsProgress)}%`}
                  styles={buildStyles({
                    textSize: '20px',
                    pathColor: '#22c55e',
                    textColor: '#22c55e',
                  })}
                />
              </div>
              <p className="text-xs text-muted-foreground">Tasarruf Hedefleri</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-2">
                <CircularProgressbar
                  value={metrics.debtProgress}
                  text={`${Math.round(metrics.debtProgress)}%`}
                  styles={buildStyles({
                    textSize: '20px',
                    pathColor: '#ef4444',
                    textColor: '#ef4444',
                  })}
                />
              </div>
              <p className="text-xs text-muted-foreground">Borç Ödemeleri</p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <p className="text-lg font-bold text-green-600">{metrics.completedGoals}/{metrics.totalGoals}</p>
              <p className="text-xs text-muted-foreground">Tamamlanan Hedef</p>
            </div>
            <div>
              <p className="text-lg font-bold text-red-600">{metrics.completedDebts}/{metrics.totalDebts}</p>
              <p className="text-xs text-muted-foreground">Ödenen Borç</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tasarruf Hedefleri Detayı */}
      {savingGoalsData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              Tasarruf Hedefleri ({savingGoalsData.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <SavingGoalAccordion
              savingGoals={savingGoalsData}
              editingGoalId={editingGoalId}
              editGoalForm={editGoalForm}
              contributionForms={contributionForms}
              getSavingCategoryIcon={getSavingCategoryIcon}
              setEditGoalForm={setEditGoalForm}
              setContributionForms={setContributionForms}
              handleEditGoal={handleEditGoal}
              handleSaveGoalEdit={handleSaveGoalEdit}
              handleCancelGoalEdit={handleCancelGoalEdit}
              addContribution={addContribution}
              deleteGoal={deleteGoal}
              deleteContribution={deleteContribution}
            />
          </CardContent>
        </Card>
      )}

      {/* Borç Takibi */}
      {debtAnalysis.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Borç İlerlemesi ({debtAnalysis.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {debtAnalysis.map((debt) => (
              <div key={debt.id} className="space-y-3 p-3 rounded-lg bg-muted/50">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{debt.description}</span>
                  <Badge className={getStatusColor(debt.status)}>
                    {debt.status === 'completed' ? 'Tamamlandı' : 'Devam Ediyor'}
                  </Badge>
                </div>
                
                <Progress value={debt.progress} className="h-2" />
                
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <p className="text-muted-foreground">Ödenen / Toplam</p>
                    <p className="font-medium">
                      {formatCurrency(debt.totalPaid)} / {formatCurrency(debt.totalAmount)}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Kalan Miktar</p>
                    <p className="font-medium text-red-600">{formatCurrency(debt.remaining)}</p>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Motivasyon Kartı */}
      <Card className="bg-gradient-primary border-0">
        <CardContent className="p-4 text-center">
          <div className="text-primary-foreground">
            <Trophy className="w-8 h-8 mx-auto mb-2" />
            <h3 className="font-bold mb-1">Harika İş Çıkarıyorsunuz! 🎉</h3>
            <p className="text-sm opacity-90">
              Genel ilerlemeniz: %{Math.round(metrics.overallScore)}
            </p>
            <p className="text-xs opacity-80 mt-2">
              Finansal hedeflerinize adım adım yaklaşıyorsunuz!
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Boş Durum */}
      {savingGoalsData.length === 0 && debtAnalysis.length === 0 && (
        <div className="text-center py-8">
          <Target className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground mb-2">Henüz takip edilen hedef yok</p>
          <p className="text-sm text-muted-foreground">
            Tasarruf hedefleri ekleyerek ilerlemenizi takip edebilirsiniz
          </p>
        </div>
      )}
    </div>
  );
};