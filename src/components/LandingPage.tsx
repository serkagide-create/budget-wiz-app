import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Star, TrendingUp, PiggyBank, CreditCard, Target, BarChart3, Shield, Smartphone, Users, CheckCircle, Sparkles } from 'lucide-react';

interface LandingPageProps {
  onGetStarted: () => void;
}

const LandingPage = ({ onGetStarted }: LandingPageProps) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const testimonials = [
    {
      name: "Ayşe Yılmaz",
      rating: 5,
      comment: "Bu uygulama sayesinde aylık harcamalarımı %30 azalttım. Gerçekten hayat kurtarıcı!",
      profession: "Öğretmen"
    },
    {
      name: "Mehmet Demir",
      rating: 5,
      comment: "Bütçe planlaması hiç bu kadar kolay olmamıştı. Borç takibi özelliği harika!",
      profession: "Mühendis"
    },
    {
      name: "Zeynep Kaya",
      rating: 5,
      comment: "Tasarruf hedeflerime ulaşmak artık çok daha eğlenceli ve motivasyonel.",
      profession: "Grafik Tasarımcı"
    },
    {
      name: "Can Özkan",
      rating: 4,
      comment: "Sesli asistan özelliği çok pratik. Her yerden gelir-gider ekleyebiliyorum.",
      profession: "Pazarlama Uzmanı"
    }
  ];

  const features = [
    {
      icon: <TrendingUp className="w-8 h-8" />,
      title: "Akıllı Gelir Takibi",
      description: "Tüm gelirlerinizi kategorilendirin ve otomatik tekrar eden gelirler ekleyin"
    },
    {
      icon: <CreditCard className="w-8 h-8" />,
      title: "Borç Yönetimi",
      description: "Borçlarınızı takip edin, ödeme planları oluşturun ve borçtan kurtulun"
    },
    {
      icon: <PiggyBank className="w-8 h-8" />,
      title: "Tasarruf Hedefleri",
      description: "Hedeflerinizi belirleyin ve tasarruf ilerlemenizi görsel olarak takip edin"
    },
    {
      icon: <BarChart3 className="w-8 h-8" />,
      title: "Detaylı Raporlar",
      description: "Gelir-gider analizi ve finansal durumunuzu görselleştiren grafikler"
    },
    {
      icon: <Smartphone className="w-8 h-8" />,
      title: "Sesli Asistan",
      description: "AI destekli sesli komutlarla hızlıca veri girişi yapın"
    },
    {
      icon: <Shield className="w-8 h-8" />,
      title: "Güvenli Depolama",
      description: "Verileriniz şifrelenmiş olarak güvenle saklanır"
    }
  ];

  const steps = [
    {
      step: 1,
      title: "Kayıt Olun",
      description: "Hızlı kayıt işlemi ile hesabınızı oluşturun"
    },
    {
      step: 2,
      title: "Gelirlerinizi Ekleyin",
      description: "Maaş, freelance gelir ve diğer kaynaklarınızı girin"
    },
    {
      step: 3,
      title: "Hedeflerinizi Belirleyin",
      description: "Tasarruf hedefleri ve borç ödeme planları oluşturun"
    },
    {
      step: 4,
      title: "Takip Edin",
      description: "İlerlemenizi takip edin ve finansal özgürlüğe ulaşın"
    }
  ];

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 transition-all duration-300 ${
          i < rating 
            ? 'text-warning fill-current animate-pulse-glow' 
            : 'text-muted-foreground hover:text-warning'
        }`}
      />
    ));
  };

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Hero Section */}
      <section className="relative bg-gradient-income text-income-foreground overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-32 h-32 bg-income-foreground rounded-full animate-float"></div>
          <div className="absolute top-40 right-20 w-20 h-20 bg-income-foreground rounded-full animate-bounce-gentle"></div>
          <div className="absolute bottom-20 left-1/4 w-16 h-16 bg-income-foreground rounded-full animate-float" style={{animationDelay: '1s'}}></div>
        </div>
        
        <div className="container mx-auto px-4 py-20 relative z-10">
          <div className={`text-center max-w-4xl mx-auto transition-all duration-1000 ${isVisible ? 'animate-fade-in-up' : 'opacity-0'}`}>
            <div className="mb-6">
              <Sparkles className="w-16 h-16 mx-auto mb-4 animate-pulse-glow" />
            </div>
            <h1 className="text-5xl md:text-6xl font-bold mb-6 gradient-text">
              Finansal Özgürlüğe
              <span className="block animate-fade-in-up-delay-1">Giden Yolunuz</span>
            </h1>
            <p className="text-xl md:text-2xl mb-8 opacity-90 animate-fade-in-up-delay-2">
              Akıllı bütçe yönetimi ile gelirlerinizi artırın, borçlarınızdan kurtulun ve tasarruf hedeflerinize ulaşın.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in-up-delay-3">
              <Button
                size="lg"
                onClick={onGetStarted}
                className="bg-card text-card-foreground hover:bg-card/90 text-lg px-8 py-3 hover-lift animate-pulse-glow transition-all duration-300"
              >
                <Users className="w-5 h-5 mr-2" />
                Ücretsiz Başlayın
              </Button>
              <Badge variant="secondary" className="self-center px-4 py-2 animate-bounce-gentle">
                💡 Kredi kartı gerektirmez
              </Badge>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div className="animate-slide-in-left hover-lift">
              <div className="text-4xl font-bold text-income mb-2 animate-scale-in">10,000+</div>
              <div className="text-muted-foreground">Aktif Kullanıcı</div>
            </div>
            <div className="animate-fade-in-up hover-lift" style={{animationDelay: '0.2s'}}>
              <div className="text-4xl font-bold text-savings mb-2 animate-scale-in" style={{animationDelay: '0.2s'}}>₺2.5M+</div>
              <div className="text-muted-foreground">Toplam Tasarruf</div>
            </div>
            <div className="animate-slide-in-right hover-lift">
              <div className="text-4xl font-bold text-primary mb-2 animate-scale-in" style={{animationDelay: '0.4s'}}>95%</div>
              <div className="text-muted-foreground">Kullanıcı Memnuniyeti</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16 animate-fade-in-up">
            <h2 className="text-4xl font-bold mb-4 gradient-text">Güçlü Özellikler</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto animate-fade-in-up-delay-1">
              Finansal hayatınızı kolaylaştıran ve hedeflerinize ulaşmanızı sağlayan özellikler
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card 
                key={index} 
                className="border-0 shadow-card hover:shadow-lg transition-all duration-500 hover-lift gradient-border animate-fade-in-up group"
                style={{animationDelay: `${index * 0.1}s`}}
              >
                <CardHeader>
                  <div className="w-12 h-12 bg-gradient-income rounded-lg flex items-center justify-center text-income-foreground mb-4 group-hover:animate-bounce-gentle transition-all duration-300">
                    {feature.icon}
                  </div>
                  <CardTitle className="text-xl group-hover:text-primary transition-colors duration-300">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground group-hover:text-foreground transition-colors duration-300">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-muted/30 relative overflow-hidden">
        {/* Background Animation */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-10 right-10 w-40 h-40 bg-primary rounded-full animate-float"></div>
          <div className="absolute bottom-10 left-10 w-24 h-24 bg-savings rounded-full animate-bounce-gentle"></div>
        </div>
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center mb-16 animate-fade-in-up">
            <h2 className="text-4xl font-bold mb-4 gradient-text">Nasıl Çalışır?</h2>
            <p className="text-xl text-muted-foreground animate-fade-in-up-delay-1">4 basit adımda finansal kontrol</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((step, index) => (
              <div 
                key={index} 
                className="text-center group animate-fade-in-up hover-lift"
                style={{animationDelay: `${index * 0.2}s`}}
              >
                <div className="w-16 h-16 bg-gradient-savings rounded-full flex items-center justify-center text-savings-foreground text-2xl font-bold mx-auto mb-4 group-hover:animate-pulse-glow transition-all duration-300 group-hover:scale-110">
                  {step.step}
                </div>
                <h3 className="text-xl font-semibold mb-2 group-hover:text-primary transition-colors duration-300">{step.title}</h3>
                <p className="text-muted-foreground group-hover:text-foreground transition-colors duration-300">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16 animate-fade-in-up">
            <h2 className="text-4xl font-bold mb-4 gradient-text">Kullanıcı Yorumları</h2>
            <p className="text-xl text-muted-foreground animate-fade-in-up-delay-1">Binlerce mutlu kullanıcımızdan birkaçı</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {testimonials.map((testimonial, index) => (
              <Card 
                key={index} 
                className="border-0 shadow-card hover-lift gradient-border group animate-fade-in-up"
                style={{animationDelay: `${index * 0.15}s`}}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-1 mb-2 group-hover:scale-110 transition-transform duration-300">
                    {renderStars(testimonial.rating)}
                  </div>
                  <CardTitle className="text-lg group-hover:text-primary transition-colors duration-300">{testimonial.name}</CardTitle>
                  <p className="text-sm text-muted-foreground group-hover:text-primary/70 transition-colors duration-300">{testimonial.profession}</p>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed group-hover:text-foreground transition-colors duration-300">"{testimonial.comment}"</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-savings text-savings-foreground relative overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-16 left-16 w-28 h-28 bg-savings-foreground rounded-full animate-float"></div>
          <div className="absolute bottom-16 right-16 w-20 h-20 bg-savings-foreground rounded-full animate-bounce-gentle"></div>
          <div className="absolute top-1/2 left-1/3 w-12 h-12 bg-savings-foreground rounded-full animate-float" style={{animationDelay: '1.5s'}}></div>
        </div>
        
        <div className="container mx-auto px-4 text-center relative z-10">
          <div className="animate-fade-in-up">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Finansal Geleceğinizi
              <span className="block animate-fade-in-up-delay-1">Bugün Planlayın</span>
            </h2>
            <p className="text-xl mb-8 opacity-90 max-w-2xl mx-auto animate-fade-in-up-delay-2">
              Binlerce kişi finansal hedeflerine ulaştı. Sıra sizde!
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-fade-in-up-delay-3">
              <Button
                size="lg"
                onClick={onGetStarted}
                className="bg-card text-card-foreground hover:bg-card/90 text-lg px-8 py-3 hover-lift animate-pulse-glow transition-all duration-300"
              >
                <CheckCircle className="w-5 h-5 mr-2" />
                Hemen Başla - Ücretsiz
              </Button>
              <div className="flex items-center gap-2 text-sm opacity-75 animate-bounce-gentle">
                <Shield className="w-4 h-4" />
                SSL şifreleme ile güvenli
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t animate-fade-in-up">
        <div className="container mx-auto px-4 text-center">
          <p className="text-muted-foreground hover:text-foreground transition-colors duration-300">
            © 2024 Finansal Özgürlük. Tüm hakları saklıdır.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;