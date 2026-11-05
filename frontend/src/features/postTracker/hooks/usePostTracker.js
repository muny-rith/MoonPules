import { useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../../shared/utils/queryKeys';
import * as api from '../api/postTrackerApi';

export const usePostTracker = (initialParams = { range: 'this_month' }) => {
  const queryClient = useQueryClient();

  const queryKey = useMemo(() => queryKeys.posts.list(initialParams), [initialParams]);

  // Main Posts Query with TanStack Query caching & deduplication
  const {
    data: posts = [],
    isLoading,
    isFetching,
    error: queryError,
    refetch,
  } = useQuery({
    queryKey,
    queryFn: () => api.fetchPosts(initialParams, true),
    staleTime: 2 * 60 * 1000,
    select: (data) => (Array.isArray(data) ? data : []),
  });

  // Invalidate posts & missions when any mutation occurs
  const invalidateAll = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.posts.all }),
      queryClient.invalidateQueries({ queryKey: queryKeys.missions.all }),
    ]);
  }, [queryClient]);

  // Create post mutation
  const createMutation = useMutation({
    mutationFn: api.createPost,
    onSuccess: invalidateAll,
  });

  // Update post mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => api.updatePostData(id, data),
    onSuccess: invalidateAll,
  });

  // Delete post mutation
  const deleteMutation = useMutation({
    mutationFn: api.deletePost,
    onSuccess: invalidateAll,
  });

  // Publish now mutation
  const publishMutation = useMutation({
    mutationFn: api.publishPostNow,
    onSuccess: invalidateAll,
  });

  // Sync with Facebook mutation
  const syncMutation = useMutation({
    mutationFn: api.syncPosts,
    onSuccess: invalidateAll,
  });

  const addPost = async (postData) => {
    return createMutation.mutateAsync(postData);
  };

  const updatePost = async (id, data) => {
    return updateMutation.mutateAsync({ id, data });
  };

  const deletePost = async (id) => {
    return deleteMutation.mutateAsync(id);
  };

  const publishNow = async (id) => {
    return publishMutation.mutateAsync(id);
  };

  const triggerSync = async (customParams = null) => {
    const syncFilter = customParams || initialParams || {};
    return syncMutation.mutateAsync({
      range: syncFilter.range,
      timezone: syncFilter.timezone,
      platform: syncFilter.platform,
      brandId: syncFilter.brandId || syncFilter.brand_id,
      startDate: syncFilter.startDate,
      endDate: syncFilter.endDate,
    });
  };

  const refreshSinglePost = async (id) => {
    const updated = await api.refreshPostById(id);
    await invalidateAll();
    return updated;
  };

  const reload = useCallback(
    async (params, force = false) => {
      if (params && typeof params === 'object' && Object.keys(params).length > 0) {
        await queryClient.invalidateQueries({ queryKey: queryKeys.posts.list(params) });
      } else {
        await refetch();
      }
    },
    [queryClient, refetch]
  );

  const error =
    queryError?.message ||
    createMutation.error?.message ||
    updateMutation.error?.message ||
    deleteMutation.error?.message ||
    syncMutation.error?.message ||
    null;

  const loading =
    isLoading ||
    createMutation.isPending ||
    updateMutation.isPending ||
    deleteMutation.isPending ||
    publishMutation.isPending ||
    syncMutation.isPending;

  return {
    posts,
    loading,
    error,
    addPost,
    updatePost,
    deletePost,
    publishNow,
    reload,
    triggerSync,
    refreshSinglePost,
  };
};
