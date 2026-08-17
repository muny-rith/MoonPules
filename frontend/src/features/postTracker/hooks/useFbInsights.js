import { useState } from 'react';
import * as api from '../api/postTrackerApi';

export const useFbInsights = () => {
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchInsights = async (postId, pageId) => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.fetchFbInsights(postId, pageId);
      setInsights(data.data || []);
      return data;
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return { insights, loading, error, fetchInsights };
};
