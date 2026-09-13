import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

// Public pages
import HomePage from './pages/HomePage';
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
 * Root redirect — sends authenticated users to their dashboard, others to home page
 */
const RootHandler = () => {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) return <LoadingSpinner fullScreen />;

  // If already logged in, skip the home page and go straight to dashboard
  if (isAuthenticated && user) {
    return <Navigate to={getDashboardPath(user.role)} replace />;
  }

  // Otherwise, show the home landing page
  return <HomePage />;
};

function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<RootHandler />} />
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
