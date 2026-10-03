import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import FormInput from '../../components/common/FormInput';
import PasswordInput from '../../components/common/PasswordInput';
import AlertMessage from '../../components/common/AlertMessage';
import { validateLoginForm } from '../../utils/validators';

/**
 * Login page — /login
 */
const LoginPage = () => {
  const { login } = useAuth();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false,
  });

  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');
    setSuccessMessage('');

    // Validate
    const validationErrors = validateLoginForm(formData);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors({});
    setLoading(true);

    try {
      await login({
        email: formData.email.trim(),
        password: formData.password,
      });
      setSuccessMessage('Login successful! Redirecting...');
    } catch (err) {
      setServerError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen bg-[#f8f6f0] flex flex-col font-body overflow-hidden">
      {/* Header bar */}
      <div className="bg-[#f8f6f0]/95 backdrop-blur-md border-b border-[#e8e2d5] shrink-0 animate-fade-in z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-18 flex items-center">
          <Link to="/" className="flex items-center gap-2.5 no-underline group">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-primary-600 to-primary-800 flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform duration-200">
              <span className="text-white text-base">🌱</span>
            </div>
            <span className="text-xl font-bold text-[#172117] tracking-tight" style={{ fontFamily: 'var(--font-sans)' }}>
              Share<span className="text-primary-600 font-extrabold">Bite</span>
            </span>
          </Link>
        </div>
      </div>

      {/* Split-screen content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Photo panel (hidden on mobile) */}
        <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-primary-900 h-full shrink-0">
          <img
            src="/images/login-hero.jpg"
            alt="Volunteers distributing meals to community members"
            className="absolute inset-0 w-full h-full object-cover opacity-85 animate-fade-in"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#172117]/95 via-[#172117]/50 to-transparent" />
          <div className="relative z-10 flex flex-col justify-end p-12 animate-fade-in-up">
            <span className="text-xs font-bold uppercase tracking-widest text-primary-200 mb-2 drop-shadow-sm">
              ShareBite Community
            </span>
            <h2 
              className="text-3xl sm:text-4xl font-extrabold !text-white text-white leading-tight mb-3 drop-shadow-md" 
              style={{ fontFamily: 'var(--font-sans)', color: '#ffffff', textShadow: '0 2px 12px rgba(0,0,0,0.7)' }}
            >
              Every meal shared<br />is a life nourished.
            </h2>
            <p className="text-white/90 text-sm sm:text-base max-w-md leading-relaxed drop-shadow-sm">
              Join thousands of donors, verified local NGOs, and dedicated volunteers working together to eliminate hunger and landfill waste.
            </p>
          </div>
        </div>

        {/* Right: Form panel */}
        <div className="flex-1 overflow-y-auto py-8 sm:py-10 px-4 sm:px-6 flex flex-col">
          <div className="w-full max-w-md mx-auto my-auto animate-fade-in-up">
            <div className="surface-card p-6 sm:p-8 shadow-sm">
              {/* Heading */}
              <div className="text-center mb-6">
                <h1 className="text-2xl font-extrabold text-[#172117]" style={{ fontFamily: 'var(--font-sans)' }}>
                  Welcome back
                </h1>
                <p className="text-xs sm:text-sm text-gray-500 mt-1">
                  Sign in to your ShareBite platform account
                </p>
              </div>

              {successMessage && (
                <AlertMessage type="success" message={successMessage} className="mb-4" />
              )}
              {serverError && (
                <AlertMessage
                  type="error"
                  message={serverError}
                  onDismiss={() => setServerError('')}
                  className="mb-4"
                />
              )}

              <form onSubmit={handleSubmit} noValidate className="space-y-4">
                <FormInput
                  label="Email Address"
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={handleChange}
                  error={errors.email}
                  required
                />

                <PasswordInput
                  label="Password"
                  name="password"
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={handleChange}
                  error={errors.password}
                  required
                />

                {/* Remember me & Forgot password */}
                <div className="flex items-center justify-between text-xs pt-1">
                  <label className="flex items-center gap-2 text-gray-600 cursor-pointer">
                    <input
                      type="checkbox"
                      name="rememberMe"
                      checked={formData.rememberMe}
                      onChange={handleChange}
                      className="rounded border-[#e8e2d5] text-primary-600 focus:ring-primary-500 cursor-pointer"
                    />
                    <span>Remember me</span>
                  </label>
                  <Link
                    to="/forgot-password"
                    className="font-semibold text-primary-700 hover:text-primary-800 transition-colors"
                  >
                    Forgot password?
                  </Link>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full btn-primary py-3 text-sm font-bold shadow-md shadow-primary-900/10 hover:shadow-primary-900/20 mt-2"
                >
                  {loading ? 'Signing in...' : 'Sign In'}
                </button>
              </form>

              <div className="mt-6 pt-5 border-t border-[#e8e2d5] text-center text-xs text-gray-500">
                Don't have an account yet?{' '}
                <Link
                  to="/register"
                  className="font-bold text-primary-700 hover:text-primary-800 transition-colors"
                >
                  Create one now
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
