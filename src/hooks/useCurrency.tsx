import { useState, useEffect } from 'react';

export interface ExchangeRates {
  USD: number;
  EUR: number;
  GBP: number;
  JPY: number;
  CHF: number;
  CAD: number;
  AUD: number;
}

export interface Currency {
  code: string;
  name: string;
  symbol: string;
  flag: string;
}

export const CURRENCIES: Currency[] = [
  { code: 'TRY', name: 'Türk Lirası', symbol: '₺', flag: '🇹🇷' },
  { code: 'USD', name: 'ABD Doları', symbol: '$', flag: '🇺🇸' },
  { code: 'EUR', name: 'Euro', symbol: '€', flag: '🇪🇺' },
  { code: 'GBP', name: 'İngiliz Sterlini', symbol: '£', flag: '🇬🇧' },
  { code: 'JPY', name: 'Japon Yeni', symbol: '¥', flag: '🇯🇵' },
  { code: 'CHF', name: 'İsviçre Frangı', symbol: 'Fr', flag: '🇨🇭' },
  { code: 'CAD', name: 'Kanada Doları', symbol: 'C$', flag: '🇨🇦' },
  { code: 'AUD', name: 'Avustralya Doları', symbol: 'A$', flag: '🇦🇺' },
];

export const useCurrency = () => {
  const [exchangeRates, setExchangeRates] = useState<ExchangeRates>({
    USD: 34.50,
    EUR: 37.80,
    GBP: 43.20,
    JPY: 0.24,
    CHF: 38.60,
    CAD: 25.40,
    AUD: 22.80,
  });
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchExchangeRates = async () => {
    setLoading(true);
    try {
      // Using a free exchange rate API
      const response = await fetch('https://api.exchangerate-api.com/v4/latest/TRY');
      if (response.ok) {
        const data = await response.json();
        // Convert from TRY to other currencies to get TRY rates
        setExchangeRates({
          USD: 1 / data.rates.USD,
          EUR: 1 / data.rates.EUR,
          GBP: 1 / data.rates.GBP,
          JPY: 1 / data.rates.JPY,
          CHF: 1 / data.rates.CHF,
          CAD: 1 / data.rates.CAD,
          AUD: 1 / data.rates.AUD,
        });
        setLastUpdated(new Date());
      }
    } catch (error) {
      console.error('Kur bilgileri alınamadı, varsayılan değerler kullanılıyor:', error);
      // Keep default rates if API fails
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExchangeRates();
  }, []);

  const convertToTRY = (amount: number, currency: string): number => {
    if (currency === 'TRY') return amount;
    const rate = exchangeRates[currency as keyof ExchangeRates];
    return rate ? amount * rate : amount;
  };

  const convertFromTRY = (amount: number, currency: string): number => {
    if (currency === 'TRY') return amount;
    const rate = exchangeRates[currency as keyof ExchangeRates];
    return rate ? amount / rate : amount;
  };

  const formatAmount = (amount: number, currency: string): string => {
    const currencyData = CURRENCIES.find(c => c.code === currency);
    if (!currencyData) return `${amount.toLocaleString('tr-TR')} ₺`;
    
    return `${amount.toLocaleString('tr-TR', { 
      minimumFractionDigits: currency === 'JPY' ? 0 : 2,
      maximumFractionDigits: currency === 'JPY' ? 0 : 2
    })} ${currencyData.symbol}`;
  };

  return {
    exchangeRates,
    loading,
    lastUpdated,
    fetchExchangeRates,
    convertToTRY,
    convertFromTRY,
    formatAmount,
  };
};
