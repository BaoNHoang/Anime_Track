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

const accountAuthEnabled =
  import.meta.env.VITE_ACCOUNT_AUTH_ENABLED === "true";

export function CloudAuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<AccountUser>();
  const [initialized, setInitialized] = useState(!accountAuthEnabled);

  useEffect(() => {
    if (!accountAuthEnabled) return;
    let active = true;
    void accountApi.session().then((result) => {
      if (!active) return;
      setUser(result.user ?? undefined);
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
      if (result.user !== undefined) setUser(result.user ?? undefined);
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

  const updateScoreStep = useCallback(
    (scoreStep: 0.5 | 1) =>
      run(() => accountApi.updateScoreStep(scoreStep)),
    [run]
  );

  const signOut = useCallback(async (): Promise<AuthActionResult> => {
    const result = await accountApi.signOut();
    if (!result.error) setUser(undefined);
    return { error: result.error, message: result.message };
  }, []);

  const signInWithGoogle = useCallback(() => {
    window.location.assign("/api/auth/google");
  }, []);

  const value = useMemo<CloudAuthContextValue>(
    () => ({
      configured: accountAuthEnabled,
      initialized,
      user,
      signIn,
      signUp,
      verifyEmail,
      resendVerification,
      requestPasswordReset,
      resetPassword,
      updateUsername,
      updateAvatar,
      updateScoreStep,
      signInWithGoogle,
      signOut
    }),
    [
      initialized,
      requestPasswordReset,
      resetPassword,
      updateUsername,
      updateAvatar,
      updateScoreStep,
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
