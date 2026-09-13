import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import FormInput from '../../components/common/FormInput';
import PasswordInput from '../../components/common/PasswordInput';
import AlertMessage from '../../components/common/AlertMessage';
import { validateRegistrationForm } from '../../utils/validators';
import { REGISTRATION_ROLES } from '../../utils/roleRedirect';

/**
 * Registration page — /register
 */
const RegisterPage = () => {
  const { register } = useAuth();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    role: '',
    organizationName: '',
    registrationNumber: '',
    address: '',
    terms: false,
  });

  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    // Clear the specific field error on change
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

    // Validate
    const validationErrors = validateRegistrationForm(formData);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors({});
    setLoading(true);

    try {
      // Prepare payload (exclude confirmPassword and terms)
      const payload = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        password: formData.password,
        role: formData.role,
      };

      // Add NGO-specific fields
      if (formData.role === 'ngo') {
        payload.organizationName = formData.organizationName.trim();
        payload.registrationNumber = formData.registrationNumber.trim();
        payload.address = formData.address.trim();
      }

      // Add Volunteer-specific fields
      if (formData.role === 'volunteer') {
        payload.vehicleType = formData.vehicleType || 'bike';
        if (formData.vehicleNumber) {
          payload.vehicleNumber = formData.vehicleNumber.trim();
        }
      }

      await register(payload);
      // AuthContext handles redirect after successful registration
    } catch (err) {
      setServerError(err.message || 'Registration failed. Please try again.');
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
        <div className="hidden lg:flex lg:w-5/12 relative overflow-hidden">
          <img
            src="/images/food-packing.png"
            alt="Volunteers packing food donations"
            className="absolute inset-0 w-full h-full object-cover animate-fade-in"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
          <div className="relative z-10 flex flex-col justify-end p-10 animate-fade-in-up">
            <h2 className="text-3xl font-bold text-white leading-tight mb-3" style={{ fontFamily: 'var(--font-sans)' }}>
              Be the change<br />your community needs.
            </h2>
            <p className="text-white/80 text-base max-w-md">
              Whether you're a donor, an NGO, or a volunteer — your contribution makes a world of difference to families in need.
            </p>
          </div>
        </div>

        {/* Right: Form panel */}
        <div className="flex-1 flex items-center justify-center py-8 px-4">
          <div className="w-full max-w-lg animate-fade-in-up">
            <div className="bg-white rounded-2xl shadow-sm border border-primary-100 p-6 sm:p-8">
              {/* Heading */}
              <div className="text-center mb-6">
                <h1 className="text-2xl font-bold text-gray-800" style={{ fontFamily: 'var(--font-sans)' }}>Create your account</h1>
                <p className="text-sm text-gray-500 mt-1">
                  Join ShareBite and help reduce food waste
                </p>
              </div>

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
                    label="Full Name"
                    name="name"
                    placeholder="Enter your full name"
                    value={formData.name}
                    onChange={handleChange}
                    error={errors.name}
                    required
                  />
                </div>

                <div className="animate-fade-in-up animate-stagger-2">
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

                <div className="animate-fade-in-up animate-stagger-3">
                  <FormInput
                    label="Phone Number"
                    name="phone"
                    type="tel"
                    placeholder="10-digit phone number"
                    value={formData.phone}
                    onChange={handleChange}
                    error={errors.phone}
                    required
                  />
                </div>

                <div className="animate-fade-in-up animate-stagger-4">
                  <PasswordInput
                    label="Password"
                    name="password"
                    placeholder="At least 8 characters"
                    value={formData.password}
                    onChange={handleChange}
                    error={errors.password}
                    required
                  />
                </div>

                <div className="animate-fade-in-up animate-stagger-5">
                  <PasswordInput
                    label="Confirm Password"
                    name="confirmPassword"
                    placeholder="Re-enter your password"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    error={errors.confirmPassword}
                    required
                  />
                </div>

                {/* Role selector */}
                <div className="mb-4 animate-fade-in-up animate-stagger-6">
                  <label
                    htmlFor="role"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Register as <span className="text-red-500 ml-0.5">*</span>
                  </label>
                  <select
                    id="role"
                    name="role"
                    value={formData.role}
                    onChange={handleChange}
                    className={`input-field cursor-pointer ${errors.role ? 'input-error' : ''}`}
                    aria-invalid={!!errors.role}
                  >
                    <option value="">Select your role</option>
                    {REGISTRATION_ROLES.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                  {errors.role && (
                    <p className="mt-1 text-xs text-red-500" role="alert">
                      {errors.role}
                    </p>
                  )}
                </div>

                {/* NGO-specific fields */}
                {formData.role === 'ngo' && (
                  <div className="p-4 mb-4 rounded-xl border border-primary-200 bg-primary-50/50 animate-fade-in-up">
                    <p className="text-xs font-semibold text-primary-700 mb-3 uppercase tracking-wide" style={{ fontFamily: 'var(--font-sans)' }}>
                      Organization Details
                    </p>
                    <FormInput
                      label="Organization Name"
                      name="organizationName"
                      placeholder="Enter NGO/organization name"
                      value={formData.organizationName}
                      onChange={handleChange}
                      error={errors.organizationName}
                      required
                    />
                    <FormInput
                      label="Registration Number"
                      name="registrationNumber"
                      placeholder="NGO registration number"
                      value={formData.registrationNumber}
                      onChange={handleChange}
                      error={errors.registrationNumber}
                      required
                    />
                    <FormInput
                      label="Organization Address"
                      name="address"
                      placeholder="Full address"
                      value={formData.address}
                      onChange={handleChange}
                      error={errors.address}
                      required
                      className="mb-0"
                    />
                  </div>
                )}

                {/* Volunteer-specific fields */}
                {formData.role === 'volunteer' && (
                  <div className="p-4 mb-4 rounded-xl border border-primary-200 bg-primary-50/50 animate-fade-in-up">
                    <p className="text-xs font-semibold text-primary-700 mb-3 uppercase tracking-wide" style={{ fontFamily: 'var(--font-sans)' }}>
                      Volunteer Vehicle Info
                    </p>
                    <div className="mb-3">
                      <label className="block text-xs font-medium text-gray-700 mb-1">Vehicle Type</label>
                      <select
                        name="vehicleType"
                        value={formData.vehicleType || 'bike'}
                        onChange={handleChange}
                        className="input-field bg-white"
                      >
                        <option value="bike">Motorcycle / Scooter</option>
                        <option value="car">Car / Sedan</option>
                        <option value="van">Van / Mini Truck</option>
                        <option value="bicycle">Bicycle</option>
                        <option value="walk">On Foot / Walk</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <FormInput
                      label="Vehicle License Plate / Number (Optional)"
                      name="vehicleNumber"
                      placeholder="e.g. MH-01-AB-1234"
                      value={formData.vehicleNumber || ''}
                      onChange={handleChange}
                      className="mb-0"
                    />
                  </div>
                )}

                {/* Terms checkbox */}
                <div className="mb-5">
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      name="terms"
                      checked={formData.terms}
                      onChange={handleChange}
                      className="mt-0.5 h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
                    />
                    <span className="text-sm text-gray-600">
                      I agree to the{' '}
                      <span className="text-primary-600 font-medium cursor-pointer hover:text-primary-700 transition-colors duration-200">
                        Terms and Conditions
                      </span>{' '}
                      and{' '}
                      <span className="text-primary-600 font-medium cursor-pointer hover:text-primary-700 transition-colors duration-200">
                        Privacy Policy
                      </span>
                    </span>
                  </label>
                  {errors.terms && (
                    <p className="mt-1 ml-6 text-xs text-red-500" role="alert">
                      {errors.terms}
                    </p>
                  )}
                </div>

                {/* Submit */}
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
                      Creating account...
                    </span>
                  ) : (
                    'Create Account'
                  )}
                </button>
              </form>

              {/* Login link */}
              <p className="text-center text-sm text-gray-500 mt-5">
                Already have an account?{' '}
                <Link to="/login" className="text-primary-600 font-medium hover:text-primary-700 transition-colors duration-200">
                  Log in
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
