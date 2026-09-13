/**
 * Role-based dashboard paths and labels
 */

const DASHBOARD_PATHS = {
  donor: '/donor/dashboard',
  ngo: '/ngo/dashboard',
  volunteer: '/volunteer/dashboard',
  admin: '/admin/dashboard',
};

const ROLE_LABELS = {
  donor: 'Donor',
  ngo: 'NGO',
  volunteer: 'Volunteer',
  admin: 'Admin',
};

/**
 * Get the dashboard path for a given role
 * @param {string} role - lowercase role value
 * @returns {string} dashboard path
 */
export const getDashboardPath = (role) => {
  return DASHBOARD_PATHS[role] || '/login';
};

/**
 * Get the display label for a role
 * @param {string} role - lowercase role value
 * @returns {string} display name
 */
export const getRoleLabel = (role) => {
  return ROLE_LABELS[role] || 'User';
};

/**
 * All available roles for registration (no admin)
 */
export const REGISTRATION_ROLES = [
  { value: 'donor', label: 'Donor' },
  { value: 'ngo', label: 'NGO' },
  { value: 'volunteer', label: 'Volunteer' },
];
