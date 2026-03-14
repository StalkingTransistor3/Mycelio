import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client.js';
import type { GraphData } from '@mycelio/shared';

export function useGraph() {
  return useQuery({
    queryKey: ['graph'],
    queryFn: api.getGraph,
    select: (res) => res.data as unknown as GraphData,
  });
}
