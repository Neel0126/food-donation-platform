import { useState } from 'react';
import { Link } from 'react-router-dom';
import { forgotPassword } from '../../services/authService';
import AlertMessage from '../../components/common/AlertMessage';

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState({ type: null, message: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus({ type: null, message: '' });

    try {
      const res = await forgotPassword(email);
      setStatus({ 
        type: 'success', 
        message: res.message || 'If an account with that email exists, we have sent a password reset link.' 
      });
      setEmail('');
    } catch (err) {
      setStatus({ type: 'error', message: err.message || 'Failed to send reset email.' });
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

      {/* Forgot Password Card */}
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl shadow-primary-900/5 p-8 sm:p-10 border border-primary-50 animate-scale-in">
        <div className="text-center mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2 font-outfit">
            Reset Password
          </h1>
          <p className="text-gray-500 text-sm">
            Enter your email address and we'll send you a link to reset your password.
          </p>
        </div>

        {status.type && (
          <div className="mb-6">
            <AlertMessage type={status.type} message={status.message} />
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Email */}
          <div className="mb-6 animate-fade-in-up animate-stagger-1">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Email Address <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              name="email"
              placeholder="you@example.com"
              className="input-field"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          {/* Submit */}
          <div className="animate-fade-in-up animate-stagger-2 mb-6">
            <button
              type="submit"
              disabled={loading || status.type === 'success'}
              className="btn-primary w-full py-2.5 cursor-pointer"
            >
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
          </div>
          
          <div className="text-center text-sm text-gray-500 mt-6 animate-fade-in-up animate-stagger-3">
            Remember your password?{' '}
            <Link to="/login" className="text-primary-600 font-semibold hover:text-primary-700 transition-colors">
              Back to Sign In
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
