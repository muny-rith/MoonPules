import { useState, useEffect } from 'react';
import * as api from '../api/postTrackerApi';

export const usePostTracker = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadPosts = async () => {
    try {
      setLoading(true);
      const data = await api.fetchPosts();
      setPosts(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const addPost = async (postData) => {
    try {
      const newPost = await api.createPost(postData);
      await loadPosts();
      return newPost;
    } catch (err) {
      throw err;
    }
  };

  const updatePost = async (id, data) => {
    try {
      const updated = await api.updatePostData(id, data);
      await loadPosts(); // Refresh to get the new product_image and name
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
      await loadPosts();
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPosts();
  }, []);

  return { posts, loading, error, addPost, updatePost, deletePost, reload: loadPosts, triggerSync };
};
