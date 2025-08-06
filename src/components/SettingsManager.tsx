import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Settings, Percent, TrendingDown } from 'lucide-react';

interface Settings {
  debtPercentage: number;
  savingsPercentage: number;
  debtStrategy: 'snowball' | 'avalanche';
}

interface SettingsManagerProps {
  settings: Settings;
  setSettings: (settings: Settings) => void;
  totalIncome: number;
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

export const SettingsManager: React.FC<SettingsManagerProps> = ({ settings, setSettings, totalIncome }) => {
  const handleDebtPercentageChange = (value: number[]) => {
    setSettings({ ...settings, debtPercentage: value[0] });
  };

  const handleSavingsPercentageChange = (value: number[]) => {
    setSettings({ ...settings, savingsPercentage: value[0] });
  };

  const handleDebtStrategyChange = (strategy: 'snowball' | 'avalanche') => {
    setSettings({ ...settings, debtStrategy: strategy });
  };

  const debtFund = (totalIncome * settings.debtPercentage) / 100;
  const savingsFund = (totalIncome * settings.savingsPercentage) / 100;
  const remainingIncome = totalIncome - debtFund - savingsFund;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-purple-500" />
            Bütçe Ayarları
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <Percent className="w-4 h-4" />
                Borç Ödeme Oranı: {settings.debtPercentage}%
              </Label>
              <Slider
                value={[settings.debtPercentage]}
                onValueChange={handleDebtPercentageChange}
                max={50}
                min={0}
                step={5}
                className="w-full"
              />
              <p className="text-sm text-muted-foreground">
                Aylık gelirin {settings.debtPercentage}%'i borç ödemelerine ayrılacak: {formatCurrency(debtFund)}
              </p>
            </div>

            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <TrendingDown className="w-4 h-4" />
                Tasarruf Oranı: {settings.savingsPercentage}%
              </Label>
              <Slider
                value={[settings.savingsPercentage]}
                onValueChange={handleSavingsPercentageChange}
                max={50}
                min={0}
                step={5}
                className="w-full"
              />
              <p className="text-sm text-muted-foreground">
                Aylık gelirin {settings.savingsPercentage}%'i tasarrufa ayrılacak: {formatCurrency(savingsFund)}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <Label>Borç Ödeme Stratejisi</Label>
            <Select value={settings.debtStrategy} onValueChange={handleDebtStrategyChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="snowball">
                  Snowball (En küçük borçtan başla)
                </SelectItem>
                <SelectItem value="avalanche">
                  Avalanche (En yüksek faizden başla)
                </SelectItem>
              </SelectContent>
            </Select>
            <div className="text-sm text-muted-foreground">
              {settings.debtStrategy === 'snowball' ? (
                <p>
                  <strong>Snowball Stratejisi:</strong> En küçük borçlardan başlayarak öder, motivasyonu artırır.
                </p>
              ) : (
                <p>
                  <strong>Avalanche Stratejisi:</strong> En yüksek faizli borçlardan başlayarak öder, matematikel olarak daha karlı.
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Bütçe Özeti</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
              <span className="font-medium">Toplam Gelir</span>
              <span className="font-bold text-green-600">{formatCurrency(totalIncome)}</span>
            </div>
            
            <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
              <span className="font-medium">Borç Fonu ({settings.debtPercentage}%)</span>
              <span className="font-bold text-red-600">{formatCurrency(debtFund)}</span>
            </div>
            
            <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
              <span className="font-medium">Tasarruf Fonu ({settings.savingsPercentage}%)</span>
              <span className="font-bold text-blue-600">{formatCurrency(savingsFund)}</span>
            </div>
            
            <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
              <span className="font-medium">Kalan Gelir ({Math.round((remainingIncome / totalIncome) * 100)}%)</span>
              <span className="font-bold text-green-600">{formatCurrency(remainingIncome)}</span>
            </div>
          </div>

          <div className="mt-6 p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded-lg">
            <h4 className="font-semibold text-yellow-800 mb-2">💡 İpucu</h4>
            <ul className="text-sm text-yellow-700 space-y-1">
              <li>• Borç ödeme oranını %20-30 arasında tutmanız önerilir</li>
              <li>• Tasarruf oranını en az %20 olarak belirlemeye çalışın</li>
              <li>• Toplam %50'yi aşmayın ki yaşam giderleriniz için yeterli para kalsın</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};