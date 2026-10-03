import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { HiExclamationCircle, HiX, HiShieldCheck } from 'react-icons/hi';
import { fileComplaint } from '../../services/adminService';
import { useAuth } from '../../context/AuthContext';

const COMPLAINT_TYPES = [
  { value: 'food_quality', label: 'Food Quality (Spoiled, Stale, or Unsafe)' },
  { value: 'no_show', label: 'No Show (Did not arrive for pickup / handover)' },
  { value: 'late_delivery', label: 'Late Delivery (Breached safe consumption window)' },
  { value: 'misconduct', label: 'Misconduct / Unprofessional Behavior' },
  { value: 'fraud', label: 'Fraud / Suspicious Listing or Reselling' },
  { value: 'other', label: 'Other Operational Issue' },
];

/**
 * Reusable modal for filing safety / quality complaints & disputes
 */
const ReportComplaintModal = ({
  isOpen,
  onClose,
  donation = null,
  preselectedAgainst = null,
  onSuccess = () => {},
}) => {
  const { user } = useAuth();

  const [againstId, setAgainstId] = useState('');
  const [complaintType, setComplaintType] = useState('food_quality');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Compute eligible candidates to report based on who the logged-in user is
  const candidates = [];
  if (donation) {
    // If user is donor: can report NGO or Volunteer
    if (user?.role === 'donor') {
      if (donation.acceptedBy) {
        candidates.push({
          id: donation.acceptedBy._id || donation.acceptedBy,
          name: donation.acceptedBy.name || 'Assigned NGO Partner',
          role: 'NGO Partner',
        });
      }
      if (donation.assignedVolunteer) {
        candidates.push({
          id: donation.assignedVolunteer._id || donation.assignedVolunteer,
          name: donation.assignedVolunteer.name || 'Assigned Volunteer',
          role: 'Volunteer',
        });
      }
    }
    // If user is NGO: can report Donor or Volunteer
    else if (user?.role === 'ngo') {
      if (donation.donor) {
        candidates.push({
          id: donation.donor._id || donation.donor,
          name: donation.donor.name || 'Donation Creator',
          role: 'Food Donor',
        });
      }
      if (donation.assignedVolunteer) {
        candidates.push({
          id: donation.assignedVolunteer._id || donation.assignedVolunteer,
          name: donation.assignedVolunteer.name || 'Assigned Volunteer',
          role: 'Volunteer',
        });
      }
    }
    // If user is volunteer: can report Donor or NGO
    else if (user?.role === 'volunteer') {
      if (donation.donor) {
        candidates.push({
          id: donation.donor._id || donation.donor,
          name: donation.donor.name || 'Donation Creator',
          role: 'Food Donor',
        });
      }
      if (donation.acceptedBy) {
        candidates.push({
          id: donation.acceptedBy._id || donation.acceptedBy,
          name: donation.acceptedBy.name || 'NGO Partner',
          role: 'NGO Partner',
        });
      }
    }
  }

  // Set default target
  useEffect(() => {
    if (preselectedAgainst?._id) {
      setAgainstId(preselectedAgainst._id);
    } else if (candidates.length > 0) {
      setAgainstId(candidates[0].id);
    }
  }, [donation, preselectedAgainst]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!againstId) {
      setError('Please select who you are reporting.');
      return;
    }
    if (!description.trim() || description.trim().length < 10) {
      setError('Please provide at least 10 characters describing the issue in detail.');
      return;
    }

    try {
      setLoading(true);
      const res = await fileComplaint({
        against: againstId,
        donation: donation?._id || undefined,
        type: complaintType,
        description: description.trim(),
      });

      setSuccessMsg('Your report has been submitted to the platform safety & administration team.');
      onSuccess(res.complaint);
      setTimeout(() => {
        onClose();
        setDescription('');
        setSuccessMsg('');
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit complaint. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const modalJSX = (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-[#e8e2d5] animate-scale-in my-auto">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-red-100 text-red-700 flex items-center justify-center shrink-0">
              <HiExclamationCircle size={22} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#172117]" style={{ fontFamily: 'var(--font-sans)' }}>
                Report Issue / File Complaint
              </h3>
              <p className="text-xs text-gray-500">
                Reports are sent directly to platform administrators for formal investigation.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-700 cursor-pointer transition-colors"
          >
            <HiX size={20} />
          </button>
        </div>

        {donation && (
          <div className="mb-4 p-3 bg-gray-50 rounded-2xl border border-gray-200 text-xs flex items-center justify-between">
            <span className="font-semibold text-gray-700">
              Regarding Donation: <strong className="text-[#172117]">{donation.foodType}</strong> ({donation.quantity})
            </span>
            <span className="text-gray-500 capitalize">{donation.status}</span>
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 font-medium">
            {error}
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-semibold flex items-center gap-2">
            <HiShieldCheck size={18} className="text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Target user selection */}
          <div>
            <label className="block font-bold text-gray-700 mb-1">
              Who are you reporting? *
            </label>
            {candidates.length > 0 ? (
              <select
                value={againstId}
                onChange={(e) => setAgainstId(e.target.value)}
                className="input-field text-xs py-2.5"
                required
              >
                {candidates.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.role})
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-gray-500 italic p-2 bg-gray-50 rounded-xl border border-gray-200">
                {preselectedAgainst ? `${preselectedAgainst.name} (${preselectedAgainst.role})` : 'Target participant'}
              </p>
            )}
          </div>

          {/* Issue category */}
          <div>
            <label className="block font-bold text-gray-700 mb-1">
              Issue Category *
            </label>
            <select
              value={complaintType}
              onChange={(e) => setComplaintType(e.target.value)}
              className="input-field text-xs py-2.5"
              required
            >
              {COMPLAINT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block font-bold text-gray-700 mb-1">
              Detailed Description *
            </label>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Explain clearly what happened (e.g., food had sour odor, volunteer never arrived, verbal conflict)..."
              className="input-field text-xs"
              required
            />
            <span className="text-[11px] text-gray-400 mt-1 block">
              Provide specific facts and timestamps to assist administrators in resolution.
            </span>
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#e8e2d5]">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="btn-secondary text-xs py-2 px-4 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary text-xs py-2 px-5 bg-red-700 hover:bg-red-800 border-red-700 cursor-pointer shadow-xs flex items-center gap-1.5"
            >
              <HiShieldCheck size={16} />
              <span>{loading ? 'Submitting...' : 'Submit Official Report'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modalJSX, document.body);
};

export default ReportComplaintModal;
