import { useState, useEffect } from 'react';
import * as api from '../api/postTrackerApi';

export const usePostTracker = () => {
  const initialPosts = api.getCachedPosts();
  const [posts, setPosts] = useState(() => initialPosts || []);
  const [loading, setLoading] = useState(() => !initialPosts);
  const [error, setError] = useState(null);

  const loadPosts = async (force = false) => {
    try {
      const hasCached = !!api.getCachedPosts();
      if (!hasCached || force) {
        setLoading(true);
      }
      const data = await api.fetchPosts(force);
      setPosts(data);
      setError(null);
    } catch (err) {
      if (!api.getCachedPosts()) {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const addPost = async (postData) => {
    try {
      const newPost = await api.createPost(postData);
      await loadPosts(true);
      return newPost;
    } catch (err) {
      throw err;
    }
  };

  const updatePost = async (id, data) => {
    try {
      const updated = await api.updatePostData(id, data);
      await loadPosts(true); // Refresh to get the new product_image and name
      return updated;
    } catch (err) {
      throw err;
    }
  };

  const deletePost = async (id) => {
    try {
      await api.deletePost(id);
      setPosts((prev) => prev.filter(p => p.id !== id));
    } catch (err) {
      throw err;
    }
  };

  const triggerSync = async () => {
    try {
      setLoading(true);
      await api.syncPosts();
      await loadPosts(true);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const publishNow = async (id) => {
    try {
      setLoading(true);
      const res = await api.publishPostNow(id);
      await loadPosts();
      return res;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPosts();
  }, []);

  return { posts, loading, error, addPost, updatePost, deletePost, publishNow, reload: loadPosts, triggerSync };
};

