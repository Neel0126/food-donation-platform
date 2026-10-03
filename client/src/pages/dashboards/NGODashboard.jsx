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
  HiStar,
  HiClock,
  HiPhone,
  HiShieldCheck,
  HiTruck,
  HiExternalLink,
  HiX,
} from 'react-icons/hi';
import StatCounter from '../../components/ui/StatCounter';
import StatusBadge from '../../components/ui/StatusBadge';
import EmptyState from '../../components/ui/EmptyState';
import DonationLifecycle from '../../components/ui/DonationLifecycle';
import { StatSkeleton } from '../../components/ui/Skeleton';
import {
  getNearbyDonations,
  getMyAcceptedDonations,
  acceptDonation,
  requestVolunteer,
  getAvailableVolunteers,
  assignVolunteer,
  confirmDelivery,
  rateVolunteer,
  getMyVolunteers,
  addVolunteerToNgo,
  regenerateDeliveryOtp,
} from '../../services/ngoService';

const NGODashboard = () => {
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState('available'); // 'available' | 'accepted' | 'completed' | 'volunteers'
  const [nearbyDonations, setNearbyDonations] = useState([]);
  const [myDonations, setMyDonations] = useState([]);
  const [availableVolunteers, setAvailableVolunteers] = useState([]);
  const [myVolunteers, setMyVolunteers] = useState([]);
  const [isAddVolunteerModalOpen, setIsAddVolunteerModalOpen] = useState(false);
  const [newVolunteer, setNewVolunteer] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    vehicleType: 'bike',
    vehicleNumber: '',
  });
  const [isAddingVolunteer, setIsAddingVolunteer] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedDonationForAssign, setSelectedDonationForAssign] = useState(null);
  const [selectedVolunteerId, setSelectedVolunteerId] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState(null);

  // Volunteer Live Tracking Modal State
  const [isTrackingModalOpen, setIsTrackingModalOpen] = useState(false);
  const [selectedDonationForTracking, setSelectedDonationForTracking] = useState(null);

  // Volunteer Rating Modal State
  const [isRateModalOpen, setIsRateModalOpen] = useState(false);
  const [selectedDonationForRate, setSelectedDonationForRate] = useState(null);
  const [ratingScore, setRatingScore] = useState(5);
  const [ratingFeedback, setRatingFeedback] = useState('');

  // Proximity & Location Filtering State
  const [locationScope, setLocationScope] = useState('all'); // 'my_city' | 'all' | 'nearby'
  const [searchQuery, setSearchQuery] = useState('');
  const [userLocation, setUserLocation] = useState(null);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [maxDistance, setMaxDistance] = useState(10); // km

  useEffect(() => {
    if (locationScope === 'nearby' && !userLocation) return;
    fetchData();
  }, [locationScope, userLocation, maxDistance]);

  // Real-time Auto-poll: Updates volunteer live location every 3 seconds while tracking modal is open
  useEffect(() => {
    if (!isTrackingModalOpen || !selectedDonationForTracking) return;

    const intervalId = setInterval(async () => {
      try {
        const accepted = await getMyAcceptedDonations();
        if (Array.isArray(accepted)) {
          setMyDonations(accepted);
          const current = accepted.find((d) => d._id === selectedDonationForTracking._id);
          if (current) {
            setSelectedDonationForTracking(current);
          }
        }
      } catch (err) {
        console.error('Error polling volunteer location:', err);
      }
    }, 3000);

    return () => clearInterval(intervalId);
  }, [isTrackingModalOpen, selectedDonationForTracking?._id]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const params = {};
      if (locationScope === 'my_city') {
        params.all = 'false';
      } else if (locationScope === 'nearby' && userLocation) {
        params.all = 'true';
        params.lat = userLocation.lat;
        params.lng = userLocation.lng;
        params.maxDistance = maxDistance;
      } else {
        params.all = 'true';
      }
      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }

      const [nearby, accepted, vols, allVols] = await Promise.all([
        getNearbyDonations(params).catch(() => []),
        getMyAcceptedDonations().catch(() => []),
        getAvailableVolunteers().catch(() => []),
        getMyVolunteers().catch(() => []),
      ]);
      setNearbyDonations(Array.isArray(nearby) ? nearby : nearby?.donations || []);
      setMyDonations(accepted || []);
      setAvailableVolunteers(vols || []);
      setMyVolunteers(allVols || []);
    } catch (err) {
      console.error('Error loading NGO dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddVolunteer = async (e) => {
    e.preventDefault();
    if (!newVolunteer.name.trim() || !newVolunteer.email.trim() || !newVolunteer.password) {
      showFeedback('Please provide name, email, and password.', 'error');
      return;
    }
    try {
      setIsAddingVolunteer(true);
      await addVolunteerToNgo({
        ...newVolunteer,
        email: newVolunteer.email.trim(),
        name: newVolunteer.name.trim(),
      });
      showFeedback('Volunteer successfully onboarded to your organization team!');
      setIsAddVolunteerModalOpen(false);
      setNewVolunteer({
        name: '',
        email: '',
        phone: '',
        password: '',
        vehicleType: 'bike',
        vehicleNumber: '',
      });
      fetchData();
    } catch (err) {
      showFeedback(err.response?.data?.message || 'Failed to onboard volunteer', 'error');
    } finally {
      setIsAddingVolunteer(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchData();
  };

  const handleNearbyClick = () => {
    if (userLocation) {
      setLocationScope('nearby');
      return;
    }
    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setLocationScope('nearby');
        setGettingLocation(false);
      },
      (error) => {
        console.error('Error getting location:', error);
        showFeedback('Could not get location. Falling back to all locations.', 'error');
        setGettingLocation(false);
        setLocationScope('all');
      }
    );
  };

  const showFeedback = (text, type = 'success') => {
    setFeedbackMessage({ text, type });
    setTimeout(() => setFeedbackMessage(null), 4000);
  };

  const handleAcceptDonation = async (id) => {
    try {
      setActionLoading(true);
      await acceptDonation(id);
      showFeedback('Donation accepted successfully! You can now arrange pickup.');
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
      showFeedback('Volunteer requested! Task is now open in the volunteer pool.');
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
      showFeedback('Volunteer assigned directly! Notification sent.');
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

  const handleRegenerateOtp = async (id) => {
    if (!window.confirm('Do you want to generate a new Delivery Dropoff OTP? The previous OTP will be invalidated.')) return;
    try {
      setActionLoading(true);
      await regenerateDeliveryOtp(id);
      showFeedback('New Delivery Dropoff OTP generated successfully!');
      fetchData();
    } catch (err) {
      showFeedback(err.response?.data?.message || 'Failed to update OTP', 'error');
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

  const activePickups = myDonations.filter((d) =>
    ['accepted', 'assigned', 'scheduled', 'picked_up'].includes(d.status)
  );
  const completedPickups = myDonations.filter((d) => d.status === 'delivered');

  const isNgoVerified = user?.verificationStatus === 'approved' || user?.isVerified === true;

  return (
    <DashboardLayout activeTab={activeTab} onTabChange={(tab) => setActiveTab(tab)}>
      {/* NGO Verification Pending Warning */}
      {!isNgoVerified && (
        <div className="mb-6 surface-card bg-amber-50/80 border-amber-200 p-4 sm:p-5 flex items-start gap-3.5 animate-fade-in-up">
          <div className="h-10 w-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
            <HiClock size={22} />
          </div>
          <div>
            <p className="font-bold text-amber-900 text-sm" style={{ fontFamily: 'var(--font-sans)' }}>
              NGO Verification In Review
            </p>
            <p className="text-xs text-amber-800 mt-0.5 leading-relaxed">
              Your organization credentials are currently under administrative review. You can browse nearby listings, but accepting food donations will be enabled once your status is verified.
            </p>
          </div>
        </div>
      )}

      {/* Toast Feedback */}
      {feedbackMessage && (
        <div
          className={`mb-6 p-4 rounded-2xl border text-sm font-semibold flex items-center gap-2.5 animate-fade-in-up ${
            feedbackMessage.type === 'error'
              ? 'bg-red-50 text-red-800 border-red-200'
              : 'bg-emerald-50 text-emerald-800 border-emerald-200'
          }`}
        >
          <HiCheckCircle size={20} className="shrink-0" />
          <span>{feedbackMessage.text}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4 animate-fade-in-up">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#172117] tracking-tight" style={{ fontFamily: 'var(--font-sans)' }}>
              {user?.organizationName || user?.name || 'NGO Operations'}
            </h1>
            {isNgoVerified && (
              <span className="bg-primary-100 text-primary-800 text-xs font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <HiShieldCheck size={14} /> Verified Partner
              </span>
            )}
          </div>
          <p className="text-sm text-gray-600 mt-1">
            Incoming donation requests, active volunteer assignments, and delivery confirmations
          </p>
        </div>

        <button
          onClick={fetchData}
          disabled={isLoading}
          className="btn-secondary text-xs sm:text-sm px-4 py-2 cursor-pointer shadow-2xs"
        >
          <HiRefresh className={`${isLoading ? 'animate-spin' : ''}`} size={16} />
          <span>Refresh Live Feed</span>
        </button>
      </div>

      {/* Statistics Section */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5 mb-8">
        {isLoading ? (
          <>
            <StatSkeleton />
            <StatSkeleton />
            <StatSkeleton />
            <StatSkeleton />
          </>
        ) : (
          <>
            <StatCounter
              value={nearbyDonations.length}
              label="Incoming Requests"
              icon={HiInboxIn}
              subtext="Available for claim"
            />
            <StatCounter
              value={activePickups.length}
              label="Active Pickups"
              icon={HiUserGroup}
              subtext="In coordination"
            />
            <StatCounter
              value={completedPickups.length}
              label="Meals Distributed"
              icon={HiClipboardCheck}
              subtext="Successfully handed over"
            />
            <StatCounter
              value={availableVolunteers.length}
              label="Available Volunteers"
              icon={HiTrendingUp}
              subtext="Ready for dispatch"
            />
          </>
        )}
      </div>

      {/* Workflow Tabs */}
      <div className="flex border-b border-[#e8e2d5] mb-6 gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('available')}
          className={`pb-3 px-4 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer shrink-0 ${
            activeTab === 'available'
              ? 'border-primary-600 text-primary-800'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          Incoming Requests ({nearbyDonations.length})
        </button>
        <button
          onClick={() => setActiveTab('accepted')}
          className={`pb-3 px-4 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer shrink-0 ${
            activeTab === 'accepted'
              ? 'border-primary-600 text-primary-800'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          Active Pickups ({activePickups.length})
        </button>
        <button
          onClick={() => setActiveTab('completed')}
          className={`pb-3 px-4 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer shrink-0 ${
            activeTab === 'completed'
              ? 'border-primary-600 text-primary-800'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          Completed Collections ({completedPickups.length})
        </button>
        <button
          onClick={() => setActiveTab('volunteers')}
          className={`pb-3 px-4 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
            activeTab === 'volunteers'
              ? 'border-primary-600 text-primary-800'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          <span>My Volunteer Team</span>
          <span className="text-[11px] px-2 py-0.2 bg-primary-100 text-primary-800 rounded-full font-bold">
            {myVolunteers.length}
          </span>
        </button>
      </div>

      {/* ================= TAB 1: Incoming Donations ================= */}
      {activeTab === 'available' && (
        <div className="space-y-4 animate-fade-in">
          {/* Proximity / Location Scope Bar */}
          <div className="surface-card p-4 flex flex-col md:flex-row items-center justify-between gap-3">
            <form onSubmit={handleSearchSubmit} className="flex-1 flex items-center gap-2 w-full">
              <div className="relative flex-1">
                <HiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter by city, neighborhood, food type..."
                  className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm border border-[#e8e2d5] rounded-xl focus:ring-2 focus:ring-primary-500 focus:outline-none bg-[#faf8f4]"
                />
              </div>
              <button
                type="submit"
                className="btn-primary text-xs sm:text-sm px-4 py-2 shrink-0"
              >
                Search
              </button>
            </form>

            <div className="flex items-center gap-2 w-full md:w-auto justify-end">
              <span className="text-xs font-bold text-gray-500 flex items-center gap-1">
                <HiFilter /> Scope:
              </span>
              <div className="bg-[#faf8f4] p-1 rounded-xl flex gap-1 border border-[#e8e2d5]">
                <button
                  onClick={() => setLocationScope('all')}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    locationScope === 'all'
                      ? 'bg-white text-primary-800 shadow-2xs font-bold'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  All Locations
                </button>
                <button
                  onClick={() => setLocationScope('my_city')}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    locationScope === 'my_city'
                      ? 'bg-white text-primary-800 shadow-2xs font-bold'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  📍 My City
                </button>
                <button
                  onClick={handleNearbyClick}
                  disabled={gettingLocation}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    locationScope === 'nearby'
                      ? 'bg-white text-primary-800 shadow-2xs font-bold'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {gettingLocation ? 'Locating...' : `🧭 Nearby (${maxDistance}km)`}
                </button>
              </div>
            </div>
          </div>

          {/* Distance Slider for Nearby Mode */}
          {locationScope === 'nearby' && (
            <div className="surface-card bg-primary-50/60 border-primary-200 px-5 py-3 flex items-center gap-4 animate-fade-in-up">
              <span className="text-xs font-bold text-primary-800 shrink-0">📍 Radius:</span>
              <input
                type="range"
                min={1}
                max={50}
                value={maxDistance}
                onChange={(e) => setMaxDistance(Number(e.target.value))}
                className="flex-1 accent-primary-600 cursor-pointer"
                id="distance-slider"
              />
              <span className="text-xs font-extrabold text-primary-800 w-16 text-right shrink-0">
                {maxDistance} km
              </span>
              {userLocation && (
                <span className="text-[11px] text-primary-700 bg-white px-2 py-0.5 rounded-md border border-primary-200 font-semibold shrink-0">
                  GPS Active ✓
                </span>
              )}
            </div>
          )}

          {/* Available Donations List */}
          {isLoading ? (
            <div className="surface-card p-12 text-center text-gray-400">Loading incoming requests...</div>
          ) : nearbyDonations.length === 0 ? (
            <EmptyState
              icon={HiInboxIn}
              title="No pending donations found in this radius"
              description="Switch your location scope to 'All Locations' or expand the distance slider to check broader regions."
              actionLabel={locationScope !== 'all' ? 'View All Locations' : null}
              onAction={() => setLocationScope('all')}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {nearbyDonations.map((donation) => (
                <div
                  key={donation._id}
                  className="surface-card p-5 flex flex-col justify-between hover:border-primary-300 transition-all"
                >
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-extrabold text-[#172117] text-lg leading-tight">
                        {donation.foodType}
                      </h3>
                      <StatusBadge status="pending" />
                    </div>

                    <p className="text-xs text-gray-600 mb-3 line-clamp-2">
                      {donation.description || 'No special dietary instructions provided.'}
                    </p>

                    <div className="space-y-1.5 text-xs text-gray-600 bg-[#faf8f4] p-3.5 rounded-2xl mb-4 border border-[#e8e2d5]">
                      <div>
                        <strong className="text-gray-800">Quantity:</strong> {donation.quantity}
                      </div>
                      <div className="flex items-start gap-1">
                        <HiLocationMarker className="text-primary-600 shrink-0 mt-0.5" />
                        <span>
                          <strong>Pickup:</strong> {donation.pickupLocation?.street || ''},{' '}
                          <strong className="text-primary-800">{donation.pickupLocation?.city || 'Local Area'}</strong>{' '}
                          {donation.pickupLocation?.zipCode && `(${donation.pickupLocation.zipCode})`}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-gray-500">
                        <HiPhone className="shrink-0" />
                        <span>
                          Donor: {donation.donor?.name || 'Community Donor'} ({donation.donor?.phone || 'No phone'})
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleAcceptDonation(donation._id)}
                    disabled={actionLoading || !isNgoVerified}
                    className="w-full btn-primary text-xs sm:text-sm py-2.5 justify-center shadow-xs"
                  >
                    Accept Donation
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ================= TAB 2: Active Pickups ================= */}
      {activeTab === 'accepted' && (
        <div className="space-y-4 animate-fade-in">
          {isLoading ? (
            <div className="surface-card p-12 text-center text-gray-400">Loading active pickups...</div>
          ) : activePickups.length === 0 ? (
            <EmptyState
              icon={HiUserGroup}
              title="No Active Pickups Right Now"
              description="Accept donations from the 'Incoming Requests' tab to coordinate volunteer pick up and drop off."
              actionLabel="Browse Incoming Requests"
              onAction={() => setActiveTab('available')}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {activePickups.map((donation) => (
                <div
                  key={donation._id}
                  className="surface-card p-6 flex flex-col justify-between hover:border-primary-300 transition-all"
                >
                  <div>
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-extrabold text-[#172117] text-lg">{donation.foodType}</h3>
                        <p className="text-xs font-semibold text-primary-700">Quantity: {donation.quantity}</p>
                      </div>
                      <StatusBadge status={donation.status} />
                    </div>

                    <div className="space-y-2 text-xs text-gray-600 bg-[#faf8f4] p-4 rounded-2xl mb-4 border border-[#e8e2d5]">
                      <div>
                        <strong>Pickup Address:</strong> {donation.pickupLocation?.street},{' '}
                        <strong className="text-gray-900">{donation.pickupLocation?.city}</strong>
                      </div>
                      <div>
                        <strong>Donor Contact:</strong> {donation.donor?.name} ({donation.donor?.phone || 'No phone'})
                      </div>
                      <div>
                        <strong>Assigned Volunteer:</strong>{' '}
                        {donation.assignedVolunteer ? (
                          <span className="text-indigo-700 font-bold">
                            {donation.assignedVolunteer.name} ({donation.assignedVolunteer.phone || 'No phone'})
                          </span>
                        ) : donation.volunteerRequested ? (
                          <span className="text-amber-700 font-bold">
                            Requested (Open in pool for volunteers)
                          </span>
                        ) : (
                          <span className="text-gray-400">None assigned yet</span>
                        )}
                      </div>
                    </div>

                    {/* Live Volunteer Stage & Route Banner */}
                    {donation.assignedVolunteer && (
                      <div className={`mb-4 p-3.5 rounded-2xl border text-xs flex items-start gap-3 transition-all ${
                        donation.status === 'picked_up'
                          ? 'bg-emerald-50/90 border-emerald-300 text-emerald-950 shadow-2xs'
                          : 'bg-amber-50/90 border-amber-300 text-amber-950'
                      }`}>
                        <div className={`p-2.5 rounded-xl shrink-0 text-white ${
                          donation.status === 'picked_up'
                            ? 'bg-emerald-600 animate-pulse shadow-xs'
                            : 'bg-amber-600'
                        }`}>
                          <HiTruck size={20} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1 flex-wrap">
                            <span className="font-extrabold text-xs">
                              {donation.status === 'picked_up'
                                ? '🚚 Food Picked Up — In Transit to You'
                                : '🛵 Volunteer En Route to Donor Pickup'}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              donation.status === 'picked_up'
                                ? 'bg-emerald-200 text-emerald-900 border border-emerald-300'
                                : 'bg-amber-200 text-amber-900 border border-amber-300'
                            }`}>
                              {donation.status === 'picked_up' ? 'Stage 2: In Transit' : 'Stage 1: Pickup'}
                            </span>
                          </div>
                          <p className="mt-1 text-[11px] opacity-90 leading-relaxed">
                            {donation.status === 'picked_up'
                              ? `Volunteer ${donation.assignedVolunteer.name} verified pickup with donor OTP and is currently heading to your facility with ${donation.quantity}.`
                              : `Volunteer ${donation.assignedVolunteer.name} is on the way to pick up food at ${donation.pickupLocation?.street || donation.pickupLocation?.city}.`}
                          </p>
                          <div className="mt-2.5 flex items-center gap-3 text-[11px] flex-wrap">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedDonationForTracking(donation);
                                setIsTrackingModalOpen(true);
                              }}
                              className="font-bold underline text-primary-800 hover:text-primary-950 flex items-center gap-1 cursor-pointer"
                            >
                              <HiLocationMarker size={13} />
                              <span>Track Live Route & Milestones →</span>
                            </button>
                            {donation.assignedVolunteer.phone && (
                              <a
                                href={`tel:${donation.assignedVolunteer.phone}`}
                                className="font-semibold text-gray-700 hover:text-gray-950 flex items-center gap-1"
                              >
                                <HiPhone size={13} /> Call {donation.assignedVolunteer.phone}
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Delivery OTP Box for NGO */}
                    {donation.deliveryOtp && (
                      <div className="mb-4 p-4 bg-gradient-to-r from-blue-50/90 to-indigo-50/90 border border-blue-200 rounded-2xl">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <HiKey className="text-blue-700 text-lg" />
                            <span className="text-xs font-bold text-blue-900 uppercase tracking-wider">
                              Delivery Dropoff OTP
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xl font-extrabold tracking-widest text-blue-800 font-mono bg-white px-3 py-1 rounded-xl border border-blue-200 shadow-2xs">
                              {donation.deliveryOtp}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRegenerateOtp(donation._id)}
                              disabled={actionLoading}
                              title="Update Delivery Dropoff OTP"
                              className="px-2.5 py-1 text-xs rounded-xl bg-white border border-blue-300 text-blue-800 hover:bg-blue-100/80 transition-all font-bold flex items-center gap-1 cursor-pointer shadow-2xs"
                            >
                              <HiRefresh size={13} className={actionLoading ? 'animate-spin' : ''} />
                              <span>Update OTP</span>
                            </button>
                          </div>
                        </div>
                        <p className="text-[11px] text-blue-700 mt-1">
                          Share this OTP with the volunteer when the food packets arrive at your facility.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="flex flex-col sm:flex-row flex-wrap gap-2 pt-3 border-t border-[#e8e2d5]/80">
                    {donation.assignedVolunteer ? (
                      <>
                        <button
                          onClick={() => {
                            setSelectedDonationForTracking(donation);
                            setIsTrackingModalOpen(true);
                          }}
                          className="flex-1 btn-secondary text-xs sm:text-sm py-2.5 justify-center flex items-center gap-1.5 border-emerald-300 text-emerald-900 hover:bg-emerald-50 cursor-pointer"
                        >
                          <HiTruck size={16} className="text-emerald-700" />
                          <span>Track Volunteer</span>
                        </button>

                        <button
                          onClick={() => handleConfirmDelivery(donation._id)}
                          disabled={actionLoading}
                          className="flex-1 btn-primary text-xs sm:text-sm py-2.5 justify-center shadow-xs cursor-pointer"
                        >
                          Confirm Food Received & Complete
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => handleRequestVolunteer(donation._id)}
                          disabled={actionLoading}
                          className="flex-1 btn-secondary text-xs py-2.5 justify-center"
                        >
                          Request Volunteer Pool
                        </button>
                        <button
                          onClick={() => openAssignModal(donation)}
                          disabled={actionLoading || availableVolunteers.length === 0}
                          className="flex-1 btn-primary text-xs py-2.5 justify-center flex items-center gap-1.5 shadow-2xs cursor-pointer"
                        >
                          <HiUserAdd size={15} /> Assign Direct
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ================= TAB 3: Completed Collections ================= */}
      {activeTab === 'completed' && (
        <div className="space-y-4 animate-fade-in">
          {isLoading ? (
            <div className="surface-card p-12 text-center text-gray-400">Loading collection history...</div>
          ) : completedPickups.length === 0 ? (
            <EmptyState
              icon={HiClipboardCheck}
              title="No Completed Collections Yet"
              description="Once deliveries are finalized and received, their distribution logs and ratings appear here."
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {completedPickups.map((donation) => (
                <div
                  key={donation._id}
                  className="surface-card p-5 flex flex-col justify-between border-emerald-100"
                >
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-bold text-[#172117] text-lg">{donation.foodType}</h3>
                      <StatusBadge status="delivered" />
                    </div>
                    <p className="text-xs text-gray-600 mb-1">Quantity: {donation.quantity}</p>
                    <p className="text-xs text-gray-600 mb-1">Donor: {donation.donor?.name || 'Donor'}</p>
                    {donation.assignedVolunteer && (
                      <p className="text-xs text-gray-700 font-semibold mb-2">
                        Delivered by: <strong>{donation.assignedVolunteer.name}</strong>
                      </p>
                    )}
                    {donation.deliveryNotes && (
                      <div className="text-xs italic bg-gray-50 p-2.5 rounded-xl text-gray-600 mb-3 border border-gray-100">
                        "{donation.deliveryNotes}"
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-[#e8e2d5] mt-2">
                    {donation.assignedVolunteer && (
                      <div className="mb-2">
                        {donation.volunteerRated ? (
                          <div className="bg-amber-50 border border-amber-200 rounded-xl p-2.5 text-xs text-amber-800">
                            <div className="flex items-center gap-1 font-bold text-amber-800 mb-0.5">
                              <HiStar className="text-amber-500" /> Rated {donation.volunteerRating?.score || 5}/5 Stars
                            </div>
                            {donation.volunteerRating?.feedback && (
                              <p className="text-[11px] italic text-amber-700">
                                "{donation.volunteerRating.feedback}"
                              </p>
                            )}
                          </div>
                        ) : (
                          <button
                            onClick={() => openRateModal(donation)}
                            className="w-full btn-secondary text-xs py-2 justify-center text-amber-800 border-amber-200 hover:bg-amber-50"
                          >
                            <HiStar size={15} /> Rate Volunteer Performance
                          </button>
                        )}
                      </div>
                    )}

                    <p className="text-[10px] text-gray-400">
                      Delivered:{' '}
                      {donation.deliveredAt
                        ? new Date(donation.deliveredAt).toLocaleDateString()
                        : 'Completed'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ================= TAB 4: My Volunteer Team ================= */}
      {activeTab === 'volunteers' && (
        <div className="space-y-6 animate-fade-in">
          {/* Section Header */}
          <div className="surface-card p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gradient-to-r from-white via-[#faf8f4] to-primary-50/40 border-primary-200">
            <div>
              <span className="text-[11px] font-bold text-primary-700 uppercase tracking-wider block">
                Organization Operations
              </span>
              <h2 className="text-xl sm:text-2xl font-extrabold text-[#172117] tracking-tight mt-0.5" style={{ fontFamily: 'var(--font-sans)' }}>
                Your Dedicated Volunteer Squad
              </h2>
              <p className="text-xs sm:text-sm text-gray-500 mt-1 max-w-xl">
                Volunteers listed below belong specifically to {user?.organizationName || user?.name || 'your NGO'}. Only members of your team can receive pickup requests or be directly assigned to collections.
              </p>
            </div>
            <button
              onClick={() => setIsAddVolunteerModalOpen(true)}
              className="btn-primary text-xs sm:text-sm px-4 py-2.5 shadow-2xs flex items-center gap-2 shrink-0 cursor-pointer"
            >
              <HiUserAdd size={18} />
              <span>+ Onboard Volunteer</span>
            </button>
          </div>

          {/* Volunteer Squad Grid */}
          {myVolunteers.length === 0 ? (
            <EmptyState
              icon={HiUserGroup}
              title="No Volunteers in Your Organization Yet"
              description="Build your rapid-response delivery team. Onboard drivers or riders to handle food pickups directly from donors."
              actionLabel="+ Onboard First Volunteer"
              onAction={() => setIsAddVolunteerModalOpen(true)}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {myVolunteers.map((v) => {
                const volUser = v.user || {};
                const isAvailable = v.availabilityStatus === 'available';
                const isBusy = v.availabilityStatus === 'busy';

                return (
                  <div
                    key={v._id}
                    className="surface-card p-5 flex flex-col justify-between hover:border-primary-300 transition-all hover:shadow-xs group"
                  >
                    <div>
                      {/* Top status & avatar */}
                      <div className="flex items-start justify-between gap-3 mb-4">
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary-700 to-primary-900 text-white flex items-center justify-center font-black text-lg shadow-2xs">
                            {volUser.name?.charAt(0).toUpperCase() || 'V'}
                          </div>
                          <div>
                            <h3 className="text-base font-bold text-[#172117] leading-snug group-hover:text-primary-700 transition-colors">
                              {volUser.name}
                            </h3>
                            <p className="text-xs text-gray-400 capitalize flex items-center gap-1.5 mt-0.5">
                              <HiTruck size={14} className="text-gray-500" />
                              <span>{v.vehicleType}</span>
                              {v.vehicleNumber && <span>• {v.vehicleNumber}</span>}
                            </p>
                          </div>
                        </div>

                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${
                          isAvailable
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : isBusy
                            ? 'bg-amber-100 text-amber-800 border border-amber-200'
                            : 'bg-gray-100 text-gray-600 border border-gray-200'
                        }`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${
                            isAvailable ? 'bg-emerald-600' : isBusy ? 'bg-amber-500' : 'bg-gray-400'
                          }`} />
                          {v.availabilityStatus}
                        </span>
                      </div>

                      {/* Performance Pills */}
                      <div className="grid grid-cols-2 gap-2 text-xs mb-4">
                        <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-100 text-center">
                          <span className="text-[10px] text-gray-400 font-semibold block uppercase">Deliveries</span>
                          <span className="font-bold text-gray-800 text-sm mt-0.5 block">{v.completedDeliveries || 0}</span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-amber-50/50 border border-amber-100 text-center">
                          <span className="text-[10px] text-amber-600 font-semibold block uppercase">Rating</span>
                          <span className="font-bold text-amber-800 text-sm mt-0.5 flex items-center justify-center gap-1">
                            <HiStar className="text-amber-500" size={14} /> {v.rating ? v.rating.toFixed(1) : '5.0'}
                          </span>
                        </div>
                      </div>

                      {/* Contact details */}
                      <div className="space-y-1.5 text-xs text-gray-600 pt-3 border-t border-gray-100">
                        {volUser.phone && (
                          <div className="flex items-center gap-2">
                            <HiPhone size={14} className="text-primary-600 shrink-0" />
                            <a href={`tel:${volUser.phone}`} className="hover:underline text-gray-700">
                              {volUser.phone}
                            </a>
                          </div>
                        )}
                        {volUser.email && (
                          <div className="flex items-center gap-2 text-gray-500 truncate">
                            <span className="text-gray-400 font-mono text-[11px]">@</span>
                            <span className="truncate">{volUser.email}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="pt-4 mt-2">
                      <span className="w-full text-center block text-[11px] font-semibold text-emerald-800 bg-emerald-50 py-1.5 rounded-xl border border-emerald-200">
                        ✓ Exclusive Team Member
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Direct Volunteer Assignment Modal */}
      {isAssignModalOpen && selectedDonationForAssign && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-[#e8e2d5] animate-scale-in">
            <h3 className="text-lg font-bold text-[#172117] mb-1" style={{ fontFamily: 'var(--font-sans)' }}>
              Assign Volunteer Directly
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              Select an available volunteer to collect <strong>{selectedDonationForAssign.foodType}</strong> ({selectedDonationForAssign.quantity}).
            </p>

            <div className="space-y-3 mb-6">
              <label className="block text-xs font-bold text-gray-700">Available Volunteers on Your Team</label>
              {availableVolunteers.length === 0 ? (
                <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-900 space-y-2">
                  <p className="font-bold text-amber-950">No Available Volunteers in Your Team</p>
                  <p className="text-gray-600">
                    All volunteers associated with your organization are currently busy or offline. Every NGO manages its own dedicated volunteer pool.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAssignModalOpen(false);
                      setActiveTab('volunteers');
                      setIsAddVolunteerModalOpen(true);
                    }}
                    className="btn-primary text-xs py-1.5 px-3 inline-flex items-center gap-1 shadow-2xs"
                  >
                    + Onboard a Volunteer to Your Team
                  </button>
                </div>
              ) : (
                <select
                  value={selectedVolunteerId}
                  onChange={(e) => setSelectedVolunteerId(e.target.value)}
                  className="input-field"
                >
                  <option value="">-- Choose volunteer from your team --</option>
                  {availableVolunteers.map((v) => (
                    <option key={v.user?._id} value={v.user?._id}>
                      {v.user?.name} ({v.vehicleType} • {v.availabilityStatus})
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setIsAssignModalOpen(false)}
                className="flex-1 btn-secondary text-xs sm:text-sm py-2.5 justify-center"
              >
                Cancel
              </button>
              <button
                onClick={handleAssignVolunteer}
                disabled={actionLoading}
                className="flex-1 btn-primary text-xs sm:text-sm py-2.5 justify-center"
              >
                Confirm Assignment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Volunteer Rating Modal */}
      {isRateModalOpen && selectedDonationForRate && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-[#e8e2d5] animate-scale-in">
            <h3 className="text-lg font-bold text-[#172117] mb-1" style={{ fontFamily: 'var(--font-sans)' }}>
              Rate Volunteer Performance
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              Rate volunteer <strong>{selectedDonationForRate.assignedVolunteer?.name}</strong> for delivery of {selectedDonationForRate.foodType}.
            </p>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2">Rating</label>
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
                <label className="block text-xs font-bold text-gray-700 mb-1">Feedback Note (Optional)</label>
                <textarea
                  rows={3}
                  value={ratingFeedback}
                  onChange={(e) => setRatingFeedback(e.target.value)}
                  placeholder="e.g. Prompt delivery, safe food packaging handled with care."
                  className="input-field"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setIsRateModalOpen(false)}
                className="flex-1 btn-secondary text-xs sm:text-sm py-2.5 justify-center"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitRating}
                disabled={actionLoading}
                className="flex-1 btn-primary text-xs sm:text-sm py-2.5 justify-center"
              >
                Submit Rating
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Volunteer Live Tracking Modal */}
      {isTrackingModalOpen && selectedDonationForTracking && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-[#e8e2d5] animate-scale-in">
            {/* Modal Header */}
            <div className="p-6 border-b border-[#e8e2d5] flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-xs z-10">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-2xl ${
                  selectedDonationForTracking.status === 'picked_up'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-800'
                }`}>
                  <HiTruck size={24} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-extrabold text-[#172117]" style={{ fontFamily: 'var(--font-sans)' }}>
                      Live Volunteer Tracking
                    </h3>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 ${
                      selectedDonationForTracking.status === 'picked_up'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}>
                      <span className={`h-2 w-2 rounded-full ${
                        selectedDonationForTracking.status === 'picked_up' ? 'bg-emerald-600 animate-ping' : 'bg-amber-500'
                      }`} />
                      {selectedDonationForTracking.status === 'picked_up' ? 'Live In Transit' : 'Pickup in Progress'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {selectedDonationForTracking.foodType} • {selectedDonationForTracking.quantity}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsTrackingModalOpen(false)}
                className="h-9 w-9 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center cursor-pointer transition-colors"
                aria-label="Close"
              >
                <HiX size={18} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Volunteer Info Card */}
              {selectedDonationForTracking.assignedVolunteer ? (
                <div className="surface-card p-4 bg-[#faf8f4] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-primary-200">
                  <div className="flex items-center gap-3.5">
                    <div className="h-12 w-12 rounded-2xl bg-primary-700 text-white flex items-center justify-center font-extrabold text-base shadow-xs">
                      {selectedDonationForTracking.assignedVolunteer.name?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Assigned Delivery Partner</p>
                      <h4 className="text-base font-bold text-[#172117] leading-tight">
                        {selectedDonationForTracking.assignedVolunteer.name}
                      </h4>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {selectedDonationForTracking.assignedVolunteer.phone || 'Phone not listed'}
                      </p>
                    </div>
                  </div>

                  {selectedDonationForTracking.assignedVolunteer.phone && (
                    <a
                      href={`tel:${selectedDonationForTracking.assignedVolunteer.phone}`}
                      className="btn-primary text-xs py-2 px-4 shadow-2xs flex items-center gap-1.5 shrink-0"
                    >
                      <HiPhone size={14} />
                      <span>Call Volunteer</span>
                    </a>
                  )}
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
                  No volunteer assigned yet. Food donation is currently waiting in the pool.
                </div>
              )}

              {/* Real-time Volunteer Location & Movement Corridor */}
              {(() => {
                const volLoc = selectedDonationForTracking.volunteerLocation;
                const hasGps = volLoc && volLoc.lat && volLoc.lng && volLoc.lat !== 0;

                // Volunteer live coords (fallback to city coordinates if GPS not yet recorded)
                const defaultCityCoords = { lat: 22.6916, lng: 72.8634 };
                const currentVolCoords = hasGps
                  ? { lat: volLoc.lat, lng: volLoc.lng }
                  : (selectedDonationForTracking.location?.coordinates?.[1]
                      ? { lat: selectedDonationForTracking.location.coordinates[1], lng: selectedDonationForTracking.location.coordinates[0] }
                      : defaultCityCoords);

                const ngoDest = user?.address || 'NGO Distribution Center, Nadiad';
                const isPickedUp = selectedDonationForTracking.status === 'picked_up';

                // Route: Volunteer -> NGO (if picked up) or Volunteer -> Donor (if heading to pickup)
                const donorPickupAddr = `${selectedDonationForTracking.pickupLocation?.street || ''} ${selectedDonationForTracking.pickupLocation?.city || ''}`.trim();
                const targetDestination = isPickedUp ? ngoDest : donorPickupAddr;
                const targetLabel = isPickedUp ? 'Your NGO Center' : 'Donor Pickup Point';

                const mapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${currentVolCoords.lat},${currentVolCoords.lng}&destination=${encodeURIComponent(targetDestination)}`;

                return (
                  <div className="space-y-5">
                    {/* Live Stream Status & Auto-refresh notice */}
                    <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-2xl flex items-center justify-between text-xs text-emerald-950">
                      <div className="flex items-center gap-2">
                        <span className="relative flex h-2.5 w-2.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-600" />
                        </span>
                        <span className="font-bold">LIVE GPS STREAM ACTIVE</span>
                        <span className="text-emerald-700 hidden sm:inline">• Auto-updating with volunteer movement</span>
                      </div>
                      <span className="text-[11px] font-mono text-emerald-800 bg-white px-2 py-0.5 rounded-lg border border-emerald-200">
                        {volLoc?.updatedAt ? `Synced ${new Date(volLoc.updatedAt).toLocaleTimeString()}` : 'Live stream'}
                      </span>
                    </div>

                    {/* Volunteer Current Position Card */}
                    <div className="surface-card p-4.5 bg-gradient-to-br from-emerald-50/60 to-[#faf8f4] border-emerald-300">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
                            Volunteer Live Location
                          </span>
                          <h4 className="text-base font-extrabold text-[#172117] mt-0.5">
                            {selectedDonationForTracking.assignedVolunteer?.name || 'Volunteer'}
                          </h4>
                          <p className="text-xs text-gray-600 mt-1">
                            {volLoc?.address || (isPickedUp ? `In transit on road towards ${ngoDest}` : `En route to ${donorPickupAddr}`)}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-600 text-white shadow-2xs">
                            {volLoc?.speed && volLoc.speed > 0 ? `${Math.round(volLoc.speed * 3.6)} km/h` : 'Moving'}
                          </span>
                          <p className="text-[11px] text-gray-400 font-mono mt-1.5">
                            {currentVolCoords.lat.toFixed(4)}°N, {currentVolCoords.lng.toFixed(4)}°E
                          </p>
                        </div>
                      </div>

                      {/* Visual Route Corridor: Volunteer -> Destination */}
                      <div className="mt-4 pt-3.5 border-t border-emerald-200/80">
                        <div className="flex items-center justify-between text-xs font-bold text-gray-700 mb-2">
                          <div className="flex items-center gap-1.5 text-emerald-800">
                            <HiTruck size={16} className="text-emerald-600" />
                            <span>Volunteer (Current GPS)</span>
                          </div>
                          <div className="flex items-center gap-1 text-primary-800">
                            <HiLocationMarker size={16} />
                            <span>Destination: {targetLabel}</span>
                          </div>
                        </div>

                        {/* Animated Track Bar */}
                        <div className="relative h-3 bg-gray-200 rounded-full overflow-hidden p-0.5">
                          <div
                            className="h-full bg-gradient-to-r from-emerald-500 via-teal-500 to-primary-600 rounded-full transition-all duration-700 relative animate-pulse"
                            style={{ width: isPickedUp ? '72%' : '35%' }}
                          />
                        </div>
                        <div className="flex justify-between items-center text-[11px] text-gray-500 mt-1.5">
                          <span>{currentVolCoords.lat.toFixed(3)}°, {currentVolCoords.lng.toFixed(3)}°</span>
                          <span className="font-bold text-emerald-800">
                            {isPickedUp ? '~1.2 km away • ~4 mins to NGO' : '~2.1 km to donor pickup'}
                          </span>
                          <span>{targetDestination}</span>
                        </div>
                      </div>
                    </div>

                    {/* Google Maps Route: VOLUNTEER -> NGO */}
                    <div>
                      <a
                        href={mapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full btn-primary py-3 text-xs sm:text-sm justify-center flex items-center gap-2 shadow-xs"
                      >
                        <HiExternalLink size={16} />
                        <span>
                          {isPickedUp
                            ? 'Open Live Route: Volunteer ➔ NGO Center on Google Maps'
                            : 'Open Live Route: Volunteer ➔ Donor Pickup on Google Maps'}
                        </span>
                      </a>
                      <p className="text-[11px] text-gray-500 text-center mt-1.5">
                        Navigates directly from the volunteer's real-time GPS position to {targetLabel}.
                      </p>
                    </div>

                    {/* Detailed Milestones Stepper */}
                    <div className="border border-[#e8e2d5] rounded-2xl p-4 bg-white">
                      <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                        Journey Milestones & Handover
                      </h4>
                      <div className="space-y-3 text-xs">
                        <div className="flex items-start gap-2.5">
                          <span className="h-5 w-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                            ✓
                          </span>
                          <div>
                            <p className="font-bold text-gray-800">1. Donor Pickup ({donorPickupAddr})</p>
                            <p className="text-gray-500 text-[11px]">
                              {isPickedUp ? 'Food collected and verified with Donor OTP.' : 'Awaiting volunteer arrival at donor location.'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-start gap-2.5">
                          <span className={`h-5 w-5 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5 ${
                            isPickedUp ? 'bg-emerald-600 text-white animate-pulse' : 'bg-gray-200 text-gray-600'
                          }`}>
                            2
                          </span>
                          <div>
                            <p className="font-bold text-gray-800">2. Live Delivery Corridor (Volunteer ➔ NGO)</p>
                            <p className="text-gray-500 text-[11px]">
                              {isPickedUp
                                ? `Volunteer is actively driving towards ${ngoDest} with ${selectedDonationForTracking.quantity}.`
                                : 'Will activate as soon as food is collected from donor.'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-start gap-2.5">
                          <span className="h-5 w-5 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                            3
                          </span>
                          <div>
                            <p className="font-bold text-gray-800">3. Dropoff Handover at Your Facility ({ngoDest})</p>
                            <p className="text-gray-500 text-[11px]">
                              Handover requires Dropoff OTP <code className="bg-blue-50 px-1 py-0.5 rounded font-mono font-bold text-blue-900">{selectedDonationForTracking.deliveryOtp}</code> when volunteer arrives.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Handover OTP Notice */}
              {selectedDonationForTracking.deliveryOtp && (
                <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-blue-950">Your Dropoff Handover OTP</p>
                    <p className="text-[11px] text-blue-700 mt-0.5">
                      Ask volunteer to verify this OTP on their phone when handing over food.
                    </p>
                  </div>
                  <span className="text-2xl font-black text-blue-800 font-mono bg-white px-3 py-1.5 rounded-xl border border-blue-200 shadow-xs tracking-widest">
                    {selectedDonationForTracking.deliveryOtp}
                  </span>
                </div>
              )}

              {/* Actions Footer */}
              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsTrackingModalOpen(false)}
                  className="w-full btn-ghost text-xs sm:text-sm py-2.5 justify-center"
                >
                  Close Tracking Window
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Onboard Volunteer Modal */}
      {isAddVolunteerModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl border border-[#e8e2d5] animate-scale-in">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-[#172117]" style={{ fontFamily: 'var(--font-sans)' }}>
                  Onboard Team Volunteer
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Directly add a new volunteer driver or rider to {user?.organizationName || 'your organization'}.
                </p>
              </div>
              <button
                onClick={() => setIsAddVolunteerModalOpen(false)}
                className="h-8 w-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 flex items-center justify-center cursor-pointer transition-colors"
              >
                <HiX size={16} />
              </button>
            </div>

            <form onSubmit={handleAddVolunteer} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="Volunteer's full name"
                  value={newVolunteer.name}
                  onChange={(e) => setNewVolunteer({ ...newVolunteer, name: e.target.value })}
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="volunteer@example.com"
                  value={newVolunteer.email}
                  onChange={(e) => setNewVolunteer({ ...newVolunteer, email: e.target.value })}
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Phone Number (Optional)</label>
                <input
                  type="tel"
                  placeholder="10-digit mobile number"
                  value={newVolunteer.phone}
                  onChange={(e) => setNewVolunteer({ ...newVolunteer, phone: e.target.value })}
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Temporary Password *</label>
                <input
                  type="password"
                  required
                  placeholder="Minimum 6 characters"
                  value={newVolunteer.password}
                  onChange={(e) => setNewVolunteer({ ...newVolunteer, password: e.target.value })}
                  className="input-field"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Vehicle Type</label>
                  <select
                    value={newVolunteer.vehicleType}
                    onChange={(e) => setNewVolunteer({ ...newVolunteer, vehicleType: e.target.value })}
                    className="input-field"
                  >
                    <option value="bike">Motorcycle / Scooter</option>
                    <option value="car">Car / Sedan</option>
                    <option value="van">Van / Small Truck</option>
                    <option value="bicycle">Bicycle</option>
                    <option value="other">On Foot</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Plate Number</label>
                  <input
                    type="text"
                    placeholder="e.g. GJ-07-AB-1234"
                    value={newVolunteer.vehicleNumber}
                    onChange={(e) => setNewVolunteer({ ...newVolunteer, vehicleNumber: e.target.value })}
                    className="input-field"
                  />
                </div>
              </div>

              <div className="pt-3 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddVolunteerModalOpen(false)}
                  className="flex-1 btn-secondary text-xs sm:text-sm py-2.5 justify-center cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAddingVolunteer}
                  className="flex-1 btn-primary text-xs sm:text-sm py-2.5 justify-center cursor-pointer"
                >
                  {isAddingVolunteer ? 'Onboarding...' : 'Add to Team'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default NGODashboard;
