import { useState, useEffect } from 'react';
import { HiInformationCircle } from 'react-icons/hi';

/**
 * Animated number counter component
 * Smoothly increments from 0 to value on mount or change
 * Supports optional tooltip for metric calculation transparency
 */
const StatCounter = ({
  value,
  label,
  icon: Icon,
  prefix = '',
  suffix = '',
  subtext = '',
  tooltip = '',
  action = null,
  className = '',
  leadingZero = false,
}) => {
  const [displayValue, setDisplayValue] = useState(0);

  const isDecimal = typeof value === 'number'
    ? !Number.isInteger(value)
    : String(value).includes('.');

  // Extract numeric part preserving decimal point
  const numericValue = typeof value === 'number'
    ? value
    : parseFloat(String(value).replace(/[^\d.]/g, '')) || 0;

  useEffect(() => {
    let start = 0;
    const end = numericValue;
    if (end === 0) {
      setDisplayValue(0);
      return;
    }

    const duration = 900; // ms
    const stepTime = 25;
    const totalSteps = Math.max(1, Math.floor(duration / stepTime));
    const increment = end / totalSteps;
    let step = 0;

    const timer = setInterval(() => {
      step++;
      start += increment;
      if (step >= totalSteps) {
        setDisplayValue(end);
        clearInterval(timer);
      } else {
        setDisplayValue(isDecimal ? parseFloat(start.toFixed(1)) : Math.floor(start));
      }
    }, stepTime);

    return () => clearInterval(timer);
  }, [numericValue, isDecimal]);

  const [showTooltip, setShowTooltip] = useState(false);

  // Format standard number without artificial leading zero unless explicitly requested
  const formattedNumber = isDecimal
    ? Number(displayValue).toFixed(1)
    : (leadingZero && displayValue < 10 && displayValue >= 0
        ? `0${displayValue}`
        : `${displayValue}`);

  return (
    <div className={`surface-card p-5 flex items-start gap-4 relative ${className}`}>
      {Icon && (
        <div className="h-11 w-11 rounded-2xl bg-primary-100 text-primary-700 flex items-center justify-center shrink-0 shadow-2xs">
          <Icon size={20} />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-2xl sm:text-3xl font-extrabold text-[#172117] tracking-tight leading-none" style={{ fontFamily: 'var(--font-sans)' }}>
          {prefix}{formattedNumber}{suffix}
        </p>

        <div className="flex items-center gap-1.5 mt-1.5">
          <p className="text-xs sm:text-sm font-semibold text-gray-600 truncate">
            {label}
          </p>
          {tooltip && (
            <div className="relative inline-flex items-center">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowTooltip((prev) => !prev);
                }}
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
                aria-label={`Info about ${label}`}
                className="text-gray-400 hover:text-primary-700 transition-colors cursor-help p-0.5 rounded-full focus:outline-none"
              >
                <HiInformationCircle size={15} />
              </button>
              {showTooltip && (
                <div className="absolute top-full left-0 sm:left-auto sm:right-0 mt-2 w-56 sm:w-64 p-3 bg-[#172117] text-white text-[11px] rounded-xl shadow-2xl z-50 leading-relaxed font-normal animate-fade-in whitespace-pre-line text-left border border-white/10">
                  {tooltip}
                  <div className="absolute bottom-full left-3 sm:left-auto sm:right-3 border-4 border-transparent border-b-[#172117]" />
                </div>
              )}
            </div>
          )}
        </div>

        {subtext && (
          <p className="text-[11px] text-gray-400 mt-0.5 truncate">
            {subtext}
          </p>
        )}
        {action && (
          <button
            type="button"
            onClick={action.onClick}
            className="text-xs font-bold text-primary-700 hover:text-primary-850 hover:underline flex items-center gap-1 mt-2.5 transition-colors cursor-pointer"
          >
            {action.label}
          </button>
        )}
      </div>
    </div>
  );
};

export default StatCounter;
