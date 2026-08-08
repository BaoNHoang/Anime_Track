import { createContext } from "react";
import type { AccountUser } from "../../services/account/accountApi";

export interface AuthActionResult {
  error?: string;
  message?: string;
}

export interface CloudAuthContextValue {
  configured: boolean;
  initialized: boolean;
  user?: AccountUser;
  signIn: (
    identifier: string,
    password: string
  ) => Promise<AuthActionResult>;
  signUp: (
    email: string,
    username: string,
    password: string
  ) => Promise<AuthActionResult>;
  verifyEmail: (email: string, code: string) => Promise<AuthActionResult>;
  resendVerification: (email: string) => Promise<AuthActionResult>;
  requestPasswordReset: (email: string) => Promise<AuthActionResult>;
  resetPassword: (
    email: string,
    code: string,
    password: string
  ) => Promise<AuthActionResult>;
  updateUsername: (username: string) => Promise<AuthActionResult>;
  updateAvatar: (avatarId: string) => Promise<AuthActionResult>;
  updateScoreStep: (scoreStep: 0.5 | 1) => Promise<AuthActionResult>;
  deleteAccount: (confirmation: string) => Promise<AuthActionResult>;
  signInWithGoogle: () => void;
  signOut: () => Promise<AuthActionResult>;
}

export const CloudAuthContext = createContext<
  CloudAuthContextValue | undefined
>(undefined);
