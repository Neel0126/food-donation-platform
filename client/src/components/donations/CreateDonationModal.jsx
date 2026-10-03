import { useState } from 'react';
import {
  HiX,
  HiUpload,
  HiCheck,
  HiLocationMarker,
  HiArrowRight,
  HiArrowLeft,
  HiSparkles,
  HiClock,
  HiCheckCircle,
} from 'react-icons/hi';

/**
 * 4-Step Guided Create Donation Flow:
 * 01 Food Details -> 02 Pickup Details -> 03 Review -> 04 Success
 */
const CreateDonationModal = ({ isOpen, onClose, onSubmit, isLoading }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    foodType: '',
    category: 'Cooked Meals',
    quantity: '',
    mealsCount: '',
    description: '',
    street: '',
    city: '',
    state: '',
    zipCode: '',
    availableTime: 'Within 2 hours',
    contactPhone: '',
  });

  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [locationObj, setLocationObj] = useState({ lat: null, lng: null });
  const [gettingLocation, setGettingLocation] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [formError, setFormError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen) return null;

  const handleGetLocation = () => {
    setGettingLocation(true);
    setLocationError('');
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setLocationObj({ lat, lng });

          try {
            const res = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`
            );
            if (res.ok) {
              const data = await res.json();
              const addr = data.address || {};

              const streetParts = [
                addr.house_number,
                addr.road || addr.street || addr.residential || addr.suburb || addr.neighbourhood,
              ].filter(Boolean);

              const street = streetParts.length > 0 ? streetParts.join(' ') : data.name || '';
              const city =
                addr.city ||
                addr.town ||
                addr.village ||
                addr.municipality ||
                addr.county ||
                addr.state_district ||
                '';
              const state = addr.state || '';
              const zipCode = addr.postcode || '';

              setFormData((prev) => ({
                ...prev,
                street: street || prev.street,
                city: city || prev.city,
                state: state || prev.state,
                zipCode: zipCode || prev.zipCode,
              }));
            }
          } catch (err) {
            console.warn('Reverse geocoding error:', err);
          } finally {
            setGettingLocation(false);
          }
        },
        (error) => {
          console.error('Error getting location:', error);
          setLocationError('Could not get GPS location. Please allow browser location access.');
          setGettingLocation(false);
        },
        { timeout: 10000, enableHighAccuracy: true }
      );
    } else {
      setLocationError('Geolocation is not supported by your browser.');
      setGettingLocation(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const updated = { ...prev, [name]: value };
      // Auto-suggest estimated meals if user enters quantity and hasn't manually set mealsCount
      if (name === 'quantity' && !prev._manualMealsCount) {
        const valLower = value.toLowerCase();
        if (valLower.includes('kg')) {
          const m = valLower.match(/(\d+(\.\d+)?)/);
          if (m) updated.mealsCount = String(Math.round(parseFloat(m[1]) * 2.5));
        } else {
          const m = valLower.match(/\d+/);
          if (m) updated.mealsCount = m[0];
        }
      }
      if (name === 'mealsCount') {
        updated._manualMealsCount = true;
      }
      return updated;
    });
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const validateStep1 = () => {
    if (!formData.foodType.trim()) return 'Please enter the food name or type.';
    if (!formData.quantity.trim()) return 'Please enter the quantity.';
    return '';
  };

  const validateStep2 = () => {
    if (!formData.street.trim() || !formData.city.trim()) {
      return 'Please enter street address and city.';
    }
    return '';
  };

  const handleNext = () => {
    setFormError('');
    if (currentStep === 1) {
      const err = validateStep1();
      if (err) {
        setFormError(err);
        return;
      }
      setCurrentStep(2);
    } else if (currentStep === 2) {
      const err = validateStep2();
      if (err) {
        setFormError(err);
        return;
      }
      setCurrentStep(3);
    }
  };

  const handleBack = () => {
    setFormError('');
    setCurrentStep((prev) => Math.max(1, prev - 1));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    const data = new FormData();
    data.append('foodType', formData.foodType);
    data.append('quantity', formData.quantity);
    if (formData.mealsCount) {
      data.append('estimatedMeals', formData.mealsCount);
    }

    // Merge notes if category or mealsCount provided
    const detailedDesc = [
      formData.description,
      formData.category ? `Category: ${formData.category}` : null,
      formData.mealsCount ? `Estimated: ~${formData.mealsCount} meals` : null,
      formData.availableTime ? `Pickup window: ${formData.availableTime}` : null,
      formData.contactPhone ? `Contact: ${formData.contactPhone}` : null,
    ]
      .filter(Boolean)
      .join(' | ');

    data.append('description', detailedDesc || formData.description);
    data.append('availableTime', formData.availableTime || 'Within 6 hours');
    data.append('pickupWindow', formData.availableTime || 'Within 6 hours');

    data.append(
      'pickupLocation',
      JSON.stringify({
        street: formData.street,
        city: formData.city,
        state: formData.state,
        zipCode: formData.zipCode,
      })
    );

    if (image) {
      data.append('image', image);
    }
    if (locationObj.lat && locationObj.lng) {
      data.append('lat', locationObj.lat);
      data.append('lng', locationObj.lng);
    }

    try {
      await onSubmit(data);
      setCurrentStep(4);
      setIsSuccess(true);
    } catch (err) {
      setFormError('Failed to create donation. Please check details and try again.');
    }
  };

  const handleModalClose = () => {
    // Reset state on close
    setCurrentStep(1);
    setIsSuccess(false);
    setImage(null);
    setPreview(null);
    setFormError('');
    onClose();
  };

  const stepsList = [
    { num: 1, label: 'Food Details' },
    { num: 2, label: 'Pickup Details' },
    { num: 3, label: 'Review' },
    { num: 4, label: 'Publish' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-3xl w-full max-w-2xl my-6 relative flex flex-col max-h-[92vh] border border-[#e8e2d5] shadow-2xl animate-scale-in">
        {/* Modal Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-[#e8e2d5] shrink-0 bg-[#faf8f4] rounded-t-3xl">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-primary-700">
              ShareBite Guided Donation
            </span>
            <h2 className="text-xl font-bold text-[#172117]" style={{ fontFamily: 'var(--font-sans)' }}>
              {currentStep === 4 ? 'Donation Published!' : 'Create Food Donation'}
            </h2>
          </div>
          <button
            onClick={handleModalClose}
            className="text-gray-400 hover:text-gray-700 p-2 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <HiX size={20} />
          </button>
        </div>

        {/* Step Indicator (Steps 1-3) */}
        {currentStep < 4 && (
          <div className="px-6 pt-5 pb-2 border-b border-gray-100 shrink-0">
            <div className="flex items-center justify-between">
              {stepsList.map((step, idx) => {
                const isActive = currentStep === step.num;
                const isPassed = currentStep > step.num;
                return (
                  <div key={step.num} className="flex items-center flex-1 last:flex-none">
                    <div className="flex items-center gap-2">
                      <div
                        className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                          isPassed
                            ? 'bg-primary-600 text-white'
                            : isActive
                            ? 'bg-primary-100 text-primary-800 border-2 border-primary-600 ring-2 ring-primary-100'
                            : 'bg-gray-100 text-gray-400'
                        }`}
                      >
                        {isPassed ? <HiCheck size={14} /> : `0${step.num}`}
                      </div>
                      <span
                        className={`hidden sm:inline text-xs font-semibold ${
                          isActive ? 'text-primary-800' : isPassed ? 'text-gray-700' : 'text-gray-400'
                        }`}
                      >
                        {step.label}
                      </span>
                    </div>
                    {idx < stepsList.length - 1 && (
                      <div
                        className={`flex-1 h-0.5 mx-3 hidden sm:block ${
                          isPassed ? 'bg-primary-600' : 'bg-gray-200'
                        }`}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Form Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {formError && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 text-red-700 text-xs font-semibold border border-red-200">
              {formError}
            </div>
          )}

          {/* ================= STEP 1: Food Details ================= */}
          {currentStep === 1 && (
            <div className="space-y-4 animate-fade-in">
              <div className="mb-2">
                <h3 className="text-base font-bold text-[#172117]" style={{ fontFamily: 'var(--font-sans)' }}>
                  What are you donating today?
                </h3>
                <p className="text-xs text-gray-500">Provide details so NGOs can inspect and prepare distribution.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Food Name / Description *</label>
                <input
                  type="text"
                  name="foodType"
                  value={formData.foodType}
                  onChange={handleChange}
                  placeholder="e.g. Fresh Steamed Rice & Dal, Veg Biryani, Fruit Baskets"
                  className="input-field"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Category</label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    className="input-field"
                  >
                    <option value="Cooked Meals">Cooked Meals</option>
                    <option value="Raw Groceries / Grains">Raw Groceries / Grains</option>
                    <option value="Bakery & Bread">Bakery & Bread</option>
                    <option value="Fresh Fruits & Vegetables">Fresh Fruits & Vegetables</option>
                    <option value="Packaged / Canned Food">Packaged / Canned Food</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Total Quantity *</label>
                  <input
                    type="text"
                    name="quantity"
                    value={formData.quantity}
                    onChange={handleChange}
                    placeholder="e.g. 50 meals, 15 kg, 4 trays"
                    className="input-field"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Estimated Meals Count</label>
                  <input
                    type="number"
                    name="mealsCount"
                    value={formData.mealsCount}
                    onChange={handleChange}
                    placeholder="e.g. 50 (helps calculate community impact)"
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Best Consumed Within</label>
                  <select
                    name="availableTime"
                    value={formData.availableTime}
                    onChange={handleChange}
                    className="input-field"
                  >
                    <option value="Within 2-3 hours">Within 2-3 hours (Immediate)</option>
                    <option value="Within 6 hours">Within 6 hours (Today)</option>
                    <option value="Within 24 hours">Within 24 hours</option>
                    <option value="Multiple days (Packaged/Dry)">Multiple days (Packaged/Dry)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Additional Notes</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={2}
                  placeholder="e.g. Packed in clean steel containers. Vegetarian only. No nuts."
                  className="input-field"
                />
              </div>

              {/* Photo Upload */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Food Image (Recommended)</label>
                <div className="border-2 border-dashed border-[#e8e2d5] hover:border-primary-400 rounded-2xl p-4 text-center bg-[#faf8f4] transition-colors">
                  {preview ? (
                    <div className="relative inline-block">
                      <img src={preview} alt="Food Preview" className="h-32 w-auto object-cover rounded-xl shadow-xs" />
                      <button
                        type="button"
                        onClick={() => {
                          setImage(null);
                          setPreview(null);
                        }}
                        className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-1 shadow hover:bg-red-700 cursor-pointer"
                      >
                        <HiX size={14} />
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <HiUpload className="mx-auto h-8 w-8 text-primary-500" />
                      <div className="flex justify-center text-xs text-gray-600">
                        <label className="cursor-pointer bg-white px-3 py-1.5 rounded-lg border border-[#e8e2d5] font-semibold text-primary-700 hover:bg-primary-50 shadow-2xs">
                          <span>Browse Image</span>
                          <input type="file" accept="image/*" onChange={handleImageChange} className="sr-only" />
                        </label>
                      </div>
                      <p className="text-[11px] text-gray-400">JPG, PNG, WEBP up to 5MB</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ================= STEP 2: Pickup Details ================= */}
          {currentStep === 2 && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-base font-bold text-[#172117]" style={{ fontFamily: 'var(--font-sans)' }}>
                    Where should the volunteer pick it up?
                  </h3>
                  <p className="text-xs text-gray-500">Provide an exact street address or capture GPS coordinates.</p>
                </div>
                <button
                  type="button"
                  onClick={handleGetLocation}
                  disabled={gettingLocation}
                  className="btn-secondary text-xs px-3 py-1.5 shrink-0"
                >
                  <HiLocationMarker size={14} />
                  <span>{gettingLocation ? 'Detecting...' : locationObj.lat ? 'GPS Added ✓' : 'Auto-Fill GPS'}</span>
                </button>
              </div>

              {locationError && (
                <p className="text-xs text-amber-700 bg-amber-50 p-2.5 rounded-xl border border-amber-200">
                  {locationError}
                </p>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Street Address / Landmark *</label>
                <input
                  type="text"
                  name="street"
                  value={formData.street}
                  onChange={handleChange}
                  placeholder="e.g. 102 Green Avenue, Opp. City Mall"
                  className="input-field"
                  required
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">City *</label>
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    placeholder="e.g. Nadiad"
                    className="input-field"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">State *</label>
                  <input
                    type="text"
                    name="state"
                    value={formData.state}
                    onChange={handleChange}
                    placeholder="e.g. Gujarat"
                    className="input-field"
                    required
                  />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-bold text-gray-700 mb-1">PIN / Zip Code</label>
                  <input
                    type="text"
                    name="zipCode"
                    value={formData.zipCode}
                    onChange={handleChange}
                    placeholder="e.g. 387001"
                    className="input-field"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Pickup Contact Phone</label>
                <input
                  type="tel"
                  name="contactPhone"
                  value={formData.contactPhone}
                  onChange={handleChange}
                  placeholder="e.g. +91 98765 43210 (so volunteer can coordinate arrival)"
                  className="input-field"
                />
              </div>
            </div>
          )}

          {/* ================= STEP 3: Review ================= */}
          {currentStep === 3 && (
            <div className="space-y-4 animate-fade-in">
              <div>
                <h3 className="text-base font-bold text-[#172117]" style={{ fontFamily: 'var(--font-sans)' }}>
                  Review your donation summary
                </h3>
                <p className="text-xs text-gray-500">Ensure the details are accurate before making it visible to NGOs.</p>
              </div>

              {/* Preview Card */}
              <div className="surface-card p-5 border-primary-200/90 bg-[#faf8f4]">
                <div className="flex flex-col sm:flex-row gap-4">
                  {preview ? (
                    <img
                      src={preview}
                      alt="Food"
                      className="w-full sm:w-36 h-28 object-cover rounded-xl border border-gray-200"
                    />
                  ) : (
                    <div className="w-full sm:w-36 h-28 rounded-xl bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-2xl">
                      🍲
                    </div>
                  )}

                  <div className="flex-1 space-y-1.5">
                    <div className="flex justify-between items-start">
                      <h4 className="text-lg font-bold text-[#172117]" style={{ fontFamily: 'var(--font-sans)' }}>
                        {formData.foodType}
                      </h4>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                        Ready to Post
                      </span>
                    </div>

                    <p className="text-xs text-gray-600">
                      <strong>Quantity:</strong> {formData.quantity} {formData.mealsCount ? `(~${formData.mealsCount} meals)` : ''}
                    </p>
                    <p className="text-xs text-gray-600">
                      <strong>Category:</strong> {formData.category}
                    </p>
                    <p className="text-xs text-gray-600 flex items-start gap-1">
                      <HiLocationMarker className="text-primary-600 shrink-0 mt-0.5" />
                      <span>{formData.street}, {formData.city}, {formData.state} {formData.zipCode}</span>
                    </p>
                    {formData.description && (
                      <p className="text-xs text-gray-500 italic mt-1 bg-white p-2 rounded-lg border border-gray-200/60">
                        "{formData.description}"
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================= STEP 4: Success ================= */}
          {currentStep === 4 && (
            <div className="text-center py-6 space-y-4 animate-scale-in">
              <div className="h-16 w-16 mx-auto rounded-3xl bg-primary-100 text-primary-700 flex items-center justify-center shadow-sm">
                <span className="text-3xl">🌱</span>
              </div>
              <div>
                <h3 className="text-2xl font-extrabold text-[#172117]" style={{ fontFamily: 'var(--font-sans)' }}>
                  Donation Created!
                </h3>
                <p className="text-sm text-gray-600 mt-2 max-w-sm mx-auto leading-relaxed">
                  "Your food is now ready to reach someone in need. Verified NGOs nearby have been notified."
                </p>
              </div>

              <div className="pt-4 flex flex-col sm:flex-row justify-center gap-3">
                <button
                  type="button"
                  onClick={handleModalClose}
                  className="btn-primary text-sm px-6 py-2.5"
                >
                  View My Donations
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Controls (Steps 1 to 3) */}
        {currentStep < 4 && (
          <div className="px-6 py-4 border-t border-[#e8e2d5] flex justify-between items-center bg-[#faf8f4] rounded-b-3xl">
            {currentStep > 1 ? (
              <button
                type="button"
                onClick={handleBack}
                className="btn-secondary text-xs sm:text-sm px-4 py-2"
              >
                <HiArrowLeft size={16} /> Back
              </button>
            ) : (
              <button
                type="button"
                onClick={handleModalClose}
                className="btn-secondary text-xs sm:text-sm px-4 py-2"
              >
                Cancel
              </button>
            )}

            {currentStep < 3 ? (
              <button
                type="button"
                onClick={handleNext}
                className="btn-primary text-xs sm:text-sm px-5 py-2"
              >
                Continue <HiArrowRight size={16} />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isLoading}
                className="btn-primary text-xs sm:text-sm px-6 py-2.5 shadow-md"
              >
                {isLoading ? 'Publishing...' : 'Publish Donation'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CreateDonationModal;
