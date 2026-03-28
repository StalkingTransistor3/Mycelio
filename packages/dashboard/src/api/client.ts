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
  getEventProject: (eventId: string) => request<{ data: unknown }>(`/events/${eventId}/project`),
  createEventProject: (eventId: string) => request<{ data: unknown }>(`/events/${eventId}/project`, { method: 'POST' }),

  // Organizations
  getOrganizations: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<{ data: unknown[] }>(`/organizations${qs}`);
  },
  getOrganization: (id: string) => request<{ data: unknown }>(`/organizations/${id}`),
  createOrganization: (data: unknown) => request<{ data: unknown }>('/organizations', { method: 'POST', body: JSON.stringify(data) }),
  updateOrganization: (id: string, data: unknown) => request<{ data: unknown }>(`/organizations/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  getOrganizationHealth: (id: string) => request<{ data: unknown }>(`/organizations/${id}/health`),
  getOrganizationMembers: (id: string) => request<{ data: unknown[] }>(`/organizations/${id}/members`),

  // Graph
  getGraph: (params?: { tier?: number; limit?: number }) => {
    const qs = params ? '?' + new URLSearchParams(
      Object.entries(params)
        .filter(([, v]) => v != null)
        .map(([k, v]) => [k, String(v)])
    ).toString() : '';
    return request<{ data: { nodes: unknown[]; edges: unknown[]; groups: unknown[] } }>(`/graph${qs}`);
  },
  getEgoGraph: (personId: string, depth?: number) => {
    const qs = depth != null ? `?depth=${depth}` : '';
    return request<{ data: { nodes: unknown[]; edges: unknown[]; groups: unknown[] } }>(`/graph/ego/${personId}${qs}`);
  },

  // Follow-ups
  getFollowUps: () => request<{ data: unknown[] }>('/follow-ups'),

  // Connections
  createConnection: (data: unknown) => request<{ data: unknown }>('/connections', { method: 'POST', body: JSON.stringify(data) }),

  // Milestones & Talking Points
  addMilestone: (personId: string, data: unknown) => request<{ data: unknown }>(`/people/${personId}/milestones`, { method: 'POST', body: JSON.stringify(data) }),
  addTalkingPoint: (personId: string, data: unknown) => request<{ data: unknown }>(`/people/${personId}/talking-points`, { method: 'POST', body: JSON.stringify(data) }),
  getSentiment: (personId: string) => request<{ data: unknown[] }>(`/people/${personId}/sentiment`),
  getUpcomingMilestones: (days = 30) => request<{ data: unknown[] }>(`/milestones/upcoming?days=${days}`),

  // Co-attendance & Reciprocity
  getCoAttendance: (personId: string) => request<{ data: unknown[] }>(`/people/${personId}/co-attendance`),
  getReciprocity: (personId: string) => request<{ data: unknown }>(`/people/${personId}/reciprocity`),

  // Snooze & Availability
  snoozePerson: (personId: string, until: string) => request<{ data: unknown }>(`/people/${personId}/snooze`, { method: 'PUT', body: JSON.stringify({ until }) }),
  setAvailability: (personId: string, status: string, note?: string) => request<{ data: unknown }>(`/people/${personId}/availability`, { method: 'PUT', body: JSON.stringify({ status, note }) }),

  // Venues
  getVenues: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<{ data: unknown[] }>(`/venues${qs}`);
  },
  getVenue: (id: string) => request<{ data: unknown }>(`/venues/${id}`),
  createVenue: (data: unknown) => request<{ data: unknown }>('/venues', { method: 'POST', body: JSON.stringify(data) }),
  updateVenue: (id: string, data: unknown) => request<{ data: unknown }>(`/venues/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  getVenueEvents: (venueId: string) => request<{ data: unknown[] }>(`/venues/${venueId}/events`),

  // Org Deduplication
  getOrgDuplicates: () => request<{ data: unknown[] }>('/organizations/duplicates'),
  mergeOrgs: (keepId: string, removeId: string) => request<{ data: unknown }>('/organizations/merge', { method: 'POST', body: JSON.stringify({ keepId, removeId }) }),

  // Graph analytics
  getGraphPath: (fromId: string, toId: string) => request<{ data: unknown }>(`/graph/path?from=${fromId}&to=${toId}`),
  getInfluenceScores: () => request<{ data: unknown[] }>('/graph/influence'),
  getCommunities: () => request<{ data: unknown[] }>('/graph/communities'),
  getWarmPath: (fromId: string, toId: string) => request<{ data: unknown[] }>(`/graph/warm-path?from=${fromId}&to=${toId}`),
  getSocialContext: (personId: string) => request<{ data: unknown }>(`/graph/social-context/${personId}`),

  // Pipeline & Stages
  getPipeline: () => request<{ data: unknown }>('/pipeline'),
  updateStage: (personId: string, stage: string, reason?: string) => request<{ data: unknown }>(`/people/${personId}/stage`, { method: 'PUT', body: JSON.stringify({ stage, reason }) }),
  getStageSuggestion: (personId: string) => request<{ data: unknown }>(`/people/${personId}/stage-suggestion`),

  // Intelligence
  getCommPatterns: (personId: string) => request<{ data: unknown }>(`/people/${personId}/comm-patterns`),
  detectAvailability: (personId: string) => request<{ data: unknown }>(`/people/${personId}/detect-availability`),
  getSmartReengagement: (personId: string) => request<{ data: unknown }>(`/people/${personId}/smart-reengagement`),

  // Follow-ups with params
  getFollowUpsFiltered: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<{ data: unknown[] }>(`/follow-ups${qs}`);
  },

  // Campaigns
  getCampaigns: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<{ data: unknown[] }>(`/campaigns${qs}`);
  },
  getCampaign: (id: string) => request<{ data: unknown }>(`/campaigns/${id}`),
  createCampaign: (data: unknown) => request<{ data: unknown }>('/campaigns', { method: 'POST', body: JSON.stringify(data) }),
  updateCampaign: (id: string, data: unknown) => request<{ data: unknown }>(`/campaigns/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCampaign: (id: string) => request<{ data: unknown }>(`/campaigns/${id}`, { method: 'DELETE' }),
  getCampaignMembers: (id: string, params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<{ data: unknown[] }>(`/campaigns/${id}/members${qs}`);
  },
  addCampaignMember: (campaignId: string, data: unknown) => request<{ data: unknown }>(`/campaigns/${campaignId}/members`, { method: 'POST', body: JSON.stringify(data) }),
  addBulkCampaignMembers: (campaignId: string, personIds: string[]) => request<{ data: unknown }>(`/campaigns/${campaignId}/members/bulk`, { method: 'POST', body: JSON.stringify({ personIds }) }),
  updateCampaignMember: (campaignId: string, memberId: string, data: unknown) => request<{ data: unknown }>(`/campaigns/${campaignId}/members/${memberId}`, { method: 'PUT', body: JSON.stringify(data) }),
  removeCampaignMember: (campaignId: string, memberId: string) => request<{ data: unknown }>(`/campaigns/${campaignId}/members/${memberId}`, { method: 'DELETE' }),
  getCampaignStats: (id: string) => request<{ data: unknown }>(`/campaigns/${id}/stats`),

  // Projects
  getProjects: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<{ data: unknown[] }>(`/projects${qs}`);
  },
  getProject: (id: string) => request<{ data: unknown }>(`/projects/${id}`),
  getProjectsGantt: () => request<{ data: unknown[] }>('/projects/gantt'),
  createProject: (data: unknown) => request<{ data: unknown }>('/projects', { method: 'POST', body: JSON.stringify(data) }),
  updateProject: (id: string, data: unknown) => request<{ data: unknown }>(`/projects/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteProject: (id: string) => request<{ data: unknown }>(`/projects/${id}`, { method: 'DELETE' }),

  // Tasks
  getProjectTasks: (projectId: string, params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<{ data: unknown[] }>(`/projects/${projectId}/tasks${qs}`);
  },
  getTasks: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<{ data: unknown[] }>(`/tasks${qs}`);
  },
  createTask: (projectId: string, data: unknown) => request<{ data: unknown }>(`/projects/${projectId}/tasks`, { method: 'POST', body: JSON.stringify(data) }),
  updateTask: (taskId: string, data: unknown) => request<{ data: unknown }>(`/tasks/${taskId}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteTask: (taskId: string) => request<{ data: unknown }>(`/tasks/${taskId}`, { method: 'DELETE' }),
};
