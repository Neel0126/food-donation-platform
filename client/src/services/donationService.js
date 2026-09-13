import api from './api';

export const createDonation = async (formData) => {
  const response = await api.post('/donations', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const getDonorDonations = async () => {
  const response = await api.get('/donations');
  return response.data;
};

export const updateDonation = async (id, formData) => {
  const response = await api.put(`/donations/${id}`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const cancelDonation = async (id) => {
  const response = await api.put(`/donations/${id}/cancel`);
  return response.data;
};
