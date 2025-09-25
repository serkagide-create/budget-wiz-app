import { useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // Log auth events without exposing sensitive session data
        if (process.env.NODE_ENV === 'development') {
          console.log('Auth state changed:', event, session?.user?.id ? 'authenticated' : 'unauthenticated');
        }
        
        if (event === 'TOKEN_REFRESHED') {
          console.log('Token refreshed successfully');
        }
        
        if (event === 'SIGNED_OUT') {
          setSession(null);
          setUser(null);
        } else {
          setSession(session);
          setUser(session?.user ?? null);
        }
        
        setLoading(false);
      }
    );

    // Get initial session and refresh if needed
    const initSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Session error:', error);
          setSession(null);
          setUser(null);
        } else {
          setSession(session);
          setUser(session?.user ?? null);
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Session init error:', error);
        setLoading(false);
      }
    };

    initSession();

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast({
          title: "Giriş Hatası",
          description: error.message === 'Invalid login credentials' 
            ? 'Geçersiz email veya şifre'
            : error.message,
          variant: "destructive"
        });
        return { error };
      }

      toast({
        title: "Başarılı",
        description: "Giriş yapıldı"
      });

      return { data, error: null };
    } catch (error) {
      console.error('Sign in error:', error);
      return { error };
    }
  };

  const signUp = async (email: string, password: string, displayName?: string) => {
    try {
      const redirectUrl = `${window.location.origin}/app`;
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            display_name: displayName || email.split('@')[0]
          }
        }
      });

      if (error) {
        toast({
          title: "Kayıt Hatası",
          description: error.message === 'User already registered'
            ? 'Bu email adresi zaten kayıtlı'
            : error.message,
          variant: "destructive"
        });
        return { error };
      }

      toast({
        title: "Başarılı",
        description: "Kayıt tamamlandı! Email adresinizi kontrol edin."
      });

      return { data, error: null };
    } catch (error) {
      console.error('Sign up error:', error);
      return { error };
    }
  };

  const signInWithGoogle = async () => {
    try {
      const redirectUrl = `${window.location.origin}/app`;
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl
        }
      });

      if (error) {
        toast({
          title: "Google Giriş Hatası",
          description: error.message,
          variant: "destructive"
        });
        return { error };
      }

      return { data, error: null };
    } catch (error) {
      console.error('Google sign in error:', error);
      return { error };
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();

      const tolerant = (err: any) => {
        const msg = (err?.message || '').toLowerCase();
        const status = (err as any)?.status;
        return status === 400 || status === 401 || status === 403 || msg.includes('no current session') || msg.includes('session not found');
      };

      if (error && !tolerant(error)) {
        toast({
          title: "Çıkış Hatası",
          description: error.message,
          variant: "destructive"
        });
        return { error };
      }

      toast({
        title: "Başarılı",
        description: error ? "Zaten çıkış yapılmış" : "Çıkış yapıldı"
      });

      return { error: null };
    } catch (error) {
      console.error('Sign out error:', error);
      return { error };
    }
  };

  return {
    user,
    session,
    loading,
    signIn,
    signUp,
    signInWithGoogle,
    signOut
  };
};