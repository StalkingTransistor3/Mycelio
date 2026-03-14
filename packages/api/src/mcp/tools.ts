import { z } from 'zod';
import { searchPeople, getPersonById, createPerson, updatePerson } from '../services/people.js';
import { logInteraction, getInteractionsByPerson } from '../services/interactions.js';
import { createEvent, getEvents } from '../services/events.js';
import { getCommunityHealth, getCommunities } from '../services/communities.js';
import { createOrganization } from '../services/organizations.js';
import { findConnectionPath, createConnection, getGraphData } from '../services/connections.js';
import { getFollowUps } from '../services/follow-ups.js';

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
    description: 'Log a new interaction with a person. Creates the person if they don\'t exist (by name match). Updates lastContactAt automatically.',
    inputSchema: {
      type: 'object',
      properties: {
        personName: { type: 'string', description: 'Name of the person' },
        personId: { type: 'string', description: 'UUID of the person (if known)' },
        type: { type: 'string', enum: ['meeting', 'email', 'call', 'social', 'event', 'intro', 'follow_up', 'other'], description: 'Type of interaction' },
        summary: { type: 'string', description: 'Brief summary of the interaction' },
        details: { type: 'string', description: 'Detailed notes (optional)' },
        occurredAt: { type: 'string', description: 'ISO date string when interaction occurred (defaults to now)' },
      },
      required: ['type', 'summary'],
    },
    handler: async (args) => {
      let personId = args.personId as string | undefined;

      // If no personId but personName, find or create the person
      if (!personId && args.personName) {
        const existing = await searchPeople({ query: args.personName as string, limit: 1 });
        if (existing.length > 0) {
          personId = existing[0].id;
        } else {
          const newPerson = await createPerson({ name: args.personName as string });
          personId = newPerson.id;
        }
      }

      if (!personId) {
        return { error: 'Either personId or personName is required' };
      }

      const interaction = await logInteraction({
        personId,
        type: args.type as string,
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
      return { person, recentInteractions: interactions };
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
          attendees.push({
            person,
            recentInteractions,
          });
        }
      }

      return {
        event,
        attendees,
        totalAttendees: attendees.length,
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
    description: 'Create a new event with attendees.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Event name' },
        date: { type: 'string', description: 'ISO date string' },
        location: { type: 'string', description: 'Event location' },
        description: { type: 'string', description: 'Event description' },
        attendeeIds: { type: 'array', items: { type: 'string' }, description: 'Array of person UUIDs' },
        tags: { type: 'array', items: { type: 'string' }, description: 'Event tags' },
      },
      required: ['name', 'date'],
    },
    handler: async (args) => {
      const event = await createEvent({
        name: args.name as string,
        date: new Date(args.date as string),
        location: args.location as string | undefined,
        description: args.description as string | undefined,
        attendeeIds: args.attendeeIds as string[] | undefined,
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
      let communityId = args.communityId as string | undefined;

      if (!communityId && args.communityName) {
        const allCommunities = await getCommunities();
        const match = allCommunities.find((c) =>
          c.name.toLowerCase().includes((args.communityName as string).toLowerCase())
        );
        if (match) communityId = match.id;
        else return { error: `Community "${args.communityName}" not found` };
      }

      if (!communityId) return { error: 'communityId or communityName is required' };

      const health = await getCommunityHealth(communityId);
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
        domain: { type: 'string', description: 'Website domain' },
        industry: { type: 'string', description: 'Industry sector' },
        notes: { type: 'string', description: 'Additional notes' },
      },
      required: ['name'],
    },
    handler: async (args) => {
      const org = await createOrganization({
        name: args.name as string,
        domain: args.domain as string | undefined,
        industry: args.industry as string | undefined,
        notes: args.notes as string | undefined,
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
    description: 'Get the list of people who need follow-up, sorted by urgency. Shows overdue contacts based on relationship tier thresholds.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Max results (default all)' },
      },
    },
    handler: async (args) => {
      const followUps = await getFollowUps();
      const limit = args.limit as number | undefined;
      const data = limit ? followUps.slice(0, limit) : followUps;
      return { followUps: data, total: data.length };
    },
  },
];
