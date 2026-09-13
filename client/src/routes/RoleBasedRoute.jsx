import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getDashboardPath } from '../utils/roleRedirect';
import LoadingSpinner from '../components/common/LoadingSpinner';

/**
 * RoleBasedRoute — restricts access to specific roles
 * If the user's role is not in allowedRoles, redirect them to their own dashboard.
 *
 * @param {string[]} allowedRoles — array of lowercase role strings
 */
const RoleBasedRoute = ({ allowedRoles = [] }) => {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner fullScreen message="Verifying access..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    // Redirect to the user's own dashboard instead of showing an error
    return <Navigate to={getDashboardPath(user.role)} replace />;
  }

  return <Outlet />;
};

export default RoleBasedRoute;
