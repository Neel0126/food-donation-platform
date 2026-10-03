import { useState, useEffect } from 'react';
import { HiX, HiUpload } from 'react-icons/hi';

const EditDonationModal = ({ isOpen, onClose, onSubmit, isLoading, donation }) => {
  const [formData, setFormData] = useState({
    foodType: '',
    quantity: '',
    description: '',
    street: '',
    city: '',
    state: '',
    zipCode: '',
  });
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    if (donation && isOpen) {
      setFormData({
        foodType: donation.foodType || '',
        quantity: donation.quantity || '',
        description: donation.description || '',
        street: donation.pickupLocation?.street || '',
        city: donation.pickupLocation?.city || '',
        state: donation.pickupLocation?.state || '',
        zipCode: donation.pickupLocation?.zipCode || '',
      });
      const getImageUrl = (url) => {
        if (!url) return null;
        if (url.startsWith('/uploads/')) {
          const baseUrl = import.meta.env.VITE_API_URL
            ? import.meta.env.VITE_API_URL.replace('/api', '')
            : 'http://localhost:3001';
          return `${baseUrl}${url}`;
        }
        return url;
      };
      setPreview(getImageUrl(donation.imageUrl) || null);
    }
  }, [donation, isOpen]);

  if (!isOpen || !donation) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const data = new FormData();
    data.append('foodType', formData.foodType);
    data.append('quantity', formData.quantity);
    data.append('description', formData.description);
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

    onSubmit(donation._id, data);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-3xl w-full max-w-2xl my-6 relative flex flex-col max-h-[90vh] border border-[#e8e2d5] shadow-2xl animate-scale-in">
        <div className="flex justify-between items-center px-6 py-4 border-b border-[#e8e2d5] shrink-0 bg-[#faf8f4] rounded-t-3xl">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-primary-700">
              Update Listing
            </span>
            <h2 className="text-xl font-bold text-[#172117]" style={{ fontFamily: 'var(--font-sans)' }}>
              Edit Food Donation
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 p-2 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <HiX size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1">
          <div className="space-y-4">
            {/* Image Upload */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Update Food Image</label>
              <div className="border-2 border-dashed border-[#e8e2d5] hover:border-primary-400 rounded-2xl p-4 text-center bg-[#faf8f4] transition-colors">
                <div className="space-y-2">
                  {preview ? (
                    <div className="relative inline-block">
                      <img src={preview} alt="Preview" className="h-32 w-auto object-cover rounded-xl shadow-xs" />
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
                    <>
                      <HiUpload className="mx-auto h-8 w-8 text-primary-500" />
                      <div className="flex justify-center text-xs text-gray-600">
                        <label className="cursor-pointer bg-white px-3 py-1.5 rounded-lg border border-[#e8e2d5] font-semibold text-primary-700 hover:bg-primary-50 shadow-2xs">
                          <span>Change file</span>
                          <input type="file" name="image" accept="image/*" onChange={handleImageChange} className="sr-only" />
                        </label>
                      </div>
                      <p className="text-[11px] text-gray-400">PNG, JPG, WEBP up to 5MB</p>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Food Name / Type *</label>
                <input
                  type="text"
                  name="foodType"
                  value={formData.foodType}
                  onChange={handleChange}
                  required
                  placeholder="e.g. Cooked Meals, Rice, Bread"
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Quantity *</label>
                <input
                  type="text"
                  name="quantity"
                  value={formData.quantity}
                  onChange={handleChange}
                  required
                  placeholder="e.g. 50 meals, 20 kgs"
                  className="input-field"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={3}
                className="input-field"
                placeholder="Add special instructions or dietary info..."
              />
            </div>

            <div className="bg-[#faf8f4] p-4 rounded-2xl border border-[#e8e2d5]">
              <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-3" style={{ fontFamily: 'var(--font-sans)' }}>
                Pickup Address *
              </h3>
              <div className="space-y-3">
                <div>
                  <input
                    type="text"
                    name="street"
                    value={formData.street}
                    onChange={handleChange}
                    required
                    placeholder="Street Address"
                    className="input-field"
                  />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    required
                    placeholder="City"
                    className="input-field"
                  />
                  <input
                    type="text"
                    name="state"
                    value={formData.state}
                    onChange={handleChange}
                    required
                    placeholder="State"
                    className="input-field"
                  />
                  <input
                    type="text"
                    name="zipCode"
                    value={formData.zipCode}
                    onChange={handleChange}
                    required
                    placeholder="Zip/PIN Code"
                    className="input-field col-span-2 md:col-span-1"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-[#e8e2d5]">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary cursor-pointer text-xs sm:text-sm px-4 py-2"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary cursor-pointer disabled:opacity-50 text-xs sm:text-sm px-5 py-2 shadow-sm"
            >
              {isLoading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditDonationModal;
