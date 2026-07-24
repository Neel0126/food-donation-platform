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
          className="fixed inset-0 z-30 bg-black/30 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-40 w-64 bg-white border-r border-gray-200 flex flex-col transform transition-transform duration-200 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Mobile close button */}
        <div className="lg:hidden flex items-center justify-between p-4 border-b border-gray-100">
          <span className="text-sm font-semibold text-gray-700">Menu</span>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-gray-400 hover:text-gray-600"
            aria-label="Close sidebar"
          >
            <HiX size={20} />
          </button>
        </div>

        {/* User info */}
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center shrink-0">
              <span className="text-sm font-bold text-primary-700">
                {user.name?.charAt(0)?.toUpperCase() || 'U'}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-800 truncate">{user.name}</p>
              <span className="inline-block mt-0.5 px-2 py-0.5 text-[10px] font-semibold rounded-full bg-primary-100 text-primary-700 uppercase tracking-wide">
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
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium no-underline transition-colors ${
                  isActive(item.to)
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800'
                }`}
              >
                <Icon size={18} className="shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="p-3 border-t border-gray-100">
          <button
            onClick={() => {
              onClose();
              logout();
            }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
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
