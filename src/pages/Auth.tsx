import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, LogIn, UserPlus, ArrowLeft } from 'lucide-react';

import logo from '@/assets/borc-yok-logo-2.png';

const Auth = () => {
  
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const { user, signIn, signUp, signInWithGoogle } = useAuth();
  const navigate = useNavigate();

  // Redirect if already authenticated
  useEffect(() => {
    if (user) {
      navigate('/app');
    }
  }, [user, navigate]);

  useEffect(() => {
    const title = isSignUp ? 'Kayıt Ol | Bütçe Uygulaması' : 'Giriş Yap | Bütçe Uygulaması'
    document.title = title

    const description = isSignUp
      ? 'Bütçe uygulamasına hızlıca kayıt olun ve finansal hedeflerinizi yönetin.'
      : 'Bütçe uygulamasına giriş yapın, harcamalarınızı ve tasarruflarınızı takip edin.'

    let meta = document.querySelector('meta[name="description"]') as HTMLMetaElement | null
    if (!meta) {
      meta = document.createElement('meta')
      meta.setAttribute('name', 'description')
      document.head.appendChild(meta)
    }
    meta.setAttribute('content', description)

    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null
    if (!canonical) {
      canonical = document.createElement('link')
      canonical.setAttribute('rel', 'canonical')
      document.head.appendChild(canonical)
    }
    canonical.setAttribute('href', window.location.href)
  }, [isSignUp]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isSignUp) {
        await signUp(email, password, displayName);
      } else {
        await signIn(email, password);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      await signInWithGoogle();
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/40 flex items-center justify-center p-4">
      <Card className="w-full max-w-5xl overflow-hidden shadow-lg">
        <div className="grid md:grid-cols-2">
          <aside className="hidden md:flex flex-col justify-between p-8 bg-gradient-to-br from-primary/40 via-primary/25 to-primary/10 border-r">
            <div className="space-y-2">
              <img src={logo} alt="Borç Yok logo – borçsuz yaşam için güvenli finans" className="h-16 sm:h-20 md:h-24 w-auto drop-shadow" loading="lazy" />
              <h1 className="text-3xl font-bold tracking-tight">Borç Yok</h1>
              <p className="mt-2 text-muted-foreground">Harcamalarını takip et, birikim hedeflerine ulaş.</p>
            </div>

            <ul className="space-y-4 mt-6">
              <li className="flex items-start gap-3">
                <div className="h-2 w-2 rounded-full bg-primary mt-2" />
                <p className="text-sm text-muted-foreground">Akıllı finansal içgörüler</p>
              </li>
              <li className="flex items-start gap-3">
                <div className="h-2 w-2 rounded-full bg-primary mt-2" />
                <p className="text-sm text-muted-foreground">Güvenli ve hızlı erişim</p>
              </li>
              <li className="flex items-start gap-3">
                <div className="h-2 w-2 rounded-full bg-primary mt-2" />
                <p className="text-sm text-muted-foreground">Cihazlar arasında senkronizasyon</p>
              </li>
            </ul>

            <div className="text-xs text-muted-foreground mt-8">© {new Date().getFullYear()} Borç Yok</div>
          </aside>

          <div className="p-6 md:p-8 flex flex-col justify-center">
            <div className="mb-6 flex justify-center">
              <img src={logo} alt="Borç Yok logo – borçsuz yaşam için güvenli finans" className="h-16 sm:h-20 md:h-24 w-auto drop-shadow" loading="lazy" />
            </div>
            <Tabs value={isSignUp ? 'signup' : 'signin'} onValueChange={(v) => setIsSignUp(v === 'signup')} className="w-full">
              <div className="mb-4">
                <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="mb-3"> 
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Geri
                </Button>
                <div className="flex justify-center">
                  <TabsList className="grid grid-cols-2 bg-primary/10 rounded-lg p-1">
                    <TabsTrigger value="signin">Giriş Yap</TabsTrigger>
                    <TabsTrigger value="signup">Kayıt Ol</TabsTrigger>
                  </TabsList>
                </div>
              </div>

              <CardHeader className="p-0 space-y-1">
                <CardTitle className="text-2xl font-bold">
                  {isSignUp ? 'Hesap Oluştur' : 'Giriş Yap'}
                </CardTitle>
                <p className="text-muted-foreground">
                  {isSignUp ? 'Bütçe uygulamasına kayıt olun' : 'Hesabınıza giriş yapın'}
                </p>
              </CardHeader>

              <CardContent className="p-0 pt-6 space-y-6">
                <form onSubmit={handleSubmit} className="space-y-4">
                  {isSignUp && (
                    <div className="space-y-2">
                      <Label htmlFor="displayName">Ad Soyad</Label>
                      <Input
                        id="displayName"
                        type="text"
                        placeholder="Adınız ve soyadınız"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="ornek@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Şifre</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Şifrenizi girin"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={6}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? (
                      'Yükleniyor...'
                    ) : (
                      <>
                        {isSignUp ? (
                          <>
                            <UserPlus className="w-4 h-4 mr-2" />
                            Hesap Oluştur
                          </>
                        ) : (
                          <>
                            <LogIn className="w-4 h-4 mr-2" />
                            Giriş Yap
                          </>
                        )}
                      </>
                    )}
                  </Button>
                </form>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <Separator className="w-full" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">
                      veya
                    </span>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={handleGoogleSignIn}
                  disabled={isLoading}
                >
                  <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      fill="#4285f4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34a853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#fbbc04"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#ea4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Google ile Giriş
                </Button>
              </CardContent>
            </Tabs>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default Auth;