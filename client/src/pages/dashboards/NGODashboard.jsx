import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../components/layout/DashboardLayout';
import {
  HiInboxIn,
  HiUserGroup,
  HiClipboardCheck,
  HiTrendingUp,
  HiLocationMarker,
  HiKey,
  HiCheckCircle,
  HiUserAdd,
  HiRefresh,
  HiSearch,
  HiFilter,
  HiStar
} from 'react-icons/hi';
import {
  getNearbyDonations,
  getMyAcceptedDonations,
  acceptDonation,
  requestVolunteer,
  getAvailableVolunteers,
  assignVolunteer,
  confirmDelivery,
  rateVolunteer
} from '../../services/ngoService';

const NGODashboard = () => {
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState('available'); // 'available', 'accepted', 'completed'
  const [nearbyDonations, setNearbyDonations] = useState([]);
  const [myDonations, setMyDonations] = useState([]);
  const [availableVolunteers, setAvailableVolunteers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedDonationForAssign, setSelectedDonationForAssign] = useState(null);
  const [selectedVolunteerId, setSelectedVolunteerId] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState(null);

  // Volunteer Rating Modal State
  const [isRateModalOpen, setIsRateModalOpen] = useState(false);
  const [selectedDonationForRate, setSelectedDonationForRate] = useState(null);
  const [ratingScore, setRatingScore] = useState(5);
  const [ratingFeedback, setRatingFeedback] = useState('');

  // Proximity & Location Filtering State
  const [locationScope, setLocationScope] = useState('all'); // 'my_city' | 'all'
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchData();
  }, [locationScope]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const params = {};
      if (locationScope === 'my_city') {
        params.all = 'false';
      } else {
        params.all = 'true';
      }
      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }

      const [nearby, accepted, vols] = await Promise.all([
        getNearbyDonations(params).catch(() => []),
        getMyAcceptedDonations().catch(() => []),
        getAvailableVolunteers().catch(() => [])
      ]);
      setNearbyDonations(Array.isArray(nearby) ? nearby : (nearby?.donations || []));
      setMyDonations(accepted || []);
      setAvailableVolunteers(vols || []);
    } catch (err) {
      console.error('Error loading NGO dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchData();
  };

  const showFeedback = (text, type = 'success') => {
    setFeedbackMessage({ text, type });
    setTimeout(() => setFeedbackMessage(null), 4000);
  };

  const handleAcceptDonation = async (id) => {
    try {
      setActionLoading(true);
      await acceptDonation(id);
      showFeedback('Donation accepted successfully!');
      fetchData();
    } catch (err) {
      showFeedback(err.response?.data?.message || 'Failed to accept donation', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRequestVolunteer = async (id) => {
    try {
      setActionLoading(true);
      await requestVolunteer(id);
      showFeedback('Volunteer requested! Task is now open for volunteers.');
      fetchData();
    } catch (err) {
      showFeedback(err.response?.data?.message || 'Failed to request volunteer', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const openAssignModal = (donation) => {
    setSelectedDonationForAssign(donation);
    setSelectedVolunteerId(availableVolunteers[0]?.user?._id || '');
    setIsAssignModalOpen(true);
  };

  const handleAssignVolunteer = async () => {
    if (!selectedDonationForAssign || !selectedVolunteerId) return;
    try {
      setActionLoading(true);
      await assignVolunteer(selectedDonationForAssign._id, selectedVolunteerId);
      setIsAssignModalOpen(false);
      showFeedback('Volunteer assigned successfully!');
      fetchData();
    } catch (err) {
      showFeedback(err.response?.data?.message || 'Failed to assign volunteer', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmDelivery = async (id) => {
    if (!window.confirm('Are you sure you want to mark this donation as delivered / received?')) return;
    try {
      setActionLoading(true);
      await confirmDelivery(id);
      showFeedback('Donation marked as delivered!');
      fetchData();
    } catch (err) {
      showFeedback(err.response?.data?.message || 'Failed to confirm delivery', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const openRateModal = (donation) => {
    setSelectedDonationForRate(donation);
    setRatingScore(5);
    setRatingFeedback('');
    setIsRateModalOpen(true);
  };

  const handleSubmitRating = async () => {
    if (!selectedDonationForRate) return;
    try {
      setActionLoading(true);
      await rateVolunteer(selectedDonationForRate._id, ratingScore, ratingFeedback);
      setIsRateModalOpen(false);
      showFeedback('Volunteer rated successfully! Thank you.');
      fetchData();
    } catch (err) {
      showFeedback(err.response?.data?.message || 'Failed to submit rating', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const activePickups = myDonations.filter(d => ['accepted', 'assigned', 'picked_up'].includes(d.status));
  const completedPickups = myDonations.filter(d => d.status === 'delivered');

  const stats = [
    { label: 'Available Nearby', value: nearbyDonations.length.toString(), icon: HiInboxIn, color: 'bg-primary-50 text-primary-600' },
    { label: 'Active Deliveries', value: activePickups.length.toString(), icon: HiUserGroup, color: 'bg-accent-300/20 text-accent-600' },
    { label: 'Completed Pickups', value: completedPickups.length.toString(), icon: HiClipboardCheck, color: 'bg-green-50 text-green-600' },
    { label: 'Available Volunteers', value: availableVolunteers.length.toString(), icon: HiTrendingUp, color: 'bg-amber-50 text-amber-600' },
  ];

  const isNgoVerified = user?.verificationStatus === 'approved' || user?.isVerified === true;

  return (
    <DashboardLayout>
      {/* NGO Verification Notice */}
      {!isNgoVerified && (
        <div className="mb-6 bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3 animate-fade-in-up">
          <div className="h-10 w-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0 mt-0.5">
            <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-amber-800" style={{ fontFamily: 'var(--font-sans)' }}>NGO Verification Pending</p>
            <p className="text-sm text-amber-700 mt-0.5">
              Your organization account is currently under review. You can view available donations, but accepting donations requires approval.
            </p>
          </div>
        </div>
      )}

      {/* Feedback Toast */}
      {feedbackMessage && (
        <div
          className={`mb-6 p-4 rounded-2xl border text-sm font-medium flex items-center gap-2 animate-fade-in-up ${
            feedbackMessage.type === 'error'
              ? 'bg-red-50 text-red-700 border-red-200'
              : 'bg-green-50 text-green-700 border-green-200'
          }`}
        >
          <HiCheckCircle size={18} />
          {feedbackMessage.text}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 animate-fade-in-up">
        <div>
          <h1 className="text-2xl font-bold text-gray-800" style={{ fontFamily: 'var(--font-sans)' }}>
            Welcome, {user?.name || user?.organizationName || 'Organization'}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage incoming food donations, volunteer requests, and delivery OTPs
          </p>
        </div>
        <button
          onClick={fetchData}
          disabled={isLoading}
          className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-xl hover:bg-gray-50 transition-all text-sm font-medium cursor-pointer shadow-xs"
        >
          <HiRefresh className={`${isLoading ? 'animate-spin' : ''}`} size={16} />
          Refresh
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className={`bg-white rounded-2xl border border-primary-100 p-5 flex items-center gap-4 hover:shadow-md transition-all animate-fade-in-up animate-stagger-${i + 1}`}
            >
              <div className={`h-12 w-12 rounded-xl flex items-center justify-center shrink-0 ${stat.color}`}>
                <Icon size={22} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-800" style={{ fontFamily: 'var(--font-sans)' }}>{stat.value}</p>
                <p className="text-xs text-gray-500 font-medium">{stat.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6 gap-2">
        <button
          onClick={() => setActiveTab('available')}
          className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'available'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Available Nearby ({nearbyDonations.length})
        </button>
        <button
          onClick={() => setActiveTab('accepted')}
          className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'accepted'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Active Pickups ({activePickups.length})
        </button>
        <button
          onClick={() => setActiveTab('completed')}
          className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'completed'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Delivered / History ({completedPickups.length})
        </button>
      </div>

      {/* Tab 1: Available Donations */}
      {activeTab === 'available' && (
        <div>
          {/* Location & Proximity Filter Bar */}
          <div className="bg-white border border-primary-100 rounded-2xl p-4 mb-6 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
            <form onSubmit={handleSearchSubmit} className="flex-1 flex items-center gap-2 w-full">
              <div className="relative flex-1">
                <HiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter by city, area, pincode, or food type..."
                  className="w-full pl-10 pr-4 py-2 text-xs md:text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:outline-none bg-gray-50/50"
                />
              </div>
              <button
                type="submit"
                className="bg-primary-600 text-white px-4 py-2 rounded-xl text-xs md:text-sm font-semibold hover:bg-primary-700 transition-all cursor-pointer shrink-0"
              >
                Search
              </button>
            </form>

            <div className="flex items-center gap-2 w-full md:w-auto justify-end">
              <span className="text-xs font-semibold text-gray-500 flex items-center gap-1">
                <HiFilter /> Location:
              </span>
              <div className="bg-gray-100 p-1 rounded-xl flex gap-1">
                <button
                  onClick={() => setLocationScope('all')}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    locationScope === 'all'
                      ? 'bg-white text-primary-700 shadow-xs'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  All Locations
                </button>
                <button
                  onClick={() => setLocationScope('my_city')}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    locationScope === 'my_city'
                      ? 'bg-white text-primary-700 shadow-xs'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  📍 My Registered City
                </button>
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="p-12 text-center text-gray-400">Loading donations...</div>
          ) : nearbyDonations.length === 0 ? (
            <div className="bg-white border border-gray-100 rounded-2xl p-12 text-center text-gray-500">
              <p className="font-semibold text-gray-700 text-base mb-1">No pending donations match this location filter.</p>
              <p className="text-xs text-gray-400 mb-4">Try switching to "All Locations" or clearing search to view wider donations.</p>
              {locationScope === 'my_city' && (
                <button
                  onClick={() => setLocationScope('all')}
                  className="bg-primary-50 text-primary-700 px-4 py-2 rounded-xl text-xs font-semibold hover:bg-primary-100 transition-all cursor-pointer"
                >
                  Show All Locations
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {nearbyDonations.map((donation) => (
                <div key={donation._id} className="bg-white border border-primary-100 rounded-2xl p-5 shadow-xs flex flex-col justify-between hover:shadow-md transition-all">
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-bold text-gray-800 text-lg">{donation.foodType}</h3>
                      <span className="bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full text-xs font-semibold uppercase">
                        Pending
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">{donation.description || 'No description provided.'}</p>
                    <div className="space-y-1.5 text-xs text-gray-500 mb-4 bg-gray-50 p-3 rounded-xl border border-gray-100">
                      <div><strong className="text-gray-700">Quantity:</strong> {donation.quantity}</div>
                      <div className="flex items-start gap-1">
                        <HiLocationMarker className="text-primary-500 shrink-0 mt-0.5" />
                        <span><strong>Pickup:</strong> {donation.pickupLocation?.street || ''}, <strong className="text-primary-700">{donation.pickupLocation?.city || 'Local Area'}</strong> {donation.pickupLocation?.zipCode ? `(${donation.pickupLocation.zipCode})` : ''}</span>
                      </div>
                      <div><strong className="text-gray-700">Donor:</strong> {donation.donor?.name || 'Anonymous'} ({donation.donor?.phone || 'No phone'})</div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleAcceptDonation(donation._id)}
                    disabled={actionLoading || !isNgoVerified}
                    className="w-full bg-primary-600 text-white py-2.5 rounded-xl font-medium text-sm hover:bg-primary-700 transition-all disabled:opacity-50 cursor-pointer shadow-xs"
                  >
                    Accept Donation
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Accepted & Active Pickups */}
      {activeTab === 'accepted' && (
        <div>
          {isLoading ? (
            <div className="p-12 text-center text-gray-400">Loading active deliveries...</div>
          ) : activePickups.length === 0 ? (
            <div className="bg-white border border-gray-100 rounded-2xl p-12 text-center text-gray-500">
              No active pickups at the moment. Accept a donation from the Available tab!
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {activePickups.map((donation) => (
                <div key={donation._id} className="bg-white border border-primary-100 rounded-2xl p-6 shadow-xs flex flex-col justify-between hover:shadow-md transition-all">
                  <div>
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-bold text-gray-800 text-lg">{donation.foodType}</h3>
                        <p className="text-xs text-gray-500">Qty: {donation.quantity}</p>
                      </div>
                      <span className="bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1 rounded-full text-xs font-semibold uppercase">
                        {donation.status.replace('_', ' ')}
                      </span>
                    </div>

                    <div className="space-y-2 text-xs text-gray-600 bg-gray-50 p-3.5 rounded-xl mb-4 border border-gray-100">
                      <div><strong>Pickup Location:</strong> {donation.pickupLocation?.street}, <strong className="text-gray-800">{donation.pickupLocation?.city}</strong></div>
                      <div><strong>Donor:</strong> {donation.donor?.name} ({donation.donor?.phone || 'No phone'})</div>
                      <div>
                        <strong>Assigned Volunteer:</strong>{' '}
                        {donation.assignedVolunteer ? (
                          <span className="text-indigo-600 font-semibold">
                            {donation.assignedVolunteer.name} ({donation.assignedVolunteer.phone || 'No phone'})
                          </span>
                        ) : donation.volunteerRequested ? (
                          <span className="text-amber-600 font-semibold">Requested (Waiting for volunteer in pool)</span>
                        ) : (
                          <span className="text-gray-500">None assigned yet</span>
                        )}
                      </div>
                    </div>

                    {/* Delivery OTP Box for NGO */}
                    {donation.deliveryOtp && (
                      <div className="mb-4 p-3.5 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <HiKey className="text-blue-600 text-lg" />
                            <span className="text-xs font-semibold text-blue-900 uppercase tracking-wider">Delivery OTP</span>
                          </div>
                          <span className="text-xl font-bold tracking-widest text-blue-700 font-mono bg-white px-2.5 py-0.5 rounded-lg border border-blue-200 shadow-xs">
                            {donation.deliveryOtp}
                          </span>
                        </div>
                        <p className="text-[11px] text-blue-700 mt-1">
                          Share this OTP with the volunteer when food is delivered at your facility.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
                    {!donation.assignedVolunteer && (
                      <>
                        <button
                          onClick={() => handleRequestVolunteer(donation._id)}
                          disabled={actionLoading}
                          className="flex-1 bg-amber-500 text-white py-2 px-3 rounded-xl text-xs font-semibold hover:bg-amber-600 transition-all cursor-pointer"
                        >
                          Request Volunteer Pool
                        </button>
                        <button
                          onClick={() => openAssignModal(donation)}
                          disabled={actionLoading || availableVolunteers.length === 0}
                          className="flex-1 bg-indigo-50 text-indigo-600 border border-indigo-200 py-2 px-3 rounded-xl text-xs font-semibold hover:bg-indigo-100 transition-all cursor-pointer flex items-center justify-center gap-1"
                        >
                          <HiUserAdd size={14} />
                          Assign Specific
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => handleConfirmDelivery(donation._id)}
                      disabled={actionLoading}
                      className="w-full bg-emerald-600 text-white py-2 px-3 rounded-xl text-xs font-semibold hover:bg-emerald-700 transition-all cursor-pointer"
                    >
                      Confirm Food Received (Direct Complete)
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Completed Pickups & Volunteer Rating */}
      {activeTab === 'completed' && (
        <div>
          {isLoading ? (
            <div className="p-12 text-center text-gray-400">Loading history...</div>
          ) : completedPickups.length === 0 ? (
            <div className="bg-white border border-gray-100 rounded-2xl p-12 text-center text-gray-500">
              No completed donations yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {completedPickups.map((donation) => (
                <div key={donation._id} className="bg-white border border-green-100 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-bold text-gray-800">{donation.foodType}</h3>
                      <span className="bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded-full text-xs font-semibold">
                        Delivered
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mb-1">Qty: {donation.quantity}</p>
                    <p className="text-xs text-gray-600 mb-1">Donor: {donation.donor?.name || 'Donor'}</p>
                    {donation.assignedVolunteer && (
                      <p className="text-xs text-gray-700 font-medium mb-2">Delivered by: <strong>{donation.assignedVolunteer.name}</strong></p>
                    )}
                    {donation.deliveryNotes && (
                      <div className="text-xs italic bg-gray-50 p-2 rounded-lg text-gray-500 mb-3">
                        "{donation.deliveryNotes}"
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-gray-100 mt-2">
                    {/* Volunteer Rating Section */}
                    {donation.assignedVolunteer && (
                      <div className="mb-2">
                        {donation.volunteerRated ? (
                          <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-2.5 text-xs text-amber-800">
                            <div className="flex items-center gap-1 font-semibold text-amber-700 mb-0.5">
                              <HiStar className="text-amber-500" /> Rated {donation.volunteerRating?.score || 5}/5 Stars
                            </div>
                            {donation.volunteerRating?.feedback && (
                              <p className="text-[11px] italic text-amber-700">"{donation.volunteerRating.feedback}"</p>
                            )}
                          </div>
                        ) : (
                          <button
                            onClick={() => openRateModal(donation)}
                            className="w-full py-2 bg-amber-500 text-white rounded-xl text-xs font-semibold hover:bg-amber-600 transition-all flex items-center justify-center gap-1 cursor-pointer shadow-xs"
                          >
                            <HiStar size={15} /> Rate Volunteer Performance
                          </button>
                        )}
                      </div>
                    )}

                    <p className="text-[11px] text-gray-400">
                      Delivered: {donation.deliveredAt ? new Date(donation.deliveredAt).toLocaleDateString() : 'Completed'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Assign Volunteer Modal */}
      {isAssignModalOpen && selectedDonationForAssign && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-gray-100 animate-fade-in-up">
            <h3 className="text-lg font-bold text-gray-800 mb-2" style={{ fontFamily: 'var(--font-sans)' }}>
              Assign Volunteer
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              Select an active volunteer to assign pickup of <strong>{selectedDonationForAssign.foodType}</strong> ({selectedDonationForAssign.quantity}).
            </p>

            <div className="space-y-3 mb-6">
              <label className="block text-xs font-semibold text-gray-700">Available Volunteers</label>
              <select
                value={selectedVolunteerId}
                onChange={(e) => setSelectedVolunteerId(e.target.value)}
                className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none bg-white"
              >
                {availableVolunteers.map((v) => (
                  <option key={v.user?._id} value={v.user?._id}>
                    {v.user?.name} ({v.vehicleType} • {v.availabilityStatus})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setIsAssignModalOpen(false)}
                className="flex-1 py-2.5 px-4 bg-gray-100 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-200 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleAssignVolunteer}
                disabled={actionLoading}
                className="flex-1 py-2.5 px-4 bg-primary-600 text-white rounded-xl text-sm font-semibold hover:bg-primary-700 transition-all cursor-pointer disabled:opacity-50"
              >
                Confirm Assignment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rate Volunteer Modal */}
      {isRateModalOpen && selectedDonationForRate && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-gray-100 animate-fade-in-up">
            <h3 className="text-lg font-bold text-gray-800 mb-1" style={{ fontFamily: 'var(--font-sans)' }}>
              Rate Volunteer Performance
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              Rate volunteer <strong>{selectedDonationForRate.assignedVolunteer?.name}</strong> for delivery of {selectedDonationForRate.foodType}.
            </p>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-2">Rating (1 to 5 Stars)</label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRatingScore(star)}
                      className={`text-3xl transition-transform hover:scale-110 cursor-pointer ${
                        star <= ratingScore ? 'text-amber-400' : 'text-gray-200'
                      }`}
                    >
                      ★
                    </button>
                  ))}
                  <span className="text-sm font-bold text-gray-700 ml-2">{ratingScore} / 5 Stars</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Feedback / Review (Optional)</label>
                <textarea
                  rows={3}
                  value={ratingFeedback}
                  onChange={(e) => setRatingFeedback(e.target.value)}
                  placeholder="e.g. Arrived on time, food packets in perfect condition."
                  className="w-full p-3 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setIsRateModalOpen(false)}
                className="flex-1 py-2.5 px-4 bg-gray-100 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-200 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitRating}
                disabled={actionLoading}
                className="flex-1 py-2.5 px-4 bg-amber-500 text-white rounded-xl text-sm font-semibold hover:bg-amber-600 transition-all cursor-pointer disabled:opacity-50"
              >
                Submit Rating
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default NGODashboard;
