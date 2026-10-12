import { Navigate } from "react-router-dom";
import { getUserDetailsInLocalStorage } from "./UserDetails";

const SuperAdminProtectedRoute = ({ children }) => {
  const user = getUserDetailsInLocalStorage();
  if (user?.role === "superadmin") {
    return children;
  }

  return <Navigate to="/superadmin" replace />;
};

export default SuperAdminProtectedRoute;
