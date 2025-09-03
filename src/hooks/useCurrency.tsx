import { useState, useEffect } from 'react';

export interface ExchangeRates {
  USD: number;
  EUR: number;
  GBP: number;
  JPY: number;
  CHF: number;
  CAD: number;
  AUD: number;
  GOLD: number;
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
  { code: 'GOLD', name: 'Altın (Gram)', symbol: 'gr', flag: '🟡' },
];

const useCurrency = () => {
  const [exchangeRates, setExchangeRates] = useState<ExchangeRates>({
    USD: 34.50,
    EUR: 37.80,
    GBP: 43.20,
    JPY: 0.24,
    CHF: 38.60,
    CAD: 25.40,
    AUD: 22.80,
    GOLD: 2680.00, // Approximate gold price per gram in TRY
  });
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchExchangeRates = async () => {
    setLoading(true);
    try {
      // Using a free exchange rate API for currencies
      const response = await fetch('https://api.exchangerate-api.com/v4/latest/TRY');
      let newRates = {
        USD: 34.50,
        EUR: 37.80,
        GBP: 43.20,
        JPY: 0.24,
        CHF: 38.60,
        CAD: 25.40,
        AUD: 22.80,
        GOLD: 2680.00,
      };

      if (response.ok) {
        const data = await response.json();
        // Convert from TRY to other currencies to get TRY rates
        newRates = {
          USD: 1 / data.rates.USD,
          EUR: 1 / data.rates.EUR,
          GBP: 1 / data.rates.GBP,
          JPY: 1 / data.rates.JPY,
          CHF: 1 / data.rates.CHF,
          CAD: 1 / data.rates.CAD,
          AUD: 1 / data.rates.AUD,
          GOLD: 2680.00, // Keep static for now, can be updated with real gold API
        };
      }

      // Try to fetch gold price from a different API
      try {
        const goldResponse = await fetch('https://api.metals.live/v1/spot/gold');
        if (goldResponse.ok) {
          const goldData = await goldResponse.json();
          // Convert from USD per troy ounce to TRY per gram
          const goldPriceUSD = goldData[0]?.price || 2000; // fallback to $2000/oz
          const goldPricePerGramUSD = goldPriceUSD / 31.1035; // troy ounce to gram
          newRates.GOLD = goldPricePerGramUSD * newRates.USD;
        }
      } catch (goldError) {
        console.log('Altın fiyatı alınamadı, varsayılan değer kullanılıyor:', goldError);
      }

      setExchangeRates(newRates);
      setLastUpdated(new Date());
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

export { useCurrency };
