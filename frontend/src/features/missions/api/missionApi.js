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

