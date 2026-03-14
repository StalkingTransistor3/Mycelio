import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client.js';
import type { Organization, OrganizationHealth, Person } from '@mycelio/shared';

export function useOrganizations(type?: string) {
  return useQuery({
    queryKey: ['organizations', type],
    queryFn: () => api.getOrganizations(type ? { type } : undefined),
    select: (res) => res.data as Organization[],
  });
}

export function useOrganization(id: string) {
  return useQuery({
    queryKey: ['organization', id],
    queryFn: () => api.getOrganization(id),
    select: (res) => res.data as Organization,
    enabled: !!id,
  });
}

export function useOrganizationHealth(id: string) {
  return useQuery({
    queryKey: ['organization-health', id],
    queryFn: () => api.getOrganizationHealth(id),
    select: (res) => res.data as OrganizationHealth,
    enabled: !!id,
  });
}

export function useOrganizationMembers(id: string) {
  return useQuery({
    queryKey: ['organization-members', id],
    queryFn: () => api.getOrganizationMembers(id),
    select: (res) => res.data as Person[],
    enabled: !!id,
  });
}
