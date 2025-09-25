import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { useFinancialData } from "@/hooks/useFinancialData";
import { toast } from "sonner";

interface AssessmentData {
  monthlyIncome: number;
  hasDebts: boolean;
  debtAmount: number;
  debtTypes: string[];
  savingsGoal: string;
  riskTolerance: string;
  financialPriority: string;
}

interface FinancialAssessmentProps {
  onComplete: () => void;
}

export const FinancialAssessment = ({ onComplete }: FinancialAssessmentProps) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [assessmentData, setAssessmentData] = useState<AssessmentData>({
    monthlyIncome: 0,
    hasDebts: false,
    debtAmount: 0,
    debtTypes: [],
    savingsGoal: "",
    riskTolerance: "",
    financialPriority: ""
  });

  const { addIncome, addDebt, addSavingGoal } = useFinancialData();
  const totalSteps = 6;

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    } else {
      handleCompleteAssessment();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleCompleteAssessment = async () => {
    try {
      // Add income
      if (assessmentData.monthlyIncome > 0) {
        await addIncome({
          description: "Aylık Maaş",
          amount: assessmentData.monthlyIncome,
          date: new Date().toISOString().split('T')[0],
          category: "salary",
          monthlyRepeat: true,
          nextIncomeDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        });
      }

      // Add debts if any
      if (assessmentData.hasDebts && assessmentData.debtAmount > 0) {
        await addDebt({
          description: "Mevcut Borç",
          totalAmount: assessmentData.debtAmount,
          dueDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          installmentCount: 12,
          category: "other",
          originalAmount: assessmentData.debtAmount
        });
      }

      // Add savings goal based on assessment
      const savingsAmount = getSuggestedSavingsAmount();
      if (savingsAmount > 0) {
        await addSavingGoal({
          title: getRecommendedGoalTitle(),
          targetAmount: savingsAmount,
          currentAmount: 0,
          deadline: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          category: getRecommendedCategory()
        });
      }

      // Store completion status
      localStorage.setItem('financialAssessmentCompleted', 'true');
      localStorage.setItem('recommendedStrategy', getRecommendedStrategy());
      
      toast.success("Finansal değerlendirmeniz tamamlandı! Önerilen stratejiniz uygulandı.");
      onComplete();
    } catch (error) {
      console.error('Assessment completion error:', error);
      toast.error("Değerlendirme kaydedilirken bir hata oluştu.");
    }
  };

  const getSuggestedSavingsAmount = () => {
    const monthlyIncome = assessmentData.monthlyIncome;
    if (assessmentData.savingsGoal === "emergency") return monthlyIncome * 6;
    if (assessmentData.savingsGoal === "investment") return monthlyIncome * 12;
    if (assessmentData.savingsGoal === "house") return monthlyIncome * 24;
    return monthlyIncome * 3;
  };

  const getRecommendedGoalTitle = () => {
    if (assessmentData.savingsGoal === "emergency") return "Acil Durum Fonu";
    if (assessmentData.savingsGoal === "investment") return "Yatırım Fonu";
    if (assessmentData.savingsGoal === "house") return "Ev Alma Hedefi";
    return "Genel Birikim";
  };

  const getRecommendedCategory = (): "house" | "car" | "vacation" | "education" | "other" => {
    if (assessmentData.savingsGoal === "house") return "house";
    if (assessmentData.savingsGoal === "investment") return "education";
    return "other";
  };

  const getRecommendedStrategy = () => {
    if (assessmentData.hasDebts) {
      return assessmentData.riskTolerance === "aggressive" ? "avalanche" : "snowball";
    }
    return "savings-focused";
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Aylık Geliriniz Nedir?</h3>
            <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark">
              Maaş, kira geliri ve diğer düzenli gelirlerinizi toplam olarak girin.
            </p>
            <Input
              type="number"
              placeholder="Örnek: 15000"
              value={assessmentData.monthlyIncome || ""}
              onChange={(e) => setAssessmentData(prev => ({
                ...prev,
                monthlyIncome: Number(e.target.value)
              }))}
              className="text-lg p-4"
            />
            <div className="text-right text-2xl font-bold text-primary">
              {assessmentData.monthlyIncome.toLocaleString('tr-TR')} ₺
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Borcunuz Var mı?</h3>
            <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark">
              Kredi kartı, bireysel kredi, konut kredisi gibi borçlarınız var mı?
            </p>
            <RadioGroup 
              value={assessmentData.hasDebts.toString()}
              onValueChange={(value) => setAssessmentData(prev => ({ 
                ...prev, 
                hasDebts: value === "true" 
              }))}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="true" id="has-debts" />
                <Label htmlFor="has-debts">Evet, borcum var</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="false" id="no-debts" />
                <Label htmlFor="no-debts">Hayır, borcum yok</Label>
              </div>
            </RadioGroup>
          </div>
        );

      case 3:
        if (!assessmentData.hasDebts) {
          setCurrentStep(4);
          return null;
        }
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Toplam Borç Miktarınız?</h3>
            <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark">
              Tüm borçlarınızın toplam tutarını girin.
            </p>
            <Input
              type="number"
              placeholder="Örnek: 50000"
              value={assessmentData.debtAmount || ""}
              onChange={(e) => setAssessmentData(prev => ({
                ...prev,
                debtAmount: Number(e.target.value)
              }))}
              className="text-lg p-4"
            />
            <div className="text-right text-2xl font-bold text-orange-500">
              {assessmentData.debtAmount.toLocaleString('tr-TR')} ₺
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Birincil Birikim Hedefiniz?</h3>
            <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark">
              En önemli finansal hedefiniz nedir?
            </p>
            <RadioGroup 
              value={assessmentData.savingsGoal}
              onValueChange={(value) => setAssessmentData(prev => ({ 
                ...prev, 
                savingsGoal: value 
              }))}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="emergency" id="emergency" />
                <Label htmlFor="emergency">Acil durum fonu oluşturmak</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="house" id="house" />
                <Label htmlFor="house">Ev almak</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="investment" id="investment" />
                <Label htmlFor="investment">Yatırım yapmak</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="retirement" id="retirement" />
                <Label htmlFor="retirement">Emeklilik için birikim</Label>
              </div>
            </RadioGroup>
          </div>
        );

      case 5:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Risk Toleransınız?</h3>
            <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark">
              Finansal kararlarınızda ne kadar risk almak istiyorsunuz?
            </p>
            <RadioGroup 
              value={assessmentData.riskTolerance}
              onValueChange={(value) => setAssessmentData(prev => ({ 
                ...prev, 
                riskTolerance: value 
              }))}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="conservative" id="conservative" />
                <Label htmlFor="conservative">Muhafazakar - Güvenli yatırımları tercih ederim</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="moderate" id="moderate" />
                <Label htmlFor="moderate">Orta - Dengeli bir yaklaşım isterim</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="aggressive" id="aggressive" />
                <Label htmlFor="aggressive">Agresif - Yüksek getiri için risk alabilirim</Label>
              </div>
            </RadioGroup>
          </div>
        );

      case 6:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Önceliğiniz Nedir?</h3>
            <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark">
              Şu anda en önemli finansal önceliğiniz hangisi?
            </p>
            <RadioGroup 
              value={assessmentData.financialPriority}
              onValueChange={(value) => setAssessmentData(prev => ({ 
                ...prev, 
                financialPriority: value 
              }))}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="debt-free" id="debt-free" />
                <Label htmlFor="debt-free">Borçsuz olmak</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="save-more" id="save-more" />
                <Label htmlFor="save-more">Daha çok birikim yapmak</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="balanced" id="balanced" />
                <Label htmlFor="balanced">Dengeli bir yaklaşım</Label>
              </div>
            </RadioGroup>
          </div>
        );

      default:
        return null;
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1: return assessmentData.monthlyIncome > 0;
      case 2: return assessmentData.hasDebts !== undefined;
      case 3: return !assessmentData.hasDebts || assessmentData.debtAmount > 0;
      case 4: return assessmentData.savingsGoal !== "";
      case 5: return assessmentData.riskTolerance !== "";
      case 6: return assessmentData.financialPriority !== "";
      default: return true;
    }
  };

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark p-4">
      <div className="max-w-md mx-auto">
        <Card className="bg-card-light dark:bg-card-dark">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-primary">
              Finansal Değerlendirme
            </CardTitle>
            <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark">
              Size özel strateji oluşturmak için birkaç soru
            </p>
            <Progress value={(currentStep / totalSteps) * 100} className="mt-4" />
            <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark">
              {currentStep} / {totalSteps}
            </p>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {renderStep()}
            
            <div className="flex justify-between gap-4">
              {currentStep > 1 && (
                <Button variant="outline" onClick={handleBack} className="flex-1">
                  <span className="material-icons mr-2">chevron_left</span>
                  Geri
                </Button>
              )}
              <Button 
                onClick={handleNext} 
                disabled={!canProceed()}
                className="flex-1"
              >
                {currentStep === totalSteps ? 'Tamamla' : 'İleri'}
                {currentStep < totalSteps && (
                  <span className="material-icons ml-2">chevron_right</span>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};