import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useFinancialData } from '@/hooks/useFinancialData';
import { useNavigate } from 'react-router-dom';
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
import type { Income, Debt, SavingGoal, Settings, Payment } from '@/hooks/useFinancialData';
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
  Settings as SettingsIcon,
  ChevronRight,
  Calendar,
  DollarSign,
  Sun,
  Moon,
  Check,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  LogOut,
  User
} from 'lucide-react';

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
  const { user, signOut, loading: authLoading } = useAuth();
  const {
    incomes,
    debts,
    savingGoals,
    settings,
    loading: dataLoading,
    addIncome,
    deleteIncome,
    addDebt,
    addPayment,
    deleteDebt,
    addSavingGoal,
    updateSavingGoalAmount,
    deleteSavingGoal,
    updateSettings
  } = useFinancialData();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Redirect to auth if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);
  
  // State Management
  const [activeTab, setActiveTab] = useState('dashboard');

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

  // Load chat messages from localStorage (keep chat separate from financial data)
  useEffect(() => {
    const loadFromStorage = (key: string, defaultValue: any) => {
      try {
        const stored = localStorage.getItem(key);
        return stored ? JSON.parse(stored) : defaultValue;
      } catch (error) {
        console.error('Storage error:', error);
        return defaultValue;
      }
    };

    setChatMessages(loadFromStorage('budgetApp_chatMessages', [
      {
        id: 'welcome',
        type: 'assistant',
        message: '👋 Merhaba! Ben sizin kişisel finansal asistanınızım. Finansal durumunuzu analiz ediyor, yatırım önerileri sunuyor ve finansal özgürlüğe giden yolda size rehberlik ediyorum. Size nasıl yardımcı olabilirim?',
        timestamp: new Date()
      }
    ]));

    // Load saved ElevenLabs API key
    const savedApiKey = loadFromStorage('elevenlabs_api_key', '');
    if (savedApiKey) {
      setElevenlabsApiKey(savedApiKey);
      setVoiceEnabled(true);
    }
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
  }, []);

  // Save chat messages and API key to localStorage
  useEffect(() => { 
    try {
      localStorage.setItem('budgetApp_chatMessages', JSON.stringify(chatMessages));
    } catch (error) {
      console.error('Error saving chat messages:', error);
    }
  }, [chatMessages]);
  
  useEffect(() => { 
    try {
      localStorage.setItem('elevenlabs_api_key', elevenlabsApiKey);
    } catch (error) {
      console.error('Error saving API key:', error);
    }
  }, [elevenlabsApiKey]);

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

  // Show loading while data is being fetched
  if (authLoading || dataLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Yükleniyor...</p>
        </div>
      </div>
    );
  }

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

  // Helper function to make payment (using Supabase)
  const makePayment = async (debtId: string, amount: number) => {
    const debt = debts.find(d => d.id === debtId);
    if (!debt) return;

    const totalPaid = debt.payments.reduce((sum, payment) => sum + payment.amount, 0);
    const remaining = debt.totalAmount - totalPaid;
    const paymentAmount = Math.min(amount, remaining);

    if (paymentAmount <= 0) return;

    await addPayment(debtId, paymentAmount);
  };

  // Add income function (using Supabase)
  const addIncomeData = async (incomeData: Omit<Income, 'id'>) => {
    await addIncome(incomeData);
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
        await addIncomeData({
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
          await makePayment(targetDebt.id, amount);
          
          const response = `${formatCurrency(amount)} ödeme ${targetDebt.description} borcuna yapıldı! Kalan borç: ${formatCurrency(Math.max(0, targetDebt.remaining - amount))}`;
          addChatMessage('assistant', response);
          if (voiceEnabled) {
            await speakText(response);
          }
          return;
        }
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
  const handleAddIncome = async () => {
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

    await addIncomeData({
      description: incomeForm.description.trim(),
      amount: parseFloat(incomeForm.amount),
      date: new Date().toISOString(),
      category: incomeForm.category,
      monthlyRepeat: incomeForm.monthlyRepeat,
      nextIncomeDate: nextIncomeDate?.toISOString()
    });

    setIncomeForm({ description: '', amount: '', category: '', monthlyRepeat: false });
  };

  // Debt Functions
  const handleAddDebt = async () => {
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

    await addDebt({
      description: debtForm.description.trim(),
      totalAmount: parseFloat(debtForm.amount),
      dueDate: debtForm.dueDate,
      installmentCount: installmentCount,
      monthlyRepeat: debtForm.monthlyRepeat,
      nextPaymentDate: debtForm.monthlyRepeat ? nextPaymentDate.toISOString() : undefined
    });
    
    setDebtForm({ description: '', amount: '', dueDate: '', installmentCount: '', monthlyRepeat: false });
  };

  const handleAddPayment = async (debtId: string) => {
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

    await addPayment(debtId, amount);
    setPaymentForms(prev => ({ ...prev, [debtId]: '' }));
  };

  const payInstallment = async (debtId: string) => {
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

    await addPayment(debtId, installmentAmount);
    toast({ title: "Başarılı", description: `Taksit ödendi: ${formatCurrency(installmentAmount)}` });
  };

  // Saving Goal Functions
  const handleAddSavingGoal = async () => {
    if (!savingForm.title.trim() || !savingForm.targetAmount || !savingForm.deadline) {
      toast({ title: "Hata", description: "Lütfen tüm alanları doldurun", variant: "destructive" });
      return;
    }

    await addSavingGoal({
      title: savingForm.title.trim(),
      targetAmount: parseFloat(savingForm.targetAmount),
      currentAmount: 0,
      category: savingForm.category,
      deadline: savingForm.deadline
    });

    setSavingForm({ title: '', targetAmount: '', category: 'other', deadline: '' });
  };

  const handleAddSavingAmount = async (goalId: string, amount: number) => {
    if (amount > availableSavingsFund) {
      toast({ title: "Hata", description: "Birikim fonu yetersiz", variant: "destructive" });
      return;
    }

    const goal = savingGoals.find(g => g.id === goalId);
    if (!goal) return;

    const newAmount = Math.min(goal.currentAmount + amount, goal.targetAmount);
    await updateSavingGoalAmount(goalId, newAmount);
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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-foreground">💰 Akıllı Bütçe Yöneticisi</h1>
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              >
                {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </Button>
              <div className="flex items-center gap-2">
                <User className="w-4 h-4" />
                <span className="text-sm text-muted-foreground">{user?.email}</span>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={signOut}
                className="gap-2"
              >
                <LogOut className="w-4 h-4" />
                Çıkış
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="dashboard">📊 Dashboard</TabsTrigger>
            <TabsTrigger value="incomes">💰 Gelirler</TabsTrigger>
            <TabsTrigger value="debts">💳 Borçlar</TabsTrigger>
            <TabsTrigger value="savings">🎯 Hedefler</TabsTrigger>
            <TabsTrigger value="assistant">🤖 Asistan</TabsTrigger>
            <TabsTrigger value="settings">⚙️ Ayarlar</TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Monthly Income Card */}
              <Card className="gradient-bg-income">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    Aylık Gelir
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-white">{formatCurrency(totalIncome)}</div>
                  <p className="text-income-foreground/80 text-sm">Bu ay eklenen gelirler</p>
                </CardContent>
              </Card>

              {/* Debt Fund Card */}
              <Card className="gradient-bg-expense">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5" />
                    Borç Fonu
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-white">{formatCurrency(availableDebtFund)}</div>
                  <p className="text-expense-foreground/80 text-sm">Kullanılabilir: {formatCurrency(debtFund)}</p>
                  <div className="mt-2">
                    <Progress value={(usedDebtFund / debtFund) * 100} className="h-2" />
                  </div>
                </CardContent>
              </Card>

              {/* Savings Fund Card */}
              <Card className="gradient-bg-primary">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Target className="w-5 h-5" />
                    Tasarruf Fonu
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-white">{formatCurrency(availableSavingsFund)}</div>
                  <p className="text-primary-foreground/80 text-sm">Kullanılabilir: {formatCurrency(savingsFund)}</p>
                  <div className="mt-2">
                    <Progress value={(usedSavingsFund / savingsFund) * 100} className="h-2" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-income">{incomes.length}</div>
                  <p className="text-sm text-muted-foreground">Gelir Kaynağı</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-expense">{debts.length}</div>
                  <p className="text-sm text-muted-foreground">Aktif Borç</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-primary">{savingGoals.length}</div>
                  <p className="text-sm text-muted-foreground">Tasarruf Hedefi</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-secondary">{settings.debtPercentage}%</div>
                  <p className="text-sm text-muted-foreground">Borç Oranı</p>
                </CardContent>
              </Card>
            </div>

            {/* Smart Recommendations */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  Akıllı Öneriler
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {getSmartRecommendations().map((rec, index) => (
                    <div key={index} className={`p-3 rounded-lg border ${
                      rec.type === 'success' ? 'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800' :
                      rec.type === 'warning' ? 'bg-yellow-50 border-yellow-200 dark:bg-yellow-950 dark:border-yellow-800' :
                      rec.type === 'suggestion' ? 'bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800' :
                      'bg-muted border-border'
                    }`}>
                      <p className="text-sm font-medium">{rec.message}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Incomes Tab */}
          <TabsContent value="incomes" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PlusCircle className="w-5 h-5" />
                  Yeni Gelir Ekle
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="income-description">Açıklama</Label>
                    <Input
                      id="income-description"
                      placeholder="Maaş, freelance iş vb."
                      value={incomeForm.description}
                      onChange={(e) => setIncomeForm(prev => ({ ...prev, description: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="income-amount">Tutar (₺)</Label>
                    <Input
                      id="income-amount"
                      type="number"
                      placeholder="5000"
                      value={incomeForm.amount}
                      onChange={(e) => setIncomeForm(prev => ({ ...prev, amount: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="income-category">Kategori</Label>
                    <Input
                      id="income-category"
                      placeholder="Maaş, Freelance, Yatırım vb."
                      value={incomeForm.category}
                      onChange={(e) => setIncomeForm(prev => ({ ...prev, category: e.target.value }))}
                    />
                  </div>
                  <div className="flex items-center space-x-2 pt-6">
                    <input
                      type="checkbox"
                      id="income-repeat"
                      checked={incomeForm.monthlyRepeat}
                      onChange={(e) => setIncomeForm(prev => ({ ...prev, monthlyRepeat: e.target.checked }))}
                      className="rounded"
                    />
                    <Label htmlFor="income-repeat">Aylık tekrar et</Label>
                  </div>
                </div>
                <Button onClick={handleAddIncome} className="w-full">
                  Gelir Ekle
                </Button>
              </CardContent>
            </Card>

            {/* Income List */}
            <Card>
              <CardHeader>
                <CardTitle>Gelir Listesi</CardTitle>
              </CardHeader>
              <CardContent>
                {incomes.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">Henüz gelir eklenmemiş.</p>
                ) : (
                  <div className="space-y-3">
                    {incomes.map((income) => (
                      <div key={income.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <div>
                          <h3 className="font-medium">{income.description}</h3>
                          <p className="text-sm text-muted-foreground">
                            {income.category} • {formatDate(income.date)}
                            {income.monthlyRepeat && " • 📅 Aylık tekrar"}
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
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Debts Tab */}
          <TabsContent value="debts" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PlusCircle className="w-5 h-5" />
                  Yeni Borç Ekle
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="debt-description">Açıklama</Label>
                    <Input
                      id="debt-description"
                      placeholder="Kredi kartı, kişisel kredi vb."
                      value={debtForm.description}
                      onChange={(e) => setDebtForm(prev => ({ ...prev, description: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="debt-amount">Toplam Tutar (₺)</Label>
                    <Input
                      id="debt-amount"
                      type="number"
                      placeholder="10000"
                      value={debtForm.amount}
                      onChange={(e) => setDebtForm(prev => ({ ...prev, amount: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="debt-due-date">Son Ödeme Tarihi</Label>
                    <Input
                      id="debt-due-date"
                      type="date"
                      value={debtForm.dueDate}
                      onChange={(e) => setDebtForm(prev => ({ ...prev, dueDate: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="debt-installments">Taksit Sayısı</Label>
                    <Input
                      id="debt-installments"
                      type="number"
                      placeholder="12"
                      value={debtForm.installmentCount}
                      onChange={(e) => setDebtForm(prev => ({ ...prev, installmentCount: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="debt-repeat"
                    checked={debtForm.monthlyRepeat}
                    onChange={(e) => setDebtForm(prev => ({ ...prev, monthlyRepeat: e.target.checked }))}
                    className="rounded"
                  />
                  <Label htmlFor="debt-repeat">Aylık otomatik ödeme (15. günde)</Label>
                </div>
                <Button onClick={handleAddDebt} className="w-full">
                  Borç Ekle
                </Button>
              </CardContent>
            </Card>

            {/* Debt List */}
            <Card>
              <CardHeader>
                <CardTitle>Borç Listesi</CardTitle>
              </CardHeader>
              <CardContent>
                {debts.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">Henüz borç eklenmemiş.</p>
                ) : (
                  <div className="space-y-4">
                    {getSortedDebts().map((debt, index) => {
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
                                    <Button onClick={() => handleAddPayment(debt.id)} size="sm">
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
                                    {debt.payments.map((payment) => (
                                      <div key={payment.id} className="flex justify-between items-center text-xs bg-secondary/30 p-2 rounded">
                                        <div className="flex items-center gap-2">
                                          <Check className="w-3 h-3 text-green-500" />
                                          <span>{formatCurrency(payment.amount)}</span>
                                          <span className="text-muted-foreground">
                                            {new Date(payment.date).toLocaleDateString('tr-TR')}
                                          </span>
                                        </div>
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
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Savings Tab */}
          <TabsContent value="savings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PlusCircle className="w-5 h-5" />
                  Yeni Tasarruf Hedefi Ekle
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="saving-title">Hedef Adı</Label>
                    <Input
                      id="saving-title"
                      placeholder="Ev, araba, tatil vb."
                      value={savingForm.title}
                      onChange={(e) => setSavingForm(prev => ({ ...prev, title: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="saving-amount">Hedef Tutar (₺)</Label>
                    <Input
                      id="saving-amount"
                      type="number"
                      placeholder="50000"
                      value={savingForm.targetAmount}
                      onChange={(e) => setSavingForm(prev => ({ ...prev, targetAmount: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="saving-category">Kategori</Label>
                    <select
                      id="saving-category"
                      className="w-full p-2 border rounded-md bg-background"
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
                  <div className="space-y-2">
                    <Label htmlFor="saving-deadline">Hedef Tarih</Label>
                    <Input
                      id="saving-deadline"
                      type="date"
                      value={savingForm.deadline}
                      onChange={(e) => setSavingForm(prev => ({ ...prev, deadline: e.target.value }))}
                    />
                  </div>
                </div>
                <Button onClick={handleAddSavingGoal} className="w-full">
                  Hedef Ekle
                </Button>
              </CardContent>
            </Card>

            {/* Savings Goals List */}
            <Card>
              <CardHeader>
                <CardTitle>Tasarruf Hedefleri</CardTitle>
              </CardHeader>
              <CardContent>
                {savingGoals.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">Henüz tasarruf hedefi eklenmemiş.</p>
                ) : (
                  <div className="space-y-4">
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
                                          handleAddSavingAmount(goal.id, amount);
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
                                        handleAddSavingAmount(goal.id, amount);
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
              </CardContent>
            </Card>
          </TabsContent>

          {/* AI Assistant Tab */}
          <TabsContent value="assistant" className="space-y-6">
            {renderAIAssistant()}
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <SettingsIcon className="w-5 h-5" />
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
                      onValueChange={(value) => updateSettings({ ...settings, debtPercentage: value[0] })}
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
                      onValueChange={(value) => updateSettings({ ...settings, savingsPercentage: value[0] })}
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

            {/* Debt Strategy Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
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
                        onClick={() => updateSettings({ ...settings, debtStrategy: 'snowball' })}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="radio"
                            checked={settings.debtStrategy === 'snowball'}
                            onChange={() => updateSettings({ ...settings, debtStrategy: 'snowball' })}
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
                        onClick={() => updateSettings({ ...settings, debtStrategy: 'avalanche' })}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="radio"
                            checked={settings.debtStrategy === 'avalanche'}
                            onChange={() => updateSettings({ ...settings, debtStrategy: 'avalanche' })}
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
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default BudgetApp;
