import { Check, LockKeyhole, X } from "lucide-react";
import {
  useCallback,
  useEffect,
  useState,
  type FormEvent
} from "react";
import { Brand } from "../../components/Brand";
import { useCloudAuth } from "../../hooks/useCloudAuth";
import { getSupabaseClient } from "../../services/supabase/client";
import { safeExternalUrl } from "../../domain/security/validation";

interface AuthorizationDetails {
  authorization_id: string;
  redirect_uri: string;
  client: {
    id: string;
    name: string;
    uri: string;
    logo_uri: string;
  };
  user: {
    id: string;
    email: string;
  };
  scope: string;
}

export function OAuthConsentPage() {
  const { configured, initialized, user, signIn } = useCloudAuth();
  const rawAuthorizationId = new URLSearchParams(window.location.search).get(
    "authorization_id"
  );
  const authorizationId =
    rawAuthorizationId &&
    /^[A-Za-z0-9._~-]{16,512}$/.test(rawAuthorizationId)
      ? rawAuthorizationId
      : undefined;
  const [details, setDetails] = useState<AuthorizationDetails>();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const setupError =
    initialized && !configured
      ? "Supabase is not configured for this Banime deployment."
      : initialized && !authorizationId
        ? "This authorization request is missing its ID."
        : "";

  const redirectToClient = useCallback((url: string) => {
    try {
      const parsed = new URL(url);
      const localHttp =
        parsed.protocol === "http:" &&
        ["localhost", "127.0.0.1", "::1"].includes(parsed.hostname);
      if (
        (parsed.protocol !== "https:" && !localHttp) ||
        parsed.username ||
        parsed.password
      ) {
        throw new Error("Unsafe OAuth redirect.");
      }
      window.location.assign(parsed.toString());
    } catch {
      setMessage("The OAuth server returned an invalid redirect URL.");
      setLoading(false);
      setWorking(false);
    }
  }, []);

  useEffect(() => {
    if (!initialized || !configured || !authorizationId || !user) return;

    let active = true;
    void getSupabaseClient().then(async (client) => {
      if (!client || !active) return;
      const { data, error } =
        await client.auth.oauth.getAuthorizationDetails(authorizationId);
      if (!active) return;
      if (error || !data) {
        setMessage(error?.message ?? "The authorization request is invalid.");
        setLoading(false);
        return;
      }
      if ("redirect_url" in data) {
        redirectToClient(data.redirect_url);
        return;
      }
      setDetails(data);
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [
    authorizationId,
    configured,
    initialized,
    redirectToClient,
    user
  ]);

  const handleSignIn = async (event: FormEvent) => {
    event.preventDefault();
    setWorking(true);
    setMessage("");
    const result = await signIn(email, password);
    setWorking(false);
    if (result.error) setMessage(result.error);
  };

  const decide = async (approved: boolean) => {
    if (!authorizationId) return;
    setWorking(true);
    setMessage("");
    const client = await getSupabaseClient();
    if (!client) {
      setMessage("Supabase is not configured.");
      setWorking(false);
      return;
    }

    const result = approved
      ? await client.auth.oauth.approveAuthorization(authorizationId, {
          skipBrowserRedirect: true
        })
      : await client.auth.oauth.denyAuthorization(authorizationId, {
          skipBrowserRedirect: true
        });

    if (result.error || !result.data) {
      setMessage(
        result.error?.message ?? "Banime could not finish authorization."
      );
      setWorking(false);
      return;
    }
    redirectToClient(result.data.redirect_url);
  };

  const scopes = details?.scope.split(/\s+/).filter(Boolean) ?? [];

  return (
    <main className="oauth-page">
      <div className="oauth-brand">
        <Brand />
      </div>
      <section
        className="oauth-card"
        aria-busy={!initialized || (Boolean(user) && loading) || working}
      >
        <span className="oauth-card__icon">
          <LockKeyhole size={24} />
        </span>

        {!initialized ? (
          <>
            <h1>Checking this request</h1>
            <p>Banime is verifying the connection details.</p>
          </>
        ) : setupError ? (
          <>
            <h1>Connection unavailable</h1>
            <p>{setupError}</p>
          </>
        ) : !user ? (
          <>
            <h1>Sign in to connect ChatGPT</h1>
            <p>
              Use the same Banime account that stores the library you want
              ChatGPT to read and update.
            </p>
            <form className="oauth-form" onSubmit={handleSignIn}>
              <label className="field">
                <span>Email</span>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                  maxLength={320}
                  required
                />
              </label>
              <label className="field">
                <span>Password</span>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="current-password"
                  maxLength={128}
                  required
                />
              </label>
              <button className="button button--full" disabled={working}>
                {working ? "Signing in..." : "Sign in"}
              </button>
            </form>
          </>
        ) : loading ? (
          <>
            <h1>Checking this request</h1>
            <p>Banime is verifying the connection details.</p>
          </>
        ) : details ? (
          <>
            {safeExternalUrl(details.client.logo_uri) && (
              <img
                className="oauth-client-logo"
                src={safeExternalUrl(details.client.logo_uri)}
                alt=""
              />
            )}
            <h1>Connect {details.client.name} to Banime?</h1>
            <p>
              This connection will use the Banime library for{" "}
              <strong>{details.user.email}</strong>.
            </p>
            <div className="oauth-permissions">
              <strong>This allows ChatGPT to:</strong>
              <ul>
                <li>Search anime and pull current Tenrai information.</li>
                <li>Read your synced Banime library.</li>
                <li>Add, update, or remove titles when you ask.</li>
                <li>Suggest anime based on your library.</li>
              </ul>
              {scopes.length > 0 && (
                <small>Requested scopes: {scopes.join(", ")}</small>
              )}
            </div>
            <div className="oauth-actions">
              <button
                className="button button--ghost"
                onClick={() => void decide(false)}
                disabled={working}
              >
                <X size={16} /> Deny
              </button>
              <button
                className="button"
                onClick={() => void decide(true)}
                disabled={working}
              >
                <Check size={16} />{" "}
                {working ? "Connecting..." : "Allow connection"}
              </button>
            </div>
            <p className="oauth-footnote">
              Banime uses your Supabase session and database policies. ChatGPT
              does not receive your password.
            </p>
          </>
        ) : (
          <>
            <h1>Connection unavailable</h1>
            <p>Banime could not load this request.</p>
          </>
        )}

        {message && !setupError && (
          <p className="form-message form-message--error">{message}</p>
        )}
      </section>
    </main>
  );
}
