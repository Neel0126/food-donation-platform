import { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

// Public pages
import HomePage from './pages/HomePage';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import UnauthorizedPage from './pages/auth/UnauthorizedPage';
import NotFoundPage from './pages/auth/NotFoundPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';

// Lazy-loaded dashboard & profile pages (code-split for optimal production bundle performance)
const DonorDashboard = lazy(() => import('./pages/dashboards/DonorDashboard'));
const NGODashboard = lazy(() => import('./pages/dashboards/NGODashboard'));
const VolunteerDashboard = lazy(() => import('./pages/dashboards/VolunteerDashboard'));
const AdminDashboard = lazy(() => import('./pages/dashboards/AdminDashboard'));
const ProfilePage = lazy(() => import('./pages/profile/ProfilePage'));

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

/**
 * /dashboard smart redirect — used by email links.
 * Sends the user to their role-specific dashboard after login.
 * If not logged in, redirects to /login with ?redirect=/dashboard so they
 * land here after authenticating.
 */
const DashboardRedirect = () => {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) return <LoadingSpinner fullScreen />;

  if (isAuthenticated && user) {
    return <Navigate to={getDashboardPath(user.role)} replace />;
  }

  // Not logged in — send to login; after login they'll be redirected to dashboard
  return <Navigate to="/login" replace />;
};

function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<RootHandler />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
      <Route path="/unauthorized" element={<UnauthorizedPage />} />

      {/* Email deep-link: /dashboard → smart redirect to role-specific dashboard */}
      <Route path="/dashboard" element={<DashboardRedirect />} />
      <Route path="/dashboard/*" element={<DashboardRedirect />} />

      {/* Protected routes — require authentication */}
      <Route element={<ProtectedRoute />}>
        <Route
          path="/profile"
          element={
            <Suspense fallback={<LoadingSpinner fullScreen />}>
              <ProfilePage />
            </Suspense>
          }
        />

        {/* Role-based dashboard routes */}
        <Route element={<RoleBasedRoute allowedRoles={['donor']} />}>
          <Route
            path="/donor/dashboard"
            element={
              <Suspense fallback={<LoadingSpinner fullScreen />}>
                <DonorDashboard />
              </Suspense>
            }
          />
        </Route>

        <Route element={<RoleBasedRoute allowedRoles={['ngo']} />}>
          <Route
            path="/ngo/dashboard"
            element={
              <Suspense fallback={<LoadingSpinner fullScreen />}>
                <NGODashboard />
              </Suspense>
            }
          />
        </Route>

        <Route element={<RoleBasedRoute allowedRoles={['volunteer']} />}>
          <Route
            path="/volunteer/dashboard"
            element={
              <Suspense fallback={<LoadingSpinner fullScreen />}>
                <VolunteerDashboard />
              </Suspense>
            }
          />
        </Route>

        <Route element={<RoleBasedRoute allowedRoles={['admin']} />}>
          <Route
            path="/admin/dashboard"
            element={
              <Suspense fallback={<LoadingSpinner fullScreen />}>
                <AdminDashboard />
              </Suspense>
            }
          />
        </Route>
      </Route>

      {/* 404 catch-all */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default App;
