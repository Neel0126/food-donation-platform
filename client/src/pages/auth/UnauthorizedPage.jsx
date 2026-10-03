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
    <div className="min-h-screen bg-[#f8f6f0] flex items-center justify-center px-4 font-body">
      <div className="text-center max-w-md animate-fade-in-up">
        <div className="mx-auto h-16 w-16 rounded-3xl bg-red-50 text-red-600 border border-red-200 flex items-center justify-center mb-4 shadow-2xs">
          <HiShieldExclamation size={32} />
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#172117] mb-2" style={{ fontFamily: 'var(--font-sans)' }}>
          Access Restricted
        </h1>
        <p className="text-gray-600 text-sm mb-6 leading-relaxed">
          You don't have authorization to access this area with your current account privileges.
        </p>
        <div className="flex items-center justify-center gap-3">
          {isAuthenticated && user ? (
            <Link to={getDashboardPath(user.role)} className="btn-primary no-underline px-6 py-2.5">
              Go to My Dashboard
            </Link>
          ) : (
            <Link to="/login" className="btn-primary no-underline px-6 py-2.5">
              Log In
            </Link>
          )}
          <Link to="/" className="btn-secondary no-underline px-6 py-2.5">
            Return Home
          </Link>
        </div>
      </div>
    </div>
  );
};

export default UnauthorizedPage;
