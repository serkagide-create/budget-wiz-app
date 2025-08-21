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

  const getAvailableBalance = (fund: 'balance' | 'debt_fund' | 'savings_fund') => {
    switch (fund) {
      case 'balance':
        return settings.balance || 0;
      case 'debt_fund':
        return settings.debtFund || 0;
      case 'savings_fund':
        return settings.savingsFund || 0;
      default:
        return 0;
    }
  };

  const availableAmount = getAvailableBalance(fromFund);
  const transferAmount = parseFloat(amount) || 0;
  const isValidAmount = transferAmount > 0 && transferAmount <= availableAmount;

  const handleTransfer = async () => {
    if (!isValidAmount) return;
    
    setIsTransferring(true);
    try {
      await onTransfer(fromFund, toFund, transferAmount, description || undefined);
      setAmount('');
      setDescription('');
    } finally {
      setIsTransferring(false);
    }
  };

  const setQuickAmount = (percentage: number) => {
    const quickAmount = (availableAmount * percentage / 100).toFixed(2);
    setAmount(quickAmount);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY'
    }).format(value);
  };

  return (
    <div className="space-y-6 p-4 max-w-7xl mx-auto">
      {/* Fon Bakiyeleri */}
      <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        <Card className="min-w-0">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">
                <Wallet className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-muted-foreground truncate">Harcanabilir Tutar</p>
                <p className="text-lg font-bold truncate">{formatCurrency(settings.balance || 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="min-w-0">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-destructive/10 rounded-lg flex-shrink-0">
                <CreditCard className="h-5 w-5 text-destructive" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-muted-foreground truncate">Borç Fonu</p>
                <p className="text-lg font-bold truncate">{formatCurrency(settings.debtFund || 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="min-w-0">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-500/10 rounded-lg flex-shrink-0">
                <PiggyBank className="h-5 w-5 text-green-600" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-muted-foreground truncate">Birikim Fonu</p>
                <p className="text-lg font-bold truncate">{formatCurrency(settings.savingsFund || 0)}</p>
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
          <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
            <div className="space-y-2">
              <Label>Nereden</Label>
              <Select value={fromFund} onValueChange={(value: 'balance' | 'debt_fund' | 'savings_fund') => setFromFund(value)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="balance">
                    <div className="flex items-center gap-2 max-w-full">
                      <Wallet className="h-4 w-4 flex-shrink-0" />
                      <span className="truncate">Harcanabilir ({formatCurrency(settings.balance || 0)})</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="debt_fund">
                    <div className="flex items-center gap-2 max-w-full">
                      <CreditCard className="h-4 w-4 flex-shrink-0" />
                      <span className="truncate">Borç Fonu ({formatCurrency(settings.debtFund || 0)})</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="savings_fund">
                    <div className="flex items-center gap-2 max-w-full">
                      <PiggyBank className="h-4 w-4 flex-shrink-0" />
                      <span className="truncate">Birikim ({formatCurrency(settings.savingsFund || 0)})</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Nereye</Label>
              <Select value={toFund} onValueChange={(value: 'balance' | 'debt_fund' | 'savings_fund') => setToFund(value)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="balance" disabled={fromFund === 'balance'}>
                    <div className="flex items-center gap-2">
                      <Wallet className="h-4 w-4 flex-shrink-0" />
                      <span className="truncate">Harcanabilir Tutar</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="debt_fund" disabled={fromFund === 'debt_fund'}>
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4 flex-shrink-0" />
                      <span className="truncate">Borç Fonu</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="savings_fund" disabled={fromFund === 'savings_fund'}>
                    <div className="flex items-center gap-2">
                      <PiggyBank className="h-4 w-4 flex-shrink-0" />
                      <span className="truncate">Birikim Fonu</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Tutar (₺)</Label>
            <div className="space-y-3">
              <Input
                type="number"
                placeholder="Transfer edilecek tutarı girin"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min="0"
                max={availableAmount}
                step="0.01"
                className={transferAmount > availableAmount ? "border-destructive" : ""}
              />
              
              {/* Kullanılabilir Bakiye */}
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Kullanılabilir Bakiye:</span>
                <span className="font-medium">{formatCurrency(availableAmount)}</span>
              </div>

              {/* Yetersiz Bakiye Uyarısı */}
              {transferAmount > availableAmount && transferAmount > 0 && (
                <div className="text-sm text-destructive">
                  Yetersiz bakiye! Maksimum {formatCurrency(availableAmount)} transfer edebilirsiniz.
                </div>
              )}

              {/* Hızlı Transfer Butonları */}
              {availableAmount > 0 && (
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Hızlı Transfer:</Label>
                  <div className="grid grid-cols-4 gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setQuickAmount(25)}
                      className="text-xs"
                    >
                      %25
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setQuickAmount(50)}
                      className="text-xs"
                    >
                      %50
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setQuickAmount(75)}
                      className="text-xs"
                    >
                      %75
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setQuickAmount(100)}
                      className="text-xs"
                    >
                      Tümü
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Açıklama (Opsiyonel)</Label>
            <Textarea
              placeholder="Transfer açıklaması"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="resize-none"
            />
          </div>

          <div className="flex items-center justify-between p-3 bg-muted rounded-lg overflow-hidden">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              {getFundIcon(fromFund)}
              <span className="font-medium text-sm truncate">{getFundName(fromFund)}</span>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground mx-2 flex-shrink-0" />
            <div className="flex items-center gap-2 min-w-0 flex-1 justify-end">
              {getFundIcon(toFund)}
              <span className="font-medium text-sm truncate">{getFundName(toFund)}</span>
            </div>
          </div>

          <Button
            onClick={handleTransfer}
            disabled={!isValidAmount || fromFund === toFund || isTransferring}
            className="w-full"
          >
            {isTransferring ? 'Transfer Yapılıyor...' : `${formatCurrency(transferAmount)} Transfer Et`}
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
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {transfers.slice(0, 10).map((transfer) => (
                <div key={transfer.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border rounded-lg gap-3">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {getFundIcon(transfer.fromFund)}
                      <span className="text-xs font-medium truncate max-w-20">{getFundName(transfer.fromFund).split(' ')[0]}</span>
                    </div>
                    <ArrowRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {getFundIcon(transfer.toFund)}
                      <span className="text-xs font-medium truncate max-w-20">{getFundName(transfer.toFund).split(' ')[0]}</span>
                    </div>
                  </div>
                  <div className="text-left sm:text-right flex-shrink-0">
                    <p className="font-semibold text-sm">{formatCurrency(transfer.amount)}</p>
                    <div className="flex flex-wrap items-center gap-1 sm:justify-end">
                      <Badge variant={transfer.transferType === 'automatic' ? 'secondary' : 'default'} className="text-xs">
                        {transfer.transferType === 'automatic' ? 'Otomatik' : 'Manuel'}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(transfer.createdAt).toLocaleDateString('tr-TR')}
                      </span>
                    </div>
                    {transfer.description && (
                      <p className="text-xs text-muted-foreground mt-1 truncate max-w-32">{transfer.description}</p>
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