import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listCourses from "./tools/list-courses";
import getCourse from "./tools/get-course";
import listUpcomingClasses from "./tools/list-upcoming-classes";

// The OAuth issuer MUST be the direct Supabase host (not the .lovable.cloud proxy).
// VITE_SUPABASE_PROJECT_ID is inlined at build time by Vite, so this stays import-safe.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "nexus-hub-mcp",
  title: "Nexus Ultrassonografia — Hub",
  version: "0.1.0",
  instructions:
    "Ferramentas do hub interno Nexus: consultar cursos (modulares e pós), módulos, turmas e agenda em SP e Brasília. Todas as chamadas respeitam as permissões do usuário autenticado.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listCourses, getCourse, listUpcomingClasses],
});
