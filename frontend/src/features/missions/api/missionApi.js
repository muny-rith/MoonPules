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

