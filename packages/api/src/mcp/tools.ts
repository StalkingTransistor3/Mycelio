import { z } from 'zod';
import { searchPeople, getPersonById, createPerson, updatePerson, addMilestone, addTalkingPoint, getUpcomingMilestones } from '../services/people.js';
import { logInteraction, getInteractionsByPerson, getInteractionsByEvent, getPersonSentimentTrajectory } from '../services/interactions.js';
import { createEvent, getEvents, getEventById } from '../services/events.js';
import { createOrganization, getOrganizations, getOrganizationByName, getOrganizationHealth } from '../services/organizations.js';
import { findConnectionPath, createConnection, getGraphData } from '../services/connections.js';
import { getFollowUps } from '../services/follow-ups.js';
import { createVenue, searchVenues, getVenueById, getVenueHistory } from '../services/venues.js';
import { computeCoAttendance } from '../services/co-attendance.js';
import { findDuplicateOrgs, mergeOrgs } from '../services/deduplication.js';
import { computeReciprocityIndex } from '../services/reciprocity.js';
import { transitionStage, getPipeline, suggestStage } from '../services/stages.js';
import { computeInfluenceScores, detectMicroCommunities, findWarmPath, getSocialContext } from '../services/graph-analytics.js';
import { analyzeCommPatterns, detectAvailability, getSmartReengagement } from '../services/intelligence.js';
import { searchCampaigns, createCampaign, getCampaignMembers, getCampaignWithStats, addBulkCampaignMembers, updateCampaignMember, addCampaignMember } from '../services/campaigns.js';

// Helper: resolve a person name to an ID, creating if needed
async function resolvePersonId(name: string): Promise<string> {
  const existing = await searchPeople({ query: name, limit: 1 });
  if (existing.length > 0) return existing[0].id;
  const newPerson = await createPerson({ name });
  return newPerson.id;
}

// Helper: resolve an event name to an ID
async function resolveEventId(name: string): Promise<string | null> {
  const allEvents = await getEvents(500);
  const match = allEvents.find(e =>
    e.name.toLowerCase().includes(name.toLowerCase())
  );
  return match?.id || null;
}

// Helper: resolve a campaign name to an ID
async function resolveCampaignId(name: string): Promise<string | null> {
  const allCampaigns = await searchCampaigns({ limit: 500 });
  const match = allCampaigns.find(c =>
    c.name.toLowerCase().includes(name.toLowerCase())
  );
  return match?.id || null;
}

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
  handler: (args: Record<string, unknown>) => Promise<unknown>;
}

export const tools: ToolDefinition[] = [
  // 1. log_interaction
  {
    name: 'log_interaction',
    description: 'Log a new interaction with a person. Creates the person if they don\'t exist (by name match). Updates lastContactAt automatically. Supports multi-person interactions and event linking.',
    inputSchema: {
      type: 'object',
      properties: {
        personName: { type: 'string', description: 'Name of the person' },
        personId: { type: 'string', description: 'UUID of the person (if known)' },
        personNames: { type: 'array', items: { type: 'string' }, description: 'Names of additional people involved (for group interactions)' },
        eventId: { type: 'string', description: 'UUID of event this interaction happened at' },
        eventName: { type: 'string', description: 'Name of event (will search for match)' },
        type: { type: 'string', enum: ['meeting', 'email', 'call', 'social', 'event', 'intro', 'follow_up', 'other'], description: 'Type of interaction' },
        summary: { type: 'string', description: 'Brief summary of the interaction' },
        sentiment: { type: 'string', enum: ['positive', 'neutral', 'negative'], description: 'Sentiment of the interaction' },
        energy: { type: 'number', description: 'Energy level 1-5 (1=draining, 5=energizing)' },
        initiatedBy: { type: 'string', description: 'UUID of the person who initiated the interaction (for reciprocity tracking)' },
        details: { type: 'string', description: 'Detailed notes (optional)' },
        occurredAt: { type: 'string', description: 'ISO date string when interaction occurred (defaults to now)' },
      },
      required: ['type', 'summary'],
    },
    handler: async (args) => {
      // Resolve primary person
      let personId = args.personId as string | undefined;
      if (!personId && args.personName) {
        personId = await resolvePersonId(args.personName as string);
      }
      if (!personId) {
        return { error: 'Either personId or personName is required' };
      }

      // Resolve additional people for group interactions
      const personNames = args.personNames as string[] | undefined;
      let personIds: string[] | undefined;
      if (personNames && personNames.length > 0) {
        const additionalIds = await Promise.all(personNames.map(n => resolvePersonId(n)));
        personIds = [personId, ...additionalIds];
      }

      // Resolve event
      let eventId = args.eventId as string | undefined;
      if (!eventId && args.eventName) {
        eventId = (await resolveEventId(args.eventName as string)) || undefined;
      }

      const interaction = await logInteraction({
        personId,
        personIds,
        eventId,
        type: args.type as string,
        sentiment: args.sentiment as string | undefined,
        energy: args.energy as number | undefined,
        initiatedBy: args.initiatedBy as string | undefined,
        summary: args.summary as string,
        details: args.details as string | undefined,
        occurredAt: args.occurredAt ? new Date(args.occurredAt as string) : undefined,
      });

      return { success: true, interaction };
    },
  },

  // 2. query_people
  {
    name: 'query_people',
    description: 'Search for people by name, tier, tags, or organization. Returns a list of matching people.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query (name match)' },
        tier: { type: 'number', description: 'Filter by relationship tier (1-5)' },
        tags: { type: 'array', items: { type: 'string' }, description: 'Filter by tags' },
        organizationId: { type: 'string', description: 'Filter by organization UUID' },
        limit: { type: 'number', description: 'Max results (default 50)' },
      },
    },
    handler: async (args) => {
      const results = await searchPeople({
        query: args.query as string | undefined,
        tier: args.tier as 1 | 2 | 3 | 4 | 5 | undefined,
        tags: args.tags as string[] | undefined,
        organizationId: args.organizationId as string | undefined,
        limit: args.limit as number | undefined,
      });
      return { people: results, count: results.length };
    },
  },

  // 3. get_person
  {
    name: 'get_person',
    description: 'Get detailed information about a specific person, including their recent interactions.',
    inputSchema: {
      type: 'object',
      properties: {
        personId: { type: 'string', description: 'UUID of the person' },
        personName: { type: 'string', description: 'Name to search for (if UUID not known)' },
      },
    },
    handler: async (args) => {
      let personId = args.personId as string | undefined;

      if (!personId && args.personName) {
        const existing = await searchPeople({ query: args.personName as string, limit: 1 });
        if (existing.length > 0) {
          personId = existing[0].id;
        } else {
          return { error: `Person "${args.personName}" not found` };
        }
      }

      if (!personId) {
        return { error: 'Either personId or personName is required' };
      }

      const person = await getPersonById(personId);
      if (!person) return { error: 'Person not found' };

      const interactions = await getInteractionsByPerson(personId, 10);
      const sentimentTrajectory = await getPersonSentimentTrajectory(personId, 5);
      return {
        person,
        recentInteractions: interactions,
        sentimentTrajectory,
        milestones: person.milestones,
        talkingPoints: (person.talkingPoints as Record<string, unknown>[])?.filter((tp: Record<string, unknown>) => tp.active !== false),
        archetypes: person.archetypes,
        values: person.values,
        commProfile: person.commProfile,
      };
    },
  },

  // 4. prep_event
  {
    name: 'prep_event',
    description: 'Get preparation brief for an upcoming event. Returns attendee details, relationship tiers, last interactions, and talking points.',
    inputSchema: {
      type: 'object',
      properties: {
        eventId: { type: 'string', description: 'UUID of the event' },
      },
      required: ['eventId'],
    },
    handler: async (args) => {
      const { getEventById } = await import('../services/events.js');
      const event = await getEventById(args.eventId as string);
      if (!event) return { error: 'Event not found' };

      const attendeeIds = event.attendeeIds as string[];
      const attendees = [];

      for (const aid of attendeeIds) {
        const person = await getPersonById(aid);
        if (person) {
          const recentInteractions = await getInteractionsByPerson(aid, 3);
          const sentimentTrajectory = await getPersonSentimentTrajectory(aid, 3);
          attendees.push({
            person,
            recentInteractions,
            sentimentTrajectory,
            talkingPoints: (person.talkingPoints as Record<string, unknown>[])?.filter((tp: Record<string, unknown>) => tp.active !== false),
            milestones: person.milestones,
            commProfile: person.commProfile,
            archetypes: person.archetypes,
            values: person.values,
          });
        }
      }

      const upcomingMilestones = await getUpcomingMilestones(14);
      const attendeeMilestones = upcomingMilestones.filter(m =>
        attendeeIds.includes(m.personId)
      );

      return {
        event,
        attendees,
        totalAttendees: attendees.length,
        upcomingMilestones: attendeeMilestones,
      };
    },
  },

  // 5. suggest_intros
  {
    name: 'suggest_intros',
    description: 'Suggest potential introductions between people based on shared tags, communities, or organizations.',
    inputSchema: {
      type: 'object',
      properties: {
        personId: { type: 'string', description: 'UUID of the person to find intro suggestions for' },
      },
      required: ['personId'],
    },
    handler: async (args) => {
      const person = await getPersonById(args.personId as string);
      if (!person) return { error: 'Person not found' };

      const personTags = person.tags as string[];
      const allPeople = await searchPeople({ limit: 200 });

      // Find people with overlapping tags who aren't directly connected
      const existingConnections = await (await import('../services/connections.js')).getConnectionsForPerson(person.id);
      const connectedIds = new Set(
        existingConnections.map((c) =>
          c.fromPersonId === person.id ? c.toPersonId : c.fromPersonId
        )
      );

      const suggestions = allPeople
        .filter((p) => p.id !== person.id && !connectedIds.has(p.id))
        .map((p) => {
          const pTags = p.tags as string[];
          const sharedTags = personTags.filter((t: string) => pTags.includes(t));
          const sameOrg = p.organizationId === person.organizationId && person.organizationId;
          return {
            person: p,
            sharedTags,
            sameOrg: !!sameOrg,
            score: sharedTags.length + (sameOrg ? 2 : 0),
          };
        })
        .filter((s) => s.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);

      return { suggestions };
    },
  },

  // 6. log_event
  {
    name: 'log_event',
    description: 'Create a new event with attendees. Supports structured attendees with roles (speaker, organizer, sponsor, volunteer, host, attendee).',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Event name' },
        date: { type: 'string', description: 'ISO date string' },
        location: { type: 'string', description: 'Event location' },
        description: { type: 'string', description: 'Event description' },
        url: { type: 'string', description: 'External URL for the event (Meetup, Eventbrite, website, etc.)' },
        attendeeIds: { type: 'array', items: { type: 'string' }, description: 'Array of person UUIDs (simple mode)' },
        attendees: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Person name (will resolve to ID)' },
              personId: { type: 'string', description: 'Person UUID (if known)' },
              role: { type: 'string', enum: ['attendee', 'speaker', 'organizer', 'sponsor', 'volunteer', 'host'], description: 'Role at the event' },
            },
          },
          description: 'Structured attendees with roles (name resolution supported)',
        },
        tags: { type: 'array', items: { type: 'string' }, description: 'Event tags' },
      },
      required: ['name', 'date'],
    },
    handler: async (args) => {
      // Resolve structured attendees (name → ID)
      const rawAttendees = args.attendees as { name?: string; personId?: string; role: string }[] | undefined;
      let resolvedAttendees: { personId: string; role: string }[] | undefined;

      if (rawAttendees && rawAttendees.length > 0) {
        resolvedAttendees = [];
        for (const a of rawAttendees) {
          const pid = a.personId || (a.name ? await resolvePersonId(a.name) : null);
          if (pid) {
            resolvedAttendees.push({ personId: pid, role: a.role || 'attendee' });
          }
        }
      }

      const event = await createEvent({
        name: args.name as string,
        date: new Date(args.date as string),
        location: args.location as string | undefined,
        description: args.description as string | undefined,
        url: args.url as string | undefined,
        attendeeIds: args.attendeeIds as string[] | undefined,
        attendees: resolvedAttendees,
        tags: args.tags as string[] | undefined,
      });
      return { success: true, event };
    },
  },

  // 7. community_health
  {
    name: 'community_health',
    description: 'Get health metrics for a community: member count, average tier, recent interactions, stale members.',
    inputSchema: {
      type: 'object',
      properties: {
        communityId: { type: 'string', description: 'UUID of the community (if known)' },
        communityName: { type: 'string', description: 'Name of the community to search for' },
      },
    },
    handler: async (args) => {
      let orgId = args.communityId as string | undefined;

      if (!orgId && args.communityName) {
        const match = await getOrganizationByName(args.communityName as string);
        if (match) orgId = match.id;
        else return { error: `Community "${args.communityName}" not found` };
      }

      if (!orgId) return { error: 'communityId or communityName is required' };

      const health = await getOrganizationHealth(orgId);
      return health || { error: 'Community not found' };
    },
  },

  // 8. add_org
  {
    name: 'add_org',
    description: 'Add a new organization to the network.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Organization name' },
        type: { type: 'string', enum: ['company', 'community', 'other'], description: 'Type of organization (default: company)' },
        domain: { type: 'string', description: 'Website domain' },
        industry: { type: 'string', description: 'Industry sector' },
        description: { type: 'string', description: 'Description of the organization' },
        notes: { type: 'string', description: 'Additional notes' },
        memberIds: { type: 'array', items: { type: 'string' }, description: 'Array of person UUIDs (for communities)' },
        tags: { type: 'array', items: { type: 'string' }, description: 'Tags (e.g. sponsor, host)' },
      },
      required: ['name'],
    },
    handler: async (args) => {
      const org = await createOrganization({
        name: args.name as string,
        type: args.type as string | undefined,
        domain: args.domain as string | undefined,
        industry: args.industry as string | undefined,
        description: args.description as string | undefined,
        notes: args.notes as string | undefined,
        memberIds: args.memberIds as string[] | undefined,
        tags: args.tags as string[] | undefined,
      });
      return { success: true, organization: org };
    },
  },

  // 9. find_connections
  {
    name: 'find_connections',
    description: 'Find connection paths between two people in the network.',
    inputSchema: {
      type: 'object',
      properties: {
        fromPersonId: { type: 'string', description: 'UUID of the starting person' },
        toPersonId: { type: 'string', description: 'UUID of the target person' },
        maxDepth: { type: 'number', description: 'Maximum path depth (default 4)' },
      },
      required: ['fromPersonId', 'toPersonId'],
    },
    handler: async (args) => {
      const paths = await findConnectionPath(
        args.fromPersonId as string,
        args.toPersonId as string,
        args.maxDepth as number | undefined,
      );

      // Enrich paths with person names
      const enrichedPaths = [];
      for (const path of paths) {
        const enriched = [];
        for (const pid of path) {
          const person = await getPersonById(pid);
          enriched.push({ id: pid, name: person?.name || 'Unknown' });
        }
        enrichedPaths.push(enriched);
      }

      return { paths: enrichedPaths, pathCount: enrichedPaths.length };
    },
  },

  // 10. follow_ups
  {
    name: 'follow_ups',
    description: 'Get the list of people who need follow-up, sorted by urgency. Shows overdue contacts, cooling alerts, upcoming milestones, and suggested actions.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Max results (default all)' },
        includeSnoozed: { type: 'boolean', description: 'Include snoozed people (default false)' },
      },
    },
    handler: async (args) => {
      const followUps = await getFollowUps({ includeSnoozed: args.includeSnoozed as boolean });
      const limit = args.limit as number | undefined;
      const data = limit ? followUps.slice(0, limit) : followUps;
      return { followUps: data, total: data.length };
    },
  },

  // 11. bulk_log_event_meetings
  {
    name: 'bulk_log_event_meetings',
    description: 'Log that you met multiple people at an event. Creates one interaction per person, all linked to the event. Updates lastContactAt for each person.',
    inputSchema: {
      type: 'object',
      properties: {
        eventId: { type: 'string', description: 'UUID of the event' },
        eventName: { type: 'string', description: 'Name of event to search for (if UUID not known)' },
        peopleNames: { type: 'array', items: { type: 'string' }, description: 'Names of people met at the event' },
        peopleIds: { type: 'array', items: { type: 'string' }, description: 'UUIDs of people met (alternative to names)' },
        summary: { type: 'string', description: 'Shared summary for all interactions' },
        details: { type: 'string', description: 'Shared details (optional)' },
        occurredAt: { type: 'string', description: 'Date of meeting (defaults to event date or now)' },
      },
      required: ['summary'],
    },
    handler: async (args) => {
      // Resolve event
      let eventId = args.eventId as string | undefined;
      if (!eventId && args.eventName) {
        eventId = (await resolveEventId(args.eventName as string)) || undefined;
      }

      // Get event date as default occurredAt
      let occurredAt = args.occurredAt ? new Date(args.occurredAt as string) : undefined;
      if (!occurredAt && eventId) {
        const event = await getEventById(eventId);
        if (event) occurredAt = new Date(event.date);
      }

      // Resolve people
      const peopleNames = args.peopleNames as string[] | undefined;
      const peopleIds = args.peopleIds as string[] | undefined;
      const resolvedIds: string[] = [];

      if (peopleIds) {
        resolvedIds.push(...peopleIds);
      }
      if (peopleNames) {
        for (const name of peopleNames) {
          resolvedIds.push(await resolvePersonId(name));
        }
      }

      if (resolvedIds.length === 0) {
        return { error: 'Either peopleNames or peopleIds is required' };
      }

      // Create one interaction per person, all linked to the event
      const results = [];
      for (const pid of resolvedIds) {
        const interaction = await logInteraction({
          personId: pid,
          personIds: [pid],
          eventId,
          type: 'event',
          summary: args.summary as string,
          details: args.details as string | undefined,
          occurredAt,
        });
        results.push(interaction);
      }

      return {
        success: true,
        interactionsCreated: results.length,
        eventId: eventId || null,
        peopleContacted: resolvedIds.length,
      };
    },
  },

  // 12. update_person_profile
  {
    name: 'update_person_profile',
    description: 'Update a person\'s profile metadata: archetypes, values, and communication preferences.',
    inputSchema: {
      type: 'object',
      properties: {
        personId: { type: 'string', description: 'UUID of the person' },
        personName: { type: 'string', description: 'Name of the person (if UUID not known)' },
        archetypes: { type: 'array', items: { type: 'string' }, description: 'Personality archetypes (e.g. high-agency, builder-mentality, connector)' },
        values: { type: 'array', items: { type: 'string' }, description: 'Core values (e.g. transparency, community-first, innovation)' },
        commProfile: {
          type: 'object',
          properties: {
            preferredPlatform: { type: 'string', enum: ['email', 'call', 'text', 'linkedin', 'twitter', 'instagram', 'in-person'] },
            responsePattern: { type: 'string', enum: ['fast', 'moderate', 'slow', 'sporadic'] },
            communicationStyle: { type: 'string', enum: ['formal', 'casual', 'direct', 'collaborative'] },
            bestTimes: { type: 'string', description: 'Best times to reach them' },
            notes: { type: 'string', description: 'Communication notes' },
          },
          description: 'Communication style profile',
        },
      },
    },
    handler: async (args) => {
      let personId = args.personId as string | undefined;
      if (!personId && args.personName) {
        personId = await resolvePersonId(args.personName as string);
      }
      if (!personId) return { error: 'Either personId or personName is required' };

      const updateData: Record<string, unknown> = {};
      if (args.archetypes) updateData.archetypes = args.archetypes;
      if (args.values) updateData.values = args.values;
      if (args.commProfile) updateData.commProfile = args.commProfile;

      const person = await updatePerson(personId, updateData);
      return { success: true, person };
    },
  },

  // 13. log_milestone
  {
    name: 'log_milestone',
    description: 'Record a personal milestone for a person (birthday, funding round, job change, wedding, etc.). Recurring milestones will surface in prep briefs annually.',
    inputSchema: {
      type: 'object',
      properties: {
        personId: { type: 'string', description: 'UUID of the person' },
        personName: { type: 'string', description: 'Name of the person (if UUID not known)' },
        type: { type: 'string', enum: ['birthday', 'funding_round', 'job_change', 'wedding', 'child', 'launch', 'award', 'move', 'other'], description: 'Milestone type' },
        description: { type: 'string', description: 'Description of the milestone' },
        date: { type: 'string', description: 'Date of the milestone (ISO string)' },
        recurring: { type: 'boolean', description: 'Whether this recurs annually (e.g. birthdays)' },
      },
      required: ['type', 'description'],
    },
    handler: async (args) => {
      let personId = args.personId as string | undefined;
      if (!personId && args.personName) {
        personId = await resolvePersonId(args.personName as string);
      }
      if (!personId) return { error: 'Either personId or personName is required' };

      const result = await addMilestone(personId, {
        type: args.type as string,
        description: args.description as string,
        date: args.date as string | undefined,
        recurring: args.recurring as boolean | undefined,
      });
      return { success: true, milestone: result.milestone, personId };
    },
  },

  // 14. save_talking_point
  {
    name: 'save_talking_point',
    description: 'Save a talking point for a person. These surface in prep briefs and person details for future conversations.',
    inputSchema: {
      type: 'object',
      properties: {
        personId: { type: 'string', description: 'UUID of the person' },
        personName: { type: 'string', description: 'Name of the person (if UUID not known)' },
        text: { type: 'string', description: 'The talking point' },
        context: { type: 'string', description: 'Context for when to use this (optional)' },
      },
      required: ['text'],
    },
    handler: async (args) => {
      let personId = args.personId as string | undefined;
      if (!personId && args.personName) {
        personId = await resolvePersonId(args.personName as string);
      }
      if (!personId) return { error: 'Either personId or personName is required' };

      const result = await addTalkingPoint(personId, {
        text: args.text as string,
        context: args.context as string | undefined,
      });
      return { success: true, talkingPoint: result.talkingPoint, personId };
    },
  },

  // 15. add_venue
  {
    name: 'add_venue',
    description: 'Create a venue with capacity, vibe tags, contact person, and availability info.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Venue name' },
        address: { type: 'string', description: 'Physical address' },
        capacity: { type: 'number', description: 'Max capacity' },
        vibe: { type: 'array', items: { type: 'string' }, description: 'Vibe tags (casual, rooftop, tech-friendly, loud, intimate, etc.)' },
        contactPersonName: { type: 'string', description: 'Name of venue contact person' },
        organizationName: { type: 'string', description: 'Name of owning organization' },
        notes: { type: 'string', description: 'Notes about the venue' },
        tags: { type: 'array', items: { type: 'string' }, description: 'Tags' },
        availability: {
          type: 'object',
          properties: {
            days: { type: 'array', items: { type: 'string' }, description: 'Available days (Mon, Tue, etc.)' },
            hours: { type: 'string', description: 'Available hours (e.g. 6pm-10pm)' },
            bookingNotes: { type: 'string', description: 'Booking process notes' },
          },
          description: 'Availability details',
        },
      },
      required: ['name'],
    },
    handler: async (args) => {
      let contactPersonId: string | undefined;
      if (args.contactPersonName) {
        contactPersonId = await resolvePersonId(args.contactPersonName as string);
      }

      let organizationId: string | undefined;
      if (args.organizationName) {
        const { getOrganizationByName } = await import('../services/organizations.js');
        const org = await getOrganizationByName(args.organizationName as string);
        organizationId = org?.id;
      }

      const venue = await createVenue({
        name: args.name as string,
        address: args.address as string | undefined,
        capacity: args.capacity as number | undefined,
        vibe: args.vibe as string[] | undefined,
        contactPersonId,
        organizationId,
        notes: args.notes as string | undefined,
        tags: args.tags as string[] | undefined,
        availability: args.availability as Record<string, unknown> | undefined,
      });
      return { success: true, venue };
    },
  },

  // 16. find_venue
  {
    name: 'find_venue',
    description: 'Search for venues by name, minimum capacity, vibe, or tags.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Search by venue name' },
        minCapacity: { type: 'number', description: 'Minimum capacity needed' },
        vibe: { type: 'array', items: { type: 'string' }, description: 'Desired vibe tags' },
        tags: { type: 'array', items: { type: 'string' }, description: 'Filter by tags' },
      },
    },
    handler: async (args) => {
      const results = await searchVenues({
        name: args.name as string | undefined,
        minCapacity: args.minCapacity as number | undefined,
        vibe: args.vibe as string[] | undefined,
        tags: args.tags as string[] | undefined,
      });
      return { venues: results, count: results.length };
    },
  },

  // 17. co_attendance
  {
    name: 'co_attendance',
    description: 'Find who keeps showing up at the same events as a person. Shows shared event count.',
    inputSchema: {
      type: 'object',
      properties: {
        personId: { type: 'string', description: 'UUID of the person' },
        personName: { type: 'string', description: 'Name of the person (if UUID not known)' },
      },
    },
    handler: async (args) => {
      let personId = args.personId as string | undefined;
      if (!personId && args.personName) {
        const existing = await searchPeople({ query: args.personName as string, limit: 1 });
        if (existing.length > 0) personId = existing[0].id;
        else return { error: `Person "${args.personName}" not found` };
      }
      if (!personId) return { error: 'Either personId or personName is required' };

      const coAttendance = await computeCoAttendance(personId);

      // Enrich with person names
      const enriched = [];
      for (const ca of coAttendance.slice(0, 20)) {
        const person = await getPersonById(ca.personId);
        enriched.push({
          ...ca,
          personName: person?.name || 'Unknown',
        });
      }

      return { coAttendance: enriched };
    },
  },

  // 18. snooze_follow_up
  {
    name: 'snooze_follow_up',
    description: 'Snooze follow-up reminders for a person until a specific date.',
    inputSchema: {
      type: 'object',
      properties: {
        personId: { type: 'string', description: 'UUID of the person' },
        personName: { type: 'string', description: 'Name of the person (if UUID not known)' },
        until: { type: 'string', description: 'Snooze until this date (ISO string)' },
      },
      required: ['until'],
    },
    handler: async (args) => {
      let personId = args.personId as string | undefined;
      if (!personId && args.personName) {
        personId = await resolvePersonId(args.personName as string);
      }
      if (!personId) return { error: 'Either personId or personName is required' };

      const person = await updatePerson(personId, {
        snoozedUntil: new Date(args.until as string),
      } as Record<string, unknown>);
      return { success: true, snoozedUntil: args.until, personName: person?.name };
    },
  },

  // 19. set_availability
  {
    name: 'set_availability',
    description: 'Update a person\'s current availability/stress status (available, busy, overwhelmed, unknown).',
    inputSchema: {
      type: 'object',
      properties: {
        personId: { type: 'string', description: 'UUID of the person' },
        personName: { type: 'string', description: 'Name of the person (if UUID not known)' },
        status: { type: 'string', enum: ['available', 'busy', 'overwhelmed', 'unknown'], description: 'Availability status' },
        note: { type: 'string', description: 'Note about their availability (optional)' },
      },
      required: ['status'],
    },
    handler: async (args) => {
      let personId = args.personId as string | undefined;
      if (!personId && args.personName) {
        personId = await resolvePersonId(args.personName as string);
      }
      if (!personId) return { error: 'Either personId or personName is required' };

      const availability = {
        status: args.status as string,
        note: args.note as string | undefined,
        updatedAt: new Date().toISOString(),
      };
      const person = await updatePerson(personId, { availability } as Record<string, unknown>);
      return { success: true, personName: person?.name, availability };
    },
  },

  // 20. find_duplicate_orgs
  {
    name: 'find_duplicate_orgs',
    description: 'Surface potential duplicate organizations based on fuzzy name matching.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
    handler: async () => {
      const duplicates = await findDuplicateOrgs();
      return { duplicates, count: duplicates.length };
    },
  },

  // 21. merge_orgs
  {
    name: 'merge_orgs',
    description: 'Merge two organizations. Moves all people and data from the removed org to the kept org, then deletes the duplicate.',
    inputSchema: {
      type: 'object',
      properties: {
        keepId: { type: 'string', description: 'UUID of the organization to keep' },
        removeId: { type: 'string', description: 'UUID of the organization to remove (will be deleted)' },
      },
      required: ['keepId', 'removeId'],
    },
    handler: async (args) => {
      const result = await mergeOrgs(args.keepId as string, args.removeId as string);
      return { success: true, ...result };
    },
  },

  // 22. reciprocity_index
  {
    name: 'reciprocity_index',
    description: 'Get the reciprocity index for a relationship. Measures initiation balance, sentiment trajectory, energy levels, and response patterns. Returns a 0-100 score (50=balanced) and assessment.',
    inputSchema: {
      type: 'object',
      properties: {
        personId: { type: 'string', description: 'UUID of the person' },
        personName: { type: 'string', description: 'Name of the person (if UUID not known)' },
      },
    },
    handler: async (args) => {
      let personId = args.personId as string | undefined;
      if (!personId && args.personName) {
        const existing = await searchPeople({ query: args.personName as string, limit: 1 });
        if (existing.length > 0) personId = existing[0].id;
        else return { error: `Person "${args.personName}" not found` };
      }
      if (!personId) return { error: 'Either personId or personName is required' };

      const reciprocity = await computeReciprocityIndex(personId);
      if (!reciprocity) return { error: 'Person not found' };
      return reciprocity;
    },
  },

  // 23. update_stage
  {
    name: 'update_stage',
    description: 'Move a person through the relationship pipeline. Stages: prospect → warm → active → collaborator → inner_circle. Records transition history.',
    inputSchema: {
      type: 'object',
      properties: {
        personId: { type: 'string', description: 'UUID of the person' },
        personName: { type: 'string', description: 'Name of the person (if UUID not known)' },
        stage: { type: 'string', enum: ['prospect', 'warm', 'active', 'collaborator', 'inner_circle'], description: 'New stage' },
        reason: { type: 'string', description: 'Reason for the transition' },
      },
      required: ['stage'],
    },
    handler: async (args) => {
      let personId = args.personId as string | undefined;
      if (!personId && args.personName) {
        personId = await resolvePersonId(args.personName as string);
      }
      if (!personId) return { error: 'Either personId or personName is required' };

      const result = await transitionStage(personId, args.stage as any, args.reason as string | undefined);
      if (!result) return { error: 'Person not found' };
      return { success: true, ...result };
    },
  },

  // 24. get_pipeline
  {
    name: 'get_pipeline',
    description: 'Get the full relationship pipeline showing all people organized by stage (prospect, warm, active, collaborator, inner_circle).',
    inputSchema: {
      type: 'object',
      properties: {},
    },
    handler: async () => {
      const pipeline = await getPipeline();
      const summary: Record<string, number> = {};
      for (const [stage, people] of Object.entries(pipeline)) {
        summary[stage] = people.length;
      }
      return { pipeline, summary };
    },
  },

  // 25. influence_scores
  {
    name: 'influence_scores',
    description: 'Compute influence metrics for people in the network. Shows degree centrality, betweenness centrality, cluster coefficient, and composite influence score (0-100).',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Max results (default all)' },
      },
    },
    handler: async (args) => {
      const scores = await computeInfluenceScores();
      const limit = (args.limit as number) || scores.length;
      return { influencers: scores.slice(0, limit), total: scores.length };
    },
  },

  // 26. detect_communities
  {
    name: 'detect_communities',
    description: 'Detect micro-communities in the network based on connection patterns. Shows member lists, shared tags, and cohesion scores.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
    handler: async () => {
      const communities = await detectMicroCommunities();
      return { communities, count: communities.length };
    },
  },

  // 27. warm_intro_path
  {
    name: 'warm_intro_path',
    description: 'Find the warmest introduction path between two people. Factors in connection strength and relationship tier to find the most natural route.',
    inputSchema: {
      type: 'object',
      properties: {
        fromPersonId: { type: 'string', description: 'UUID of the starting person' },
        fromPersonName: { type: 'string', description: 'Name of the starting person' },
        toPersonId: { type: 'string', description: 'UUID of the target person' },
        toPersonName: { type: 'string', description: 'Name of the target person' },
      },
    },
    handler: async (args) => {
      let fromId = args.fromPersonId as string | undefined;
      let toId = args.toPersonId as string | undefined;

      if (!fromId && args.fromPersonName) {
        const found = await searchPeople({ query: args.fromPersonName as string, limit: 1 });
        if (found.length > 0) fromId = found[0].id;
        else return { error: `Person "${args.fromPersonName}" not found` };
      }
      if (!toId && args.toPersonName) {
        const found = await searchPeople({ query: args.toPersonName as string, limit: 1 });
        if (found.length > 0) toId = found[0].id;
        else return { error: `Person "${args.toPersonName}" not found` };
      }
      if (!fromId || !toId) return { error: 'Both from and to person are required' };

      const paths = await findWarmPath(fromId, toId);
      return { paths, pathCount: paths.length };
    },
  },

  // 28. social_context
  {
    name: 'social_context',
    description: 'Get a person\'s social context: direct connections, mutual friends, overlapping circles, and shared interests.',
    inputSchema: {
      type: 'object',
      properties: {
        personId: { type: 'string', description: 'UUID of the person' },
        personName: { type: 'string', description: 'Name of the person (if UUID not known)' },
      },
    },
    handler: async (args) => {
      let personId = args.personId as string | undefined;
      if (!personId && args.personName) {
        const found = await searchPeople({ query: args.personName as string, limit: 1 });
        if (found.length > 0) personId = found[0].id;
        else return { error: `Person "${args.personName}" not found` };
      }
      if (!personId) return { error: 'Either personId or personName is required' };

      const context = await getSocialContext(personId);
      if (!context) return { error: 'Person not found' };
      return context;
    },
  },

  // 29. comm_patterns
  {
    name: 'comm_patterns',
    description: 'Analyze communication patterns for a person. Shows best channels, timing patterns, sentiment trajectory, and recommended approach.',
    inputSchema: {
      type: 'object',
      properties: {
        personId: { type: 'string', description: 'UUID of the person' },
        personName: { type: 'string', description: 'Name of the person (if UUID not known)' },
      },
    },
    handler: async (args) => {
      let personId = args.personId as string | undefined;
      if (!personId && args.personName) {
        const found = await searchPeople({ query: args.personName as string, limit: 1 });
        if (found.length > 0) personId = found[0].id;
        else return { error: `Person "${args.personName}" not found` };
      }
      if (!personId) return { error: 'Either personId or personName is required' };

      const patterns = await analyzeCommPatterns(personId);
      if (!patterns) return { error: 'No interaction data found' };
      return patterns;
    },
  },

  // 30. detect_stress
  {
    name: 'detect_stress',
    description: 'Auto-detect a person\'s availability/stress level from interaction patterns. Analyzes sentiment trends, energy levels, and response gaps.',
    inputSchema: {
      type: 'object',
      properties: {
        personId: { type: 'string', description: 'UUID of the person' },
        personName: { type: 'string', description: 'Name of the person (if UUID not known)' },
      },
    },
    handler: async (args) => {
      let personId = args.personId as string | undefined;
      if (!personId && args.personName) {
        const found = await searchPeople({ query: args.personName as string, limit: 1 });
        if (found.length > 0) personId = found[0].id;
        else return { error: `Person "${args.personName}" not found` };
      }
      if (!personId) return { error: 'Either personId or personName is required' };

      const result = await detectAvailability(personId);
      if (!result) return { error: 'Person not found' };
      return result;
    },
  },

  // 31. smart_reengagement
  {
    name: 'smart_reengagement',
    description: 'Get smart re-engagement advice for a person. Factors in time since contact, tier importance, upcoming milestones, communication preferences, and relationship trajectory.',
    inputSchema: {
      type: 'object',
      properties: {
        personId: { type: 'string', description: 'UUID of the person' },
        personName: { type: 'string', description: 'Name of the person (if UUID not known)' },
      },
    },
    handler: async (args) => {
      let personId = args.personId as string | undefined;
      if (!personId && args.personName) {
        const found = await searchPeople({ query: args.personName as string, limit: 1 });
        if (found.length > 0) personId = found[0].id;
        else return { error: `Person "${args.personName}" not found` };
      }
      if (!personId) return { error: 'Either personId or personName is required' };

      const result = await getSmartReengagement(personId);
      if (!result) return { error: 'Person not found' };
      return result;
    },
  },

  // 32. create_campaign
  {
    name: 'create_campaign',
    description: 'Create a new campaign for targeted outreach. Campaigns group people for organized follow-up and tracking.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Campaign name' },
        description: { type: 'string', description: 'What this campaign is about' },
        goal: { type: 'string', description: 'Success criteria for the campaign' },
        type: { type: 'string', enum: ['outreach', 'nurture', 'event', 'recruitment', 'other'], description: 'Campaign type' },
        tags: { type: 'array', items: { type: 'string' }, description: 'Tags for categorization' },
        startDate: { type: 'string', description: 'ISO date for campaign start' },
        endDate: { type: 'string', description: 'ISO date for campaign end' },
      },
      required: ['name'],
    },
    handler: async (args) => {
      const campaign = await createCampaign({
        name: args.name as string,
        description: args.description as string | undefined,
        goal: args.goal as string | undefined,
        type: args.type as string | undefined,
        tags: args.tags as string[] | undefined,
        startDate: args.startDate ? new Date(args.startDate as string) : undefined,
        endDate: args.endDate ? new Date(args.endDate as string) : undefined,
      });
      return { success: true, campaign };
    },
  },

  // 33. query_campaigns
  {
    name: 'query_campaigns',
    description: 'Search and filter campaigns by name, status, type, or tags. Returns campaigns with stats (member count, contacted %, conversion rate).',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search by campaign name' },
        status: { type: 'string', enum: ['draft', 'active', 'paused', 'completed', 'archived'], description: 'Filter by status' },
        type: { type: 'string', enum: ['outreach', 'nurture', 'event', 'recruitment', 'other'], description: 'Filter by type' },
        tags: { type: 'array', items: { type: 'string' }, description: 'Filter by tags' },
        limit: { type: 'number', description: 'Max results' },
      },
    },
    handler: async (args) => {
      const campaigns = await searchCampaigns({
        query: args.query as string | undefined,
        status: args.status as any,
        type: args.type as any,
        tags: args.tags as string[] | undefined,
        limit: args.limit as number | undefined,
      });
      // Enrich with stats
      const enriched = [];
      for (const c of campaigns) {
        const withStats = await getCampaignWithStats(c.id);
        if (withStats) enriched.push(withStats);
      }
      return { campaigns: enriched, count: enriched.length };
    },
  },

  // 34. add_campaign_members
  {
    name: 'add_campaign_members',
    description: 'Add one or more people to a campaign. Can reference campaign and people by name or ID. Creates person if not found.',
    inputSchema: {
      type: 'object',
      properties: {
        campaignId: { type: 'string', description: 'Campaign UUID' },
        campaignName: { type: 'string', description: 'Campaign name (will search for match)' },
        personNames: { type: 'array', items: { type: 'string' }, description: 'Names of people to add' },
        personIds: { type: 'array', items: { type: 'string' }, description: 'UUIDs of people to add' },
      },
    },
    handler: async (args) => {
      let campaignId = args.campaignId as string | undefined;
      if (!campaignId && args.campaignName) {
        campaignId = await resolveCampaignId(args.campaignName as string) || undefined;
        if (!campaignId) return { error: `Campaign "${args.campaignName}" not found` };
      }
      if (!campaignId) return { error: 'Either campaignId or campaignName is required' };

      const resolvedIds: string[] = [...((args.personIds as string[]) || [])];
      if (args.personNames) {
        for (const name of args.personNames as string[]) {
          const pid = await resolvePersonId(name);
          resolvedIds.push(pid);
        }
      }

      if (resolvedIds.length === 0) return { error: 'No people specified' };

      const result = await addBulkCampaignMembers(campaignId, resolvedIds);
      return { success: true, ...result };
    },
  },

  // 35. update_campaign_member
  {
    name: 'update_campaign_member',
    description: 'Update a campaign member\'s status, priority, warmth, notes, or next action. Use this to track outreach progress within a campaign.',
    inputSchema: {
      type: 'object',
      properties: {
        campaignId: { type: 'string', description: 'Campaign UUID' },
        campaignName: { type: 'string', description: 'Campaign name (will search for match)' },
        personId: { type: 'string', description: 'Person UUID' },
        personName: { type: 'string', description: 'Person name (will search for match)' },
        status: { type: 'string', enum: ['not_started', 'contacted', 'interested', 'not_interested', 'converted', 'deferred'], description: 'Member status in campaign' },
        warmth: { type: 'number', description: '1-5 interest/warmth score' },
        priority: { type: 'number', description: 'Priority ranking (higher = more important)' },
        notes: { type: 'string', description: 'Notes about this person in the campaign' },
        nextAction: { type: 'string', description: 'What to do next with this person' },
        nextActionAt: { type: 'string', description: 'When to take the next action (ISO date)' },
        lastOutreachAt: { type: 'string', description: 'When last contacted (ISO date)' },
      },
    },
    handler: async (args) => {
      let campaignId = args.campaignId as string | undefined;
      if (!campaignId && args.campaignName) {
        campaignId = await resolveCampaignId(args.campaignName as string) || undefined;
        if (!campaignId) return { error: `Campaign "${args.campaignName}" not found` };
      }
      if (!campaignId) return { error: 'Either campaignId or campaignName is required' };

      let personId = args.personId as string | undefined;
      if (!personId && args.personName) {
        const found = await searchPeople({ query: args.personName as string, limit: 1 });
        if (found.length > 0) personId = found[0].id;
        else return { error: `Person "${args.personName}" not found` };
      }
      if (!personId) return { error: 'Either personId or personName is required' };

      // Find the campaign member record
      const members = await getCampaignMembers(campaignId, {});
      const member = members.find((m: any) => m.personId === personId);
      if (!member) return { error: 'Person is not a member of this campaign' };

      const updateData: Record<string, unknown> = {};
      if (args.status) updateData.status = args.status;
      if (args.warmth != null) updateData.warmth = args.warmth;
      if (args.priority != null) updateData.priority = args.priority;
      if (args.notes) updateData.notes = args.notes;
      if (args.nextAction) updateData.nextAction = args.nextAction;
      if (args.nextActionAt) updateData.nextActionAt = new Date(args.nextActionAt as string);
      if (args.lastOutreachAt) updateData.lastOutreachAt = new Date(args.lastOutreachAt as string);

      const updated = await updateCampaignMember(member.id, updateData);
      return { success: true, member: updated };
    },
  },

  // 36. campaign_report
  {
    name: 'campaign_report',
    description: 'Get a detailed report on a campaign: stats, member breakdown by status, who needs follow-up, and overdue actions.',
    inputSchema: {
      type: 'object',
      properties: {
        campaignId: { type: 'string', description: 'Campaign UUID' },
        campaignName: { type: 'string', description: 'Campaign name (will search for match)' },
      },
    },
    handler: async (args) => {
      let campaignId = args.campaignId as string | undefined;
      if (!campaignId && args.campaignName) {
        campaignId = await resolveCampaignId(args.campaignName as string) || undefined;
        if (!campaignId) return { error: `Campaign "${args.campaignName}" not found` };
      }
      if (!campaignId) return { error: 'Either campaignId or campaignName is required' };

      const campaignWithStats = await getCampaignWithStats(campaignId);
      if (!campaignWithStats) return { error: 'Campaign not found' };

      const members = await getCampaignMembers(campaignId, {});
      const now = new Date();

      const overdue = members.filter((m: any) =>
        m.nextActionAt && new Date(m.nextActionAt) < now
      ).map((m: any) => ({
        personName: m.person?.name || 'Unknown',
        personId: m.personId,
        nextAction: m.nextAction,
        nextActionAt: m.nextActionAt,
        status: m.status,
      }));

      const notStarted = members.filter((m: any) => m.status === 'not_started').map((m: any) => ({
        personName: m.person?.name || 'Unknown',
        personId: m.personId,
        tier: m.person?.tier,
      }));

      const highWarmth = members
        .filter((m: any) => m.warmth != null && m.warmth >= 4 && m.status !== 'converted')
        .map((m: any) => ({
          personName: m.person?.name || 'Unknown',
          personId: m.personId,
          warmth: m.warmth,
          status: m.status,
        }));

      return {
        campaign: {
          name: campaignWithStats.name,
          status: campaignWithStats.status,
          type: campaignWithStats.type,
          goal: campaignWithStats.goal,
        },
        stats: campaignWithStats.stats,
        overdue,
        notStarted: notStarted.slice(0, 20),
        highWarmthUnconverted: highWarmth,
        totalMembers: members.length,
      };
    },
  },
];
