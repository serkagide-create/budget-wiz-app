import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/hooks/use-toast';
import { useTheme } from "next-themes";
import { 
  PlusCircle, 
  Trash2, 
  TrendingUp, 
  Target, 
  AlertTriangle,
  Home,
  Car,
  Plane,
  BookOpen,
  Wallet,
  Settings,
  ChevronRight,
  Calendar,
  DollarSign,
  Sun,
  Moon,
  Check,
  Mic,
  MicOff,
  Volume2,
  VolumeX
} from 'lucide-react';

// TypeScript Interface Definitions
interface Income {
  id: string;
  description: string;
  amount: number;
  date: string;
  category: string;
  monthlyRepeat?: boolean;
  nextIncomeDate?: string;
}

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
  nextPaymentDate?: string;
}

interface SavingGoal {
  id: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  category: 'house' | 'car' | 'vacation' | 'education' | 'other';
  deadline: string;
}

interface Settings {
  debtPercentage: number;
  savingsPercentage: number;
  debtStrategy: 'snowball' | 'avalanche';
}

// Utility Functions
const formatCurrency = (amount: number): string => {
  const formatted = new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
  return formatted.replace('₺', '').trim() + ' ₺';
};

const formatDate = (dateString: string): string => {
  if (!dateString) return 'Tarih Yok';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Geçersiz Tarih';
    return date.toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  } catch {
    return 'Tarih Hatası';
  }
};

const getDaysUntilDue = (dueDate: string): number => {
  if (!dueDate) return Infinity;
  try {
    const due = new Date(dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    due.setHours(0, 0, 0, 0);
    const diffTime = due.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  } catch {
    return Infinity;
  }
};

const getCategoryIcon = (category: string) => {
  const icons = {
    house: <Home className="w-6 h-6" />,
    car: <Car className="w-6 h-6" />,
    vacation: <Plane className="w-6 h-6" />,
    education: <BookOpen className="w-6 h-6" />,
    other: <Wallet className="w-6 h-6" />
  };
  return icons[category as keyof typeof icons] || icons.other;
};

const getCategoryEmoji = (category: string) => {
  const emojis = {
    house: '🏠',
    car: '🚗',
    vacation: '🏖️',
    education: '📚',
    other: '💰'
  };
  return emojis[category as keyof typeof emojis] || emojis.other;
};

const BudgetApp = () => {
  const { theme, setTheme } = useTheme();
  
  // State Management
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [savingGoals, setSavingGoals] = useState<SavingGoal[]>([]);
  const [settings, setSettings] = useState<Settings>({ debtPercentage: 30, savingsPercentage: 20, debtStrategy: 'snowball' });
  const [activeTab, setActiveTab] = useState('dashboard');
  const { toast } = useToast();

  // AI Assistant State
  const [chatMessages, setChatMessages] = useState<Array<{id: string, type: 'user' | 'assistant', message: string, timestamp: Date}>>([]);
  const [chatInput, setChatInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Voice Assistant State
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [elevenlabsApiKey, setElevenlabsApiKey] = useState('');
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<any>(null);

  // Form States
  const [incomeForm, setIncomeForm] = useState({ description: '', amount: '', category: '', monthlyRepeat: false });
  const [debtForm, setDebtForm] = useState({ description: '', amount: '', dueDate: '', installmentCount: '', monthlyRepeat: false });
  const [savingForm, setSavingForm] = useState({ 
    title: '', 
    targetAmount: '', 
    category: 'other' as SavingGoal['category'],
    deadline: ''
  });
  const [paymentForms, setPaymentForms] = useState<{[key: string]: string}>({});

  // Local Storage Functions
  const saveToStorage = (key: string, data: any) => {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.error('Storage error:', error);
    }
  };

  const loadFromStorage = (key: string, defaultValue: any) => {
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : defaultValue;
    } catch (error) {
      console.error('Storage error:', error);
      return defaultValue;
    }
  };

  // Load data on mount
  useEffect(() => {
    setIncomes(loadFromStorage('budgetApp_incomes', []));
    setDebts(loadFromStorage('budgetApp_debts', []));
    setSavingGoals(loadFromStorage('budgetApp_savingGoals', []));
    setSettings(loadFromStorage('budgetApp_settings', { debtPercentage: 30, savingsPercentage: 20, debtStrategy: 'snowball' }));
    setChatMessages(loadFromStorage('budgetApp_chatMessages', [
      {
        id: 'welcome',
        type: 'assistant',
        message: '👋 Merhaba! Ben sizin kişisel finansal asistanınızım. Finansal durumunuzu analiz ediyor, yatırım önerileri sunuyor ve finansal özgürlüğe giden yolda size rehberlik ediyorum. Size nasıl yardımcı olabilirim?',
        timestamp: new Date()
      }
    ]));
  }, []);

  // Initialize voice recognition
  useEffect(() => {
    if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
      recognitionRef.current = new (window as any).webkitSpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'tr-TR';
      
      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        console.log('Sesli komut algılandı:', transcript);
        handleVoiceCommand(transcript);
      };
      
      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
      
      recognitionRef.current.onerror = (event: any) => {
        console.error('Ses tanıma hatası:', event.error);
        setIsListening(false);
        toast({
          title: "Ses Tanıma Hatası",
          description: "Ses tanıma sırasında bir hata oluştu.",
          variant: "destructive"
        });
      };
    }
    
    // Initialize speech synthesis
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      synthRef.current = window.speechSynthesis;
    }
    
    // Load saved ElevenLabs API key
    const savedApiKey = loadFromStorage('elevenlabs_api_key', '');
    if (savedApiKey) {
      setElevenlabsApiKey(savedApiKey);
      setVoiceEnabled(true);
    }
  }, []);

  // Save data when state changes
  useEffect(() => { saveToStorage('budgetApp_incomes', incomes); }, [incomes]);
  useEffect(() => { saveToStorage('budgetApp_debts', debts); }, [debts]);
  useEffect(() => { saveToStorage('budgetApp_savingGoals', savingGoals); }, [savingGoals]);
  useEffect(() => { saveToStorage('budgetApp_settings', settings); }, [settings]);
  useEffect(() => { saveToStorage('budgetApp_chatMessages', chatMessages); }, [chatMessages]);
  useEffect(() => { saveToStorage('elevenlabs_api_key', elevenlabsApiKey); }, [elevenlabsApiKey]);

  // Calculations
  const totalIncome = incomes.reduce((sum, income) => sum + income.amount, 0);
  const debtFund = (totalIncome * settings.debtPercentage) / 100;
  const savingsFund = (totalIncome * settings.savingsPercentage) / 100;
  const usedDebtFund = debts.reduce((sum, debt) => 
    sum + debt.payments.reduce((paySum, payment) => paySum + payment.amount, 0), 0
  );
  const usedSavingsFund = savingGoals.reduce((sum, goal) => sum + goal.currentAmount, 0);
  const availableDebtFund = Math.max(0, debtFund - usedDebtFund);
  const availableSavingsFund = Math.max(0, savingsFund - usedSavingsFund);

  // Debt Strategy Logic
  const getSortedDebts = () => {
    const debtsWithCalculations = debts.map(debt => {
      const totalPaid = debt.payments.reduce((sum, payment) => sum + payment.amount, 0);
      const remaining = debt.totalAmount - totalPaid;
      const estimatedInterestRate = 15; // Default %15 faiz oranı (gerçek uygulamada kullanıcıdan alınabilir)
      
      return {
        ...debt,
        totalPaid,
        remaining,
        estimatedInterestRate,
        isCompleted: remaining <= 0
      };
    });

    // Tamamlanmamış borçları filtrele
    const activeDebts = debtsWithCalculations.filter(debt => !debt.isCompleted);

    if (settings.debtStrategy === 'snowball') {
      // Borç Kartopu: En küçük kalan tutardan başla
      return activeDebts.sort((a, b) => a.remaining - b.remaining);
    } else {
      // Borç Çığ: En yüksek faiz oranından başla
      return activeDebts.sort((a, b) => b.estimatedInterestRate - a.estimatedInterestRate);
    }
  };

  // Smart Assistant Recommendations
  const getSmartRecommendations = () => {
    const sortedDebts = getSortedDebts();
    const recommendations = [];

    if (sortedDebts.length === 0) {
      recommendations.push({
        type: 'success',
        message: '🎉 Tebrikler! Tüm borçlarınızı ödemeyi tamamladınız!',
        action: null
      });
      return recommendations;
    }

    if (availableDebtFund <= 0) {
      recommendations.push({
        type: 'warning',
        message: '⚠️ Borç fonu yetersiz. Gelir ekleyerek borç fonunu artırın.',
        action: 'addIncome'
      });
      return recommendations;
    }

    const priorityDebt = sortedDebts[0];
    const strategyName = settings.debtStrategy === 'snowball' ? 'Borç Kartopu' : 'Borç Çığ';
    
    if (settings.debtStrategy === 'snowball') {
      recommendations.push({
        type: 'info',
        message: `⚡ ${strategyName} stratejisi: "${priorityDebt.description}" borcunu öncelikle ödeyin (Kalan: ${formatCurrency(priorityDebt.remaining)})`,
        action: { type: 'payDebt', debtId: priorityDebt.id }
      });
    } else {
      recommendations.push({
        type: 'info',
        message: `🏔️ ${strategyName} stratejisi: En yüksek faizli "${priorityDebt.description}" borcunu öncelikle ödeyin (Faiz: %${priorityDebt.estimatedInterestRate})`,
        action: { type: 'payDebt', debtId: priorityDebt.id }
      });
    }

    // Fazladan ödeme önerisi
    const suggestedPayment = Math.min(availableDebtFund, priorityDebt.remaining);
    if (suggestedPayment > 0) {
      recommendations.push({
        type: 'suggestion',
        message: `💡 Öneri: "${priorityDebt.description}" için ${formatCurrency(suggestedPayment)} ödeme yapabilirsiniz.`,
        action: { type: 'suggestPayment', debtId: priorityDebt.id, amount: suggestedPayment }
      });
    }

    return recommendations;
  };

  // AI Assistant Functions
  const analyzeFinancialSituation = () => {
    const completedDebts = debts.filter(debt => {
      const totalPaid = debt.payments.reduce((sum, payment) => sum + payment.amount, 0);
      return totalPaid >= debt.totalAmount;
    }).length;
    
    const activeDebts = debts.length - completedDebts;
    const totalDebtRemaining = debts.reduce((sum, debt) => {
      const totalPaid = debt.payments.reduce((sum, payment) => sum + payment.amount, 0);
      return sum + Math.max(0, debt.totalAmount - totalPaid);
    }, 0);

    const completedGoals = savingGoals.filter(goal => goal.currentAmount >= goal.targetAmount).length;
    const totalSavingsProgress = savingGoals.reduce((sum, goal) => sum + goal.currentAmount, 0);

    const debtToIncomeRatio = totalIncome > 0 ? (totalDebtRemaining / totalIncome) * 100 : 0;
    const savingsRate = totalIncome > 0 ? (totalSavingsProgress / totalIncome) * 100 : 0;

    return {
      totalIncome,
      totalDebtRemaining,
      activeDebts,
      completedDebts,
      completedGoals,
      totalSavingsProgress,
      debtToIncomeRatio,
      savingsRate,
      availableDebtFund,
      availableSavingsFund
    };
  };

  // Helper function to add chat message
  const addChatMessage = (type: 'user' | 'assistant', message: string) => {
    const newMessage = {
      id: Date.now().toString() + '_' + type,
      type,
      message,
      timestamp: new Date()
    };
    setChatMessages(prev => [...prev, newMessage]);
  };

  // Helper function to make payment
  const makePayment = (debtId: string, amount: number) => {
    const debt = debts.find(d => d.id === debtId);
    if (!debt) return;

    const totalPaid = debt.payments.reduce((sum, payment) => sum + payment.amount, 0);
    const remaining = debt.totalAmount - totalPaid;
    const paymentAmount = Math.min(amount, remaining);

    if (paymentAmount <= 0) return;

    const newPayment: Payment = {
      id: Date.now().toString(),
      amount: paymentAmount,
      date: new Date().toISOString()
    };

    setDebts(prev => prev.map(d => 
      d.id === debtId 
        ? { ...d, payments: [newPayment, ...d.payments] }
        : d
    ));

    toast({ 
      title: "Ödeme Başarılı", 
      description: `${formatCurrency(paymentAmount)} ödeme yapıldı` 
    });
  };

  // Add income function (overloaded for both form and direct usage)
  const addIncomeData = (incomeData: Omit<Income, 'id'>) => {
    const newIncome: Income = {
      id: Date.now().toString(),
      ...incomeData
    };
    setIncomes(prev => [newIncome, ...prev]);
    toast({ title: "Başarılı", description: "Gelir eklendi" });
  };

  // Voice Command Handler
  const handleVoiceCommand = async (transcript: string) => {
    const lowerTranscript = transcript.toLowerCase();
    console.log('İşlenen sesli komut:', lowerTranscript);
    
    // Gelir ekleme komutları
    if (lowerTranscript.includes('gelir') && (lowerTranscript.includes('bin') || lowerTranscript.includes('lira') || /\d+/.test(lowerTranscript))) {
      const amountMatch = lowerTranscript.match(/(\d+)\s*(bin|lira)/);
      if (amountMatch) {
        let amount = parseInt(amountMatch[1]);
        if (amountMatch[2] === 'bin') {
          amount = amount * 1000;
        }
        
        // Gelir ekle
        addIncomeData({
          description: 'Sesli komutla eklenen gelir',
          amount: amount,
          date: new Date().toISOString(),
          category: 'Maaş',
          monthlyRepeat: true
        });
        
        const response = `${formatCurrency(amount)} gelir başarıyla eklendi! Toplam geliriniz şimdi ${formatCurrency(totalIncome + amount)} oldu.`;
        addChatMessage('assistant', response);
        if (voiceEnabled) {
          await speakText(response);
        }
        return;
      }
    }
    
    // Ödeme komutları
    if ((lowerTranscript.includes('öde') || lowerTranscript.includes('ödeme')) && (lowerTranscript.includes('bin') || lowerTranscript.includes('lira') || /\d+/.test(lowerTranscript))) {
      const amountMatch = lowerTranscript.match(/(\d+)\s*(bin|lira)/);
      if (amountMatch) {
        let amount = parseInt(amountMatch[1]);
        if (amountMatch[2] === 'bin') {
          amount = amount * 1000;
        }
        
        // En yüksek öncelikli borcu bul
        const sortedDebts = getSortedDebts();
        if (sortedDebts.length > 0) {
          const targetDebt = sortedDebts[0];
          makePayment(targetDebt.id, amount);
          
          const response = `${formatCurrency(amount)} ödeme ${targetDebt.description} borcuna yapıldı! Kalan borç: ${formatCurrency(Math.max(0, targetDebt.remaining - amount))}`;
          addChatMessage('assistant', response);
          if (voiceEnabled) {
            await speakText(response);
          }
        } else {
          const response = 'Ödeme yapılacak aktif borç bulunamadı.';
          addChatMessage('assistant', response);
          if (voiceEnabled) {
            await speakText(response);
          }
        }
        return;
      }
    }
    
    // Diğer sesli komutları normal chat olarak işle
    addChatMessage('user', transcript);
    const response = generateAIResponse(transcript);
    addChatMessage('assistant', response);
    if (voiceEnabled) {
      await speakText(response);
    }
  };

  // Text-to-Speech Functions
  const speakText = async (text: string) => {
    if (!voiceEnabled || !elevenlabsApiKey) {
      // Fallback to browser speech synthesis
      if (synthRef.current) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'tr-TR';
        utterance.rate = 0.9;
        utterance.pitch = 1;
        synthRef.current.speak(utterance);
      }
      return;
    }

    try {
      setIsSpeaking(true);
      
      const response = await fetch('https://api.elevenlabs.io/v1/text-to-speech/9BWtsMINqrJLrRacOk9x', {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': elevenlabsApiKey
        },
        body: JSON.stringify({
          text: text,
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.5
          }
        })
      });

      if (response.ok) {
        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        
        audio.onended = () => {
          setIsSpeaking(false);
          URL.revokeObjectURL(audioUrl);
        };
        
        audio.play();
      } else {
        console.error('ElevenLabs API hatası:', response.status);
        // Fallback to browser speech synthesis
        if (synthRef.current) {
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.lang = 'tr-TR';
          synthRef.current.speak(utterance);
        }
        setIsSpeaking(false);
      }
    } catch (error) {
      console.error('Ses sentezi hatası:', error);
      setIsSpeaking(false);
    }
  };

  // Voice Controls
  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      setIsListening(true);
      recognitionRef.current.start();
      toast({
        title: "Ses Tanıma Başladı",
        description: "Sesli komutunuzu söyleyebilirsiniz...",
      });
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  const generateAIResponse = (userMessage: string) => {
    const analysis = analyzeFinancialSituation();
    const lowerMessage = userMessage.toLowerCase();

    // Finansal duruma göre akıllı yanıt sistemi
    const createDetailedFinancialReport = () => {
      let report = `📊 **DETAYLI FİNANSAL RAPOR**\n\n`;
      report += `💰 **Gelir Analizi:**\n`;
      report += `• Toplam Gelir: ${formatCurrency(analysis.totalIncome)}\n`;
      report += `• Borç Fonu: ${formatCurrency(analysis.availableDebtFund + (debts.reduce((sum, debt) => sum + debt.payments.reduce((paySum, payment) => paySum + payment.amount, 0), 0)))}\n`;
      report += `• Birikim Fonu: ${formatCurrency(analysis.availableSavingsFund + analysis.totalSavingsProgress)}\n\n`;
      
      report += `📉 **Borç Durumu:**\n`;
      report += `• Kalan Toplam Borç: ${formatCurrency(analysis.totalDebtRemaining)}\n`;
      report += `• Aktif Borç Sayısı: ${analysis.activeDebts}\n`;
      report += `• Tamamlanan Borç: ${analysis.completedDebts}\n`;
      report += `• Borç/Gelir Oranı: %${analysis.debtToIncomeRatio.toFixed(1)}\n\n`;
      
      report += `💎 **Yatırım Kapasitesi:**\n`;
      const monthlyInvestmentCapacity = analysis.availableSavingsFund;
      const yearlyInvestmentCapacity = monthlyInvestmentCapacity * 12;
      report += `• Aylık Yatırım Kapasitesi: ${formatCurrency(monthlyInvestmentCapacity)}\n`;
      report += `• Yıllık Yatırım Kapasitesi: ${formatCurrency(yearlyInvestmentCapacity)}\n\n`;
      
      return report;
    };

    const getStockAnalysis = () => {
      const stockSuggestions = [
        { symbol: 'BIST30', name: 'BIST 30 Endeks Fonu', risk: 'Düşük', expectedReturn: '%8-12', reason: 'Türkiye\'nin en büyük 30 şirketine yatırım' },
        { symbol: 'AKBNK', name: 'Akbank', risk: 'Orta', expectedReturn: '%10-15', reason: 'Güçlü bankacılık sektörü' },
        { symbol: 'THYAO', name: 'THY', risk: 'Yüksek', expectedReturn: '%15-25', reason: 'Havacılık sektörü toparlanması' },
        { symbol: 'ASELS', name: 'Aselsan', risk: 'Orta-Yüksek', expectedReturn: '%12-20', reason: 'Savunma sanayi büyümesi' },
        { symbol: 'TUPRS', name: 'Tüpraş', risk: 'Orta', expectedReturn: '%8-15', reason: 'Enerji sektörü istikrarı' }
      ];

      let analysis = `📈 **HİSSE SENEDİ ANALİZİ VE ÖNERİLERİ**\n\n`;
      
      const analysisData = analyzeFinancialSituation();
      if (analysisData.totalDebtRemaining > 0) {
        analysis += `⚠️ **DİKKAT:** ${formatCurrency(analysisData.totalDebtRemaining)} borcunuz var. Yüksek faizli borçları ödemek hisse yatırımından daha karlıdır.\n\n`;
      }

      analysis += `💡 **ÖRGEV: Hisse seçimi için kriterleri:**\n`;
      analysis += `• Ö: Öz kaynak karlılığı >%15\n`;
      analysis += `• R: Risk faktörleri düşük\n`;
      analysis += `• G: Gelir artışı istikrarlı\n`;
      analysis += `• E: Enflasyon korumalı sektör\n`;
      analysis += `• V: Değerleme makul (F/K <15)\n\n`;

      analysis += `🎯 **PORTFÖY ÖNERİLERİ:**\n\n`;
      stockSuggestions.forEach((stock, index) => {
        analysis += `${index + 1}. **${stock.symbol} - ${stock.name}**\n`;
        analysis += `   Risk: ${stock.risk} | Beklenen Getiri: ${stock.expectedReturn}\n`;
        analysis += `   Neden: ${stock.reason}\n\n`;
      });

      if (analysisData.availableSavingsFund >= 1000) {
        analysis += `💰 **SİZE ÖZEL ÖNERİ:**\n`;
        analysis += `${formatCurrency(analysisData.availableSavingsFund)} kullanılabilir birikim fonunuzla:\n`;
        analysis += `• %60 BIST30 Endeks Fonu (Güvenli taban)\n`;
        analysis += `• %25 Bankacılık sektörü (AKBNK, ISCTR)\n`;
        analysis += `• %15 Teknoloji/Savunma (ASELS, LOGO)\n\n`;
      }

      analysis += `⚡ **YATIRIM STRATEJİSİ:**\n`;
      analysis += `• Aylık düzenli yatırım yapın (DCA stratejisi)\n`;
      analysis += `• Sektör çeşitlendirmesi sağlayın\n`;
      analysis += `• Uzun vadeli (3+ yıl) düşünün\n`;
      analysis += `• %10'dan fazla düşüşlerde alım yapın\n`;
      analysis += `• Kâr realizasyonu %20-30'da değerlendirin\n\n`;

      return analysis;
    };

    const getAdvancedInvestmentAdvice = () => {
      let advice = `🚀 **İLERİ SEVİYE YATIRIM REHBERİ**\n\n`;
      
      advice += `📊 **PORTFÖY ALOKASYONİ (Yaşa Göre):**\n`;
      advice += `• 20-30 yaş: %70 Hisse, %20 Tahvil, %10 Altın\n`;
      advice += `• 30-40 yaş: %60 Hisse, %30 Tahvil, %10 Emtia\n`;
      advice += `• 40-50 yaş: %50 Hisse, %40 Tahvil, %10 Emlak\n`;
      advice += `• 50+ yaş: %40 Hisse, %50 Tahvil, %10 Nakit\n\n`;

      advice += `💎 **YATIRIM ARAÇLARI:**\n\n`;
      advice += `🏦 **Düşük Risk (%4-8 getiri):**\n`;
      advice += `• Devlet İç Borçlanma Senetleri (DİBS)\n`;
      advice += `• Bankacılık BYF fonları\n`;
      advice += `• Eurobond fonları\n`;
      advice += `• Altın (hedge amaçlı)\n\n`;

      advice += `📈 **Orta Risk (%8-15 getiri):**\n`;
      advice += `• BIST endeks fonları (BIST30, BIST100)\n`;
      advice += `• Karma BYF fonları\n`;
      advice += `• Emlak sertifikaları (GYO)\n`;
      advice += `• Şirket tahvilleri\n\n`;

      advice += `⚡ **Yüksek Risk (%15+ getiri potansiyeli):**\n`;
      advice += `• Bireysel hisse senetleri\n`;
      advice += `• Teknoloji fonları\n`;
      advice += `• Emerging market fonları\n`;
      advice += `• Crypto (portföyün max %5'i)\n\n`;

      advice += `🎯 **SEKTÖR ANALİZİ:**\n`;
      advice += `• Bankacılık: Faiz artışlarından faydalanır\n`;
      advice += `• Teknoloji: Uzun vadeli büyüme potansiyeli\n`;
      advice += `• Sağlık: Nüfus yaşlanmasıyla büyüme\n`;
      advice += `• Enerji: Yeşil dönüşüm fırsatları\n`;
      advice += `• Emlak: Enflasyon korunması\n\n`;

      return advice;
    };

    // Finansal durum analizi
    if (lowerMessage.includes('finansal durum') || lowerMessage.includes('durum nasıl') || lowerMessage.includes('analiz') || lowerMessage.includes('rapor')) {
      if (analysis.totalIncome === 0) {
        return '💡 Henüz gelir kaydınız bulunmuyor. Finansal analiz için öncelikle gelirlerinizi eklemenizi öneririm. Gelirler sekmesinden başlayabilirsiniz.';
      }

      let response = createDetailedFinancialReport();

      if (analysis.debtToIncomeRatio > 50) {
        response += `🚨 **ACİL DURUM:** Borç-Gelir oranınız %${analysis.debtToIncomeRatio.toFixed(1)} - Kritik seviyede!\n`;
        response += `• Gelir artırıcı yan işler arayın\n• Gereksiz harcamaları durdurun\n• Borç konsolidasyonu düşünün\n• Finansal danışman desteği alın\n\n`;
      } else if (analysis.debtToIncomeRatio > 30) {
        response += `⚠️ **DİKKAT:** Borç-Gelir oranınız %${analysis.debtToIncomeRatio.toFixed(1)} - İyileştirme gerekli.\n\n`;
      } else {
        response += `✅ **TEBRİKLER:** Borç-Gelir oranınız %${analysis.debtToIncomeRatio.toFixed(1)} - Sağlıklı seviyede!\n\n`;
      }

      // Risk profili analizi
      response += `🎯 **RİSK PROFİLİ DEĞERLENDİRME:**\n`;
      if (analysis.availableSavingsFund > analysis.totalIncome * 0.5) {
        response += `• Agresif yatırımcı: Yüksek getiri arayabilirsiniz\n`;
      } else if (analysis.availableSavingsFund > analysis.totalIncome * 0.2) {
        response += `• Orta riskli yatırımcı: Dengeli portföy uygun\n`;
      } else {
        response += `• Konservatif yatırımcı: Güvenli yatırımlar öncelik\n`;
      }

      return response;
    }

    // Hisse senedi ve ileri seviye yatırım analizi
    if (lowerMessage.includes('hisse') || lowerMessage.includes('borsa') || lowerMessage.includes('yatırım analiz') || 
        lowerMessage.includes('portföy') || lowerMessage.includes('yatırım öner') || lowerMessage.includes('hangi hisse')) {
      
      let response = getStockAnalysis();
      response += getAdvancedInvestmentAdvice();
      
      return response;
    }

    // Genel yatırım önerileri
    if (lowerMessage.includes('yatırım') || lowerMessage.includes('invest')) {
      if (analysis.totalDebtRemaining > 0) {
        return `💡 **ÖNCE BORÇ ÖDE:** ${formatCurrency(analysis.totalDebtRemaining)} toplam borcunuz var. Yüksek faizli borçlar yatırım getirilerinden daha zararlıdır.\n\n${getAdvancedInvestmentAdvice()}`;
      }

      if (analysis.availableSavingsFund < 10000) {
        return `💰 **ACİL DURUM FONU:** Önce ${formatCurrency(10000 - analysis.availableSavingsFund)} daha biriktirip acil durum fonu tamamlayın.\n\n${getAdvancedInvestmentAdvice()}`;
      }

      return getAdvancedInvestmentAdvice();
    }

    // Kumar uyarısı
    if (lowerMessage.includes('kumar') || lowerMessage.includes('bahis') || lowerMessage.includes('şans oyun')) {
      return `🚫 **KUMAR = FİNANSAL İNTİHAR**\n\n💔 **İstatistikler:**\n• Kumar oynayanların %97'si para kaybeder\n• Ortalama kayıp: Aylık gelirin %40'ı\n• Bağımlılık oranı: %15\n\n✅ **AKILLI ALTERNATİFLER:**\n• Borçlarınızı ödeyin (%100 garantili getiri)\n• BIST30 endeks fonu (tarihi ortalama %12)\n• Altın yatırımı (enflasyon korunması)\n• Emlak yatırımı (kira geliri)\n• Eğitime yatırım (gelir artışı)\n\n💪 **GERÇEK FORMULA:** Disiplin + Sabır + Akıllı Yatırım = Finansal Özgürlük`;
    }

    // Borç yönetimi
    if (lowerMessage.includes('borç') || lowerMessage.includes('debt')) {
      if (analysis.activeDebts === 0) {
        return `🎉 **BORÇSUZ YAŞAM!** Tebrikler! Şimdi yatırım zamanı.\n\n${getAdvancedInvestmentAdvice()}`;
      }

      const strategy = settings.debtStrategy === 'snowball' ? 'Borç Kartopu (en küçük borçtan başla)' : 'Borç Çığ (en yüksek faizden başla)';
      
      let response = `💳 **BORÇ YÖNETİM MASTERPLAN:**\n\n`;
      response += `📊 **Mevcut Durum:**\n• ${analysis.activeDebts} aktif borç\n• ${formatCurrency(analysis.totalDebtRemaining)} toplam borç\n• ${formatCurrency(analysis.availableDebtFund)} kullanılabilir fonu\n\n`;
      response += `⚡ **Aktif Strateji:** ${strategy}\n\n`;
      response += `🎯 **BORÇ ÖDEME HACK'LERİ:**\n`;
      response += `• Kredi kartlarını tek seferde kapatın\n`;
      response += `• Taksitli alışverişi durdurun\n`;
      response += `• Yan gelir kaynaklarını borca yönlendirin\n`;
      response += `• Borç transferi ile faiz düşürün\n`;
      response += `• 50/30/20 kuralını uygulayın\n\n`;
      response += `⏰ **BORÇ ÖZGÜRLÜK TAKVİMİ:**\n`;
      
      const monthlyPayment = analysis.availableDebtFund;
      const monthsToFreedom = monthlyPayment > 0 ? Math.ceil(analysis.totalDebtRemaining / monthlyPayment) : 0;
      response += `• Mevcut tempo ile ${monthsToFreedom} ayda borçsuz\n`;
      response += `• %20 fazla ödeme ile ${Math.ceil(monthsToFreedom * 0.8)} ayda borçsuz\n`;
      response += `• Yan gelir +${formatCurrency(1000)} ile ${Math.ceil(analysis.totalDebtRemaining / (monthlyPayment + 1000))} ayda borçsuz\n\n`;
      
      return response;
    }

    // Araştırma ve rapor talepleri
    if (lowerMessage.includes('araştır') || lowerMessage.includes('rapor') || lowerMessage.includes('analiz yap') || 
        lowerMessage.includes('incele') || lowerMessage.includes('detay')) {
      return createDetailedFinancialReport() + getAdvancedInvestmentAdvice();
    }

    // Genel finansal tavsiye
    if (lowerMessage.includes('nasıl') || lowerMessage.includes('tavsiye') || lowerMessage.includes('öneri') || 
        lowerMessage.includes('plan') || lowerMessage.includes('strateji')) {
      return `🎯 **KAPSAMLI FİNANSAL ÖZGÜRLÜK REHBERİ**\n\n📋 **1. TEMEL (0-6 ay):**\n• Gelir-gider dengesini optimize edin\n• Acil durum fonu: 3-6 aylık gider\n• Yüksek faizli borçları öncelik verin\n• Finansal okuryazarlığı artırın\n\n💡 **2. GELİŞTİRME (6-18 ay):**\n• Düzenli yatırım planı başlatın\n• Yan gelir kaynaklarını çeşitlendirin\n• Emlak araştırması yapın\n• Risk yönetimini öğrenin\n\n🚀 **3. BÜYÜTME (18+ ay):**\n• Portföy çeşitlendirmesi\n• Pasif gelir akışları oluşturun\n• Vergi optimizasyonu\n• Finansal bağımsızlık hedefi\n\n💰 **BAŞARI KRİTERLERİ:**\n• Borç/Gelir oranı <%30\n• Acil durum fonu: 6 aylık gider\n• Yatırım/Gelir oranı >%20\n• Pasif gelir: Giderlerin %50'si\n\n🎖️ **FİNANSAL ÖZGÜRLÜK = 25x Yıllık Gider Rule**`;
    }

    // Varsayılan akıllı yanıt
    return `🤖 **AI FİNANSAL DANIŞMANINIZ HİZMETİNİZDE!**\n\nSize şu konularda detaylı yardım edebilirim:\n\n📊 **Analiz & Raporlama:**\n• "Finansal durumum nasıl?" - Detaylı rapor\n• "Araştır ve analiz yap" - Kapsamlı analiz\n\n💎 **Yatırım Rehberliği:**\n• "Hangi hisse senedi almalıyım?" - Hisse analizi\n• "Yatırım portföyü öner" - Portföy stratejisi\n• "İleri seviye yatırım tavsiyeleri" - Pro stratejiler\n\n💳 **Borç & Bütçe:**\n• "Borçlarımı nasıl yöneteyim?" - Borç stratejileri\n• "Plan yap" - Finansal roadmap\n\n🚫 **Risk Yönetimi:**\n• Kumar konusunda uyarılar ve alternatifler\n\nHangi konuda derinlemesine analiz istiyorsunuz?`;
  };

  const handleChatSubmit = () => {
    if (!chatInput.trim()) return;

    const userMessage = {
      id: Date.now().toString() + '_user',
      type: 'user' as const,
      message: chatInput,
      timestamp: new Date()
    };

    setChatMessages(prev => [...prev, userMessage]);
    setIsProcessing(true);

    // AI yanıtını simüle et (gerçek uygulamada API çağrısı olacak)
    setTimeout(() => {
      const aiResponse = generateAIResponse(chatInput);
      const assistantMessage = {
        id: Date.now().toString() + '_assistant',
        type: 'assistant' as const,
        message: aiResponse,
        timestamp: new Date()
      };

      setChatMessages(prev => [...prev, assistantMessage]);
      setIsProcessing(false);
    }, 1000 + Math.random() * 2000); // 1-3 saniye arası

    setChatInput('');
  };

  const clearChat = () => {
    setChatMessages([
      {
        id: 'welcome',
        type: 'assistant',
        message: '👋 Merhaba! Ben sizin kişisel finansal asistanınızım. Finansal durumunuzu analiz ediyor, yatırım önerileri sunuyor ve finansal özgürlüğe giden yolda size rehberlik ediyorum. Size nasıl yardımcı olabilirim?',
        timestamp: new Date()
      }
    ]);
  };

  // Income Functions
  const addIncome = () => {
    if (!incomeForm.description.trim() || !incomeForm.amount || !incomeForm.category) {
      toast({ title: "Hata", description: "Lütfen tüm alanları doldurun", variant: "destructive" });
      return;
    }

    // Calculate next income date (same day next month if monthly repeat)
    let nextIncomeDate;
    if (incomeForm.monthlyRepeat) {
      const today = new Date();
      nextIncomeDate = new Date(today.getFullYear(), today.getMonth() + 1, today.getDate());
    }

    addIncomeData({
      description: incomeForm.description.trim(),
      amount: parseFloat(incomeForm.amount),
      date: new Date().toISOString(),
      category: incomeForm.category,
      monthlyRepeat: incomeForm.monthlyRepeat,
      nextIncomeDate: nextIncomeDate?.toISOString()
    });

    setIncomeForm({ description: '', amount: '', category: '', monthlyRepeat: false });
  };

  const deleteIncome = (id: string) => {
    setIncomes(prev => prev.filter(income => income.id !== id));
    toast({ title: "Başarılı", description: "Gelir silindi" });
  };

  // Debt Functions
  const addDebt = () => {
    if (!debtForm.description.trim() || !debtForm.amount || !debtForm.dueDate || !debtForm.installmentCount) {
      toast({ title: "Hata", description: "Lütfen tüm alanları doldurun", variant: "destructive" });
      return;
    }

    const installmentCount = parseInt(debtForm.installmentCount);
    if (installmentCount <= 0) {
      toast({ title: "Hata", description: "Taksit sayısı 0'dan büyük olmalı", variant: "destructive" });
      return;
    }

    // Calculate next payment date (15th of current/next month)
    const today = new Date();
    let nextPaymentDate = new Date(today.getFullYear(), today.getMonth(), 15);
    if (today.getDate() >= 15) {
      nextPaymentDate = new Date(today.getFullYear(), today.getMonth() + 1, 15);
    }

    const newDebt: Debt = {
      id: Date.now().toString(),
      description: debtForm.description.trim(),
      totalAmount: parseFloat(debtForm.amount),
      dueDate: debtForm.dueDate,
      installmentCount: installmentCount,
      payments: [],
      monthlyRepeat: debtForm.monthlyRepeat,
      nextPaymentDate: debtForm.monthlyRepeat ? nextPaymentDate.toISOString() : undefined
    };

    setDebts(prev => [newDebt, ...prev]);
    
    setDebtForm({ description: '', amount: '', dueDate: '', installmentCount: '', monthlyRepeat: false });
    toast({ title: "Başarılı", description: "Borç eklendi" });
  };

  // Otomatik taksit dağıtımı
  const autoDistributeInstallments = (debt: Debt) => {
    const installmentAmount = Math.floor(debt.totalAmount / debt.installmentCount);
    const remainingAmount = debt.totalAmount - (installmentAmount * debt.installmentCount);
    
    const payments: Payment[] = [];
    
    for (let i = 0; i < debt.installmentCount; i++) {
      let amount = installmentAmount;
      // Son taksitte kalan tutarı ekle
      if (i === debt.installmentCount - 1) {
        amount += remainingAmount;
      }
      
      if (amount > availableDebtFund) {
        toast({ 
          title: "Uyarı", 
          description: `Taksit ${i + 1} için borç fonu yetersiz`, 
          variant: "destructive" 
        });
        break;
      }
      
      const payment: Payment = {
        id: `${Date.now()}-${i}`,
        amount: amount,
        date: new Date().toISOString()
      };
      
      payments.push(payment);
    }
    
    if (payments.length > 0) {
      setDebts(prev => prev.map(d => 
        d.id === debt.id 
          ? { ...d, payments: payments }
          : d
      ));
    }
  };

  const addPayment = (debtId: string) => {
    const amount = parseFloat(paymentForms[debtId] || '0');
    if (!amount || amount <= 0) {
      toast({ title: "Hata", description: "Geçerli bir tutar girin", variant: "destructive" });
      return;
    }

    if (amount > availableDebtFund) {
      toast({ title: "Hata", description: "Borç fonu yetersiz", variant: "destructive" });
      return;
    }

    const debt = debts.find(d => d.id === debtId);
    if (!debt) return;

    const totalPaid = debt.payments.reduce((sum, payment) => sum + payment.amount, 0);
    if (totalPaid + amount > debt.totalAmount) {
      toast({ title: "Hata", description: "Borç tutarından fazla ödeme yapılamaz", variant: "destructive" });
      return;
    }

    const newPayment: Payment = {
      id: Date.now().toString(),
      amount,
      date: new Date().toISOString()
    };

    setDebts(prev => prev.map(d => 
      d.id === debtId 
        ? { ...d, payments: [newPayment, ...d.payments] }
        : d
    ));

    setPaymentForms(prev => ({ ...prev, [debtId]: '' }));
    toast({ title: "Başarılı", description: "Ödeme eklendi" });
  };

  const deletePayment = (debtId: string, paymentId: string) => {
    setDebts(prev => prev.map(debt =>
      debt.id === debtId
        ? { ...debt, payments: debt.payments.filter(p => p.id !== paymentId) }
        : debt
    ));
    toast({ title: "Başarılı", description: "Ödeme silindi" });
  };

  const deleteDebt = (id: string) => {
    setDebts(prev => prev.filter(debt => debt.id !== id));
    toast({ title: "Başarılı", description: "Borç silindi" });
  };

  // Pay installment function
  const payInstallment = (debtId: string) => {
    const debt = debts.find(d => d.id === debtId);
    if (!debt) return;

    const totalPaid = debt.payments.reduce((sum, payment) => sum + payment.amount, 0);
    const remaining = debt.totalAmount - totalPaid;
    const installmentAmount = Math.min(
      Math.ceil(debt.totalAmount / debt.installmentCount),
      remaining
    );

    if (installmentAmount > availableDebtFund) {
      toast({ title: "Hata", description: "Borç fonu yetersiz", variant: "destructive" });
      return;
    }

    const newPayment: Payment = {
      id: Date.now().toString(),
      amount: installmentAmount,
      date: new Date().toISOString()
    };

    setDebts(prev => prev.map(d => 
      d.id === debtId 
        ? { ...d, payments: [newPayment, ...d.payments] }
        : d
    ));

    toast({ title: "Başarılı", description: `Taksit ödendi: ${formatCurrency(installmentAmount)}` });
  };

  // Check and process automatic monthly incomes and payments
  useEffect(() => {
    const checkAutoIncomes = () => {
      const today = new Date();
      const todayStr = today.toDateString();
      
      incomes.forEach(income => {
        if (income.monthlyRepeat && income.nextIncomeDate) {
          const nextIncomeDate = new Date(income.nextIncomeDate);
          const nextIncomeStr = nextIncomeDate.toDateString();
          
          if (todayStr === nextIncomeStr) {
            const newIncome: Income = {
              id: Date.now().toString(),
              description: income.description,
              amount: income.amount,
              date: new Date().toISOString(),
              category: income.category,
              monthlyRepeat: true,
              nextIncomeDate: new Date(today.getFullYear(), today.getMonth() + 1, today.getDate()).toISOString()
            };

            setIncomes(prev => prev.map(i => 
              i.id === income.id 
                ? { ...i, nextIncomeDate: newIncome.nextIncomeDate }
                : i
            ).concat(newIncome));

            toast({ 
              title: "Otomatik Gelir", 
              description: `${income.description} geliri eklendi: ${formatCurrency(income.amount)}` 
            });
          }
        }
      });
    };

    const checkAutoPayments = () => {
      const today = new Date();
      const todayStr = today.toDateString();
      
      // Check if today is the 15th
      if (today.getDate() === 15) {
        debts.forEach(debt => {
          if (debt.monthlyRepeat && debt.nextPaymentDate) {
            const nextPaymentDate = new Date(debt.nextPaymentDate);
            const nextPaymentStr = nextPaymentDate.toDateString();
            
            // If today matches the next payment date
            if (todayStr === nextPaymentStr) {
              const totalPaid = debt.payments.reduce((sum, payment) => sum + payment.amount, 0);
              const remaining = debt.totalAmount - totalPaid;
              
              if (remaining > 0) {
                const installmentAmount = Math.min(
                  Math.ceil(debt.totalAmount / debt.installmentCount),
                  remaining,
                  availableDebtFund
                );
                
                if (installmentAmount > 0) {
                  const newPayment: Payment = {
                    id: Date.now().toString(),
                    amount: installmentAmount,
                    date: new Date().toISOString()
                  };

                  setDebts(prev => prev.map(d => 
                    d.id === debt.id 
                      ? { 
                          ...d, 
                          payments: [newPayment, ...d.payments],
                          nextPaymentDate: new Date(today.getFullYear(), today.getMonth() + 1, 15).toISOString()
                        }
                      : d
                  ));

                  toast({ 
                    title: "Otomatik Ödeme", 
                    description: `${debt.description} için ${formatCurrency(installmentAmount)} ödendi` 
                  });
                }
              }
            }
          }
        });
      }
    };

    // Check on component mount and every hour
    checkAutoIncomes();
    checkAutoPayments();
    const interval = setInterval(() => {
      checkAutoIncomes();
      checkAutoPayments();
    }, 60 * 60 * 1000); // Check every hour
    
    return () => clearInterval(interval);
  }, [incomes, debts, availableDebtFund, toast]);

  // Saving Goal Functions
  const addSavingGoal = () => {
    if (!savingForm.title.trim() || !savingForm.targetAmount || !savingForm.deadline) {
      toast({ title: "Hata", description: "Lütfen tüm alanları doldurun", variant: "destructive" });
      return;
    }

    const newGoal: SavingGoal = {
      id: Date.now().toString(),
      title: savingForm.title.trim(),
      targetAmount: parseFloat(savingForm.targetAmount),
      currentAmount: 0,
      category: savingForm.category,
      deadline: savingForm.deadline
    };

    setSavingGoals(prev => [newGoal, ...prev]);
    setSavingForm({ title: '', targetAmount: '', category: 'other', deadline: '' });
    toast({ title: "Başarılı", description: "Hedef eklendi" });
  };

  const addSavingAmount = (goalId: string, amount: number) => {
    if (amount > availableSavingsFund) {
      toast({ title: "Hata", description: "Birikim fonu yetersiz", variant: "destructive" });
      return;
    }

    setSavingGoals(prev => prev.map(goal =>
      goal.id === goalId
        ? { ...goal, currentAmount: Math.min(goal.currentAmount + amount, goal.targetAmount) }
        : goal
    ));

    toast({ title: "Başarılı", description: "Birikim eklendi" });
  };

  const deleteSavingGoal = (id: string) => {
    setSavingGoals(prev => prev.filter(goal => goal.id !== id));
    toast({ title: "Başarılı", description: "Hedef silindi" });
  };

  // AI Assistant Render Function
  const renderAIAssistant = () => (
    <div className="space-y-4">
      {/* Voice Settings Card */}
      {!voiceEnabled && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="p-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Volume2 className="w-5 h-5 text-amber-600" />
                <p className="font-medium text-amber-800">Sesli Asistan Kurulumu</p>
              </div>
              <p className="text-sm text-amber-700">
                Sesli komutlar ve yanıtlar için ElevenLabs API anahtarınızı girin:
              </p>
              <div className="flex gap-2">
                <Input
                  type="password"
                  placeholder="ElevenLabs API Anahtarı"
                  value={elevenlabsApiKey}
                  onChange={(e) => setElevenlabsApiKey(e.target.value)}
                  className="flex-1"
                />
                <Button
                  onClick={() => {
                    if (elevenlabsApiKey.trim()) {
                      setVoiceEnabled(true);
                      toast({
                        title: "Sesli Asistan Aktif",
                        description: "Artık sesli komutlar kullanabilirsiniz!"
                      });
                    }
                  }}
                  disabled={!elevenlabsApiKey.trim()}
                >
                  Aktifleştir
                </Button>
              </div>
              <div className="text-xs text-amber-600">
                API anahtarınızı <a href="https://elevenlabs.io" target="_blank" className="underline">elevenlabs.io</a> üzerinden alabilirsiniz.
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI Chat Interface */}
      <Card className="h-96 flex flex-col">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              🤖 AI Finansal Danışman
              <Badge variant="secondary" className="text-xs">
                {voiceEnabled ? '🎤 Sesli' : 'Metin'}
              </Badge>
            </CardTitle>
            <div className="flex items-center gap-2">
              {voiceEnabled && (
                <>
                  <Button
                    variant={isListening ? "destructive" : "secondary"}
                    size="sm"
                    onClick={isListening ? stopListening : startListening}
                    disabled={isSpeaking}
                  >
                    {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  </Button>
                  {isSpeaking && (
                    <div className="flex items-center gap-1 text-sm text-primary">
                      <Volume2 className="w-4 h-4 animate-pulse" />
                      <span>Konuşuyor...</span>
                    </div>
                  )}
                </>
              )}
              <Button variant="ghost" size="sm" onClick={clearChat}>
                Temizle
              </Button>
            </div>
          </div>
          {isListening && (
            <div className="flex items-center gap-2 text-sm text-primary mt-2">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
              Dinliyorum... Sesli komutunuzu söyleyebilirsiniz
            </div>
          )}
        </CardHeader>
        
        <CardContent className="flex-1 flex flex-col min-h-0">
          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto space-y-3 mb-4 pr-2" style={{maxHeight: '280px'}}>
            {chatMessages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] p-3 rounded-lg ${
                    msg.type === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  <div className="whitespace-pre-wrap text-sm">{msg.message}</div>
                  <div className="text-xs opacity-60 mt-1">
                    {msg.timestamp.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))}
            
            {isProcessing && (
              <div className="flex justify-start">
                <div className="bg-muted text-muted-foreground p-3 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                    <span className="text-sm">AI düşünüyor...</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Chat Input */}
          <div className="flex gap-2">
            <Input
              placeholder={voiceEnabled ? "Yazın veya sesli komut verin: 'Gelirım 50 bin', 'Kredi kartına 10 bin öde'..." : "Finansal durumum nasıl? Yatırım önerisi ver..."}
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !isProcessing) {
                  handleChatSubmit();
                }
              }}
              disabled={isProcessing || isListening}
            />
            {voiceEnabled && (
              <Button
                variant={isListening ? "destructive" : "secondary"}
                size="sm"
                onClick={isListening ? stopListening : startListening}
                disabled={isSpeaking || isProcessing}
                title={isListening ? "Ses tanımayı durdur" : "Sesli komut ver"}
              >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </Button>
            )}
            <Button 
              onClick={handleChatSubmit} 
              disabled={!chatInput.trim() || isProcessing || isListening}
              size="sm"
            >
              Gönder
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Quick Questions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">💡 Hızlı Sorular & Sesli Komut Örnekleri</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {[
              "Finansal durumum nasıl?",
              "Yatırım önerileri ver",
              "Borçlarımı nasıl yöneteyim?",
              "Birikim planı yap"
            ].map((question) => (
              <Button
                key={question}
                variant="outline"
                size="sm"
                className="text-left justify-start h-auto p-3"
                onClick={() => {
                  setChatInput(question);
                  setTimeout(() => handleChatSubmit(), 100);
                }}
                disabled={isProcessing || isListening}
              >
                <div className="text-sm">{question}</div>
              </Button>
            ))}
          </div>
          
          {voiceEnabled && (
            <div className="mt-4 p-3 bg-primary/5 rounded-lg border border-primary/20">
              <div className="flex items-center gap-2 mb-2">
                <Mic className="w-4 h-4 text-primary" />
                <span className="font-medium text-sm">Sesli Komut Örnekleri:</span>
              </div>
              <div className="text-sm text-muted-foreground space-y-1">
                <div>🎙️ <span className="font-medium">"Gelirım 50 bin"</span> - Gelir ekler</div>
                <div>🎙️ <span className="font-medium">"Kredi kartına 10 bin öde"</span> - Ödeme yapar</div>
                <div>🎙️ <span className="font-medium">"Gelirım 25 bin lira"</span> - Gelir ekler</div>
                <div>🎙️ <span className="font-medium">"5 bin ödeme yap"</span> - Öncelikli borcu öder</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI Features Info */}
      <Card className="bg-gradient-to-r from-primary/10 to-secondary/10">
        <CardContent className="p-4">
          <div className="space-y-2">
            <h3 className="font-medium flex items-center gap-2">
              🚀 AI Danışman Özellikleri
              {voiceEnabled && <Badge variant="secondary" className="text-xs">🎤 Sesli Aktif</Badge>}
            </h3>
            <div className="text-sm text-muted-foreground space-y-1">
              <div>• Gerçek finansal verilerinizi analiz eder</div>
              <div>• Kişiselleştirilmiş yatırım önerileri sunar</div>
              <div>• Borç ödeme stratejileri geliştirir</div>
              <div>• Finansal özgürlük için yol haritası çizer</div>
              <div>• Risk analizi ve uyarılar yapar</div>
              {voiceEnabled && (
                <>
                  <div>🎤 <strong>Sesli komutları anlayarak otomatik işlem yapar</strong></div>
                  <div>🔊 <strong>AI yanıtlarını sesli olarak okur</strong></div>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // Render Functions
  const renderDashboard = () => {
    const recommendations = getSmartRecommendations();
    
    return (
      <div className="space-y-4">
        {/* Smart Assistant Recommendations */}
        {recommendations.length > 0 && (
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                🤖 Akıllı Asistan
                <Badge variant="secondary" className="text-xs">
                  {settings.debtStrategy === 'snowball' ? '⚡ Kartopu' : '🏔️ Çığ'} Stratejisi
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {recommendations.map((rec, index) => (
                <div 
                  key={index}
                  className={`p-3 rounded-lg border ${
                    rec.type === 'success' ? 'bg-income/10 border-income/20' :
                    rec.type === 'warning' ? 'bg-destructive/10 border-destructive/20' :
                    rec.type === 'suggestion' ? 'bg-primary/10 border-primary/20' :
                    'bg-muted/50 border-muted'
                  }`}
                >
                  <p className="text-sm">{rec.message}</p>
                  {rec.action && rec.action.type === 'suggestPayment' && (
                    <Button 
                      size="sm" 
                      className="mt-2"
                      onClick={() => {
                        const amount = rec.action.amount;
                        const debtId = rec.action.debtId;
                        
                        const newPayment = {
                          id: Date.now().toString(),
                          amount: amount,
                          date: new Date().toISOString()
                        };

                        setDebts(prev => prev.map(d => 
                          d.id === debtId 
                            ? { ...d, payments: [newPayment, ...d.payments] }
                            : d
                        ));

                        toast({ 
                          title: "Ödeme Yapıldı", 
                          description: `${formatCurrency(amount)} ödeme eklendi` 
                        });
                      }}
                    >
                      Önerilen Ödemeyi Yap ({formatCurrency(rec.action.amount)})
                    </Button>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Card className="bg-gradient-income border-0">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-income-foreground/80">Toplam Gelir</p>
                  <p className="text-xl font-bold text-income-foreground">
                    {formatCurrency(totalIncome)}
                  </p>
                </div>
                <TrendingUp className="w-8 h-8 text-income-foreground/60" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-expense border-0">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-expense-foreground/80">Borç Fonu (%{settings.debtPercentage})</p>
                  <p className="text-xl font-bold text-expense-foreground">
                    {formatCurrency(availableDebtFund)}
                  </p>
                </div>
                <Target className="w-8 h-8 text-expense-foreground/60" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-savings border-0">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-savings-foreground/80">Birikim Fonu (%{settings.savingsPercentage})</p>
                  <p className="text-xl font-bold text-savings-foreground">
                    {formatCurrency(availableSavingsFund)}
                  </p>
                </div>
                <Wallet className="w-8 h-8 text-savings-foreground/60" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Button 
            onClick={() => setActiveTab('incomes')} 
            className="h-16 text-left justify-start"
            variant="outline"
          >
            <div className="flex items-center gap-3">
              <div className="bg-income/10 p-2 rounded-lg">
                <PlusCircle className="w-5 h-5 text-income" />
              </div>
              <div>
                <p className="font-medium">Gelir Ekle</p>
                <p className="text-sm text-muted-foreground">{incomes.length} kayıt</p>
              </div>
            </div>
          </Button>

          <Button 
            onClick={() => setActiveTab('debts')} 
            className="h-16 text-left justify-start"
            variant="outline"
          >
            <div className="flex items-center gap-3">
              <div className="bg-expense/10 p-2 rounded-lg">
                <Target className="w-5 h-5 text-expense" />
              </div>
              <div>
                <p className="font-medium">Borç Yönet</p>
                <p className="text-sm text-muted-foreground">{debts.length} borç</p>
              </div>
            </div>
          </Button>
        </div>
      </div>
    );
  };

  const renderIncomes = () => (
    <div className="space-y-4">
      {/* Add Income Form */}
      <Card>
        <CardContent className="p-4">
          <div className="space-y-3">
            <Input
              placeholder="Gelir açıklaması (maaş, freelance vb.)"
              value={incomeForm.description}
              onChange={(e) => setIncomeForm(prev => ({ ...prev, description: e.target.value }))}
            />
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="number"
                placeholder="Tutar (₺)"
                value={incomeForm.amount}
                onChange={(e) => setIncomeForm(prev => ({ ...prev, amount: e.target.value }))}
              />
              <select
                className="p-2 border rounded-md bg-background text-sm"
                value={incomeForm.category}
                onChange={(e) => setIncomeForm(prev => ({ ...prev, category: e.target.value }))}
              >
                <option value="">Kategori seçin</option>
                <option value="salary">💼 Maaş</option>
                <option value="freelance">💻 Freelance</option>
                <option value="business">🏢 İş</option>
                <option value="investment">📈 Yatırım</option>
                <option value="other">💰 Diğer</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="incomeMonthlyRepeat"
                checked={incomeForm.monthlyRepeat}
                onChange={(e) => setIncomeForm(prev => ({ ...prev, monthlyRepeat: e.target.checked }))}
                className="w-4 h-4"
              />
              <Label htmlFor="incomeMonthlyRepeat" className="text-sm">
                Her ay tekrarlansın (aynı tarihte otomatik ekle)
              </Label>
            </div>
            <Button onClick={addIncome} className="w-full">
              <PlusCircle className="w-4 h-4 mr-2" />
              Gelir Ekle
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Income List */}
      {incomes.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          Henüz gelir eklenmemiş
        </div>
      ) : (
        <div className="space-y-2">
          {incomes.map((income) => (
            <Card key={income.id}>
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                 <div>
                   <div className="flex items-center gap-2">
                     <p className="font-medium">{income.description}</p>
                     {income.monthlyRepeat && (
                       <Badge variant="secondary" className="text-xs">
                         🔄 Aylık
                       </Badge>
                     )}
                   </div>
                   <p className="text-sm text-muted-foreground">
                     {formatDate(income.date)} • {income.category}
                   </p>
                 </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-income">{formatCurrency(income.amount)}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteIncome(income.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  const renderDebts = () => {
    const totalDebtAmount = debts.reduce((sum, debt) => sum + debt.totalAmount, 0);
    const sortedDebts = getSortedDebts();
    
    return (
      <div className="space-y-4">
        {/* Debt Strategy Info */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Aktif Strateji:</p>
                <p className="text-sm text-muted-foreground">
                  {settings.debtStrategy === 'snowball' 
                    ? '⚡ Borç Kartopu - En küçük borçtan başla' 
                    : '🏔️ Borç Çığ - En yüksek faizli borçtan başla'
                  }
                </p>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setActiveTab('settings')}
              >
                <Settings className="w-4 h-4 mr-1" />
                Değiştir
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Debt Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Card className="bg-gradient-expense border-0">
            <CardContent className="p-4 text-center">
              <p className="text-sm text-expense-foreground/80">Toplam Borç</p>
              <p className="text-2xl font-bold text-expense-foreground">
                {formatCurrency(totalDebtAmount)}
              </p>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-expense border-0">
            <CardContent className="p-4 text-center">
              <p className="text-sm text-expense-foreground/80">Kullanılabilir Borç Fonu</p>
              <p className="text-2xl font-bold text-expense-foreground">
                {formatCurrency(availableDebtFund)}
              </p>
            </CardContent>
          </Card>
        </div>

      {/* Add Debt Form */}
      <Card>
        <CardContent className="p-4">
          <div className="space-y-3">
            <Input
              placeholder="Borç açıklaması"
              value={debtForm.description}
              onChange={(e) => setDebtForm(prev => ({ ...prev, description: e.target.value }))}
            />
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="number"
                placeholder="Tutar (₺)"
                value={debtForm.amount}
                onChange={(e) => setDebtForm(prev => ({ ...prev, amount: e.target.value }))}
              />
              <Input
                type="number"
                placeholder="Taksit sayısı"
                value={debtForm.installmentCount}
                onChange={(e) => setDebtForm(prev => ({ ...prev, installmentCount: e.target.value }))}
              />
            </div>
            <div className="flex gap-2">
              <Input
                type="date"
                value={debtForm.dueDate}
                onChange={(e) => setDebtForm(prev => ({ ...prev, dueDate: e.target.value }))}
              />
              <Button onClick={addDebt}>
                <PlusCircle className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="monthlyRepeat"
                checked={debtForm.monthlyRepeat}
                onChange={(e) => setDebtForm(prev => ({ ...prev, monthlyRepeat: e.target.checked }))}
                className="w-4 h-4"
              />
              <Label htmlFor="monthlyRepeat" className="text-sm">
                Her ay tekrarlansın (15. günde otomatik öde)
              </Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Priority Order Info */}
      {sortedDebts.length > 0 && (
        <Card className="bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="bg-primary/20 p-1 rounded">
                {settings.debtStrategy === 'snowball' ? '⚡' : '🏔️'}
              </div>
              <span className="font-medium text-sm">
                {settings.debtStrategy === 'snowball' ? 'Kartopu Sırası' : 'Çığ Sırası'}
              </span>
            </div>
            <div className="text-xs text-muted-foreground">
              📍 <strong>Öncelik:</strong> {sortedDebts[0]?.description} 
              {settings.debtStrategy === 'snowball' 
                ? ` (En düşük borç: ${formatCurrency(sortedDebts[0]?.remaining)})`
                : ` (En yüksek faiz: %${sortedDebts[0]?.estimatedInterestRate})`
              }
            </div>
          </CardContent>
        </Card>
      )}

      {/* Debt List */}
      {debts.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          Henüz borç eklenmemiş
        </div>
      ) : (
        <div className="space-y-3">
          {/* First show sorted debts according to strategy */}
          {sortedDebts.map((debt, index) => {
            const totalPaid = debt.payments.reduce((sum, payment) => sum + payment.amount, 0);
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
              <Card key={debt.id} className={isWarning ? 'border-destructive' : ''}>
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                         <div className="flex items-center gap-2">
                           {/* Priority indicator */}
                           <div className={`flex items-center gap-1 text-xs px-2 py-1 rounded ${
                             index === 0 ? 'bg-primary/20 text-primary font-medium' : 
                             index === 1 ? 'bg-secondary/50 text-secondary-foreground' :
                             'bg-muted/30 text-muted-foreground'
                           }`}>
                             {index === 0 ? '🎯 Öncelik #1' : `#${index + 1}`}
                           </div>
                           
                           <h3 className="font-medium">{debt.description}</h3>
                           {isWarning && (
                             <Badge variant="destructive" className="text-xs">
                               <AlertTriangle className="w-3 h-3 mr-1" />
                               {warningText}
                             </Badge>
                           )}
                         </div>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(debt.dueDate)} • {debt.installmentCount} taksit
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteDebt(debt.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>İlerleme ({progress.toFixed(0)}%)</span>
                        <span>{formatCurrency(totalPaid)} / {formatCurrency(debt.totalAmount)}</span>
                      </div>
                      <Progress value={progress} className="h-2" />
                    </div>

                    {progress >= 100 ? (
                      <div className="text-center p-2 bg-income/20 rounded text-income text-sm font-medium">
                        ✅ Tamamlandı
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <Button 
                            onClick={() => payInstallment(debt.id)} 
                            variant="outline"
                            size="sm"
                            className="flex-1"
                          >
                            Taksit Öde ({formatCurrency(Math.min(Math.ceil(debt.totalAmount / debt.installmentCount), remaining))})
                          </Button>
                        </div>
                        <div className="flex gap-2">
                          <Input
                            placeholder="Özel tutar"
                            type="number"
                            value={paymentForms[debt.id] || ''}
                            onChange={(e) => setPaymentForms(prev => ({ ...prev, [debt.id]: e.target.value }))}
                          />
                          <Button onClick={() => addPayment(debt.id)} size="sm">
                            Öde
                          </Button>
                        </div>
                      </div>
                    )}

                    {debt.payments.length > 0 && (
                      <div className="pt-2 border-t">
                        <p className="text-xs text-muted-foreground mb-2">
                          Ödemeler ({debt.payments.length}/{debt.installmentCount})
                        </p>
                        <div className="space-y-1 max-h-32 overflow-y-auto">
                          {debt.payments.map((payment, index) => (
                            <div key={payment.id} className="flex justify-between items-center text-xs bg-secondary/30 p-2 rounded">
                              <div className="flex items-center gap-2">
                                <Check className="w-3 h-3 text-green-500" />
                                <span>{formatCurrency(payment.amount)}</span>
                                <span className="text-muted-foreground">
                                  {new Date(payment.date).toLocaleDateString('tr-TR')}
                                </span>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deletePayment(debt.id, payment.id)}
                                className="h-6 w-6 p-0"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
          
          {/* Show completed debts separately */}
          {debts.filter(debt => {
            const totalPaid = debt.payments.reduce((sum, payment) => sum + payment.amount, 0);
            return totalPaid >= debt.totalAmount;
          }).length > 0 && (
            <div className="mt-6">
              <div className="flex items-center gap-2 mb-3">
                <div className="flex-1 border-t border-muted"></div>
                <span className="text-sm text-muted-foreground">Tamamlanan Borçlar</span>
                <div className="flex-1 border-t border-muted"></div>
              </div>
              
              {debts.filter(debt => {
                const totalPaid = debt.payments.reduce((sum, payment) => sum + payment.amount, 0);
                return totalPaid >= debt.totalAmount;
              }).map((debt) => {
                const totalPaid = debt.payments.reduce((sum, payment) => sum + payment.amount, 0);
                const progress = (totalPaid / debt.totalAmount) * 100;

                return (
                  <Card key={debt.id} className="opacity-75 border-income/20">
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <div className="bg-income/20 text-income text-xs px-2 py-1 rounded font-medium">
                                ✅ Tamamlandı
                              </div>
                              <h3 className="font-medium">{debt.description}</h3>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {formatDate(debt.dueDate)} • {debt.installmentCount} taksit
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteDebt(debt.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>İlerleme (100%)</span>
                            <span>{formatCurrency(totalPaid)} / {formatCurrency(debt.totalAmount)}</span>
                          </div>
                          <Progress value={100} className="h-2" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
    );
  };

  const renderSavingGoals = () => (
    <div className="space-y-4">
      {/* Available Savings Fund */}
      <Card className="bg-gradient-savings border-0">
        <CardContent className="p-4 text-center">
          <p className="text-sm text-savings-foreground/80">Kullanılabilir Birikim Fonu</p>
          <p className="text-2xl font-bold text-savings-foreground">
            {formatCurrency(availableSavingsFund)}
          </p>
        </CardContent>
      </Card>

      {/* Add Saving Goal Form */}
      <Card>
        <CardContent className="p-4">
          <div className="space-y-3">
            <Input
              placeholder="Hedef adı (ev, araba, tatil vb.)"
              value={savingForm.title}
              onChange={(e) => setSavingForm(prev => ({ ...prev, title: e.target.value }))}
            />
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="number"
                placeholder="Hedef tutar (₺)"
                value={savingForm.targetAmount}
                onChange={(e) => setSavingForm(prev => ({ ...prev, targetAmount: e.target.value }))}
              />
              <select
                className="p-2 border rounded-md bg-background text-sm"
                value={savingForm.category}
                onChange={(e) => setSavingForm(prev => ({ ...prev, category: e.target.value as SavingGoal['category'] }))}
              >
                <option value="house">🏠 Ev</option>
                <option value="car">🚗 Araba</option>
                <option value="vacation">🏖️ Tatil</option>
                <option value="education">📚 Eğitim</option>
                <option value="other">💰 Diğer</option>
              </select>
            </div>
            <div className="flex gap-2">
              <Input
                type="date"
                value={savingForm.deadline}
                onChange={(e) => setSavingForm(prev => ({ ...prev, deadline: e.target.value }))}
              />
              <Button onClick={addSavingGoal}>
                <PlusCircle className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Saving Goals List */}
      {savingGoals.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          Henüz birikim hedefi eklenmemiş
        </div>
      ) : (
        <div className="space-y-3">
          {savingGoals.map((goal) => {
            const progress = Math.min((goal.currentAmount / goal.targetAmount) * 100, 100);
            const isCompleted = progress >= 100;

            return (
              <Card key={goal.id} className={isCompleted ? 'border-income' : ''}>
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{getCategoryEmoji(goal.category)}</span>
                          <h3 className="font-medium">{goal.title}</h3>
                          {isCompleted && (
                            <Badge className="text-xs bg-income text-income-foreground">
                              ✅ Tamamlandı
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Hedef: {formatDate(goal.deadline)}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteSavingGoal(goal.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>İlerleme ({progress.toFixed(0)}%)</span>
                        <span>{formatCurrency(goal.currentAmount)} / {formatCurrency(goal.targetAmount)}</span>
                      </div>
                      <Progress value={progress} className="h-2" />
                    </div>

                    {isCompleted ? (
                      <div className="text-center p-2 bg-income/20 rounded text-income text-sm font-medium">
                        🎉 Hedefe Ulaşıldı!
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <Input
                          placeholder="Eklenecek tutar"
                          type="number"
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              const amount = parseFloat(e.currentTarget.value) || 0;
                              if (amount > 0) {
                                addSavingAmount(goal.id, amount);
                                e.currentTarget.value = '';
                              }
                            }
                          }}
                        />
                        <Button 
                          onClick={(e) => {
                            const input = e.currentTarget.parentElement?.querySelector('input') as HTMLInputElement;
                            const amount = parseFloat(input?.value || '0');
                            if (amount > 0) {
                              addSavingAmount(goal.id, amount);
                              if (input) input.value = '';
                            }
                          }}
                          size="sm"
                        >
                          Ekle
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );

  const renderSettings = () => (
    <div className="space-y-6">
      {/* Theme Settings Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Tema Ayarları
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Uygulama Teması</Label>
              <p className="text-sm text-muted-foreground">Gündüz veya gece modunu seçin</p>
            </div>
            <div className="flex gap-2">
              <Button
                variant={theme === "light" ? "default" : "outline"}
                size="sm"
                onClick={() => setTheme("light")}
              >
                <Sun className="h-4 w-4 mr-2" />
                Gündüz
              </Button>
              <Button
                variant={theme === "dark" ? "default" : "outline"}
                size="sm"
                onClick={() => setTheme("dark")}
              >
                <Moon className="h-4 w-4 mr-2" />
                Gece
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

       {/* Debt Strategy Settings Card */}
       <Card className="bg-gradient-card shadow-card">
         <CardHeader>
           <CardTitle className="text-foreground flex items-center gap-2">
             <Target className="w-5 h-5" />
             Borç Ödeme Stratejisi
           </CardTitle>
         </CardHeader>
         <CardContent>
           <div className="space-y-4">
             <div>
               <Label className="text-sm font-medium">Hangi stratejiyi kullanmak istiyorsunuz?</Label>
               <div className="mt-2 space-y-3">
                 <div 
                   className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                     settings.debtStrategy === 'snowball' ? 'border-primary bg-primary/10' : 'border-border'
                   }`}
                   onClick={() => setSettings(prev => ({ ...prev, debtStrategy: 'snowball' }))}
                 >
                   <div className="flex items-center gap-2">
                     <input
                       type="radio"
                       checked={settings.debtStrategy === 'snowball'}
                       onChange={() => setSettings(prev => ({ ...prev, debtStrategy: 'snowball' }))}
                       className="w-4 h-4"
                     />
                     <div>
                       <div className="font-medium">⚡ Borç Kartopu</div>
                       <div className="text-sm text-muted-foreground">En küçük borçtan başla (motivasyon için)</div>
                     </div>
                   </div>
                 </div>
                 
                 <div 
                   className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                     settings.debtStrategy === 'avalanche' ? 'border-primary bg-primary/10' : 'border-border'
                   }`}
                   onClick={() => setSettings(prev => ({ ...prev, debtStrategy: 'avalanche' }))}
                 >
                   <div className="flex items-center gap-2">
                     <input
                       type="radio"
                       checked={settings.debtStrategy === 'avalanche'}
                       onChange={() => setSettings(prev => ({ ...prev, debtStrategy: 'avalanche' }))}
                       className="w-4 h-4"
                     />
                     <div>
                       <div className="font-medium">🏔️ Borç Çığ</div>
                       <div className="text-sm text-muted-foreground">En yüksek faizli borçtan başla (matematik için)</div>
                     </div>
                   </div>
                 </div>
               </div>
             </div>
           </div>
         </CardContent>
       </Card>

       {/* Budget Settings Card */}
       <Card className="bg-gradient-card shadow-card">
         <CardHeader>
           <CardTitle className="text-foreground flex items-center gap-2">
             <DollarSign className="w-5 h-5" />
             Bütçe Ayarları
           </CardTitle>
         </CardHeader>
         <CardContent className="space-y-6">
           <div className="space-y-4">
             <div>
               <Label htmlFor="debt-percentage">Borç Fonu Yüzdesi: %{settings.debtPercentage}</Label>
               <Slider
                 id="debt-percentage"
                 min={0}
                 max={100}
                 step={5}
                 value={[settings.debtPercentage]}
                 onValueChange={(value) => setSettings(prev => ({ ...prev, debtPercentage: value[0] }))}
                 className="mt-2"
               />
               <div className="text-sm text-muted-foreground mt-1">
                 Toplam gelirin %{settings.debtPercentage}'i borçlar için ayrılır
               </div>
             </div>

             <div>
               <Label htmlFor="savings-percentage">Birikim Fonu Yüzdesi: %{settings.savingsPercentage}</Label>
               <Slider
                 id="savings-percentage"
                 min={0}
                 max={100}
                 step={5}
                 value={[settings.savingsPercentage]}
                 onValueChange={(value) => setSettings(prev => ({ ...prev, savingsPercentage: value[0] }))}
                 className="mt-2"
               />
               <div className="text-sm text-muted-foreground mt-1">
                 Toplam gelirin %{settings.savingsPercentage}'i birikim için ayrılır
               </div>
             </div>

             <div className="pt-4 border-t">
               <div className="text-sm text-muted-foreground">
                 Kalan %{100 - settings.debtPercentage - settings.savingsPercentage} gelir serbest kullanım içindir
               </div>
             </div>
           </div>

           {/* Fund Preview */}
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
             <div className="p-4 bg-expense/10 rounded-lg">
               <div className="text-sm text-muted-foreground">Borç Fonu</div>
               <div className="text-xl font-bold text-expense">{formatCurrency(debtFund)}</div>
             </div>
             <div className="p-4 bg-savings/10 rounded-lg">
               <div className="text-sm text-muted-foreground">Birikim Fonu</div>
               <div className="text-xl font-bold text-savings">{formatCurrency(savingsFund)}</div>
             </div>
           </div>
         </CardContent>
       </Card>
    </div>
  );

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="container mx-auto p-4 max-w-4xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground mb-2">💰 Akıllı Bütçe Asistanı</h1>
          <p className="text-muted-foreground">Gelirlerinizi yönetin, borçlarınızı takip edin, hedeflerinize ulaşın</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="hidden sm:block">
            <TabsList className="grid w-full grid-cols-6 mb-6">
              <TabsTrigger value="dashboard" className="text-xs sm:text-sm">Ana Sayfa</TabsTrigger>
              <TabsTrigger value="incomes" className="text-xs sm:text-sm">Gelirler</TabsTrigger>
              <TabsTrigger value="debts" className="text-xs sm:text-sm">Borçlar</TabsTrigger>
              <TabsTrigger value="goals" className="text-xs sm:text-sm">Birikimler</TabsTrigger>
              <TabsTrigger value="ai-assistant" className="text-xs sm:text-sm">AI Danışman</TabsTrigger>
              <TabsTrigger value="settings" className="text-xs sm:text-sm">Ayarlar</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="dashboard" className="space-y-6">
            {renderDashboard()}
          </TabsContent>

          <TabsContent value="incomes" className="space-y-6">
            {renderIncomes()}
          </TabsContent>

          <TabsContent value="debts" className="space-y-6">
            {renderDebts()}
          </TabsContent>

          <TabsContent value="goals" className="space-y-6">
            {renderSavingGoals()}
          </TabsContent>

          <TabsContent value="ai-assistant" className="space-y-6">
            {renderAIAssistant()}
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            {renderSettings()}
          </TabsContent>
        </Tabs>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border sm:hidden">
        <div className="grid grid-cols-6 h-16">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex flex-col items-center justify-center gap-1 ${
              activeTab === 'dashboard' ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            <Home className="w-5 h-5" />
            <span className="text-xs">Anasayfa</span>
          </button>
          <button
            onClick={() => setActiveTab('incomes')}
            className={`flex flex-col items-center justify-center gap-1 ${
              activeTab === 'incomes' ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            <TrendingUp className="w-5 h-5" />
            <span className="text-xs">Gelirler</span>
          </button>
          <button
            onClick={() => setActiveTab('debts')}
            className={`flex flex-col items-center justify-center gap-1 ${
              activeTab === 'debts' ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            <Target className="w-5 h-5" />
            <span className="text-xs">Borçlar</span>
          </button>
          <button
            onClick={() => setActiveTab('goals')}
            className={`flex flex-col items-center justify-center gap-1 ${
              activeTab === 'goals' ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            <Wallet className="w-5 h-5" />
            <span className="text-xs">Birikimler</span>
          </button>
          <button
            onClick={() => setActiveTab('ai-assistant')}
            className={`flex flex-col items-center justify-center gap-1 ${
              activeTab === 'ai-assistant' ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            <span className="text-lg">🤖</span>
            <span className="text-xs">AI Danışman</span>
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex flex-col items-center justify-center gap-1 ${
              activeTab === 'settings' ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            <Settings className="w-5 h-5" />
            <span className="text-xs">Ayarlar</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default BudgetApp;