import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import nexusLogo from "@/assets/nexus-logo.jpg";

const passwordSchema = z.string().min(6, "Mínimo 6 caracteres").max(72);

const ResetPassword = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [preparing, setPreparing] = useState(true);
  const [ready, setReady] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  useEffect(() => {
    const prepareRecoverySession = async () => {
      setPreparing(true);
      setLinkError(null);

      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const queryParams = new URLSearchParams(window.location.search);

      const code = queryParams.get("code");
      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");

      let errorMessage: string | null = null;

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) errorMessage = error.message;
      } else if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (error) errorMessage = error.message;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session && !errorMessage) {
        errorMessage = "Link inválido ou expirado. Solicite um novo e-mail de recuperação.";
      }

      window.history.replaceState({}, document.title, window.location.pathname);
      setReady(!errorMessage && !!session);
      setLinkError(errorMessage);
      setPreparing(false);
    };

    void prepareRecoverySession();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!ready) {
      toast({
        title: "Link inválido",
        description: "Solicite um novo e-mail de recuperação para continuar.",
        variant: "destructive",
      });
      return;
    }

    try {
      passwordSchema.parse(password);
    } catch (err: any) {
      toast({ title: "Senha inválida", description: err.errors?.[0]?.message, variant: "destructive" });
      return;
    }

    if (password !== confirm) {
      toast({ title: "As senhas não coincidem", variant: "destructive" });
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      toast({ title: "Erro ao redefinir senha", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Senha atualizada!", description: "Agora você já pode entrar com a nova senha." });
    await supabase.auth.signOut();
    navigate("/auth", { replace: true });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-hero p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center text-primary-foreground">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl bg-primary-foreground/10 ring-1 ring-primary-foreground/20 backdrop-blur">
            <img src={nexusLogo} alt="Nexus Ultrassonografia" className="h-full w-full object-cover" />
          </div>
          <h1 className="text-3xl font-bold">Redefinir senha</h1>
          <p className="mt-2 text-primary-foreground/80">Crie uma nova senha para sua conta</p>
        </div>

        <Card className="shadow-elegant">
          <CardHeader>
            <CardTitle>Nova senha</CardTitle>
            <CardDescription>
              {preparing ? "Preparando acesso seguro..." : "Digite e confirme sua nova senha."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {preparing ? (
              <div className="flex items-center justify-center py-6 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            ) : linkError ? (
              <div className="space-y-4">
                <p className="text-sm text-destructive">{linkError}</p>
                <Button type="button" className="w-full" onClick={() => navigate("/auth", { replace: true })}>
                  Voltar para o login
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-password">Nova senha</Label>
                  <Input
                    id="new-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    autoComplete="new-password"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirmar senha</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                    minLength={6}
                    autoComplete="new-password"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Salvar nova senha
                </Button>
                <Button type="button" variant="ghost" className="w-full" onClick={() => navigate("/auth") }>
                  Voltar para o login
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ResetPassword;
