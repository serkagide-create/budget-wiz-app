import React, { useEffect, useMemo, useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { CreditCard, PiggyBank, BarChart3, DollarSign, CalendarClock, CheckCircle2 } from 'lucide-react';

const TAB_KEYS = ['income', 'debts', 'savings', 'reports'] as const;

type TabKey = typeof TAB_KEYS[number];

const AnimatedPreview: React.FC = () => {
  const [active, setActive] = useState<TabKey>('income');

  // Auto-rotate tabs for the video-like effect
  useEffect(() => {
    const interval = setInterval(() => {
      setActive((prev) => {
        const idx = TAB_KEYS.indexOf(prev);
        return TAB_KEYS[(idx + 1) % TAB_KEYS.length];
      });
    }, 2600);
    return () => clearInterval(interval);
  }, []);

  const progressBar = (value: number, gradient: string) => (
    <div className="mt-2 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
      <div className={`h-full ${gradient}`} style={{ width: `${value}%` }} />
    </div>
  );

  const debts = useMemo(
    () => [
      { name: 'Kredi Kartı', due: '15 Ağustos', left: '₺4.200', progress: 60, color: 'bg-gradient-to-r from-blue-500 to-cyan-600' },
      { name: 'İhtiyaç Kredisi', due: '28 Ağustos', left: '₺12.750', progress: 35, color: 'bg-gradient-to-r from-indigo-500 to-purple-600' },
    ],
    []
  );

  const goals = useMemo(
    () => [
      { name: 'Acil Durum Fonu', target: '₺30.000', progress: 45, color: 'bg-gradient-to-r from-green-500 to-emerald-600' },
      { name: 'Yaz Tatili', target: '₺20.000', progress: 70, color: 'bg-gradient-to-r from-pink-500 to-rose-600' },
    ],
    []
  );

  return (
    <div aria-label="Uygulama canlı önizleme" className="relative mx-auto max-w-md w-full">
      <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800 shadow-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Borç Yok • Demo</span>
          <span className="text-xs text-gray-500">Canlı Önizleme</span>
        </div>

        <div className="p-0 relative bg-gray-50 dark:bg-gray-900">
          <Tabs value={active} onValueChange={(v) => setActive(v as TabKey)} defaultValue="income">
            <div className="px-4 pt-4">
              <TabsList className="grid grid-cols-4 w-full">
                <TabsTrigger value="income" className="text-xs sm:text-sm">Gelir</TabsTrigger>
                <TabsTrigger value="debts" className="text-xs sm:text-sm">Borçlar</TabsTrigger>
                <TabsTrigger value="savings" className="text-xs sm:text-sm">Birikim</TabsTrigger>
                <TabsTrigger value="reports" className="text-xs sm:text-sm">Raporlar</TabsTrigger>
              </TabsList>
            </div>

            <div className="p-4 relative h-96">
              {/* INCOME */}
              <TabsContent value="income" className="m-0 h-full">
                <div className="absolute inset-0 flex flex-col gap-3 p-2">
                  <div className="animate-enter rounded-xl bg-white dark:bg-gray-800 border border-gray-200/70 dark:border-gray-700/70 shadow p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">Aylık Gelir</span>
                      <span className="text-xs text-green-600">+₺25.000</span>
                    </div>
                    {progressBar(70, 'bg-gradient-to-r from-green-500 to-emerald-600')}
                  </div>

                  <div className="animate-slide-in-right rounded-xl bg-white dark:bg-gray-800 border border-gray-200/70 dark:border-gray-700/70 shadow p-3">
                    <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
                      <DollarSign className="w-4 h-4 text-green-500" />
                      <span>Otomatik: Maaş her ayın 1’inde eklenir</span>
                    </div>
                  </div>

                  <div className="animate-scale-in rounded-xl bg-white dark:bg-gray-800 border border-gray-200/70 dark:border-gray-700/70 shadow p-3">
                    <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
                      <CalendarClock className="w-4 h-4 text-purple-500" />
                      <span>AI danışman nakit akışını tahmin ediyor</span>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* DEBTS */}
              <TabsContent value="debts" className="m-0 h-full">
                <div className="absolute inset-0 flex flex-col gap-3 p-2">
                  {debts.map((d, i) => (
                    <div key={d.name} className={`animate-enter rounded-xl bg-white dark:bg-gray-800 border border-gray-200/70 dark:border-gray-700/70 shadow p-3 delay-[${i * 100}ms]`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CreditCard className="w-4 h-4 text-blue-500" />
                          <span className="text-sm font-semibold text-gray-900 dark:text-white">{d.name}</span>
                        </div>
                        <span className="text-xs text-gray-600 dark:text-gray-300">Son: {d.due}</span>
                      </div>
                      {progressBar(d.progress, d.color)}
                      <div className="mt-2 text-xs text-gray-500">Kalan: {d.left} • Strateji: Snowball</div>
                    </div>
                  ))}

                  <div className="animate-slide-in-right rounded-xl bg-white dark:bg-gray-800 border border-gray-200/70 dark:border-gray-700/70 shadow p-3">
                    <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      <span>Gelirden önce küçük borçlar kapatılır, faiz yükü düşer</span>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* SAVINGS */}
              <TabsContent value="savings" className="m-0 h-full">
                <div className="absolute inset-0 flex flex-col gap-3 p-2">
                  {goals.map((g, i) => (
                    <div key={g.name} className={`animate-enter rounded-xl bg-white dark:bg-gray-800 border border-gray-200/70 dark:border-gray-700/70 shadow p-3 delay-[${i * 100}ms]`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <PiggyBank className="w-4 h-4 text-purple-500" />
                          <span className="text-sm font-semibold text-gray-900 dark:text-white">{g.name}</span>
                        </div>
                        <span className="text-xs text-gray-600 dark:text-gray-300">Hedef: {g.target}</span>
                      </div>
                      {progressBar(g.progress, g.color)}
                      <div className="mt-2 text-xs text-gray-500">Artan bütçe otomatik olarak hedeflere dağıtılır</div>
                    </div>
                  ))}

                  <div className="animate-slide-in-right rounded-xl bg-white dark:bg-gray-800 border border-gray-200/70 dark:border-gray-700/70 shadow p-3">
                    <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
                      <DollarSign className="w-4 h-4 text-emerald-500" />
                      <span>Önce borç, sonra birikim: dengeyi AI önerir</span>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* REPORTS */}
              <TabsContent value="reports" className="m-0 h-full">
                <div className="absolute inset-0 flex flex-col gap-3 p-2">
                  <div className="animate-enter rounded-xl bg-white dark:bg-gray-800 border border-gray-200/70 dark:border-gray-700/70 shadow p-4">
                    <div className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Aylık Özet</div>
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div>
                        <div className="text-xs text-gray-500">Gelir</div>
                        <div className="text-green-600 font-bold">₺25k</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">Borç Ödemesi</div>
                        <div className="text-blue-600 font-bold">₺6k</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">Birikim</div>
                        <div className="text-purple-600 font-bold">₺3k</div>
                      </div>
                    </div>
                  </div>

                  <div className="animate-scale-in rounded-xl bg-white dark:bg-gray-800 border border-gray-200/70 dark:border-gray-700/70 shadow p-4">
                    <div className="text-xs text-gray-600 dark:text-gray-300 mb-1">Finansal Sağlık Skoru</div>
                    {progressBar(82, 'bg-gradient-to-r from-emerald-500 to-green-600')}
                    <div className="mt-2 text-xs text-gray-500">AI önerilerine uyum ile skor yükselir</div>
                  </div>
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>
      <p className="mt-4 text-sm text-gray-500 dark:text-gray-400 text-center">Arayüz önizlemesi animasyonlarla adımları gösterir.</p>
    </div>
  );
};

export default AnimatedPreview;
