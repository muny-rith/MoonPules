import apiClient from '../../../shared/utils/apiClient';

export const login = async (email, password) => {
    const response = await apiClient.post('/auth/login', { email, password });
    return response.data; // { token, user }
};