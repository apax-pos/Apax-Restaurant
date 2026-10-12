import { Navigate } from "react-router-dom";
import { isUserAuthenticated } from "./AuthStatus";
import { getUserDetailsInLocalStorage } from "./UserDetails";
import { getAccessToken } from "./accessToken";

/**
 * Super Admin layout guard: do not use tenant PrivateRoute (redirects to /login).
 */
export default function SuperAdminSessionRoute({ children }) {
  const user = getUserDetailsInLocalStorage();
  const isSuperAdmin = user?.role === "superadmin";
  const hasSession =
    isSuperAdmin && (isUserAuthenticated() || Boolean(getAccessToken()));

  if (hasSession) {
    return children;
  }

  return <Navigate to="/superadmin" replace />;
}
