import { useEffect, useState } from "react";
import { Sparkles, X, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { CourseFull, courseTypeLabel, unitLabel } from "@/lib/courseHelpers";
import { CourseAssistant } from "./course/CourseAssistant";
import { cn } from "@/lib/utils";

export const GlobalAssistantButton = () => {
  const [open, setOpen] = useState(false);
  const [courses, setCourses] = useState<CourseFull[]>([]);
  const [selected, setSelected] = useState<CourseFull | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (open && courses.length === 0) {
      supabase.from("courses").select("*").order("name").then(({ data }) => {
        if (data) setCourses(data as CourseFull[]);
      });
    }
  }, [open, courses.length]);

  const filtered = courses.filter((c) =>
    !search || c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      {/* Botão flutuante */}
      <button
        onClick={() => setOpen(true)}
        className={cn(
          "fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full bg-gradient-ai px-5 py-3.5 text-primary-foreground shadow-elegant transition-all hover:shadow-glow hover:scale-105",
          "ring-2 ring-primary/20"
        )}
        aria-label="Abrir assistente IA"
      >
        <Sparkles className="h-5 w-5" />
        <span className="hidden text-sm font-semibold sm:inline">Assistente Nexus</span>
      </button>

      <Sheet open={open} onOpenChange={(v) => { setOpen(v); if (!v) setSelected(null); }}>
        <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-2xl">
          <SheetHeader className="border-b bg-gradient-ai p-5 text-primary-foreground">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-foreground/15 backdrop-blur">
                <Sparkles className="h-5 w-5" />
              </div>
              <div className="flex-1 text-left">
                <SheetTitle className="text-primary-foreground">Assistente Comercial Nexus</SheetTitle>
                <SheetDescription className="text-primary-foreground/85">
                  {selected ? `Tirando dúvidas sobre: ${selected.name}` : "Escolha um curso para começar"}
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          {!selected ? (
            <div className="flex flex-1 flex-col gap-3 overflow-hidden p-5">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  autoFocus
                  placeholder="Buscar curso..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex-1 space-y-1.5 overflow-y-auto">
                {filtered.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">Nenhum curso encontrado.</p>
                ) : filtered.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setSelected(c)}
                    className="flex w-full items-start justify-between gap-3 rounded-lg border bg-card p-3 text-left transition-all hover:border-primary/40 hover:bg-primary/5 hover:shadow-sm"
                  >
                    <div className="flex-1">
                      <div className="font-medium text-sm">{c.name}</div>
                      <div className="mt-1 flex flex-wrap gap-1">
                        <Badge variant="outline" className="text-[10px]">{courseTypeLabel(c.type)}</Badge>
                        <Badge variant="secondary" className="text-[10px]">{unitLabel(c.unit)}</Badge>
                      </div>
                    </div>
                    <Sparkles className="mt-1 h-4 w-4 shrink-0 text-primary" />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-1 flex-col gap-3 overflow-hidden p-5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelected(null)}
                className="self-start gap-1"
              >
                <X className="h-3.5 w-3.5" /> Trocar curso
              </Button>
              <div className="flex-1 overflow-hidden">
                <CourseAssistant course={selected} compact />
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
};
