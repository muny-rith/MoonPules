import apiClient from '../../../shared/utils/apiClient';

export const fetchPosts = async () => {
  const response = await apiClient.get('/post-tracker');
  return response.data;
};

export const createPost = async (data) => {
  const response = await apiClient.post('/post-tracker', data);
  return response.data;
};

export const fetchPages = async () => {
  const response = await apiClient.get('/facebook/pages');
  return response.data;
};

export const fetchFbInsights = async (postId, pageId) => {
  const response = await apiClient.get(`/facebook/insights/${postId}?pageId=${pageId}`);
  return response.data;
};

export const fetchRecentPosts = async (pageId) => {
  const response = await apiClient.get(`/facebook/pages/${pageId}/recent-posts`);
  return response.data;
};
