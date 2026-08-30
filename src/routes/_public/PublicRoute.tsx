import { Navigate, Outlet, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";
import { isSafeRedirect } from "@/lib/redirect";

/**
 * Wraps routes that should only be reachable when signed OUT (login, signup).
 * A signed-in user hitting these is bounced to their intended destination,
 * or home if there wasn't one.
 */
export default function PublicRoute() {
  const { user, loading: isLoading } = useAuth();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get("redirectTo");
  const safeRedirectTo = isSafeRedirect(redirectTo) ? redirectTo : undefined;

  if (isLoading) {
    return null;
  }

  if (user) {
    return <Navigate to={safeRedirectTo ?? "/"} replace />;
  }

  return <Outlet />;
}