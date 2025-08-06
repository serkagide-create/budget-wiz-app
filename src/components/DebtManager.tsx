import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Trash2, Plus, CreditCard, Calendar } from 'lucide-react';

interface Payment {
  id: string;
  amount: number;
  date: string;
}

interface Debt {
  id: string;
  description: string;
  totalAmount: number;
  dueDate: string;
  installmentCount: number;
  payments: Payment[];
  monthlyRepeat?: boolean;
}

interface DebtManagerProps {
  debts: Debt[];
  setDebts: (debts: Debt[]) => void;
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

export const DebtManager: React.FC<DebtManagerProps> = ({ debts, setDebts, toast }) => {
  const [newDebt, setNewDebt] = useState<Partial<Debt>>({
    description: '',
    totalAmount: 0,
    dueDate: '',
    installmentCount: 1,
    payments: [],
  });

  const addDebt = () => {
    if (!newDebt.description || !newDebt.totalAmount || newDebt.totalAmount <= 0 || !newDebt.dueDate) {
      toast({
        title: 'Hata',
        description: 'Lütfen tüm alanları doldurun ve geçerli bir tutar girin.',
      });
      return;
    }

    const debt: Debt = {
      id: Date.now().toString(),
      description: newDebt.description!,
      totalAmount: newDebt.totalAmount!,
      dueDate: newDebt.dueDate!,
      installmentCount: newDebt.installmentCount!,
      payments: [],
    };

    setDebts([...debts, debt]);
    setNewDebt({
      description: '',
      totalAmount: 0,
      dueDate: '',
      installmentCount: 1,
      payments: [],
    });

    toast({
      title: 'Başarılı',
      description: 'Borç başarıyla eklendi.',
    });
  };

  const deleteDebt = (id: string) => {
    setDebts(debts.filter(debt => debt.id !== id));
    toast({
      title: 'Başarılı',
      description: 'Borç başarıyla silindi.',
    });
  };

  const addPayment = (debtId: string, amount: number) => {
    if (amount <= 0) {
      toast({
        title: 'Hata',
        description: 'Geçerli bir ödeme tutarı girin.',
      });
      return;
    }

    const updatedDebts = debts.map(debt => {
      if (debt.id === debtId) {
        const totalPaid = debt.payments.reduce((sum, payment) => sum + payment.amount, 0);
        if (totalPaid + amount > debt.totalAmount) {
          toast({
            title: 'Hata',
            description: 'Ödeme tutarı toplam borçtan fazla olamaz.',
          });
          return debt;
        }

        const newPayment: Payment = {
          id: Date.now().toString(),
          amount,
          date: new Date().toISOString().split('T')[0],
        };

        return {
          ...debt,
          payments: [...debt.payments, newPayment],
        };
      }
      return debt;
    });

    setDebts(updatedDebts);
    toast({
      title: 'Başarılı',
      description: 'Ödeme başarıyla eklendi.',
    });
  };

  const totalDebt = debts.reduce((sum, debt) => sum + debt.totalAmount, 0);
  const totalPaid = debts.reduce((sum, debt) => 
    sum + debt.payments.reduce((paymentSum, payment) => paymentSum + payment.amount, 0), 0
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-red-500" />
            Yeni Borç Ekle
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="debt-description">Açıklama</Label>
              <Input
                id="debt-description"
                placeholder="Örn: Kredi kartı, Konut kredisi"
                value={newDebt.description}
                onChange={(e) => setNewDebt({ ...newDebt, description: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="debt-amount">Toplam Tutar (₺)</Label>
              <Input
                id="debt-amount"
                type="number"
                placeholder="0"
                value={newDebt.totalAmount || ''}
                onChange={(e) => setNewDebt({ ...newDebt, totalAmount: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="debt-due-date">Son Ödeme Tarihi</Label>
              <Input
                id="debt-due-date"
                type="date"
                value={newDebt.dueDate}
                onChange={(e) => setNewDebt({ ...newDebt, dueDate: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="installment-count">Taksit Sayısı</Label>
              <Input
                id="installment-count"
                type="number"
                placeholder="1"
                min="1"
                value={newDebt.installmentCount || ''}
                onChange={(e) => setNewDebt({ ...newDebt, installmentCount: Number(e.target.value) })}
              />
            </div>
          </div>
          <Button onClick={addDebt} className="w-full">
            <Plus className="w-4 h-4 mr-2" />
            Borç Ekle
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Borç Listesi</CardTitle>
          <div className="text-sm text-muted-foreground space-y-1">
            <p>Toplam Borç: <span className="font-bold text-red-600">{formatCurrency(totalDebt)}</span></p>
            <p>Toplam Ödenen: <span className="font-bold text-green-600">{formatCurrency(totalPaid)}</span></p>
            <p>Kalan Borç: <span className="font-bold text-orange-600">{formatCurrency(totalDebt - totalPaid)}</span></p>
          </div>
        </CardHeader>
        <CardContent>
          {debts.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Henüz borç eklenmemiş. Yukarıdaki formdan borç ekleyebilirsiniz.
            </p>
          ) : (
            <div className="space-y-4">
              {debts.map((debt) => {
                const totalPaidForDebt = debt.payments.reduce((sum, payment) => sum + payment.amount, 0);
                const remainingAmount = debt.totalAmount - totalPaidForDebt;
                const progressPercentage = (totalPaidForDebt / debt.totalAmount) * 100;
                const isCompleted = totalPaidForDebt >= debt.totalAmount;

                return (
                  <DebtCard 
                    key={debt.id}
                    debt={debt}
                    totalPaid={totalPaidForDebt}
                    remainingAmount={remainingAmount}
                    progressPercentage={progressPercentage}
                    isCompleted={isCompleted}
                    onAddPayment={addPayment}
                    onDelete={deleteDebt}
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

interface DebtCardProps {
  debt: Debt;
  totalPaid: number;
  remainingAmount: number;
  progressPercentage: number;
  isCompleted: boolean;
  onAddPayment: (debtId: string, amount: number) => void;
  onDelete: (debtId: string) => void;
}

const DebtCard: React.FC<DebtCardProps> = ({
  debt,
  totalPaid,
  remainingAmount,
  progressPercentage,
  isCompleted,
  onAddPayment,
  onDelete,
}) => {
  const [paymentAmount, setPaymentAmount] = useState<number>(0);

  const handleAddPayment = () => {
    if (paymentAmount > 0) {
      onAddPayment(debt.id, paymentAmount);
      setPaymentAmount(0);
    }
  };

  return (
    <Card className={`border-l-4 ${isCompleted ? 'border-l-green-500' : 'border-l-red-500'}`}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <CardTitle className="text-lg">{debt.description}</CardTitle>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="w-4 h-4" />
              Son tarih: {debt.dueDate}
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onDelete(debt.id)}
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
            <p className="text-muted-foreground">Toplam Borç</p>
            <p className="font-semibold">{formatCurrency(debt.totalAmount)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Ödenen</p>
            <p className="font-semibold text-green-600">{formatCurrency(totalPaid)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Kalan</p>
            <p className="font-semibold text-red-600">{formatCurrency(remainingAmount)}</p>
          </div>
        </div>

        {!isCompleted && (
          <div className="flex gap-2">
            <Input
              type="number"
              placeholder="Ödeme tutarı"
              value={paymentAmount || ''}
              onChange={(e) => setPaymentAmount(Number(e.target.value))}
              className="flex-1"
            />
            <Button onClick={handleAddPayment} disabled={paymentAmount <= 0}>
              Ödeme Ekle
            </Button>
          </div>
        )}

        {isCompleted && (
          <div className="text-center p-2 bg-green-50 text-green-700 rounded-md">
            ✅ Bu borç tamamen ödenmiştir!
          </div>
        )}
      </CardContent>
    </Card>
  );
};