import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

export const OPEN_TOUR_EVENT = "nexus:open-welcome-tour";
const keyFor = (id: string) => `nexus-welcome-tour-v1:${id}`;

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
  const steps = isAdmin ? [...baseSteps.slice(0, -1), adminStep, baseSteps[baseSteps.length - 1]] : baseSteps;

  useEffect(() => {
    if (!user) return;
    try {
      if (!localStorage.getItem(keyFor(user.id))) setOpen(true);
    } catch { /* ignore */ }
  }, [user]);

  useEffect(() => {
    const h = () => { setI(0); setOpen(true); };
    window.addEventListener(OPEN_TOUR_EVENT, h);
    return () => window.removeEventListener(OPEN_TOUR_EVENT, h);
  }, []);

  const close = () => {
    setOpen(false);
    setI(0);
    try { if (user) localStorage.setItem(keyFor(user.id), "1"); } catch { /* ignore */ }
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
