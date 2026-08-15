import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren
} from "react";
import {
  accountApi,
  type AccountUser
} from "../../services/account/accountApi";
import {
  CloudAuthContext,
  type AuthActionResult,
  type CloudAuthContextValue
} from "./cloudAuthContext";
import { accountSessionHint } from "../../services/storage/accountSessionHint";

const accountAuthEnabled =
  import.meta.env.VITE_ACCOUNT_AUTH_ENABLED === "true";

export function CloudAuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<AccountUser>();
  const [initialized, setInitialized] = useState(!accountAuthEnabled);
  const [likelyAuthenticated, setLikelyAuthenticated] = useState(() =>
    accountAuthEnabled ? accountSessionHint.get() : true
  );

  useEffect(() => {
    if (!accountAuthEnabled) return;
    let active = true;
    void accountApi.session().then((result) => {
      if (!active) return;
      const nextUser = result.user ?? undefined;
      setUser(nextUser);
      if (!result.error) {
        const authenticated = Boolean(nextUser);
        accountSessionHint.save(authenticated);
        setLikelyAuthenticated(authenticated);
      }
      setInitialized(true);
    });
    return () => {
      active = false;
    };
  }, []);

  const run = useCallback(
    async (
      operation: () => Promise<{
        error?: string;
        message?: string;
        user?: AccountUser | null;
      }>
    ): Promise<AuthActionResult> => {
      const result = await operation();
      if (result.user !== undefined) {
        const nextUser = result.user ?? undefined;
        setUser(nextUser);
        const authenticated = Boolean(nextUser);
        accountSessionHint.save(authenticated);
        setLikelyAuthenticated(authenticated);
      }
      return { error: result.error, message: result.message };
    },
    []
  );

  const signIn = useCallback(
    (identifier: string, password: string) =>
      run(() => accountApi.signIn(identifier, password)),
    [run]
  );

  const signUp = useCallback(
    (email: string, username: string, password: string) =>
      run(() => accountApi.signUp(email, username, password)),
    [run]
  );

  const verifyEmail = useCallback(
    (email: string, code: string) =>
      run(() => accountApi.verifyEmail(email, code)),
    [run]
  );

  const resendVerification = useCallback(
    (email: string) => run(() => accountApi.resendVerification(email)),
    [run]
  );

  const requestPasswordReset = useCallback(
    (email: string) =>
      run(() => accountApi.requestPasswordReset(email)),
    [run]
  );

  const resetPassword = useCallback(
    (email: string, code: string, password: string) =>
      run(() => accountApi.resetPassword(email, code, password)),
    [run]
  );

  const updateUsername = useCallback(
    (username: string) => run(() => accountApi.updateUsername(username)),
    [run]
  );

  const updateAvatar = useCallback(
    (avatarId: string) => run(() => accountApi.updateAvatar(avatarId)),
    [run]
  );

  const updateBanner = useCallback(
    (bannerId: string) => run(() => accountApi.updateBanner(bannerId)),
    [run]
  );

  const uploadProfileMedia = useCallback(
    (kind: "avatar" | "banner", dataUrl: string) =>
      run(() => accountApi.uploadProfileMedia(kind, dataUrl)),
    [run]
  );

  const updateScoreStep = useCallback(
    (scoreStep: 0.5 | 1) =>
      run(() => accountApi.updateScoreStep(scoreStep)),
    [run]
  );

  const updateFavorites = useCallback(
    (favorites: import("../../domain/account/favorites").ProfileFavorites) =>
      run(() => accountApi.updateFavorites(favorites)),
    [run]
  );

  const deleteAccount = useCallback(
    async (confirmation: string): Promise<AuthActionResult> => {
      const result = await accountApi.deleteAccount(confirmation);
      if (!result.error) {
        setUser(undefined);
        accountSessionHint.save(false);
        setLikelyAuthenticated(false);
      }
      return { error: result.error, message: result.message };
    },
    []
  );

  const signOut = useCallback(async (): Promise<AuthActionResult> => {
    const result = await accountApi.signOut();
    if (!result.error) {
      setUser(undefined);
      accountSessionHint.save(false);
      setLikelyAuthenticated(false);
    }
    return { error: result.error, message: result.message };
  }, []);

  const signInWithGoogle = useCallback(() => {
    window.location.assign("/api/auth/google");
  }, []);

  const value = useMemo<CloudAuthContextValue>(
    () => ({
      configured: accountAuthEnabled,
      initialized,
      likelyAuthenticated,
      user,
      signIn,
      signUp,
      verifyEmail,
      resendVerification,
      requestPasswordReset,
      resetPassword,
      updateUsername,
      updateAvatar,
      updateBanner,
      uploadProfileMedia,
      updateScoreStep,
      updateFavorites,
      deleteAccount,
      signInWithGoogle,
      signOut
    }),
    [
      initialized,
      likelyAuthenticated,
      requestPasswordReset,
      resetPassword,
      updateUsername,
      updateAvatar,
      updateBanner,
      uploadProfileMedia,
      updateScoreStep,
      updateFavorites,
      deleteAccount,
      signIn,
      signInWithGoogle,
      signOut,
      signUp,
      user,
      verifyEmail,
      resendVerification
    ]
  );

  return (
    <CloudAuthContext.Provider value={value}>
      {children}
    </CloudAuthContext.Provider>
  );
}
