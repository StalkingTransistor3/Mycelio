import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client.js';
import type { Person } from '@mycelio/shared';

export function usePeople(params?: Record<string, string>) {
  return useQuery({
    queryKey: ['people', params],
    queryFn: () => api.getPeople(params),
    select: (res) => res.data as Person[],
  });
}

export function usePerson(id: string) {
  return useQuery({
    queryKey: ['person', id],
    queryFn: () => api.getPerson(id),
    select: (res) => res.data as Person,
    enabled: !!id,
  });
}

export function useCreatePerson() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.createPerson,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['people'] }),
  });
}

export function useInteractions(personId?: string) {
  return useQuery({
    queryKey: ['interactions', personId],
    queryFn: () => api.getInteractions(personId ? { personId } : undefined),
    select: (res) => res.data,
  });
}
