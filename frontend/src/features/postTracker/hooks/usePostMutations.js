import { useMutation } from '@tanstack/react-query';
import { invalidatePostAndMissionCaches } from '../../../shared/utils/cacheSync';
import * as api from '../api/postTrackerApi';

/**
 * Centralized Post Mutations Hook
 * Encapsulates all write operations for tracked and scheduled posts.
 * Automatically invalidates post, mission, and statistics caches across all tiers.
 */
export const usePostMutations = () => {
  const createPostMutation = useMutation({
    mutationFn: (payload) => api.createPost(payload),
    onSuccess: async () => {
      await invalidatePostAndMissionCaches();
    },
  });

  const updatePostMutation = useMutation({
    mutationFn: ({ id, data }) => api.updatePostData(id, data),
    onSuccess: async () => {
      await invalidatePostAndMissionCaches();
    },
  });

  const deletePostMutation = useMutation({
    mutationFn: (id) => api.deletePost(id),
    onSuccess: async () => {
      await invalidatePostAndMissionCaches();
    },
  });

  const publishNowMutation = useMutation({
    mutationFn: (id) => api.publishPostNow(id),
    onSuccess: async () => {
      await invalidatePostAndMissionCaches();
    },
  });

  const syncPostsMutation = useMutation({
    mutationFn: (params) => api.syncPosts(params),
    onSuccess: async () => {
      await invalidatePostAndMissionCaches();
    },
  });

  return {
    createPost: createPostMutation.mutateAsync,
    updatePost: (id, data) => updatePostMutation.mutateAsync({ id, data }),
    deletePost: deletePostMutation.mutateAsync,
    publishNow: publishNowMutation.mutateAsync,
    syncPosts: syncPostsMutation.mutateAsync,
    isCreating: createPostMutation.isPending,
    isUpdating: updatePostMutation.isPending,
    isDeleting: deletePostMutation.isPending,
    isPublishing: publishNowMutation.isPending,
    isSyncing: syncPostsMutation.isPending,
  };
};

