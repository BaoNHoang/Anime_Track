import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren
} from "react";
import type { User } from "@supabase/supabase-js";
import {
  getSupabaseClient,
  isSupabaseConfigured
} from "../../services/supabase/client";
import {
  CloudAuthContext,
  type AuthActionResult,
  type CloudAuthContextValue
} from "./cloudAuthContext";

export function CloudAuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<User>();
  const [initialized, setInitialized] = useState(!isSupabaseConfigured);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let active = true;
    let unsubscribe: (() => void) | undefined;

    void getSupabaseClient().then(async (client) => {
      if (!client || !active) return;
      const { data } = await client.auth.getSession();
      if (!active) return;
      setUser(data.session?.user);
      setInitialized(true);

      const { data: subscription } = client.auth.onAuthStateChange(
        (_event, session) => {
          setUser(session?.user);
          setInitialized(true);
        }
      );
      unsubscribe = () => subscription.subscription.unsubscribe();
    });

    return () => {
      active = false;
      unsubscribe?.();
    };
  }, []);

  const signIn = useCallback(
    async (email: string, password: string): Promise<AuthActionResult> => {
      const client = await getSupabaseClient();
      if (!client) return { error: "Cloud sync is not configured." };
      const { error } = await client.auth.signInWithPassword({
        email,
        password
      });
      return error ? { error: error.message } : { message: "Signed in." };
    },
    []
  );

  const signUp = useCallback(
    async (email: string, password: string): Promise<AuthActionResult> => {
      const client = await getSupabaseClient();
      if (!client) return { error: "Cloud sync is not configured." };
      const { data, error } = await client.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin }
      });
      if (error) return { error: error.message };
      return {
        message: data.session
          ? "Account created and signed in."
          : "Check your email to confirm the account, then sign in."
      };
    },
    []
  );

  const signOut = useCallback(async (): Promise<AuthActionResult> => {
    const client = await getSupabaseClient();
    if (!client) return { error: "Cloud sync is not configured." };
    const { error } = await client.auth.signOut();
    return error ? { error: error.message } : { message: "Signed out." };
  }, []);

  const value = useMemo<CloudAuthContextValue>(
    () => ({
      configured: isSupabaseConfigured,
      initialized,
      user,
      signIn,
      signUp,
      signOut
    }),
    [initialized, signIn, signOut, signUp, user]
  );

  return (
    <CloudAuthContext.Provider value={value}>
      {children}
    </CloudAuthContext.Provider>
  );
}
