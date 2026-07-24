import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

// Auth pages
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import UnauthorizedPage from './pages/auth/UnauthorizedPage';
import NotFoundPage from './pages/auth/NotFoundPage';

// Dashboard pages
import DonorDashboard from './pages/dashboards/DonorDashboard';
import NGODashboard from './pages/dashboards/NGODashboard';
import VolunteerDashboard from './pages/dashboards/VolunteerDashboard';
import AdminDashboard from './pages/dashboards/AdminDashboard';

// Profile
import ProfilePage from './pages/profile/ProfilePage';

// Route guards
import ProtectedRoute from './routes/ProtectedRoute';
import RoleBasedRoute from './routes/RoleBasedRoute';

// Utils
import { getDashboardPath } from './utils/roleRedirect';

// Loading spinner
import LoadingSpinner from './components/common/LoadingSpinner';

/**
 * Root redirect — sends authenticated users to their dashboard, others to login
 */
const HomeRedirect = () => {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) return <LoadingSpinner fullScreen />;

  if (isAuthenticated && user) {
    return <Navigate to={getDashboardPath(user.role)} replace />;
  }

  return <Navigate to="/login" replace />;
};

function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<HomeRedirect />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/unauthorized" element={<UnauthorizedPage />} />

      {/* Protected routes — require authentication */}
      <Route element={<ProtectedRoute />}>
        <Route path="/profile" element={<ProfilePage />} />

        {/* Role-based dashboard routes */}
        <Route element={<RoleBasedRoute allowedRoles={['donor']} />}>
          <Route path="/donor/dashboard" element={<DonorDashboard />} />
        </Route>

        <Route element={<RoleBasedRoute allowedRoles={['ngo']} />}>
          <Route path="/ngo/dashboard" element={<NGODashboard />} />
        </Route>

        <Route element={<RoleBasedRoute allowedRoles={['volunteer']} />}>
          <Route path="/volunteer/dashboard" element={<VolunteerDashboard />} />
        </Route>

        <Route element={<RoleBasedRoute allowedRoles={['admin']} />}>
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
        </Route>
      </Route>

      {/* 404 catch-all */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default App;
