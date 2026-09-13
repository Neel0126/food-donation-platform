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
  HiX,
} from 'react-icons/hi';

/**
 * Sidebar navigation for dashboard pages
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
      { to: '/profile', label: 'My Profile', icon: HiUser },
    ],
  };

  const menuItems = roleMenuItems[user.role] || roleMenuItems.donor;

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/20 backdrop-blur-sm lg:hidden animate-fade-in"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-40 w-64 bg-white border-r border-primary-100 flex flex-col transform transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Mobile close button */}
        <div className="lg:hidden flex items-center justify-between p-4 border-b border-primary-50">
          <span className="text-sm font-semibold text-gray-700" style={{ fontFamily: 'var(--font-sans)' }}>Menu</span>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition-all duration-200 cursor-pointer"
            aria-label="Close sidebar"
          >
            <HiX size={20} />
          </button>
        </div>

        {/* User info */}
        <div className="p-4 border-b border-primary-50">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center shrink-0 ring-2 ring-primary-50">
              <span className="text-sm font-bold text-primary-700">
                {user.name?.charAt(0)?.toUpperCase() || 'U'}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-800 truncate">{user.name}</p>
              <span className="inline-block mt-0.5 px-2 py-0.5 text-[10px] font-semibold rounded-full bg-primary-50 text-primary-700 uppercase tracking-wide">
                {getRoleLabel(user.role)}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation links */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={onClose}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium no-underline transition-all duration-200 cursor-pointer ${
                  isActive(item.to)
                    ? 'bg-primary-50 text-primary-700 border-l-3 border-primary-500'
                    : 'text-gray-500 hover:bg-primary-50/60 hover:text-gray-800'
                }`}
              >
                <Icon size={18} className="shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="p-3 border-t border-primary-50">
          <button
            onClick={() => {
              onClose();
              logout();
            }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-500 hover:bg-red-50 transition-all duration-200 cursor-pointer"
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
