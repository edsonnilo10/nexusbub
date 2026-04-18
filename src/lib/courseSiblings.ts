// Detecta cursos "gêmeos" entre unidades (SP ↔ BSB) com base no nome normalizado.

export interface CourseLite {
  id: string;
  name: string;
  unit: "sao_paulo" | "brasilia";
  module_count: number;
}

export interface SiblingPair {
  key: string;
  sao_paulo?: CourseLite;
  brasilia?: CourseLite;
}

const STOPWORDS = new Set([
  "cm", "us", "pt", "pos", "pos-graduacao", "posgraduacao", "graduacao",
  "em", "de", "do", "da", "dos", "das", "e", "a", "o", "as", "os",
  "curso", "modular", "modulo", "ultrassonografia", "ultrassom",
  "especializacao",
]);

export const normalizeName = (name: string): string => {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

export const tokenize = (name: string): string[] => {
  return normalizeName(name)
    .split(" ")
    .filter((t) => t.length > 2 && !STOPWORDS.has(t));
};

const jaccard = (a: Set<string>, b: Set<string>): number => {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  const union = a.size + b.size - inter;
  return inter / union;
};

/** Encontra pares de cursos gêmeos entre SP e BSB. */
export const findSiblingPairs = (courses: CourseLite[]): SiblingPair[] => {
  const sp = courses.filter((c) => c.unit === "sao_paulo");
  const bsb = courses.filter((c) => c.unit === "brasilia");

  const tokensFor = new Map<string, Set<string>>();
  for (const c of courses) tokensFor.set(c.id, new Set(tokenize(c.name)));

  const pairs: SiblingPair[] = [];
  const usedBsb = new Set<string>();

  for (const s of sp) {
    const sTok = tokensFor.get(s.id)!;
    let best: { course: CourseLite; score: number } | null = null;
    for (const b of bsb) {
      if (usedBsb.has(b.id)) continue;
      const bTok = tokensFor.get(b.id)!;
      const score = jaccard(sTok, bTok);
      if (score >= 0.5 && (!best || score > best.score)) best = { course: b, score };
    }
    if (best) {
      usedBsb.add(best.course.id);
      pairs.push({ key: s.id + "_" + best.course.id, sao_paulo: s, brasilia: best.course });
    }
  }

  return pairs.sort((a, b) => a.sao_paulo!.name.localeCompare(b.sao_paulo!.name));
};

/** Pares onde um lado tem módulos e o outro está vazio (oportunidade de espelhar). */
export const findMirrorOpportunities = (pairs: SiblingPair[]) => {
  return pairs.filter(
    (p) =>
      p.sao_paulo &&
      p.brasilia &&
      ((p.sao_paulo.module_count === 0 && p.brasilia.module_count > 0) ||
        (p.brasilia.module_count === 0 && p.sao_paulo.module_count > 0)),
  );
};
