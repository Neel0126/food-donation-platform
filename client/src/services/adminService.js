import api from './api';

// ── Dashboard Stats ──
export const getDashboardStats = async () => {
  const response = await api.get('/admin/stats');
  return response.data;
};

// ── User Management ──
export const getAllUsers = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const url = query ? `/admin/users?${query}` : '/admin/users';
  const response = await api.get(url);
  return response.data;
};

export const getUserById = async (id) => {
  const response = await api.get(`/admin/users/${id}`);
  return response.data;
};

export const updateUserStatus = async (id, data) => {
  const response = await api.put(`/admin/users/${id}`, data);
  return response.data;
};

export const deleteUser = async (id) => {
  const response = await api.delete(`/admin/users/${id}`);
  return response.data;
};

// ── NGO Approval ──
export const getPendingNgos = async (status = 'pending') => {
  const response = await api.get(`/admin/ngos/pending?status=${status}`);
  return response.data;
};

export const approveNgo = async (id) => {
  const response = await api.put(`/admin/ngos/${id}/approve`);
  return response.data;
};

export const rejectNgo = async (id, reason = '') => {
  const response = await api.put(`/admin/ngos/${id}/reject`, { reason });
  return response.data;
};

// ── Donation Management ──
export const getAllDonations = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const url = query ? `/admin/donations?${query}` : '/admin/donations';
  const response = await api.get(url);
  return response.data;
};

export const getDonationDetail = async (id) => {
  const response = await api.get(`/admin/donations/${id}`);
  return response.data;
};

export const updateDonationStatus = async (id, status) => {
  const response = await api.put(`/admin/donations/${id}/status`, { status });
  return response.data;
};

// ── Complaint Management ──
export const getAllComplaints = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const url = query ? `/admin/complaints?${query}` : '/admin/complaints';
  const response = await api.get(url);
  return response.data;
};

export const getComplaintById = async (id) => {
  const response = await api.get(`/admin/complaints/${id}`);
  return response.data;
};

export const resolveComplaint = async (id, status, adminNotes = '') => {
  const response = await api.put(`/admin/complaints/${id}/resolve`, { status, adminNotes });
  return response.data;
};

// ── File a complaint (any authenticated user) ──
export const fileComplaint = async (data) => {
  const response = await api.post('/admin/complaints', data);
  return response.data;
};
