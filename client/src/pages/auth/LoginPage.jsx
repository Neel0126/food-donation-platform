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
      // AuthContext handles redirect after successful login
      setSuccessMessage('Login successful! Redirecting...');
    } catch (err) {
      setServerError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fff7ed] flex flex-col">
      {/* Header bar */}
      <div className="bg-white/80 backdrop-blur-md border-b border-primary-100 animate-fade-in">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center">
          <Link to="/" className="flex items-center gap-2.5 no-underline group">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow duration-200">
              <span className="text-white text-sm font-bold">S</span>
            </div>
            <span className="text-lg font-bold text-gray-800 tracking-tight" style={{ fontFamily: 'var(--font-sans)' }}>
              Share<span className="text-primary-600">Bite</span>
            </span>
          </Link>
        </div>
      </div>

      {/* Split-screen content */}
      <div className="flex-1 flex">
        {/* Left: Photo panel (hidden on mobile) */}
        <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
          <img
            src="/images/hero-donation.png"
            alt="Community food donation event"
            className="absolute inset-0 w-full h-full object-cover animate-fade-in"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
          <div className="relative z-10 flex flex-col justify-end p-10 animate-fade-in-up">
            <h2 className="text-3xl font-bold text-white leading-tight mb-3" style={{ fontFamily: 'var(--font-sans)' }}>
              Every meal shared<br />is a life touched.
            </h2>
            <p className="text-white/80 text-base max-w-md">
              Join thousands of donors, NGOs, and volunteers working together to reduce food waste and fight hunger in communities everywhere.
            </p>
          </div>
        </div>

        {/* Right: Form panel */}
        <div className="flex-1 flex items-center justify-center py-8 px-4">
          <div className="w-full max-w-md animate-fade-in-up">
            <div className="bg-white rounded-2xl shadow-sm border border-primary-100 p-6 sm:p-8">
              {/* Heading */}
              <div className="text-center mb-6">
                <h1 className="text-2xl font-bold text-gray-800" style={{ fontFamily: 'var(--font-sans)' }}>Welcome back</h1>
                <p className="text-sm text-gray-500 mt-1">
                  Sign in to your ShareBite account
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

              <form onSubmit={handleSubmit} noValidate>
                <div className="animate-fade-in-up animate-stagger-1">
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
                </div>

                <div className="animate-fade-in-up animate-stagger-2">
                  <PasswordInput
                    label="Password"
                    name="password"
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={handleChange}
                    error={errors.password}
                    required
                  />
                </div>

                {/* Remember me + Forgot password */}
                <div className="flex items-center justify-between mb-5 animate-fade-in-up animate-stagger-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      name="rememberMe"
                      checked={formData.rememberMe}
                      onChange={handleChange}
                      className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
                    />
                    <span className="text-sm text-gray-600">Remember me</span>
                  </label>
                  <Link to="/forgot-password" className="text-sm text-primary-600 font-medium cursor-pointer hover:text-primary-700 transition-colors duration-200 no-underline">
                    Forgot password?
                  </Link>
                </div>

                {/* Submit */}
                <div className="animate-fade-in-up animate-stagger-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-primary w-full py-2.5 cursor-pointer"
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg
                          className="animate-spin h-4 w-4"
                          viewBox="0 0 24 24"
                          fill="none"
                        >
                          <circle
                            className="opacity-25"
                            cx="12" cy="12" r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                          />
                        </svg>
                        Signing in...
                      </span>
                    ) : (
                      'Sign In'
                    )}
                  </button>
                </div>
              </form>

              {/* Register link */}
              <p className="text-center text-sm text-gray-500 mt-5 animate-fade-in-up animate-stagger-5">
                Don't have an account?{' '}
                <Link to="/register" className="text-primary-600 font-medium hover:text-primary-700 transition-colors duration-200">
                  Create one
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
