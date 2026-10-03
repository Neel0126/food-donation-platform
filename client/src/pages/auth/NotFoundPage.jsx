import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getDashboardPath } from '../../utils/roleRedirect';

/**
 * 404 Not Found page
 */
const NotFoundPage = () => {
  const { user, isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-[#f8f6f0] flex items-center justify-center px-4 font-body">
      <div className="text-center max-w-md animate-fade-in-up">
        <div className="mb-3">
          <span className="text-8xl font-extrabold text-primary-200 inline-block" style={{ fontFamily: 'var(--font-sans)' }}>
            404
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#172117] mb-2" style={{ fontFamily: 'var(--font-sans)' }}>
          Page Not Found
        </h1>
        <p className="text-gray-600 text-sm mb-6 leading-relaxed">
          The link you followed may be expired or the address might be mistyped. Let's get you back to sharing food.
        </p>
        <div className="flex items-center justify-center gap-3">
          {isAuthenticated && user ? (
            <Link to={getDashboardPath(user.role)} className="btn-primary no-underline px-6 py-2.5">
              Go to Dashboard
            </Link>
          ) : (
            <Link to="/" className="btn-primary no-underline px-6 py-2.5">
              Return Home
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotFoundPage;
