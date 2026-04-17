import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, LogOut, Stethoscope } from "lucide-react";
import { useEffect } from "react";

const PendingApproval = () => {
  const { user, signOut } = useAuth();

  useEffect(() => {
    document.title = "Aguardando aprovação | Nexus Ultrassonografia";
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-hero p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center text-primary-foreground">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-foreground/10 backdrop-blur">
            <Stethoscope className="h-8 w-8" />
          </div>
          <h1 className="text-3xl font-bold">Nexus Ultrassonografia</h1>
        </div>

        <Card className="shadow-elegant">
          <CardHeader className="text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Clock className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>Cadastro em análise</CardTitle>
            <CardDescription>
              Sua conta <span className="font-medium">{user?.email}</span> foi criada e está
              aguardando aprovação do administrador.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-center text-sm text-muted-foreground">
              Você receberá acesso assim que sua conta for aprovada. Em caso de dúvida, entre em
              contato com a coordenação Nexus.
            </p>
            <Button variant="outline" className="w-full" onClick={signOut}>
              <LogOut className="h-4 w-4" /> Sair
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PendingApproval;
