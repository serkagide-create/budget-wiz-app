import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { BudgetApp } from '@/components/BudgetApp';
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function BudgetIndex() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Yükleniyor...</CardTitle>
            <CardDescription>Hesap bilgileriniz kontrol ediliyor</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect to auth
  }

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (!error) {
      navigate("/auth");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="absolute top-4 right-4 z-50">
        <Button variant="outline" onClick={handleSignOut}>
          Çıkış Yap
        </Button>
      </div>
      <BudgetApp />
    </div>
  );
}