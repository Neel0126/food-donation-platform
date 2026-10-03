/**
 * EmptyState component
 * Displays friendly, spacious, and meaningful empty state with icon and action button
 */
const EmptyState = ({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  className = '',
}) => {
  return (
    <div className={`surface-card p-10 sm:p-14 text-center border-dashed border-primary-200/80 bg-white/70 ${className}`}>
      {Icon && (
        <div className="h-16 w-16 mx-auto rounded-3xl bg-primary-50 text-primary-600 flex items-center justify-center mb-4 border border-primary-100 shadow-2xs">
          <Icon size={30} />
        </div>
      )}
      <h3 className="text-lg font-bold text-[#172117] mb-2" style={{ fontFamily: 'var(--font-sans)' }}>
        {title}
      </h3>
      {description && (
        <p className="text-sm text-gray-500 max-w-md mx-auto mb-6 leading-relaxed">
          {description}
        </p>
      )}
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="btn-primary inline-flex text-sm px-6 py-2.5 shadow-sm"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};

export default EmptyState;
