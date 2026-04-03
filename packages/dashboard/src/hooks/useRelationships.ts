import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client.js';
import type { PersonRelationshipEnriched, OrgRelationshipEnriched } from '@mycelio/shared';

// ── Person Relationships ──

export function usePersonRelationships(personId?: string) {
  return useQuery({
    queryKey: ['person-relationships', personId],
    queryFn: () => api.getPersonRelationships(personId),
    select: (res) => res.data as PersonRelationshipEnriched[],
  });
}

export function useCreatePersonRelationship() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      personAId: string;
      personBId: string;
      type: string;
      strength?: number;
      notes?: string;
    }) => api.createPersonRelationship(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['person-relationships'] });
    },
  });
}

export function useDeletePersonRelationship() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deletePersonRelationship(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['person-relationships'] });
    },
  });
}

// ── Organization Relationships ──

export function useOrgRelationships(orgId?: string) {
  return useQuery({
    queryKey: ['org-relationships', orgId],
    queryFn: () => api.getOrgRelationships(orgId),
    select: (res) => res.data as OrgRelationshipEnriched[],
  });
}

export function useCreateOrgRelationship() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      orgAId: string;
      orgBId: string;
      type: string;
      notes?: string;
    }) => api.createOrgRelationship(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['org-relationships'] });
    },
  });
}

export function useDeleteOrgRelationship() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteOrgRelationship(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['org-relationships'] });
    },
  });
}
