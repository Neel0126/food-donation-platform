/**
 * StatusBadge component
 * Displays unified, accessible status pills across all roles and models
 */
const StatusBadge = ({ status, className = '' }) => {
  const normStatus = (status || '').toLowerCase().trim();

  const getStyle = () => {
    switch (normStatus) {
      case 'pending':
        return 'bg-amber-50 text-amber-800 border-amber-200/80';
      case 'accepted':
      case 'scheduled':
        return 'bg-blue-50 text-blue-800 border-blue-200/80';
      case 'assigned':
        return 'bg-indigo-50 text-indigo-800 border-indigo-200/80';
      case 'picked_up':
      case 'in_transit':
        return 'bg-purple-50 text-purple-800 border-purple-200/80';
      case 'delivered':
      case 'completed':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200/80';
      case 'cancelled':
      case 'rejected':
        return 'bg-red-50 text-red-800 border-red-200/80';
      case 'expired':
        return 'bg-rose-50 text-rose-800 border-rose-200/80';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getDotColor = () => {
    switch (normStatus) {
      case 'pending':
        return 'bg-amber-500';
      case 'accepted':
      case 'scheduled':
        return 'bg-blue-500';
      case 'assigned':
        return 'bg-indigo-500';
      case 'picked_up':
      case 'in_transit':
        return 'bg-purple-500';
      case 'delivered':
      case 'completed':
        return 'bg-emerald-500';
      case 'cancelled':
      case 'rejected':
        return 'bg-red-500';
      case 'expired':
        return 'bg-rose-500';
      default:
        return 'bg-gray-400';
    }
  };

  const formatText = () => {
    switch (normStatus) {
      case 'accepted':
        return 'NGO Assigned';
      case 'assigned':
      case 'scheduled':
        return 'Pickup Scheduled';
      case 'picked_up':
      case 'in_transit':
        return 'Picked Up';
      case 'delivered':
      case 'completed':
        return 'Completed';
      case 'expired':
        return 'Expired';
      default:
        return normStatus.replace(/_/g, ' ');
    }
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[11px] font-semibold rounded-full border capitalize tracking-wide ${getStyle()} ${className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${getDotColor()}`} />
      <span>{formatText()}</span>
    </span>
  );
};

export default StatusBadge;
