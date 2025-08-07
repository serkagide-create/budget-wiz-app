import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Trophy, 
  Target, 
  PiggyBank, 
  TrendingUp,
  Star,
  Crown,
  Award,
  Zap,
  Shield,
  Sparkles
} from 'lucide-react';

interface FinancialData {
  totalIncome: number;
  totalDebtRemaining: number;
  totalSavings: number;
  completedGoals: number;
  totalGoals: number;
  monthsTracking: number;
}

interface AchievementBadgesProps {
  data: FinancialData;
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  unlocked: boolean;
  progress: number;
  maxProgress: number;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  category: 'savings' | 'debt' | 'goals' | 'consistency';
}

export const AchievementBadges: React.FC<AchievementBadgesProps> = ({ data }) => {
  const calculateAchievements = (): Achievement[] => {
    const achievements: Achievement[] = [
      // Birikim Rozetleri
      {
        id: 'first_save',
        title: 'İlk Adım',
        description: 'İlk birikimini yaptın!',
        icon: <PiggyBank className="w-5 h-5" />,
        unlocked: data.totalSavings > 0,
        progress: data.totalSavings > 0 ? 1 : 0,
        maxProgress: 1,
        tier: 'bronze',
        category: 'savings'
      },
      {
        id: 'saver_bronze',
        title: 'Tasarruf Uzmanı',
        description: '10.000 ₺ birikim yaptın',
        icon: <PiggyBank className="w-5 h-5" />,
        unlocked: data.totalSavings >= 10000,
        progress: Math.min(data.totalSavings, 10000),
        maxProgress: 10000,
        tier: 'bronze',
        category: 'savings'
      },
      {
        id: 'saver_silver',
        title: 'Birikim Şampiyonu',
        description: '50.000 ₺ birikim yaptın',
        icon: <Crown className="w-5 h-5" />,
        unlocked: data.totalSavings >= 50000,
        progress: Math.min(data.totalSavings, 50000),
        maxProgress: 50000,
        tier: 'silver',
        category: 'savings'
      },
      {
        id: 'saver_gold',
        title: 'Altın Birikimci',
        description: '100.000 ₺ birikim yaptın',
        icon: <Trophy className="w-5 h-5" />,
        unlocked: data.totalSavings >= 100000,
        progress: Math.min(data.totalSavings, 100000),
        maxProgress: 100000,
        tier: 'gold',
        category: 'savings'
      },

      // Borç Rozetleri
      {
        id: 'debt_free',
        title: 'Borçsuz Hayat',
        description: 'Tüm borçlarını temizledin!',
        icon: <Shield className="w-5 h-5" />,
        unlocked: data.totalDebtRemaining === 0 && data.totalIncome > 0,
        progress: data.totalDebtRemaining === 0 ? 1 : 0,
        maxProgress: 1,
        tier: 'gold',
        category: 'debt'
      },
      {
        id: 'debt_reducer',
        title: 'Borç Avcısı',
        description: 'Borçlarını azaltmaya başladın',
        icon: <TrendingUp className="w-5 h-5" />,
        unlocked: data.totalDebtRemaining < data.totalIncome && data.totalIncome > 0,
        progress: data.totalDebtRemaining < data.totalIncome ? 1 : 0,
        maxProgress: 1,
        tier: 'bronze',
        category: 'debt'
      },

      // Hedef Rozetleri
      {
        id: 'goal_setter',
        title: 'Hedef Koyucu',
        description: 'İlk hedefini belirledin',
        icon: <Target className="w-5 h-5" />,
        unlocked: data.totalGoals > 0,
        progress: data.totalGoals > 0 ? 1 : 0,
        maxProgress: 1,
        tier: 'bronze',
        category: 'goals'
      },
      {
        id: 'goal_achiever',
        title: 'Hedef Avcısı',
        description: 'İlk hedefini tamamladın',
        icon: <Award className="w-5 h-5" />,
        unlocked: data.completedGoals > 0,
        progress: data.completedGoals > 0 ? 1 : 0,
        maxProgress: 1,
        tier: 'silver',
        category: 'goals'
      },
      {
        id: 'goal_master',
        title: 'Hedef Ustası',
        description: '5 hedefi tamamladın',
        icon: <Crown className="w-5 h-5" />,
        unlocked: data.completedGoals >= 5,
        progress: Math.min(data.completedGoals, 5),
        maxProgress: 5,
        tier: 'gold',
        category: 'goals'
      },

      // Tutarlılık Rozetleri
      {
        id: 'consistency_week',
        title: 'Kararlı Başlangıç',
        description: '1 hafta finansal takip yaptın',
        icon: <Zap className="w-5 h-5" />,
        unlocked: data.monthsTracking >= 0.25,
        progress: Math.min(data.monthsTracking, 0.25),
        maxProgress: 0.25,
        tier: 'bronze',
        category: 'consistency'
      },
      {
        id: 'consistency_month',
        title: 'Aylık Disiplin',
        description: '1 ay finansal takip yaptın',
        icon: <Star className="w-5 h-5" />,
        unlocked: data.monthsTracking >= 1,
        progress: Math.min(data.monthsTracking, 1),
        maxProgress: 1,
        tier: 'silver',
        category: 'consistency'
      },
      {
        id: 'consistency_year',
        title: 'Yıllık Sadakat',
        description: '1 yıl finansal takip yaptın',
        icon: <Sparkles className="w-5 h-5" />,
        unlocked: data.monthsTracking >= 12,
        progress: Math.min(data.monthsTracking, 12),
        maxProgress: 12,
        tier: 'platinum',
        category: 'consistency'
      }
    ];

    return achievements;
  };

  const achievements = calculateAchievements();
  const unlockedAchievements = achievements.filter(a => a.unlocked);
  const nextAchievements = achievements.filter(a => !a.unlocked).slice(0, 3);

  const getTierColor = (tier: string, unlocked: boolean): string => {
    if (!unlocked) return 'hsl(var(--muted-foreground))';
    
    switch (tier) {
      case 'bronze': return 'hsl(30, 70%, 50%)';
      case 'silver': return 'hsl(0, 0%, 60%)';
      case 'gold': return 'hsl(45, 100%, 50%)';
      case 'platinum': return 'hsl(280, 70%, 60%)';
      default: return 'hsl(var(--primary))';
    }
  };

  const getTierBadgeVariant = (tier: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (tier) {
      case 'bronze': return 'outline';
      case 'silver': return 'secondary';
      case 'gold': return 'default';
      case 'platinum': return 'destructive';
      default: return 'outline';
    }
  };

  return (
    <div className="space-y-6">
      {/* Kazanılan Rozetler */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-primary" />
            Başarı Rozetleri ({unlockedAchievements.length}/{achievements.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {unlockedAchievements.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {unlockedAchievements.map((achievement) => (
                <div
                  key={achievement.id}
                  className="p-4 border rounded-lg bg-gradient-to-br from-primary/5 to-secondary/5 border-primary/20 transition-all hover:scale-105"
                >
                  <div className="flex items-start gap-3">
                    <div 
                      className="p-2 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: `${getTierColor(achievement.tier, true)}20` }}
                    >
                      <div style={{ color: getTierColor(achievement.tier, true) }}>
                        {achievement.icon}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-sm">{achievement.title}</h4>
                        <Badge variant={getTierBadgeVariant(achievement.tier)} className="text-xs">
                          {achievement.tier.toUpperCase()}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{achievement.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Trophy className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Henüz kazanılan rozet yok</p>
              <p className="text-xs">Finansal hedeflerinize ulaşarak rozetler kazanın!</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Yaklaşan Rozetler */}
      {nextAchievements.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-muted-foreground" />
              Yaklaşan Rozetler
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {nextAchievements.map((achievement) => (
                <div
                  key={achievement.id}
                  className="p-4 border rounded-lg bg-muted/30 transition-all hover:bg-muted/40"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                      <div className="text-muted-foreground">
                        {achievement.icon}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-sm text-muted-foreground">{achievement.title}</h4>
                        <Badge variant="outline" className="text-xs">
                          {achievement.tier.toUpperCase()}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">{achievement.description}</p>
                      
                      {achievement.maxProgress > 1 && (
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>İlerleme</span>
                            <span>
                              {achievement.progress.toLocaleString('tr-TR')} / {achievement.maxProgress.toLocaleString('tr-TR')}
                            </span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-1.5">
                            <div 
                              className="bg-primary h-1.5 rounded-full transition-all duration-500"
                              style={{ width: `${(achievement.progress / achievement.maxProgress) * 100}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
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