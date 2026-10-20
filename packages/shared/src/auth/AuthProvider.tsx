import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { createClient, type Session, type SupabaseClient } from "@supabase/supabase-js";

export type AuthProfileInput = {
  displayName: string;
  language: "en" | "ur" | "sd";
  phone?: string;
};

type AuthResult = { error: string | null; needsEmailConfirmation?: boolean };

type AuthContextValue = {
  client: SupabaseClient | null;
  session: Session | null;
  loading: boolean;
  isConfigured: boolean;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signUp: (email: string, password: string, profile: AuthProfileInput) => Promise<AuthResult>;
  signOut: () => Promise<AuthResult>;
  updateProfile: (profile: AuthProfileInput) => Promise<AuthResult>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

type AuthProviderProps = {
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  children: ReactNode;
};

export function AuthProvider({ supabaseUrl = "", supabaseAnonKey = "", children }: AuthProviderProps) {
  const isConfigured = /^https:\/\/.+\.supabase\.co$/i.test(supabaseUrl) && supabaseAnonKey.length > 20;
  const client = useMemo(
    () => isConfigured ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    }) : null,
    [isConfigured, supabaseAnonKey, supabaseUrl],
  );
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(isConfigured);

  useEffect(() => {
    if (!client) {
      setSession(null);
      setLoading(false);
      return;
    }

    let active = true;
    client.auth.getSession().then(({ data }) => {
      if (active) {
        setSession(data.session);
        setLoading(false);
      }
    });

    const { data: listener } = client.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setLoading(false);
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [client]);

  const signIn = useCallback(async (email: string, password: string): Promise<AuthResult> => {
    if (!client) return { error: "Supabase is not configured yet. Add the two VITE_SUPABASE values to .env." };
    const { error } = await client.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  }, [client]);

  const signUp = useCallback(async (
    email: string,
    password: string,
    profile: AuthProfileInput,
  ): Promise<AuthResult> => {
    if (!client) return { error: "Supabase is not configured yet. Add the two VITE_SUPABASE values to .env." };
    const { data, error } = await client.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/app`,
        data: {
          display_name: profile.displayName.trim(),
          language: profile.language,
          phone_pending: profile.phone?.trim() || null,
        },
      },
    });
    return { error: error?.message ?? null, needsEmailConfirmation: !error && !data.session };
  }, [client]);

  const signOut = useCallback(async (): Promise<AuthResult> => {
    if (!client) return { error: null };
    const { error } = await client.auth.signOut();
    return { error: error?.message ?? null };
  }, [client]);

  const updateProfile = useCallback(async (profile: AuthProfileInput): Promise<AuthResult> => {
    if (!client || !session?.user) return { error: "You must be signed in." };
    const { error: authError } = await client.auth.updateUser({
      data: {
        display_name: profile.displayName.trim(),
        language: profile.language,
        phone_pending: profile.phone?.trim() || null,
      },
    });
    if (authError) return { error: authError.message };

    const { error: profileError } = await client
      .from("profiles")
      .update({ display_name: profile.displayName.trim(), language: profile.language })
      .eq("id", session.user.id);
    return { error: profileError?.message ?? null };
  }, [client, session]);

  const value = useMemo<AuthContextValue>(() => ({
    client,
    session,
    loading,
    isConfigured,
    signIn,
    signUp,
    signOut,
    updateProfile,
  }), [client, session, loading, isConfigured, signIn, signUp, signOut, updateProfile]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}

type ProtectedRouteProps = {
  children: ReactNode;
  fallback?: ReactNode;
  onUnauthenticated: () => void;
};

export function ProtectedRoute({ children, fallback, onUnauthenticated }: ProtectedRouteProps) {
  const { loading, session } = useAuth();

  useEffect(() => {
    if (!loading && !session) onUnauthenticated();
  }, [loading, onUnauthenticated, session]);

  if (loading) return <>{fallback ?? null}</>;
  if (!session) return null;
  return <>{children}</>;
}
