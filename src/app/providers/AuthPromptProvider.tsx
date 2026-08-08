import { LogIn, UserPlus, X } from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren
} from "react";
import { Link, useLocation } from "react-router-dom";
import { AuthPromptContext } from "./authPromptContext";

const DEFAULT_REASON =
  "Sign in to add anime, update your progress, and keep your library private.";

export function AuthPromptProvider({ children }: PropsWithChildren) {
  const [reason, setReason] = useState<string>();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const { pathname, search } = useLocation();

  const close = useCallback(() => setReason(undefined), []);
  const requestSignIn = useCallback(
    (nextReason = DEFAULT_REASON) => setReason(nextReason),
    []
  );
  const value = useMemo(() => ({ requestSignIn }), [requestSignIn]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!reason || !dialog) return;
    dialog.showModal();
    return () => {
      if (dialog.open) dialog.close();
    };
  }, [reason]);

  const returnTo = `${pathname}${search}`;
  const signInUrl = `/account?mode=sign_in&next=${encodeURIComponent(returnTo)}`;
  const signUpUrl = `/account?mode=sign_up&next=${encodeURIComponent(returnTo)}`;

  return (
    <AuthPromptContext.Provider value={value}>
      {children}
      {reason && (
        <dialog
          ref={dialogRef}
          className="auth-prompt"
          aria-labelledby="auth-prompt-title"
          aria-describedby="auth-prompt-description"
          onCancel={close}
          onClose={close}
          onClick={(event) => {
            if (event.target === event.currentTarget) close();
          }}
        >
          <button
            className="auth-prompt__close"
            onClick={close}
            aria-label="Close sign-in prompt"
          >
            <X size={19} />
          </button>
          <span className="auth-prompt__mark" aria-hidden="true">
            <LogIn size={24} />
          </span>
          <h2 id="auth-prompt-title">Save it to your library</h2>
          <p id="auth-prompt-description">{reason}</p>
          <div className="auth-prompt__actions">
            <Link className="button" to={signInUrl} onClick={close}>
              <LogIn size={17} /> Sign in
            </Link>
            <Link
              className="button button--ghost"
              to={signUpUrl}
              onClick={close}
            >
              <UserPlus size={17} /> Create account
            </Link>
          </div>
        </dialog>
      )}
    </AuthPromptContext.Provider>
  );
}
