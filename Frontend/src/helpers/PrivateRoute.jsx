import { Navigate } from "react-router-dom";
import { isUserAuthenticated } from "./AuthStatus";

const PrivateRoute = ({ children }) => {
  const authenticated = isUserAuthenticated();

  if (!authenticated) return <Navigate to="/login" replace />;
  return children;
};

export default PrivateRoute;
