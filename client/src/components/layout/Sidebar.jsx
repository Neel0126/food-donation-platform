import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getDashboardPath, getRoleLabel } from '../../utils/roleRedirect';
import {
  HiChartBar,
  HiUsers,
  HiGift,
  HiShieldCheck,
  HiTruck,
  HiDocumentReport,
  HiCog,
  HiUser,
  HiLogout,
  HiX,
  HiExclamationCircle,
} from 'react-icons/hi';

/**
 * Admin Sidebar navigation with deep info hierarchy
 */
const Sidebar = ({ isOpen, onClose, activeTab, onTabChange }) => {
  const { user, logout } = useAuth();
  const location = useLocation();

  if (!user || user.role !== 'admin') return null;

  const adminMenuItems = [
    { tab: 'overview', label: 'Dashboard', icon: HiChartBar },
    { tab: 'users', label: 'Users', icon: HiUsers },
    { tab: 'donations', label: 'Donations', icon: HiGift },
    { tab: 'ngos', label: 'NGO Approvals', icon: HiShieldCheck },
    { tab: 'volunteers', label: 'Volunteers', icon: HiTruck },
    { tab: 'complaints', label: 'Reports & Complaints', icon: HiExclamationCircle },
    { to: '/profile', label: 'Settings', icon: HiCog },
  ];

  const handleItemClick = (item) => {
    if (item.tab && onTabChange) {
      onTabChange(item.tab);
    }
    if (onClose) onClose();
  };

  const isItemActive = (item) => {
    if (item.tab) {
      if (activeTab) return activeTab === item.tab;
      const params = new URLSearchParams(location.search);
      return (params.get('tab') || 'overview') === item.tab;
    }
    return location.pathname === item.to;
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs lg:hidden animate-fade-in"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Panel */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white border-r border-[#e8e2d5] flex flex-col h-full shrink-0 transform transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Mobile Header / Close */}
        <div className="lg:hidden flex items-center justify-between p-4 border-b border-[#e8e2d5]">
          <span className="text-sm font-bold text-[#172117]" style={{ fontFamily: 'var(--font-sans)' }}>
            Admin Navigation
          </span>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 cursor-pointer"
            aria-label="Close sidebar"
          >
            <HiX size={20} />
          </button>
        </div>

        {/* User Badge */}
        <div className="p-4 border-b border-[#e8e2d5] bg-[#faf8f4]">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-primary-700 to-primary-900 text-white flex items-center justify-center font-bold shadow-xs">
              {user.name?.charAt(0)?.toUpperCase() || 'A'}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-[#172117] truncate" style={{ fontFamily: 'var(--font-sans)' }}>
                {user.name}
              </p>
              <span className="inline-block mt-0.5 px-2 py-0.5 text-[10px] font-bold rounded-full bg-red-100 text-red-800 uppercase tracking-wider">
                Administrator
              </span>
            </div>
          </div>
        </div>

        {/* Navigation items */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {adminMenuItems.map((item) => {
            const Icon = item.icon;
            const active = isItemActive(item);
            const linkTo = item.tab
              ? { pathname: '/admin/dashboard', search: `?tab=${item.tab}` }
              : item.to;

            return (
              <Link
                key={item.label}
                to={linkTo}
                onClick={() => handleItemClick(item)}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold no-underline transition-all cursor-pointer ${
                  active
                    ? 'bg-primary-600 text-white shadow-xs'
                    : 'text-gray-600 hover:bg-primary-50 hover:text-primary-800'
                }`}
                style={{ fontFamily: 'var(--font-sans)' }}
              >
                <Icon size={18} className="shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="p-3 border-t border-[#e8e2d5] bg-[#faf8f4]">
          <button
            onClick={() => {
              if (onClose) onClose();
              logout();
            }}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-red-600 hover:bg-red-50 transition-all cursor-pointer"
            style={{ fontFamily: 'var(--font-sans)' }}
          >
            <HiLogout size={18} className="shrink-0" />
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
