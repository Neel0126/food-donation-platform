import { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { getRoleLabel, getDashboardPath } from '../../utils/roleRedirect';
import { HiMenu, HiX, HiLogout, HiBell, HiCheck, HiSparkles } from 'react-icons/hi';

/**
 * Top navigation bar for ShareBite with Earthy Fresh theme
 */
const Navbar = ({ onToggleSidebar }) => {
  const { user, logout } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotification();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const location = useLocation();
  const notifRef = useRef(null);

  // Close notifications if clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const navLinks = user
    ? [
        { to: getDashboardPath(user.role), label: 'Dashboard' },
        { to: '/profile', label: 'Profile' },
      ]
    : [
        { to: '/', label: 'Home' },
        { to: '/#how-it-works', label: 'How It Works' },
        { to: '/#impact', label: 'Our Impact' },
      ];

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="bg-[#f5f0e8]/90 backdrop-blur-md border-b border-[#e6ded3] sticky top-0 z-40 animate-fade-in transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-18">
          {/* Left: Hamburger + Brand */}
          <div className="flex items-center gap-3">
            {user && (
              <button
                onClick={onToggleSidebar}
                className="lg:hidden p-1.5 rounded-lg text-gray-600 hover:text-primary-700 hover:bg-primary-100/60 transition-all duration-200 cursor-pointer"
                aria-label="Toggle sidebar"
              >
                <HiMenu size={22} />
              </button>
            )}
            <Link to={user ? getDashboardPath(user.role) : '/'} className="flex items-center gap-2.5 no-underline group">
              <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-primary-600 to-primary-800 flex items-center justify-center shadow-md shadow-primary-900/10 group-hover:shadow-primary-700/25 transition-all duration-200 group-hover:scale-105">
                <span className="text-white text-base font-extrabold tracking-tight">🌱</span>
              </div>
              <span className="text-xl font-bold text-gray-900 tracking-tight" style={{ fontFamily: 'var(--font-sans)' }}>
                Share<span className="text-primary-600 font-extrabold">Bite</span>
              </span>
            </Link>
          </div>

          {/* Center: Desktop nav links */}
          <div className="hidden md:flex items-center gap-1.5">
            {navLinks.map((link) => {
              const active = isActive(link.to);
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`px-3.5 py-2 rounded-full text-sm font-medium no-underline transition-all duration-200 cursor-pointer ${
                    active
                      ? 'text-primary-800 bg-primary-100 font-semibold shadow-xs'
                      : 'text-gray-600 hover:text-primary-800 hover:bg-primary-100/60'
                  }`}
                  style={{ fontFamily: 'var(--font-sans)' }}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>

          {/* Right: User info or Public CTAs */}
          {user ? (
            <div className="hidden md:flex items-center gap-3">
              <div className="text-right">
                <p className="text-sm font-semibold text-gray-900 leading-tight">{user.name}</p>
                <p className="text-xs text-primary-700 font-medium">{getRoleLabel(user.role)}</p>
              </div>

              {/* Notifications Dropdown */}
              <div className="relative" ref={notifRef}>
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative p-2 rounded-xl text-gray-500 hover:text-primary-700 hover:bg-primary-100/70 transition-all duration-200 cursor-pointer"
                  aria-label="Notifications"
                >
                  <HiBell size={20} />
                  {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 h-2.5 w-2.5 rounded-full bg-accent-500 border-2 border-[#f5f0e8]"></span>
                  )}
                </button>

                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-stone-border overflow-hidden z-50 animate-fade-in-up">
                    <div className="p-3.5 border-b border-stone-border flex justify-between items-center bg-[#fbf9f5]">
                      <h3 className="text-sm font-bold text-gray-800" style={{ fontFamily: 'var(--font-sans)' }}>Notifications</h3>
                      {unreadCount > 0 && (
                        <button
                          onClick={markAllAsRead}
                          className="text-xs text-primary-600 hover:text-primary-800 font-medium flex items-center gap-1 cursor-pointer"
                        >
                          <HiCheck size={14} /> Mark all read
                        </button>
                      )}
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="p-5 text-center text-sm text-gray-500">
                          No notifications yet.
                        </div>
                      ) : (
                        notifications.map((notif) => (
                          <div
                            key={notif._id}
                            onClick={() => {
                              if (!notif.read) markAsRead(notif._id);
                            }}
                            className={`p-3.5 border-b border-gray-100 cursor-pointer hover:bg-primary-50/40 transition-colors ${
                              !notif.read ? 'bg-primary-50/60 font-semibold' : ''
                            }`}
                          >
                            <p className={`text-sm ${!notif.read ? 'text-gray-900 font-semibold' : 'text-gray-600'}`}>
                              {notif.message}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                              {new Date(notif.createdAt).toLocaleDateString()} {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* User Avatar */}
              <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary-100 to-primary-200 border border-primary-300 flex items-center justify-center">
                <span className="text-sm font-bold text-primary-800">
                  {user.name?.charAt(0)?.toUpperCase() || 'U'}
                </span>
              </div>

              {/* Logout Button */}
              <button
                onClick={logout}
                className="p-2 rounded-xl text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all duration-200 cursor-pointer"
                aria-label="Logout"
                title="Logout"
              >
                <HiLogout size={18} />
              </button>
            </div>
          ) : (
            <div className="hidden md:flex items-center gap-3">
              <Link
                to="/login"
                className="px-4 py-2 text-sm font-semibold text-gray-700 hover:text-primary-800 transition-colors"
                style={{ fontFamily: 'var(--font-sans)' }}
              >
                Log In
              </Link>
              <Link
                to="/register"
                className="btn-primary"
                style={{ fontFamily: 'var(--font-sans)', padding: '0.5rem 1.25rem', fontSize: '0.875rem' }}
              >
                Donate Now
              </Link>
            </div>
          )}

          {/* Mobile menu toggle */}
          <button
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="md:hidden p-2 rounded-xl text-gray-600 hover:text-primary-700 hover:bg-primary-100/60 transition-all duration-200 cursor-pointer"
            aria-label="Toggle mobile menu"
          >
            {mobileMenuOpen ? <HiX size={22} /> : <HiMenu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[#e6ded3] bg-[#f5f0e8]/95 backdrop-blur-md animate-fade-in-up">
          <div className="px-4 py-3 space-y-2">
            {user ? (
              <>
                {/* User info */}
                <div className="flex items-center gap-3 pb-3 border-b border-primary-100">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center border border-primary-300">
                    <span className="text-sm font-bold text-primary-800">
                      {user.name?.charAt(0)?.toUpperCase() || 'U'}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{user.name}</p>
                    <p className="text-xs text-primary-700 font-medium">{getRoleLabel(user.role)}</p>
                  </div>
                </div>

                {navLinks.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`block px-3 py-2.5 rounded-xl text-sm font-medium no-underline transition-all duration-200 ${
                      isActive(link.to)
                        ? 'text-primary-800 bg-primary-100 font-bold'
                        : 'text-gray-700 hover:bg-primary-100/60'
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
                  className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-all duration-200 cursor-pointer"
                >
                  <HiLogout size={16} />
                  Logout
                </button>
              </>
            ) : (
              <>
                {navLinks.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-3 py-2.5 rounded-xl text-sm font-medium text-gray-700 hover:bg-primary-100/60"
                  >
                    {link.label}
                  </Link>
                ))}
                <div className="pt-2 border-t border-[#e6ded3] flex flex-col gap-2">
                  <Link
                    to="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full text-center py-2.5 text-sm font-semibold text-gray-700 hover:bg-primary-100/60 rounded-xl"
                  >
                    Log In
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full btn-primary text-center"
                  >
                    Donate Now
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
