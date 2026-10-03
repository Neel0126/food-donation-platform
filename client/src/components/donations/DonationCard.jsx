import { useState } from 'react';
import {
  HiLocationMarker,
  HiClock,
  HiKey,
  HiUser,
  HiPhone,
  HiChevronDown,
  HiChevronUp,
  HiPencil,
  HiTrash,
  HiExternalLink,
  HiRefresh,
} from 'react-icons/hi';
import StatusBadge from '../ui/StatusBadge';
import DonationLifecycle from '../ui/DonationLifecycle';
import { regeneratePickupOtp } from '../../services/donationService';

/**
 * Redesigned DonationCard
 * Responsive layout: Wide horizontal showcase on desktop, clean card on mobile
 * Includes DonationLifecycle timeline, Pickup OTP box, distance, NGO/Volunteer info, Edit & Cancel
 */
const DonationCard = ({
  donation,
  onEdit,
  onCancel,
  userLocation,
  showFullTimeline = false,
  highlightActive = false,
}) => {
  const [showHistory, setShowHistory] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [revealedPhone, setRevealedPhone] = useState(false);
  const [updatingOtp, setUpdatingOtp] = useState(false);
  const [currentPickupOtp, setCurrentPickupOtp] = useState(donation.pickupOtp);

  const handleRegeneratePickupOtp = async () => {
    if (!window.confirm('Do you want to generate a new Pickup Verification Code? The previous code will be invalidated.')) return;
    try {
      setUpdatingOtp(true);
      const res = await regeneratePickupOtp(donation._id);
      if (res?.pickupOtp) {
        setCurrentPickupOtp(res.pickupOtp);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update Pickup OTP');
    } finally {
      setUpdatingOtp(false);
    }
  };

  const getFallbackFoodImage = (foodType = '') => {
    const text = (foodType || '').toLowerCase();
    if (text.includes('rice') || text.includes('grain') || text.includes('biryani') || text.includes('khichdi')) {
      return 'https://images.unsplash.com/photo-1516684732162-798a0062be99?auto=format&fit=crop&w=600&q=80';
    }
    if (text.includes('thali') || text.includes('roti') || text.includes('chapati') || text.includes('dal') || text.includes('curry') || text.includes('meal')) {
      return 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80';
    }
    if (text.includes('bread') || text.includes('bakery') || text.includes('sandwich') || text.includes('cake') || text.includes('pastry')) {
      return 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=600&q=80';
    }
    if (text.includes('fruit') || text.includes('veg') || text.includes('salad') || text.includes('apple')) {
      return 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?auto=format&fit=crop&w=600&q=80';
    }
    return 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=600&q=80';
  };

  const maskPhone = (phone) => {
    if (!phone) return '';
    const cleaned = String(phone).replace(/\s+/g, '');
    if (cleaned.length <= 4) return '••••';
    const start = cleaned.slice(0, 3);
    const end = cleaned.slice(-2);
    return `${start}••••${end}`;
  };

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

  // Haversine formula to calculate distance in km
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return null;
    const R = 6371; // Earth radius in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c;
    return d.toFixed(1);
  };

  const distance =
    userLocation && donation.location?.coordinates?.length === 2
      ? calculateDistance(
          userLocation.lat,
          userLocation.lng,
          donation.location.coordinates[1],
          donation.location.coordinates[0]
        )
      : null;

  const isPending = donation.status === 'pending';
  const isActive = ['pending', 'accepted', 'assigned', 'scheduled', 'picked_up'].includes(donation.status);

  return (
    <div
      className={`surface-card overflow-hidden transition-all duration-300 ${
        highlightActive
          ? 'border-primary-300 ring-2 ring-primary-100/80 shadow-md'
          : 'hover:border-primary-200'
      }`}
    >
      <div className="flex flex-col lg:flex-row">
        {/* Left / Top Media Section */}
        <div className="lg:w-72 xl:w-80 shrink-0 relative bg-primary-50/60 overflow-hidden min-h-[180px] lg:min-h-full">
          <img
            src={!imageError && donation.imageUrl ? getImageUrl(donation.imageUrl) : getFallbackFoodImage(donation.foodType)}
            alt={donation.foodType}
            onError={() => setImageError(true)}
            className="w-full h-48 lg:h-full object-cover transition-transform duration-500 hover:scale-105"
          />
          {(!donation.imageUrl || imageError) && (
            <div className="absolute bottom-2 left-2 px-2.5 py-0.5 rounded-full bg-black/60 backdrop-blur-xs text-[10px] text-white/95 font-medium flex items-center gap-1">
              <span>🍲</span>
              <span>Food Illustration</span>
            </div>
          )}

          {/* Quick status badge overlay on mobile */}
          <div className="absolute top-3 left-3 lg:hidden">
            <StatusBadge status={donation.status} />
          </div>
        </div>

        {/* Content Section */}
        <div className="flex-1 p-5 sm:p-6 flex flex-col justify-between">
          <div>
            {/* Header info */}
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-3">
                <h3
                  className="text-xl sm:text-2xl font-extrabold text-[#172117] tracking-tight leading-tight"
                  style={{ fontFamily: 'var(--font-sans)' }}
                >
                  {donation.foodType}
                </h3>
                <span className="text-xs font-bold text-primary-800 bg-primary-100 px-3 py-1 rounded-full">
                  {donation.quantity}
                </span>
              </div>

              {/* Status Badge on Desktop */}
              <div className="hidden lg:block">
                <StatusBadge status={donation.status} />
              </div>
            </div>

            {/* Description */}
            {donation.description && (
              <p className="text-xs sm:text-sm text-gray-600 mb-4 line-clamp-2 leading-relaxed">
                {donation.description}
              </p>
            )}

            {/* Metadata Chips */}
            <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-xs text-gray-500 mb-5">
              <div className="flex items-center gap-1.5 font-medium text-gray-700">
                <HiLocationMarker className="text-primary-600 shrink-0" size={16} />
                <span>
                  {donation.pickupLocation?.street ? `${donation.pickupLocation.street}, ` : ''}
                  <strong>{donation.pickupLocation?.city || 'Local area'}</strong>
                  {distance && (
                    <span className="ml-1.5 text-primary-700 font-semibold bg-primary-50 px-2 py-0.5 rounded-md">
                      ({distance} km away)
                    </span>
                  )}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <HiClock className="text-gray-400 shrink-0" size={16} />
                <span>
                  {new Date(donation.createdAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
              </div>

              {donation.expiresAt && isPending && (
                <div className="flex items-center gap-1.5 text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full font-medium text-[11px]">
                  <HiClock className="text-amber-600 shrink-0" size={13} />
                  <span>
                    Pickup window closes: {new Date(donation.expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              )}
            </div>

            {/* Assigned Partner / Volunteer Summary */}
            {(donation.acceptedBy || donation.assignedVolunteer) && (
              <div className="mb-5 p-3.5 rounded-2xl bg-[#faf8f4] border border-[#e8e2d5] text-xs flex flex-wrap gap-4 items-center">
                {donation.acceptedBy && (
                  <div className="flex items-center gap-2">
                    <HiUser className="text-primary-600" size={16} />
                    <span>
                      NGO Partner: <strong className="text-gray-900">{donation.acceptedBy.name}</strong>
                    </span>
                  </div>
                )}
                {donation.assignedVolunteer && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <HiPhone className="text-indigo-600 shrink-0" size={16} />
                      <span>
                        Volunteer: <strong className="text-gray-900">{donation.assignedVolunteer.name}</strong>
                      </span>
                    </div>
                    {donation.assignedVolunteer.phone && (
                      <div className="flex items-center gap-1.5 ml-1">
                        <a
                          href={`tel:${donation.assignedVolunteer.phone}`}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary-700 bg-primary-50 hover:bg-primary-100 border border-primary-200/80 px-2.5 py-0.5 rounded-md transition-colors"
                          title="Call volunteer"
                        >
                          <HiPhone size={11} />
                          <span>
                            {revealedPhone
                              ? donation.assignedVolunteer.phone
                              : maskPhone(donation.assignedVolunteer.phone)}
                          </span>
                        </a>
                        {!revealedPhone && (
                          <button
                            type="button"
                            onClick={() => setRevealedPhone(true)}
                            className="text-[10px] text-gray-500 hover:text-gray-800 underline cursor-pointer"
                            title="Reveal full phone number"
                          >
                            Show
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Pickup OTP Box for Donor */}
            {donation.pickupOtp && ['accepted', 'assigned', 'scheduled'].includes(donation.status) && (
              <div className="mb-5 p-4 bg-gradient-to-r from-emerald-50/90 via-teal-50/60 to-emerald-50/90 border border-emerald-200 rounded-2xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                      <HiKey size={18} />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-emerald-900 uppercase tracking-wider block">
                        Pickup Verification Code
                      </span>
                      <p className="text-[11px] text-emerald-700">
                        Share this 6-digit code with the volunteer when they arrive.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 justify-center sm:justify-end">
                    <span className="inline-block text-2xl font-extrabold tracking-widest text-emerald-800 font-mono bg-white px-4 py-1.5 rounded-xl border border-emerald-300 shadow-2xs">
                      {currentPickupOtp || donation.pickupOtp}
                    </span>
                    <button
                      type="button"
                      onClick={handleRegeneratePickupOtp}
                      disabled={updatingOtp}
                      title="Update / Regenerate Code"
                      className="px-2.5 py-1 text-xs rounded-xl bg-white border border-emerald-300 text-emerald-800 hover:bg-emerald-100 transition-all cursor-pointer font-bold flex items-center gap-1 shadow-2xs"
                    >
                      <HiRefresh size={13} className={updatingOtp ? 'animate-spin' : ''} />
                      <span>Update OTP</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* In-Transit Notice */}
            {donation.status === 'picked_up' && (
              <div className="mb-5 p-3.5 bg-purple-50 border border-purple-200 rounded-2xl text-xs text-purple-800 flex items-center gap-2.5">
                <span className="h-2.5 w-2.5 rounded-full bg-purple-600 animate-pulse shrink-0" />
                <span className="font-semibold">
                  Food has been collected! It is currently in transit to the distribution centre.
                </span>
              </div>
            )}

            {/* Completed Notice */}
            {donation.status === 'delivered' && (
              <div className="mb-5 p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 flex items-center gap-2.5">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-600 shrink-0" />
                <span className="font-semibold">
                  Successfully delivered! Thank you for nourishing our community.
                </span>
              </div>
            )}

            {/* Expired Notice */}
            {donation.status === 'expired' && (
              <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-950 flex flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-rose-600 shrink-0" />
                  <span className="font-bold text-rose-900">
                    Pickup window elapsed — not accepted in time.
                  </span>
                </div>
                <p className="text-[11px] text-rose-700 leading-relaxed pl-4.5">
                  For community food safety, do not consume or distribute cooked meals past their safe window. Consider giving safe leftovers to local animal shelters (Gaushalas) or organic composting.
                </p>
              </div>
            )}

            {/* Visual Lifecycle Progress Timeline */}
            <div className="pt-2 pb-4">
              <DonationLifecycle status={donation.status} />
            </div>
          </div>

          {/* Bottom Actions & Timeline Toggle */}
          <div className="pt-4 border-t border-[#e8e2d5]/80 flex flex-wrap items-center justify-between gap-3">
            {/* Timeline history toggle */}
            {donation.timeline && donation.timeline.length > 0 ? (
              <button
                type="button"
                onClick={() => setShowHistory(!showHistory)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-primary-700 transition-colors cursor-pointer"
              >
                {showHistory ? <HiChevronUp size={16} /> : <HiChevronDown size={16} />}
                <span>{showHistory ? 'Hide Event Log' : `View Activity Log (${donation.timeline.length})`}</span>
              </button>
            ) : (
              <div />
            )}

            {/* Pending actions (Edit / Cancel) */}
            {isPending && (
              <div className="flex items-center gap-2">
                {onEdit && (
                  <button
                    type="button"
                    onClick={() => onEdit(donation)}
                    className="btn-secondary text-xs px-3.5 py-1.5"
                  >
                    <HiPencil size={14} /> Edit
                  </button>
                )}
                {onCancel && (
                  <button
                    type="button"
                    onClick={() => onCancel(donation._id)}
                    className="px-3 py-1.5 rounded-full text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                  >
                    <HiTrash size={14} className="inline mr-1" /> Cancel
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Collapsible Timeline History Log */}
          {showHistory && donation.timeline && (
            <div className="mt-4 pt-3 border-t border-gray-100 space-y-2 animate-fade-in">
              <h5 className="text-[11px] font-bold text-gray-600 uppercase tracking-wider">
                Status History Log
              </h5>
              <div className="space-y-2">
                {donation.timeline.map((event, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl bg-gray-50 text-xs flex justify-between items-start border border-gray-100"
                  >
                    <div>
                      <p className="font-bold text-gray-800 capitalize">{event.status.replace(/_/g, ' ')}</p>
                      <p className="text-gray-500 text-[11px]">{event.description}</p>
                    </div>
                    <span className="text-[10px] text-gray-400 font-mono">
                      {new Date(event.time).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DonationCard;
