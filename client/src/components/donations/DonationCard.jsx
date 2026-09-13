import { HiLocationMarker, HiClock, HiKey, HiUser, HiPhone } from 'react-icons/hi';

const DonationCard = ({ donation, onEdit, onCancel }) => {
  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-amber-50 text-amber-700 border border-amber-200';
      case 'accepted': return 'bg-blue-50 text-blue-700 border border-blue-200';
      case 'assigned': return 'bg-indigo-50 text-indigo-700 border border-indigo-200';
      case 'picked_up': return 'bg-purple-50 text-purple-700 border border-purple-200';
      case 'delivered': return 'bg-green-50 text-green-700 border border-green-200';
      case 'cancelled': return 'bg-red-50 text-red-700 border border-red-200';
      default: return 'bg-gray-50 text-gray-700 border border-gray-200';
    }
  };

  const getImageUrl = (url) => {
    if (!url) return null;
    if (url.startsWith('/uploads/')) {
      const baseUrl = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') : 'http://localhost:3001';
      return `${baseUrl}${url}`;
    }
    return url;
  };

  return (
    <div className="bg-white rounded-2xl border border-primary-100 overflow-hidden hover:shadow-lg hover:shadow-primary-600/8 transition-all duration-300 hover:-translate-y-1">
      {donation.imageUrl ? (
        <div className="relative overflow-hidden">
          <img src={getImageUrl(donation.imageUrl)} alt={donation.foodType} className="w-full h-48 object-cover transition-transform duration-500 hover:scale-105" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
        </div>
      ) : (
        <div className="w-full h-48 bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center text-primary-300">
          <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5a1.5 1.5 0 001.5-1.5V5.25a1.5 1.5 0 00-1.5-1.5H3.75a1.5 1.5 0 00-1.5 1.5v14.25c0 .828.672 1.5 1.5 1.5z" />
          </svg>
        </div>
      )}
      
      <div className="p-5">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-lg font-semibold text-gray-800" style={{ fontFamily: 'var(--font-sans)' }}>{donation.foodType}</h3>
          <span className={`px-2.5 py-1 text-xs font-medium rounded-full uppercase tracking-wider ${getStatusColor(donation.status)}`}>
            {donation.status.replace('_', ' ')}
          </span>
        </div>
        
        <p className="text-sm text-gray-500 mb-4 line-clamp-2">{donation.description}</p>
        
        <div className="space-y-2 mb-4">
          <div className="flex items-center text-sm text-gray-500">
            <span className="font-medium mr-2 text-gray-700">Quantity:</span> {donation.quantity}
          </div>
          <div className="flex items-start text-sm text-gray-500">
            <HiLocationMarker className="mt-0.5 mr-1.5 shrink-0 text-primary-400" />
            <span>
              {donation.pickupLocation?.street}, {donation.pickupLocation?.city}
            </span>
          </div>
          <div className="flex items-center text-sm text-gray-500">
            <HiClock className="mr-1.5 shrink-0 text-primary-400" />
            <span>Created: {new Date(donation.createdAt).toLocaleDateString()}</span>
          </div>
        </div>

        {/* Assigned NGO / Volunteer Details */}
        {(donation.acceptedBy || donation.assignedVolunteer) && (
          <div className="mb-4 p-3 bg-gray-50 rounded-xl border border-gray-100 text-xs space-y-1.5">
            {donation.acceptedBy && (
              <div className="flex items-center text-gray-600">
                <HiUser className="mr-1.5 text-primary-500 shrink-0" />
                <span>Accepted by NGO: <strong className="text-gray-800">{donation.acceptedBy.name || 'NGO Partner'}</strong></span>
              </div>
            )}
            {donation.assignedVolunteer && (
              <div className="flex items-center text-gray-600">
                <HiPhone className="mr-1.5 text-indigo-500 shrink-0" />
                <span>Volunteer: <strong className="text-gray-800">{donation.assignedVolunteer.name}</strong> ({donation.assignedVolunteer.phone || 'No phone'})</span>
              </div>
            )}
          </div>
        )}

        {/* Pickup OTP Box for Donor */}
        {donation.pickupOtp && ['accepted', 'assigned'].includes(donation.status) && (
          <div className="mb-4 p-3.5 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HiKey className="text-emerald-600 text-lg" />
                <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">Pickup OTP</span>
              </div>
              <span className="text-xl font-bold tracking-widest text-emerald-700 font-mono bg-white px-2.5 py-0.5 rounded-lg border border-emerald-200 shadow-xs">
                {donation.pickupOtp}
              </span>
            </div>
            <p className="text-[11px] text-emerald-600 mt-1">
              Give this 6-digit code to the volunteer when they arrive for pickup.
            </p>
          </div>
        )}

        {donation.status === 'picked_up' && (
          <div className="mb-4 p-3 bg-purple-50 border border-purple-200 rounded-xl text-xs text-purple-700 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-purple-500 animate-pulse"></span>
            Food has been picked up and is on its way to the NGO!
          </div>
        )}

        {donation.status === 'delivered' && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-xl text-xs text-green-700 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-green-500"></span>
            Delivered successfully! Thank you for reducing food waste.
          </div>
        )}

        {donation.status === 'pending' && (
          <div className="flex gap-2">
            <button
              onClick={() => onEdit(donation)}
              className="flex-1 py-2 px-4 bg-primary-50 text-primary-600 rounded-xl hover:bg-primary-100 transition-all duration-200 font-medium text-sm cursor-pointer"
            >
              Edit
            </button>
            <button
              onClick={() => onCancel(donation._id)}
              className="flex-1 py-2 px-4 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-all duration-200 font-medium text-sm cursor-pointer"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default DonationCard;
