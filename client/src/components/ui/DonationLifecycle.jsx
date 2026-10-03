import { HiCheck } from 'react-icons/hi';

/**
 * DonationLifecycle timeline component
 * Displays: Created -> NGO Found -> Pickup Scheduled -> Food Collected -> Completed
 * Desktop: Horizontal timeline with connecting lines
 * Mobile: Clean vertical timeline
 */
const DonationLifecycle = ({ status, className = '' }) => {
  const steps = [
    { key: 'created', label: 'Created', sub: 'Donation Listed' },
    { key: 'accepted', label: 'NGO Assigned', sub: 'Partner Confirmed' },
    { key: 'scheduled', label: 'Pickup Scheduled', sub: 'Pickup Time Confirmed' },
    { key: 'picked_up', label: 'Picked Up', sub: 'Food Collected' },
    { key: 'delivered', label: 'Completed', sub: 'Delivered Successfully' },
  ];

  // Map backend donation status to numerical index (0-4)
  const getActiveStepIndex = (st) => {
    switch (st) {
      case 'pending':
        return 0; // Created
      case 'accepted':
        return 1; // NGO Assigned
      case 'assigned':
      case 'scheduled':
        return 2; // Pickup Scheduled
      case 'picked_up':
      case 'in_transit':
        return 3; // Picked Up
      case 'delivered':
      case 'completed':
        return 4; // Completed
      case 'cancelled':
        return -1; // Cancelled
      case 'expired':
        return -2; // Expired
      default:
        return 0;
    }
  };

  const activeIndex = getActiveStepIndex(status);
  const isCancelled = status === 'cancelled';
  const isExpired = status === 'expired';
  const isAllCompleted = status === 'delivered' || status === 'completed';

  if (isCancelled) {
    return (
      <div className={`p-4 rounded-2xl bg-red-50/70 border border-red-200 text-xs text-red-700 flex items-center gap-2 ${className}`}>
        <span className="h-2 w-2 rounded-full bg-red-500 shrink-0" />
        <span className="font-semibold">This donation was cancelled.</span>
      </div>
    );
  }

  if (isExpired) {
    return (
      <div className={`p-4 rounded-2xl bg-rose-50/80 border border-rose-200 text-xs text-rose-900 flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${className}`}>
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-500 shrink-0" />
          <span className="font-semibold">Pickup window elapsed without partner confirmation.</span>
        </div>
        <span className="text-[11px] text-rose-700 font-medium">Marked as expired for community food safety</span>
      </div>
    );
  }

  return (
    <div className={`w-full ${className}`}>
      {/* Desktop Horizontal Timeline (md and up) */}
      <div className="hidden md:block">
        <div className="relative flex items-center justify-between">
          {/* Background Connecting Line */}
          <div className="absolute top-4 left-6 right-6 h-0.5 bg-[#e8e2d5] -z-0" />
          {/* Active Progress Line */}
          <div
            className="absolute top-4 left-6 h-0.5 bg-primary-600 transition-all duration-700 ease-out -z-0"
            style={{
              width: `${(Math.max(0, activeIndex) / (steps.length - 1)) * 100}%`,
              maxWidth: 'calc(100% - 3rem)',
            }}
          />

          {steps.map((step, idx) => {
            const isCompleted = isAllCompleted ? true : idx < activeIndex;
            const isCurrent = !isAllCompleted && idx === activeIndex;

            return (
              <div key={step.key} className="relative z-10 flex flex-col items-center text-center px-1">
                {/* Node Circle */}
                <div
                  className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs transition-all duration-300 ${
                    isCompleted
                      ? 'bg-primary-600 text-white shadow-xs'
                      : isCurrent
                      ? 'bg-white border-2 border-primary-600 text-primary-700 ring-4 ring-primary-100 shadow-sm'
                      : 'bg-white border-2 border-gray-300 text-gray-400'
                  }`}
                >
                  {isCompleted ? (
                    <HiCheck size={16} />
                  ) : (
                    <span>{idx + 1}</span>
                  )}
                </div>

                {/* Step Labels */}
                <div className="mt-2.5">
                  <p
                    className={`text-xs font-bold leading-tight ${
                      isAllCompleted && idx === steps.length - 1
                        ? 'text-primary-800'
                        : isCurrent
                        ? 'text-primary-800'
                        : isCompleted
                        ? 'text-gray-800'
                        : 'text-gray-400'
                    }`}
                    style={{ fontFamily: 'var(--font-sans)' }}
                  >
                    {step.label}
                  </p>
                  <p className="text-[10px] text-gray-500 mt-0.5 font-normal">
                    {step.sub}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Mobile Vertical Timeline (smaller than md) */}
      <div className="md:hidden space-y-3 pl-2">
        {steps.map((step, idx) => {
          const isCompleted = isAllCompleted ? true : idx < activeIndex;
          const isCurrent = !isAllCompleted && idx === activeIndex;
          const isLast = idx === steps.length - 1;

          return (
            <div key={step.key} className="flex items-start gap-3 relative">
              {!isLast && (
                <div
                  className={`absolute top-6 left-3 w-0.5 h-7 -translate-x-1/2 ${
                    isCompleted ? 'bg-primary-600' : 'bg-gray-200'
                  }`}
                />
              )}
              <div
                className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 z-10 ${
                  isCompleted
                    ? 'bg-primary-600 text-white'
                    : isCurrent
                    ? 'bg-white border-2 border-primary-600 text-primary-700 ring-2 ring-primary-100'
                    : 'bg-white border-2 border-gray-300 text-gray-400'
                }`}
              >
                {isCompleted ? <HiCheck size={13} /> : idx + 1}
              </div>
              <div className="pb-1 min-w-0">
                <p
                  className={`text-xs font-bold leading-tight ${
                    isAllCompleted && idx === steps.length - 1
                      ? 'text-primary-800'
                      : isCurrent
                      ? 'text-primary-800'
                      : isCompleted
                      ? 'text-gray-800'
                      : 'text-gray-400'
                  }`}
                >
                  {step.label}
                </p>
                <p className="text-[10px] text-gray-500">{step.sub}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DonationLifecycle;
