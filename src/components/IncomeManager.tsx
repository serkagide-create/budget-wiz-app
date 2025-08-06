import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Trash2, Plus, DollarSign } from 'lucide-react';

interface Income {
  id: string;
  description: string;
  amount: number;
  date: string;
  category: string;
  monthlyRepeat?: boolean;
}

interface IncomeManagerProps {
  incomes: Income[];
  setIncomes: (incomes: Income[]) => void;
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

export const IncomeManager: React.FC<IncomeManagerProps> = ({ incomes, setIncomes, toast }) => {
  const [newIncome, setNewIncome] = useState<Partial<Income>>({
    description: '',
    amount: 0,
    date: new Date().toISOString().split('T')[0],
    category: 'salary',
    monthlyRepeat: false,
  });

  const addIncome = () => {
    if (!newIncome.description || !newIncome.amount || newIncome.amount <= 0) {
      toast({
        title: 'Hata',
        description: 'Lütfen tüm alanları doldurun ve geçerli bir tutar girin.',
      });
      return;
    }

    const income: Income = {
      id: Date.now().toString(),
      description: newIncome.description!,
      amount: newIncome.amount!,
      date: newIncome.date!,
      category: newIncome.category!,
      monthlyRepeat: newIncome.monthlyRepeat,
    };

    setIncomes([...incomes, income]);
    setNewIncome({
      description: '',
      amount: 0,
      date: new Date().toISOString().split('T')[0],
      category: 'salary',
      monthlyRepeat: false,
    });

    toast({
      title: 'Başarılı',
      description: 'Gelir başarıyla eklendi.',
    });
  };

  const deleteIncome = (id: string) => {
    setIncomes(incomes.filter(income => income.id !== id));
    toast({
      title: 'Başarılı',
      description: 'Gelir başarıyla silindi.',
    });
  };

  const totalIncome = incomes.reduce((sum, income) => sum + income.amount, 0);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-green-500" />
            Yeni Gelir Ekle
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="description">Açıklama</Label>
              <Input
                id="description"
                placeholder="Örn: Maaş, Freelance iş"
                value={newIncome.description}
                onChange={(e) => setNewIncome({ ...newIncome, description: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">Tutar (₺)</Label>
              <Input
                id="amount"
                type="number"
                placeholder="0"
                value={newIncome.amount || ''}
                onChange={(e) => setNewIncome({ ...newIncome, amount: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">Tarih</Label>
              <Input
                id="date"
                type="date"
                value={newIncome.date}
                onChange={(e) => setNewIncome({ ...newIncome, date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Kategori</Label>
              <Select
                value={newIncome.category}
                onValueChange={(value) => setNewIncome({ ...newIncome, category: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Kategori seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="salary">Maaş</SelectItem>
                  <SelectItem value="freelance">Freelance</SelectItem>
                  <SelectItem value="business">İş Geliri</SelectItem>
                  <SelectItem value="investment">Yatırım</SelectItem>
                  <SelectItem value="other">Diğer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Switch
              id="monthly-repeat"
              checked={newIncome.monthlyRepeat}
              onCheckedChange={(checked) => setNewIncome({ ...newIncome, monthlyRepeat: checked })}
            />
            <Label htmlFor="monthly-repeat">Aylık tekrarlansın</Label>
          </div>
          <Button onClick={addIncome} className="w-full">
            <Plus className="w-4 h-4 mr-2" />
            Gelir Ekle
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Gelir Listesi</CardTitle>
          <p className="text-sm text-muted-foreground">
            Toplam Gelir: <span className="font-bold text-green-600">{formatCurrency(totalIncome)}</span>
          </p>
        </CardHeader>
        <CardContent>
          {incomes.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Henüz gelir eklenmemiş. Yukarıdaki formdan gelir ekleyebilirsiniz.
            </p>
          ) : (
            <div className="space-y-3">
              {incomes.map((income) => (
                <div
                  key={income.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="space-y-1">
                    <p className="font-medium">{income.description}</p>
                    <p className="text-sm text-muted-foreground">
                      {income.category} • {income.date}
                      {income.monthlyRepeat && ' • Aylık tekrar'}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-green-600">
                      {formatCurrency(income.amount)}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteIncome(income.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};