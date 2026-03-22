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

export type ConnectionType =
  | 'colleague'
  | 'mentor'
  | 'mentee'
  | 'co-founder'
  | 'friend'
  | 'investor'
  | 'client'
  | 'collaborator'
  | 'community'
  | 'other';

export type ConnectionSource = 'manual' | 'event_copresence' | 'introduction' | 'inferred';

export type AttendeeRole =
  | 'attendee'
  | 'speaker'
  | 'organizer'
  | 'sponsor'
  | 'volunteer'
  | 'host';

export interface EventAttendee {
  personId: string;
  role: AttendeeRole;
}

export type OrganizationType = 'company' | 'community' | 'other';

export type Sentiment = 'positive' | 'neutral' | 'negative';

export type MilestoneType =
  | 'birthday'
  | 'funding_round'
  | 'job_change'
  | 'wedding'
  | 'child'
  | 'launch'
  | 'award'
  | 'move'
  | 'other';

export interface CommProfile {
  preferredPlatform?: 'email' | 'call' | 'text' | 'linkedin' | 'twitter' | 'instagram' | 'in-person';
  responsePattern?: 'fast' | 'moderate' | 'slow' | 'sporadic';
  communicationStyle?: 'formal' | 'casual' | 'direct' | 'collaborative';
  bestTimes?: string;
  notes?: string;
}

export interface Milestone {
  id: string;
  type: MilestoneType;
  description: string;
  date?: string;
  recurring?: boolean;
  createdAt: string;
}

export interface TalkingPoint {
  id: string;
  text: string;
  context?: string;
  createdAt: string;
  usedAt?: string;
  active: boolean;
}

export type AvailabilityStatus = 'available' | 'busy' | 'overwhelmed' | 'unknown';

export interface PersonAvailability {
  status: AvailabilityStatus;
  note?: string;
  updatedAt: string;
}

export interface FollowUpConfig {
  cadenceDays?: number;
  notes?: string;
}

export interface VenueAvailability {
  days?: string[];
  hours?: string;
  bookingNotes?: string;
}

// ── Core Entities ──

export interface Person {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  linkedin: string | null;
  twitter: string | null;
  instagram: string | null;
  title: string | null;
  organizationId: string | null;
  organizationIds: string[];
  tier: RelationshipTier;
  tags: string[];
  archetypes: string[];
  values: string[];
  commProfile: CommProfile | null;
  milestones: Milestone[];
  talkingPoints: TalkingPoint[];
  availability: PersonAvailability | null;
  stage: RelationshipStage | null;
  stageHistory: StageTransition[];
  followUpConfig: FollowUpConfig | null;
  snoozedUntil: string | null;
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
  personIds: string[];
  eventId: string | null;
  type: InteractionType;
  sentiment: Sentiment | null;
  energy: number | null;
  initiatedBy: string | null;
  summary: string;
  details: string | null;
  occurredAt: string;
  createdAt: string;
}

export interface Event {
  id: string;
  name: string;
  date: string;
  venueId: string | null;
  location: string | null;
  description: string | null;
  url: string | null;
  attendeeIds: string[];
  attendees: EventAttendee[];
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Connection {
  id: string;
  fromPersonId: string;
  toPersonId: string;
  strength: ConnectionStrength;
  type: ConnectionType | null;
  source: ConnectionSource;
  context: string | null;
  howMet: string | null;
  connectedAt: string | null;
  createdAt: string;
}

export interface Venue {
  id: string;
  name: string;
  address: string | null;
  capacity: number | null;
  vibe: string[];
  contactPersonId: string | null;
  organizationId: string | null;
  notes: string | null;
  tags: string[];
  availability: VenueAvailability | null;
  createdAt: string;
  updatedAt: string;
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
  group: string | null; // primary organization name
  organizationId: string | null;
  organizationIds?: string[];
  tags: string[];
}

export interface GraphGroup {
  id: string;
  name: string;
  type: string;
}

export interface GraphEdge {
  source: string;
  target: string;
  strength: ConnectionStrength;
  source_type: ConnectionSource;
  context: string | null;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  groups: GraphGroup[];
}

export interface FollowUp {
  personId: string;
  personName: string;
  tier: RelationshipTier;
  lastContactAt: string | null;
  nextFollowUpAt: string | null;
  daysSinceContact: number | null;
  overdue: boolean;
  snoozedUntil?: string | null;
  coolingAlert?: boolean;
  upcomingMilestone?: { type: string; description: string; daysUntil: number } | null;
  suggestedAction?: string | null;
}

export interface OrganizationHealth {
  organizationId: string;
  organizationName: string;
  memberCount: number;
  avgTier: number;
  recentInteractions: number;
  staleMemberCount: number;
}

// ── Reciprocity ──

export interface ReciprocityIndex {
  personId: string;
  personName: string;
  score: number; // 0-100, 50 = perfectly balanced
  breakdown: {
    totalInteractions: number;
    youInitiated: number;
    theyInitiated: number;
    unknownInitiator: number;
    initiationRatio: number; // 0-1, 0.5 = balanced
    avgResponseGapDays: number | null;
    sentimentBalance: { positive: number; neutral: number; negative: number };
    energyAvg: number | null;
    lastInteraction: string | null;
    interactionFrequencyDays: number | null; // avg days between interactions
  };
  assessment: 'balanced' | 'you-lead' | 'they-lead' | 'one-sided' | 'insufficient-data';
}

// ── Relationship Stages ──

export type RelationshipStage =
  | 'prospect'
  | 'warm'
  | 'active'
  | 'collaborator'
  | 'inner_circle';

export interface StageTransition {
  from: RelationshipStage | null;
  to: RelationshipStage;
  at: string;
  reason?: string;
}

// ── Influence & Group Dynamics ──

export interface PersonInfluence {
  personId: string;
  personName: string;
  degreeCentrality: number;
  betweennessCentrality: number;
  clusterCoefficient: number;
  influenceScore: number; // composite 0-100
}

export interface MicroCommunity {
  id: string;
  name: string;
  memberIds: string[];
  sharedTags: string[];
  cohesion: number; // 0-1
}

// ── Projects & Tasks ──

export type ProjectStatus = 'active' | 'completed' | 'on_hold' | 'archived';

export type TaskStatus = 'todo' | 'in_progress' | 'done' | 'blocked';

export interface Project {
  id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  startDate: string | null;
  endDate: string | null;
  tags: string[];
  color: string;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: number;
  assignee: string | null;
  startDate: string | null;
  dueDate: string | null;
  dependencies: string[];
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ProjectWithTasks extends Project {
  tasks: Task[];
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

// ── Campaigns ──

export type CampaignStatus = 'draft' | 'active' | 'paused' | 'completed' | 'archived';

export type CampaignType = 'outreach' | 'nurture' | 'event' | 'recruitment' | 'other';

export type CampaignMemberStatus =
  | 'not_started'
  | 'contacted'
  | 'interested'
  | 'not_interested'
  | 'converted'
  | 'deferred';

export interface Campaign {
  id: string;
  name: string;
  description: string | null;
  goal: string | null;
  status: CampaignStatus;
  type: CampaignType;
  tags: string[];
  organizationIds: string[];
  eventIds: string[];
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CampaignMember {
  id: string;
  campaignId: string;
  personId: string;
  status: CampaignMemberStatus;
  priority: number;
  warmth: number | null;
  notes: string | null;
  lastOutreachAt: string | null;
  nextActionAt: string | null;
  nextAction: string | null;
  addedAt: string;
  updatedAt: string;
}

export interface CampaignMemberEnriched extends CampaignMember {
  person: Person;
}

export interface CampaignStats {
  totalMembers: number;
  byStatus: Record<CampaignMemberStatus, number>;
  contactedPercent: number;
  conversionRate: number;
  avgWarmth: number | null;
}

export interface CampaignWithStats extends Campaign {
  stats: CampaignStats;
}

export interface CampaignSearchParams {
  query?: string;
  status?: CampaignStatus;
  type?: CampaignType;
  tags?: string[];
  limit?: number;
  offset?: number;
}

export interface CampaignMemberSearchParams {
  query?: string;
  status?: CampaignMemberStatus;
  tier?: RelationshipTier;
  stage?: RelationshipStage;
  tags?: string[];
  organizationId?: string;
  minWarmth?: number;
  maxWarmth?: number;
  sortBy?: 'name' | 'warmth' | 'tier' | 'priority' | 'lastOutreach' | 'nextAction' | 'addedAt';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}
