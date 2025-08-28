import React, { memo, useMemo } from 'react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, Check, Edit, Trash2 } from 'lucide-react';
import { formatCurrency, formatDate, getDaysUntilDue } from '@/lib/utils';

interface DebtAccordionProps {
  debts: any[];
  sortedDebts: any[];
  editingDebtId: string | null;
  editDebtForm: any;
  paymentForms: Record<string, string>;
  getDebtCategoryIcon: (category: string) => JSX.Element;
  setEditDebtForm: (form: any) => void;
  setPaymentForms: (forms: any) => void;
  handleEditDebt: (debt: any) => void;
  handleSaveDebtEdit: () => void;
  handleCancelDebtEdit: () => void;
  payInstallment: (debtId: string) => void;
  makeCustomPayment: (debtId: string, amount: number) => void;
  deleteDebt: (debtId: string) => void;
}

export const DebtAccordion: React.FC<DebtAccordionProps> = memo(({
  debts,
  sortedDebts,
  editingDebtId,
  editDebtForm,
  paymentForms,
  getDebtCategoryIcon,
  setEditDebtForm,
  setPaymentForms,
  handleEditDebt,
  handleSaveDebtEdit,
  handleCancelDebtEdit,
  payInstallment,
  makeCustomPayment,
  deleteDebt
}) => {
  const debtItems = useMemo(() => 
    sortedDebts.map((debt, index) => {
      const totalPaid = debt.payments.reduce((sum: number, payment: any) => sum + payment.amount, 0);
      const remaining = debt.totalAmount - totalPaid;
      const progress = (totalPaid / debt.totalAmount) * 100;
      
      // Gecikme kontrolü için nextPaymentDate kullan, yoksa dueDate kullan
      const paymentDateToCheck = debt.nextPaymentDate || debt.dueDate;
      const daysLeft = getDaysUntilDue(paymentDateToCheck);
      
      // Sonraki ödeme tarihi hesapla
      const nextPaymentDate = debt.nextPaymentDate ? 
        formatDate(debt.nextPaymentDate) : 
        formatDate(debt.dueDate);
      
      let isWarning = false;
      let warningText = '';
      
      // Borç tamamlanmadıysa gecikme kontrolü yap
      if (progress < 100) {
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
      }
      
      return { debt, index, totalPaid, remaining, progress, daysLeft, isWarning, warningText, nextPaymentDate };
    }), [sortedDebts]
  );

  return (
    <Accordion type="multiple" className="space-y-4">
      {debtItems.map(({ debt, index, totalPaid, remaining, progress, daysLeft, isWarning, warningText, nextPaymentDate }) => {

        return (
          <AccordionItem key={debt.id} value={debt.id} className={`
            border-2 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300
            ${isWarning 
              ? 'border-destructive border-destructive/80 bg-gradient-to-br from-destructive/15 to-destructive/5 shadow-destructive/30' 
              : index % 2 === 0 
                ? 'border-primary border-primary/40 bg-gradient-to-br from-card to-muted/30 shadow-primary/10' 
                : 'border-secondary border-secondary/40 bg-gradient-to-br from-muted/50 to-card shadow-secondary/10'
            } 
            overflow-hidden mb-4 backdrop-blur-sm
          `}>
            <AccordionTrigger className="hover:no-underline p-0">
              <div className="w-full">
                {/* Header with debt name */}
                <div className="bg-muted/30 px-4 py-2 border-b">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`text-xs px-2 py-1 rounded-full ${
                        index === 0 ? 'bg-primary text-primary-foreground' : 
                        index === 1 ? 'bg-secondary text-secondary-foreground' :
                        'bg-muted text-muted-foreground'
                      }`}>
                        {index === 0 ? '🎯 #1' : `#${index + 1}`}
                      </div>
                      <div className="text-primary">
                        {getDebtCategoryIcon(debt.category || 'other')}
                      </div>
                      <h3 className="font-semibold text-foreground">{debt.description}</h3>
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
                          <span className="font-bold text-expense ml-1">
                            {formatCurrency(remaining)}
                            {debt.currency && debt.currency !== 'TRY' && (
                              <span className="text-xs text-muted-foreground ml-1">
                                ({debt.originalAmount && formatCurrency((remaining / debt.totalAmount) * debt.originalAmount)} {debt.currency})
                              </span>
                            )}
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
                            payInstallment(debt.id);
                          }} 
                          className="px-3 py-1.5 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer transition-colors"
                        >
                          {formatCurrency(Math.min(Math.ceil(debt.totalAmount / debt.installmentCount), remaining))} Öde
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
                      {formatCurrency(totalPaid)} / {formatCurrency(debt.totalAmount)}
                      {debt.currency && debt.currency !== 'TRY' && debt.originalAmount && (
                        <span className="text-xs text-muted-foreground ml-1">
                          ({formatCurrency((totalPaid / debt.totalAmount) * debt.originalAmount)} / {formatCurrency(debt.originalAmount)} {debt.currency})
                        </span>
                      )}
                    </span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Sonraki Ödeme Tarihi</p>
                    <p className="font-medium">{nextPaymentDate}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Taksit Sayısı</p>
                    <p className="font-medium">{debt.installmentCount} taksit</p>
                  </div>
                </div>

                {editingDebtId === debt.id && (
                  <div className="space-y-3 p-3 bg-muted/30 rounded-lg">
                    <Input
                      value={editDebtForm.description}
                      onChange={(e) => setEditDebtForm(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Borç açıklaması"
                    />
                    <div className="grid grid-cols-3 gap-2">
                      <Input
                        type="number"
                        placeholder="Tutar"
                        value={editDebtForm.totalAmount}
                        onChange={(e) => setEditDebtForm(prev => ({ ...prev, totalAmount: e.target.value }))}
                      />
                      <Input
                        type="date"
                        value={editDebtForm.dueDate}
                        onChange={(e) => setEditDebtForm(prev => ({ ...prev, dueDate: e.target.value }))}
                      />
                      <Input
                        type="number"
                        placeholder="Taksit"
                        value={editDebtForm.installmentCount}
                        onChange={(e) => setEditDebtForm(prev => ({ ...prev, installmentCount: e.target.value }))}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button variant="default" size="sm" onClick={handleSaveDebtEdit}>
                        <Check className="w-4 h-4 mr-1" />
                        Kaydet
                      </Button>
                      <Button variant="outline" size="sm" onClick={handleCancelDebtEdit}>
                        İptal
                      </Button>
                    </div>
                  </div>
                )}

                {progress < 100 && (
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <Button 
                        onClick={() => payInstallment(debt.id)} 
                        variant="default"
                        size="sm"
                        className="flex-1"
                      >
                        Taksit Öde ({formatCurrency(Math.min(Math.ceil(debt.totalAmount / debt.installmentCount), remaining))})
                      </Button>
                    </div>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Özel tutar girin"
                        type="number"
                        value={paymentForms[debt.id] || ''}
                        onChange={(e) => setPaymentForms(prev => ({ ...prev, [debt.id]: e.target.value }))}
                        className="flex-1"
                      />
                      <Button 
                        onClick={() => {
                          const amount = parseFloat(paymentForms[debt.id] || '0');
                          if (amount > 0) {
                            makeCustomPayment(debt.id, amount);
                            setPaymentForms(prev => ({ ...prev, [debt.id]: '' }));
                          }
                        }} 
                        size="sm"
                        disabled={!paymentForms[debt.id] || parseFloat(paymentForms[debt.id] || '0') <= 0}
                      >
                        Öde
                      </Button>
                    </div>
                  </div>
                )}

                {debt.payments.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">
                      Ödeme Geçmişi ({debt.payments.length}/{debt.installmentCount})
                    </p>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {debt.payments.map((payment: any) => (
                        <div key={payment.id} className="flex justify-between items-center text-xs bg-secondary/30 p-2 rounded">
                          <div className="flex items-center gap-2">
                            <Check className="w-3 h-3 text-green-500" />
                            <span className="font-medium">{formatCurrency(payment.amount)}</span>
                            <span className="text-muted-foreground">
                              {new Date(payment.date).toLocaleDateString('tr-TR')}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-2 pt-2 border-t">
                  {editingDebtId !== debt.id && (
                    <>
                      <Button variant="outline" size="sm" onClick={() => handleEditDebt(debt)}>
                        <Edit className="w-4 h-4 mr-1" />
                        Düzenle
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteDebt(debt.id)}
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