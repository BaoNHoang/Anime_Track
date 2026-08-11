import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useCloudAuth } from "../app/providers/useCloudAuth";

export function RequireAuth({ children }: { children: ReactNode }) {
  const { configured, initialized, user } = useCloudAuth();
  const location = useLocation();

  if (!configured) return children;

  if (!initialized) {
    return <p className="route-status" role="status">Checking your session...</p>;
  }

  if (!user) {
    const next = `${location.pathname}${location.search}`;
    return (
      <Navigate
        to={`/account?mode=sign_in&next=${encodeURIComponent(next)}`}
        replace
      />
    );
  }

  return children;
}
