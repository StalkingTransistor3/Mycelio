import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client.js';
import type { GraphData } from '@mycelio/shared';

export function useGraph(params?: { tier?: number; limit?: number }) {
  return useQuery({
    queryKey: ['graph', params],
    queryFn: () => api.getGraph(params),
    select: (res) => res.data as unknown as GraphData,
  });
}

export function useEgoGraph(personId: string | null, depth: number = 1) {
  return useQuery({
    queryKey: ['ego-graph', personId, depth],
    queryFn: () => api.getEgoGraph(personId!, depth),
    select: (res) => res.data as unknown as GraphData,
    enabled: !!personId,
  });
}
