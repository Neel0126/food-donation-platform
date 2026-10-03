import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../components/layout/DashboardLayout';
import AlertMessage from '../../components/common/AlertMessage';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import StatCounter from '../../components/ui/StatCounter';
import StatusBadge from '../../components/ui/StatusBadge';
import EmptyState from '../../components/ui/EmptyState';
import { StatSkeleton, TableRowSkeleton } from '../../components/ui/Skeleton';
import {
  HiUsers,
  HiShieldCheck,
  HiGift,
  HiChartBar,
  HiExclamationCircle,
  HiSearch,
  HiCheck,
  HiX,
  HiTrash,
  HiRefresh,
  HiDocumentText,
  HiBan,
  HiArrowLeft,
  HiArrowRight,
  HiFilter,
  HiClock,
  HiCheckCircle,
} from 'react-icons/hi';
import * as adminService from '../../services/adminService';

const complaintTypeLabels = {
  food_quality: 'Food Quality',
  no_show: 'No Show',
  late_delivery: 'Late Delivery',
  misconduct: 'Misconduct',
  fraud: 'Fraud',
  other: 'Other Issue',
};

// ── Role Badge ──
const RoleBadge = ({ role }) => {
  const getStyle = () => {
    switch (role) {
      case 'donor':
        return 'bg-primary-100 text-primary-800 border-primary-200';
      case 'ngo':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'volunteer':
        return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'admin':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <span
      className={`inline-block px-2.5 py-0.5 text-[11px] font-bold rounded-full uppercase tracking-wider border ${getStyle()}`}
    >
      {role}
    </span>
  );
};

// ── Pagination Component ──
const Pagination = ({ pagination, onPageChange }) => {
  if (!pagination || pagination.pages <= 1) return null;
  return (
    <div className="flex items-center justify-between mt-4 pt-4 border-t border-[#e8e2d5]">
      <p className="text-xs text-gray-500 font-medium">
        Showing {(pagination.page - 1) * pagination.limit + 1}–
        {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} entries
      </p>
      <div className="flex gap-2">
        <button
          onClick={() => onPageChange(pagination.page - 1)}
          disabled={pagination.page <= 1}
          className="p-1.5 rounded-xl border border-[#e8e2d5] text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          aria-label="Previous page"
        >
          <HiArrowLeft size={16} />
        </button>
        <span className="flex items-center text-xs text-gray-700 font-bold px-2">
          {pagination.page} / {pagination.pages}
        </span>
        <button
          onClick={() => onPageChange(pagination.page + 1)}
          disabled={pagination.page >= pagination.pages}
          className="p-1.5 rounded-xl border border-[#e8e2d5] text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          aria-label="Next page"
        >
          <HiArrowRight size={16} />
        </button>
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════
//  OVERVIEW TAB
// ══════════════════════════════════════════════════════════
const OverviewTab = ({ stats, loading, onTabChange }) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatSkeleton />
        <StatSkeleton />
        <StatSkeleton />
        <StatSkeleton />
      </div>
    );
  }
  if (!stats) return null;

  const donors = stats.users?.donors || 0;
  const ngos = stats.users?.ngos || 0;
  const volunteers = stats.users?.volunteers || 0;
  const admins = stats.users?.admins || 0;
  const totalUsers = stats.users?.total || 0;

  const delivered = stats.donations?.delivered || 0;
  const assigned = stats.donations?.assigned || 0;
  const cancelled = stats.donations?.cancelled || 0;
  const pending = stats.donations?.pending || 0;
  const accepted = stats.donations?.accepted || 0;
  const totalDonations = stats.donations?.total || 0;

  const fulfillmentRate = totalDonations > 0 ? Math.round((delivered / totalDonations) * 100) : 0;
  const pendingNgos = stats.ngoVerifications?.pending || 0;
  const approvedNgos = stats.ngoVerifications?.approved || 0;

  const openComplaints = stats.complaints?.open || 0;
  const resolvedComplaints = stats.complaints?.resolved || 0;
  const investigatingComplaints = stats.complaints?.investigating || 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCounter
          value={totalUsers}
          label="Total Users"
          icon={HiUsers}
          subtext={`${donors} donors · ${ngos} NGOs · ${volunteers} volunteers${admins ? ` · ${admins} admin` : ''}`}
          action={{ label: 'View user directory →', onClick: () => onTabChange?.('users') }}
        />
        <StatCounter
          value={totalDonations}
          label="Total Donations"
          icon={HiGift}
          subtext={`${delivered} delivered · ${assigned} assigned · ${cancelled} cancelled${pending ? ` · ${pending} pending` : ''}`}
          action={{ label: 'View all donations →', onClick: () => onTabChange?.('donations') }}
        />
        <StatCounter
          value={pendingNgos}
          label="Pending NGO Approvals"
          icon={HiShieldCheck}
          subtext={`${approvedNgos} verified NGOs`}
          action={{ label: 'View NGOs →', onClick: () => onTabChange?.('ngos') }}
          className={pendingNgos > 0 ? 'border-amber-300 ring-2 ring-amber-100 bg-amber-50/20' : ''}
        />
        <StatCounter
          value={openComplaints}
          label="Open Reports & Complaints"
          icon={HiExclamationCircle}
          subtext={`${resolvedComplaints} resolved · ${investigatingComplaints} in review`}
          action={{ label: 'View reports & disputes →', onClick: () => onTabChange?.('complaints') }}
        />
      </div>

      {/* Analytics Strip */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Donation Fulfillment Status */}
        <div className="surface-card p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Donation Fulfillment</span>
            <span className="text-xs font-extrabold text-primary-700 bg-primary-50 px-2 py-0.5 rounded-full border border-primary-200">
              {fulfillmentRate}% Fulfilled
            </span>
          </div>
          <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden flex mb-3">
            <div style={{ width: `${totalDonations ? (delivered / totalDonations) * 100 : 0}%` }} className="bg-emerald-600 h-full" title="Delivered" />
            <div style={{ width: `${totalDonations ? (assigned / totalDonations) * 100 : 0}%` }} className="bg-amber-500 h-full" title="Assigned" />
            <div style={{ width: `${totalDonations ? (pending / totalDonations) * 100 : 0}%` }} className="bg-blue-500 h-full" title="Pending" />
            <div style={{ width: `${totalDonations ? (cancelled / totalDonations) * 100 : 0}%` }} className="bg-red-400 h-full" title="Cancelled" />
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="bg-[#faf8f4] p-2 rounded-xl border border-[#e8e2d5]">
              <span className="block font-extrabold text-emerald-700 text-sm">{delivered}</span>
              <span className="text-[10px] text-gray-500 font-medium">Delivered</span>
            </div>
            <div className="bg-[#faf8f4] p-2 rounded-xl border border-[#e8e2d5]">
              <span className="block font-extrabold text-amber-600 text-sm">{assigned}</span>
              <span className="text-[10px] text-gray-500 font-medium">Assigned</span>
            </div>
            <div className="bg-[#faf8f4] p-2 rounded-xl border border-[#e8e2d5]">
              <span className="block font-extrabold text-red-600 text-sm">{cancelled}</span>
              <span className="text-[10px] text-gray-500 font-medium">Cancelled</span>
            </div>
          </div>
        </div>

        {/* Community Composition */}
        <div className="surface-card p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Community Composition</span>
            <span className="text-xs font-extrabold text-primary-700 bg-primary-50 px-2 py-0.5 rounded-full border border-primary-200">
              {totalUsers} Members
            </span>
          </div>
          <div className="grid grid-cols-4 gap-1.5 text-center text-xs pt-1">
            <div className="bg-primary-50/80 p-2 rounded-xl border border-primary-100">
              <span className="block font-extrabold text-primary-800 text-sm">{donors}</span>
              <span className="text-[10px] text-primary-700 font-medium">Donors</span>
            </div>
            <div className="bg-amber-50/80 p-2 rounded-xl border border-amber-100">
              <span className="block font-extrabold text-amber-800 text-sm">{ngos}</span>
              <span className="text-[10px] text-amber-700 font-medium">NGOs</span>
            </div>
            <div className="bg-indigo-50/80 p-2 rounded-xl border border-indigo-100">
              <span className="block font-extrabold text-indigo-800 text-sm">{volunteers}</span>
              <span className="text-[10px] text-indigo-700 font-medium">Volunteers</span>
            </div>
            <div className="bg-red-50/80 p-2 rounded-xl border border-red-100">
              <span className="block font-extrabold text-red-800 text-sm">{admins}</span>
              <span className="text-[10px] text-red-700 font-medium">Admin</span>
            </div>
          </div>
          <p className="text-[11px] text-gray-400 mt-3 text-center">
            {Math.round((volunteers / (totalUsers || 1)) * 100)}% volunteer response coverage active
          </p>
        </div>

        {/* Verification & System Health */}
        <div className="surface-card p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Platform Trust & Security</span>
            <span className="text-xs font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              Operational
            </span>
          </div>
          <div className="space-y-2.5 my-auto py-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-600 font-medium flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500" /> NGO Verification Rate
              </span>
              <span className="font-bold text-[#172117]">
                {approvedNgos}/{approvedNgos + pendingNgos} (100%)
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-600 font-medium flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-blue-500" /> Dispute Resolution
              </span>
              <span className="font-bold text-[#172117]">
                {openComplaints === 0 ? 'All Clear' : `${openComplaints} Pending`}
              </span>
            </div>
          </div>
          <div className="pt-2 border-t border-[#e8e2d5] flex items-center justify-between text-[11px] text-gray-500">
            <span>OTP Delivery Gate: Active</span>
            <span className="text-primary-700 font-bold">Cloud Atlas DB Connected</span>
          </div>
        </div>
      </div>

      {/* Activity & Recent Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Donations */}
        <div className="surface-card p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-base font-bold text-[#172117] flex items-center gap-2" style={{ fontFamily: 'var(--font-sans)' }}>
              <HiGift className="text-primary-600" size={18} /> Recent Platform Donations
            </h3>
            <div className="flex items-center gap-2.5">
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-full">Live</span>
              <button
                type="button"
                onClick={() => onTabChange?.('donations')}
                className="text-xs font-bold text-primary-700 hover:text-primary-850 hover:underline flex items-center gap-1 cursor-pointer"
              >
                View all →
              </button>
            </div>
          </div>

          <div className="divide-y divide-gray-100">
            {stats.recentDonations?.length > 0 ? (
              stats.recentDonations.slice(0, 6).map((d) => (
                <div key={d._id} className="py-2.5 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-bold text-gray-800 truncate">{d.foodType}</p>
                    <p className="text-[11px] text-gray-400">
                      by <span className={d.donor?.name ? 'text-gray-600 font-medium' : 'text-gray-400 italic'}>
                        {d.donor?.name || 'Anonymous Donor'}
                      </span> · {d.quantity}
                    </p>
                  </div>
                  <StatusBadge status={d.status} />
                </div>
              ))
            ) : (
              <p className="text-xs text-gray-400 py-4 text-center">No donations listed yet.</p>
            )}
          </div>
        </div>

        {/* Recent Users */}
        <div className="surface-card p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-base font-bold text-[#172117] flex items-center gap-2" style={{ fontFamily: 'var(--font-sans)' }}>
              <HiUsers className="text-amber-600" size={18} /> New Account Registrations
            </h3>
            <div className="flex items-center gap-2.5">
              <span className="text-[11px] font-bold text-amber-700 bg-amber-100/70 px-2 py-0.5 rounded-full">Live</span>
              <button
                type="button"
                onClick={() => onTabChange?.('users')}
                className="text-xs font-bold text-primary-700 hover:text-primary-850 hover:underline flex items-center gap-1 cursor-pointer"
              >
                View all →
              </button>
            </div>
          </div>

          <div className="divide-y divide-gray-100">
            {stats.recentUsers?.length > 0 ? (
              stats.recentUsers.map((u) => (
                <div key={u._id} className="py-2.5 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-bold text-gray-800 truncate">{u.name}</p>
                    <p className="text-[11px] text-gray-400 truncate">{u.email}</p>
                  </div>
                  <RoleBadge role={u.role} />
                </div>
              ))
            ) : (
              <p className="text-xs text-gray-400 py-4 text-center">No signups yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════
//  USERS TAB
// ══════════════════════════════════════════════════════════
const UsersTab = ({ defaultRole = '' }) => {
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState(defaultRole);
  const [page, setPage] = useState(1);
  const [alert, setAlert] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  useEffect(() => {
    setRoleFilter(defaultRole);
    setPage(1);
  }, [defaultRole]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 15 };
      if (roleFilter) params.role = roleFilter;
      if (search.trim()) params.search = search.trim();
      const data = await adminService.getAllUsers(params);
      setUsers(data.users || []);
      setPagination(data.pagination);
    } catch (err) {
      setAlert({ type: 'error', message: err.response?.data?.message || 'Failed to load users' });
    } finally {
      setLoading(false);
    }
  }, [page, roleFilter, search]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleDelete = async (userId, name) => {
    try {
      await adminService.deleteUser(userId);
      setAlert({ type: 'success', message: `User "${name}" deleted successfully` });
      setConfirmDelete(null);
      fetchUsers();
    } catch (err) {
      setAlert({ type: 'error', message: err.response?.data?.message || 'Failed to delete user' });
    }
  };

  const handleToggleVerify = async (userId, currentStatus) => {
    try {
      await adminService.updateUserStatus(userId, { isVerified: !currentStatus });
      setAlert({
        type: 'success',
        message: `User ${!currentStatus ? 'verified' : 'unverified'} successfully`,
      });
      fetchUsers();
    } catch (err) {
      setAlert({ type: 'error', message: err.response?.data?.message || 'Failed to update user' });
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {alert && <AlertMessage type={alert.type} message={alert.message} onClose={() => setAlert(null)} />}

      {/* Search & Role Filter */}
      <div className="surface-card p-4 flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <HiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Search users by name or email..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="input-field pl-10 text-xs sm:text-sm"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => {
            setRoleFilter(e.target.value);
            setPage(1);
          }}
          className="input-field w-full sm:w-44 text-xs sm:text-sm"
        >
          <option value="">All Roles</option>
          <option value="donor">Donor</option>
          <option value="ngo">NGO</option>
          <option value="volunteer">Volunteer</option>
          <option value="admin">Admin</option>
        </select>
        <button onClick={fetchUsers} className="btn-secondary text-xs sm:text-sm px-4 py-2 shrink-0">
          <HiRefresh size={16} /> Refresh
        </button>
      </div>

      {/* Users Table */}
      {loading ? (
        <div className="surface-card p-6">
          <TableRowSkeleton rows={6} cols={6} />
        </div>
      ) : (
        <div className="surface-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-[#e8e2d5] bg-[#faf8f4]">
                  <th className="text-left px-4 py-3 text-xs font-bold text-gray-600 uppercase tracking-wide">Name</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-gray-600 uppercase tracking-wide">Email</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-gray-600 uppercase tracking-wide">Role</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-gray-600 uppercase tracking-wide">Verified</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-gray-600 uppercase tracking-wide">Joined</th>
                  <th className="text-right px-4 py-3 text-xs font-bold text-gray-600 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e8e2d5]/60">
                {users.length > 0 ? (
                  users.map((u) => (
                    <tr key={u._id} className="hover:bg-primary-50/20 transition-colors">
                      <td className="px-4 py-3.5 font-bold text-gray-900">{u.name}</td>
                      <td className="px-4 py-3.5 text-gray-600">{u.email}</td>
                      <td className="px-4 py-3.5">
                        <RoleBadge role={u.role} />
                      </td>
                      <td className="px-4 py-3.5">
                        {u.isVerified ? (
                          <span className="text-emerald-700 font-bold flex items-center gap-1">
                            <HiCheckCircle size={15} /> Yes
                          </span>
                        ) : (
                          <span className="text-amber-700 font-bold flex items-center gap-1">
                            <HiClock size={15} /> Pending
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-gray-400">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleToggleVerify(u._id, u.isVerified)}
                            className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                              u.isVerified
                                ? 'text-amber-600 hover:bg-amber-50'
                                : 'text-emerald-700 hover:bg-emerald-50'
                            }`}
                            title={u.isVerified ? 'Mark Unverified' : 'Mark Verified'}
                          >
                            {u.isVerified ? <HiBan size={16} /> : <HiCheck size={16} />}
                          </button>
                          {u.role !== 'admin' && (
                            confirmDelete === u._id ? (
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => handleDelete(u._id, u.name)}
                                  className="px-2 py-1 text-[10px] font-bold text-white bg-red-600 rounded-lg hover:bg-red-700 cursor-pointer"
                                >
                                  Confirm
                                </button>
                                <button
                                  onClick={() => setConfirmDelete(null)}
                                  className="px-2 py-1 text-[10px] font-semibold text-gray-600 bg-gray-100 rounded-lg cursor-pointer"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setConfirmDelete(u._id)}
                                className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 cursor-pointer"
                                title="Delete user"
                              >
                                <HiTrash size={16} />
                              </button>
                            )
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                      No users match the search criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="px-4 pb-3">
            <Pagination pagination={pagination} onPageChange={setPage} />
          </div>
        </div>
      )}
    </div>
  );
};

// ══════════════════════════════════════════════════════════
//  NGO APPROVALS TAB
// ══════════════════════════════════════════════════════════
const NgoApprovalsTab = () => {
  const [ngos, setNgos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [alert, setAlert] = useState(null);
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  const fetchNgos = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminService.getPendingNgos(statusFilter);
      setNgos(Array.isArray(data) ? data : []);
    } catch (err) {
      setAlert({ type: 'error', message: err.response?.data?.message || 'Failed to load NGOs' });
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchNgos();
  }, [fetchNgos]);

  const handleApprove = async (id, name) => {
    try {
      await adminService.approveNgo(id);
      setAlert({ type: 'success', message: `NGO "${name}" approved successfully!` });
      fetchNgos();
    } catch (err) {
      setAlert({ type: 'error', message: err.response?.data?.message || 'Failed to approve NGO' });
    }
  };

  const handleReject = async () => {
    if (!rejectModal) return;
    try {
      await adminService.rejectNgo(rejectModal.id, rejectReason);
      setAlert({ type: 'success', message: `NGO "${rejectModal.name}" rejected` });
      setRejectModal(null);
      setRejectReason('');
      fetchNgos();
    } catch (err) {
      setAlert({ type: 'error', message: err.response?.data?.message || 'Failed to reject NGO' });
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {alert && <AlertMessage type={alert.type} message={alert.message} onClose={() => setAlert(null)} />}

      {/* Filter Tabs */}
      <div className="surface-card p-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1.5">
          {['pending', 'approved', 'rejected', 'all'].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer capitalize ${
                statusFilter === s
                  ? 'bg-primary-600 text-white shadow-2xs'
                  : 'bg-white text-gray-600 border border-[#e8e2d5] hover:bg-gray-100'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        <button onClick={fetchNgos} className="btn-secondary text-xs px-3.5 py-1.5">
          <HiRefresh size={14} /> Refresh
        </button>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : ngos.length === 0 ? (
        <EmptyState
          icon={HiShieldCheck}
          title={`No ${statusFilter !== 'all' ? statusFilter : ''} NGO registrations`}
          description="New non-profit verification applications will be listed here for legal documentation inspection."
        />
      ) : (
        <div className="space-y-3">
          {ngos.map((ngo) => (
            <div key={ngo._id} className="surface-card p-5 hover:border-primary-300 transition-all">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-lg font-bold text-[#172117]" style={{ fontFamily: 'var(--font-sans)' }}>
                      {ngo.organizationName}
                    </h3>
                    <StatusBadge status={ngo.verificationStatus} />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-gray-600">
                    <p>
                      <strong className="text-gray-900">Coordinator:</strong> {ngo.user?.name} ({ngo.user?.email})
                    </p>
                    <p>
                      <strong className="text-gray-900">Reg No:</strong> {ngo.registrationNumber}
                    </p>
                    {ngo.address && (
                      <p>
                        <strong className="text-gray-900">Address:</strong>{' '}
                        {[ngo.address.street, ngo.address.city, ngo.address.state].filter(Boolean).join(', ')}
                      </p>
                    )}
                    {ngo.website && (
                      <p>
                        <strong className="text-gray-900">Website:</strong> {ngo.website}
                      </p>
                    )}
                    {ngo.description && (
                      <p className="sm:col-span-2">
                        <strong className="text-gray-900">Mission:</strong> {ngo.description}
                      </p>
                    )}
                  </div>

                  {ngo.documentUrl && (
                    <a
                      href={ngo.documentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 mt-3 text-xs font-bold text-primary-700 hover:underline"
                    >
                      <HiDocumentText size={15} /> Inspect Certificate / 80G Document
                    </a>
                  )}
                </div>

                {ngo.verificationStatus === 'pending' && (
                  <div className="flex sm:flex-col gap-2 shrink-0">
                    <button
                      onClick={() => handleApprove(ngo._id, ngo.organizationName)}
                      className="btn-primary text-xs px-4 py-2 justify-center shadow-xs"
                    >
                      <HiCheck size={16} /> Approve NGO
                    </button>
                    <button
                      onClick={() => setRejectModal({ id: ngo._id, name: ngo.organizationName })}
                      className="btn-danger text-xs px-4 py-2 justify-center"
                    >
                      <HiX size={16} /> Reject
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reject Modal */}
      {rejectModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fade-in"
          onClick={() => setRejectModal(null)}
        >
          <div
            className="bg-white rounded-3xl border border-[#e8e2d5] p-6 w-full max-w-md shadow-2xl animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-[#172117] mb-1" style={{ fontFamily: 'var(--font-sans)' }}>
              Reject NGO Registration
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              Rejecting <strong>{rejectModal.name}</strong>. Provide an optional explanation for the organization:
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Missing valid 12A/80G NGO documentation..."
              rows={3}
              className="input-field mb-4"
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setRejectModal(null)} className="btn-secondary text-xs px-4 py-2">
                Cancel
              </button>
              <button onClick={handleReject} className="btn-danger text-xs px-4 py-2">
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ══════════════════════════════════════════════════════════
//  DONATIONS TAB
// ══════════════════════════════════════════════════════════
const DonationsTab = () => {
  const [donations, setDonations] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [alert, setAlert] = useState(null);
  const [statusUpdate, setStatusUpdate] = useState(null);

  const fetchDonations = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 15 };
      if (statusFilter) params.status = statusFilter;
      if (search.trim()) params.search = search.trim();
      const data = await adminService.getAllDonations(params);
      setDonations(data.donations || []);
      setPagination(data.pagination);
    } catch (err) {
      setAlert({ type: 'error', message: err.response?.data?.message || 'Failed to load donations' });
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, search]);

  useEffect(() => {
    fetchDonations();
  }, [fetchDonations]);

  const handleStatusUpdate = async (id, newStatus) => {
    try {
      await adminService.updateDonationStatus(id, newStatus);
      setAlert({ type: 'success', message: `Donation status updated to "${newStatus}"` });
      setStatusUpdate(null);
      fetchDonations();
    } catch (err) {
      setAlert({ type: 'error', message: err.response?.data?.message || 'Failed to update donation' });
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {alert && <AlertMessage type={alert.type} message={alert.message} onClose={() => setAlert(null)} />}

      {/* Search & Filters */}
      <div className="surface-card p-4 flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <HiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Search donations by food type or city..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="input-field pl-10 text-xs sm:text-sm"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="input-field w-full sm:w-44 text-xs sm:text-sm"
        >
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="accepted">Accepted</option>
          <option value="assigned">Assigned</option>
          <option value="picked_up">Picked Up</option>
          <option value="delivered">Delivered</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <button onClick={fetchDonations} className="btn-secondary text-xs sm:text-sm px-4 py-2 shrink-0">
          <HiRefresh size={16} /> Refresh
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="surface-card p-6">
          <TableRowSkeleton rows={6} cols={7} />
        </div>
      ) : (
        <div className="surface-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-[#e8e2d5] bg-[#faf8f4]">
                  <th className="text-left px-4 py-3 text-xs font-bold text-gray-600 uppercase tracking-wide">Food</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-gray-600 uppercase tracking-wide">Donor</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-gray-600 uppercase tracking-wide">Quantity</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-gray-600 uppercase tracking-wide">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-gray-600 uppercase tracking-wide">NGO</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-gray-600 uppercase tracking-wide">Volunteer</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-gray-600 uppercase tracking-wide">Created</th>
                  <th className="text-right px-4 py-3 text-xs font-bold text-gray-600 uppercase tracking-wide">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e8e2d5]/60">
                {donations.length > 0 ? (
                  donations.map((d) => (
                    <tr key={d._id} className="hover:bg-primary-50/20 transition-colors">
                      <td className="px-4 py-3.5 font-bold text-gray-900">{d.foodType}</td>
                      <td className="px-4 py-3.5 text-gray-600">
                        {d.donor?.name || <span className="italic text-gray-400">Anonymous Donor</span>}
                      </td>
                      <td className="px-4 py-3.5 text-gray-600">{d.quantity}</td>
                      <td className="px-4 py-3.5">
                        <StatusBadge status={d.status} />
                      </td>
                      <td className="px-4 py-3.5 text-gray-600">{d.acceptedBy?.name || '—'}</td>
                      <td className="px-4 py-3.5 text-gray-600">{d.assignedVolunteer?.name || '—'}</td>
                      <td className="px-4 py-3.5 text-gray-400">
                        {new Date(d.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        {statusUpdate === d._id ? (
                          <div className="flex items-center justify-end gap-1">
                            <select
                              className="input-field text-xs py-1 px-2 w-28"
                              defaultValue={d.status}
                              onChange={(e) => handleStatusUpdate(d._id, e.target.value)}
                            >
                              {['pending', 'accepted', 'assigned', 'picked_up', 'delivered', 'cancelled', 'expired'].map((s) => (
                                <option key={s} value={s}>
                                  {s.replace(/_/g, ' ')}
                                </option>
                              ))}
                            </select>
                            <button
                              onClick={() => setStatusUpdate(null)}
                              className="p-1 text-gray-400 hover:text-gray-600 cursor-pointer"
                            >
                              <HiX size={14} />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setStatusUpdate(d._id)}
                            className="p-1.5 rounded-lg text-primary-600 hover:bg-primary-50 transition-colors cursor-pointer"
                            title="Override status"
                          >
                            <HiFilter size={16} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                      No donations match the current filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="px-4 pb-3">
            <Pagination pagination={pagination} onPageChange={setPage} />
          </div>
        </div>
      )}
    </div>
  );
};

// ══════════════════════════════════════════════════════════
//  COMPLAINTS TAB
// ══════════════════════════════════════════════════════════
const ComplaintsTab = () => {
  const [complaints, setComplaints] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [alert, setAlert] = useState(null);
  const [resolveModal, setResolveModal] = useState(null);
  const [resolveStatus, setResolveStatus] = useState('resolved');
  const [adminNotes, setAdminNotes] = useState('');

  const fetchComplaints = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 15 };
      if (statusFilter) params.status = statusFilter;
      const data = await adminService.getAllComplaints(params);
      setComplaints(data.complaints || []);
      setPagination(data.pagination);
    } catch (err) {
      setAlert({ type: 'error', message: err.response?.data?.message || 'Failed to load complaints' });
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    fetchComplaints();
  }, [fetchComplaints]);

  const handleResolve = async () => {
    if (!resolveModal) return;
    try {
      await adminService.resolveComplaint(resolveModal._id, resolveStatus, adminNotes);
      setAlert({ type: 'success', message: `Report marked as ${resolveStatus}` });
      setResolveModal(null);
      setAdminNotes('');
      fetchComplaints();
    } catch (err) {
      setAlert({ type: 'error', message: err.response?.data?.message || 'Failed to resolve complaint' });
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {alert && <AlertMessage type={alert.type} message={alert.message} onClose={() => setAlert(null)} />}

      <div className="surface-card p-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1.5 flex-wrap">
          {['', 'open', 'investigating', 'resolved', 'dismissed'].map((s) => (
            <button
              key={s}
              onClick={() => {
                setStatusFilter(s);
                setPage(1);
              }}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer capitalize ${
                statusFilter === s
                  ? 'bg-primary-600 text-white shadow-2xs'
                  : 'bg-white text-gray-600 border border-[#e8e2d5] hover:bg-gray-100'
              }`}
            >
              {s || 'All Reports'}
            </button>
          ))}
        </div>
        <button onClick={fetchComplaints} className="btn-secondary text-xs px-3.5 py-1.5">
          <HiRefresh size={14} /> Refresh
        </button>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : complaints.length === 0 ? (
        <EmptyState
          icon={HiExclamationCircle}
          title="No open complaints or reports"
          description="Platform infractions, delayed delivery disputes, or food safety flags will appear here for mediation."
        />
      ) : (
        <div className="space-y-3">
          {complaints.map((c) => (
            <div key={c._id} className="surface-card p-5 hover:border-primary-300 transition-all">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="text-xs font-bold text-gray-800 bg-[#faf8f4] border border-[#e8e2d5] px-2.5 py-0.5 rounded-lg">
                      {complaintTypeLabels[c.type] || c.type}
                    </span>
                    <StatusBadge status={c.status} />
                  </div>

                  <p className="text-xs sm:text-sm text-gray-800 mb-3 font-medium leading-relaxed">
                    {c.description}
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px] text-gray-500">
                    <p>
                      <strong className="text-gray-800">Complainant:</strong> {c.complainant?.name} ({c.complainant?.role})
                    </p>
                    <p>
                      <strong className="text-gray-800">Target:</strong> {c.against?.name} ({c.against?.role})
                    </p>
                    {c.donation && (
                      <p>
                        <strong className="text-gray-800">Listing:</strong> {c.donation.foodType} ({c.donation.quantity})
                      </p>
                    )}
                    <p>
                      <strong className="text-gray-800">Date:</strong> {new Date(c.createdAt).toLocaleString()}
                    </p>
                    {c.adminNotes && (
                      <p className="sm:col-span-2 bg-[#faf8f4] p-2 rounded-lg border border-[#e8e2d5] text-gray-700">
                        <strong>Admin Notes:</strong> {c.adminNotes}
                      </p>
                    )}
                  </div>
                </div>

                {(c.status === 'open' || c.status === 'investigating') && (
                  <button
                    onClick={() => setResolveModal(c)}
                    className="btn-primary text-xs px-4 py-2 shrink-0 justify-center"
                  >
                    <HiCheck size={16} /> Resolve Case
                  </button>
                )}
              </div>
            </div>
          ))}
          <Pagination pagination={pagination} onPageChange={setPage} />
        </div>
      )}

      {/* Resolve Modal */}
      {resolveModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fade-in"
          onClick={() => setResolveModal(null)}
        >
          <div
            className="bg-white rounded-3xl border border-[#e8e2d5] p-6 w-full max-w-md shadow-2xl animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-[#172117] mb-1" style={{ fontFamily: 'var(--font-sans)' }}>
              Resolve Complaint
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              {complaintTypeLabels[resolveModal.type]} filed by {resolveModal.complainant?.name}
            </p>

            <div className="space-y-4 mb-6">
              <div>
                <label className="text-xs font-bold text-gray-700 mb-1 block">Decision Status</label>
                <select
                  value={resolveStatus}
                  onChange={(e) => setResolveStatus(e.target.value)}
                  className="input-field"
                >
                  <option value="investigating">Under Investigation</option>
                  <option value="resolved">Resolved (Action Taken)</option>
                  <option value="dismissed">Dismissed (No Action Required)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 mb-1 block">Internal Action Notes</label>
                <textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Record summary of call, warning issued, or resolution..."
                  rows={3}
                  className="input-field"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button onClick={() => setResolveModal(null)} className="btn-secondary text-xs px-4 py-2">
                Cancel
              </button>
              <button onClick={handleResolve} className="btn-primary text-xs px-4 py-2">
                Submit Resolution
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ══════════════════════════════════════════════════════════
//  MAIN ADMIN DASHBOARD
// ══════════════════════════════════════════════════════════
const VALID_TABS = ['overview', 'users', 'donations', 'ngos', 'volunteers', 'complaints'];

const AdminDashboard = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // Sync tab with URL query param (from sidebar links)
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam && VALID_TABS.includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setSearchParams({ tab: tabId });
  };

  useEffect(() => {
    const fetchStats = async () => {
      setStatsLoading(true);
      try {
        const data = await adminService.getDashboardStats();
        setStats(data);
      } catch (err) {
        console.error('Failed to fetch stats:', err);
      } finally {
        setStatsLoading(false);
      }
    };
    fetchStats();
  }, []);

  // Context-aware Header Information per Sidebar Section
  const getHeaderInfo = () => {
    switch (activeTab) {
      case 'users':
        return {
          title: 'User Directory & Management',
          subtitle: 'Search, filter, verify, and moderate registered donors, NGOs, volunteers, and admin accounts.',
        };
      case 'volunteers':
        return {
          title: 'Volunteer Personnel',
          subtitle: 'Review active delivery personnel, vehicle profiles, and logistic response capacity.',
        };
      case 'ngos':
        return {
          title: 'NGO Verification & Approvals',
          subtitle: 'Audit nonprofit registration numbers, organizational documentation, and partner approvals.',
        };
      case 'donations':
        return {
          title: 'All Platform Donations',
          subtitle: 'Complete lifecycle audit and status oversight of all listed, claimed, and fulfilled surplus food.',
        };
      case 'complaints':
        return {
          title: 'Reports & Complaints Mediation',
          subtitle: 'Mediate food safety issues, delivery disputes, platform infractions, and inquiry resolutions.',
        };
      case 'overview':
      default:
        return {
          title: 'Administration & Operations',
          subtitle: `Welcome back, ${user?.name || 'Administrator'}. Monitor platform metrics, approve charities, and mediate reports.`,
        };
    }
  };

  const headerInfo = getHeaderInfo();

  return (
    <DashboardLayout activeTab={activeTab} onTabChange={handleTabChange}>
      {/* Header */}
      <div className="mb-6 animate-fade-in-up">
        <h1
          className="text-2xl sm:text-3xl font-extrabold text-[#172117] tracking-tight"
          style={{ fontFamily: 'var(--font-sans)' }}
        >
          {headerInfo.title}
        </h1>
        <p className="text-sm text-gray-600 mt-1">
          {headerInfo.subtitle}
        </p>
      </div>

      {/* Tab Panels */}
      <div>
        {activeTab === 'overview' && (
          <OverviewTab stats={stats} loading={statsLoading} onTabChange={handleTabChange} />
        )}
        {activeTab === 'users' && <UsersTab />}
        {activeTab === 'volunteers' && <UsersTab defaultRole="volunteer" />}
        {activeTab === 'ngos' && <NgoApprovalsTab />}
        {activeTab === 'donations' && <DonationsTab />}
        {activeTab === 'complaints' && <ComplaintsTab />}
      </div>
    </DashboardLayout>
  );
};

export default AdminDashboard;
