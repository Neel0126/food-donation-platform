import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getDashboardPath } from '../../utils/roleRedirect';
import { HiShieldExclamation } from 'react-icons/hi';

/**
 * Unauthorized page — /unauthorized
 */
const UnauthorizedPage = () => {
  const { user, isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-[#fff7ed] flex items-center justify-center px-4">
      <div className="text-center max-w-md animate-fade-in-up">
        <div className="mx-auto h-16 w-16 rounded-2xl bg-red-50 flex items-center justify-center mb-4 animate-scale-in">
          <HiShieldExclamation size={32} className="text-red-500" />
        </div>
        <h1 className="text-2xl font-bold text-gray-800 mb-2" style={{ fontFamily: 'var(--font-sans)' }}>Access Denied</h1>
        <p className="text-gray-500 mb-6">
          You do not have permission to view this page. Please contact an administrator if you believe this is an error.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          {isAuthenticated && user ? (
            <Link to={getDashboardPath(user.role)} className="btn-primary no-underline">
              Go to My Dashboard
            </Link>
          ) : (
            <Link to="/login" className="btn-primary no-underline">
              Go to Login
            </Link>
          )}
          <Link to="/" className="btn-secondary no-underline">
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
};

export default UnauthorizedPage;
