// ── Tier & Enums ──

export type RelationshipTier = 1 | 2 | 3 | 4 | 5;

export type InteractionType =
  | 'meeting'
  | 'email'
  | 'call'
  | 'social'
  | 'event'
  | 'intro'
  | 'follow_up'
  | 'other';

export type ConnectionStrength = 'strong' | 'medium' | 'weak';

export type OrganizationType = 'company' | 'community' | 'other';

// ── Core Entities ──

export interface Person {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  title: string | null;
  organizationId: string | null;
  tier: RelationshipTier;
  tags: string[];
  notes: string | null;
  lastContactAt: string | null;
  nextFollowUpAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Organization {
  id: string;
  name: string;
  type: OrganizationType;
  domain: string | null;
  industry: string | null;
  description: string | null;
  notes: string | null;
  memberIds: string[];
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Interaction {
  id: string;
  personId: string;
  type: InteractionType;
  summary: string;
  details: string | null;
  occurredAt: string;
  createdAt: string;
}

export interface Event {
  id: string;
  name: string;
  date: string;
  location: string | null;
  description: string | null;
  url: string | null;
  attendeeIds: string[];
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Connection {
  id: string;
  fromPersonId: string;
  toPersonId: string;
  strength: ConnectionStrength;
  context: string | null;
  createdAt: string;
}

// ── API Types ──

export interface PeopleSearchParams {
  query?: string;
  tier?: RelationshipTier;
  tags?: string[];
  organizationId?: string;
  limit?: number;
  offset?: number;
}

export interface GraphNode {
  id: string;
  name: string;
  tier: RelationshipTier;
  group: string | null; // organization name
  tags: string[];
}

export interface GraphEdge {
  source: string;
  target: string;
  strength: ConnectionStrength;
  context: string | null;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface FollowUp {
  personId: string;
  personName: string;
  tier: RelationshipTier;
  lastContactAt: string | null;
  nextFollowUpAt: string | null;
  daysSinceContact: number | null;
  overdue: boolean;
}

export interface OrganizationHealth {
  organizationId: string;
  organizationName: string;
  memberCount: number;
  avgTier: number;
  recentInteractions: number;
  staleMemberCount: number;
}

export interface ApiResponse<T> {
  data: T;
  meta?: {
    total?: number;
    limit?: number;
    offset?: number;
  };
}

export interface ApiError {
  error: string;
  message: string;
  statusCode: number;
}
