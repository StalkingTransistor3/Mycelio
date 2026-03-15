import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client.js';
import type { Campaign, CampaignWithStats, CampaignMemberEnriched } from '@mycelio/shared';

export function useCampaigns(params?: Record<string, string>) {
  return useQuery({
    queryKey: ['campaigns', params],
    queryFn: () => api.getCampaigns(params),
    select: (res) => res.data as Campaign[],
  });
}

export function useCampaign(id: string) {
  return useQuery({
    queryKey: ['campaign', id],
    queryFn: () => api.getCampaign(id),
    select: (res) => res.data as CampaignWithStats,
    enabled: !!id,
  });
}

export function useCampaignMembers(campaignId: string, params?: Record<string, string>) {
  return useQuery({
    queryKey: ['campaign-members', campaignId, params],
    queryFn: () => api.getCampaignMembers(campaignId, params),
    select: (res) => res.data as CampaignMemberEnriched[],
    enabled: !!campaignId,
  });
}

export function useCreateCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.createCampaign,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['campaigns'] }),
  });
}

export function useUpdateCampaign(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: unknown) => api.updateCampaign(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['campaigns'] });
      qc.invalidateQueries({ queryKey: ['campaign', id] });
    },
  });
}

export function useDeleteCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteCampaign(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['campaigns'] }),
  });
}

export function useAddCampaignMember(campaignId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: unknown) => api.addCampaignMember(campaignId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['campaign-members', campaignId] });
      qc.invalidateQueries({ queryKey: ['campaign', campaignId] });
    },
  });
}

export function useBulkAddCampaignMembers(campaignId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (personIds: string[]) => api.addBulkCampaignMembers(campaignId, personIds),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['campaign-members', campaignId] });
      qc.invalidateQueries({ queryKey: ['campaign', campaignId] });
    },
  });
}

export function useUpdateCampaignMember(campaignId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ memberId, data }: { memberId: string; data: unknown }) =>
      api.updateCampaignMember(campaignId, memberId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['campaign-members', campaignId] });
      qc.invalidateQueries({ queryKey: ['campaign', campaignId] });
    },
  });
}

export function useRemoveCampaignMember(campaignId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (memberId: string) => api.removeCampaignMember(campaignId, memberId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['campaign-members', campaignId] });
      qc.invalidateQueries({ queryKey: ['campaign', campaignId] });
    },
  });
}
