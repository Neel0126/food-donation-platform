import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import FormInput from '../../components/common/FormInput';
import PasswordInput from '../../components/common/PasswordInput';
import AlertMessage from '../../components/common/AlertMessage';
import { validateRegistrationForm } from '../../utils/validators';
import { REGISTRATION_ROLES } from '../../utils/roleRedirect';
import { getPublicNgos } from '../../services/authService';

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
    associatedNgo: '',
    vehicleType: 'bike',
    vehicleNumber: '',
    terms: false,
  });

  const [ngoList, setNgoList] = useState([]);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getPublicNgos()
      .then((data) => {
        if (Array.isArray(data)) setNgoList(data);
      })
      .catch((err) => console.error('Failed to load NGOs for signup:', err));
  }, []);

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

  const handleRoleSelect = (roleValue) => {
    setFormData((prev) => ({ ...prev, role: roleValue }));
    if (errors.role) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.role;
        return next;
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');

    const validationErrors = validateRegistrationForm(formData);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors({});
    setLoading(true);

    try {
      const payload = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        password: formData.password,
        role: formData.role,
      };

      if (formData.role === 'ngo') {
        payload.organizationName = formData.organizationName.trim();
        payload.registrationNumber = formData.registrationNumber.trim();
        payload.address = formData.address.trim();
      }

      if (formData.role === 'volunteer') {
        payload.associatedNgo = formData.associatedNgo;
        payload.vehicleType = formData.vehicleType || 'bike';
        if (formData.vehicleNumber) {
          payload.vehicleNumber = formData.vehicleNumber.trim();
        }
      }

      await register(payload);
    } catch (err) {
      setServerError(err.message || 'Registration failed. Please try again.');
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
        <div className="hidden lg:flex lg:w-5/12 relative overflow-hidden bg-primary-900 h-full shrink-0">
          <img
            src="/images/food-packing.png"
            alt="Volunteers packing food donations"
            className="absolute inset-0 w-full h-full object-cover opacity-85 animate-fade-in"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#172117]/95 via-[#172117]/50 to-transparent" />
          <div className="relative z-10 flex flex-col justify-end p-12 animate-fade-in-up">
            <span className="text-xs font-bold uppercase tracking-widest text-primary-200 mb-2 drop-shadow-sm">
              Empower Communities
            </span>
            <h2 
              className="text-3xl sm:text-4xl font-extrabold !text-white text-white leading-tight mb-3 drop-shadow-md" 
              style={{ fontFamily: 'var(--font-sans)', color: '#ffffff', textShadow: '0 2px 12px rgba(0,0,0,0.7)' }}
            >
              Be the change<br />your community needs.
            </h2>
            <p className="text-white/90 text-sm sm:text-base max-w-md leading-relaxed drop-shadow-sm">
              Whether you are an individual food donor, a local relief charity, or a volunteer ready to move surplus meals, your action counts.
            </p>
          </div>
        </div>

        {/* Right: Form panel */}
        <div className="flex-1 overflow-y-auto py-8 sm:py-10 px-4 sm:px-6 flex flex-col">
          <div className="w-full max-w-lg mx-auto my-auto animate-fade-in-up">
            <div className="surface-card p-6 sm:p-8 shadow-sm">
              <div className="text-center mb-6">
                <h1 className="text-2xl font-extrabold text-[#172117]" style={{ fontFamily: 'var(--font-sans)' }}>
                  Create your account
                </h1>
                <p className="text-xs sm:text-sm text-gray-500 mt-1">
                  Join ShareBite to donate food, dispatch volunteers, or receive meals
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

              <form onSubmit={handleSubmit} noValidate className="space-y-4">
                {/* Role Selector with interactive cards */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    Register As *
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {REGISTRATION_ROLES.map((r) => {
                      const selected = formData.role === r.value;
                      return (
                        <button
                          type="button"
                          key={r.value}
                          onClick={() => handleRoleSelect(r.value)}
                          className={`p-3 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                            selected
                              ? 'bg-primary-100/80 border-primary-600 text-primary-900 font-bold shadow-2xs ring-2 ring-primary-200'
                              : 'bg-white border-[#e8e2d5] text-gray-600 hover:bg-gray-50'
                          }`}
                        >
                          <span className="text-lg">
                            {r.value === 'donor' ? '🍲' : r.value === 'ngo' ? '🏢' : '🚚'}
                          </span>
                          <span className="text-xs">{r.label}</span>
                        </button>
                      );
                    })}
                  </div>
                  {errors.role && (
                    <p className="mt-1 text-xs text-red-500 font-semibold" role="alert">
                      {errors.role}
                    </p>
                  )}
                </div>

                <FormInput
                  label="Full Name *"
                  name="name"
                  placeholder="Enter your full name"
                  value={formData.name}
                  onChange={handleChange}
                  error={errors.name}
                  required
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormInput
                    label="Email Address *"
                    name="email"
                    type="email"
                    placeholder="you@example.com"
                    value={formData.email}
                    onChange={handleChange}
                    error={errors.email}
                    required
                  />

                  <FormInput
                    label="Phone Number *"
                    name="phone"
                    type="tel"
                    placeholder="10-digit mobile number"
                    value={formData.phone}
                    onChange={handleChange}
                    error={errors.phone}
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <PasswordInput
                    label="Password *"
                    name="password"
                    placeholder="At least 8 characters"
                    value={formData.password}
                    onChange={handleChange}
                    error={errors.password}
                    required
                  />

                  <PasswordInput
                    label="Confirm Password *"
                    name="confirmPassword"
                    placeholder="Re-enter password"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    error={errors.confirmPassword}
                    required
                  />
                </div>

                {/* NGO-specific fields */}
                {formData.role === 'ngo' && (
                  <div className="p-4 rounded-2xl border border-primary-200 bg-primary-50/40 space-y-3 animate-fade-in">
                    <p className="text-xs font-bold text-primary-800 uppercase tracking-wider">
                      NGO Details
                    </p>
                    <FormInput
                      label="Organization Name *"
                      name="organizationName"
                      placeholder="e.g. Robin Hood Army / Annapurna Trust"
                      value={formData.organizationName}
                      onChange={handleChange}
                      error={errors.organizationName}
                      required
                    />
                    <FormInput
                      label="Registration Number *"
                      name="registrationNumber"
                      placeholder="Government Trust / NGO Certificate ID"
                      value={formData.registrationNumber}
                      onChange={handleChange}
                      error={errors.registrationNumber}
                      required
                    />
                    <FormInput
                      label="Facility Address *"
                      name="address"
                      placeholder="Street, City, PIN Code"
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
                  <div className="p-4 rounded-2xl border border-primary-200 bg-primary-50/40 space-y-3 animate-fade-in">
                    <p className="text-xs font-bold text-primary-800 uppercase tracking-wider">
                      Volunteer Transport & Affiliation
                    </p>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        Select Affiliated NGO Partner *
                      </label>
                      <select
                        name="associatedNgo"
                        value={formData.associatedNgo}
                        onChange={handleChange}
                        className={`input-field ${errors.associatedNgo ? 'border-red-400' : ''}`}
                        required
                      >
                        <option value="">-- Choose an NGO partner you volunteer with --</option>
                        {ngoList.map((ngo) => (
                          <option key={ngo.id} value={ngo.id}>
                            {ngo.name} ({ngo.city})
                          </option>
                        ))}
                      </select>
                      {errors.associatedNgo && (
                        <p className="text-red-500 text-xs mt-1">{errors.associatedNgo}</p>
                      )}
                      <p className="text-[11px] text-gray-500 mt-1">
                        Every NGO maintains its own volunteer squad. You will be assigned pickups specifically for this partner.
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Vehicle Type</label>
                      <select
                        name="vehicleType"
                        value={formData.vehicleType}
                        onChange={handleChange}
                        className="input-field"
                      >
                        <option value="bike">Motorcycle / Scooter</option>
                        <option value="car">Car / Sedan</option>
                        <option value="van">Van / Small Truck</option>
                        <option value="bicycle">Bicycle</option>
                        <option value="other">On Foot / Public Transit</option>
                      </select>
                    </div>
                    <FormInput
                      label="Vehicle Plate Number (Optional)"
                      name="vehicleNumber"
                      placeholder="e.g. GJ-07-AB-1234"
                      value={formData.vehicleNumber}
                      onChange={handleChange}
                      className="mb-0"
                    />
                  </div>
                )}

                {/* Terms checkbox */}
                <div className="pt-1">
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      name="terms"
                      checked={formData.terms}
                      onChange={handleChange}
                      className="mt-0.5 h-4 w-4 rounded border-[#e8e2d5] text-primary-600 focus:ring-primary-500 cursor-pointer"
                    />
                    <span className="text-xs text-gray-600">
                      I agree to the{' '}
                      <span className="text-primary-700 font-bold hover:underline">
                        Terms of Service
                      </span>{' '}
                      and food safety standards.
                    </span>
                  </label>
                  {errors.terms && (
                    <p className="mt-1 ml-6 text-xs text-red-500 font-semibold" role="alert">
                      {errors.terms}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full btn-primary py-3 text-sm font-bold shadow-md shadow-primary-900/10 hover:shadow-primary-900/20 cursor-pointer"
                >
                  {loading ? 'Creating your account...' : 'Create Account'}
                </button>
              </form>

              <div className="mt-6 pt-5 border-t border-[#e8e2d5] text-center text-xs text-gray-500">
                Already registered with ShareBite?{' '}
                <Link to="/login" className="font-bold text-primary-700 hover:text-primary-800 transition-colors">
                  Log in
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
