import { ExternalLink, MapPin, Pencil, Sparkles, Users2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  classStatusLabel,
  classStatusVariant,
  formatClassDateRange,
  unitLabel,
} from "@/lib/courseHelpers";
import type { ClassGroupRow, GroupCourseRow } from "@/pages/ClassGroups";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  group: ClassGroupRow | null;
  groupCourses: GroupCourseRow[];
  onEdit: () => void;
}

const displayModeMeta = (m: string) => {
  switch (m) {
    case "combo_only":
      return { label: "Apenas no combo", className: "bg-primary/15 text-primary border-primary/30" };
    case "both":
      return { label: "Individual + combo", className: "bg-amber-500/15 text-amber-700 border-amber-500/30 dark:text-amber-400" };
    default:
      return { label: "Individual", className: "bg-muted text-muted-foreground border-border" };
  }
};

export const ClassGroupDetailsDialog = ({
  open,
  onOpenChange,
  group,
  groupCourses,
  onEdit,
}: Props) => {
  const navigate = useNavigate();
  if (!group) return null;

  const isCombo = groupCourses.length > 1;
  const hasComboLink = groupCourses.some(
    (c) => c.display_mode === "combo_only" || c.display_mode === "both",
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <DialogTitle className="flex items-center gap-2 text-xl">
                {formatClassDateRange(group.start_date, group.end_date)}
                {(isCombo || hasComboLink) && (
                  <Sparkles className="h-4 w-4 text-primary" aria-label="Janela compartilhada" />
                )}
              </DialogTitle>
              <DialogDescription className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">{unitLabel(group.unit)}</Badge>
                <Badge variant={classStatusVariant(group.status)}>
                  {classStatusLabel(group.status)}
                </Badge>
                {group.location && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    {group.location}
                  </span>
                )}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {group.notes && (
          <div className="rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">
            {group.notes}
          </div>
        )}

        <Separator />

        <div>
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Users2 className="h-4 w-4 text-muted-foreground" />
              Cursos vinculados
              <Badge variant="secondary">{groupCourses.length}</Badge>
            </div>
            {isCombo && (
              <Badge className="bg-primary/15 text-primary border-primary/30" variant="outline">
                <Sparkles className="mr-1 h-3 w-3" /> Janela compartilhada
              </Badge>
            )}
          </div>

          {groupCourses.length === 0 ? (
            <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
              Nenhum curso vinculado a esta janela.
            </p>
          ) : (
            <ul className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
              {groupCourses.map((c) => {
                const meta = displayModeMeta(c.display_mode);
                const overrideRange =
                  c.start_date || c.end_date
                    ? formatClassDateRange(c.start_date, c.end_date)
                    : null;
                return (
                  <li
                    key={c.id}
                    className="group flex items-center justify-between gap-3 rounded-lg border bg-card p-3 transition hover:border-primary/40 hover:shadow-sm"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium" title={c.course_name}>
                          {c.course_name}
                        </span>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className={`text-[10px] ${meta.className}`}>
                          {meta.label}
                        </Badge>
                        {overrideRange && (
                          <span className="text-xs text-muted-foreground">
                            Datas próprias: {overrideRange}
                          </span>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="opacity-60 transition group-hover:opacity-100"
                      onClick={() => {
                        onOpenChange(false);
                        navigate(`/cursos/${c.course_id}`);
                      }}
                    >
                      <ExternalLink className="h-4 w-4" />
                      Abrir
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
          <Button onClick={onEdit}>
            <Pencil className="h-4 w-4" />
            Editar janela
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
