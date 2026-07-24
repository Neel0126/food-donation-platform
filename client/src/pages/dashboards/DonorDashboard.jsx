import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { HiGift, HiHeart, HiClipboardList, HiStar } from 'react-icons/hi';

/**
 * Donor Dashboard — /donor/dashboard
 */
const DonorDashboard = () => {
  const { user } = useAuth();

  const stats = [
    { label: 'Donations Made', value: '0', icon: HiGift, color: 'bg-primary-100 text-primary-600' },
    { label: 'Meals Shared', value: '0', icon: HiHeart, color: 'bg-accent-100 text-accent-600' },
    { label: 'Active Listings', value: '0', icon: HiClipboardList, color: 'bg-blue-100 text-blue-600' },
    { label: 'Impact Score', value: '—', icon: HiStar, color: 'bg-purple-100 text-purple-600' },
  ];

  return (
    <DashboardLayout>
      {/* Welcome */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">
          Welcome, {user?.name || 'Donor'} 👋
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Here's an overview of your donation activity
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4"
            >
              <div className={`h-11 w-11 rounded-lg flex items-center justify-center shrink-0 ${stat.color}`}>
                <Icon size={22} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-800">{stat.value}</p>
                <p className="text-xs text-gray-500">{stat.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Coming soon */}
      <div className="bg-primary-50 border border-primary-200 rounded-xl p-6 text-center">
        <p className="text-primary-800 font-semibold mb-1">🚀 More features coming soon!</p>
        <p className="text-sm text-primary-600">
          Donation listing, history tracking, and impact analytics will be added in the next phase.
        </p>
      </div>
    </DashboardLayout>
  );
};

export default DonorDashboard;
