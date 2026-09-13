import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { HiUsers, HiShieldCheck, HiGift, HiChartBar } from 'react-icons/hi';

/**
 * Admin Dashboard — /admin/dashboard
 */
const AdminDashboard = () => {
  const { user } = useAuth();

  const stats = [
    { label: 'Total Users', value: '0', icon: HiUsers, color: 'bg-primary-50 text-primary-600' },
    { label: 'Pending Verifications', value: '0', icon: HiShieldCheck, color: 'bg-amber-50 text-amber-600' },
    { label: 'Active Donations', value: '0', icon: HiGift, color: 'bg-accent-300/20 text-accent-600' },
    { label: 'Platform Activity', value: '—', icon: HiChartBar, color: 'bg-green-50 text-green-600' },
  ];

  return (
    <DashboardLayout>
      {/* Welcome */}
      <div className="mb-6 animate-fade-in-up">
        <h1 className="text-2xl font-bold text-gray-800" style={{ fontFamily: 'var(--font-sans)' }}>
          <svg className="inline-block w-6 h-6 mr-1.5 -mt-0.5 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          Admin Panel
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Welcome, {user?.name || 'Admin'}. Manage the ShareBite platform from here.
        </p>
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

      {/* Coming soon */}
      <div className="bg-primary-50 border border-primary-200 rounded-2xl p-6 text-center animate-fade-in-up animate-stagger-5">
        <p className="text-primary-800 font-semibold mb-1" style={{ fontFamily: 'var(--font-sans)' }}>
          <svg className="inline-block w-5 h-5 mr-1 -mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          More features coming soon!
        </p>
        <p className="text-sm text-primary-600">
          User management, NGO verification workflows, donation oversight, and analytics will be added in the next phase.
        </p>
      </div>
    </DashboardLayout>
  );
};

export default AdminDashboard;
