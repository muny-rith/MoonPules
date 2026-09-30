import { useState, useEffect, useRef, useCallback } from 'react';
import * as api from '../api/postTrackerApi';

export const usePostTracker = (initialParams = { range: 'this_month' }) => {
  const initialPosts = api.getCachedPosts(initialParams);
  const [posts, setPosts] = useState(() => initialPosts || []);
  const [loading, setLoading] = useState(() => !initialPosts);
  const [error, setError] = useState(null);
  const paramsRef = useRef(initialParams);

  const loadPosts = useCallback(async (params = paramsRef.current, force = false) => {
    let actualParams = params;
    let actualForce = force;
    if (typeof params === 'boolean') {
      actualForce = params;
      actualParams = paramsRef.current;
    } else {
      paramsRef.current = actualParams;
    }

    try {
      const hasCached = !!api.getCachedPosts(actualParams);
      if (!hasCached || actualForce) {
        setLoading(true);
      }
      const data = await api.fetchPosts(actualParams, actualForce);
      setPosts(data);
      setError(null);
    } catch (err) {
      if (!api.getCachedPosts(actualParams)) {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const addPost = async (postData) => {
    try {
      const newPost = await api.createPost(postData);
      await loadPosts(paramsRef.current, true);
      return newPost;
    } catch (err) {
      throw err;
    }
  };

  const updatePost = async (id, data) => {
    try {
      const updated = await api.updatePostData(id, data);
      await loadPosts(paramsRef.current, true);
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
      await loadPosts(paramsRef.current, true);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const publishNow = async (id) => {
    try {
      setLoading(true);
      const res = await api.publishPostNow(id);
      await loadPosts(paramsRef.current, true);
      return res;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPosts(initialParams);
  }, [loadPosts]);

  return { posts, loading, error, addPost, updatePost, deletePost, publishNow, reload: loadPosts, triggerSync };
};

