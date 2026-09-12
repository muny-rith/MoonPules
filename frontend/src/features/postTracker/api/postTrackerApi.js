import apiClient from '../../../shared/utils/apiClient';

export const fetchPosts = async () => {
  const response = await apiClient.get('/post-tracker');
  return response.data;
};

export const createPost = async (data) => {
  const response = await apiClient.post('/post-tracker', data);
  return response.data;
};

export const fetchPostById = async (id) => {
  const response = await apiClient.get(`/post-tracker/${id}`);
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

export const deletePost = async (id) => {
  const response = await apiClient.delete(`/post-tracker/${id}`);
  return response.data;
};

export const updatePostData = async (id, data) => {
  const response = await apiClient.put(`/post-tracker/${id}`, data);
  return response.data;
};

export const syncPosts = async () => {
  const response = await apiClient.post('/post-tracker/sync');
  return response.data;
};

export const publishPostNow = async (id) => {
  const response = await apiClient.post(`/post-tracker/${id}/publish-now`);
  return response.data;
};

export const uploadPostImage = async (file) => {
  const formData = new FormData();
  formData.append('image', file);
  const response = await apiClient.post('/post-tracker/upload-image', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

export const fetchContactFooter = async () => {
  const response = await apiClient.get('/settings/contact-footer');
  return response.data;
};

export const updateContactFooter = async (footerText) => {
  const response = await apiClient.put('/settings/contact-footer', { value: footerText });
  return response.data;
};

export const fetchSavedHashtags = async () => {
  const response = await apiClient.get('/settings/saved-hashtags');
  return response.data;
};

export const updateSavedHashtags = async (hashtags) => {
  const response = await apiClient.put('/settings/saved-hashtags', { hashtags });
  return response.data;
};

export const fetchHashtags = async () => {
  const response = await apiClient.get('/hashtags');
  return response.data;
};

export const toggleSaveHashtag = async (tag, note = null) => {
  const response = await apiClient.post('/hashtags/toggle-save', { tag, note });
  return response.data;
};

export const recordHashtagsUsage = async (tags) => {
  const response = await apiClient.post('/hashtags/record-use', { tags });
  return response.data;
};

export const updateHashtagNote = async (id, note) => {
  const response = await apiClient.put(`/hashtags/${id}/note`, { note });
  return response.data;
};


