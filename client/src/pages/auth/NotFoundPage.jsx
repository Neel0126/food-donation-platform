import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getDashboardPath } from '../../utils/roleRedirect';

/**
 * 404 Not Found page
 */
const NotFoundPage = () => {
  const { user, isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        {/* Large 404 text */}
        <div className="mb-4">
          <span className="text-8xl font-bold text-primary-200">404</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Page Not Found</h1>
        <p className="text-gray-500 mb-6">
          Oops! The page you're looking for doesn't exist. It may have been moved or the link might be incorrect.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          {isAuthenticated && user ? (
            <Link to={getDashboardPath(user.role)} className="btn-primary no-underline">
              Go to Dashboard
            </Link>
          ) : (
            <Link to="/login" className="btn-primary no-underline">
              Go to Login
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotFoundPage;
