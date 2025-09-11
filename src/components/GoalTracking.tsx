import React, { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import { Trophy, Target, Calendar, TrendingUp, Clock, CheckCircle, Home, Car, Gift, Briefcase } from 'lucide-react';
import { formatCurrency, formatDate, getDaysUntilDue } from '@/lib/utils';
import { SavingGoalAccordion } from './SavingGoalAccordion';
import { supabase } from '@/integrations/supabase/client';
import { useFinancialData } from '@/hooks/useFinancialData';
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
  const { savingGoals, updateSavingGoal, deleteSavingGoal: removeSavingGoal } = useFinancialData();
  
  const monthlySavings = (monthlyIncome * savingsPercentage) / 100;

  // Load saving goals with contributions
  const syncGoalsWithContributions = useCallback(async () => {
    try {
      if (!savingGoals || savingGoals.length === 0) {
        setSavingGoalsData([]);
        return;
      }
      // Map hook goals to local shape first (without contributions)
      const baseGoals = savingGoals.map(g => ({
        id: g.id,
        title: g.title,
        target_amount: g.targetAmount,
        current_amount: g.currentAmount,
        deadline: g.deadline,
        category: g.category,
        contributions: [] as Array<{ id: string; amount: number; date: string; description?: string }>
      }));
      setSavingGoalsData(baseGoals);

      const goalIds = savingGoals.map(g => g.id);
      const { data, error } = await supabase
        .from('saving_contributions')
        .select('*')
        .in('saving_goal_id', goalIds)
        .order('date', { ascending: false });
      if (error) throw error;

      const grouped: Record<string, Array<{ id: string; amount: number; date: string; description?: string }>> = {};
      (data || []).forEach((c: any) => {
        const gid = c.saving_goal_id as string;
        if (!grouped[gid]) grouped[gid] = [];
        grouped[gid].push({ id: c.id, amount: Number(c.amount), date: c.date, description: c.description });
      });

      setSavingGoalsData(prev => prev.map(g => ({ ...g, contributions: grouped[g.id] || [] })));
    } catch (error) {
      console.error('Error syncing saving goals:', error);
      toast({ title: 'Hata', description: 'Tasarruf verileri yüklenirken hata oluştu', variant: 'destructive' });
    }
  }, [savingGoals, toast]);

  useEffect(() => {
    syncGoalsWithContributions();
  }, [syncGoalsWithContributions]);

  // Add contribution to saving goal
  const addContribution = useCallback(async (goalId: string, amount: number, originalAmount?: number, originalCurrency?: string) => {
    const tempId = `temp-${Date.now()}`;
    const nowIso = new Date().toISOString();

    // Optimistic UI update
    setSavingGoalsData(prev => prev.map(g => 
      g.id === goalId
        ? {
            ...g,
            current_amount: g.current_amount + amount,
            contributions: [
              { 
                id: tempId, 
                amount, 
                date: nowIso, 
                description: 'Tasarruf katkısı',
                original_amount: originalAmount,
                original_currency: originalCurrency
              },
              ...(g.contributions || [])
            ]
          }
        : g
    ));

    try {
      const insertData: any = {
        saving_goal_id: goalId,
        amount,
        date: nowIso,
        description: 'Tasarruf katkısı'
      };

      // Add currency fields if provided
      if (originalAmount && originalCurrency) {
        insertData.original_amount = originalAmount;
        insertData.original_currency = originalCurrency;
      }

      const { data: inserted, error } = await supabase
        .from('saving_contributions')
        .insert(insertData)
        .select()
        .single();
      if (error) throw error;

      // Sync hook state for current amount
      const goal = savingGoals.find(g => g.id === goalId);
      if (goal) {
        await updateSavingGoal(goalId, { currentAmount: goal.currentAmount + amount });
      }

      // Replace temp with real id
      setSavingGoalsData(prev => prev.map(g => 
        g.id === goalId
          ? {
              ...g,
              contributions: (g.contributions || []).map(c => c.id === tempId ? {
                id: inserted.id,
                amount: Number(inserted.amount),
                date: inserted.date,
                description: inserted.description,
                original_amount: (inserted as any).original_amount ? Number((inserted as any).original_amount) : undefined,
                original_currency: (inserted as any).original_currency
              } : c)
            }
          : g
      ));

      toast({ title: 'Başarılı', description: `${formatCurrency(amount)} tasarrufa eklendi` });
    } catch (error) {
      console.error('Error adding contribution:', error);
      // Rollback optimistic change
      setSavingGoalsData(prev => prev.map(g => 
        g.id === goalId
          ? {
              ...g,
              current_amount: Math.max(0, g.current_amount - amount),
              contributions: (g.contributions || []).filter(c => c.id !== tempId)
            }
          : g
      ));
      toast({ title: 'Hata', description: 'Katkı eklenirken hata oluştu', variant: 'destructive' });
    }
  }, [savingGoals, updateSavingGoal, toast]);

  // Delete contribution
  const deleteContribution = useCallback(async (contributionId: string) => {
    // Find parent goal and amount locally to avoid extra fetch
    const parentGoal = savingGoalsData.find(g => (g.contributions || []).some(c => c.id === contributionId));
    const contribution = parentGoal?.contributions?.find(c => c.id === contributionId);
    if (!parentGoal || !contribution) return;

    // Optimistic UI update
    setSavingGoalsData(prev => prev.map(g =>
      g.id === parentGoal.id
        ? {
            ...g,
            current_amount: Math.max(0, g.current_amount - contribution.amount),
            contributions: (g.contributions || []).filter(c => c.id !== contributionId)
          }
        : g
    ));

    try {
      const { error } = await supabase
        .from('saving_contributions')
        .delete()
        .eq('id', contributionId);
      if (error) throw error;

      // Sync hook state
      const hookGoal = savingGoals.find(g => g.id === parentGoal.id);
      if (hookGoal) {
        await updateSavingGoal(parentGoal.id, { currentAmount: Math.max(0, hookGoal.currentAmount - contribution.amount) });
      }

      toast({ title: 'Başarılı', description: 'Katkı silindi', variant: 'default' });
    } catch (error) {
      console.error('Error deleting contribution:', error);
      // Rollback optimistic change
      setSavingGoalsData(prev => prev.map(g =>
        g.id === parentGoal.id
          ? {
              ...g,
              current_amount: g.current_amount + contribution.amount,
              contributions: [{ ...contribution }, ...(g.contributions || [])]
            }
          : g
      ));
      toast({ title: 'Hata', description: 'Katkı silinirken hata oluştu', variant: 'destructive' });
    }
  }, [savingGoalsData, savingGoals, updateSavingGoal, toast]);

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

      await syncGoalsWithContributions();
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
  }, [editingGoalId, editGoalForm, syncGoalsWithContributions, toast]);

  const handleCancelGoalEdit = useCallback(() => {
    setEditingGoalId(null);
    setEditGoalForm({});
  }, []);

  // Delete saving goal
  const deleteGoal = useCallback(async (goalId: string) => {
    try {
      await removeSavingGoal(goalId);
      setSavingGoalsData(prev => prev.filter(g => g.id !== goalId));
      toast({ title: 'Başarılı', description: 'Tasarruf hedefi silindi', variant: 'default' });
    } catch (error) {
      console.error('Error deleting goal:', error);
      toast({ title: 'Hata', description: 'Hedef silinirken hata oluştu', variant: 'destructive' });
    }
  }, [removeSavingGoal, toast]);

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