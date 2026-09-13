/**
 * Loading spinner with optional message
 */
const LoadingSpinner = ({ message = 'Loading...', size = 'md', fullScreen = false }) => {
  const sizeClasses = {
    sm: 'h-5 w-5 border-2',
    md: 'h-8 w-8 border-[3px]',
    lg: 'h-12 w-12 border-4',
  };

  const spinner = (
    <div className="flex flex-col items-center justify-center gap-3 animate-fade-in">
      <div
        className={`${sizeClasses[size]} rounded-full border-primary-100 border-t-primary-600 animate-spin`}
        role="status"
        aria-label="Loading"
      />
      {message && <p className="text-sm text-gray-500 animate-pulse-soft">{message}</p>}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#fff7ed]/90 backdrop-blur-sm">
        {spinner}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center py-12">
      {spinner}
    </div>
  );
};

export default LoadingSpinner;
