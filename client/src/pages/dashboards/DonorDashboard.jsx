import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../components/layout/DashboardLayout';
import {
  HiGift,
  HiHeart,
  HiUserGroup,
  HiStar,
  HiPlus,
  HiSearch,
  HiFilter,
  HiLocationMarker,
  HiCheckCircle,
  HiClock,
  HiSparkles,
  HiArrowRight,
  HiShieldCheck,
  HiPhone,
  HiTrendingUp,
  HiX,
  HiInformationCircle,
} from 'react-icons/hi';
import DonationCard from '../../components/donations/DonationCard';
import CreateDonationModal from '../../components/donations/CreateDonationModal';
import EditDonationModal from '../../components/donations/EditDonationModal';
import StatCounter from '../../components/ui/StatCounter';
import StatusBadge from '../../components/ui/StatusBadge';
import EmptyState from '../../components/ui/EmptyState';
import { StatSkeleton, ListSkeleton } from '../../components/ui/Skeleton';
import {
  createDonation,
  getDonorDonations,
  updateDonation,
  cancelDonation,
} from '../../services/donationService';
import { getVerifiedNgos } from '../../services/ngoService';

const DonorDashboard = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  // Active navigation tab: 'dashboard' | 'donations' | 'ngos' | 'impact'
  const activeTab = searchParams.get('tab') || 'dashboard';

  const [donations, setDonations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedDonation, setSelectedDonation] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState(null);

  // Filters for "My Donations" view
  const [statusFilter, setStatusFilter] = useState('all');
  const [donationSearch, setDonationSearch] = useState('');

  // Real NGO data from MongoDB backend
  const [ngos, setNgos] = useState([]);
  const [isNgosLoading, setIsNgosLoading] = useState(false);
  const [ngoSearch, setNgoSearch] = useState('');
  const [ngoCategoryFilter, setNgoCategoryFilter] = useState('all');
  const [selectedNgoModal, setSelectedNgoModal] = useState(null);

  useEffect(() => {
    fetchDonations();
    fetchNgos();
  }, []);

  const fetchDonations = async () => {
    try {
      setIsLoading(true);
      setError('');
      const data = await getDonorDonations();
      setDonations(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setError('Failed to load donations. Please try refreshing.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchNgos = async () => {
    try {
      setIsNgosLoading(true);
      const data = await getVerifiedNgos();

      // Standard category taxonomy mapping
      const normalizeCategories = (rawCats) => {
        if (!Array.isArray(rawCats) || rawCats.length === 0) {
          return ['Cooked Meals', 'Fresh Produce', 'Packaged Food'];
        }
        return rawCats.map((c) => {
          const lower = c.toLowerCase();
          if (lower.includes('cooked') || lower.includes('meal')) return 'Cooked Meals';
          if (lower.includes('fruit') || lower.includes('veg') || lower.includes('produce')) return 'Fresh Produce';
          if (lower.includes('bake') || lower.includes('bread')) return 'Bakery';
          if (lower.includes('pack') || lower.includes('dry') || lower.includes('good')) return 'Packaged Food';
          return c;
        });
      };

      const formatted = (Array.isArray(data) ? data : []).map((n, idx) => {
        const addressParts = [
          n.address?.street,
          n.address?.city,
          n.address?.state,
        ].filter(Boolean);
        const locationStr = addressParts.length > 0 ? addressParts.join(', ') : (n.user?.address || 'Local Community');

        // Only display proximity distance if an actual distance metric exists
        const distanceStr = n.distance && typeof n.distance === 'string' && (n.distance.includes('km') || n.distance.includes('away'))
          ? n.distance
          : null;

        const realCover = n.coverImageUrl || (n.documentUrl && !n.documentUrl.endsWith('.pdf') ? n.documentUrl : null);
        const realLogo = n.logoUrl || null;

        return {
          id: n._id || `ngo-${idx}`,
          name: n.organizationName || n.user?.name || 'Verified NGO',
          verified: n.verificationStatus === 'approved' || n.user?.isVerified,
          location: locationStr,
          distance: distanceStr,
          categories: normalizeCategories(n.categories),
          pickupHours: n.pickupHours || '9 AM – 7 PM',
          responseTime: n.responseTime || 'Usually responds within 30 min',
          rating: n.rating ? `${n.rating} ★` : 'Verified Partner',
          coverImage: realCover,
          logoUrl: realLogo,
          phone: n.user?.phone || 'Available via ShareBite messaging',
          email: n.user?.email || '',
          website: n.website || '',
          description: n.description || 'Verified non-profit partner actively collecting surplus food and distributing it to local communities in need.',
        };
      });
      setNgos(formatted);
    } catch (err) {
      console.error('Failed to fetch verified NGOs:', err);
    } finally {
      setIsNgosLoading(false);
    }
  };

  const showFeedback = (text, type = 'success') => {
    setFeedback({ text, type });
    setTimeout(() => setFeedback(null), 4000);
  };

  const handleCreateDonation = async (formData) => {
    try {
      setIsSubmitting(true);
      await createDonation(formData);
      showFeedback('Food donation listed successfully!');
      fetchDonations();
    } catch (err) {
      console.error(err);
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditClick = (donation) => {
    setSelectedDonation(donation);
    setIsEditModalOpen(true);
  };

  const handleUpdateDonation = async (id, formData) => {
    try {
      setIsSubmitting(true);
      await updateDonation(id, formData);
      setIsEditModalOpen(false);
      setSelectedDonation(null);
      showFeedback('Donation updated successfully!');
      fetchDonations();
    } catch (err) {
      console.error(err);
      alert('Failed to update donation. Please check details.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelDonation = async (id) => {
    if (window.confirm('Are you sure you want to cancel this donation?')) {
      try {
        await cancelDonation(id);
        showFeedback('Donation cancelled.', 'info');
        fetchDonations();
      } catch (err) {
        console.error(err);
        alert('Failed to cancel donation');
      }
    }
  };

  const handleTabChange = (tabName) => {
    setSearchParams({ tab: tabName });
  };

  // Dynamic greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  // Parse numeric meal portions from quantity string (e.g., '50 meals', '40 plates', '25 kg')
  const parseQuantityNumber = (str) => {
    if (!str) return 0;
    const match = String(str).match(/\d+/);
    return match ? parseInt(match[0], 10) : 0;
  };

  // Helper to extract true estimated meals reliably from donation
  const getEstimatedMeals = (d) => {
    if (!d) return 0;
    if (typeof d.estimatedMeals === 'number' && d.estimatedMeals > 0) {
      return d.estimatedMeals;
    }
    if (d.description) {
      const descMatch = String(d.description).match(/Estimated:\s*~(\d+)\s*meals/i);
      if (descMatch) return parseInt(descMatch[1], 10);
    }
    const qtyStr = String(d.quantity || '').toLowerCase();
    if (qtyStr.includes('kg')) {
      const kgMatch = qtyStr.match(/(\d+(\.\d+)?)/);
      if (kgMatch) {
        return Math.max(1, Math.round(parseFloat(kgMatch[1]) * 2.5));
      }
    }
    const num = parseQuantityNumber(d.quantity);
    return num > 0 ? num : 1;
  };

  // Valid non-cancelled/non-expired donations submitted by the donor
  const validDonations = useMemo(
    () => donations.filter((d) => d.status !== 'cancelled' && d.status !== 'expired'),
    [donations]
  );

  // Active donations currently in progress
  const activeDonations = useMemo(
    () => donations.filter((d) => ['pending', 'accepted', 'assigned', 'scheduled', 'picked_up'].includes(d.status)),
    [donations]
  );

  // Completed donations delivered by NGO partners
  const completedDonations = useMemo(
    () => donations.filter((d) => ['delivered', 'completed'].includes(d.status)),
    [donations]
  );

  // Meals actually redistributed from completed donations only
  const completedMeals = useMemo(() => {
    return completedDonations.reduce((sum, d) => {
      return sum + getEstimatedMeals(d);
    }, 0);
  }, [completedDonations]);

  // People reached: estimated at 1 meal portion = 1 beneficiary served
  const estimatedPeopleReached = completedMeals;

  // Estimated food rescued in kilograms (~0.4 kg standard prepared meal portion)
  const estimatedFoodRescuedKg = Math.round(completedMeals * 0.4);

  // Backward-compatibility aliases
  const totalMealsShared = completedMeals;
  const foodSavedKg = estimatedFoodRescuedKg;
  const peopleReached = estimatedPeopleReached;

  // Impact Score: Simple deterministic score based strictly on actual completed deliveries and meals
  // 10 points per completed delivery + 1 point per 5 meals redistributed
  const impactScore = (completedDonations.length * 10) + Math.floor(completedMeals / 5);

  // Historical monthly trend of completed donations (only displayed if at least 2 distinct months of data exist)
  const monthlyImpactTrend = useMemo(() => {
    if (completedDonations.length < 2) return [];

    const monthMap = {};
    completedDonations.forEach((d) => {
      const date = new Date(d.createdAt);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const label = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      const meals = getEstimatedMeals(d);

      if (!monthMap[key]) {
        monthMap[key] = { key, label, meals: 0, count: 0 };
      }
      monthMap[key].meals += meals;
      monthMap[key].count += 1;
    });

    const sorted = Object.values(monthMap).sort((a, b) => a.key.localeCompare(b.key));
    return sorted.length >= 2 ? sorted : [];
  }, [completedDonations]);

  // Most prominent active donation
  const primaryActiveDonation = activeDonations[0] || null;

  // Filtered donations list for "My Donations" view
  // Search covers food name, location/city/street, NGO partner, volunteer, and description/notes
  const filteredDonations = useMemo(() => {
    const term = donationSearch.trim().toLowerCase();
    return donations.filter((d) => {
      const matchSearch =
        term === '' ||
        d.foodType?.toLowerCase().includes(term) ||
        d.description?.toLowerCase().includes(term) ||
        d.pickupLocation?.city?.toLowerCase().includes(term) ||
        d.pickupLocation?.street?.toLowerCase().includes(term) ||
        d.acceptedBy?.name?.toLowerCase().includes(term) ||
        d.assignedVolunteer?.name?.toLowerCase().includes(term);

      const matchStatus =
        statusFilter === 'all' ||
        (statusFilter === 'scheduled'
          ? ['assigned', 'scheduled'].includes(d.status)
          : statusFilter === 'picked_up'
          ? ['picked_up', 'in_transit'].includes(d.status)
          : statusFilter === 'delivered'
          ? ['delivered', 'completed'].includes(d.status)
          : d.status === statusFilter);

      return matchSearch && matchStatus;
    });
  }, [donations, donationSearch, statusFilter]);

  // Filtered Community NGOs from real database records
  // Search covers name, location, description, and accepted food categories
  const filteredNgos = useMemo(() => {
    const term = ngoSearch.trim().toLowerCase();
    return ngos.filter((ngo) => {
      const matchSearch =
        term === '' ||
        ngo.name?.toLowerCase().includes(term) ||
        ngo.location?.toLowerCase().includes(term) ||
        ngo.description?.toLowerCase().includes(term) ||
        ngo.categories?.some((c) => c.toLowerCase().includes(term));

      const matchCategory =
        ngoCategoryFilter === 'all' ||
        ngo.categories?.some((c) => c.toLowerCase() === ngoCategoryFilter.toLowerCase());

      return matchSearch && matchCategory;
    });
  }, [ngos, ngoSearch, ngoCategoryFilter]);

  // Derived Activity Feed from donation timeline
  const recentActivities = useMemo(() => {
    const events = [];
    donations.forEach((d) => {
      if (d.timeline && d.timeline.length > 0) {
        d.timeline.forEach((ev) => {
          events.push({
            id: `${d._id}-${ev.time}`,
            foodType: d.foodType,
            status: ev.status,
            description: ev.description,
            time: new Date(ev.time),
          });
        });
      } else {
        events.push({
          id: `${d._id}-created`,
          foodType: d.foodType,
          status: d.status,
          description: `Donation listed: ${d.foodType} (${d.quantity})`,
          time: new Date(d.createdAt),
        });
      }
    });

    return events.sort((a, b) => b.time - a.time).slice(0, 6);
  }, [donations]);

  return (
    <DashboardLayout activeTab={activeTab} onTabChange={handleTabChange}>
      {/* Toast Feedback */}
      {feedback && (
        <div
          className={`mb-6 p-4 rounded-2xl border text-sm font-semibold flex items-center gap-2.5 animate-fade-in-up ${
            feedback.type === 'info'
              ? 'bg-blue-50 text-blue-800 border-blue-200'
              : 'bg-emerald-50 text-emerald-800 border-emerald-200'
          }`}
        >
          <HiCheckCircle size={20} className="shrink-0" />
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Top Banner / Welcome Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 animate-fade-in-up">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl sm:text-2xl font-bold text-[#172117]">
              {getGreeting()}, {user?.name?.split(' ')[0] || 'Donor'} 👋
            </span>
          </div>
          <p className="text-sm sm:text-base text-gray-600 font-normal">
            "Let's make today's food count."
          </p>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="btn-primary text-sm sm:text-base px-6 py-3 shadow-md shadow-primary-900/10 hover:shadow-primary-900/20"
        >
          <HiPlus size={20} />
          <span>Create Donation</span>
        </button>
      </div>

      {/* Stats Section with Animated Number Counters */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5 mb-10">
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
              value={validDonations.length}
              label="Donations Made"
              icon={HiGift}
              subtext={
                activeDonations.length === 0
                  ? '0 currently active'
                  : `${activeDonations.length} currently active · ${completedDonations.length} completed`
              }
              tooltip="Total food donations submitted by your account, excluding cancelled requests."
            />
            <StatCounter
              value={completedMeals}
              label="Meals Shared"
              icon={HiHeart}
              subtext={completedDonations.length > 0 ? "From completed deliveries" : "Awaiting completed deliveries"}
              tooltip="Total meal portions from your completed, delivered donations."
            />
            <StatCounter
              value={estimatedPeopleReached}
              label="Estimated People Reached"
              icon={HiUserGroup}
              subtext="Estimated at 1 meal/person"
              tooltip="Direct hunger relief metric: Estimated using 1 meal portion = 1 person served. This reflects meals delivered, not unique individuals."
            />
            <StatCounter
              value={impactScore}
              label="Impact Score"
              icon={HiStar}
              subtext={completedDonations.length > 0 ? `${completedDonations.length} fulfilled deliver${completedDonations.length > 1 ? 'ies' : 'y'}` : 'Awaiting completed deliveries'}
              tooltip={`Impact Score: ${impactScore} pts\n\nCalculation Formula:\n• 10 pts per completed delivery (${completedDonations.length})\n• 1 pt per 5 meals redistributed (${Math.floor(completedMeals / 5)})\n\nDirectly reflects verified delivered contributions.`}
            />
          </>
        )}
      </div>

      {/* ================= VIEW 1: MAIN DASHBOARD ================= */}
      {activeTab === 'dashboard' && (
        <div className="space-y-10 animate-fade-in">
          {/* ACTIVE DONATION SECTION (Focus of the page) */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <h2
                  className="text-xl sm:text-2xl font-extrabold text-[#172117] tracking-tight"
                  style={{ fontFamily: 'var(--font-sans)' }}
                >
                  Active Donation
                </h2>
                {activeDonations.length > 0 && (
                  <span className="bg-primary-100 text-primary-800 text-xs font-bold px-2.5 py-0.5 rounded-full">
                    {activeDonations.length} Live
                  </span>
                )}
              </div>

              {activeDonations.length > 1 && (
                <button
                  onClick={() => handleTabChange('donations')}
                  className="text-xs font-semibold text-primary-700 hover:text-primary-800 flex items-center gap-1 cursor-pointer"
                >
                  <span>View all {activeDonations.length} active</span>
                  <HiArrowRight size={14} />
                </button>
              )}
            </div>

            {isLoading ? (
              <div className="surface-card p-12 text-center text-gray-400">
                Loading your donation status...
              </div>
            ) : primaryActiveDonation ? (
              <DonationCard
                donation={primaryActiveDonation}
                onEdit={handleEditClick}
                onCancel={handleCancelDonation}
                highlightActive={true}
              />
            ) : (
              <EmptyState
                icon={HiGift}
                title="No Active Donations Right Now"
                description="You don't have any pending or in-transit donations. Share your surplus food today and nourish someone in need."
                actionLabel="+ Create Donation"
                onAction={() => setIsCreateModalOpen(true)}
              />
            )}
          </section>

          {/* TWO COLUMN SECTION: Impact & Recent Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Impact Section 🌱 (7 cols) */}
            <section className="lg:col-span-7">
              <div className="surface-card p-6 sm:p-8 bg-gradient-to-br from-white via-[#fbfaf6] to-primary-50/40 border-primary-200/90 relative overflow-hidden">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <span className="text-[11px] font-bold text-primary-700 uppercase tracking-wider block">
                      Real-World Impact
                    </span>
                    <h3
                      className="text-xl sm:text-2xl font-extrabold text-[#172117] tracking-tight mt-0.5 flex items-center gap-2"
                      style={{ fontFamily: 'var(--font-sans)' }}
                    >
                      Your Impact 🌱
                    </h3>
                  </div>
                  <span className="bg-primary-100 text-primary-800 text-xs font-bold px-3 py-1 rounded-full">
                    Verified Contributions
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-6 text-center sm:text-left">
                  <div className="p-4 rounded-2xl bg-white/80 border border-[#e8e2d5]/60 shadow-2xs">
                    <p className="text-2xl sm:text-3xl font-extrabold text-primary-700 leading-none" style={{ fontFamily: 'var(--font-sans)' }}>
                      {completedMeals}
                    </p>
                    <p className="text-xs font-semibold text-gray-600 mt-1">Meals Shared</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-white/80 border border-[#e8e2d5]/60 shadow-2xs">
                    <p className="text-2xl sm:text-3xl font-extrabold text-emerald-700 leading-none" style={{ fontFamily: 'var(--font-sans)' }}>
                      {estimatedFoodRescuedKg} kg
                    </p>
                    <p className="text-xs font-semibold text-gray-600 mt-1">Food Saved</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-white/80 border border-[#e8e2d5]/60 shadow-2xs">
                    <p className="text-2xl sm:text-3xl font-extrabold text-amber-700 leading-none" style={{ fontFamily: 'var(--font-sans)' }}>
                      {estimatedPeopleReached}
                    </p>
                    <p className="text-xs font-semibold text-gray-600 mt-1">People Reached</p>
                  </div>
                </div>

                {/* Impact Visual Progress Bar */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs text-gray-600">
                    <span className="font-semibold">Next Community Milestones: 250 Meals</span>
                    <span className="font-bold text-primary-700">
                      {Math.min(100, Math.round((completedMeals / 250) * 100))}%
                    </span>
                  </div>
                  <div className="h-2.5 w-full bg-[#e8e2d5] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-primary-600 to-emerald-500 rounded-full transition-all duration-700"
                      style={{
                        width: `${Math.min(100, Math.round((completedMeals / 250) * 100))}%`,
                      }}
                    />
                  </div>
                  <p className="text-[11px] text-gray-500 mt-2">
                    Surplus food diverted directly supports community nutrition and reduces food waste in landfills.
                  </p>
                </div>
              </div>
            </section>

            {/* Recent Activity Feed (5 cols) */}
            <section className="lg:col-span-5">
              <div className="surface-card p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3
                    className="text-lg font-bold text-[#172117] tracking-tight"
                    style={{ fontFamily: 'var(--font-sans)' }}
                  >
                    Recent Activity
                  </h3>
                  <span className="text-[11px] font-semibold text-gray-400">Live Timeline</span>
                </div>

                {recentActivities.length === 0 ? (
                  <p className="text-xs text-gray-400 py-6 text-center">
                    No recent activities yet. Create your first donation!
                  </p>
                ) : (
                  <div className="space-y-3.5 relative before:absolute before:inset-0 before:left-3 before:w-0.5 before:bg-[#e8e2d5] before:-z-0">
                    {recentActivities.map((act) => (
                      <div key={act.id} className="relative z-10 flex items-start gap-3">
                        <div className="h-6 w-6 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center shrink-0 ring-4 ring-white shadow-2xs">
                          <HiCheckCircle size={15} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-gray-800 leading-tight">
                            {act.description}
                          </p>
                          <p className="text-[10px] text-gray-400 mt-0.5">
                            {act.time.toLocaleDateString([], { month: 'short', day: 'numeric' })} at{' '}
                            {act.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>
      )}

      {/* ================= VIEW 2: MY DONATIONS ================= */}
      {activeTab === 'donations' && (
        <div className="space-y-6 animate-fade-in">
          {/* Header */}
          <div className="mb-2">
            <h2
              className="text-2xl sm:text-3xl font-extrabold text-[#172117] tracking-tight"
              style={{ fontFamily: 'var(--font-sans)' }}
            >
              My Donations
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Track and manage your current and past food contributions.
            </p>
          </div>

          {/* Search & Status Filters Bar */}
          <div className="surface-card p-4 flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Search Input */}
            <div className="relative w-full md:w-80">
              <HiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                value={donationSearch}
                onChange={(e) => setDonationSearch(e.target.value)}
                placeholder="Search donations..."
                className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm border border-[#e8e2d5] rounded-xl focus:ring-2 focus:ring-primary-500 focus:outline-none bg-[#faf8f4]"
              />
            </div>

            {/* Filter Pills */}
            <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
              {[
                { key: 'all', label: 'All' },
                { key: 'pending', label: 'Pending' },
                { key: 'accepted', label: 'Accepted' },
                { key: 'scheduled', label: 'Scheduled' },
                { key: 'picked_up', label: 'In Transit' },
                { key: 'delivered', label: 'Completed' },
                { key: 'cancelled', label: 'Cancelled' },
                { key: 'expired', label: 'Expired' },
              ].map((pill) => (
                <button
                  key={pill.key}
                  onClick={() => setStatusFilter(pill.key)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                    statusFilter === pill.key
                      ? 'bg-primary-600 text-white shadow-2xs'
                      : 'bg-white text-gray-600 hover:bg-gray-100 border border-[#e8e2d5]'
                  }`}
                >
                  {pill.label}
                </button>
              ))}
            </div>
          </div>

          {/* Donations List / Table View */}
          {isLoading ? (
            <ListSkeleton count={4} />
          ) : filteredDonations.length === 0 ? (
            <EmptyState
              icon={HiGift}
              title={donationSearch || statusFilter !== 'all' ? 'No matching donations found' : 'No donations listed yet'}
              description={
                donationSearch || statusFilter !== 'all'
                  ? 'Try clearing the search or changing the filter.'
                  : 'Get started by sharing your first surplus meal with our NGO network.'
              }
              actionLabel={statusFilter !== 'all' || donationSearch ? 'Reset Filters' : '+ Create Donation'}
              onAction={() => {
                if (statusFilter !== 'all' || donationSearch) {
                  setStatusFilter('all');
                  setDonationSearch('');
                } else {
                  setIsCreateModalOpen(true);
                }
              }}
            />
          ) : (
            <div className="space-y-4">
              {filteredDonations.map((donation) => (
                <DonationCard
                  key={donation._id}
                  donation={donation}
                  onEdit={handleEditClick}
                  onCancel={handleCancelDonation}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ================= VIEW 3: NEARBY VERIFIED NGOS ================= */}
      {activeTab === 'ngos' && (
        <div className="space-y-6 animate-fade-in">
          {/* Header */}
          <div>
            <h2
              className="text-2xl sm:text-3xl font-extrabold text-[#172117] tracking-tight"
              style={{ fontFamily: 'var(--font-sans)' }}
            >
              Nearby Verified NGOs
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Explore verified organizations working near you · See who receives and distributes food in your community.
            </p>
          </div>

          {/* How It Works Notice Banner */}
          <div className="surface-card p-4 sm:p-5 border-l-4 border-l-primary-600 bg-primary-50/60 flex items-start gap-3.5">
            <HiInformationCircle className="text-primary-700 shrink-0 mt-0.5" size={22} />
            <div className="text-xs sm:text-sm text-primary-950 leading-relaxed">
              <span className="font-bold text-primary-900">How food distribution works:</span> When you create a donation, ShareBite automatically notifies nearby verified NGOs and volunteer teams. You don't need to choose a partner. This directory lets you see the organizations active in your area and learn more about their mission and community work.
            </div>
          </div>

          {/* Search & Category Filter */}
          <div className="surface-card p-4 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="relative w-full md:w-80">
              <HiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                value={ngoSearch}
                onChange={(e) => setNgoSearch(e.target.value)}
                placeholder="Search NGOs by name, location, or food type..."
                className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm border border-[#e8e2d5] rounded-xl focus:ring-2 focus:ring-primary-500 focus:outline-none bg-[#faf8f4]"
              />
            </div>

            <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
              {[
                { key: 'all', label: 'All' },
                { key: 'Cooked Meals', label: 'Cooked Meals' },
                { key: 'Fresh Produce', label: 'Fresh Produce' },
                { key: 'Bakery', label: 'Bakery' },
                { key: 'Packaged Food', label: 'Packaged Food' },
              ].map((pill) => (
                <button
                  key={pill.key}
                  onClick={() => setNgoCategoryFilter(pill.key)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                    ngoCategoryFilter === pill.key
                      ? 'bg-primary-600 text-white shadow-2xs'
                      : 'bg-white text-gray-600 hover:bg-gray-100 border border-[#e8e2d5]'
                  }`}
                >
                  {pill.label}
                </button>
              ))}
            </div>
          </div>

          {/* NGO Profiles Grid or Loading / Empty State */}
          {isNgosLoading ? (
            <ListSkeleton count={3} />
          ) : filteredNgos.length === 0 ? (
            <EmptyState
              icon={HiShieldCheck}
              title={ngoSearch || ngoCategoryFilter !== 'all' ? 'No matching NGOs found' : 'No verified NGOs registered yet'}
              description={
                ngoSearch || ngoCategoryFilter !== 'all'
                  ? 'Try clearing your search query or selecting "All".'
                  : 'As NGOs register and are approved by the platform administrator, they will automatically appear in this community directory.'
              }
              actionLabel={ngoSearch || ngoCategoryFilter !== 'all' ? 'Reset Filters' : undefined}
              onAction={() => {
                setNgoSearch('');
                setNgoCategoryFilter('all');
              }}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredNgos.map((ngo) => (
                <div
                  key={ngo.id}
                  className="surface-card overflow-hidden hover:border-primary-300 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="h-44 w-full relative overflow-hidden bg-gradient-to-br from-primary-950 via-primary-900 to-emerald-950 flex items-center justify-center">
                      {ngo.coverImage ? (
                        <img
                          src={ngo.coverImage}
                          alt={ngo.name}
                          className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                        />
                      ) : (
                        <div className="w-full h-full p-6 flex flex-col justify-between relative select-none">
                          <div className="absolute -right-6 -bottom-6 w-32 h-32 rounded-full bg-emerald-500/10 blur-xl pointer-events-none" />
                          <div className="flex items-center justify-between z-10">
                            <span className="text-[10px] uppercase tracking-wider font-extrabold text-emerald-300/90 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/20">
                              Community Partner
                            </span>
                          </div>
                          <div className="flex items-center gap-3 z-10">
                            <div className="h-12 w-12 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-white flex items-center justify-center font-extrabold text-lg shadow-sm shrink-0 overflow-hidden">
                              {ngo.logoUrl ? (
                                <img src={ngo.logoUrl} alt={ngo.name} className="h-full w-full object-cover" />
                              ) : (
                                ngo.name?.slice(0, 2).toUpperCase() || 'NGO'
                              )}
                            </div>
                            <div className="min-w-0">
                              <h4 className="text-white font-bold text-sm truncate">{ngo.name}</h4>
                              <p className="text-emerald-200/80 text-[11px] flex items-center gap-1">
                                <HiShieldCheck size={13} className="text-emerald-400 shrink-0" /> Verified Food Partner
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                      <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-xs px-2.5 py-1 rounded-full text-xs font-bold text-primary-800 flex items-center gap-1 shadow-2xs z-20">
                        <HiShieldCheck className="text-primary-600" size={16} /> Verified NGO
                      </div>
                    </div>

                    <div className="p-5">
                      <h3
                        className="text-lg font-bold text-[#172117] leading-snug"
                        style={{ fontFamily: 'var(--font-sans)' }}
                      >
                        {ngo.name}
                      </h3>
                      <div className="text-xs text-gray-500 mt-1 flex items-center gap-1.5 flex-wrap">
                        <span className="flex items-center gap-1">
                          <HiLocationMarker className="text-primary-600 shrink-0" size={15} />
                          <span>{ngo.location}</span>
                        </span>
                        {ngo.distance && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/80">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            {ngo.distance}
                          </span>
                        )}
                      </div>

                      <div className="mt-3.5 space-y-2.5 text-xs">
                        <div>
                          <span className="text-gray-400 font-medium">Accepts:</span>
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            {ngo.categories.map((cat) => (
                              <span
                                key={cat}
                                className="px-2 py-0.5 rounded-md bg-primary-50 text-primary-800 text-[11px] font-semibold border border-primary-100"
                              >
                                {cat}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="pt-2.5 border-t border-gray-100 text-[11px] text-gray-600 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-gray-700 font-medium">🕒 {ngo.pickupHours}</span>
                            <span className="text-emerald-700 font-semibold flex items-center gap-1">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                              Accepting donations
                            </span>
                          </div>
                          <p className="text-gray-500">⚡ {ngo.responseTime}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-5 pt-0">
                    <button
                      onClick={() => setSelectedNgoModal(ngo)}
                      className="w-full btn-secondary text-xs sm:text-sm py-2.5 justify-center flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>View NGO Profile</span>
                      <span>→</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ================= VIEW 4: IMPACT ================= */}
      {activeTab === 'impact' && (
        <div className="space-y-8 animate-fade-in max-w-4xl mx-auto">
          <div>
            <h2
              className="text-2xl sm:text-3xl font-extrabold text-[#172117] tracking-tight"
              style={{ fontFamily: 'var(--font-sans)' }}
            >
              Your Community Impact Summary 🌱
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Transparent, real-world metrics reflecting verified contributions made through your account.
            </p>
          </div>

          {/* 3 Core Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {/* Card 1: Meals Redistributed */}
            <div className="surface-card p-6 text-center relative group">
              <span className="text-4xl">🍲</span>
              <p className="text-3xl font-extrabold text-primary-700 mt-2" style={{ fontFamily: 'var(--font-sans)' }}>
                {completedMeals}
              </p>
              <div className="flex items-center justify-center gap-1 mt-1">
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Meals Redistributed
                </p>
              </div>
              <p className="text-[11px] text-gray-500 mt-2">
                From your completed donations
              </p>
            </div>

            {/* Card 2: Estimated Food Rescued */}
            <div className="surface-card p-6 text-center relative group">
              <span className="text-4xl">⚖️</span>
              <p className="text-3xl font-extrabold text-emerald-700 mt-2" style={{ fontFamily: 'var(--font-sans)' }}>
                ~{estimatedFoodRescuedKg} kg
              </p>
              <div className="flex items-center justify-center gap-1 mt-1">
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Estimated Food Rescued
                </p>
              </div>
              <p className="text-[11px] text-gray-500 mt-2">
                Estimated at ~0.4 kg/meal portion
              </p>
            </div>

            {/* Card 3: Estimated People Reached */}
            <div className="surface-card p-6 text-center relative group">
              <span className="text-4xl">🤝</span>
              <p className="text-3xl font-extrabold text-amber-700 mt-2" style={{ fontFamily: 'var(--font-sans)' }}>
                {estimatedPeopleReached}
              </p>
              <div className="flex items-center justify-center gap-1 mt-1">
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Estimated People Reached
                </p>
              </div>
              <p className="text-[11px] text-gray-500 mt-2">
                Based on 1 meal/person
              </p>
            </div>
          </div>

          {/* Optional Historical Trend Chart: Displayed only if >= 2 distinct months of real data exist */}
          {monthlyImpactTrend.length >= 2 && (
            <div className="surface-card p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                <div>
                  <h3 className="text-base font-bold text-[#172117]" style={{ fontFamily: 'var(--font-sans)' }}>
                    Meals Redistributed Over Time
                  </h3>
                  <p className="text-xs text-gray-500">
                    Monthly volume of meals delivered through your completed donations.
                  </p>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-primary-700 bg-primary-50 px-2.5 py-1 rounded-full border border-primary-200/80 w-fit">
                  <HiTrendingUp size={15} />
                  <span>Real Activity Data</span>
                </div>
              </div>

              <div className="pt-4 pb-2">
                <div className="grid grid-flow-col auto-cols-fr gap-3 items-end h-40 border-b border-gray-200 pb-2">
                  {(() => {
                    const maxVal = Math.max(...monthlyImpactTrend.map((m) => m.meals), 1);
                    return monthlyImpactTrend.map((item) => {
                      const heightPercent = Math.max(14, Math.round((item.meals / maxVal) * 100));
                      return (
                        <div key={item.key} className="flex flex-col items-center gap-2 h-full justify-end group">
                          <span className="text-[11px] font-bold text-gray-700 opacity-80 group-hover:opacity-100 transition-opacity">
                            {item.meals}
                          </span>
                          <div
                            className="w-full max-w-[48px] bg-primary-600 group-hover:bg-primary-700 rounded-t-lg transition-all duration-300 shadow-2xs"
                            style={{ height: `${heightPercent}%` }}
                          />
                          <span className="text-[10px] text-gray-500 font-medium">
                            {item.label}
                          </span>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            </div>
          )}

          {/* Contribution History Breakdown */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-[#172117]" style={{ fontFamily: 'var(--font-sans)' }}>
                  Your Contribution History
                </h3>
                <p className="text-xs text-gray-500">
                  Record of completed food donations contributing to your impact statistics.
                </p>
              </div>
              <span className="text-xs font-semibold text-primary-800 bg-primary-100 px-3 py-1 rounded-full">
                {completedDonations.length} {completedDonations.length === 1 ? 'donation' : 'donations'} fulfilled
              </span>
            </div>

            {completedDonations.length === 0 ? (
              <div className="surface-card p-8 border-dashed text-center">
                <span className="text-3xl block mb-2">🌱</span>
                <p className="text-sm font-bold text-gray-800">No completed donations yet</p>
                <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                  When your surplus food is collected and delivered by an NGO partner, your contributions and estimated impact will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {completedDonations.map((d) => {
                  const meals = getEstimatedMeals(d);
                  return (
                    <div
                      key={d._id}
                      className="surface-card p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-primary-200 transition-colors"
                    >
                      <div className="flex items-start sm:items-center gap-3.5">
                        <div className="h-10 w-10 rounded-2xl bg-primary-100 text-primary-800 flex items-center justify-center font-bold text-base shrink-0">
                          🍲
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm sm:text-base font-bold text-[#172117]">{d.foodType}</h4>
                            <span className="text-xs font-bold text-primary-800 bg-primary-50 px-2.5 py-0.5 rounded-full border border-primary-200/80">
                              {meals} {meals === 1 ? 'meal' : 'meals'}{d.quantity && !String(d.quantity).toLowerCase().includes('meal') ? ` (${d.quantity})` : ''}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-500 mt-1 flex-wrap">
                            <span>
                              {new Date(d.createdAt).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </span>
                            <span>·</span>
                            <span>{d.pickupLocation?.city || 'Local area'}</span>
                            {d.acceptedBy?.name && (
                              <>
                                <span>·</span>
                                <span>Partner: <strong className="text-gray-700">{d.acceptedBy.name}</strong></span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100">
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200/80">
                          <HiCheckCircle size={14} className="text-emerald-600" />
                          Completed
                        </span>
                        <span className="text-xs font-medium text-gray-600 bg-gray-50 px-2.5 py-1 rounded-full border border-gray-200/80">
                          ≈ {meals} people reached
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* How ShareBite Measures Impact */}
          <div className="surface-card p-6 sm:p-7 bg-[#faf8f4] border-primary-200 space-y-2.5">
            <h3 className="text-base sm:text-lg font-bold text-[#172117]" style={{ fontFamily: 'var(--font-sans)' }}>
              How ShareBite Measures Impact
            </h3>
            <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
              When you create a donation, ShareBite identifies nearby verified NGO partners and makes the donation available for collection. Once a donation is completed, its delivered quantity contributes directly to your impact statistics. People reached is shown as an estimate based on the standard serving metric of one meal per person.
            </p>
            <div className="pt-2 border-t border-[#e8e2d5] text-[11px] text-gray-500 flex items-center gap-1.5">
              <HiInformationCircle className="text-primary-700 shrink-0" size={15} />
              <span>Food rescue weights are estimated using average prepared serving metrics (~400 grams per meal) to gauge diversion from waste.</span>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <CreateDonationModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateDonation}
        isLoading={isSubmitting}
      />

      <EditDonationModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedDonation(null);
        }}
        onSubmit={handleUpdateDonation}
        isLoading={isSubmitting}
        donation={selectedDonation}
      />

      {/* NGO Details & Contact Modal */}
      {selectedNgoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-[#e8e2d5] animate-scale-in">
            <div className="relative h-48 bg-gradient-to-br from-primary-950 via-primary-900 to-emerald-950 overflow-hidden flex items-center justify-center">
              {selectedNgoModal.coverImage ? (
                <img
                  src={selectedNgoModal.coverImage}
                  alt={selectedNgoModal.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full p-6 flex flex-col justify-center items-center text-center relative select-none">
                  <div className="h-16 w-16 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-white flex items-center justify-center font-extrabold text-2xl shadow-md mb-2 overflow-hidden">
                    {selectedNgoModal.logoUrl ? (
                      <img src={selectedNgoModal.logoUrl} alt={selectedNgoModal.name} className="h-full w-full object-cover" />
                    ) : (
                      selectedNgoModal.name?.slice(0, 2).toUpperCase() || 'NGO'
                    )}
                  </div>
                  <h4 className="text-white font-bold text-lg">{selectedNgoModal.name}</h4>
                  <p className="text-emerald-200 text-xs">Verified Food Redistribution Non-Profit</p>
                </div>
              )}
              <button
                onClick={() => setSelectedNgoModal(null)}
                className="absolute top-3 right-3 bg-black/60 hover:bg-black/80 text-white rounded-full p-2 transition-colors cursor-pointer z-30"
                aria-label="Close"
              >
                <HiX size={18} />
              </button>
              <div className="absolute bottom-3 left-4 bg-white/90 backdrop-blur-xs px-3 py-1 rounded-full text-xs font-bold text-primary-800 flex items-center gap-1 shadow-xs z-20">
                <HiShieldCheck className="text-primary-600" size={16} /> Verified Partner
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <h3 className="text-xl font-bold text-[#172117]">
                  {selectedNgoModal.name}
                </h3>
                <div className="text-xs text-gray-500 mt-1 flex items-center gap-1.5 flex-wrap">
                  <span className="flex items-center gap-1">
                    <HiLocationMarker className="text-primary-600 shrink-0" size={15} />
                    <span>{selectedNgoModal.location}</span>
                  </span>
                  {selectedNgoModal.distance && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/80">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      {selectedNgoModal.distance}
                    </span>
                  )}
                </div>
              </div>

              <p className="text-xs sm:text-sm text-gray-600 leading-relaxed bg-[#faf8f4] p-3.5 rounded-xl border border-[#e8e2d5]">
                {selectedNgoModal.description}
              </p>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                  <p className="text-gray-400 font-medium">Pickup Hours</p>
                  <p className="font-semibold text-gray-700 mt-0.5">{selectedNgoModal.pickupHours}</p>
                </div>
                <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                  <p className="text-gray-400 font-medium">Response Time</p>
                  <p className="font-semibold text-emerald-700 mt-0.5">{selectedNgoModal.responseTime}</p>
                </div>
              </div>

              <div>
                <p className="text-xs text-gray-400 font-medium mb-1.5">Food Categories Accepted:</p>
                <div className="flex flex-wrap gap-1.5">
                  {selectedNgoModal.categories.map((cat) => (
                    <span
                      key={cat}
                      className="px-2.5 py-1 rounded-md bg-primary-50 text-primary-800 text-xs font-semibold border border-primary-100"
                    >
                      {cat}
                    </span>
                  ))}
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-primary-50/70 border border-primary-200/80 text-xs text-primary-950 leading-relaxed">
                <p className="font-bold text-primary-900 mb-0.5">ℹ️ How donations reach {selectedNgoModal.name}:</p>
                When you create a donation, ShareBite automatically alerts all nearby verified NGOs and volunteer teams. You don't need to manually select this NGO. Use the contact below for organizational questions, volunteering, or general inquiries.
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
                <a
                  href={`tel:${selectedNgoModal.phone?.replace(/\s+/g, '')}`}
                  className="w-full btn-primary py-2.5 text-xs sm:text-sm justify-center flex items-center gap-2"
                >
                  <HiPhone size={16} />
                  <span>Call Helpline: {selectedNgoModal.phone}</span>
                </a>
                <button
                  onClick={() => setSelectedNgoModal(null)}
                  className="w-full sm:w-auto btn-ghost py-2.5 text-xs sm:text-sm px-5 cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default DonorDashboard;
