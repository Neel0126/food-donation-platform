import { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { resetPassword } from '../../services/authService';
import { useAuth } from '../../context/AuthContext';
import { getDashboardPath } from '../../utils/roleRedirect';
import AlertMessage from '../../components/common/AlertMessage';

const ResetPasswordPage = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const { login } = useAuth(); // Actually just sets the user state if the API returns a login payload

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
      
      // Auto login and redirect if the API returns the token/user
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
    <div className="min-h-screen bg-[#faf9f6] flex flex-col justify-center items-center p-4 sm:p-8">
      
      {/* Brand / Logo */}
      <div className="mb-8 text-center animate-fade-in-up">
        <Link to="/" className="inline-flex items-center gap-2 no-underline">
          <div className="bg-primary-600 text-white p-2 rounded-xl">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
            </svg>
          </div>
          <span className="text-3xl font-extrabold tracking-tight text-gray-900 font-outfit">
            Share<span className="text-primary-600">Bite</span>
          </span>
        </Link>
      </div>

      {/* Reset Password Card */}
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl shadow-primary-900/5 p-8 sm:p-10 border border-primary-50 animate-scale-in">
        <div className="text-center mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2 font-outfit">
            Set New Password
          </h1>
          <p className="text-gray-500 text-sm">
            Enter a new, strong password below to access your account.
          </p>
        </div>

        {status.type && (
          <div className="mb-6">
            <AlertMessage type={status.type} message={status.message} />
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* New Password */}
          <div className="mb-5 animate-fade-in-up animate-stagger-1">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
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

          {/* Confirm Password */}
          <div className="mb-6 animate-fade-in-up animate-stagger-2">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
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

          {/* Submit */}
          <div className="animate-fade-in-up animate-stagger-3 mb-6">
            <button
              type="submit"
              disabled={loading || status.type === 'success'}
              className="btn-primary w-full py-2.5 cursor-pointer"
            >
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
