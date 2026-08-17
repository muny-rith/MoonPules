import apiClient from '../../../shared/utils/apiClient';

export const fetchPosts = async () => {
  const response = await apiClient.get('/post-tracker');
  return response.data;
};

export const createPost = async (data) => {
  const response = await apiClient.post('/post-tracker', data);
  return response.data;
};

export const fetchScheduledFbPosts = async (pageId) => {
  const response = await apiClient.get(`/facebook/pages/${pageId}/scheduled-posts`);
  return response.data;
};

export const fetchFbInsights = async (postId, pageId) => {
  const response = await apiClient.get(`/facebook/insights/${postId}?pageId=${pageId}`);
  return response.data;
};
