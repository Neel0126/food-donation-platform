import { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { getRoleLabel, getDashboardPath } from '../../utils/roleRedirect';
import {
  HiMenu,
  HiX,
  HiLogout,
  HiBell,
  HiCheck,
  HiUser,
  HiSparkles,
} from 'react-icons/hi';

/**
 * Modern, role-aware navigation bar for ShareBite
 */
const Navbar = ({ onToggleSidebar, activeTab, onTabChange }) => {
  const { user, logout } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotification();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
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

  // Role-aware primary links
  const getNavLinks = () => {
    if (!user) {
      return [
        { to: '/', label: 'Home' },
        { to: '/#how-it-works', label: 'How It Works' },
        { to: '/#impact', label: 'Our Impact' },
      ];
    }

    if (user.role === 'donor') {
      return [
        { to: '/donor/dashboard', tab: 'dashboard', label: 'Dashboard' },
        { to: '/donor/dashboard?tab=donations', tab: 'donations', label: 'Donations' },
        { to: '/donor/dashboard?tab=ngos', tab: 'ngos', label: 'Find NGOs' },
        { to: '/donor/dashboard?tab=impact', tab: 'impact', label: 'Impact' },
      ];
    }

    if (user.role === 'ngo') {
      return [
        { to: '/ngo/dashboard', tab: 'available', label: 'Incoming Requests' },
        { to: '/ngo/dashboard?tab=accepted', tab: 'accepted', label: 'Active Pickups' },
        { to: '/ngo/dashboard?tab=completed', tab: 'completed', label: 'Collections' },
      ];
    }

    if (user.role === 'volunteer') {
      return [
        { to: '/volunteer/dashboard', tab: 'available', label: 'Available Pool' },
        { to: '/volunteer/dashboard?tab=active', tab: 'active', label: 'Active Deliveries' },
        { to: '/volunteer/dashboard?tab=history', tab: 'history', label: 'Completed' },
      ];
    }

    // Admin navigation is handled exclusively via the Sidebar
    return [];
  };

  const navLinks = getNavLinks();

  const handleLinkClick = (link) => {
    if (onTabChange && link.tab) {
      onTabChange(link.tab);
    }
    setMobileMenuOpen(false);
  };

  // Handle anchor/hash navigation properly with React Router
  const handleHashNavigation = (e, link) => {
    const hashIndex = link.to.indexOf('#');
    if (hashIndex !== -1) {
      e.preventDefault();
      const hash = link.to.slice(hashIndex + 1);
      const basePath = link.to.slice(0, hashIndex) || '/';
      if (location.pathname !== basePath) {
        navigate(basePath);
        // Wait for page to render then scroll
        setTimeout(() => {
          document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 300);
      } else {
        document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      setMobileMenuOpen(false);
    } else {
      handleLinkClick(link);
    }
  };

  const isLinkActive = (link) => {
    if (link.tab && activeTab) {
      return activeTab === link.tab;
    }
    if (link.tab) {
      const searchParams = new URLSearchParams(location.search);
      const currentTab = searchParams.get('tab') || 'dashboard';
      return currentTab === link.tab;
    }
    return location.pathname === link.to && !location.search;
  };

  const hasSidebar = user?.role === 'admin';

  return (
    <nav className="bg-[#f8f6f0]/95 backdrop-blur-md border-b border-[#e8e2d5] sticky top-0 z-40 transition-colors duration-200 shrink-0">
      <div className={`w-full ${hasSidebar ? 'px-4 sm:px-6 lg:px-8' : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'}`}>
        <div className="flex items-center justify-between h-18">
          {/* Left: Brand + Hamburger (if admin mobile) */}
          <div className={`flex items-center gap-3 ${hasSidebar ? 'lg:w-64 shrink-0' : ''}`}>
            {hasSidebar && (
              <button
                onClick={onToggleSidebar}
                className="lg:hidden p-2 rounded-xl text-gray-700 hover:text-primary-700 hover:bg-primary-100/70 transition-all cursor-pointer"
                aria-label="Toggle admin sidebar"
              >
                <HiMenu size={22} />
              </button>
            )}

            <Link
              to={user ? getDashboardPath(user.role) : '/'}
              className="flex items-center gap-2.5 no-underline group"
            >
              <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-primary-600 to-primary-800 flex items-center justify-center shadow-md shadow-primary-900/10 group-hover:scale-105 transition-transform duration-200">
                <span className="text-white text-base">🌱</span>
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-bold text-[#172117] tracking-tight leading-none" style={{ fontFamily: 'var(--font-sans)' }}>
                  Share<span className="text-primary-600 font-extrabold">Bite</span>
                </span>
                <span className="text-[10px] font-medium text-gray-500 tracking-wider uppercase mt-0.5">
                  Food Impact Platform
                </span>
              </div>
            </Link>
          </div>

          {/* Center: Desktop Top Navigation Links */}
          <div className="hidden md:flex items-center gap-1.5">
            {navLinks.map((link) => {
              const active = isLinkActive(link);
              const isHash = link.to.includes('#');
              return isHash ? (
                <button
                  key={link.label}
                  onClick={(e) => handleHashNavigation(e, link)}
                  className={`px-4 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer border-0 bg-transparent ${
                    active
                      ? 'text-primary-800 bg-primary-100/90 shadow-2xs'
                      : 'text-gray-600 hover:text-primary-800 hover:bg-primary-100/50'
                  }`}
                  style={{ fontFamily: 'var(--font-sans)' }}
                >
                  {link.label}
                </button>
              ) : (
                <Link
                  key={link.label}
                  to={link.to}
                  onClick={() => handleLinkClick(link)}
                  className={`px-4 py-2 rounded-full text-xs sm:text-sm font-semibold no-underline transition-all duration-200 cursor-pointer ${
                    active
                      ? 'text-primary-800 bg-primary-100/90 shadow-2xs'
                      : 'text-gray-600 hover:text-primary-800 hover:bg-primary-100/50'
                  }`}
                  style={{ fontFamily: 'var(--font-sans)' }}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>

          {/* Right: Authenticated User Controls or Public CTAs */}
          {user ? (
            <div className="flex items-center gap-3">
              {/* Notifications Dropdown */}
              <div className="relative" ref={notifRef}>
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative p-2.5 rounded-2xl text-gray-600 hover:text-primary-700 hover:bg-primary-100/60 transition-all cursor-pointer"
                  aria-label="Notifications"
                >
                  <HiBell size={20} />
                  {unreadCount > 0 && (
                    <span className="absolute top-2 right-2 h-2.5 w-2.5 rounded-full bg-amber-500 ring-2 ring-[#f8f6f0]" />
                  )}
                </button>

                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-3xl shadow-xl border border-[#e8e2d5] overflow-hidden z-50 animate-scale-in">
                    <div className="p-4 border-b border-[#e8e2d5] flex justify-between items-center bg-[#faf8f4]">
                      <div>
                        <h3 className="text-sm font-bold text-[#172117]" style={{ fontFamily: 'var(--font-sans)' }}>
                          Notifications
                        </h3>
                        <p className="text-[11px] text-gray-500">
                          {unreadCount > 0 ? `${unreadCount} unread update${unreadCount > 1 ? 's' : ''}` : 'All caught up!'}
                        </p>
                      </div>
                      {unreadCount > 0 && (
                        <button
                          onClick={markAllAsRead}
                          className="text-xs text-primary-600 hover:text-primary-800 font-semibold flex items-center gap-1 cursor-pointer"
                        >
                          <HiCheck size={14} /> Mark all read
                        </button>
                      )}
                    </div>

                    <div className="max-h-80 overflow-y-auto divide-y divide-gray-100">
                      {notifications.length === 0 ? (
                        <div className="p-8 text-center text-sm text-gray-500">
                          No notifications yet.
                        </div>
                      ) : (
                        notifications.map((notif) => (
                          <div
                            key={notif._id}
                            onClick={() => {
                              if (!notif.read) markAsRead(notif._id);
                            }}
                            className={`p-3.5 cursor-pointer hover:bg-primary-50/50 transition-colors ${
                              !notif.read ? 'bg-primary-50/80' : ''
                            }`}
                          >
                            <p className={`text-xs sm:text-sm ${!notif.read ? 'text-[#172117] font-semibold' : 'text-gray-600'}`}>
                              {notif.message}
                            </p>
                            <p className="text-[10px] text-gray-400 mt-1">
                              {new Date(notif.createdAt).toLocaleDateString()} · {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* User Avatar + Profile Link */}
              <Link
                to="/profile"
                className="flex items-center gap-2.5 p-1.5 rounded-full hover:bg-primary-100/50 transition-all no-underline group"
              >
                <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary-600 to-primary-800 text-white flex items-center justify-center font-bold text-sm shadow-xs group-hover:ring-2 group-hover:ring-primary-300 transition-all">
                  {user.name?.charAt(0)?.toUpperCase() || 'U'}
                </div>
                <div className="hidden lg:block text-left pr-2">
                  <p className="text-xs font-bold text-[#172117] leading-tight group-hover:text-primary-700 transition-colors">
                    {user.name}
                  </p>
                  <p className="text-[10px] font-semibold text-primary-700 uppercase tracking-wider">
                    {getRoleLabel(user.role)}
                  </p>
                </div>
              </Link>

              {/* Logout Button */}
              <button
                onClick={logout}
                className="hidden sm:flex p-2 rounded-xl text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all cursor-pointer"
                aria-label="Logout"
                title="Logout"
              >
                <HiLogout size={19} />
              </button>

              {/* Mobile menu toggle for donor / volunteer / ngo */}
              <button
                onClick={() => setMobileMenuOpen((prev) => !prev)}
                className="md:hidden p-2 rounded-xl text-gray-600 hover:text-primary-700 hover:bg-primary-100/60 transition-all cursor-pointer"
                aria-label="Toggle mobile menu"
              >
                {mobileMenuOpen ? <HiX size={22} /> : <HiMenu size={22} />}
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link
                to="/login"
                className="px-4 py-2 text-sm font-semibold text-gray-700 hover:text-primary-800 transition-colors"
                style={{ fontFamily: 'var(--font-sans)' }}
              >
                Log In
              </Link>
              <Link
                to="/register"
                className="btn-primary text-sm px-5 py-2"
                style={{ fontFamily: 'var(--font-sans)' }}
              >
                Donate Food
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[#e8e2d5] bg-[#f8f6f0]/98 backdrop-blur-md animate-fade-in-up">
          <div className="px-4 py-4 space-y-2">
            {user ? (
              <>
                <div className="flex items-center gap-3 pb-3 border-b border-[#e8e2d5]">
                  <div className="h-10 w-10 rounded-full bg-primary-700 text-white flex items-center justify-center font-bold">
                    {user.name?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[#172117]">{user.name}</p>
                    <p className="text-xs font-semibold text-primary-700">{getRoleLabel(user.role)}</p>
                  </div>
                </div>

                {navLinks.map((link) => (
                  <Link
                    key={link.label}
                    to={link.to}
                    onClick={() => handleLinkClick(link)}
                    className={`block px-4 py-2.5 rounded-xl text-sm font-semibold no-underline transition-all ${
                      isLinkActive(link)
                        ? 'text-primary-800 bg-primary-100 font-bold'
                        : 'text-gray-700 hover:bg-primary-100/60'
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}

                <Link
                  to="/profile"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-700 hover:bg-primary-100/60"
                >
                  My Profile
                </Link>

                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    logout();
                  }}
                  className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-red-600 hover:bg-red-50 transition-all cursor-pointer"
                >
                  <HiLogout size={18} />
                  Logout
                </button>
              </>
            ) : (
              <>
                {navLinks.map((link) => {
                  const isHash = link.to.includes('#');
                  return isHash ? (
                    <button
                      key={link.to}
                      onClick={(e) => handleHashNavigation(e, link)}
                      className="block w-full text-left px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-700 hover:bg-primary-100/60 border-0 bg-transparent cursor-pointer"
                    >
                      {link.label}
                    </button>
                  ) : (
                    <Link
                      key={link.to}
                      to={link.to}
                      onClick={() => setMobileMenuOpen(false)}
                      className="block px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-700 hover:bg-primary-100/60"
                    >
                      {link.label}
                    </Link>
                  );
                })}
                <div className="pt-2 border-t border-[#e8e2d5] flex flex-col gap-2">
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
                    Donate Food
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
