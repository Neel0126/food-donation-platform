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
  HiFilter
} from 'react-icons/hi';
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
  updateVolunteerProfile
} from '../../services/volunteerService';

const VolunteerDashboard = () => {
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState('available'); // 'available', 'active', 'history'
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState({
    completedDeliveries: 0,
    activeDeliveries: 0,
    availableTasks: 0,
    availabilityStatus: 'available',
    rating: 5.0
  });
  const [availableTasks, setAvailableTasks] = useState([]);
  const [myTasks, setMyTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');

  // Modal states
  const [activeModal, setActiveModal] = useState(null); // 'pickupOtp', 'deliveryOtp', 'proof', 'profile'
  const [selectedTask, setSelectedTask] = useState(null);
  const [otpInput, setOtpInput] = useState('');
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [proofFile, setProofFile] = useState(null);
  const [modalError, setModalError] = useState('');

  // Profile Edit State
  const [vehicleType, setVehicleType] = useState('bike');
  const [vehicleNumber, setVehicleNumber] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

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
        getMyTasks('all').catch(() => [])
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
      setStats(prev => ({ ...prev, availabilityStatus: newStatus }));
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

      // If proof file attached, upload proof first
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

  const activeDeliveriesList = myTasks.filter(t => ['assigned', 'picked_up'].includes(t.status));
  const completedDeliveriesList = myTasks.filter(t => t.status === 'delivered');

  const ratingDisplay = stats.ratingCount > 0
    ? `${Number(stats.rating).toFixed(1)} ★`
    : '5.0 ★';

  const ratingLabel = stats.ratingCount > 0
    ? `Rating (${stats.ratingCount} review${stats.ratingCount > 1 ? 's' : ''})`
    : 'Rating (New Volunteer)';

  const statsCards = [
    { label: 'Deliveries Completed', value: stats.completedDeliveries?.toString() || '0', icon: HiTruck, color: 'bg-green-50 text-green-600' },
    { label: 'Active Deliveries', value: activeDeliveriesList.length.toString(), icon: HiClock, color: 'bg-primary-50 text-primary-600' },
    { label: 'Available in Pool', value: availableTasks.length.toString(), icon: HiLocationMarker, color: 'bg-amber-50 text-amber-600' },
    {
      label: ratingLabel,
      value: ratingDisplay,
      icon: HiThumbUp,
      color: 'bg-indigo-50 text-indigo-600',
      isClickable: true,
      onClick: () => setActiveModal('ratingsBreakdown')
    },
  ];

  return (
    <DashboardLayout>
      {/* Toast Feedback */}
      {feedback && (
        <div
          className={`mb-6 p-4 rounded-2xl border text-sm font-medium flex items-center gap-2 animate-fade-in-up ${
            feedback.type === 'error'
              ? 'bg-red-50 text-red-700 border-red-200'
              : 'bg-green-50 text-green-700 border-green-200'
          }`}
        >
          <HiCheckCircle size={18} />
          {feedback.text}
        </div>
      )}

      {/* Header & Live Status */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 animate-fade-in-up">
        <div>
          <h1 className="text-2xl font-bold text-gray-800" style={{ fontFamily: 'var(--font-sans)' }}>
            Welcome, {user?.name || 'Volunteer'}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Vehicle: <strong className="capitalize text-gray-700">{profile?.vehicleType || 'Bike'}</strong> ({profile?.vehicleNumber || 'No plate added'}) •{' '}
            <button
              onClick={() => {
                setModalError('');
                setActiveModal('profile');
              }}
              className="text-primary-600 font-semibold underline cursor-pointer hover:text-primary-700"
            >
              Edit Vehicle
            </button>
          </p>
        </div>

        {/* Status Selector & Refresh */}
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-white border border-gray-200 p-1 rounded-2xl shadow-xs">
            <span className="text-xs font-semibold px-2 text-gray-500">Status:</span>
            {['available', 'busy', 'offline'].map((st) => (
              <button
                key={st}
                onClick={() => handleStatusChange(st)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all cursor-pointer ${
                  stats.availabilityStatus === st
                    ? st === 'available'
                      ? 'bg-emerald-500 text-white shadow-xs'
                      : st === 'busy'
                      ? 'bg-amber-500 text-white shadow-xs'
                      : 'bg-gray-600 text-white shadow-xs'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          <button
            onClick={fetchData}
            disabled={isLoading}
            className="flex items-center gap-1.5 bg-white border border-gray-200 text-gray-700 px-3.5 py-2 rounded-2xl hover:bg-gray-50 transition-all text-sm font-medium cursor-pointer"
          >
            <HiRefresh className={`${isLoading ? 'animate-spin' : ''}`} size={16} />
          </button>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statsCards.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              onClick={stat.onClick}
              className={`bg-white rounded-2xl border border-primary-100 p-5 flex items-center gap-4 transition-all animate-fade-in-up animate-stagger-${i + 1} ${
                stat.isClickable ? 'cursor-pointer hover:border-indigo-300 hover:shadow-md' : 'hover:shadow-xs'
              }`}
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
          Available Task Pool ({availableTasks.length})
        </button>
        <button
          onClick={() => setActiveTab('active')}
          className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'active'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Active Deliveries ({activeDeliveriesList.length})
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'history'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Completed Deliveries ({completedDeliveriesList.length})
        </button>
      </div>

      {/* Tab 1: Available Tasks */}
      {activeTab === 'available' && (
        <div>
          {/* Location Search Bar for Volunteers */}
          <div className="bg-white border border-primary-100 rounded-2xl p-4 mb-6 shadow-xs">
            <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
              <div className="relative flex-1">
                <HiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter tasks by city, area, street, or food type..."
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
          </div>

          {isLoading ? (
            <div className="p-12 text-center text-gray-400">Searching for available tasks...</div>
          ) : availableTasks.length === 0 ? (
            <div className="bg-white border border-gray-100 rounded-2xl p-12 text-center text-gray-500">
              <p className="font-semibold text-gray-700 mb-1">No delivery tasks match your search right now.</p>
              <p className="text-xs text-gray-400">When NGOs request pickups in your area, they will appear here!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {availableTasks.map((task) => (
                <div key={task._id} className="bg-white border border-primary-100 rounded-2xl p-5 shadow-xs flex flex-col justify-between hover:shadow-md transition-all">
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-bold text-gray-800 text-lg">{task.foodType}</h3>
                      <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full text-xs font-semibold">
                        Ready for Pickup
                      </span>
                    </div>

                    <p className="text-xs text-gray-600 mb-3 line-clamp-2">{task.description || 'No special notes.'}</p>

                    <div className="space-y-2 text-xs text-gray-600 bg-gray-50 p-3 rounded-xl mb-4 border border-gray-100">
                      <div><strong className="text-gray-800">Quantity:</strong> {task.quantity}</div>
                      <div className="flex items-start gap-1">
                        <HiLocationMarker className="text-emerald-600 shrink-0 mt-0.5" />
                        <span><strong>Pickup:</strong> {task.pickupLocation?.street || ''}, <strong className="text-gray-900">{task.pickupLocation?.city || 'Local Area'}</strong></span>
                      </div>
                      <div className="flex items-start gap-1">
                        <HiLocationMarker className="text-indigo-600 shrink-0 mt-0.5" />
                        <span><strong>Dropoff:</strong> {task.dropoffLocation?.street || 'NGO Partner Dropoff Point'}, <strong className="text-gray-900">{task.dropoffLocation?.city || ''}</strong></span>
                      </div>
                      <div className="flex items-center gap-1 text-gray-500">
                        <HiUser className="shrink-0" />
                        <span>Donor: {task.donor?.name || 'Donor'} ({task.donor?.phone || 'No phone'})</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleAcceptTask(task._id)}
                    disabled={actionLoading}
                    className="w-full bg-primary-600 text-white py-2.5 rounded-xl font-semibold text-sm hover:bg-primary-700 transition-all cursor-pointer shadow-xs"
                  >
                    Accept Delivery Task
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Active Deliveries */}
      {activeTab === 'active' && (
        <div>
          {isLoading ? (
            <div className="p-12 text-center text-gray-400">Loading active tasks...</div>
          ) : activeDeliveriesList.length === 0 ? (
            <div className="bg-white border border-gray-100 rounded-2xl p-12 text-center text-gray-500">
              No active tasks right now. Accept a task from the Available Pool!
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {activeDeliveriesList.map((task) => {
                const isPickedUp = task.status === 'picked_up' || task.pickupOtpVerified;
                const isDeliveredOtpVerified = task.deliveryOtpVerified;

                return (
                  <div key={task._id} className="bg-white border border-primary-100 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="font-bold text-gray-800 text-lg">{task.foodType}</h3>
                          <p className="text-xs text-gray-500 font-medium">Quantity: {task.quantity}</p>
                        </div>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                            isPickedUp
                              ? 'bg-purple-100 text-purple-800 border border-purple-200'
                              : 'bg-blue-100 text-blue-800 border border-blue-200'
                          }`}
                        >
                          {isPickedUp ? 'In Transit 🚚' : 'Assigned (Pickup Pending)'}
                        </span>
                      </div>

                      {/* Timeline / Progress Indicator */}
                      <div className="my-4 p-3 bg-gray-50 rounded-2xl border border-gray-100 text-xs">
                        <div className="flex items-center justify-between text-gray-600 mb-2">
                          <span className="font-semibold">Workflow Progress:</span>
                          <span className="font-bold text-primary-600">{isPickedUp ? (isDeliveredOtpVerified ? 'Step 3 of 3 (Complete)' : 'Step 2 of 3 (Delivery)') : 'Step 1 of 3 (Pickup)'}</span>
                        </div>
                        <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-primary-600 h-full transition-all duration-500"
                            style={{ width: isPickedUp ? (isDeliveredOtpVerified ? '90%' : '55%') : '25%' }}
                          />
                        </div>
                      </div>

                      {/* Locations & Contacts */}
                      <div className="space-y-3 text-xs text-gray-600 mb-5">
                        <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-100">
                          <p className="font-bold text-emerald-800 mb-1 flex items-center gap-1">
                            <HiLocationMarker className="text-emerald-600" />
                            1. Pickup Location (Donor)
                          </p>
                          <p className="text-gray-700">{task.pickupLocation?.street}, {task.pickupLocation?.city}</p>
                          <p className="text-gray-500 mt-1">Donor Contact: <strong>{task.donor?.name}</strong> ({task.donor?.phone || 'No phone'})</p>
                        </div>

                        <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-100">
                          <p className="font-bold text-indigo-800 mb-1 flex items-center gap-1">
                            <HiLocationMarker className="text-indigo-600" />
                            2. Delivery Dropoff (NGO)
                          </p>
                          <p className="text-gray-700">{task.dropoffLocation?.street || 'NGO Dropoff Point'}, {task.dropoffLocation?.city || ''}</p>
                          <p className="text-gray-500 mt-1">NGO Contact: <strong>{task.acceptedBy?.name}</strong> ({task.acceptedBy?.phone || 'No phone'})</p>
                        </div>
                      </div>
                    </div>

                    {/* Step-by-Step Actions */}
                    <div className="pt-4 border-t border-gray-100 space-y-2">
                      {!isPickedUp ? (
                        <>
                          <button
                            onClick={() => {
                              setSelectedTask(task);
                              setOtpInput('');
                              setModalError('');
                              setActiveModal('pickupOtp');
                            }}
                            className="w-full bg-emerald-600 text-white py-3 rounded-2xl text-sm font-bold hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-emerald-600/15"
                          >
                            <HiKey size={18} />
                            Arrived at Donor: Enter Pickup OTP
                          </button>

                          <button
                            onClick={() => handleRejectTask(task._id)}
                            disabled={actionLoading}
                            className="w-full bg-gray-100 text-gray-600 py-2 rounded-xl text-xs font-semibold hover:bg-red-50 hover:text-red-600 transition-all cursor-pointer"
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
                              className="w-full bg-indigo-600 text-white py-3 rounded-2xl text-sm font-bold hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-indigo-600/15"
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
                              className="w-full bg-emerald-600 text-white py-3 rounded-2xl text-sm font-bold hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-emerald-600/15 animate-bounce-short"
                            >
                              <HiCheckCircle size={18} />
                              Finalize & Complete Delivery
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Completed Deliveries */}
      {activeTab === 'history' && (
        <div>
          {isLoading ? (
            <div className="p-12 text-center text-gray-400">Loading delivery history...</div>
          ) : completedDeliveriesList.length === 0 ? (
            <div className="bg-white border border-gray-100 rounded-2xl p-12 text-center text-gray-500">
              No completed deliveries yet. Complete your first delivery to earn badges and rating!
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {completedDeliveriesList.map((task) => (
                <div key={task._id} className="bg-white border border-green-100 rounded-2xl p-5 shadow-xs">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-gray-800">{task.foodType}</h3>
                    <span className="bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded-full text-xs font-bold">
                      Delivered ✓
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mb-2">Quantity: {task.quantity}</p>
                  <p className="text-xs text-gray-600">Donor: {task.donor?.name}</p>
                  <p className="text-xs text-gray-600">NGO: {task.acceptedBy?.name}</p>
                  {task.deliveryNotes && (
                    <div className="text-xs italic bg-gray-50 p-2.5 rounded-xl text-gray-600 mt-3 border border-gray-100">
                      "{task.deliveryNotes}"
                    </div>
                  )}
                  <p className="text-[11px] text-gray-400 mt-3">
                    Completed: {task.deliveredAt ? new Date(task.deliveredAt).toLocaleString() : 'Done'}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal 1: Pickup OTP Modal */}
      {activeModal === 'pickupOtp' && selectedTask && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-gray-100 animate-fade-in-up">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <HiKey size={20} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-800" style={{ fontFamily: 'var(--font-sans)' }}>
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
                className="w-full text-center tracking-widest text-2xl font-mono py-3 border-2 border-emerald-200 rounded-2xl focus:border-emerald-500 focus:outline-none bg-emerald-50/30"
              />
              {modalError && (
                <p className="text-xs text-red-600 font-medium mt-2 flex items-center gap-1">
                  <HiExclamationCircle /> {modalError}
                </p>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setActiveModal(null)}
                className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-200 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleVerifyPickup}
                disabled={actionLoading}
                className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition-all cursor-pointer disabled:opacity-50"
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
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-gray-100 animate-fade-in-up">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
                <HiKey size={20} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-800" style={{ fontFamily: 'var(--font-sans)' }}>
                  Enter Delivery OTP
                </h3>
                <p className="text-xs text-gray-500">Ask the NGO staff for their 6-digit delivery code</p>
              </div>
            </div>

            <div className="my-6">
              <input
                type="text"
                maxLength={6}
                value={otpInput}
                onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ''))}
                placeholder="654321"
                className="w-full text-center tracking-widest text-2xl font-mono py-3 border-2 border-indigo-200 rounded-2xl focus:border-indigo-500 focus:outline-none bg-indigo-50/30"
              />
              {modalError && (
                <p className="text-xs text-red-600 font-medium mt-2 flex items-center gap-1">
                  <HiExclamationCircle /> {modalError}
                </p>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setActiveModal(null)}
                className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-200 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleVerifyDelivery}
                disabled={actionLoading}
                className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all cursor-pointer disabled:opacity-50"
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
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-gray-100 animate-fade-in-up">
            <h3 className="text-lg font-bold text-gray-800 mb-1" style={{ fontFamily: 'var(--font-sans)' }}>
              Complete Delivery
            </h3>
            <p className="text-xs text-gray-500 mb-4">Attach optional proof of handover photo & notes</p>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Proof Photo (Optional)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setProofFile(e.target.files[0])}
                  className="w-full text-xs text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100 cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Handover Notes</label>
                <textarea
                  rows={3}
                  value={deliveryNotes}
                  onChange={(e) => setDeliveryNotes(e.target.value)}
                  placeholder="e.g. Handed 40 lunch packets to pantry coordinator"
                  className="w-full p-3 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-primary-500 focus:outline-none"
                />
              </div>

              {modalError && (
                <p className="text-xs text-red-600 font-medium flex items-center gap-1">
                  <HiExclamationCircle /> {modalError}
                </p>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setActiveModal(null)}
                className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-200 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleCompleteTask}
                disabled={actionLoading}
                className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition-all cursor-pointer disabled:opacity-50"
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
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-gray-100 animate-fade-in-up">
            <h3 className="text-lg font-bold text-gray-800 mb-4" style={{ fontFamily: 'var(--font-sans)' }}>
              Update Vehicle Information
            </h3>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Vehicle Type</label>
                <select
                  value={vehicleType}
                  onChange={(e) => setVehicleType(e.target.value)}
                  className="w-full p-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none bg-white"
                >
                  <option value="bike">Motorcycle / Scooter (Bike)</option>
                  <option value="car">Car / Sedan</option>
                  <option value="van">Van / Mini Truck</option>
                  <option value="bicycle">Bicycle</option>
                  <option value="walk">On Foot / Walk</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Vehicle License Plate / Number</label>
                <input
                  type="text"
                  value={vehicleNumber}
                  onChange={(e) => setVehicleNumber(e.target.value)}
                  placeholder="e.g. MH-01-AB-1234"
                  className="w-full p-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none uppercase"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setActiveModal(null)}
                className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-200 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateVehicleProfile}
                disabled={actionLoading}
                className="flex-1 py-2.5 bg-primary-600 text-white rounded-xl text-sm font-bold hover:bg-primary-700 transition-all cursor-pointer disabled:opacity-50"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 5: Ratings & Reviews Breakdown */}
      {activeModal === 'ratingsBreakdown' && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-gray-100 animate-fade-in-up">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-800" style={{ fontFamily: 'var(--font-sans)' }}>
                  Volunteer Ratings & Feedback
                </h3>
                <p className="text-xs text-gray-500">Reviews submitted by partnering NGOs</p>
              </div>
              <div className="text-right">
                <span className="text-2xl font-bold text-amber-500">{stats.ratingCount > 0 ? Number(stats.rating).toFixed(1) : '5.0'} ★</span>
                <p className="text-[10px] text-gray-400">{stats.ratingCount || 0} reviews</p>
              </div>
            </div>

            {/* List of Reviews */}
            <div className="max-h-60 overflow-y-auto space-y-3 my-4 pr-1">
              {(!stats.ratings || stats.ratings.length === 0) ? (
                <div className="p-8 text-center bg-gray-50 rounded-2xl border border-gray-100 text-gray-500 text-xs">
                  <p className="font-semibold text-gray-700 mb-1">No reviews yet!</p>
                  <p className="text-gray-400">Complete deliveries and NGOs will leave star ratings and notes here.</p>
                </div>
              ) : (
                stats.ratings.map((r, index) => (
                  <div key={r._id || index} className="p-3 bg-gray-50 rounded-2xl border border-gray-100 text-xs">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-semibold text-gray-800">{r.ratedBy?.name || 'NGO Partner'}</span>
                      <span className="text-amber-500 font-bold">{'★'.repeat(r.score)} ({r.score}/5)</span>
                    </div>
                    {r.feedback && <p className="text-gray-600 italic mt-1">"{r.feedback}"</p>}
                    <p className="text-[10px] text-gray-400 mt-2">{r.createdAt ? new Date(r.createdAt).toLocaleDateString() : 'Recent'}</p>
                  </div>
                ))
              )}
            </div>

            <button
              onClick={() => setActiveModal(null)}
              className="w-full py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-200 transition-all cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default VolunteerDashboard;
