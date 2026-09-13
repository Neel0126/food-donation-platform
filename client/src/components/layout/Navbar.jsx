import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getRoleLabel, getDashboardPath } from '../../utils/roleRedirect';
import { HiMenu, HiX, HiUser, HiLogout } from 'react-icons/hi';

/**
 * Top navigation bar for the app
 */
const Navbar = ({ onToggleSidebar }) => {
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  const navLinks = user
    ? [
        { to: getDashboardPath(user.role), label: 'Dashboard' },
        { to: '/profile', label: 'Profile' },
      ]
    : [];

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="bg-white/80 backdrop-blur-md border-b border-primary-100 sticky top-0 z-40 animate-fade-in">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Left: Hamburger + Brand */}
          <div className="flex items-center gap-3">
            {user && (
              <button
                onClick={onToggleSidebar}
                className="lg:hidden p-1.5 rounded-lg text-gray-500 hover:text-primary-600 hover:bg-primary-50 transition-all duration-200 cursor-pointer"
                aria-label="Toggle sidebar"
              >
                <HiMenu size={22} />
              </button>
            )}
            <Link to={user ? getDashboardPath(user.role) : '/'} className="flex items-center gap-2.5 no-underline group">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow duration-200">
                <span className="text-white text-sm font-bold">S</span>
              </div>
              <span className="text-lg font-bold text-gray-800 tracking-tight" style={{ fontFamily: 'var(--font-sans)' }}>
                Share<span className="text-primary-600">Bite</span>
              </span>
            </Link>
          </div>

          {/* Center: Desktop nav links */}
          {user && (
            <div className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`px-3.5 py-2 rounded-lg text-sm font-medium no-underline transition-all duration-200 cursor-pointer ${
                    isActive(link.to)
                      ? 'text-primary-700 bg-primary-50'
                      : 'text-gray-500 hover:text-primary-700 hover:bg-primary-50/60'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          )}

          {/* Right: User info + Logout */}
          {user ? (
            <div className="hidden md:flex items-center gap-3">
              <div className="text-right">
                <p className="text-sm font-semibold text-gray-800 leading-tight">{user.name}</p>
                <p className="text-xs text-primary-600 font-medium">{getRoleLabel(user.role)}</p>
              </div>
              <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center ring-2 ring-primary-100">
                <span className="text-sm font-bold text-primary-700">
                  {user.name?.charAt(0)?.toUpperCase() || 'U'}
                </span>
              </div>
              <button
                onClick={logout}
                className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all duration-200 cursor-pointer"
                aria-label="Logout"
                title="Logout"
              >
                <HiLogout size={18} />
              </button>
            </div>
          ) : null}

          {/* Mobile menu toggle */}
          <button
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="md:hidden p-2 rounded-lg text-gray-500 hover:text-primary-600 hover:bg-primary-50 transition-all duration-200 cursor-pointer"
            aria-label="Toggle mobile menu"
          >
            {mobileMenuOpen ? <HiX size={22} /> : <HiMenu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-primary-100 bg-white/95 backdrop-blur-md animate-fade-in-up">
          <div className="px-4 py-3 space-y-1">
            {user ? (
              <>
                {/* User info */}
                <div className="flex items-center gap-3 pb-3 border-b border-primary-50">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center">
                    <span className="text-sm font-bold text-primary-700">
                      {user.name?.charAt(0)?.toUpperCase() || 'U'}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{user.name}</p>
                    <p className="text-xs text-primary-600 font-medium">{getRoleLabel(user.role)}</p>
                  </div>
                </div>

                {navLinks.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`block px-3 py-2.5 rounded-lg text-sm font-medium no-underline transition-all duration-200 ${
                      isActive(link.to)
                        ? 'text-primary-700 bg-primary-50'
                        : 'text-gray-600 hover:bg-primary-50/60'
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}

                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    logout();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-all duration-200 cursor-pointer"
                >
                  <HiLogout size={16} />
                  Logout
                </button>
              </>
            ) : null}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
