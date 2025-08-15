import React from 'react';
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

export const DebtAccordion: React.FC<DebtAccordionProps> = ({
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
  return (
    <Accordion type="multiple" className="space-y-2">
      {sortedDebts.map((debt, index) => {
        const totalPaid = debt.payments.reduce((sum: number, payment: any) => sum + payment.amount, 0);
        const remaining = debt.totalAmount - totalPaid;
        const progress = (totalPaid / debt.totalAmount) * 100;
        const daysLeft = getDaysUntilDue(debt.dueDate);
        
        let isWarning = false;
        let warningText = '';
        
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

        return (
          <AccordionItem key={debt.id} value={debt.id} className={`border rounded-lg ${isWarning ? 'border-destructive' : 'border-border'}`}>
            <AccordionTrigger className="hover:no-underline px-4 py-3">
              <div className="flex items-center justify-between w-full mr-2">
                <div className="flex items-center gap-3">
                  <div className="text-primary text-lg">
                    {getDebtCategoryIcon(debt.category || 'other')}
                  </div>
                  <div className={`flex items-center gap-1 text-xs px-2 py-1 rounded ${
                    index === 0 ? 'bg-primary/20 text-primary font-medium' : 
                    index === 1 ? 'bg-secondary/50 text-secondary-foreground' :
                    'bg-muted/30 text-muted-foreground'
                  }`}>
                    {index === 0 ? '🎯 #1' : `#${index + 1}`}
                  </div>
                  <div className="text-left">
                    <h3 className="font-medium">{debt.description}</h3>
                    <p className="text-sm text-muted-foreground">
                      Kalan: {formatCurrency(remaining)} • {progress.toFixed(0)}% tamamlandı
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isWarning && (
                    <Badge variant="destructive" className="text-xs">
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      {warningText}
                    </Badge>
                  )}
                  {progress >= 100 ? (
                    <Badge className="bg-green-100 text-green-800">
                      ✅ Tamamlandı
                    </Badge>
                  ) : (
                    <Button 
                      onClick={(e) => {
                        e.stopPropagation();
                        payInstallment(debt.id);
                      }} 
                      variant="outline"
                      size="sm"
                    >
                      {formatCurrency(Math.min(Math.ceil(debt.totalAmount / debt.installmentCount), remaining))} Öde
                    </Button>
                  )}
                </div>
              </div>
            </AccordionTrigger>
            
            <AccordionContent className="px-4 pb-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>İlerleme ({progress.toFixed(0)}%)</span>
                    <span>{formatCurrency(totalPaid)} / {formatCurrency(debt.totalAmount)}</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Son Ödeme Tarihi</p>
                    <p className="font-medium">{formatDate(debt.dueDate)}</p>
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
};