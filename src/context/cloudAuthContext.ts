import { createContext } from "react";
import type { User } from "@supabase/supabase-js";

export interface AuthActionResult {
  error?: string;
  message?: string;
}

export interface CloudAuthContextValue {
  configured: boolean;
  initialized: boolean;
  user?: User;
  signIn: (email: string, password: string) => Promise<AuthActionResult>;
  signUp: (email: string, password: string) => Promise<AuthActionResult>;
  signOut: () => Promise<AuthActionResult>;
}

export const CloudAuthContext = createContext<
  CloudAuthContextValue | undefined
>(undefined);
