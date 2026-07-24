import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { HiUsers, HiShieldCheck, HiGift, HiChartBar } from 'react-icons/hi';

/**
 * Admin Dashboard — /admin/dashboard
 */
const AdminDashboard = () => {
  const { user } = useAuth();

  const stats = [
    { label: 'Total Users', value: '0', icon: HiUsers, color: 'bg-primary-100 text-primary-600' },
    { label: 'Pending Verifications', value: '0', icon: HiShieldCheck, color: 'bg-amber-100 text-amber-600' },
    { label: 'Active Donations', value: '0', icon: HiGift, color: 'bg-blue-100 text-blue-600' },
    { label: 'Platform Activity', value: '—', icon: HiChartBar, color: 'bg-purple-100 text-purple-600' },
  ];

  return (
    <DashboardLayout>
      {/* Welcome */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">
          Admin Panel 🛡️
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Welcome, {user?.name || 'Admin'}. Manage the ShareBite platform from here.
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
          User management, NGO verification workflows, donation oversight, and analytics will be added in the next phase.
        </p>
      </div>
    </DashboardLayout>
  );
};

export default AdminDashboard;
