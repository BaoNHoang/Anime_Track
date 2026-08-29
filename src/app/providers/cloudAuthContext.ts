import { createContext } from "react";
import type {
  AccountUser,
  PasskeyMetadata
} from "../../services/account/accountApi";
import type { ProfileFavorites } from "../../domain/account/favorites";

export interface AuthActionResult {
  error?: string;
  message?: string;
}

export interface CloudAuthContextValue {
  configured: boolean;
  passkeysEnabled: boolean;
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
  signInWithPasskey: () => Promise<AuthActionResult>;
  addPasskey: () => Promise<AuthActionResult>;
  listPasskeys: () => Promise<{
    error?: string;
    passkeys: PasskeyMetadata[];
  }>;
  removePasskey: (passkeyId: string) => Promise<AuthActionResult>;
  signOutOtherSessions: () => Promise<AuthActionResult>;
  updateUsername: (username: string) => Promise<AuthActionResult>;
  updateAvatar: (avatarId: string) => Promise<AuthActionResult>;
  updateBanner: (bannerId: string) => Promise<AuthActionResult>;
  uploadProfileMedia: (
    kind: "avatar" | "banner",
    dataUrl: string
  ) => Promise<AuthActionResult>;
  updateScoreStep: (scoreStep: 0.5 | 1) => Promise<AuthActionResult>;
  updateFavorites: (favorites: ProfileFavorites) => Promise<AuthActionResult>;
  deleteAccount: (confirmation: string) => Promise<AuthActionResult>;
  signInWithGoogle: () => void;
  signOut: () => Promise<AuthActionResult>;
}

export const CloudAuthContext = createContext<
  CloudAuthContextValue | undefined
>(undefined);
