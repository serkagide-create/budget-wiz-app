import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Wallet, CreditCard, PiggyBank, ArrowLeftRight } from "lucide-react";
import { Settings, Transfer } from "@/hooks/useFinancialData";

interface FundTransferProps {
  settings: Settings;
  transfers: Transfer[];
  onTransfer: (fromFund: 'balance' | 'debt_fund' | 'savings_fund', toFund: 'balance' | 'debt_fund' | 'savings_fund', amount: number, description?: string) => Promise<{ success: boolean; error?: string }>;
}

const getFundIcon = (fund: string) => {
  switch (fund) {
    case 'balance':
      return <Wallet className="h-4 w-4" />;
    case 'debt_fund':
      return <CreditCard className="h-4 w-4" />;
    case 'savings_fund':
      return <PiggyBank className="h-4 w-4" />;
    default:
      return <Wallet className="h-4 w-4" />;
  }
};

const getFundName = (fund: string) => {
  switch (fund) {
    case 'balance':
      return 'Harcanabilir Tutar';
    case 'debt_fund':
      return 'Borç Fonu';
    case 'savings_fund':
      return 'Birikim Fonu';
    default:
      return fund;
  }
};

const FundTransfer: React.FC<FundTransferProps> = ({ settings, transfers, onTransfer }) => {
  const [fromFund, setFromFund] = useState<'balance' | 'debt_fund' | 'savings_fund'>('balance');
  const [toFund, setToFund] = useState<'balance' | 'debt_fund' | 'savings_fund'>('debt_fund');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [isTransferring, setIsTransferring] = useState(false);

  const handleTransfer = async () => {
    if (!amount || parseFloat(amount) <= 0) return;
    
    setIsTransferring(true);
    try {
      await onTransfer(fromFund, toFund, parseFloat(amount), description || undefined);
      setAmount('');
      setDescription('');
    } finally {
      setIsTransferring(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY'
    }).format(value);
  };

  return (
    <div className="space-y-6">
      {/* Fon Bakiyeleri */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="flex items-center p-6">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Wallet className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Harcanabilir Tutar</p>
                <p className="text-2xl font-bold">{formatCurrency(settings.balance || 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-6">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-destructive/10 rounded-lg">
                <CreditCard className="h-6 w-6 text-destructive" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Borç Fonu</p>
                <p className="text-2xl font-bold">{formatCurrency(settings.debtFund || 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-6">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <PiggyBank className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Birikim Fonu</p>
                <p className="text-2xl font-bold">{formatCurrency(settings.savingsFund || 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Transfer Formu */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowLeftRight className="h-5 w-5" />
            Fon Transferi
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Nereden</Label>
              <Select value={fromFund} onValueChange={(value: 'balance' | 'debt_fund' | 'savings_fund') => setFromFund(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="balance">
                    <div className="flex items-center gap-2">
                      <Wallet className="h-4 w-4" />
                      Harcanabilir Tutar ({formatCurrency(settings.balance || 0)})
                    </div>
                  </SelectItem>
                  <SelectItem value="debt_fund">
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4" />
                      Borç Fonu ({formatCurrency(settings.debtFund || 0)})
                    </div>
                  </SelectItem>
                  <SelectItem value="savings_fund">
                    <div className="flex items-center gap-2">
                      <PiggyBank className="h-4 w-4" />
                      Birikim Fonu ({formatCurrency(settings.savingsFund || 0)})
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Nereye</Label>
              <Select value={toFund} onValueChange={(value: 'balance' | 'debt_fund' | 'savings_fund') => setToFund(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="balance" disabled={fromFund === 'balance'}>
                    <div className="flex items-center gap-2">
                      <Wallet className="h-4 w-4" />
                      Harcanabilir Tutar
                    </div>
                  </SelectItem>
                  <SelectItem value="debt_fund" disabled={fromFund === 'debt_fund'}>
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4" />
                      Borç Fonu
                    </div>
                  </SelectItem>
                  <SelectItem value="savings_fund" disabled={fromFund === 'savings_fund'}>
                    <div className="flex items-center gap-2">
                      <PiggyBank className="h-4 w-4" />
                      Birikim Fonu
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Tutar (₺)</Label>
            <Input
              type="number"
              placeholder="Transfer edilecek tutarı girin"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min="1"
              step="0.01"
            />
          </div>

          <div className="space-y-2">
            <Label>Açıklama (Opsiyonel)</Label>
            <Textarea
              placeholder="Transfer açıklaması"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div className="flex items-center gap-2">
              {getFundIcon(fromFund)}
              <span className="font-medium">{getFundName(fromFund)}</span>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
            <div className="flex items-center gap-2">
              {getFundIcon(toFund)}
              <span className="font-medium">{getFundName(toFund)}</span>
            </div>
          </div>

          <Button
            onClick={handleTransfer}
            disabled={!amount || parseFloat(amount) <= 0 || fromFund === toFund || isTransferring}
            className="w-full"
          >
            {isTransferring ? 'Transfer Yapılıyor...' : `${formatCurrency(parseFloat(amount) || 0)} Transfer Et`}
          </Button>
        </CardContent>
      </Card>

      {/* Transfer Geçmişi */}
      {transfers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Transfer Geçmişi</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {transfers.slice(0, 10).map((transfer) => (
                <div key={transfer.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      {getFundIcon(transfer.fromFund)}
                      <span className="text-sm font-medium">{getFundName(transfer.fromFund)}</span>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    <div className="flex items-center gap-2">
                      {getFundIcon(transfer.toFund)}
                      <span className="text-sm font-medium">{getFundName(transfer.toFund)}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{formatCurrency(transfer.amount)}</p>
                    <div className="flex items-center gap-2">
                      <Badge variant={transfer.transferType === 'automatic' ? 'secondary' : 'default'}>
                        {transfer.transferType === 'automatic' ? 'Otomatik' : 'Manuel'}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(transfer.createdAt).toLocaleDateString('tr-TR')}
                      </span>
                    </div>
                    {transfer.description && (
                      <p className="text-xs text-muted-foreground mt-1">{transfer.description}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default FundTransfer;