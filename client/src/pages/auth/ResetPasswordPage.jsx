import { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { resetPassword } from '../../services/authService';
import { useAuth } from '../../context/AuthContext';
import { getDashboardPath } from '../../utils/roleRedirect';
import AlertMessage from '../../components/common/AlertMessage';

const ResetPasswordPage = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const { login } = useAuth();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState({ type: null, message: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus({ type: null, message: '' });

    if (password !== confirmPassword) {
      setStatus({ type: 'error', message: 'Passwords do not match.' });
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setStatus({ type: 'error', message: 'Password must be at least 6 characters.' });
      setLoading(false);
      return;
    }

    try {
      const res = await resetPassword(token, password);
      setStatus({ type: 'success', message: 'Password reset successfully!' });

      if (res.token && res.user) {
        setTimeout(() => {
          login(res.user, res.token);
          navigate(getDashboardPath(res.user.role));
        }, 1500);
      } else {
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      }
    } catch (err) {
      setStatus({ type: 'error', message: err.message || 'Invalid or expired reset token.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f6f0] flex flex-col justify-center items-center p-4 sm:p-8 font-body">
      {/* Brand / Logo */}
      <div className="mb-8 text-center animate-fade-in-up">
        <Link to="/" className="inline-flex items-center gap-2.5 no-underline group">
          <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-primary-600 to-primary-800 flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform duration-200">
            <span className="text-white text-base font-bold">🌱</span>
          </div>
          <span className="text-2xl font-bold tracking-tight text-[#172117]" style={{ fontFamily: 'var(--font-sans)' }}>
            Share<span className="text-primary-600 font-extrabold">Bite</span>
          </span>
        </Link>
      </div>

      {/* Reset Password Card */}
      <div className="w-full max-w-md surface-card p-8 sm:p-10 shadow-sm animate-scale-in">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-extrabold text-[#172117] mb-2" style={{ fontFamily: 'var(--font-sans)' }}>
            Set New Password
          </h1>
          <p className="text-gray-500 text-xs sm:text-sm">
            Enter a new, strong password below to regain access to your ShareBite account.
          </p>
        </div>

        {status.type && (
          <div className="mb-6">
            <AlertMessage type={status.type} message={status.message} />
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">
              New Password <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              name="password"
              placeholder="Enter new password"
              className="input-field"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">
              Confirm Password <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              name="confirmPassword"
              placeholder="Confirm new password"
              className="input-field"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading || status.type === 'success'}
              className="btn-primary w-full py-3 text-sm font-bold shadow-sm"
            >
              {loading ? 'Resetting Password...' : 'Save New Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
