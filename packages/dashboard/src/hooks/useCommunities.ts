import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client.js';
import type { Community, CommunityHealth } from '@mycelio/shared';

export function useCommunities() {
  return useQuery({
    queryKey: ['communities'],
    queryFn: api.getCommunities,
    select: (res) => res.data as Community[],
  });
}

export function useCommunityHealth(id: string) {
  return useQuery({
    queryKey: ['community-health', id],
    queryFn: () => api.getCommunityHealth(id),
    select: (res) => res.data as CommunityHealth,
    enabled: !!id,
  });
}
