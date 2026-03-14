import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client.js';
import type { Event } from '@mycelio/shared';

export function useEvents() {
  return useQuery({
    queryKey: ['events'],
    queryFn: api.getEvents,
    select: (res) => res.data as Event[],
  });
}

export function useEvent(id: string) {
  return useQuery({
    queryKey: ['event', id],
    queryFn: () => api.getEvent(id),
    select: (res) => res.data as Event,
    enabled: !!id,
  });
}

export function useCreateEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.createEvent,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['events'] }),
  });
}
