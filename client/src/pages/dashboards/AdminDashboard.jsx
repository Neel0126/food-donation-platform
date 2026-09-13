import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../components/layout/DashboardLayout';
import AlertMessage from '../../components/common/AlertMessage';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import {
  HiUsers, HiShieldCheck, HiGift, HiChartBar,
  HiExclamationCircle, HiSearch, HiCheck, HiX,
  HiEye, HiTrash, HiRefresh, HiDocumentText,
  HiClipboardList, HiUserGroup, HiTruck, HiClock,
  HiCheckCircle, HiBan, HiExclamation, HiArrowLeft,
  HiArrowRight, HiFilter
} from 'react-icons/hi';
import * as adminService from '../../services/adminService';

// ── Status badge colors ──
const statusColors = {
  pending: 'bg-amber-100 text-amber-700',
  accepted: 'bg-blue-100 text-blue-700',
  assigned: 'bg-indigo-100 text-indigo-700',
  picked_up: 'bg-purple-100 text-purple-700',
  delivered: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  open: 'bg-amber-100 text-amber-700',
  investigating: 'bg-blue-100 text-blue-700',
  resolved: 'bg-green-100 text-green-700',
  dismissed: 'bg-gray-100 text-gray-500',
};

const roleColors = {
  donor: 'bg-primary-100 text-primary-700',
  ngo: 'bg-accent-100 text-accent-700',
  volunteer: 'bg-purple-100 text-purple-700',
  admin: 'bg-red-100 text-red-700',
};

const complaintTypeLabels = {
  food_quality: 'Food Quality',
  no_show: 'No Show',
  late_delivery: 'Late Delivery',
  misconduct: 'Misconduct',
  fraud: 'Fraud',
  other: 'Other',
};

const StatusBadge = ({ status, map = statusColors }) => (
  <span className={`inline-block px-2.5 py-1 text-[11px] font-semibold rounded-full uppercase tracking-wide ${map[status] || 'bg-gray-100 text-gray-500'}`}>
    {status?.replace(/_/g, ' ')}
  </span>
);

const RoleBadge = ({ role }) => (
  <span className={`inline-block px-2.5 py-1 text-[11px] font-semibold rounded-full uppercase tracking-wide ${roleColors[role] || 'bg-gray-100 text-gray-500'}`}>
    {role}
  </span>
);

// ── Pagination Component ──
const Pagination = ({ pagination, onPageChange }) => {
  if (!pagination || pagination.pages <= 1) return null;
  return (
    <div className="flex items-center justify-between mt-4 pt-4 border-t border-primary-50">
      <p className="text-xs text-gray-500">
        Showing {((pagination.page - 1) * pagination.limit) + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
      </p>
      <div className="flex gap-2">
        <button
          onClick={() => onPageChange(pagination.page - 1)}
          disabled={pagination.page <= 1}
          className="p-1.5 rounded-lg border border-primary-100 text-gray-500 hover:bg-primary-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
        >
          <HiArrowLeft size={16} />
        </button>
        <span className="flex items-center text-xs text-gray-600 font-medium px-2">
          {pagination.page} / {pagination.pages}
        </span>
        <button
          onClick={() => onPageChange(pagination.page + 1)}
          disabled={pagination.page >= pagination.pages}
          className="p-1.5 rounded-lg border border-primary-100 text-gray-500 hover:bg-primary-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
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
const OverviewTab = ({ stats, loading }) => {
  if (loading) return <LoadingSpinner />;
  if (!stats) return null;

  const statCards = [
    { label: 'Total Users', value: stats.users?.total || 0, icon: HiUsers, color: 'bg-primary-50 text-primary-600', sub: `${stats.users?.donors || 0} donors · ${stats.users?.ngos || 0} NGOs · ${stats.users?.volunteers || 0} volunteers` },
    { label: 'Total Donations', value: stats.donations?.total || 0, icon: HiGift, color: 'bg-accent-100 text-accent-600', sub: `${stats.donations?.delivered || 0} delivered · ${stats.donations?.pending || 0} pending` },
    { label: 'Pending NGO Approvals', value: stats.ngoVerifications?.pending || 0, icon: HiShieldCheck, color: 'bg-amber-50 text-amber-600', sub: `${stats.ngoVerifications?.approved || 0} approved · ${stats.ngoVerifications?.rejected || 0} rejected` },
    { label: 'Open Complaints', value: stats.complaints?.open || 0, icon: HiExclamationCircle, color: 'bg-red-50 text-red-500', sub: `${stats.complaints?.investigating || 0} investigating · ${stats.complaints?.resolved || 0} resolved` },
  ];

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className={`bg-white rounded-2xl border border-primary-100 p-5 flex items-start gap-4 hover:shadow-md hover:shadow-primary-600/5 transition-all duration-250 animate-fade-in-up animate-stagger-${i + 1}`}
            >
              <div className={`h-12 w-12 rounded-xl flex items-center justify-center shrink-0 ${stat.color}`}>
                <Icon size={22} />
              </div>
              <div className="min-w-0">
                <p className="text-2xl font-bold text-gray-800" style={{ fontFamily: 'var(--font-sans)' }}>{stat.value}</p>
                <p className="text-xs text-gray-500 font-medium">{stat.label}</p>
                <p className="text-[10px] text-gray-400 mt-0.5 truncate">{stat.sub}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Donations */}
        <div className="bg-white rounded-2xl border border-primary-100 p-5 animate-fade-in-up animate-stagger-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2" style={{ fontFamily: 'var(--font-sans)' }}>
            <HiGift className="text-primary-500" size={16} /> Recent Donations
          </h3>
          <div className="space-y-2.5">
            {stats.recentDonations?.length > 0 ? stats.recentDonations.slice(0, 6).map((d) => (
              <div key={d._id} className="flex items-center justify-between py-1.5 border-b border-primary-50 last:border-0">
                <div className="min-w-0">
                  <p className="text-sm text-gray-700 truncate font-medium">{d.foodType}</p>
                  <p className="text-[10px] text-gray-400">by {d.donor?.name || 'Unknown'} · {d.quantity}</p>
                </div>
                <StatusBadge status={d.status} />
              </div>
            )) : (
              <p className="text-xs text-gray-400">No donations yet</p>
            )}
          </div>
        </div>

        {/* Recent Users */}
        <div className="bg-white rounded-2xl border border-primary-100 p-5 animate-fade-in-up animate-stagger-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2" style={{ fontFamily: 'var(--font-sans)' }}>
            <HiUsers className="text-accent-500" size={16} /> Recent Signups
          </h3>
          <div className="space-y-2.5">
            {stats.recentUsers?.length > 0 ? stats.recentUsers.map((u) => (
              <div key={u._id} className="flex items-center justify-between py-1.5 border-b border-primary-50 last:border-0">
                <div className="min-w-0">
                  <p className="text-sm text-gray-700 truncate font-medium">{u.name}</p>
                  <p className="text-[10px] text-gray-400">{u.email}</p>
                </div>
                <RoleBadge role={u.role} />
              </div>
            )) : (
              <p className="text-xs text-gray-400">No users yet</p>
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
const UsersTab = () => {
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage] = useState(1);
  const [alert, setAlert] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 15 };
      if (roleFilter) params.role = roleFilter;
      if (search.trim()) params.search = search.trim();
      const data = await adminService.getAllUsers(params);
      setUsers(data.users);
      setPagination(data.pagination);
    } catch (err) {
      setAlert({ type: 'error', message: err.response?.data?.message || 'Failed to load users' });
    } finally {
      setLoading(false);
    }
  }, [page, roleFilter, search]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

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
      setAlert({ type: 'success', message: `User ${!currentStatus ? 'verified' : 'unverified'} successfully` });
      fetchUsers();
    } catch (err) {
      setAlert({ type: 'error', message: err.response?.data?.message || 'Failed to update user' });
    }
  };

  return (
    <div className="space-y-4">
      {alert && <AlertMessage type={alert.type} message={alert.message} onClose={() => setAlert(null)} />}

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <HiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="input-field pl-9"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
          className="input-field w-full sm:w-40"
        >
          <option value="">All Roles</option>
          <option value="donor">Donor</option>
          <option value="ngo">NGO</option>
          <option value="volunteer">Volunteer</option>
          <option value="admin">Admin</option>
        </select>
        <button onClick={fetchUsers} className="btn-secondary shrink-0">
          <HiRefresh size={16} /> Refresh
        </button>
      </div>

      {/* Users Table */}
      {loading ? <LoadingSpinner /> : (
        <div className="bg-white rounded-2xl border border-primary-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-primary-100 bg-primary-50/50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Name</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Email</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Role</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Verified</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Joined</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.length > 0 ? users.map((u) => (
                  <tr key={u._id} className="border-b border-primary-50 hover:bg-primary-50/30 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-800">{u.name}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{u.email}</td>
                    <td className="px-4 py-3"><RoleBadge role={u.role} /></td>
                    <td className="px-4 py-3">
                      {u.isVerified ? (
                        <span className="text-green-600 text-xs font-medium flex items-center gap-1"><HiCheckCircle size={14} /> Yes</span>
                      ) : (
                        <span className="text-amber-500 text-xs font-medium flex items-center gap-1"><HiClock size={14} /> No</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">{new Date(u.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleToggleVerify(u._id, u.isVerified)}
                          className={`p-1.5 rounded-lg transition-all cursor-pointer ${u.isVerified ? 'text-amber-500 hover:bg-amber-50' : 'text-green-600 hover:bg-green-50'}`}
                          title={u.isVerified ? 'Unverify' : 'Verify'}
                        >
                          {u.isVerified ? <HiBan size={16} /> : <HiCheck size={16} />}
                        </button>
                        {u.role !== 'admin' && (
                          confirmDelete === u._id ? (
                            <div className="flex items-center gap-1">
                              <button onClick={() => handleDelete(u._id, u.name)} className="px-2 py-1 text-[10px] font-semibold text-white bg-red-500 rounded-lg hover:bg-red-600 transition-all cursor-pointer">Confirm</button>
                              <button onClick={() => setConfirmDelete(null)} className="px-2 py-1 text-[10px] font-semibold text-gray-500 bg-gray-100 rounded-lg hover:bg-gray-200 transition-all cursor-pointer">Cancel</button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setConfirmDelete(u._id)}
                              className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-all cursor-pointer"
                              title="Delete user"
                            >
                              <HiTrash size={16} />
                            </button>
                          )
                        )}
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-400 text-sm">No users found</td>
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
      setNgos(data);
    } catch (err) {
      setAlert({ type: 'error', message: err.response?.data?.message || 'Failed to load NGOs' });
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { fetchNgos(); }, [fetchNgos]);

  const handleApprove = async (id, name) => {
    try {
      await adminService.approveNgo(id);
      setAlert({ type: 'success', message: `"${name}" approved successfully!` });
      fetchNgos();
    } catch (err) {
      setAlert({ type: 'error', message: err.response?.data?.message || 'Failed to approve NGO' });
    }
  };

  const handleReject = async () => {
    if (!rejectModal) return;
    try {
      await adminService.rejectNgo(rejectModal.id, rejectReason);
      setAlert({ type: 'success', message: `"${rejectModal.name}" rejected` });
      setRejectModal(null);
      setRejectReason('');
      fetchNgos();
    } catch (err) {
      setAlert({ type: 'error', message: err.response?.data?.message || 'Failed to reject NGO' });
    }
  };

  return (
    <div className="space-y-4">
      {alert && <AlertMessage type={alert.type} message={alert.message} onClose={() => setAlert(null)} />}

      {/* Filter */}
      <div className="flex gap-2">
        {['pending', 'approved', 'rejected', 'all'].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${statusFilter === s ? 'bg-primary-600 text-white' : 'bg-primary-50 text-primary-600 hover:bg-primary-100'}`}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
        <button onClick={fetchNgos} className="ml-auto btn-secondary text-xs px-3 py-1.5">
          <HiRefresh size={14} /> Refresh
        </button>
      </div>

      {loading ? <LoadingSpinner /> : (
        <div className="space-y-3">
          {ngos.length > 0 ? ngos.map((ngo) => (
            <div key={ngo._id} className="bg-white rounded-2xl border border-primary-100 p-5 hover:shadow-md hover:shadow-primary-600/5 transition-all animate-fade-in-up">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-base font-bold text-gray-800" style={{ fontFamily: 'var(--font-sans)' }}>{ngo.organizationName}</h3>
                    <StatusBadge status={ngo.verificationStatus} />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-xs text-gray-500">
                    <p><span className="font-medium text-gray-600">Contact:</span> {ngo.user?.name} ({ngo.user?.email})</p>
                    <p><span className="font-medium text-gray-600">Reg #:</span> {ngo.registrationNumber}</p>
                    {ngo.address && (
                      <p><span className="font-medium text-gray-600">Location:</span> {[ngo.address.street, ngo.address.city, ngo.address.state].filter(Boolean).join(', ')}</p>
                    )}
                    {ngo.website && <p><span className="font-medium text-gray-600">Website:</span> {ngo.website}</p>}
                    {ngo.description && <p className="sm:col-span-2"><span className="font-medium text-gray-600">About:</span> {ngo.description}</p>}
                  </div>
                  {ngo.documentUrl && (
                    <a href={ngo.documentUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 mt-2 text-xs text-accent-600 hover:underline">
                      <HiDocumentText size={14} /> View Document
                    </a>
                  )}
                </div>

                {ngo.verificationStatus === 'pending' && (
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => handleApprove(ngo._id, ngo.organizationName)} className="btn-primary text-xs px-4 py-2">
                      <HiCheck size={16} /> Approve
                    </button>
                    <button onClick={() => setRejectModal({ id: ngo._id, name: ngo.organizationName })} className="btn-danger text-xs px-4 py-2">
                      <HiX size={16} /> Reject
                    </button>
                  </div>
                )}
              </div>
            </div>
          )) : (
            <div className="bg-white rounded-2xl border border-primary-100 p-8 text-center">
              <HiShieldCheck className="mx-auto text-gray-300 mb-2" size={32} />
              <p className="text-sm text-gray-400">No {statusFilter !== 'all' ? statusFilter : ''} NGO requests found</p>
            </div>
          )}
        </div>
      )}

      {/* Reject Reason Modal */}
      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm animate-fade-in" onClick={() => setRejectModal(null)}>
          <div className="bg-white rounded-2xl border border-primary-100 p-6 w-full max-w-md mx-4 animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-800 mb-1" style={{ fontFamily: 'var(--font-sans)' }}>Reject NGO</h3>
            <p className="text-sm text-gray-500 mb-4">Rejecting <strong>{rejectModal.name}</strong>. Optionally provide a reason:</p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Reason for rejection (optional)..."
              rows={3}
              className="input-field mb-4"
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setRejectModal(null)} className="btn-secondary text-xs">Cancel</button>
              <button onClick={handleReject} className="btn-danger text-xs">Reject NGO</button>
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
      setDonations(data.donations);
      setPagination(data.pagination);
    } catch (err) {
      setAlert({ type: 'error', message: err.response?.data?.message || 'Failed to load donations' });
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, search]);

  useEffect(() => { fetchDonations(); }, [fetchDonations]);

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
    <div className="space-y-4">
      {alert && <AlertMessage type={alert.type} message={alert.message} onClose={() => setAlert(null)} />}

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <HiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Search by food type, city..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="input-field pl-9"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="input-field w-full sm:w-40"
        >
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="accepted">Accepted</option>
          <option value="assigned">Assigned</option>
          <option value="picked_up">Picked Up</option>
          <option value="delivered">Delivered</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <button onClick={fetchDonations} className="btn-secondary shrink-0">
          <HiRefresh size={16} /> Refresh
        </button>
      </div>

      {loading ? <LoadingSpinner /> : (
        <div className="bg-white rounded-2xl border border-primary-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-primary-100 bg-primary-50/50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Food</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Donor</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Qty</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">NGO</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Volunteer</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Action</th>
                </tr>
              </thead>
              <tbody>
                {donations.length > 0 ? donations.map((d) => (
                  <tr key={d._id} className="border-b border-primary-50 hover:bg-primary-50/30 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-800">{d.foodType}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{d.donor?.name || '—'}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{d.quantity}</td>
                    <td className="px-4 py-3"><StatusBadge status={d.status} /></td>
                    <td className="px-4 py-3 text-xs text-gray-500">{d.acceptedBy?.name || '—'}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{d.assignedVolunteer?.name || '—'}</td>
                    <td className="px-4 py-3 text-xs text-gray-400">{new Date(d.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end">
                        {statusUpdate === d._id ? (
                          <div className="flex items-center gap-1">
                            <select
                              id={`status-select-${d._id}`}
                              className="input-field text-xs py-1 px-2 w-28"
                              defaultValue={d.status}
                              onChange={(e) => handleStatusUpdate(d._id, e.target.value)}
                            >
                              {['pending', 'accepted', 'assigned', 'picked_up', 'delivered', 'cancelled'].map((s) => (
                                <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                              ))}
                            </select>
                            <button onClick={() => setStatusUpdate(null)} className="p-1 text-gray-400 hover:text-gray-600 cursor-pointer">
                              <HiX size={14} />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setStatusUpdate(d._id)}
                            className="p-1.5 rounded-lg text-primary-500 hover:bg-primary-50 transition-all cursor-pointer"
                            title="Change status"
                          >
                            <HiFilter size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-gray-400 text-sm">No donations found</td>
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
      setComplaints(data.complaints);
      setPagination(data.pagination);
    } catch (err) {
      setAlert({ type: 'error', message: err.response?.data?.message || 'Failed to load complaints' });
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => { fetchComplaints(); }, [fetchComplaints]);

  const handleResolve = async () => {
    if (!resolveModal) return;
    try {
      await adminService.resolveComplaint(resolveModal._id, resolveStatus, adminNotes);
      setAlert({ type: 'success', message: `Complaint ${resolveStatus} successfully` });
      setResolveModal(null);
      setAdminNotes('');
      fetchComplaints();
    } catch (err) {
      setAlert({ type: 'error', message: err.response?.data?.message || 'Failed to resolve complaint' });
    }
  };

  return (
    <div className="space-y-4">
      {alert && <AlertMessage type={alert.type} message={alert.message} onClose={() => setAlert(null)} />}

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {['', 'open', 'investigating', 'resolved', 'dismissed'].map((s) => (
          <button
            key={s}
            onClick={() => { setStatusFilter(s); setPage(1); }}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${statusFilter === s ? 'bg-primary-600 text-white' : 'bg-primary-50 text-primary-600 hover:bg-primary-100'}`}
          >
            {s ? s.charAt(0).toUpperCase() + s.slice(1) : 'All'}
          </button>
        ))}
        <button onClick={fetchComplaints} className="ml-auto btn-secondary text-xs px-3 py-1.5">
          <HiRefresh size={14} /> Refresh
        </button>
      </div>

      {loading ? <LoadingSpinner /> : (
        <div className="space-y-3">
          {complaints.length > 0 ? complaints.map((c) => (
            <div key={c._id} className="bg-white rounded-2xl border border-primary-100 p-5 hover:shadow-md hover:shadow-primary-600/5 transition-all animate-fade-in-up">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span className="text-xs font-bold text-gray-700 uppercase tracking-wide bg-gray-100 px-2 py-0.5 rounded">
                      {complaintTypeLabels[c.type] || c.type}
                    </span>
                    <StatusBadge status={c.status} />
                  </div>
                  <p className="text-sm text-gray-700 mb-2">{c.description}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[11px] text-gray-400">
                    <p><span className="font-medium text-gray-500">Filed by:</span> {c.complainant?.name} ({c.complainant?.role})</p>
                    <p><span className="font-medium text-gray-500">Against:</span> {c.against?.name} ({c.against?.role})</p>
                    {c.donation && <p><span className="font-medium text-gray-500">Donation:</span> {c.donation.foodType} — {c.donation.quantity}</p>}
                    <p><span className="font-medium text-gray-500">Filed:</span> {new Date(c.createdAt).toLocaleString()}</p>
                    {c.resolvedBy && <p><span className="font-medium text-gray-500">Resolved by:</span> {c.resolvedBy.name} on {new Date(c.resolvedAt).toLocaleDateString()}</p>}
                    {c.adminNotes && <p className="sm:col-span-2"><span className="font-medium text-gray-500">Admin Notes:</span> {c.adminNotes}</p>}
                  </div>
                </div>

                {(c.status === 'open' || c.status === 'investigating') && (
                  <button
                    onClick={() => setResolveModal(c)}
                    className="btn-primary text-xs px-4 py-2 shrink-0"
                  >
                    <HiCheck size={16} /> Resolve
                  </button>
                )}
              </div>
            </div>
          )) : (
            <div className="bg-white rounded-2xl border border-primary-100 p-8 text-center">
              <HiExclamationCircle className="mx-auto text-gray-300 mb-2" size={32} />
              <p className="text-sm text-gray-400">No complaints found</p>
            </div>
          )}
          <Pagination pagination={pagination} onPageChange={setPage} />
        </div>
      )}

      {/* Resolve Modal */}
      {resolveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm animate-fade-in" onClick={() => setResolveModal(null)}>
          <div className="bg-white rounded-2xl border border-primary-100 p-6 w-full max-w-md mx-4 animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-800 mb-1" style={{ fontFamily: 'var(--font-sans)' }}>Resolve Complaint</h3>
            <p className="text-xs text-gray-500 mb-4">{complaintTypeLabels[resolveModal.type]} — filed by {resolveModal.complainant?.name}</p>

            <div className="mb-3">
              <label className="text-xs font-medium text-gray-600 mb-1 block">Status</label>
              <select value={resolveStatus} onChange={(e) => setResolveStatus(e.target.value)} className="input-field">
                <option value="investigating">Investigating</option>
                <option value="resolved">Resolved</option>
                <option value="dismissed">Dismissed</option>
              </select>
            </div>

            <div className="mb-4">
              <label className="text-xs font-medium text-gray-600 mb-1 block">Admin Notes</label>
              <textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Internal notes about this complaint..."
                rows={3}
                className="input-field"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button onClick={() => setResolveModal(null)} className="btn-secondary text-xs">Cancel</button>
              <button onClick={handleResolve} className="btn-primary text-xs">Submit</button>
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
const TABS = [
  { id: 'overview', label: 'Overview', icon: HiChartBar },
  { id: 'users', label: 'Users', icon: HiUsers },
  { id: 'ngos', label: 'NGO Approvals', icon: HiShieldCheck },
  { id: 'donations', label: 'Donations', icon: HiGift },
  { id: 'complaints', label: 'Complaints', icon: HiExclamationCircle },
];

const AdminDashboard = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // Sync tab with URL query param (from sidebar links)
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam && TABS.some((t) => t.id === tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  // Fetch stats on mount
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

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="mb-6 animate-fade-in-up">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2" style={{ fontFamily: 'var(--font-sans)' }}>
          <svg className="w-6 h-6 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          Admin Panel
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Welcome, {user?.name || 'Admin'}. Manage the ShareBite platform from here.
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 mb-6 overflow-x-auto pb-1 animate-fade-in-up animate-stagger-1">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer ${
                isActive
                  ? 'bg-primary-600 text-white shadow-md shadow-primary-600/20'
                  : 'bg-white text-gray-500 border border-primary-100 hover:bg-primary-50 hover:text-primary-700'
              }`}
              style={{ fontFamily: 'var(--font-sans)' }}
            >
              <Icon size={16} />
              {tab.label}
              {/* Badge for pending items */}
              {tab.id === 'ngos' && stats?.ngoVerifications?.pending > 0 && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${isActive ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-700'}`}>
                  {stats.ngoVerifications.pending}
                </span>
              )}
              {tab.id === 'complaints' && stats?.complaints?.open > 0 && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${isActive ? 'bg-white/20 text-white' : 'bg-red-100 text-red-600'}`}>
                  {stats.complaints.open}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="animate-fade-in-up animate-stagger-2">
        {activeTab === 'overview' && <OverviewTab stats={stats} loading={statsLoading} />}
        {activeTab === 'users' && <UsersTab />}
        {activeTab === 'ngos' && <NgoApprovalsTab />}
        {activeTab === 'donations' && <DonationsTab />}
        {activeTab === 'complaints' && <ComplaintsTab />}
      </div>
    </DashboardLayout>
  );
};

export default AdminDashboard;
