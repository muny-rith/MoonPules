import apiClient from '../../../shared/utils/apiClient';

export const getMission = async (brandId, month, year) => {
  const response = await apiClient.get('/missions', {
    params: { brand_id: brandId, month, year },
  });
  return response.data?.data || null;
};

export const getCalendarSlots = async (brandId, month, year) => {
  const response = await apiClient.get('/missions/slots', {
    params: { brand_id: brandId || 'all', month, year },
  });
  return response.data?.data || [];
};

export const getMissionBrands = async (month, year) => {
  const params = {};
  if (month) params.month = month;
  if (year) params.year = year;
  const response = await apiClient.get('/missions/brands', { params });
  return response.data?.data || [];
};

export const saveMission = async (payload) => {
  const response = await apiClient.post('/missions', payload);
  return response.data?.data || null;
};

export const getMonthAudit = async (month, year) => {
  const response = await apiClient.get('/missions/audit', {
    params: { month, year },
  });
  return response.data?.data || [];
};

export const updateSlot = async (slotId, data) => {
  const response = await apiClient.patch(`/missions/slots/${slotId}`, data);
  return response.data?.data || null;
};

export const createSlot = async (payload) => {
  const response = await apiClient.post('/missions/slots', payload);
  return response.data?.data || null;
};

export const deleteSlot = async (slotId) => {
  const response = await apiClient.delete(`/missions/slots/${slotId}`);
  return response.data?.data || null;
};

export const getSlotById = async (slotId) => {
  const response = await apiClient.get(`/missions/slots/${slotId}`);
  return response.data?.data || null;
};

export const getMissedSlots = async (brandId) => {
  const response = await apiClient.get('/missions/missed-slots', {
    params: { brand_id: brandId },
  });
  return response.data?.data || [];
};

export const linkPostToSlot = async (slotId, postId) => {
  const response = await apiClient.post(`/missions/slots/${slotId}/link-post`, { postId });
  return response.data?.data || null;
};

export const unlinkPostFromSlot = async (slotId) => {
  const response = await apiClient.post(`/missions/slots/${slotId}/unlink-post`);
  return response.data?.data || null;
};

