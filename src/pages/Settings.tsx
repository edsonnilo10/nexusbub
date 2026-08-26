import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { MirrorModulesSection } from "@/components/settings/MirrorModulesSection";
import { ComboRulesSection } from "@/components/settings/ComboRulesSection";

const Settings = () => {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Configurações | Nexus Ultrassonografia";
  }, []);

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <AppHeader />
      <main className="container max-w-3xl py-8">
        <Button variant="ghost" size="sm" className="mb-4" onClick={() => navigate("/")}>
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Button>

        <h1 className="mb-6 text-3xl font-bold tracking-tight">Configurações</h1>

        <ComboRulesSection />

        <div className="mt-6">
          <MirrorModulesSection />
        </div>
      </main>
    </div>
  );
};

export default Settings;
