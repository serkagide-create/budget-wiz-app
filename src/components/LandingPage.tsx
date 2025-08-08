import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { Star, TrendingUp, PiggyBank, CreditCard, BarChart3, Shield, Smartphone, Users, CheckCircle, Sparkles, ArrowRight, DollarSign, Target, Zap } from 'lucide-react';
import AnimatedPreview from '@/components/AnimatedPreview';

interface LandingPageProps {
  onGetStarted: () => void;
}

const LandingPage = ({ onGetStarted }: LandingPageProps) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  useEffect(() => {
    document.title = "Borç Yok | Nasıl Çalışır, Hakkımızda ve İletişim";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) {
      meta.setAttribute('content', 'Borç Yok ile bütçe, borç yönetimi ve tasarruf hedefleri. Nasıl çalışır, hakkımızda ve bize ulaşın.');
    }
  }, []);

  const testimonials = [
    {
      name: "Ayşe Yılmaz",
      rating: 5,
      comment: "Bu uygulama sayesinde aylık harcamalarımı %30 azalttım. Gerçekten hayat kurtarıcı!",
      profession: "Öğretmen",
      avatar: "AY"
    },
    {
      name: "Mehmet Demir",
      rating: 5,
      comment: "Bütçe planlaması hiç bu kadar kolay olmamıştı. Borç takibi özelliği harika!",
      profession: "Mühendis",
      avatar: "MD"
    },
    {
      name: "Zeynep Kaya",
      rating: 5,
      comment: "Tasarruf hedeflerime ulaşmak artık çok daha eğlenceli ve motivasyonel.",
      profession: "Grafik Tasarımcı",
      avatar: "ZK"
    },
    {
      name: "Can Özkan",
      rating: 4,
      comment: "Sesli asistan özelliği çok pratik. Her yerden gelir-gider ekleyebiliyorum.",
      profession: "Pazarlama Uzmanı",
      avatar: "CO"
    }
  ];

  const features = [
    {
      icon: <Sparkles className="w-6 h-6" />,
      title: "AI Danışman",
      description: "Nakit akışı tahmini, borç kapatma stratejisi (Kartopu/Çığ), hedeflere akıllı dağıtım ve zamanında hatırlatmalar",
      color: "from-emerald-500 to-teal-600"
    },
    {
      icon: <TrendingUp className="w-6 h-6" />,
      title: "Akıllı Gelir Takibi",
      description: "Tüm gelirlerinizi kategorilendirin ve otomatik tekrar eden gelirler ekleyin",
      color: "from-green-500 to-emerald-600"
    },
    {
      icon: <CreditCard className="w-6 h-6" />,
      title: "Borç Yönetimi", 
      description: "Borçlarınızı takip edin, ödeme planları oluşturun ve borçtan kurtulun",
      color: "from-blue-500 to-cyan-600"
    },
    {
      icon: <PiggyBank className="w-6 h-6" />,
      title: "Tasarruf Hedefleri",
      description: "Hedeflerinizi belirleyin ve tasarruf ilerlemenizi görsel olarak takip edin",
      color: "from-purple-500 to-violet-600"
    },
    {
      icon: <BarChart3 className="w-6 h-6" />,
      title: "Detaylı Raporlar",
      description: "Gelir-gider analizi ve finansal durumunuzu görselleştiren grafikler",
      color: "from-orange-500 to-red-600"
    },
    {
      icon: <Smartphone className="w-6 h-6" />,
      title: "Sesli Asistan",
      description: "AI destekli sesli komutlarla hızlıca veri girişi yapın",
      color: "from-pink-500 to-rose-600"
    },
    {
      icon: <Shield className="w-6 h-6" />,
      title: "Güvenli Depolama",
      description: "Verileriniz şifrelenmiş olarak güvenle saklanır",
      color: "from-teal-500 to-cyan-600"
    }
  ];

  const steps = [
    {
      step: 1,
      title: "Kayıt Olun",
      description: "Hızlı kayıt işlemi ile hesabınızı oluşturun",
      icon: <Users className="w-8 h-8" />
    },
    {
      step: 2,
      title: "Gelirlerinizi Ekleyin",
      description: "Maaş, freelance gelir ve diğer kaynaklarınızı girin",
      icon: <DollarSign className="w-8 h-8" />
    },
    {
      step: 3,
      title: "Hedeflerinizi Belirleyin",
      description: "Tasarruf hedefleri ve borç ödeme planları oluşturun",
      icon: <Target className="w-8 h-8" />
    },
    {
      step: 4,
      title: "Takip Edin",
      description: "İlerlemenizi takip edin ve finansal özgürlüğe ulaşın",
      icon: <Zap className="w-8 h-8" />
    }
  ];

  const handleContactSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const name = String(formData.get('name') || '');
    const email = String(formData.get('email') || '');
    const message = String(formData.get('message') || '');
    const mailto = `mailto:support@borcuygu.netlify.app?subject=${encodeURIComponent('Borç Yok İletişim - ' + name)}&body=${encodeURIComponent(`Ad: ${name}\nE-posta: ${email}\n\nMesaj:\n${message}`)}`;
    window.location.href = mailto;
    toast({ title: 'Teşekkürler!', description: 'Mesajınız için teşekkür ederiz. En kısa sürede dönüş yapacağız.' });
    form.reset();
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 transition-colors duration-200 ${i < rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
      />
    ));
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <header className="sticky top-0 z-50 bg-white/70 dark:bg-gray-900/70 backdrop-blur border-b border-gray-200/60 dark:border-gray-800">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <a href="#" className="text-lg font-semibold text-gray-900 dark:text-white">Borç Yok</a>
          <nav className="hidden md:flex items-center gap-6 text-sm">
            <a href="#how-it-works" className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white story-link">Nasıl Çalışır</a>
            <a href="#contact" className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white story-link">Bize Ulaşın</a>
            <a href="#about" className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white story-link">Hakkımızda</a>
          </nav>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={onGetStarted} className="hidden md:inline-flex">
              Uygulamaya Başla
            </Button>
          </div>
        </div>
        {/* Mobile quick links */}
        <div className="container mx-auto px-4 pb-3 md:hidden">
          <nav className="flex items-center gap-3 overflow-x-auto">
            <a href="#how-it-works" className="px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 text-xs">Nasıl Çalışır</a>
            <a href="#contact" className="px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 text-xs">Bize Ulaşın</a>
            <a href="#about" className="px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 text-xs">Hakkımızda</a>
          </nav>
        </div>
      </header>
      {/* Hero Section */}
      <section className="relative min-h-screen bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 text-white overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-20 left-10 w-72 h-72 bg-white rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-float"></div>
          <div className="absolute top-40 right-20 w-96 h-96 bg-yellow-300 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-float" style={{animationDelay: '1s'}}></div>
          <div className="absolute -bottom-8 left-20 w-80 h-80 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-float" style={{animationDelay: '2s'}}></div>
        </div>

        <div className="relative z-10 flex items-center min-h-screen">
          <div className="container mx-auto px-4 py-20">
            <div className={`text-center max-w-5xl mx-auto transform transition-all duration-1000 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
              <div className="mb-8">
                <Sparkles className="w-16 h-16 mx-auto mb-6 text-yellow-300 animate-pulse" />
              </div>
              
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-8 leading-tight">
                <span className="block mb-2">Finansal</span>
                <span className="block bg-gradient-to-r from-yellow-300 via-pink-300 to-blue-300 bg-clip-text text-transparent">
                  Özgürlüğünüz
                </span>
                <span className="block text-2xl md:text-3xl lg:text-4xl font-normal mt-4 text-blue-100">
                  Bir Tık Uzağınızda
                </span>
              </h1>
              
              <p className="text-lg md:text-xl lg:text-2xl mb-12 text-blue-100 max-w-3xl mx-auto leading-relaxed">
                Akıllı bütçe yönetimi ile gelirlerinizi artırın, borçlarınızdan kurtulun ve 
                <span className="text-yellow-300 font-semibold"> tasarruf hedeflerinize ulaşın</span>
              </p>
              
              <div className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-12">
                <Button
                  size="lg"
                  onClick={onGetStarted}
                  className="bg-white text-blue-600 hover:bg-blue-50 text-lg px-8 py-4 rounded-full font-semibold shadow-2xl hover:shadow-blue-500/25 transform hover:scale-105 transition-all duration-300 group"
                >
                  <span>Ücretsiz Başlayın</span>
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
                <Badge variant="secondary" className="bg-blue-800/50 text-blue-100 px-6 py-3 text-base rounded-full border border-blue-400/30">
                  ✨ Kredi kartı gerektirmez
                </Badge>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mt-16">
                <div className="text-center group">
                  <div className="text-3xl md:text-4xl font-bold text-yellow-300 mb-2 group-hover:scale-110 transition-transform">10,000+</div>
                  <div className="text-blue-200">Mutlu Kullanıcı</div>
                </div>
                <div className="text-center group">
                  <div className="text-3xl md:text-4xl font-bold text-green-300 mb-2 group-hover:scale-110 transition-transform">₺2.5M+</div>
                  <div className="text-blue-200">Toplam Tasarruf</div>
                </div>
                <div className="text-center group">
                  <div className="text-3xl md:text-4xl font-bold text-pink-300 mb-2 group-hover:scale-110 transition-transform">95%</div>
                  <div className="text-blue-200">Memnuniyet Oranı</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works - Top */}
      <section id="how-it-works" className="py-20 bg-white dark:bg-gray-900">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Animated UI Demo */}
            <AnimatedPreview />

            {/* Steps */}
            <div>
              <div className="text-left mb-8">
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">Nasıl Çalışır?</h2>
                <p className="text-lg text-gray-600 dark:text-gray-300">Geliri girdikten sonra AI danışman borç kapatma ve birikim dağılımını otomatik planlar; adımları aşağıdaki önizlemede izleyin.</p>
              </div>
              <div className="space-y-6">
                {steps.map((s) => (
                  <div key={s.step} className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 text-white flex items-center justify-center font-bold shadow">
                      {s.step}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{s.title}</h3>
                      <p className="text-gray-600 dark:text-gray-300">{s.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-gray-50 dark:bg-gray-800">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white mb-6">
              Güçlü <span className="text-blue-600">Özellikler</span>
            </h2>
            <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              Finansal hayatınızı kolaylaştıran ve hedeflerinize ulaşmanızı sağlayan akıllı özellikler
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card 
                key={index}
                className="group border-0 shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 bg-white dark:bg-gray-800"
              >
                <CardHeader className="pb-4">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${feature.color} flex items-center justify-center text-white mb-4 group-hover:scale-110 transition-transform duration-300`}>
                    {feature.icon}
                  </div>
                  <CardTitle className="text-xl font-bold text-gray-900 dark:text-white group-hover:text-blue-600 transition-colors">
                    {feature.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 bg-gradient-to-r from-purple-600 to-blue-600 text-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
              Kullanıcı <span className="text-yellow-300">Yorumları</span>
            </h2>
            <p className="text-lg md:text-xl text-purple-100">
              Binlerce mutlu kullanıcımızdan birkaçı
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="bg-white/10 backdrop-blur-sm border-white/20 hover:bg-white/20 transition-all duration-300 transform hover:-translate-y-2">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                      {testimonial.avatar}
                    </div>
                    <div>
                      <CardTitle className="text-lg text-white">{testimonial.name}</CardTitle>
                      <p className="text-sm text-purple-200">{testimonial.profession}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {renderStars(testimonial.rating)}
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed text-purple-100">
                    "{testimonial.comment}"
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="py-20 bg-gray-50 dark:bg-gray-800">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-6 text-center">Bize Ulaşın</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-10 text-center">Sorularınız ve önerileriniz için formu doldurun. Size en kısa sürede dönüş yapalım.</p>
            <form onSubmit={handleContactSubmit} className="grid grid-cols-1 gap-6">
              <div>
                <Label htmlFor="name">Ad Soyad</Label>
                <Input id="name" name="name" required placeholder="Adınız Soyadınız" />
              </div>
              <div>
                <Label htmlFor="email">E-posta</Label>
                <Input id="email" name="email" type="email" required placeholder="ornek@mail.com" />
              </div>
              <div>
                <Label htmlFor="message">Mesajınız</Label>
                <Textarea id="message" name="message" required placeholder="Bize nasıl yardımcı olabiliriz?" rows={5} />
              </div>
              <div className="flex justify-center">
                <Button type="submit" size="lg" className="px-8">Gönder</Button>
              </div>
            </form>
          </div>
        </div>
      </section>

      {/* About */}
      <section id="about" className="py-20 bg-white dark:bg-gray-900">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-6">Hakkımızda</h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 mb-6">Borç Yok, kişisel finansınızı kolayca yönetmenizi sağlayan modern bir bütçe ve borç yönetimi uygulamasıdır. Gelir-gider takibi, borç planlama ve tasarruf hedefleriyle finansal özgürlüğe giden yolda yanınızdayız.</p>
            <p className="text-gray-700 dark:text-gray-300 font-medium">Bu uygulama Serkan Gider tarafından tasarlanmıştır.</p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gray-900 text-white">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-8">
              <span className="block mb-2">Finansal Geleceğinizi</span>
              <span className="bg-gradient-to-r from-green-400 to-blue-500 bg-clip-text text-transparent">
                Bugün Planlayın
              </span>
            </h2>
            <p className="text-lg md:text-xl text-gray-300 mb-12 max-w-2xl mx-auto">
              Binlerce kişi finansal hedeflerine ulaştı. Sıra sizde! Ücretsiz hesap oluşturun ve hemen başlayın.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
              <Button
                size="lg"
                onClick={onGetStarted}
                className="bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 text-white text-lg px-10 py-4 rounded-full font-semibold shadow-2xl hover:shadow-green-500/25 transform hover:scale-105 transition-all duration-300 group"
              >
                <CheckCircle className="w-5 h-5 mr-2" />
                <span>Hemen Başla - Ücretsiz</span>
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
              
              <div className="flex items-center gap-3 text-gray-400">
                <Shield className="w-5 h-5" />
                <span>SSL şifreleme ile güvenli</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 bg-gray-800 border-t border-gray-700">
        <div className="container mx-auto px-4 text-center">
          <p className="text-gray-400 hover:text-white transition-colors duration-300">
            © 2024 Finansal Özgürlük. Tüm hakları saklıdır.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;