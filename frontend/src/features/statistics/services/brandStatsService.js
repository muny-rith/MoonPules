import api from '../../../shared/utils/apiClient';

export const getBrandStats = async () => {
  const response = await api.get('/statistics/brands');
  return response.data.data;
};

export const getBrandDetail = async (id) => {
  const response = await api.get(`/statistics/brands/${id}`);
  return response.data.data;
};

export const getBrandProfitability = async () => {
  const response = await api.get('/profit/brands');
  return response.data.data;
};
