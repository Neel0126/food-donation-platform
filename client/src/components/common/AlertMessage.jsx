import { useState } from 'react';
import { HiCheckCircle, HiExclamationCircle, HiInformationCircle, HiExclamation, HiX } from 'react-icons/hi';

/**
 * Alert banner for success, error, warning, info messages
 */
const AlertMessage = ({ type = 'info', message, onDismiss, className = '' }) => {
  const [visible, setVisible] = useState(true);

  if (!visible || !message) return null;

  const styles = {
    success: {
      bg: 'bg-green-50 border-green-200',
      text: 'text-green-800',
      icon: <HiCheckCircle size={20} className="text-green-500 shrink-0" />,
    },
    error: {
      bg: 'bg-red-50 border-red-200',
      text: 'text-red-800',
      icon: <HiExclamationCircle size={20} className="text-red-500 shrink-0" />,
    },
    warning: {
      bg: 'bg-amber-50 border-amber-200',
      text: 'text-amber-800',
      icon: <HiExclamation size={20} className="text-amber-500 shrink-0" />,
    },
    info: {
      bg: 'bg-blue-50 border-blue-200',
      text: 'text-blue-800',
      icon: <HiInformationCircle size={20} className="text-blue-500 shrink-0" />,
    },
  };

  const style = styles[type] || styles.info;

  const handleDismiss = () => {
    setVisible(false);
    if (onDismiss) onDismiss();
  };

  return (
    <div
      className={`flex items-start gap-3 p-3 rounded-lg border ${style.bg} ${className}`}
      role="alert"
    >
      {style.icon}
      <p className={`text-sm flex-1 ${style.text}`}>{message}</p>
      <button
        onClick={handleDismiss}
        className={`${style.text} hover:opacity-70 shrink-0`}
        aria-label="Dismiss alert"
      >
        <HiX size={16} />
      </button>
    </div>
  );
};

export default AlertMessage;
