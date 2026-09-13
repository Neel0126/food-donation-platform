import api from './api';

// Register NGO profile
export const registerNgoProfile = async (formData) => {
  const response = await api.post('/ngos/register', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

// Get nearby pending donations with optional city/search/all params
export const getNearbyDonations = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const url = query ? `/ngos/donations?${query}` : '/ngos/donations';
  const response = await api.get(url);
  return response.data;
};

// Get NGO accepted donations
export const getMyAcceptedDonations = async () => {
  const response = await api.get('/ngos/my-donations');
  return response.data;
};

// Accept a donation
export const acceptDonation = async (id) => {
  const response = await api.put(`/ngos/donations/${id}/accept`);
  return response.data;
};

// Request a volunteer for accepted donation
export const requestVolunteer = async (id) => {
  const response = await api.put(`/ngos/donations/${id}/request-volunteer`);
  return response.data;
};

// Get available volunteers
export const getAvailableVolunteers = async () => {
  const response = await api.get('/ngos/volunteers/available');
  return response.data;
};

// Assign volunteer directly
export const assignVolunteer = async (donationId, volunteerId) => {
  const response = await api.put(`/ngos/donations/${donationId}/assign-volunteer`, { volunteerId });
  return response.data;
};

// Confirm delivery directly
export const confirmDelivery = async (id) => {
  const response = await api.put(`/ngos/donations/${id}/confirm-delivery`);
  return response.data;
};

// Rate volunteer for delivered donation
export const rateVolunteer = async (donationId, score, feedback = '') => {
  const response = await api.post(`/ngos/donations/${donationId}/rate-volunteer`, { score, feedback });
  return response.data;
};
