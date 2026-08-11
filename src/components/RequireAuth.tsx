import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useCloudAuth } from "../app/providers/useCloudAuth";
import { RouteSkeleton } from "./LoadingState";

export function RequireAuth({ children }: { children: ReactNode }) {
  const { configured, initialized, user } = useCloudAuth();
  const location = useLocation();

  if (!configured) return children;

  if (!initialized) {
    return <RouteSkeleton label="Loading your account" />;
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
