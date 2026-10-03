import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import Navbar from './Navbar';
import Sidebar from './Sidebar';

/**
 * Role-aware Dashboard Layout
 * - Donor, NGO, Volunteer: Clean, modern top navigation layout (no permanent desktop sidebar)
 * - Admin: Robust sidebar navigation for high density management
 */
const DashboardLayout = ({ children, activeTab, onTabChange, fullWidth = false }) => {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isAdmin = user?.role === 'admin';

  return (
    <div className="h-screen max-h-screen bg-[#f8f6f0] flex flex-col font-body text-[#172117] overflow-hidden">
      <Navbar
        onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
        activeTab={activeTab}
        onTabChange={onTabChange}
      />

      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Sidebar rendered only for admin */}
        {isAdmin && (
          <Sidebar
            isOpen={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
            activeTab={activeTab}
            onTabChange={onTabChange}
          />
        )}

        {/* Main Content Area - ONLY THIS SCROLLS */}
        <main className="flex-1 min-h-0 h-full overflow-y-auto">
          <div
            className={`w-full ${
              isAdmin || fullWidth ? 'px-4 sm:px-6 lg:px-8' : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'
            } py-6 sm:py-8`}
          >
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
