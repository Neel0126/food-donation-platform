import api from './api';

// Fetch volunteer profile
export const getVolunteerProfile = async () => {
  const response = await api.get('/volunteers/profile');
  return response.data;
};

// Update volunteer profile
export const updateVolunteerProfile = async (profileData) => {
  const response = await api.put('/volunteers/profile', profileData);
  return response.data;
};

// Update availability status
export const updateAvailabilityStatus = async (availabilityStatus) => {
  const response = await api.put('/volunteers/status', { availabilityStatus });
  return response.data;
};

// Get volunteer stats
export const getVolunteerStats = async () => {
  const response = await api.get('/volunteers/stats');
  return response.data;
};

// Get available tasks with optional city/search params
export const getAvailableTasks = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const url = query ? `/volunteers/tasks/available?${query}` : '/volunteers/tasks/available';
  const response = await api.get(url);
  return response.data;
};

// Get volunteer's assigned / active / completed tasks
export const getMyTasks = async (status = 'all') => {
  const response = await api.get(`/volunteers/tasks/my-tasks?status=${status}`);
  return response.data;
};

// Get single task details
export const getTaskById = async (id) => {
  const response = await api.get(`/volunteers/tasks/${id}`);
  return response.data;
};

// Accept a delivery task
export const acceptTask = async (id) => {
  const response = await api.put(`/volunteers/tasks/${id}/accept`);
  return response.data;
};

// Reject an assigned task
export const rejectTask = async (id) => {
  const response = await api.put(`/volunteers/tasks/${id}/reject`);
  return response.data;
};

// Verify pickup OTP
export const verifyPickupOtp = async (id, otp) => {
  const response = await api.post(`/volunteers/tasks/${id}/verify-pickup`, { otp });
  return response.data;
};

// Upload delivery proof (photo + notes)
export const uploadDeliveryProof = async (id, formData) => {
  const response = await api.post(`/volunteers/tasks/${id}/delivery-proof`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

// Verify delivery OTP
export const verifyDeliveryOtp = async (id, otp) => {
  const response = await api.post(`/volunteers/tasks/${id}/verify-delivery`, { otp });
  return response.data;
};

// Complete task
export const completeTask = async (id, data = {}) => {
  const response = await api.put(`/volunteers/tasks/${id}/complete`, data);
  return response.data;
};
