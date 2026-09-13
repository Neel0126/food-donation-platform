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
          const baseUrl = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') : 'http://localhost:3001';
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
    data.append('pickupLocation', JSON.stringify({
      street: formData.street,
      city: formData.city,
      state: formData.state,
      zipCode: formData.zipCode
    }));
    
    if (image) {
      data.append('image', image);
    }

    onSubmit(donation._id, data);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-2xl w-full max-w-2xl my-8 relative flex flex-col max-h-[90vh] border border-primary-100 shadow-xl animate-scale-in">
        <div className="flex justify-between items-center p-6 border-b border-primary-50 shrink-0">
          <h2 className="text-xl font-bold text-gray-800" style={{ fontFamily: 'var(--font-sans)' }}>Edit Donation</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-primary-600 transition-colors duration-200 cursor-pointer p-1 rounded-lg hover:bg-primary-50">
            <HiX size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto">
          <div className="space-y-5">
            {/* Image Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Update Food Image</label>
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-primary-200 border-dashed rounded-2xl hover:border-primary-400 transition-colors duration-200 bg-primary-50/30">
                <div className="space-y-1 text-center">
                  {preview ? (
                    <div className="relative inline-block">
                      <img src={preview} alt="Preview" className="h-40 w-auto rounded-xl object-cover shadow-sm" />
                      <button 
                        type="button" 
                        onClick={() => { setImage(null); setPreview(null); }}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600 transition-colors duration-200 cursor-pointer"
                      >
                        <HiX size={14} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <HiUpload className="mx-auto h-12 w-12 text-primary-300" />
                      <div className="flex text-sm text-gray-600 justify-center">
                        <label className="relative cursor-pointer bg-white rounded-lg px-2 py-1 font-medium text-primary-600 hover:text-primary-700 focus-within:outline-none transition-colors duration-200">
                          <span>Upload a file</span>
                          <input type="file" name="image" accept="image/*" onChange={handleImageChange} className="sr-only" />
                        </label>
                      </div>
                      <p className="text-xs text-gray-400">PNG, JPG, WEBP up to 5MB</p>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Food Type *</label>
                <input
                  type="text"
                  name="foodType"
                  value={formData.foodType}
                  onChange={handleChange}
                  required
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantity *</label>
                <input
                  type="text"
                  name="quantity"
                  value={formData.quantity}
                  onChange={handleChange}
                  required
                  className="input-field"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows="3"
                className="input-field"
              />
            </div>

            <div className="bg-primary-50/50 p-4 rounded-2xl border border-primary-100">
              <h3 className="text-sm font-semibold text-gray-700 mb-3" style={{ fontFamily: 'var(--font-sans)' }}>Pickup Location *</h3>
              <div className="space-y-4">
                <div>
                  <input
                    type="text"
                    name="street"
                    value={formData.street}
                    onChange={handleChange}
                    required
                    placeholder="Street Address"
                    className="input-field text-sm"
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
                    className="input-field text-sm"
                  />
                  <input
                    type="text"
                    name="state"
                    value={formData.state}
                    onChange={handleChange}
                    required
                    placeholder="State"
                    className="input-field text-sm"
                  />
                  <input
                    type="text"
                    name="zipCode"
                    value={formData.zipCode}
                    onChange={handleChange}
                    required
                    placeholder="Zip/PIN Code"
                    className="input-field col-span-2 md:col-span-1 text-sm"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 flex justify-end gap-3 pt-4 border-t border-primary-50">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary cursor-pointer disabled:opacity-50"
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
