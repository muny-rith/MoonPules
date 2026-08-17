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
      setPosts((prev) => [newPost, ...prev]);
      return newPost;
    } catch (err) {
      throw err;
    }
  };

  useEffect(() => {
    loadPosts();
  }, []);

  return { posts, loading, error, addPost, reload: loadPosts };
};
