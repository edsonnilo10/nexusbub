import { createContext, useContext, useEffect, useState, ReactNode } from "react";
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

  useEffect(() => {
    let active = true;

    const applySession = async (nextSession: Session | null) => {
      if (!active) return;

      setSession(nextSession);
      setUser(nextSession?.user ?? null);

      if (!nextSession?.user) {
        setApproved(false);
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      setLoading(true);
      await loadProfileFlags(nextSession.user.id);

      if (active) {
        setLoading(false);
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setTimeout(() => {
        void applySession(nextSession);
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
