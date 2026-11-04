import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { isTourHidden, setTourHidden } from "@/lib/welcomeTour";

export const OPEN_TOUR_EVENT = "nexus:open-welcome-tour";

type Step = { title: string; body: string[] };

const baseSteps: Step[] = [
  { title: "Bem-vindo ao Hub Nexus", body: ["Aqui você encontra todos os cursos de São Paulo e Brasília, as datas das turmas e as mensagens prontas para enviar aos alunos.", "Este tour leva menos de 1 minuto."] },
  { title: "Encontre o curso", body: ["Na página inicial, busque pelo nome ou pelo código (ex.: PG US GIOB).", "Filtre por cidade (São Paulo / Brasília) e por tipo: curso modular ou pós-graduação."] },
  { title: "Página do curso", body: ["Apresentação: resumo, carga horária e coordenação.", "Turmas e Turma 2027: datas de cada módulo.", "Cronograma: conteúdo por módulo, para copiar módulo a módulo ou tudo.", "Datas por bloco (Pós em Ultrassonografia Geral): opções de datas por bloco."] },
  { title: "Mensagens de WhatsApp", body: ["Na aba WhatsApp, escolha 2026 ou 2027.", "Copie a mensagem curta, completa, de conteúdo ou de investimento. Todas cabem no limite do WhatsApp.", "Você pode editar a sua cópia; \"Restaurar\" volta ao texto padrão."] },
  { title: "PDFs para o aluno", body: ["\"Gerar PDF\": material do curso com a identidade Nexus.", "\"PDF do calendário\": escolha cidade, tipo, período (ano, semestre, trimestre ou mês) e temas."] },
  { title: "Calendário e Mensagens", body: ["Turmas: veja todas as datas por mês.", "Mensagens: textos prontos para o dia a dia.", "Para rever este tutorial, clique em \"Tutorial\" no topo."] },
];

const adminStep: Step = {
  title: "Funções de administrador",
  body: ["Aprovações: libere o acesso de novos usuários.", "Novo curso, Importar e Editar ficam visíveis só para você.", "Configurações: ajustes gerais do sistema."],
};

export const WelcomeTour = () => {
  const { user, isAdmin } = useAuth();
  const [open, setOpen] = useState(false);
  const [i, setI] = useState(0);
  const [hideAgain, setHideAgain] = useState(false);
  const steps = isAdmin ? [...baseSteps.slice(0, -1), adminStep, baseSteps[baseSteps.length - 1]] : baseSteps;

  // Abre sozinho na primeira entrada, enquanto o usuário não escolher o contrário.
  useEffect(() => {
    if (!user) return;
    if (!isTourHidden(user.id)) {
      setI(0);
      setHideAgain(false);
      setOpen(true);
    }
  }, [user]);

  // Abrir pelo botão "Tutorial" do topo: mostra a escolha atual para poder mudar.
  useEffect(() => {
    const h = () => {
      setI(0);
      setHideAgain(isTourHidden(user?.id));
      setOpen(true);
    };
    window.addEventListener(OPEN_TOUR_EVENT, h);
    return () => window.removeEventListener(OPEN_TOUR_EVENT, h);
  }, [user]);

  const toggleHide = (checked: boolean) => {
    setHideAgain(checked);
    setTourHidden(user?.id, checked);
  };

  const close = () => {
    setOpen(false);
    setI(0);
  };

  if (!user) return null;
  const step = steps[i];
  const last = i === steps.length - 1;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">Passo {i + 1} de {steps.length}</p>
          <DialogTitle>{step.title}</DialogTitle>
          <DialogDescription asChild>
            <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
              {step.body.map((b) => <li key={b}>• {b}</li>)}
            </ul>
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-center gap-1.5">
          {steps.map((_, k) => <span key={k} className={`h-1.5 w-6 rounded-full ${k === i ? "bg-primary" : "bg-muted"}`} />)}
        </div>
        <div className="rounded-md border border-border/60 bg-muted/30 px-3 py-2.5">
          <div className="flex items-start gap-2.5">
            <Checkbox
              id="welcome-tour-hide"
              checked={hideAgain}
              onCheckedChange={(c) => toggleHide(c === true)}
              className="mt-0.5"
            />
            <div className="min-w-0">
              <Label htmlFor="welcome-tour-hide" className="cursor-pointer text-sm font-medium leading-snug">
                Não mostrar mais este tutorial
              </Label>
              <p className="mt-1 text-xs text-muted-foreground">
                {hideAgain
                  ? "Escolha salva: ele não abre sozinho. Use \"Tutorial\" no topo para rever."
                  : "Sem marcar, ele abre de novo na próxima entrada neste navegador."}
              </p>
            </div>
          </div>
        </div>
        <DialogFooter className="flex-row justify-between gap-2 sm:justify-between">
          <Button variant="ghost" size="sm" onClick={close}>Pular</Button>
          <div className="flex gap-2">
            {i > 0 && <Button variant="outline" size="sm" onClick={() => setI(i - 1)}>Anterior</Button>}
            <Button size="sm" onClick={() => (last ? close() : setI(i + 1))}>{last ? "Começar" : "Próximo"}</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
