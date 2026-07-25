import { createContext, useContext, useEffect, useState, useRef, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  approved: boolean;
  isAdmin: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [approved, setApproved] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const loadProfileFlags = async (uid: string) => {
    try {
      const [{ data: prof, error: profErr }, { data: roles, error: rolesErr }] = await Promise.all([
        supabase.from("profiles").select("approved").eq("id", uid).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", uid),
      ]);

      if (profErr) throw profErr;
      if (rolesErr) throw rolesErr;

      setApproved(!!prof?.approved);
      setIsAdmin(!!roles?.some((r) => r.role === "admin"));
    } catch {
      setApproved(false);
      setIsAdmin(false);
    }
  };

  const loadedUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    let active = true;

    const applySession = async (nextSession: Session | null, event?: string) => {
      if (!active) return;

      const nextUser = nextSession?.user ?? null;
      setSession(nextSession);
      setUser(nextUser);

      if (!nextUser) {
        loadedUserIdRef.current = null;
        setApproved(false);
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      // Se for apenas atualização de token OU se as flags deste usuário já foram carregadas,
      // atualizamos a sessão silenciosamente sem disparar setLoading(true) e sem desmontar a UI.
      if (event === "TOKEN_REFRESHED" || loadedUserIdRef.current === nextUser.id) {
        return;
      }

      setLoading(true);
      await loadProfileFlags(nextUser.id);

      if (active) {
        loadedUserIdRef.current = nextUser.id;
        setLoading(false);
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setTimeout(() => {
        void applySession(nextSession, event);
      }, 0);
    });

    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      void applySession(currentSession);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, approved, isAdmin, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    return {
      user: null,
      session: null,
      loading: true,
      approved: false,
      isAdmin: false,
      signOut: async () => {},
    } as AuthContextValue;
  }
  return ctx;
};
