import apiClient from '../../../shared/utils/apiClient';

// In-memory cache for Post Tracker keyed by filter parameters
const postsCache = new Map();
const POSTS_TTL = 2 * 60 * 1000; // 2 minutes

const getCacheKey = (params = {}) => {
  return JSON.stringify(params);
};

export const getCachedPosts = (params = {}) => {
  const key = getCacheKey(params);
  const item = postsCache.get(key);
  if (item && Date.now() - item.timestamp < POSTS_TTL) {
    return item.data;
  }
  return null;
};

export const clearPostsCache = () => {
  postsCache.clear();
};

export const fetchPosts = async (params = {}, forceRefresh = false) => {
  // If first argument is a boolean, support legacy call fetchPosts(forceRefresh)
  let actualParams = params;
  let force = forceRefresh;
  if (typeof params === 'boolean') {
    force = params;
    actualParams = {};
  }

  if (!force) {
    const cached = getCachedPosts(actualParams);
    if (cached) return cached;
  }

  const response = await apiClient.get('/post-tracker', { params: actualParams });
  postsCache.set(getCacheKey(actualParams), {
    data: response.data,
    timestamp: Date.now()
  });
  return response.data;
};

export const fetchPostsSummary = async (params = {}) => {
  const response = await apiClient.get('/post-tracker/summary', { params });
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


