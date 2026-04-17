import { Clock, Calendar, MapPin, Tag, CreditCard, GraduationCap, BookOpen } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CourseFull, CourseModule, CourseClass, formatBRL, formatDate, courseTypeLabel,
  classStatusLabel, classStatusVariant,
} from "@/lib/courseHelpers";

interface Props {
  course: CourseFull;
  modules: CourseModule[];
  classes: CourseClass[];
}

export const CourseInfoTab = ({ course, modules, classes }: Props) => {
  const sortedModules = [...modules].sort((a, b) => a.order_index - b.order_index);
  const sortedClasses = [...classes].sort((a, b) => (a.start_date || "").localeCompare(b.start_date || ""));

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        {course.description && (
          <Card>
            <CardHeader><CardTitle className="text-lg">Sobre o curso</CardTitle></CardHeader>
            <CardContent className="whitespace-pre-line text-muted-foreground">{course.description}</CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <BookOpen className="h-5 w-5 text-accent" /> Conteúdo programático
            </CardTitle>
          </CardHeader>
          <CardContent>
            {sortedModules.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum módulo cadastrado.</p>
            ) : (
              <ol className="space-y-3">
                {sortedModules.map((m, i) => (
                  <li key={m.id} className="flex gap-4 rounded-lg border bg-card p-4">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-primary text-sm font-bold text-primary-foreground">
                      {i + 1}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <h4 className="font-semibold">{m.title}</h4>
                        {m.workload_hours && (
                          <Badge variant="secondary" className="shrink-0">{m.workload_hours}h</Badge>
                        )}
                      </div>
                      {m.description && (
                        <p className="mt-1 text-sm text-muted-foreground">{m.description}</p>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader><CardTitle className="text-lg">Detalhes</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <DetailRow icon={GraduationCap} label="Tipo" value={courseTypeLabel(course.type)} />
            {course.workload_hours && (
              <DetailRow icon={Clock} label="Carga horária" value={`${course.workload_hours} horas`} />
            )}
            {course.modality && <DetailRow icon={MapPin} label="Modalidade" value={course.modality} />}
            {course.price != null && (
              <DetailRow icon={Tag} label="Investimento" value={formatBRL(course.price)} highlight />
            )}
            {course.installments && course.installments > 1 && course.price && (
              <DetailRow
                icon={CreditCard}
                label="Parcelado"
                value={`${course.installments}x de ${formatBRL(course.price / course.installments)}`}
              />
            )}
            {course.payment_methods && (
              <DetailRow icon={CreditCard} label="Pagamento" value={course.payment_methods} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Calendar className="h-5 w-5 text-accent" /> Turmas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {sortedClasses.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma turma cadastrada.</p>
            ) : (
              sortedClasses.map((c) => (
                <div key={c.id} className="rounded-lg border p-3">
                  <Badge variant={classStatusVariant(c.status)} className="mb-2">
                    {classStatusLabel(c.status)}
                  </Badge>
                  <div className="text-sm font-medium">
                    {formatDate(c.start_date)}
                    {c.end_date && <> — {formatDate(c.end_date)}</>}
                  </div>
                  {c.location && (
                    <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" /> {c.location}
                    </div>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

const DetailRow = ({ icon: Icon, label, value, highlight }: { icon: any; label: string; value: string; highlight?: boolean }) => (
  <div className="flex items-start gap-3">
    <Icon className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
    <div className="flex-1">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={highlight ? "text-lg font-bold text-primary" : "font-medium"}>{value}</div>
    </div>
  </div>
);
