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

// ── Cultural Profile ──

export interface CulturalBackground {
  raisedIn?: string;
  parentsFrom?: string[];
  educationType?: 'international' | 'local' | 'religious' | 'homeschool' | 'mixed';
  urbanRural?: 'urban' | 'suburban' | 'rural';
  languages?: Array<{ language: string; fluency: 'native' | 'fluent' | 'conversational' | 'basic'; learnedAt?: 'birth' | 'childhood' | 'adult' }>;
  yearsAbroad?: Array<{ country: string; years: number }>;
}

export interface CulturalCommunication {
  directness?: number; // 1-10
  contextLevel?: 'high-context' | 'medium-context' | 'low-context';
  feedbackStyle?: 'blunt' | 'diplomatic' | 'indirect' | 'avoidant';
  conflictStyle?: 'confrontational' | 'diplomatic' | 'avoidant' | 'passive-aggressive';
  formalityLevel?: 'formal' | 'semi-formal' | 'casual';
  silenceMeaning?: 'thinking' | 'disagreement' | 'respect' | 'discomfort';
}

export interface CulturalTrust {
  trustBasis?: 'institutional' | 'personal' | 'mixed';
  corruptionAwareness?: 'low' | 'moderate' | 'high';
  verificationNeeded?: 'low' | 'moderate' | 'high';
  loyaltyPattern?: 'transactional' | 'reciprocal' | 'devotional';
}

export interface CulturalSocial {
  hierarchyExpectation?: 'flat' | 'moderate' | 'steep';
  decisionMaking?: 'individual' | 'consensus' | 'top-down';
  timeOrientation?: 'strict' | 'flexible' | 'very-flexible';
  relationshipBuilding?: 'fast' | 'moderate' | 'slow';
  taskVsRelationship?: 'task-first' | 'balanced' | 'relationship-first';
}

export interface CulturalPersonal {
  faithPosture?: 'active' | 'private' | 'secular' | 'unknown';
  attachmentStyle?: 'secure' | 'anxious' | 'avoidant' | 'disorganized' | 'unknown';
  birthOrder?: 'firstborn' | 'middle' | 'youngest' | 'only' | 'unknown';
  classBackground?: 'working' | 'middle' | 'upper' | 'unknown';
  handlesBeingWrong?: 'adjusts' | 'doubles-down' | 'goes-silent' | 'blames-others' | 'unknown';
}

export interface CulturalProfile {
  background?: CulturalBackground;
  communication?: CulturalCommunication;
  trust?: CulturalTrust;
  social?: CulturalSocial;
  personal?: CulturalPersonal;
  notes?: string;
  source?: 'defaults' | 'observed' | 'mixed'; // how was this profile built
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
  culturalProfile: CulturalProfile | null;
  availability: PersonAvailability | null;
  stage: RelationshipStage | null;
  stageHistory: StageTransition[];
  followUpConfig: FollowUpConfig | null;
  snoozedUntil: string | null;
  notes: string | null;
  archived: boolean;
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
  archived: boolean;
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

export type EventStatus = 'upcoming' | 'planning' | 'promoted' | 'live' | 'completed' | 'debriefed';

export interface Event {
  id: string;
  name: string;
  date: string;
  venueId: string | null;
  location: string | null;
  description: string | null;
  url: string | null;
  isOrganizer: number; // 1 = my event, 0 = attending
  status: EventStatus | null;
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
  includeArchived?: boolean;
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

export interface ProjectTaskStats {
  total: number;
  completed: number;
  percentage: number;
}

export interface Project {
  id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  eventId: string | null;
  eventName?: string;
  startDate: string | null;
  endDate: string | null;
  tags: string[];
  color: string;
  createdAt: string;
  updatedAt: string;
  taskStats?: ProjectTaskStats;
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

// ── Person Relationships (network edges) ──

export type PersonRelationshipType =
  | 'colleague'
  | 'friend'
  | 'mentor'
  | 'investor'
  | 'advisor'
  | 'introducer'
  | 'partner'
  | 'client'
  | 'co-founder'
  | 'other';

export interface PersonRelationship {
  id: string;
  personAId: string;
  personBId: string;
  type: PersonRelationshipType;
  strength: number; // 1-5
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PersonRelationshipEnriched extends PersonRelationship {
  personA: { id: string; name: string; title: string | null; tier: number };
  personB: { id: string; name: string; title: string | null; tier: number };
}

// ── Organization Relationships (network edges) ──

export type OrgRelationshipType =
  | 'customer-vendor'
  | 'partnership'
  | 'investor-portfolio'
  | 'competitor'
  | 'subsidiary'
  | 'sponsor'
  | 'member'
  | 'other';

export interface OrgRelationship {
  id: string;
  orgAId: string;
  orgBId: string;
  type: OrgRelationshipType;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OrgRelationshipEnriched extends OrgRelationship {
  orgA: { id: string; name: string; type: string };
  orgB: { id: string; name: string; type: string };
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
