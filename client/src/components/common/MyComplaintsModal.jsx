import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  HiShieldCheck,
  HiX,
  HiRefresh,
  HiExclamationCircle,
  HiClock,
  HiCheckCircle,
  HiAnnotation,
  HiUser,
  HiTag,
  HiCalendar,
} from 'react-icons/hi';
import { getMyComplaints } from '../../services/adminService';

const TYPE_LABELS = {
  food_quality: 'Food Quality (Spoiled / Unsafe)',
  no_show: 'No Show (Did not arrive)',
  late_delivery: 'Late Delivery (Breached safe window)',
  misconduct: 'Misconduct / Unprofessional Behavior',
  fraud: 'Fraud / Suspicious Listing',
  other: 'Other Operational Issue',
};

const STATUS_CONFIG = {
  open: {
    bg: 'bg-amber-50 text-amber-800 border-amber-200',
    icon: HiClock,
    label: 'Awaiting Admin Review',
  },
  investigating: {
    bg: 'bg-blue-50 text-blue-800 border-blue-200',
    icon: HiExclamationCircle,
    label: 'Under Investigation',
  },
  resolved: {
    bg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    icon: HiCheckCircle,
    label: 'Resolved by Admin',
  },
  dismissed: {
    bg: 'bg-gray-100 text-gray-700 border-gray-200',
    icon: HiX,
    label: 'Dismissed',
  },
};

/**
 * Modern modal for tracking live complaint resolution status and admin notes.
 * Rendered via createPortal to guarantee perfect positioning across all viewports.
 */
const MyComplaintsModal = ({ isOpen, onClose }) => {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'open' | 'resolved'

  const loadComplaints = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getMyComplaints();
      setComplaints(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch your complaint records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadComplaints();
      // Lock background scroll when open
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredComplaints = complaints.filter((c) => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'open') return c.status === 'open' || c.status === 'investigating';
    if (statusFilter === 'resolved') return c.status === 'resolved' || c.status === 'dismissed';
    return true;
  });

  const openCount = complaints.filter((c) => c.status === 'open' || c.status === 'investigating').length;
  const resolvedCount = complaints.filter((c) => c.status === 'resolved' || c.status === 'dismissed').length;

  const modalContent = (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div
        className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-[#e8e2d5] my-auto flex flex-col max-h-[88vh] overflow-hidden animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-5 sm:p-6 pb-4 border-b border-[#e8e2d5] bg-gradient-to-r from-[#faf8f4] to-white shrink-0">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 shadow-2xs">
                <HiShieldCheck size={24} />
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-extrabold text-[#172117]" style={{ fontFamily: 'var(--font-sans)' }}>
                  Disputes & Resolution Status
                </h3>
                <p className="text-xs text-gray-500">
                  Track investigations and official resolution notes for reports you filed.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={loadComplaints}
                disabled={loading}
                title="Refresh Status"
                className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <HiRefresh size={18} className={loading ? 'animate-spin' : ''} />
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <HiX size={20} />
              </button>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-2 pt-1 overflow-x-auto text-xs font-semibold">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-full transition-all cursor-pointer ${
                statusFilter === 'all'
                  ? 'bg-primary-700 text-white shadow-2xs font-bold'
                  : 'bg-white border border-[#e8e2d5] text-gray-600 hover:text-gray-900'
              }`}
            >
              All Reports ({complaints.length})
            </button>
            <button
              onClick={() => setStatusFilter('open')}
              className={`px-3 py-1.5 rounded-full transition-all cursor-pointer ${
                statusFilter === 'open'
                  ? 'bg-amber-600 text-white shadow-2xs font-bold'
                  : 'bg-white border border-[#e8e2d5] text-gray-600 hover:text-gray-900'
              }`}
            >
              In Progress ({openCount})
            </button>
            <button
              onClick={() => setStatusFilter('resolved')}
              className={`px-3 py-1.5 rounded-full transition-all cursor-pointer ${
                statusFilter === 'resolved'
                  ? 'bg-emerald-700 text-white shadow-2xs font-bold'
                  : 'bg-white border border-[#e8e2d5] text-gray-600 hover:text-gray-900'
              }`}
            >
              Resolved ({resolvedCount})
            </button>
          </div>
        </div>

        {/* Scrollable Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {error && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-800">
              {error}
            </div>
          )}

          {loading ? (
            <div className="py-16 text-center text-gray-400 text-xs sm:text-sm">
              <HiRefresh size={26} className="animate-spin mx-auto mb-2 text-primary-600" />
              Loading your dispute records...
            </div>
          ) : filteredComplaints.length === 0 ? (
            <div className="p-8 sm:p-12 text-center bg-[#faf8f4] rounded-2xl border border-[#e8e2d5] my-2">
              <div className="h-12 w-12 mx-auto rounded-2xl bg-white text-emerald-700 flex items-center justify-center mb-3 shadow-2xs border border-gray-100">
                <HiShieldCheck size={26} />
              </div>
              <h4 className="text-base font-bold text-gray-800 mb-1">
                {statusFilter === 'all'
                  ? 'No Reports Filed Yet'
                  : `No ${statusFilter === 'open' ? 'In-Progress' : 'Resolved'} Reports`}
              </h4>
              <p className="text-xs text-gray-500 max-w-sm mx-auto leading-relaxed">
                {statusFilter === 'all'
                  ? 'If you ever encounter an issue with food freshness, volunteer arrival, or drop-off, you can easily submit a report directly from your task or donation card.'
                  : 'There are currently no reports matching this filter.'}
              </p>
            </div>
          ) : (
            filteredComplaints.map((c) => {
              const statusCfg = STATUS_CONFIG[c.status] || STATUS_CONFIG.open;
              const StatusIcon = statusCfg.icon;

              return (
                <div
                  key={c._id}
                  className="p-4 sm:p-5 rounded-2xl border border-[#e8e2d5] bg-white hover:border-primary-200 transition-all shadow-2xs space-y-3"
                >
                  {/* Category & Status Row */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-extrabold text-sm sm:text-base text-[#172117] flex items-center gap-1.5">
                      <HiTag className="text-primary-700 shrink-0" size={16} />
                      <span>{TYPE_LABELS[c.type] || c.type}</span>
                    </span>
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${statusCfg.bg}`}
                    >
                      <StatusIcon size={14} />
                      <span>{statusCfg.label}</span>
                    </span>
                  </div>

                  {/* Context Info (User, Donation, Dates) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-gray-600 bg-[#faf8f4] p-3 rounded-xl border border-[#e8e2d5]/60">
                    <div className="flex items-center gap-1.5">
                      <HiUser className="text-gray-400 shrink-0" size={14} />
                      <span>
                        Reported: <strong className="text-gray-900">{c.against?.name || 'Platform User'}</strong>{' '}
                        <span className="text-[10px] text-gray-500 uppercase font-bold">
                          ({c.against?.role || 'Partner'})
                        </span>
                      </span>
                    </div>

                    {c.donation && (
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="text-gray-400 shrink-0">🍲</span>
                        <span className="truncate">
                          Item: <strong className="text-gray-900">{c.donation.foodType}</strong> ({c.donation.quantity})
                        </span>
                      </div>
                    )}

                    <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
                      <HiCalendar size={13} className="shrink-0" />
                      <span>
                        Filed: {new Date(c.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>

                    {c.resolvedAt && (
                      <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 font-semibold">
                        <HiCheckCircle size={13} className="shrink-0" />
                        <span>
                          Resolved: {new Date(c.resolvedAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Stated Issue */}
                  <div className="text-xs text-gray-700 bg-gray-50/80 p-3 rounded-xl border border-gray-100">
                    <span className="font-bold text-gray-800 block mb-1">Your Stated Issue:</span>
                    <p className="leading-relaxed whitespace-pre-wrap">{c.description}</p>
                  </div>

                  {/* Official Admin Resolution Response */}
                  {c.adminNotes ? (
                    <div className="p-3.5 rounded-xl bg-emerald-50/90 border border-emerald-200 text-xs text-emerald-950 space-y-1.5">
                      <div className="flex items-center gap-1.5 font-extrabold text-emerald-900">
                        <HiAnnotation size={17} className="text-emerald-700 shrink-0" />
                        <span>Administrator Findings & Corrective Action:</span>
                      </div>
                      <p className="leading-relaxed pl-5 font-medium">{c.adminNotes}</p>
                    </div>
                  ) : c.status === 'open' ? (
                    <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200/80 text-[11px] text-amber-900 flex items-center gap-2">
                      <HiClock size={16} className="text-amber-600 shrink-0" />
                      <span>
                        This report is queued for administrator review. You will receive an in-app alert when resolution notes are logged.
                      </span>
                    </div>
                  ) : null}
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-[#e8e2d5] bg-gray-50 flex items-center justify-between text-xs text-gray-500 shrink-0">
          <span>
            Total Filed: <strong className="text-gray-900">{complaints.length}</strong>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary text-xs py-2 px-5 cursor-pointer shadow-2xs font-semibold"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default MyComplaintsModal;
