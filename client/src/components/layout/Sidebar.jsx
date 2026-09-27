import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getDashboardPath, getRoleLabel } from '../../utils/roleRedirect';
import {
  HiHome,
  HiUser,
  HiLogout,
  HiClipboardList,
  HiUserGroup,
  HiTruck,
  HiCog,
  HiShieldCheck,
  HiExclamation,
  HiX,
} from 'react-icons/hi';

/**
 * Sidebar navigation for dashboard pages with Earthy Fresh styling
 */
const Sidebar = ({ isOpen, onClose }) => {
  const { user, logout } = useAuth();
  const location = useLocation();

  if (!user) return null;

  const isActive = (path) => location.pathname === path;

  // Role-specific menu items
  const roleMenuItems = {
    donor: [
      { to: '/donor/dashboard', label: 'Dashboard', icon: HiHome },
      { to: '/profile', label: 'My Profile', icon: HiUser },
    ],
    ngo: [
      { to: '/ngo/dashboard', label: 'Dashboard', icon: HiHome },
      { to: '/profile', label: 'Organization Profile', icon: HiUser },
    ],
    volunteer: [
      { to: '/volunteer/dashboard', label: 'Dashboard', icon: HiHome },
      { to: '/profile', label: 'My Profile', icon: HiUser },
    ],
    admin: [
      { to: '/admin/dashboard', label: 'Dashboard', icon: HiHome },
      { to: '/admin/dashboard', label: 'Users', icon: HiUserGroup, tab: 'users' },
      { to: '/admin/dashboard', label: 'NGO Approvals', icon: HiShieldCheck, tab: 'ngos' },
      { to: '/admin/dashboard', label: 'Donations', icon: HiClipboardList, tab: 'donations' },
      { to: '/admin/dashboard', label: 'Complaints', icon: HiExclamation, tab: 'complaints' },
      { to: '/profile', label: 'My Profile', icon: HiUser },
    ],
  };

  const menuItems = roleMenuItems[user.role] || roleMenuItems.donor;

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/30 backdrop-blur-xs lg:hidden animate-fade-in"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-40 w-64 bg-white/90 backdrop-blur-md border-r border-[#e6ded3] flex flex-col transform transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Mobile close button */}
        <div className="lg:hidden flex items-center justify-between p-4 border-b border-[#e6ded3]">
          <span className="text-sm font-bold text-gray-800" style={{ fontFamily: 'var(--font-sans)' }}>Menu</span>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-500 hover:text-primary-700 hover:bg-primary-50 transition-all duration-200 cursor-pointer"
            aria-label="Close sidebar"
          >
            <HiX size={20} />
          </button>
        </div>

        {/* User info badge */}
        <div className="p-4 border-b border-[#e6ded3] bg-[#fbf9f5]">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-primary-600 to-primary-800 flex items-center justify-center shrink-0 shadow-xs">
              <span className="text-sm font-bold text-white">
                {user.name?.charAt(0)?.toUpperCase() || 'U'}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-gray-900 truncate" style={{ fontFamily: 'var(--font-sans)' }}>{user.name}</p>
              <span className="inline-block mt-0.5 px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-primary-100 text-primary-800 uppercase tracking-wider">
                {getRoleLabel(user.role)}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation links */}
        <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const linkTo = item.tab
              ? { pathname: item.to, search: `?tab=${item.tab}` }
              : item.to;
            const active = item.tab
              ? location.pathname === item.to && location.search === `?tab=${item.tab}`
              : isActive(item.to) && !location.search;
            return (
              <Link
                key={item.label}
                to={linkTo}
                onClick={onClose}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium no-underline transition-all duration-200 cursor-pointer ${
                  active
                    ? 'bg-primary-600 text-white font-semibold shadow-xs'
                    : 'text-gray-600 hover:bg-primary-50 hover:text-primary-800'
                }`}
                style={{ fontFamily: 'var(--font-sans)' }}
              >
                <Icon size={18} className="shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="p-3 border-t border-[#e6ded3] bg-[#fbf9f5]">
          <button
            onClick={() => {
              onClose();
              logout();
            }}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-all duration-200 cursor-pointer"
            style={{ fontFamily: 'var(--font-sans)' }}
          >
            <HiLogout size={18} className="shrink-0" />
            Logout
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
