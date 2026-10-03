/**
 * PageHeader component
 * Renders consistent page heading, subtitle, and action buttons across views
 */
const PageHeader = ({
  title,
  subtitle,
  children,
  badge,
  className = '',
}) => {
  return (
    <div className={`flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4 animate-fade-in-up ${className}`}>
      <div>
        <div className="flex items-center gap-2.5">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#172117] tracking-tight" style={{ fontFamily: 'var(--font-sans)' }}>
            {title}
          </h1>
          {badge && (
            <span className="bg-primary-100 text-primary-800 text-xs font-bold px-2.5 py-0.5 rounded-full">
              {badge}
            </span>
          )}
        </div>
        {subtitle && (
          <p className="text-sm text-gray-600 mt-1 font-normal leading-relaxed">
            {subtitle}
          </p>
        )}
      </div>

      {children && (
        <div className="flex items-center gap-3 shrink-0 w-full sm:w-auto">
          {children}
        </div>
      )}
    </div>
  );
};

export default PageHeader;
