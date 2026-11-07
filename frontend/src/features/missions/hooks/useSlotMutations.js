import { useMutation } from '@tanstack/react-query';
import { invalidateMissionCaches } from '../../../shared/utils/cacheSync';
import * as missionApi from '../api/missionApi';

/**
 * Centralized Slot & Mission Mutations Hook
 * Encapsulates all write operations for monthly missions and deliverable slots.
 * Automatically invalidates mission, calendar, and statistics caches across all tiers.
 */
export const useSlotMutations = () => {
  const createSlotMutation = useMutation({
    mutationFn: (payload) => missionApi.createSlot(payload),
    onSuccess: async () => {
      await invalidateMissionCaches();
    },
  });

  const updateSlotMutation = useMutation({
    mutationFn: ({ id, data }) => missionApi.updateSlot(id, data),
    onSuccess: async () => {
      await invalidateMissionCaches();
    },
  });

  const deleteSlotMutation = useMutation({
    mutationFn: (id) => missionApi.deleteSlot(id),
    onSuccess: async () => {
      await invalidateMissionCaches();
    },
  });

  const saveMissionMutation = useMutation({
    mutationFn: (payload) => missionApi.saveMission(payload),
    onSuccess: async () => {
      await invalidateMissionCaches();
    },
  });

  return {
    createSlot: createSlotMutation.mutateAsync,
    updateSlot: (id, data) => updateSlotMutation.mutateAsync({ id, data }),
    deleteSlot: deleteSlotMutation.mutateAsync,
    saveMission: saveMissionMutation.mutateAsync,
    isCreatingSlot: createSlotMutation.isPending,
    isUpdatingSlot: updateSlotMutation.isPending,
    isDeletingSlot: deleteSlotMutation.isPending,
    isSavingMission: saveMissionMutation.isPending,
  };
};
