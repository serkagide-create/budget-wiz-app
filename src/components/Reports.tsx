import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency, formatDate } from "@/lib/utils";
import { FileText, Download, Calendar, TrendingUp, TrendingDown, BarChart3, Filter } from "lucide-react";
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface ReportsProps {
  incomes: any[];
  expenses: any[];
  debts: any[];
  savingGoals: any[];
  savingContributionsByGoal: Record<string, any[]>;
}

export const Reports = ({ incomes, expenses, debts, savingGoals, savingContributionsByGoal }: ReportsProps) => {
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  
  const [reportType, setReportType] = useState<'monthly' | 'weekly'>('monthly');
  const [selectedIncomeCategory, setSelectedIncomeCategory] = useState<string>('');
  const [selectedExpenseCategory, setSelectedExpenseCategory] = useState<string>('');

  // Generate available months
  const getAvailableMonths = () => {
    const months = [];
    const now = new Date();
    
    for (let i = 0; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthName = date.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' });
      months.push({ value: monthKey, label: monthName });
    }
    
    return months;
  };

  // Get unique categories
  const getIncomeCategories = () => {
    const categories = [...new Set(incomes.map(income => income.category))];
    return categories.filter(Boolean);
  };

  const getExpenseCategories = () => {
    const categories = [...new Set(expenses.map(expense => expense.category))];
    return categories.filter(Boolean);
  };

  // Calculate monthly data
  const getMonthlyData = (month: string) => {
    const [year, monthNum] = month.split('-').map(Number);
    
    const monthlyIncomes = incomes.filter(income => {
      const incomeDate = new Date(income.date);
      return incomeDate.getMonth() === monthNum - 1 && incomeDate.getFullYear() === year;
    });

    const monthlyExpenses = expenses.filter(expense => {
      const expenseDate = new Date(expense.date);
      return expenseDate.getMonth() === monthNum - 1 && expenseDate.getFullYear() === year;
    });

    const monthlyPayments = debts.reduce((total, debt) => {
      const payments = debt.payments.filter((payment: any) => {
        const paymentDate = new Date(payment.date);
        return paymentDate.getMonth() === monthNum - 1 && paymentDate.getFullYear() === year;
      });
      return total + payments.reduce((sum: number, payment: any) => sum + payment.amount, 0);
    }, 0);

    const monthlySavings = Object.values(savingContributionsByGoal).reduce((total, contributions) => {
      const monthContributions = contributions.filter(contribution => {
        const contributionDate = new Date(contribution.date);
        return contributionDate.getMonth() === monthNum - 1 && contributionDate.getFullYear() === year;
      });
      return total + monthContributions.reduce((sum, contribution) => sum + contribution.amount, 0);
    }, 0);

    const totalIncome = monthlyIncomes.reduce((sum, income) => sum + income.amount, 0);
    const totalExpenses = monthlyExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    
    return {
      totalIncome,
      totalExpenses,
      monthlyPayments,
      monthlySavings,
      netAmount: totalIncome - totalExpenses - monthlyPayments,
      incomes: monthlyIncomes,
      expenses: monthlyExpenses
    };
  };

  // Get category data
  const getCategoryData = (month: string, type: 'income' | 'expense', category: string) => {
    const [year, monthNum] = month.split('-').map(Number);
    
    if (type === 'income') {
      const categoryIncomes = incomes.filter(income => {
        const incomeDate = new Date(income.date);
        return incomeDate.getMonth() === monthNum - 1 && 
               incomeDate.getFullYear() === year && 
               income.category === category;
      });
      return {
        items: categoryIncomes,
        total: categoryIncomes.reduce((sum, income) => sum + income.amount, 0)
      };
    } else {
      const categoryExpenses = expenses.filter(expense => {
        const expenseDate = new Date(expense.date);
        return expenseDate.getMonth() === monthNum - 1 && 
               expenseDate.getFullYear() === year && 
               expense.category === category;
      });
      return {
        items: categoryExpenses,
        total: categoryExpenses.reduce((sum, expense) => sum + expense.amount, 0)
      };
    }
  };

  // Get weekly data for current month
  const getWeeklyData = (month: string) => {
    const [year, monthNum] = month.split('-').map(Number);
    const weeks = [];
    
    // Get all weeks in the selected month
    for (let week = 1; week <= 4; week++) {
      const startDate = new Date(year, monthNum - 1, (week - 1) * 7 + 1);
      const endDate = new Date(year, monthNum - 1, week * 7);
      
      const weekIncomes = incomes.filter(income => {
        const incomeDate = new Date(income.date);
        return incomeDate >= startDate && incomeDate <= endDate;
      });

      const weekExpenses = expenses.filter(expense => {
        const expenseDate = new Date(expense.date);
        return expenseDate >= startDate && expenseDate <= endDate;
      });

      const weeklyIncome = weekIncomes.reduce((sum, income) => sum + income.amount, 0);
      const weeklyExpense = weekExpenses.reduce((sum, expense) => sum + expense.amount, 0);

      weeks.push({
        week,
        startDate: formatDate(startDate.toISOString()),
        endDate: formatDate(endDate.toISOString()),
        income: weeklyIncome,
        expense: weeklyExpense,
        net: weeklyIncome - weeklyExpense
      });
    }
    
    return weeks;
  };

  // Export to PDF
  const exportToPDF = async () => {
    const element = document.getElementById('report-content');
    if (!element) return;

    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff'
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const imgWidth = 210;
      const pageHeight = 295;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const selectedMonthLabel = getAvailableMonths().find(m => m.value === selectedMonth)?.label || selectedMonth;
      pdf.save(`finansal-rapor-${selectedMonthLabel}.pdf`);
    } catch (error) {
      console.error('PDF export error:', error);
    }
  };

  const monthlyData = getMonthlyData(selectedMonth);
  const weeklyData = getWeeklyData(selectedMonth);
  const availableMonths = getAvailableMonths();
  const incomeCategories = getIncomeCategories();
  const expenseCategories = getExpenseCategories();
  
  const selectedIncomeCategoryData = selectedIncomeCategory && selectedIncomeCategory !== 'all' ? 
    getCategoryData(selectedMonth, 'income', selectedIncomeCategory) : null;
  const selectedExpenseCategoryData = selectedExpenseCategory && selectedExpenseCategory !== 'all' ? 
    getCategoryData(selectedMonth, 'expense', selectedExpenseCategory) : null;

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Finansal Raporlar</h2>
          <Button onClick={exportToPDF} className="flex items-center gap-2">
            <Download className="w-4 h-4" />
            PDF İndir
          </Button>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Ay seçin" />
              </SelectTrigger>
              <SelectContent>
                {availableMonths.map(month => (
                  <SelectItem key={month.value} value={month.value}>
                    {month.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Tabs value={reportType} onValueChange={(value) => setReportType(value as 'monthly' | 'weekly')}>
            <TabsList>
              <TabsTrigger value="monthly">Aylık</TabsTrigger>
              <TabsTrigger value="weekly">Haftalık</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Report Content */}
      <div id="report-content" className="space-y-6 bg-white p-6 rounded-lg">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Finansal Rapor</h1>
          <p className="text-gray-600">{availableMonths.find(m => m.value === selectedMonth)?.label}</p>
          <p className="text-sm text-gray-500">Rapor Tarihi: {formatDate(new Date().toISOString())}</p>
        </div>

        {/* Monthly Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4 text-center">
              <TrendingUp className="w-8 h-8 text-green-600 mx-auto mb-2" />
              <p className="text-sm text-gray-600">Toplam Gelir</p>
              <p className="text-xl font-bold text-green-600">+{formatCurrency(monthlyData.totalIncome)}</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <TrendingDown className="w-8 h-8 text-red-600 mx-auto mb-2" />
              <p className="text-sm text-gray-600">Toplam Gider</p>
              <p className="text-xl font-bold text-red-600">-{formatCurrency(monthlyData.totalExpenses)}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <FileText className="w-8 h-8 text-orange-600 mx-auto mb-2" />
              <p className="text-sm text-gray-600">Borç Ödemeleri</p>
              <p className="text-xl font-bold text-orange-600">-{formatCurrency(monthlyData.monthlyPayments)}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <BarChart3 className="w-8 h-8 text-blue-600 mx-auto mb-2" />
              <p className="text-sm text-gray-600">Net Durum</p>
              <p className={`text-xl font-bold ${monthlyData.netAmount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {monthlyData.netAmount >= 0 ? '+' : ''}{formatCurrency(monthlyData.netAmount)}
              </p>
            </CardContent>
          </Card>
        </div>

        {reportType === 'weekly' ? (
          // Weekly Report
          <Card>
            <CardHeader>
              <CardTitle>Haftalık Detay Raporu</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {weeklyData.map((week, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="font-semibold">{week.week}. Hafta</h3>
                      <span className="text-sm text-gray-500">{week.startDate} - {week.endDate}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Gelir</p>
                        <p className="font-semibold text-green-600">+{formatCurrency(week.income)}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Gider</p>
                        <p className="font-semibold text-red-600">-{formatCurrency(week.expense)}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Net</p>
                        <p className={`font-semibold ${week.net >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {week.net >= 0 ? '+' : ''}{formatCurrency(week.net)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : (
          // Category Selection and Details
          <div className="space-y-6">
            {/* Category Filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-green-600 flex items-center gap-2">
                    <Filter className="w-5 h-5" />
                    Gelir Kategorisi Seç
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Select value={selectedIncomeCategory} onValueChange={(value) => setSelectedIncomeCategory(value === 'all' ? '' : value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Kategori seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Hepsini Temizle</SelectItem>
                      {incomeCategories.map(category => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-red-600 flex items-center gap-2">
                    <Filter className="w-5 h-5" />
                    Gider Kategorisi Seç
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Select value={selectedExpenseCategory} onValueChange={(value) => setSelectedExpenseCategory(value === 'all' ? '' : value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Kategori seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Hepsini Temizle</SelectItem>
                      {expenseCategories.map(category => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>
            </div>

            {/* Selected Category Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Selected Income Category */}
              {selectedIncomeCategoryData && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-green-600">
                      {selectedIncomeCategory} - Gelir Detayları
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Toplam: <span className="font-bold text-green-600">+{formatCurrency(selectedIncomeCategoryData.total)}</span>
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {selectedIncomeCategoryData.items.length > 0 ? (
                        selectedIncomeCategoryData.items.map((income, index) => (
                          <div key={index} className="flex justify-between items-center py-2 border-b">
                            <div>
                              <p className="font-medium">{income.description}</p>
                              <p className="text-sm text-gray-500">{formatDate(income.date)}</p>
                            </div>
                            <p className="font-semibold text-green-600">+{formatCurrency(income.amount)}</p>
                          </div>
                        ))
                      ) : (
                        <p className="text-gray-500 text-center py-4">Bu kategoride gelir kaydı bulunmuyor</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Selected Expense Category */}
              {selectedExpenseCategoryData && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-red-600">
                      {selectedExpenseCategory} - Gider Detayları
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Toplam: <span className="font-bold text-red-600">-{formatCurrency(selectedExpenseCategoryData.total)}</span>
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {selectedExpenseCategoryData.items.length > 0 ? (
                        selectedExpenseCategoryData.items.map((expense, index) => (
                          <div key={index} className="flex justify-between items-center py-2 border-b">
                            <div>
                              <p className="font-medium">{expense.description}</p>
                              <p className="text-sm text-gray-500">{formatDate(expense.date)}</p>
                            </div>
                            <p className="font-semibold text-red-600">-{formatCurrency(expense.amount)}</p>
                          </div>
                        ))
                      ) : (
                        <p className="text-gray-500 text-center py-4">Bu kategoride gider kaydı bulunmuyor</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Show message when no category is selected */}
            {!selectedIncomeCategory && !selectedExpenseCategory && (
              <Card>
                <CardContent className="p-8 text-center">
                  <Filter className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Kategori Detaylarını Görüntüle</h3>
                  <p className="text-muted-foreground">
                    Yukarıdaki filtrelerden gelir veya gider kategorisi seçerek detaylı harcama analizini görüntüleyebilirsiniz.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Özet</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
              <div className="p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Gelir/Gider Farkı</p>
                <p className={`text-xl font-bold ${(monthlyData.totalIncome - monthlyData.totalExpenses) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(monthlyData.totalIncome - monthlyData.totalExpenses)}
                </p>
              </div>
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Tasarruf Oranı</p>
                <p className="text-xl font-bold text-blue-600">
                  {monthlyData.totalIncome > 0 ? ((monthlyData.monthlySavings / monthlyData.totalIncome) * 100).toFixed(1) : 0}%
                </p>
              </div>
              <div className="p-4 bg-orange-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Gider Oranı</p>
                <p className="text-xl font-bold text-orange-600">
                  {monthlyData.totalIncome > 0 ? ((monthlyData.totalExpenses / monthlyData.totalIncome) * 100).toFixed(1) : 0}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};