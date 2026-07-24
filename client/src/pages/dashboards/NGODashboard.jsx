import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../components/layout/DashboardLayout';
import AlertMessage from '../../components/common/AlertMessage';
import { HiInboxIn, HiUserGroup, HiClipboardCheck, HiTrendingUp } from 'react-icons/hi';

/**
 * NGO Dashboard — /ngo/dashboard
 */
const NGODashboard = () => {
  const { user } = useAuth();

  const stats = [
    { label: 'Donations Received', value: '0', icon: HiInboxIn, color: 'bg-primary-100 text-primary-600' },
    { label: 'Volunteers Connected', value: '0', icon: HiUserGroup, color: 'bg-accent-100 text-accent-600' },
    { label: 'Completed Pickups', value: '0', icon: HiClipboardCheck, color: 'bg-blue-100 text-blue-600' },
    { label: 'People Served', value: '0', icon: HiTrendingUp, color: 'bg-purple-100 text-purple-600' },
  ];

  return (
    <DashboardLayout>
      {/* Verification pending notice */}
      {user && user.isVerified === false && (
        <div className="mb-6 bg-amber-50 border border-amber-300 rounded-xl p-4 flex items-start gap-3">
          <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0 mt-0.5">
            <span className="text-lg">⏳</span>
          </div>
          <div>
            <p className="font-semibold text-amber-800">NGO Verification Pending</p>
            <p className="text-sm text-amber-700 mt-0.5">
              Your organization account is currently under review. Some features may be limited until
              verification is complete. This process typically takes 1–3 business days.
            </p>
          </div>
        </div>
      )}

      {/* Welcome */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">
          Welcome, {user?.name || 'Organization'} 👋
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage your food donation requests and volunteer network
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
          Donation requests, volunteer management, and impact reports will be added in the next phase.
        </p>
      </div>
    </DashboardLayout>
  );
};

export default NGODashboard;
