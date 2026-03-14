const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers || {}),
    },
    ...options,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(error.message || `Request failed: ${res.status}`);
  }

  return res.json();
}

// People
export const api = {
  // People
  getPeople: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<{ data: unknown[] }>(`/people${qs}`);
  },
  getPerson: (id: string) => request<{ data: unknown }>(`/people/${id}`),
  createPerson: (data: unknown) => request<{ data: unknown }>('/people', { method: 'POST', body: JSON.stringify(data) }),
  updatePerson: (id: string, data: unknown) => request<{ data: unknown }>(`/people/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  // Interactions
  getInteractions: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<{ data: unknown[] }>(`/interactions${qs}`);
  },
  createInteraction: (data: unknown) => request<{ data: unknown }>('/interactions', { method: 'POST', body: JSON.stringify(data) }),

  // Events
  getEvents: () => request<{ data: unknown[] }>('/events'),
  getEvent: (id: string) => request<{ data: unknown }>(`/events/${id}`),
  createEvent: (data: unknown) => request<{ data: unknown }>('/events', { method: 'POST', body: JSON.stringify(data) }),
  updateEvent: (id: string, data: unknown) => request<{ data: unknown }>(`/events/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  // Communities
  getCommunities: () => request<{ data: unknown[] }>('/communities'),
  getCommunityHealth: (id: string) => request<{ data: unknown }>(`/communities/${id}/health`),

  // Graph
  getGraph: () => request<{ data: { nodes: unknown[]; edges: unknown[] } }>('/graph'),

  // Follow-ups
  getFollowUps: () => request<{ data: unknown[] }>('/follow-ups'),

  // Connections
  createConnection: (data: unknown) => request<{ data: unknown }>('/connections', { method: 'POST', body: JSON.stringify(data) }),
};
