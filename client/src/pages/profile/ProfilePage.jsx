import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../components/layout/DashboardLayout';
import FormInput from '../../components/common/FormInput';
import AlertMessage from '../../components/common/AlertMessage';
import { getRoleLabel } from '../../utils/roleRedirect';
import { validateEmail, validatePhone, validateRequired } from '../../utils/validators';
import { HiUser } from 'react-icons/hi';

/**
 * Profile page — /profile
 */
const ProfilePage = () => {
  const { user, updateUser, logout } = useAuth();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    organizationName: '',
    registrationNumber: '',
  });

  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);

  // Pre-fill form with user data
  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        address: user.address || '',
        organizationName: user.organizationName || '',
        registrationNumber: user.registrationNumber || '',
      });
    }
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
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
    const validationErrors = {};
    const nameErr = validateRequired(formData.name, 'Full name');
    if (nameErr) validationErrors.name = nameErr;
    const emailErr = validateEmail(formData.email);
    if (emailErr) validationErrors.email = emailErr;
    const phoneErr = validatePhone(formData.phone);
    if (phoneErr) validationErrors.phone = phoneErr;

    if (user?.role === 'ngo') {
      const orgErr = validateRequired(formData.organizationName, 'Organization name');
      if (orgErr) validationErrors.organizationName = orgErr;
      const regErr = validateRequired(formData.registrationNumber, 'Registration number');
      if (regErr) validationErrors.registrationNumber = regErr;
    }

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors({});
    setLoading(true);

    try {
      await updateUser({
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        address: formData.address.trim(),
        ...(user?.role === 'ngo' && {
          organizationName: formData.organizationName.trim(),
          registrationNumber: formData.registrationNumber.trim(),
        }),
      });
      setSuccessMessage('Profile updated successfully!');
    } catch (err) {
      setServerError(err.message || 'Failed to update profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto">
        {/* Page heading */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800">My Profile</h1>
          <p className="text-sm text-gray-500 mt-1">
            View and update your account information
          </p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6 sm:p-8">
          {/* Avatar + role badge */}
          <div className="flex flex-col items-center mb-6 pb-6 border-b border-gray-100">
            <div className="h-20 w-20 rounded-full bg-primary-100 flex items-center justify-center mb-3">
              <span className="text-2xl font-bold text-primary-700">
                {user?.name?.charAt(0)?.toUpperCase() || <HiUser size={28} />}
              </span>
            </div>
            <h2 className="text-lg font-semibold text-gray-800">{user?.name}</h2>
            <span className="mt-1 inline-block px-3 py-1 text-xs font-semibold rounded-full bg-primary-100 text-primary-700 uppercase tracking-wide">
              {getRoleLabel(user?.role)}
            </span>
          </div>

          {successMessage && (
            <AlertMessage
              type="success"
              message={successMessage}
              onDismiss={() => setSuccessMessage('')}
              className="mb-4"
            />
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
            <FormInput
              label="Full Name"
              name="name"
              placeholder="Your full name"
              value={formData.name}
              onChange={handleChange}
              error={errors.name}
              required
            />

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

            {/* Role — read only */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Role
              </label>
              <input
                type="text"
                value={getRoleLabel(user?.role)}
                readOnly
                className="input-field bg-gray-50 cursor-not-allowed"
              />
              <p className="mt-1 text-xs text-gray-400">Role cannot be changed</p>
            </div>

            <FormInput
              label="Address"
              name="address"
              placeholder="Your address (optional)"
              value={formData.address}
              onChange={handleChange}
              error={errors.address}
            />

            {/* NGO-specific fields */}
            {user?.role === 'ngo' && (
              <div className="p-4 mb-4 rounded-lg border border-primary-200 bg-primary-50/50">
                <p className="text-xs font-semibold text-primary-700 mb-3 uppercase tracking-wide">
                  Organization Details
                </p>
                <FormInput
                  label="Organization Name"
                  name="organizationName"
                  placeholder="Your NGO name"
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
                  className="mb-0"
                />
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="submit"
                disabled={loading}
                className="btn-primary flex-1 py-2.5"
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
                    Saving...
                  </span>
                ) : (
                  'Save Changes'
                )}
              </button>
              <button
                type="button"
                onClick={logout}
                className="btn-danger flex-1 py-2.5"
              >
                Logout
              </button>
            </div>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ProfilePage;
