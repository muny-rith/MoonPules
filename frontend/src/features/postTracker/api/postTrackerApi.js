import apiClient from '../../../shared/utils/apiClient';

// In-memory cache for Post Tracker
let postsCache = null;
let postsCacheTimestamp = 0;
const POSTS_TTL = 2 * 60 * 1000; // 2 minutes

export const getCachedPosts = () => {
  if (postsCache && Date.now() - postsCacheTimestamp < POSTS_TTL) {
    return postsCache;
  }
  return null;
};

export const clearPostsCache = () => {
  postsCache = null;
  postsCacheTimestamp = 0;
};

export const fetchPosts = async (forceRefresh = false) => {
  if (!forceRefresh) {
    const cached = getCachedPosts();
    if (cached) return cached;
  }
  const response = await apiClient.get('/post-tracker');
  postsCache = response.data;
  postsCacheTimestamp = Date.now();
  return response.data;
};

export const createPost = async (data) => {
  clearPostsCache();
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
  clearPostsCache();
  const response = await apiClient.delete(`/post-tracker/${id}`);
  return response.data;
};

export const updatePostData = async (id, data) => {
  clearPostsCache();
  const response = await apiClient.put(`/post-tracker/${id}`, data);
  return response.data;
};

export const syncPosts = async () => {
  clearPostsCache();
  const response = await apiClient.post('/post-tracker/sync');
  return response.data;
};

export const publishPostNow = async (id) => {
  clearPostsCache();
  const response = await apiClient.post(`/post-tracker/${id}/publish-now`);
  return response.data;
};

export const uploadPostImage = async (file) => {
  const formData = new FormData();
  formData.append('image', file);
  const response = await apiClient.post('/post-tracker/upload-image', formData);
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


