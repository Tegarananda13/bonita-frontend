import { Navigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";

interface Props {
  children: React.ReactNode;
  allowedRoles: string[];
}

/**
 * Redirect ke /admin/login jika belum login,
 * atau redirect ke /admin/dashboard jika role tidak sesuai.
 */
const ProtectedRoute = ({ children, allowedRoles }: Props) => {
  const { isAuthenticated, role } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }

  if (role && !allowedRoles.includes(role)) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
