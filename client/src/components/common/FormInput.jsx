/**
 * Reusable form input with label and error display
 */
const FormInput = ({
  label,
  id,
  name,
  type = 'text',
  value,
  onChange,
  placeholder,
  error,
  required = false,
  disabled = false,
  readOnly = false,
  className = '',
  ...props
}) => {
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
      <input
        id={id || name}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        readOnly={readOnly}
        aria-invalid={!!error}
        aria-describedby={error ? `${name}-error` : undefined}
        className={`input-field ${error ? 'input-error' : ''} ${readOnly ? 'bg-gray-50 cursor-not-allowed' : ''}`}
        {...props}
      />
      {error && (
        <p id={`${name}-error`} className="mt-1 text-xs text-red-500 animate-fade-in" role="alert">
          {error}
        </p>
      )}
    </div>
  );
};

export default FormInput;
