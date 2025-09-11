import React, { memo, useMemo } from 'react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, Check, Edit, Trash2, X, Target, Plus } from 'lucide-react';
import { formatCurrency, formatDate, getDaysUntilDue } from '@/lib/utils';

interface SavingContribution {
  id: string;
  amount: number;
  date: string;
  description?: string;
}

interface SavingGoal {
  id: string;
  title: string;
  target_amount: number;
  current_amount: number;
  deadline: string;
  category: string;
  contributions?: SavingContribution[];
}

interface SavingGoalAccordionProps {
  savingGoals: SavingGoal[];
  editingGoalId: string | null;
  editGoalForm: any;
  contributionForms: Record<string, string>;
  getSavingCategoryIcon: (category: string) => JSX.Element;
  setEditGoalForm: (form: any) => void;
  setContributionForms: (forms: any) => void;
  handleEditGoal: (goal: any) => void;
  handleSaveGoalEdit: () => void;
  handleCancelGoalEdit: () => void;
  addContribution: (goalId: string, amount: number) => void;
  deleteGoal: (goalId: string) => void;
  deleteContribution: (contributionId: string) => void;
}

export const SavingGoalAccordion: React.FC<SavingGoalAccordionProps> = memo(({
  savingGoals,
  editingGoalId,
  editGoalForm,
  contributionForms,
  getSavingCategoryIcon,
  setEditGoalForm,
  setContributionForms,
  handleEditGoal,
  handleSaveGoalEdit,
  handleCancelGoalEdit,
  addContribution,
  deleteGoal,
  deleteContribution
}) => {
  const goalItems = useMemo(() => 
    savingGoals.map((goal, index) => {
      const progress = (goal.current_amount / goal.target_amount) * 100;
      const remaining = goal.target_amount - goal.current_amount;
      const daysLeft = getDaysUntilDue(goal.deadline);
      
      let isWarning = false;
      let warningText = '';
      
      // Hedef tamamlanmadıysa gecikme kontrolü yap
      if (progress < 100) {
        if (daysLeft < 0) {
          isWarning = true;
          warningText = `${Math.abs(daysLeft)} gün gecikmiş!`;
        } else if (daysLeft === 0) {
          isWarning = true;
          warningText = 'Son gün!';
        } else if (daysLeft <= 30) {
          isWarning = true;
          warningText = `${daysLeft} gün kaldı!`;
        }
      }
      
      return { goal, index, progress, remaining, daysLeft, isWarning, warningText };
    }), [savingGoals]
  );

  return (
    <Accordion type="multiple" className="space-y-4">
      {goalItems.map(({ goal, index, progress, remaining, daysLeft, isWarning, warningText }) => {
        return (
          <AccordionItem key={goal.id} value={goal.id} className={`
            border-2 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300
            ${isWarning 
              ? 'border-warning border-warning/80 bg-gradient-to-br from-warning/15 to-warning/5 shadow-warning/30' 
              : index % 2 === 0 
                ? 'border-savings border-savings/40 bg-gradient-to-br from-card to-muted/30 shadow-savings/10' 
                : 'border-secondary border-secondary/40 bg-gradient-to-br from-muted/50 to-card shadow-secondary/10'
            } 
            overflow-hidden mb-4 backdrop-blur-sm
          `}>
            <AccordionTrigger className="hover:no-underline p-0">
              <div className="w-full">
                {/* Header with goal name */}
                <div className="bg-muted/30 px-4 py-2 border-b">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`text-xs px-2 py-1 rounded-full ${
                        index === 0 ? 'bg-savings text-savings-foreground' : 
                        index === 1 ? 'bg-secondary text-secondary-foreground' :
                        'bg-muted text-muted-foreground'
                      }`}>
                        {index === 0 ? '🎯 #1' : `#${index + 1}`}
                      </div>
                      <div className="text-savings">
                        {getSavingCategoryIcon(goal.category || 'other')}
                      </div>
                      <h3 className="font-semibold text-foreground">{goal.title}</h3>
                    </div>
                    {isWarning && (
                      <Badge variant="destructive" className="text-xs">
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        {warningText}
                      </Badge>
                    )}
                  </div>
                </div>
                
                {/* Content with progress and action */}
                <div className="px-4 py-3">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-4">
                        <div className="text-sm">
                          <span className="text-muted-foreground">Kalan:</span>
                          <span className="font-bold text-warning ml-1">
                            {formatCurrency(remaining)}
                          </span>
                        </div>
                        <div className="flex-1 max-w-32">
                          <div className="flex justify-between text-xs text-muted-foreground mb-1">
                            <span>{progress.toFixed(0)}%</span>
                          </div>
                          <Progress value={progress} className="h-1.5" />
                        </div>
                      </div>
                    </div>
                    
                    <div className="ml-4">
                      {progress >= 100 ? (
                        <Badge className="bg-income text-income-foreground">
                          ✅ Tamamlandı
                        </Badge>
                      ) : (
                        <div 
                          onClick={(e) => {
                            e.stopPropagation();
                            // Varsayılan katkı tutarı olarak hedefin %5'i
                            const defaultAmount = Math.min(500, Math.ceil(goal.target_amount * 0.05));
                            addContribution(goal.id, defaultAmount);
                          }} 
                          className="px-3 py-1.5 text-sm font-medium rounded-md bg-savings text-savings-foreground hover:bg-savings/90 cursor-pointer transition-colors"
                        >
                          <Plus className="w-3 h-3 mr-1 inline" />
                          Ekle
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </AccordionTrigger>
            
            <AccordionContent className="px-4 pb-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>İlerleme ({progress.toFixed(0)}%)</span>
                    <span>
                      {formatCurrency(goal.current_amount)} / {formatCurrency(goal.target_amount)}
                    </span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Hedef Tarih</p>
                    <p className="font-medium">{formatDate(goal.deadline)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Kategori</p>
                    <p className="font-medium capitalize">{goal.category}</p>
                  </div>
                </div>

                {editingGoalId === goal.id && (
                  <div className="space-y-3 p-3 bg-muted/30 rounded-lg">
                    <Input
                      value={editGoalForm.title}
                      onChange={(e) => setEditGoalForm(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Hedef adı"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        type="number"
                        placeholder="Hedef tutar"
                        value={editGoalForm.target_amount}
                        onChange={(e) => setEditGoalForm(prev => ({ ...prev, target_amount: e.target.value }))}
                      />
                      <Input
                        type="date"
                        value={editGoalForm.deadline}
                        onChange={(e) => setEditGoalForm(prev => ({ ...prev, deadline: e.target.value }))}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button variant="default" size="sm" onClick={handleSaveGoalEdit}>
                        <Check className="w-4 h-4 mr-1" />
                        Kaydet
                      </Button>
                      <Button variant="outline" size="sm" onClick={handleCancelGoalEdit}>
                        İptal
                      </Button>
                    </div>
                  </div>
                )}

                {progress < 100 && (
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Katkı miktarı girin"
                        type="number"
                        value={contributionForms[goal.id] || ''}
                        onChange={(e) => setContributionForms(prev => ({ ...prev, [goal.id]: e.target.value }))}
                        className="flex-1"
                      />
                      <Button 
                        onClick={() => {
                          const amount = parseFloat(contributionForms[goal.id] || '0');
                          if (amount > 0) {
                            addContribution(goal.id, amount);
                            setContributionForms(prev => ({ ...prev, [goal.id]: '' }));
                          }
                        }} 
                        size="sm"
                        disabled={!contributionForms[goal.id] || parseFloat(contributionForms[goal.id] || '0') <= 0}
                        className="bg-savings text-savings-foreground hover:bg-savings/90"
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        Ekle
                      </Button>
                    </div>
                  </div>
                )}

                {goal.contributions && goal.contributions.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">
                      Katkı Geçmişi ({(goal.contributions || []).length} katkı)
                    </p>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {(goal.contributions || []).map((contribution: SavingContribution) => (
                        <div key={contribution.id} className="flex justify-between items-center text-xs bg-savings/10 p-2 rounded">
                          <div className="flex items-center gap-2">
                            <Target className="w-3 h-3 text-savings" />
                            <span className="font-medium">{formatCurrency(contribution.amount)}</span>
                            <span className="text-muted-foreground">
                              {new Date(contribution.date).toLocaleDateString('tr-TR')}
                            </span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteContribution(contribution.id);
                            }}
                            className="h-6 w-6 p-0 hover:bg-destructive/10 hover:text-destructive"
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-2 pt-2 border-t">
                  {editingGoalId !== goal.id && (
                    <>
                      <Button variant="outline" size="sm" onClick={() => handleEditGoal(goal)}>
                        <Edit className="w-4 h-4 mr-1" />
                        Düzenle
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteGoal(goal.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Sil
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
});

SavingGoalAccordion.displayName = 'SavingGoalAccordion';