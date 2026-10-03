import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../components/layout/DashboardLayout';
import {
  HiTruck,
  HiClock,
  HiLocationMarker,
  HiThumbUp,
  HiKey,
  HiCheckCircle,
  HiRefresh,
  HiExclamationCircle,
  HiUser,
  HiSearch,
  HiFilter,
  HiPhone,
  HiPencil,
  HiExternalLink,
} from 'react-icons/hi';
import StatCounter from '../../components/ui/StatCounter';
import StatusBadge from '../../components/ui/StatusBadge';
import EmptyState from '../../components/ui/EmptyState';
import ReportComplaintModal from '../../components/common/ReportComplaintModal';
import { StatSkeleton } from '../../components/ui/Skeleton';
import {
  getVolunteerProfile,
  updateAvailabilityStatus,
  getAvailableTasks,
  getMyTasks,
  acceptTask,
  rejectTask,
  verifyPickupOtp,
  uploadDeliveryProof,
  verifyDeliveryOtp,
  completeTask,
  getVolunteerStats,
  updateVolunteerProfile,
  updateTaskLocation,
} from '../../services/volunteerService';

const VEHICLE_CONFIG = {
  car: { icon: '🚗', label: 'Car', capacity: '50–100 meals' },
  bike: { icon: '🏍️', label: 'Motorcycle', capacity: '10–25 meals' },
  scooter: { icon: '🛵', label: 'Scooter', capacity: '10–25 meals' },
  van: { icon: '🚐', label: 'Van / Mini-Truck', capacity: '150–300+ meals' },
  bicycle: { icon: '🚲', label: 'Bicycle', capacity: '5–10 meals' },
  other: { icon: '🚶', label: 'On Foot / Transit', capacity: 'Small parcels' },
};

const formatDeliveredDate = (dateStr) => {
  if (!dateStr) return 'Recently';
  try {
    const d = new Date(dateStr);
    const datePart = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const timePart = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    return `${datePart} · ${timePart}`;
  } catch (e) {
    return String(dateStr);
  }
};

const VolunteerDashboard = () => {
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState('available'); // 'available' | 'active' | 'history'
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState({
    completedDeliveries: 0,
    activeDeliveries: 0,
    availableTasks: 0,
    availabilityStatus: 'available',
    rating: 5.0,
  });
  const [availableTasks, setAvailableTasks] = useState([]);
  const [myTasks, setMyTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // Search State
  const [searchQuery, setSearchQuery] = useState('');

  // Modal states
  const [activeModal, setActiveModal] = useState(null); // 'pickupOtp' | 'deliveryOtp' | 'proof' | 'profile' | 'ratingsBreakdown'
  const [selectedTask, setSelectedTask] = useState(null);
  const [otpInput, setOtpInput] = useState('');
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [proofFile, setProofFile] = useState(null);
  const [modalError, setModalError] = useState('');

  // Complaint / Incident Reporting Modal State
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [selectedTaskForReport, setSelectedTaskForReport] = useState(null);

  // Profile Edit State
  const [vehicleType, setVehicleType] = useState('bike');
  const [vehicleNumber, setVehicleNumber] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  // Broadcast real-time volunteer GPS coordinates for active delivery tasks
  useEffect(() => {
    const activeTask = myTasks.find((t) => ['assigned', 'picked_up'].includes(t.status));
    if (!activeTask) return;

    let watchId;
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          updateTaskLocation(activeTask._id, {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            speed: pos.coords.speed || 0,
            heading: pos.coords.heading || 0,
          }).catch(() => {});
        },
        () => {},
        { enableHighAccuracy: true, timeout: 10000 }
      );

      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          updateTaskLocation(activeTask._id, {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            speed: pos.coords.speed || 0,
            heading: pos.coords.heading || 0,
          }).catch(() => {});
        },
        (err) => console.log('Geolocation watch notice:', err?.message),
        { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
      );
    }

    return () => {
      if (watchId && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [myTasks]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const params = {};
      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }

      const [profRes, statsRes, availRes, tasksRes] = await Promise.all([
        getVolunteerProfile().catch(() => null),
        getVolunteerStats().catch(() => null),
        getAvailableTasks(params).catch(() => []),
        getMyTasks('all').catch(() => []),
      ]);

      if (profRes) {
        setProfile(profRes.profile);
        setVehicleType(profRes.profile?.vehicleType || 'bike');
        setVehicleNumber(profRes.profile?.vehicleNumber || '');
      }
      if (statsRes?.stats) setStats(statsRes.stats);
      setAvailableTasks(availRes || []);
      setMyTasks(tasksRes || []);
    } catch (err) {
      console.error('Error loading volunteer dashboard:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchData();
  };

  const showFeedback = (text, type = 'success') => {
    setFeedback({ text, type });
    setTimeout(() => setFeedback(null), 4000);
  };

  const handleStatusChange = async (newStatus) => {
    try {
      await updateAvailabilityStatus(newStatus);
      setStats((prev) => ({ ...prev, availabilityStatus: newStatus }));
      showFeedback(`Availability status set to ${newStatus}`);
    } catch (err) {
      showFeedback('Failed to update status', 'error');
    }
  };

  const handleAcceptTask = async (id) => {
    try {
      setActionLoading(true);
      await acceptTask(id);
      showFeedback('Task accepted! You can now proceed to pickup.');
      setActiveTab('active');
      fetchData();
    } catch (err) {
      showFeedback(err.response?.data?.message || 'Failed to accept task', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectTask = async (id) => {
    if (!window.confirm('Are you sure you want to decline this task? It will return to the pool.')) return;
    try {
      setActionLoading(true);
      await rejectTask(id);
      showFeedback('Task rejected and returned to pool.');
      fetchData();
    } catch (err) {
      showFeedback(err.response?.data?.message || 'Failed to reject task', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Pickup OTP Submit
  const handleVerifyPickup = async () => {
    if (!otpInput.trim()) {
      setModalError('Please enter the 6-digit OTP');
      return;
    }
    try {
      setActionLoading(true);
      setModalError('');
      await verifyPickupOtp(selectedTask._id, otpInput.trim());
      setActiveModal(null);
      setOtpInput('');
      showFeedback('Pickup OTP verified! Food marked as in-transit.');
      fetchData();
    } catch (err) {
      setModalError(err.response?.data?.message || 'Invalid pickup OTP');
    } finally {
      setActionLoading(false);
    }
  };

  // Delivery OTP Submit
  const handleVerifyDelivery = async () => {
    if (!otpInput.trim()) {
      setModalError('Please enter the 6-digit OTP');
      return;
    }
    try {
      setActionLoading(true);
      setModalError('');
      await verifyDeliveryOtp(selectedTask._id, otpInput.trim());
      setActiveModal(null);
      setOtpInput('');
      showFeedback('Delivery OTP verified! You can now finalize completion.');
      fetchData();
    } catch (err) {
      setModalError(err.response?.data?.message || 'Invalid delivery OTP');
    } finally {
      setActionLoading(false);
    }
  };

  // Upload Proof & Complete Task Submit
  const handleCompleteTask = async () => {
    try {
      setActionLoading(true);
      setModalError('');

      if (proofFile) {
        const formData = new FormData();
        formData.append('proof', proofFile);
        if (deliveryNotes) formData.append('deliveryNotes', deliveryNotes);
        await uploadDeliveryProof(selectedTask._id, formData);
      }

      await completeTask(selectedTask._id, { deliveryNotes });
      setActiveModal(null);
      setProofFile(null);
      setDeliveryNotes('');
      showFeedback('Task completed successfully! Great job!');
      setActiveTab('history');
      fetchData();
    } catch (err) {
      setModalError(err.response?.data?.message || 'Failed to complete task');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateVehicleProfile = async () => {
    try {
      setActionLoading(true);
      await updateVolunteerProfile({ vehicleType, vehicleNumber });
      setActiveModal(null);
      showFeedback('Vehicle details updated!');
      fetchData();
    } catch (err) {
      setModalError('Failed to update profile');
    } finally {
      setActionLoading(false);
    }
  };

  const activeDeliveriesList = myTasks.filter((t) => ['assigned', 'scheduled', 'picked_up'].includes(t.status));
  const completedDeliveriesList = myTasks.filter((t) => t.status === 'delivered');
  const currentVehicle = VEHICLE_CONFIG[profile?.vehicleType || 'bike'] || VEHICLE_CONFIG.bike;

  return (
    <DashboardLayout activeTab={activeTab} onTabChange={(tab) => setActiveTab(tab)}>
      {/* Toast Feedback */}
      {feedback && (
        <div
          className={`mb-6 p-4 rounded-2xl border text-sm font-semibold flex items-center gap-2.5 animate-fade-in-up ${
            feedback.type === 'error'
              ? 'bg-red-50 text-red-800 border-red-200'
              : 'bg-emerald-50 text-emerald-800 border-emerald-200'
          }`}
        >
          <HiCheckCircle size={20} className="shrink-0" />
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Header & Status Switcher */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 animate-fade-in-up">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#172117] tracking-tight" style={{ fontFamily: 'var(--font-sans)' }}>
            Welcome, {user?.name || 'Volunteer'}
          </h1>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className="inline-flex items-center gap-2 px-3 py-1 bg-white/95 border border-[#e8e2d5] rounded-full text-xs font-medium text-gray-700 shadow-2xs">
              <span className="text-sm">{currentVehicle.icon}</span>
              <strong className="text-gray-900">{currentVehicle.label}</strong>
              <span className="text-gray-300">·</span>
              <span className="font-mono text-gray-800 font-semibold">{profile?.vehicleNumber || 'No plate registered'}</span>
              <span className="text-gray-300">·</span>
              <span className="text-[11px] text-gray-500 font-normal">Cap: {currentVehicle.capacity}</span>
            </span>
            <button
              onClick={() => {
                setModalError('');
                setActiveModal('profile');
              }}
              className="text-primary-700 hover:text-primary-850 font-bold text-xs underline cursor-pointer inline-flex items-center gap-1"
            >
              <HiPencil size={12} /> Edit
            </button>
          </div>
        </div>

        {/* Work Status Switcher */}
        <div className="flex items-center gap-3">
          <div className="surface-card p-1.5 px-3 flex items-center gap-2.5 border border-[#e8e2d5] rounded-2xl shadow-2xs">
            <div className="flex flex-col pr-2.5 border-r border-[#e8e2d5]">
              <span className="text-[9px] font-black uppercase tracking-wider text-gray-400 leading-tight">
                Work Status
              </span>
              <span className="text-xs font-extrabold flex items-center gap-1.5 mt-0.5">
                <span
                  className={`w-2 h-2 rounded-full ${
                    stats.availabilityStatus === 'available'
                      ? 'bg-emerald-500 shadow-xs'
                      : stats.availabilityStatus === 'busy'
                      ? 'bg-amber-500'
                      : 'bg-gray-400'
                  }`}
                />
                <span className="capitalize text-gray-900">
                  {stats.availabilityStatus}
                </span>
              </span>
            </div>

            <div className="flex items-center gap-1">
              {['available', 'busy', 'offline'].map((st) => (
                <button
                  key={st}
                  onClick={() => handleStatusChange(st)}
                  className={`px-2.5 py-1 rounded-xl text-xs font-bold capitalize transition-all cursor-pointer ${
                    stats.availabilityStatus === st
                      ? st === 'available'
                        ? 'bg-emerald-600 text-white shadow-2xs'
                        : st === 'busy'
                        ? 'bg-amber-500 text-white shadow-2xs'
                        : 'bg-gray-600 text-white shadow-2xs'
                      : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={fetchData}
            disabled={isLoading}
            className="btn-secondary text-xs sm:text-sm px-3.5 py-2 cursor-pointer shadow-2xs"
            aria-label="Refresh tasks"
          >
            <HiRefresh className={`${isLoading ? 'animate-spin' : ''}`} size={16} />
          </button>
        </div>
      </div>

      {/* Stats Grid */}
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
              value={completedDeliveriesList.length}
              label="Deliveries Completed"
              icon={HiTruck}
              subtext="Nourished households"
            />
            <StatCounter
              value={activeDeliveriesList.length}
              label="Active Deliveries"
              icon={HiClock}
              subtext="Currently assigned"
            />
            <StatCounter
              value={availableTasks.length}
              label="Available Pool"
              icon={HiLocationMarker}
              subtext="Nearby pickups"
            />
            <StatCounter
              value={Number(stats.rating || 5.0).toFixed(1)}
              label="Volunteer Rating"
              icon={HiThumbUp}
              subtext={`${stats.ratingCount || 0} ${stats.ratingCount === 1 ? 'review' : 'reviews'}`}
              tooltip="Average rating from partner NGOs and donors based on completed deliveries"
            />
          </>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#e8e2d5] mb-6 gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('available')}
          className={`pb-3 px-4 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer shrink-0 ${
            activeTab === 'available'
              ? 'border-primary-600 text-primary-800'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          Available Task Pool ({availableTasks.length})
        </button>
        <button
          onClick={() => setActiveTab('active')}
          className={`pb-3 px-4 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer shrink-0 ${
            activeTab === 'active'
              ? 'border-primary-600 text-primary-800'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          Active Deliveries ({activeDeliveriesList.length})
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`pb-3 px-4 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer shrink-0 ${
            activeTab === 'history'
              ? 'border-primary-600 text-primary-800'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          Completed Deliveries ({completedDeliveriesList.length})
        </button>
      </div>

      {/* ================= TAB 1: Available Pool ================= */}
      {activeTab === 'available' && (
        <div className="space-y-4 animate-fade-in">
          {/* Location search filter */}
          <div className="surface-card p-4">
            <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
              <div className="relative flex-1">
                <HiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter tasks by city, neighborhood, food type..."
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
          </div>

          {isLoading ? (
            <div className="surface-card p-12 text-center text-gray-400">Searching available tasks...</div>
          ) : availableTasks.length === 0 ? (
            <div className="surface-card p-12 sm:p-16 text-center border-dashed border-primary-200/80 bg-white/70 rounded-3xl my-2">
              <div className="h-14 w-14 mx-auto rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3.5 border border-emerald-100 shadow-2xs">
                <HiCheckCircle size={30} />
              </div>
              <h3 className="text-lg font-bold text-[#172117] mb-1.5" style={{ fontFamily: 'var(--font-sans)' }}>
                No available tasks
              </h3>
              <p className="text-xs sm:text-sm text-gray-500 max-w-sm mx-auto leading-relaxed">
                New nearby pickup requests will appear here when available.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {availableTasks.map((task) => (
                <div
                  key={task._id}
                  className="surface-card p-5 flex flex-col justify-between hover:border-primary-300 transition-all"
                >
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-extrabold text-[#172117] text-lg leading-tight">{task.foodType}</h3>
                      <StatusBadge status="accepted" />
                    </div>

                    <p className="text-xs text-gray-600 mb-3 line-clamp-2">
                      {task.description || 'No special dietary instructions.'}
                    </p>

                    <div className="space-y-2 text-xs text-gray-600 bg-[#faf8f4] p-3.5 rounded-2xl mb-4 border border-[#e8e2d5]">
                      <div>
                        <strong className="text-gray-800">Quantity:</strong> {task.quantity}
                      </div>
                      <div className="flex items-start gap-1">
                        <HiLocationMarker className="text-emerald-600 shrink-0 mt-0.5" />
                        <span>
                          <strong>1. Pickup (Donor):</strong> {task.pickupLocation?.street ? `${task.pickupLocation.street}, ` : ''}
                          <strong className="text-gray-900">{task.pickupLocation?.city || 'Local Area'}</strong>
                        </span>
                      </div>
                      <div className="flex items-start gap-1">
                        <HiLocationMarker className="text-indigo-600 shrink-0 mt-0.5" />
                        <span>
                          <strong>2. Dropoff (NGO):</strong>{' '}
                          <strong className="text-primary-800">{task.ngoOrganization?.organizationName || task.acceptedBy?.name || 'Partner NGO'}</strong>
                          {task.dropoffLocation?.street ? ` — ${task.dropoffLocation.street}` : ''}
                          {task.dropoffLocation?.city ? `, ${task.dropoffLocation.city}` : ''}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-gray-500">
                        <HiUser className="shrink-0" />
                        <span>
                          Donor: {task.donor?.name || 'Donor'} ({task.donor?.phone || 'No phone'})
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleAcceptTask(task._id)}
                    disabled={actionLoading}
                    className="w-full btn-primary text-xs sm:text-sm py-2.5 justify-center shadow-xs"
                  >
                    Accept Delivery Task
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ================= TAB 2: Active Deliveries ================= */}
      {activeTab === 'active' && (
        <div className="space-y-4 animate-fade-in">
          {isLoading ? (
            <div className="surface-card p-12 text-center text-gray-400">Loading active tasks...</div>
          ) : activeDeliveriesList.length === 0 ? (
            <div className="surface-card p-12 sm:p-16 text-center border-dashed border-primary-200/80 bg-white/70 rounded-3xl my-2">
              <div className="h-14 w-14 mx-auto rounded-2xl bg-gray-50 text-gray-400 flex items-center justify-center mb-3.5 border border-gray-100 shadow-2xs">
                <HiClock size={30} />
              </div>
              <h3 className="text-lg font-bold text-[#172117] mb-1.5" style={{ fontFamily: 'var(--font-sans)' }}>
                No active deliveries
              </h3>
              <p className="text-xs sm:text-sm text-gray-500 max-w-sm mx-auto mb-5 leading-relaxed">
                Accept a delivery from the available pool to get started.
              </p>
              <button
                onClick={() => setActiveTab('available')}
                className="btn-primary inline-flex text-xs sm:text-sm px-5 py-2.5 shadow-xs cursor-pointer"
              >
                Explore Available Pool ({availableTasks.length})
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {activeDeliveriesList.map((task) => {
                const isPickedUp = task.status === 'picked_up' || task.pickupOtpVerified;
                const isDeliveredOtpVerified = task.deliveryOtpVerified;

                return (
                  <div
                    key={task._id}
                    className="surface-card p-6 flex flex-col justify-between hover:border-primary-300 transition-all"
                  >
                    <div>
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="font-extrabold text-[#172117] text-lg">{task.foodType}</h3>
                          <p className="text-xs font-semibold text-primary-700">Quantity: {task.quantity}</p>
                        </div>
                        <StatusBadge status={isPickedUp ? 'picked_up' : 'assigned'} />
                      </div>

                      {/* 3-Step Progress Bar */}
                      <div className="my-4 p-3.5 bg-[#faf8f4] rounded-2xl border border-[#e8e2d5] text-xs">
                        <div className="flex items-center justify-between text-gray-600 mb-2">
                          <span className="font-bold">Workflow Progress:</span>
                          <span className="font-extrabold text-primary-700">
                            {isPickedUp
                              ? isDeliveredOtpVerified
                                ? 'Step 3 of 3 (Final Handover)'
                                : 'Step 2 of 3 (In Transit to NGO)'
                              : 'Step 1 of 3 (Pickup at Donor)'}
                          </span>
                        </div>
                        <div className="w-full bg-[#e8e2d5] h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-primary-600 h-full transition-all duration-500"
                            style={{
                              width: isPickedUp ? (isDeliveredOtpVerified ? '90%' : '55%') : '25%',
                            }}
                          />
                        </div>
                      </div>

                      {/* Active Mission Live Guidance Banner */}
                      <div className={`p-3.5 rounded-2xl border mb-4 flex items-center justify-between gap-3 ${
                        isPickedUp 
                          ? 'bg-gradient-to-r from-indigo-50/90 to-primary-50/80 border-indigo-200' 
                          : 'bg-gradient-to-r from-emerald-50/90 to-amber-50/60 border-emerald-200'
                      }`}>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wide">
                            <span className={`w-2 h-2 rounded-full animate-ping ${isPickedUp ? 'bg-indigo-600' : 'bg-emerald-600'}`} />
                            <span className={isPickedUp ? 'text-indigo-900' : 'text-emerald-900'}>
                              {isPickedUp ? 'Destination: NGO Dropoff' : 'Next Stop: Donor Pickup'}
                            </span>
                          </div>
                          <p className="text-sm font-extrabold text-gray-900 truncate mt-0.5">
                            {isPickedUp
                              ? (task.ngoOrganization?.organizationName || task.acceptedBy?.name || 'NGO Dropoff Center')
                              : (task.donor?.name || 'Donor Pickup')}
                          </p>
                          <p className="text-xs text-gray-600 truncate">
                            {isPickedUp
                              ? [task.dropoffLocation?.street, task.dropoffLocation?.city].filter(Boolean).join(', ') || 'Facility Address'
                              : [task.pickupLocation?.street, task.pickupLocation?.city].filter(Boolean).join(', ') || 'Pickup Address'}
                          </p>
                        </div>
                        <a
                          href={(() => {
                            const dest = isPickedUp
                              ? [task.ngoOrganization?.organizationName, task.dropoffLocation?.street, task.dropoffLocation?.city, task.dropoffLocation?.state || 'Gujarat'].filter(Boolean).join(', ')
                              : [task.pickupLocation?.street, task.pickupLocation?.city, task.pickupLocation?.state || 'Gujarat'].filter(Boolean).join(', ');
                            return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(dest)}`;
                          })()}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`shrink-0 flex items-center gap-1 px-3 py-2 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer ${
                            isPickedUp
                              ? 'bg-indigo-600 hover:bg-indigo-700 active:scale-95'
                              : 'bg-emerald-700 hover:bg-emerald-800 active:scale-95'
                          }`}
                          title="Open turn-by-turn navigation in Google Maps"
                        >
                          <HiLocationMarker size={15} />
                          <span>GPS Map</span>
                          <HiExternalLink size={13} />
                        </a>
                      </div>

                      {/* Locations & Contacts */}
                      <div className="space-y-3 text-xs text-gray-600 mb-5">
                        {/* Point 1: Donor Pickup */}
                        <div className={`p-3.5 rounded-xl border transition-all ${
                          !isPickedUp 
                            ? 'bg-emerald-50/80 border-emerald-300 ring-2 ring-emerald-500/20 shadow-xs' 
                            : 'bg-gray-50/80 border-gray-200 opacity-80'
                        }`}>
                          <div className="flex items-center justify-between mb-1.5">
                            <p className="font-bold text-emerald-950 flex items-center gap-1.5 text-xs">
                              <HiLocationMarker className="text-emerald-700 text-sm" />
                              1. Pickup Location (Donor)
                            </p>
                            <a
                              href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent([task.pickupLocation?.street, task.pickupLocation?.city, 'Gujarat'].filter(Boolean).join(', '))}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-0.5 hover:underline"
                            >
                              Directions <HiExternalLink size={12} />
                            </a>
                          </div>
                          <p className="text-gray-900 font-semibold">
                            {task.pickupLocation?.street ? `${task.pickupLocation.street}, ` : ''}{task.pickupLocation?.city || 'Local Area'}
                          </p>
                          <div className="flex items-center justify-between mt-2 pt-2 border-t border-emerald-200/50 text-[11px]">
                            <span className="text-gray-600">
                              Donor: <strong className="text-gray-900">{task.donor?.name || 'Donor'}</strong>
                            </span>
                            {task.donor?.phone ? (
                              <a
                                href={`tel:${task.donor.phone}`}
                                className="flex items-center gap-1 font-bold text-emerald-800 hover:text-emerald-900 bg-emerald-100/70 px-2 py-0.5 rounded-md transition-colors"
                              >
                                <HiPhone size={12} />
                                {task.donor.phone}
                              </a>
                            ) : (
                              <span className="text-gray-400">No phone</span>
                            )}
                          </div>
                        </div>

                        {/* Point 2: Delivery Dropoff (NGO) */}
                        <div className={`p-3.5 rounded-xl border transition-all ${
                          isPickedUp 
                            ? 'bg-indigo-50/90 border-indigo-300 ring-2 ring-indigo-500/20 shadow-xs' 
                            : 'bg-gray-50/80 border-gray-200'
                        }`}>
                          <div className="flex items-center justify-between mb-1.5">
                            <p className="font-bold text-indigo-950 flex items-center gap-1.5 text-xs">
                              <HiLocationMarker className="text-indigo-700 text-sm" />
                              2. Delivery Dropoff (NGO Facility)
                            </p>
                            <a
                              href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent([task.ngoOrganization?.organizationName, task.dropoffLocation?.street, task.dropoffLocation?.city, 'Gujarat'].filter(Boolean).join(', '))}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[11px] font-bold text-indigo-700 hover:text-indigo-800 flex items-center gap-0.5 hover:underline"
                            >
                              Directions <HiExternalLink size={12} />
                            </a>
                          </div>
                          
                          {/* NGO Organization Name Badge */}
                          <div className="mb-1">
                            <span className="inline-block text-xs font-black text-indigo-950 bg-indigo-100/80 px-2 py-0.5 rounded-md">
                              {task.ngoOrganization?.organizationName || 'NGO Community Partner'}
                            </span>
                          </div>
                          <p className="text-gray-900 font-semibold">
                            {[task.dropoffLocation?.street, task.dropoffLocation?.city, task.dropoffLocation?.zipCode].filter(Boolean).join(', ') || 'Facility Address on File'}
                          </p>
                          <div className="flex items-center justify-between mt-2 pt-2 border-t border-indigo-200/50 text-[11px]">
                            <span className="text-gray-600">
                              Coordinator: <strong className="text-gray-900">{task.acceptedBy?.name || 'NGO Coordinator'}</strong>
                            </span>
                            {task.acceptedBy?.phone ? (
                              <a
                                href={`tel:${task.acceptedBy.phone}`}
                                className="flex items-center gap-1 font-bold text-indigo-800 hover:text-indigo-900 bg-indigo-100/70 px-2 py-0.5 rounded-md transition-colors"
                              >
                                <HiPhone size={12} />
                                {task.acceptedBy.phone}
                              </a>
                            ) : (
                              <span className="text-gray-400">No phone</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Step-by-Step Actions */}
                    <div className="pt-4 border-t border-[#e8e2d5] space-y-2">
                      {!isPickedUp ? (
                        <>
                          <button
                            onClick={() => {
                              setSelectedTask(task);
                              setOtpInput('');
                              setModalError('');
                              setActiveModal('pickupOtp');
                            }}
                            className="w-full btn-primary text-xs sm:text-sm py-3 justify-center shadow-md shadow-emerald-700/15"
                          >
                            <HiKey size={18} />
                            Arrived at Donor: Enter Pickup OTP
                          </button>

                          <button
                            onClick={() => handleRejectTask(task._id)}
                            disabled={actionLoading}
                            className="w-full py-2 text-xs font-semibold text-gray-500 hover:text-red-600 transition-colors cursor-pointer text-center"
                          >
                            Decline & Return Task to Pool
                          </button>
                        </>
                      ) : (
                        <>
                          {!isDeliveredOtpVerified ? (
                            <button
                              onClick={() => {
                                setSelectedTask(task);
                                setOtpInput('');
                                setModalError('');
                                setActiveModal('deliveryOtp');
                              }}
                              className="w-full btn-primary text-xs sm:text-sm py-3 justify-center bg-indigo-700 hover:bg-indigo-800 border-indigo-900 shadow-md shadow-indigo-700/15"
                            >
                              <HiKey size={18} />
                              Arrived at NGO: Enter Delivery OTP
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                setSelectedTask(task);
                                setDeliveryNotes(task.deliveryNotes || '');
                                setProofFile(null);
                                setModalError('');
                                setActiveModal('proof');
                              }}
                              className="w-full btn-primary text-xs sm:text-sm py-3 justify-center shadow-md animate-bounce-short"
                            >
                              <HiCheckCircle size={18} />
                              Finalize & Mark Task Delivered
                            </button>
                          )}
                        </>
                      )}

                      {/* Discreet safety / dispute reporting link */}
                      <div className="pt-2 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedTaskForReport(task);
                            setIsReportModalOpen(true);
                          }}
                          className="text-[11px] text-gray-400 hover:text-rose-600 transition-colors cursor-pointer inline-flex items-center gap-1 font-medium hover:underline"
                        >
                          <HiExclamationCircle size={13} />
                          <span>Need help or experiencing an issue? Report to Admin</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ================= TAB 3: Completed History ================= */}
      {activeTab === 'history' && (
        <div className="space-y-4 animate-fade-in">
          {isLoading ? (
            <div className="surface-card p-12 text-center text-gray-400">Loading delivery history...</div>
          ) : completedDeliveriesList.length === 0 ? (
            <div className="surface-card p-12 sm:p-16 text-center border-dashed border-primary-200/80 bg-white/70 rounded-3xl my-2">
              <div className="h-14 w-14 mx-auto rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3.5 border border-emerald-100 shadow-2xs">
                <HiTruck size={30} />
              </div>
              <h3 className="text-lg font-bold text-[#172117] mb-1.5" style={{ fontFamily: 'var(--font-sans)' }}>
                No completed deliveries yet
              </h3>
              <p className="text-xs sm:text-sm text-gray-500 max-w-sm mx-auto leading-relaxed">
                Deliveries you complete will appear here with pickup and dropoff records, verified timings, and feedback.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {completedDeliveriesList.map((task) => {
                const donorName = task.donor?.name || 'Neel Panchal';
                const ngoName = task.ngoOrganization?.organizationName || task.acceptedBy?.name || 'Dhruv Patel';
                const pickupAddress = [task.pickupLocation?.street, task.pickupLocation?.city].filter(Boolean).join(', ') || 'Donor Location';
                const dropoffAddress = [task.dropoffLocation?.street, task.dropoffLocation?.city].filter(Boolean).join(', ') || 'NGO Relief Center';
                const ratingScore = task.volunteerRating?.score || 5;
                const feedbackText = task.volunteerRating?.feedback || (task.deliveryNotes && task.deliveryNotes.trim() !== '' ? task.deliveryNotes : null);

                return (
                  <div key={task._id} className="surface-card p-5.5 border-emerald-100 flex flex-col justify-between hover:border-emerald-300 transition-all shadow-2xs">
                    <div>
                      {/* Top Header: Title & Status Badge */}
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-extrabold text-[#172117] text-lg leading-snug">{task.foodType}</h3>
                          <p className="text-xs font-bold text-primary-700 mt-0.5">
                            {task.quantity ? `${task.quantity} meals` : 'Donation meals'}
                          </p>
                        </div>
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-800 shrink-0">
                          ✓ Completed
                        </span>
                      </div>

                      {/* Operational Route: Pickup & Delivery Location */}
                      <div className="my-3.5 p-3.5 bg-[#faf8f4] rounded-2xl border border-[#e8e2d5] space-y-2.5 text-xs">
                        <div className="flex items-start gap-2">
                          <span className="text-emerald-700 shrink-0 mt-0.5 text-sm">📍</span>
                          <div className="min-w-0">
                            <span className="font-bold text-gray-400 uppercase text-[10px] tracking-wider block">Pickup</span>
                            <p className="font-semibold text-gray-900 leading-tight truncate">
                              {pickupAddress}
                            </p>
                          </div>
                        </div>

                        <div className="border-t border-[#e8e2d5]/60 pt-2 flex items-start gap-2">
                          <span className="text-indigo-700 shrink-0 mt-0.5 text-sm">📍</span>
                          <div className="min-w-0">
                            <span className="font-bold text-gray-400 uppercase text-[10px] tracking-wider block">Delivered to</span>
                            <p className="font-semibold text-gray-900 leading-tight truncate">
                              {dropoffAddress}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Donor & NGO Attribution */}
                      <div className="grid grid-cols-2 gap-2 text-xs py-2 px-1 text-gray-600 mb-3 border-b border-[#e8e2d5]/80">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-gray-400 block">Donor</span>
                          <strong className="text-gray-800 font-semibold">{donorName}</strong>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase font-bold text-gray-400 block">NGO</span>
                          <strong className="text-gray-800 font-semibold">{ngoName}</strong>
                        </div>
                      </div>

                      {/* Review & Feedback Presentation */}
                      {feedbackText && (
                        <div className="my-3 p-3 bg-amber-50/70 rounded-2xl border border-amber-200/90 text-xs text-amber-950">
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-1 text-amber-500 font-bold">
                              {'★'.repeat(ratingScore)}
                              <span className="text-xs font-extrabold text-amber-900 ml-1">
                                {Number(ratingScore).toFixed(1)}
                              </span>
                            </div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700/90">
                              Feedback
                            </span>
                          </div>
                          <p className="italic font-medium text-gray-800 text-xs leading-relaxed">
                            "{feedbackText}"
                          </p>
                          <span className="text-[10px] text-gray-500 font-semibold block mt-1">
                            — Donor
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Completion Timestamp & Optional Proof Link */}
                    <div className="pt-3 border-t border-[#e8e2d5] flex items-center justify-between text-xs text-gray-500">
                      <span className="text-[11px] font-medium text-gray-400">
                        Completed {formatDeliveredDate(task.deliveredAt || task.updatedAt)}
                      </span>
                      <div className="flex items-center gap-2.5">
                        {task.deliveryProofUrl && (
                          <a
                            href={task.deliveryProofUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-primary-700 font-bold hover:underline inline-flex items-center gap-1 text-[11px]"
                          >
                            Proof <HiExternalLink size={12} />
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedTaskForReport(task);
                            setIsReportModalOpen(true);
                          }}
                          className="text-gray-400 hover:text-rose-600 transition-colors cursor-pointer inline-flex items-center gap-1 text-[11px] hover:underline"
                          title="Report problem or dispute regarding this delivery"
                        >
                          <HiExclamationCircle size={13} />
                          <span>Report Issue</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Modal 1: Pickup OTP Modal */}
      {activeModal === 'pickupOtp' && selectedTask && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-[#e8e2d5] animate-scale-in">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <HiKey size={20} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#172117]" style={{ fontFamily: 'var(--font-sans)' }}>
                  Enter Pickup OTP
                </h3>
                <p className="text-xs text-gray-500">Ask the donor for their 6-digit confirmation code</p>
              </div>
            </div>

            <div className="my-6">
              <input
                type="text"
                maxLength={6}
                value={otpInput}
                onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ''))}
                placeholder="123456"
                className="w-full text-center tracking-widest text-2xl font-mono py-3 border-2 border-emerald-200 rounded-2xl focus:border-emerald-600 focus:outline-none bg-emerald-50/20"
              />
              {modalError && (
                <p className="text-xs text-red-600 font-semibold mt-2 flex items-center gap-1">
                  <HiExclamationCircle /> {modalError}
                </p>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setActiveModal(null)}
                className="flex-1 btn-secondary text-xs sm:text-sm py-2.5 justify-center"
              >
                Cancel
              </button>
              <button
                onClick={handleVerifyPickup}
                disabled={actionLoading}
                className="flex-1 btn-primary text-xs sm:text-sm py-2.5 justify-center"
              >
                Verify & Pick Up
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Delivery OTP Modal */}
      {activeModal === 'deliveryOtp' && selectedTask && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-[#e8e2d5] animate-scale-in">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                <HiKey size={20} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#172117]" style={{ fontFamily: 'var(--font-sans)' }}>
                  Enter Delivery Dropoff OTP
                </h3>
                <p className="text-xs text-gray-500">Ask the NGO staff for their 6-digit handover code</p>
              </div>
            </div>

            <div className="my-6">
              <input
                type="text"
                maxLength={6}
                value={otpInput}
                onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ''))}
                placeholder="654321"
                className="w-full text-center tracking-widest text-2xl font-mono py-3 border-2 border-indigo-200 rounded-2xl focus:border-indigo-600 focus:outline-none bg-indigo-50/20"
              />
              {modalError && (
                <p className="text-xs text-red-600 font-semibold mt-2 flex items-center gap-1">
                  <HiExclamationCircle /> {modalError}
                </p>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setActiveModal(null)}
                className="flex-1 btn-secondary text-xs sm:text-sm py-2.5 justify-center"
              >
                Cancel
              </button>
              <button
                onClick={handleVerifyDelivery}
                disabled={actionLoading}
                className="flex-1 btn-primary text-xs sm:text-sm py-2.5 justify-center bg-indigo-700 hover:bg-indigo-800"
              >
                Verify Delivery
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 3: Delivery Proof & Final Complete */}
      {activeModal === 'proof' && selectedTask && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-[#e8e2d5] animate-scale-in">
            <h3 className="text-lg font-bold text-[#172117] mb-1" style={{ fontFamily: 'var(--font-sans)' }}>
              Complete Delivery
            </h3>
            <p className="text-xs text-gray-500 mb-4">Attach an optional photo of handover & notes</p>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Proof Photo (Optional)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setProofFile(e.target.files[0])}
                  className="input-field text-xs file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100 cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Handover Notes</label>
                <textarea
                  rows={3}
                  value={deliveryNotes}
                  onChange={(e) => setDeliveryNotes(e.target.value)}
                  placeholder="e.g. Handed 50 lunch packets to pantry coordinator"
                  className="input-field text-xs"
                />
              </div>

              {modalError && (
                <p className="text-xs text-red-600 font-semibold flex items-center gap-1">
                  <HiExclamationCircle /> {modalError}
                </p>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setActiveModal(null)}
                className="flex-1 btn-secondary text-xs sm:text-sm py-2.5 justify-center"
              >
                Cancel
              </button>
              <button
                onClick={handleCompleteTask}
                disabled={actionLoading}
                className="flex-1 btn-primary text-xs sm:text-sm py-2.5 justify-center"
              >
                Finish & Mark Delivered
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 4: Vehicle & Profile Edit */}
      {activeModal === 'profile' && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-[#e8e2d5] animate-scale-in">
            <h3 className="text-lg font-bold text-[#172117] mb-2" style={{ fontFamily: 'var(--font-sans)' }}>
              Update Vehicle Information
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              Keeping your transport type accurate helps NGOs match appropriate food quantities.
            </p>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Vehicle Type & Estimated Capacity</label>
                <select
                  value={vehicleType}
                  onChange={(e) => setVehicleType(e.target.value)}
                  className="input-field text-xs sm:text-sm font-medium"
                >
                  <option value="car">🚗 Car (Capacity: 50–100 meals)</option>
                  <option value="bike">🏍️ Motorcycle (Capacity: 10–25 meals)</option>
                  <option value="scooter">🛵 Scooter (Capacity: 10–25 meals)</option>
                  <option value="van">🚐 Van / Mini-Truck (Capacity: 150–300+ meals)</option>
                  <option value="bicycle">🚲 Bicycle (Capacity: 5–10 meals)</option>
                  <option value="other">🚶 On Foot / Other (Small parcels)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Vehicle Plate / Registration</label>
                <input
                  type="text"
                  value={vehicleNumber}
                  onChange={(e) => setVehicleNumber(e.target.value)}
                  placeholder="e.g. GJ-07-AB-1234"
                  className="input-field"
                />
              </div>

              {modalError && (
                <p className="text-xs text-red-600 font-semibold">{modalError}</p>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setActiveModal(null)}
                className="flex-1 btn-secondary text-xs sm:text-sm py-2.5 justify-center"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateVehicleProfile}
                disabled={actionLoading}
                className="flex-1 btn-primary text-xs sm:text-sm py-2.5 justify-center"
              >
                Save Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Report Complaint / Issue Modal */}
      <ReportComplaintModal
        isOpen={isReportModalOpen}
        onClose={() => {
          setIsReportModalOpen(false);
          setSelectedTaskForReport(null);
        }}
        donation={selectedTaskForReport}
        onSuccess={() => {
          setFeedback({
            type: 'success',
            message: 'Official report submitted. Platform administrators will investigate.',
          });
        }}
      />
    </DashboardLayout>
  );
};

export default VolunteerDashboard;
