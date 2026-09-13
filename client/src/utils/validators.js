/**
 * Frontend form validators
 * Returns error message string or empty string if valid
 */

export const validateRequired = (value, fieldName) => {
  if (!value || (typeof value === 'string' && !value.trim())) {
    return `${fieldName} is required`;
  }
  return '';
};

export const validateEmail = (email) => {
  if (!email || !email.trim()) return 'Email is required';
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    return 'Please enter a valid email address';
  }
  return '';
};

export const validatePhone = (phone) => {
  if (!phone || !phone.trim()) return 'Phone number is required';
  const digitsOnly = phone.replace(/\D/g, '');
  if (digitsOnly.length !== 10) {
    return 'Phone number must contain exactly 10 digits';
  }
  return '';
};

export const validatePassword = (password) => {
  if (!password) return 'Password is required';
  if (password.length < 8) {
    return 'Password must be at least 8 characters long';
  }
  return '';
};

export const validateConfirmPassword = (password, confirmPassword) => {
  if (!confirmPassword) return 'Please confirm your password';
  if (password !== confirmPassword) {
    return 'Passwords do not match';
  }
  return '';
};

export const validateTerms = (accepted) => {
  if (!accepted) {
    return 'You must accept the terms and conditions';
  }
  return '';
};

/**
 * Validate the full registration form
 * Returns an object with field names as keys and error messages as values
 */
export const validateRegistrationForm = (formData) => {
  const errors = {};

  errors.name = validateRequired(formData.name, 'Full name');
  errors.email = validateEmail(formData.email);
  errors.phone = validatePhone(formData.phone);
  errors.password = validatePassword(formData.password);
  errors.confirmPassword = validateConfirmPassword(formData.password, formData.confirmPassword);
  errors.role = validateRequired(formData.role, 'Role');
  errors.terms = validateTerms(formData.terms);

  // NGO-specific validations
  if (formData.role === 'ngo') {
    errors.organizationName = validateRequired(formData.organizationName, 'Organization name');
    errors.registrationNumber = validateRequired(formData.registrationNumber, 'Registration number');
    errors.address = validateRequired(formData.address, 'Organization address');
  }

  // Remove empty error messages
  Object.keys(errors).forEach((key) => {
    if (!errors[key]) delete errors[key];
  });

  return errors;
};

/**
 * Validate login form
 */
export const validateLoginForm = (formData) => {
  const errors = {};

  errors.email = validateEmail(formData.email);
  if (!formData.password) {
    errors.password = 'Password is required';
  }

  // Remove empty error messages
  Object.keys(errors).forEach((key) => {
    if (!errors[key]) delete errors[key];
  });

  return errors;
};
