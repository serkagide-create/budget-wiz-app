import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Trash2, Plus, Target, TrendingUp } from 'lucide-react';

interface SavingGoal {
  id: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  category: 'house' | 'car' | 'vacation' | 'education' | 'other';
  deadline: string;
}

interface SavingsManagerProps {
  savingGoals: SavingGoal[];
  setSavingGoals: (goals: SavingGoal[]) => void;
  toast: (props: { title: string; description: string }) => void;
}

const formatCurrency = (amount: number): string => {
  const formatted = new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
  return formatted.replace('₺', '').trim() + ' ₺';
};

const categoryLabels = {
  house: 'Ev',
  car: 'Araba',
  vacation: 'Tatil',
  education: 'Eğitim',
  other: 'Diğer'
};

export const SavingsManager: React.FC<SavingsManagerProps> = ({ savingGoals, setSavingGoals, toast }) => {
  const [newGoal, setNewGoal] = useState<Partial<SavingGoal>>({
    title: '',
    targetAmount: 0,
    currentAmount: 0,
    category: 'other',
    deadline: '',
  });

  const addGoal = () => {
    if (!newGoal.title || !newGoal.targetAmount || newGoal.targetAmount <= 0 || !newGoal.deadline) {
      toast({
        title: 'Hata',
        description: 'Lütfen tüm alanları doldurun ve geçerli bir hedef tutar girin.',
      });
      return;
    }

    const goal: SavingGoal = {
      id: Date.now().toString(),
      title: newGoal.title!,
      targetAmount: newGoal.targetAmount!,
      currentAmount: newGoal.currentAmount || 0,
      category: newGoal.category as SavingGoal['category'],
      deadline: newGoal.deadline!,
    };

    setSavingGoals([...savingGoals, goal]);
    setNewGoal({
      title: '',
      targetAmount: 0,
      currentAmount: 0,
      category: 'other',
      deadline: '',
    });

    toast({
      title: 'Başarılı',
      description: 'Tasarruf hedefi başarıyla eklendi.',
    });
  };

  const deleteGoal = (id: string) => {
    setSavingGoals(savingGoals.filter(goal => goal.id !== id));
    toast({
      title: 'Başarılı',
      description: 'Tasarruf hedefi başarıyla silindi.',
    });
  };

  const addContribution = (goalId: string, amount: number) => {
    if (amount <= 0) {
      toast({
        title: 'Hata',
        description: 'Geçerli bir katkı tutarı girin.',
      });
      return;
    }

    const updatedGoals = savingGoals.map(goal => {
      if (goal.id === goalId) {
        const newCurrentAmount = Math.min(goal.currentAmount + amount, goal.targetAmount);
        return { ...goal, currentAmount: newCurrentAmount };
      }
      return goal;
    });

    setSavingGoals(updatedGoals);
    toast({
      title: 'Başarılı',
      description: 'Katkı başarıyla eklendi.',
    });
  };

  const totalTarget = savingGoals.reduce((sum, goal) => sum + goal.targetAmount, 0);
  const totalCurrent = savingGoals.reduce((sum, goal) => sum + goal.currentAmount, 0);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-blue-500" />
            Yeni Tasarruf Hedefi Ekle
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="goal-title">Hedef Adı</Label>
              <Input
                id="goal-title"
                placeholder="Örn: Yeni araba, Tatil"
                value={newGoal.title}
                onChange={(e) => setNewGoal({ ...newGoal, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="goal-target">Hedef Tutar (₺)</Label>
              <Input
                id="goal-target"
                type="number"
                placeholder="0"
                value={newGoal.targetAmount || ''}
                onChange={(e) => setNewGoal({ ...newGoal, targetAmount: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="goal-current">Mevcut Tutar (₺)</Label>
              <Input
                id="goal-current"
                type="number"
                placeholder="0"
                value={newGoal.currentAmount || ''}
                onChange={(e) => setNewGoal({ ...newGoal, currentAmount: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="goal-category">Kategori</Label>
              <Select
                value={newGoal.category}
                onValueChange={(value) => setNewGoal({ ...newGoal, category: value as SavingGoal['category'] })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Kategori seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="house">Ev</SelectItem>
                  <SelectItem value="car">Araba</SelectItem>
                  <SelectItem value="vacation">Tatil</SelectItem>
                  <SelectItem value="education">Eğitim</SelectItem>
                  <SelectItem value="other">Diğer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="goal-deadline">Hedef Tarihi</Label>
              <Input
                id="goal-deadline"
                type="date"
                value={newGoal.deadline}
                onChange={(e) => setNewGoal({ ...newGoal, deadline: e.target.value })}
              />
            </div>
          </div>
          <Button onClick={addGoal} className="w-full">
            <Plus className="w-4 h-4 mr-2" />
            Hedef Ekle
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tasarruf Hedefleri</CardTitle>
          <div className="text-sm text-muted-foreground space-y-1">
            <p>Toplam Hedef: <span className="font-bold text-blue-600">{formatCurrency(totalTarget)}</span></p>
            <p>Toplam Biriken: <span className="font-bold text-green-600">{formatCurrency(totalCurrent)}</span></p>
            <p>Kalan: <span className="font-bold text-orange-600">{formatCurrency(totalTarget - totalCurrent)}</span></p>
          </div>
        </CardHeader>
        <CardContent>
          {savingGoals.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Henüz tasarruf hedefi eklenmemiş. Yukarıdaki formdan hedef ekleyebilirsiniz.
            </p>
          ) : (
            <div className="space-y-4">
              {savingGoals.map((goal) => {
                const progressPercentage = (goal.currentAmount / goal.targetAmount) * 100;
                const isCompleted = goal.currentAmount >= goal.targetAmount;
                const remainingAmount = goal.targetAmount - goal.currentAmount;

                return (
                  <SavingGoalCard
                    key={goal.id}
                    goal={goal}
                    progressPercentage={progressPercentage}
                    isCompleted={isCompleted}
                    remainingAmount={remainingAmount}
                    onAddContribution={addContribution}
                    onDelete={deleteGoal}
                  />
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

interface SavingGoalCardProps {
  goal: SavingGoal;
  progressPercentage: number;
  isCompleted: boolean;
  remainingAmount: number;
  onAddContribution: (goalId: string, amount: number) => void;
  onDelete: (goalId: string) => void;
}

const SavingGoalCard: React.FC<SavingGoalCardProps> = ({
  goal,
  progressPercentage,
  isCompleted,
  remainingAmount,
  onAddContribution,
  onDelete,
}) => {
  const [contributionAmount, setContributionAmount] = useState<number>(0);

  const handleAddContribution = () => {
    if (contributionAmount > 0) {
      onAddContribution(goal.id, contributionAmount);
      setContributionAmount(0);
    }
  };

  return (
    <Card className={`border-l-4 ${isCompleted ? 'border-l-green-500' : 'border-l-blue-500'}`}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <CardTitle className="text-lg">{goal.title}</CardTitle>
            <div className="text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                {categoryLabels[goal.category]} • Hedef tarih: {goal.deadline}
              </span>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onDelete(goal.id)}
            className="text-red-600 hover:text-red-700"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>İlerleme</span>
            <span>{Math.round(progressPercentage)}%</span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
        </div>
        
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Hedef</p>
            <p className="font-semibold">{formatCurrency(goal.targetAmount)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Biriken</p>
            <p className="font-semibold text-green-600">{formatCurrency(goal.currentAmount)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Kalan</p>
            <p className="font-semibold text-blue-600">{formatCurrency(remainingAmount)}</p>
          </div>
        </div>

        {!isCompleted && (
          <div className="flex gap-2">
            <Input
              type="number"
              placeholder="Katkı tutarı"
              value={contributionAmount || ''}
              onChange={(e) => setContributionAmount(Number(e.target.value))}
              className="flex-1"
            />
            <Button onClick={handleAddContribution} disabled={contributionAmount <= 0}>
              <TrendingUp className="w-4 h-4 mr-1" />
              Katkı Ekle
            </Button>
          </div>
        )}

        {isCompleted && (
          <div className="text-center p-2 bg-green-50 text-green-700 rounded-md">
            🎉 Bu hedef tamamlanmıştır!
          </div>
        )}
      </CardContent>
    </Card>
  );
};