import { useState } from 'react';
import { HiEye, HiEyeOff } from 'react-icons/hi';

/**
 * Password input with show/hide toggle
 */
const PasswordInput = ({
  label,
  id,
  name,
  value,
  onChange,
  placeholder = 'Enter password',
  error,
  required = false,
  disabled = false,
  className = '',
  ...props
}) => {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className={`mb-4 ${className}`}>
      {label && (
        <label
          htmlFor={id || name}
          className="block text-sm font-medium text-gray-700 mb-1.5"
        >
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      <div className="relative">
        <input
          id={id || name}
          name={name}
          type={showPassword ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          aria-invalid={!!error}
          aria-describedby={error ? `${name}-error` : undefined}
          className={`input-field pr-10 ${error ? 'input-error' : ''}`}
          {...props}
        />
        <button
          type="button"
          onClick={() => setShowPassword((prev) => !prev)}
          className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-primary-600 transition-colors duration-200 cursor-pointer"
          aria-label={showPassword ? 'Hide password' : 'Show password'}
          tabIndex={-1}
        >
          {showPassword ? <HiEyeOff size={18} /> : <HiEye size={18} />}
        </button>
      </div>
      {error && (
        <p id={`${name}-error`} className="mt-1 text-xs text-red-500 animate-fade-in" role="alert">
          {error}
        </p>
      )}
    </div>
  );
};

export default PasswordInput;
