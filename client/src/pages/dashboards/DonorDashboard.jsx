import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { HiGift, HiHeart, HiClipboardList, HiStar, HiPlus } from 'react-icons/hi';
import DonationCard from '../../components/donations/DonationCard';
import CreateDonationModal from '../../components/donations/CreateDonationModal';
import EditDonationModal from '../../components/donations/EditDonationModal';
import { createDonation, getDonorDonations, updateDonation, cancelDonation } from '../../services/donationService';

const DonorDashboard = () => {
  const { user } = useAuth();
  
  const [donations, setDonations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedDonation, setSelectedDonation] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDonations();
  }, []);

  const fetchDonations = async () => {
    try {
      setIsLoading(true);
      const data = await getDonorDonations();
      setDonations(data);
    } catch (err) {
      console.error(err);
      setError('Failed to load donations');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateDonation = async (formData) => {
    try {
      setIsSubmitting(true);
      await createDonation(formData);
      setIsCreateModalOpen(false);
      fetchDonations();
    } catch (err) {
      console.error(err);
      alert('Failed to create donation');
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
      fetchDonations();
    } catch (err) {
      console.error(err);
      alert('Failed to update donation');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelDonation = async (id) => {
    if (window.confirm('Are you sure you want to cancel this donation?')) {
      try {
        await cancelDonation(id);
        fetchDonations();
      } catch (err) {
        console.error(err);
        alert('Failed to cancel donation');
      }
    }
  };

  // Calculate stats
  const activeDonations = donations.filter(d => ['pending', 'accepted'].includes(d.status));
  const completedDonations = donations.filter(d => ['picked_up', 'delivered'].includes(d.status));
  
  // A rough estimate: assuming 1 "quantity" string might mean 1 meal if not parseable, but for now we just count complete donations
  const mealsShared = completedDonations.length * 10; // Placeholder calculation

  const stats = [
    { label: 'Donations Made', value: donations.length.toString(), icon: HiGift, color: 'bg-primary-50 text-primary-600' },
    { label: 'Meals Shared', value: `${mealsShared}+`, icon: HiHeart, color: 'bg-red-50 text-red-500' },
    { label: 'Active Listings', value: activeDonations.length.toString(), icon: HiClipboardList, color: 'bg-accent-300/20 text-accent-600' },
    { label: 'Impact Score', value: (completedDonations.length * 5).toString(), icon: HiStar, color: 'bg-amber-50 text-amber-600' },
  ];

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 animate-fade-in-up">
        <div>
          <h1 className="text-2xl font-bold text-gray-800" style={{ fontFamily: 'var(--font-sans)' }}>
            Welcome, {user?.name || 'Donor'}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Here's an overview of your donation activity
          </p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-2 bg-primary-600 text-white px-5 py-2.5 rounded-xl hover:bg-primary-700 hover:shadow-lg hover:shadow-primary-600/20 transition-all duration-200 font-medium text-sm cursor-pointer"
          style={{ fontFamily: 'var(--font-sans)' }}
        >
          <HiPlus size={18} />
          Create Donation
        </button>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className={`bg-white rounded-2xl border border-primary-100 p-5 flex items-center gap-4 hover:shadow-md hover:shadow-primary-600/5 transition-all duration-250 animate-fade-in-up animate-stagger-${i + 1}`}
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

      {/* Active Donations */}
      <div className="mb-8 animate-fade-in-up">
        <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2" style={{ fontFamily: 'var(--font-sans)' }}>
          Active Donations
          <span className="bg-primary-50 text-primary-700 text-xs py-0.5 px-2.5 rounded-full font-semibold">
            {activeDonations.length}
          </span>
        </h2>
        
        {isLoading ? (
          <div className="text-center py-10 text-gray-500 animate-pulse-soft">Loading your donations...</div>
        ) : error ? (
          <div className="text-center py-10 text-red-500">{error}</div>
        ) : activeDonations.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-primary-200 p-10 text-center animate-fade-in-up">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary-50 text-primary-400 mb-4 animate-float">
              <HiGift size={32} />
            </div>
            <h3 className="text-gray-800 font-semibold mb-1" style={{ fontFamily: 'var(--font-sans)' }}>No active donations</h3>
            <p className="text-gray-500 text-sm mb-4 max-w-md mx-auto">
              You don't have any pending or accepted donations right now. Create a new donation to share food with those in need.
            </p>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="text-primary-600 font-medium hover:text-primary-700 text-sm transition-colors duration-200 cursor-pointer"
            >
              + Create your first donation
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {activeDonations.map((donation, i) => (
              <div key={donation._id} className={`animate-fade-in-up animate-stagger-${Math.min(i + 1, 6)}`}>
                <DonationCard
                  donation={donation}
                  onEdit={handleEditClick}
                  onCancel={handleCancelDonation}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* History (Cancelled/Completed) */}
      {donations.filter(d => !['pending', 'accepted'].includes(d.status)).length > 0 && (
        <div className="animate-fade-in-up">
          <h2 className="text-lg font-bold text-gray-800 mb-4" style={{ fontFamily: 'var(--font-sans)' }}>Donation History</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 opacity-70">
            {donations
              .filter(d => !['pending', 'accepted'].includes(d.status))
              .map((donation) => (
                <DonationCard
                  key={donation._id}
                  donation={donation}
                  onEdit={() => {}} // Disabled for history
                  onCancel={() => {}} // Disabled for history
                />
              ))}
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

    </DashboardLayout>
  );
};

export default DonorDashboard;
