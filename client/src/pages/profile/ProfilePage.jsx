import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../components/layout/DashboardLayout';
import FormInput from '../../components/common/FormInput';
import AlertMessage from '../../components/common/AlertMessage';
import { getRoleLabel } from '../../utils/roleRedirect';
import { validateEmail, validatePhone, validateRequired } from '../../utils/validators';
import {
  HiUser,
  HiMail,
  HiPhone,
  HiLocationMarker,
  HiShieldCheck,
  HiHeart,
  HiGift,
  HiUserGroup,
  HiLogout,
  HiLockClosed,
  HiPhotograph,
  HiUpload,
  HiOfficeBuilding,
  HiExclamationCircle,
} from 'react-icons/hi';
import StatCounter from '../../components/ui/StatCounter';
import { getMyNgoProfile, updateNgoProfile } from '../../services/ngoService';
import { getMyComplaints } from '../../services/adminService';
import MyComplaintsModal from '../../components/common/MyComplaintsModal';

/**
 * Modern Profile & Account Settings Page
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

  // NGO Specific Profile State
  const [ngoProfile, setNgoProfile] = useState({
    description: '',
    website: '',
    pickupHours: '9 AM – 7 PM',
    responseTime: 'Usually responds within 30 min',
    categories: ['Cooked Meals', 'Fresh Produce', 'Packaged Food'],
    coverImageUrl: '',
    logoUrl: '',
  });
  const [coverFile, setCoverFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState('');
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState('');

  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [myComplaints, setMyComplaints] = useState([]);
  const [showComplaintsModal, setShowComplaintsModal] = useState(false);

  useEffect(() => {
    getMyComplaints()
      .then((data) => {
        if (Array.isArray(data)) setMyComplaints(data);
      })
      .catch(() => {});
  }, []);

  // Pre-fill form with user data & NGO profile if role is NGO
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

      if (user.role === 'ngo') {
        getMyNgoProfile()
          .then((data) => {
            if (data) {
              setNgoProfile({
                description: data.description || '',
                website: data.website || '',
                pickupHours: data.pickupHours || '9 AM – 7 PM',
                responseTime: data.responseTime || 'Usually responds within 30 min',
                categories: data.categories || ['Cooked Meals', 'Fresh Produce', 'Packaged Food'],
                coverImageUrl: data.coverImageUrl || '',
                logoUrl: data.logoUrl || '',
              });
              if (data.coverImageUrl) setCoverPreview(data.coverImageUrl);
              if (data.logoUrl) setLogoPreview(data.logoUrl);
            }
          })
          .catch((err) => console.error('Failed to load NGO profile:', err));
      }
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

  const handleNgoChange = (e) => {
    const { name, value } = e.target;
    setNgoProfile((prev) => ({ ...prev, [name]: value }));
  };

  const handleCoverChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setCoverFile(file);
      setCoverPreview(URL.createObjectURL(file));
    }
  };

  const handleLogoChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const toggleCategory = (cat) => {
    setNgoProfile((prev) => {
      const exists = prev.categories.includes(cat);
      return {
        ...prev,
        categories: exists
          ? prev.categories.filter((c) => c !== cat)
          : [...prev.categories, cat],
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');
    setSuccessMessage('');

    // Validation
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

      if (user?.role === 'ngo') {
        const ngoFormData = new FormData();
        ngoFormData.append('organizationName', formData.organizationName.trim());
        ngoFormData.append('description', ngoProfile.description || '');
        ngoFormData.append('website', ngoProfile.website || '');
        ngoFormData.append('pickupHours', ngoProfile.pickupHours || '');
        ngoFormData.append('responseTime', ngoProfile.responseTime || '');
        ngoFormData.append('categories', JSON.stringify(ngoProfile.categories || []));
        ngoFormData.append('city', formData.address || '');
        if (coverFile) ngoFormData.append('coverImage', coverFile);
        if (logoFile) ngoFormData.append('logo', logoFile);

        const updated = await updateNgoProfile(ngoFormData);
        if (updated?.profile) {
          if (updated.profile.coverImageUrl) setCoverPreview(updated.profile.coverImageUrl);
          if (updated.profile.logoUrl) setLogoPreview(updated.profile.logoUrl);
        }
      }

      setSuccessMessage('Profile and visual identity updated successfully!');
    } catch (err) {
      setServerError(err.message || 'Failed to update profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
        {/* Top Profile Hero Card */}
        <div className="surface-card p-6 sm:p-8 bg-gradient-to-r from-white via-[#faf8f4] to-primary-50/50 border-primary-200 relative overflow-hidden">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            {/* Avatar */}
            <div className="h-24 w-24 rounded-3xl bg-gradient-to-br from-primary-600 to-primary-800 text-white flex items-center justify-center text-3xl font-extrabold shadow-lg shadow-primary-900/15 ring-4 ring-primary-100 shrink-0">
              {user?.name?.charAt(0)?.toUpperCase() || <HiUser size={36} />}
            </div>

            {/* Profile Info & Impact Pills */}
            <div className="flex-1 text-center sm:text-left">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-1 justify-center sm:justify-start">
                <h1
                  className="text-2xl sm:text-3xl font-extrabold text-[#172117] tracking-tight leading-tight"
                  style={{ fontFamily: 'var(--font-sans)' }}
                >
                  {user?.name}
                </h1>
                <span className="inline-block px-3 py-0.5 text-xs font-bold rounded-full bg-primary-100 text-primary-800 uppercase tracking-wider self-center sm:self-auto">
                  {getRoleLabel(user?.role)}
                </span>
              </div>

              <p className="text-xs sm:text-sm text-gray-500 mb-4 flex items-center justify-center sm:justify-start gap-2">
                <span>{user?.email}</span>
                {user?.address && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <HiLocationMarker size={14} className="text-primary-600" />
                      {user.address}
                    </span>
                  </>
                )}
              </p>

              {/* Quick Impact Stats Pill Strip */}
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5 pt-2 border-t border-[#e8e2d5]/60 text-xs font-semibold text-gray-700">
                <div className="bg-white px-3.5 py-1.5 rounded-full border border-[#e8e2d5] flex items-center gap-1.5 shadow-2xs">
                  <HiGift className="text-primary-600" size={15} />
                  <span>Platform Contributions</span>
                </div>
                <div className="bg-white px-3.5 py-1.5 rounded-full border border-[#e8e2d5] flex items-center gap-1.5 shadow-2xs">
                  <HiHeart className="text-red-500" size={15} />
                  <span>Community Hunger Partner</span>
                </div>
                <div className="bg-white px-3.5 py-1.5 rounded-full border border-[#e8e2d5] flex items-center gap-1.5 shadow-2xs">
                  <HiShieldCheck className="text-emerald-600" size={15} />
                  <span>Verified Account</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Feedback Alerts */}
        {successMessage && (
          <AlertMessage
            type="success"
            message={successMessage}
            onDismiss={() => setSuccessMessage('')}
          />
        )}
        {serverError && (
          <AlertMessage
            type="error"
            message={serverError}
            onDismiss={() => setServerError('')}
          />
        )}

        {/* Two Column Layout: Personal Info + Account Security */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Main Edit Form (8 cols) */}
          <div className="lg:col-span-8 surface-card p-6 sm:p-8">
            <h2 className="text-lg font-bold text-[#172117] mb-1" style={{ fontFamily: 'var(--font-sans)' }}>
              Personal Information
            </h2>
            <p className="text-xs text-gray-500 mb-6">
              Update your contact details to facilitate pickup coordination.
            </p>

            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              <FormInput
                label="Full Name *"
                name="name"
                placeholder="Your full name"
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

              <FormInput
                label="Address / Primary Neighborhood"
                name="address"
                placeholder="Street address, neighborhood, city"
                value={formData.address}
                onChange={handleChange}
                error={errors.address}
              />

              {/* NGO-specific fields & Visual Identity */}
              {user?.role === 'ngo' && (
                <div className="space-y-5 pt-2">
                  <div className="p-4 sm:p-5 rounded-2xl border border-primary-200 bg-primary-50/40 space-y-4">
                    <div className="flex items-center gap-2">
                      <HiOfficeBuilding className="text-primary-700" size={18} />
                      <p className="text-xs font-bold text-primary-900 uppercase tracking-wider">
                        Organization Credentials & Details
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormInput
                        label="Organization Name *"
                        name="organizationName"
                        placeholder="Registered NGO name"
                        value={formData.organizationName}
                        onChange={handleChange}
                        error={errors.organizationName}
                        required
                      />
                      <FormInput
                        label="Registration Number *"
                        name="registrationNumber"
                        placeholder="e.g. Trust / Society Registration ID"
                        value={formData.registrationNumber}
                        onChange={handleChange}
                        error={errors.registrationNumber}
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Official Website
                      </label>
                      <input
                        type="url"
                        name="website"
                        placeholder="https://yourngo.org"
                        value={ngoProfile.website}
                        onChange={handleNgoChange}
                        className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-[#e8e2d5] rounded-xl focus:ring-2 focus:ring-primary-500 focus:outline-none bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Community Mission & Food Distribution Description
                      </label>
                      <textarea
                        name="description"
                        rows={3}
                        placeholder="Describe your non-profit mission, who you serve in the community, and how donations are distributed..."
                        value={ngoProfile.description}
                        onChange={handleNgoChange}
                        className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-[#e8e2d5] rounded-xl focus:ring-2 focus:ring-primary-500 focus:outline-none bg-white resize-y"
                      />
                    </div>
                  </div>

                  {/* Public Visual Identity Card (Cover Banner & Logo) */}
                  <div className="p-4 sm:p-5 rounded-2xl border border-emerald-200 bg-emerald-50/30 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <HiPhotograph className="text-emerald-700" size={18} />
                        <p className="text-xs font-bold text-emerald-900 uppercase tracking-wider">
                          Directory Visuals (Cover Banner & Logo)
                        </p>
                      </div>
                      <span className="text-[11px] text-emerald-700 font-medium">Shows on Donor Directory</span>
                    </div>

                    {/* Cover Banner Uploader */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                        Organization Cover Banner
                      </label>
                      <div className="border-2 border-dashed border-emerald-200 rounded-2xl p-4 bg-white hover:border-emerald-400 transition-colors">
                        {coverPreview ? (
                          <div className="relative rounded-xl overflow-hidden h-36 bg-gray-100 mb-3 border border-gray-200">
                            <img src={coverPreview} alt="Cover Preview" className="w-full h-full object-cover" />
                            <label
                              htmlFor="cover-upload"
                              className="absolute bottom-2.5 right-2.5 bg-black/75 hover:bg-black text-white text-xs px-3 py-1.5 rounded-lg cursor-pointer flex items-center gap-1.5 transition-colors"
                            >
                              <HiUpload size={14} /> Change Banner
                            </label>
                          </div>
                        ) : (
                          <label
                            htmlFor="cover-upload"
                            className="flex flex-col items-center justify-center py-6 cursor-pointer text-center"
                          >
                            <div className="h-10 w-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2">
                              <HiPhotograph size={20} />
                            </div>
                            <span className="text-xs font-bold text-emerald-800">Click to upload cover photo</span>
                            <span className="text-[11px] text-gray-500 mt-0.5">PNG, JPG or WebP (Recommended 1200 x 500 px)</span>
                          </label>
                        )}
                        <input
                          id="cover-upload"
                          type="file"
                          accept="image/*"
                          onChange={handleCoverChange}
                          className="hidden"
                        />
                      </div>
                    </div>

                    {/* Logo Uploader */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                        Organization Logo
                      </label>
                      <div className="flex items-center gap-4 bg-white p-3 rounded-xl border border-gray-200">
                        <div className="h-16 w-16 rounded-2xl bg-primary-100 text-primary-800 flex items-center justify-center font-extrabold text-xl overflow-hidden shrink-0 border border-primary-200">
                          {logoPreview ? (
                            <img src={logoPreview} alt="Logo Preview" className="w-full h-full object-cover" />
                          ) : (
                            formData.organizationName?.slice(0, 2).toUpperCase() || 'NGO'
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <label
                            htmlFor="logo-upload"
                            className="btn-secondary text-xs py-1.5 px-3 cursor-pointer inline-flex items-center gap-1.5"
                          >
                            <HiUpload size={14} /> Upload Logo
                          </label>
                          <p className="text-[11px] text-gray-400 mt-1">Square image (minimum 200 x 200 px)</p>
                          <input
                            id="logo-upload"
                            type="file"
                            accept="image/*"
                            onChange={handleLogoChange}
                            className="hidden"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Food Categories Accepted */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                        Food Categories Accepted
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {['Cooked Meals', 'Fresh Produce', 'Bakery', 'Packaged Food'].map((cat) => {
                          const selected = ngoProfile.categories.includes(cat);
                          return (
                            <button
                              type="button"
                              key={cat}
                              onClick={() => toggleCategory(cat)}
                              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                                selected
                                  ? 'bg-primary-600 text-white shadow-2xs'
                                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                              }`}
                            >
                              {selected ? '✓ ' : '+ '}{cat}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Pickup Hours & Response Time */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                          Operational Pickup Hours
                        </label>
                        <input
                          type="text"
                          name="pickupHours"
                          value={ngoProfile.pickupHours}
                          onChange={handleNgoChange}
                          placeholder="e.g. 9 AM – 7 PM"
                          className="w-full px-3.5 py-2 text-xs sm:text-sm border border-[#e8e2d5] rounded-xl focus:ring-2 focus:ring-primary-500 focus:outline-none bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                          Average Response Time
                        </label>
                        <input
                          type="text"
                          name="responseTime"
                          value={ngoProfile.responseTime}
                          onChange={handleNgoChange}
                          placeholder="e.g. Usually responds within 30 min"
                          className="w-full px-3.5 py-2 text-xs sm:text-sm border border-[#e8e2d5] rounded-xl focus:ring-2 focus:ring-primary-500 focus:outline-none bg-white"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-4 flex justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary text-xs sm:text-sm px-6 py-2.5 shadow-sm"
                >
                  {loading ? 'Saving Changes...' : 'Save Profile Changes'}
                </button>
              </div>
            </form>
          </div>

          {/* Account Security & Actions (4 cols) */}
          <div className="lg:col-span-4 space-y-6">
            {/* Account Info */}
            <div className="surface-card p-6">
              <h3 className="text-sm font-bold text-[#172117] mb-2" style={{ fontFamily: 'var(--font-sans)' }}>
                Account Settings
              </h3>
              <p className="text-xs text-gray-500 mb-4">
                Manage your login access and credentials.
              </p>

              <div className="space-y-3 text-xs">
                <div className="p-3 rounded-xl bg-[#faf8f4] border border-[#e8e2d5]">
                  <span className="text-gray-400 block text-[10px] uppercase font-bold">Assigned Role</span>
                  <span className="font-bold text-gray-800 text-sm capitalize">{getRoleLabel(user?.role)}</span>
                </div>

                <Link
                  to="/forgot-password"
                  className="w-full btn-secondary text-xs py-2.5 justify-center flex items-center gap-1.5"
                >
                  <HiLockClosed size={15} />
                  <span>Reset Password</span>
                </Link>

                <button
                  type="button"
                  onClick={logout}
                  className="w-full btn-danger text-xs py-2.5 justify-center flex items-center gap-1.5"
                >
                  <HiLogout size={16} />
                  <span>Logout Account</span>
                </button>
              </div>
            </div>

            {/* Safety & Complaints Section */}
            <div className="surface-card p-6 border-amber-200/80 bg-gradient-to-br from-amber-50/30 to-white">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                    <HiExclamationCircle size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#172117]" style={{ fontFamily: 'var(--font-sans)' }}>
                      Safety & Complaints
                    </h3>
                    <p className="text-[11px] text-gray-500">
                      Disputes & quality reports filed by you
                    </p>
                  </div>
                </div>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-mono">
                  {myComplaints.length}
                </span>
              </div>

              {myComplaints.length === 0 ? (
                <div className="text-xs text-gray-500 bg-[#faf8f4] p-3 rounded-2xl border border-[#e8e2d5] mt-3">
                  <p className="font-semibold text-gray-700 mb-0.5">No filed complaints</p>
                  <p className="text-[11px] leading-relaxed">
                    You can report food quality or no-shows directly on your active and completed cards using the <strong>Report Issue</strong> button.
                  </p>
                </div>
              ) : (
                <div className="space-y-2 mt-3 max-h-64 overflow-y-auto pr-1">
                  {myComplaints.map((c) => (
                    <div
                      key={c._id}
                      className="p-3 bg-white rounded-xl border border-gray-200 text-xs space-y-1.5 shadow-2xs"
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-bold text-gray-800 capitalize">
                          {c.type.replace(/_/g, ' ')}
                        </span>
                        <span
                          className={`px-2 py-0.2 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            c.status === 'resolved'
                              ? 'bg-emerald-100 text-emerald-800'
                              : c.status === 'investigating'
                              ? 'bg-blue-100 text-blue-800'
                              : c.status === 'dismissed'
                              ? 'bg-gray-100 text-gray-600'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {c.status}
                        </span>
                      </div>
                      <p className="text-gray-600 text-[11px] line-clamp-2">
                        {c.description}
                      </p>
                      {c.adminNotes && (
                        <div className="p-2 bg-emerald-50 rounded-lg border border-emerald-200 text-[11px] text-emerald-900 mt-1">
                          <strong>Admin Note:</strong> {c.adminNotes}
                        </div>
                      )}
                      <div className="flex items-center justify-between text-[10px] text-gray-400 pt-1 border-t border-gray-100">
                        <span>Reported: {c.against?.name || 'Partner'}</span>
                        <span>{new Date(c.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <button
                type="button"
                onClick={() => setShowComplaintsModal(true)}
                className="w-full mt-3.5 btn-secondary text-xs py-2 justify-center flex items-center gap-1.5 border-amber-300 text-amber-900 hover:bg-amber-50 cursor-pointer shadow-2xs font-semibold"
              >
                <HiShieldCheck size={16} className="text-amber-700" />
                <span>View Full Dispute & Resolution History</span>
              </button>
            </div>

            {/* Impact Promise Card */}
            <div className="surface-card p-6 bg-gradient-to-br from-primary-50/60 to-white border-primary-200">
              <span className="text-2xl">🌱</span>
              <h4 className="text-sm font-bold text-[#172117] mt-1 mb-1">
                The ShareBite Pledge
              </h4>
              <p className="text-xs text-gray-600 leading-relaxed">
                By participating in ShareBite, you join a network dedicated to zero edible food waste and direct compassionate distribution.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Live Complaints & Resolution Status Modal */}
      <MyComplaintsModal
        isOpen={showComplaintsModal}
        onClose={() => setShowComplaintsModal(false)}
      />
    </DashboardLayout>
  );
};

export default ProfilePage;
