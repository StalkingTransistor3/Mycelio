// Batch log interactions from transcript: Relevance AI x OpenAI Codex Event
// Date: 2026-03-18

import { searchPeople, createPerson } from '../packages/api/src/services/people.js';
import { logInteraction } from '../packages/api/src/services/interactions.js';
import { createEvent, getEvents } from '../packages/api/src/services/events.js';
import { createOrganization, getOrganizationByName } from '../packages/api/src/services/organizations.js';

async function resolvePersonId(name: string): Promise<string> {
  const existing = await searchPeople({ query: name, limit: 1 });
  if (existing.length > 0) return existing[0].id;
  const newPerson = await createPerson({ name });
  console.log(`  Created person: ${name} (${newPerson.id})`);
  return newPerson.id;
}

async function resolveOrgId(name: string, opts?: { type?: string; domain?: string; description?: string }): Promise<string> {
  const existing = await getOrganizationByName(name);
  if (existing) return existing.id;
  const newOrg = await createOrganization({ name, ...opts });
  console.log(`  Created org: ${name} (${newOrg.id})`);
  return newOrg.id;
}

async function resolveEventId(name: string): Promise<string | null> {
  const allEvents = await getEvents(500);
  const match = allEvents.find(e => e.name.toLowerCase().includes(name.toLowerCase()));
  return match?.id || null;
}

async function main() {
  const date = '2026-03-18';

  // Create the event
  let eventId = await resolveEventId('Relevance AI x OpenAI Codex');
  if (!eventId) {
    const event = await createEvent({
      name: 'Relevance AI x OpenAI Codex Workshop',
      date: new Date(`${date}T15:00:00+11:00`),
      location: 'Relevance AI Office, Surry Hills, Sydney',
      description: 'Joint Relevance AI x OpenAI event. Last or second-last event at current office before move. Featured OpenAI voice API demo (GPT RTR 1.5, voice cloning), Codex sub-agents, and Relevance MCP + Codex integration demo (Instagram scraper, GTM outreach agent). ~50-60 attendees. Q&A panel on orchestration, enterprise adoption, testing agents.',
      tags: ['relevance-ai', 'openai', 'codex', 'workshop', 'demo', 'mcp', 'voice-api'],
    });
    eventId = event.id;
    console.log(`Created event: ${event.name} (${eventId})`);
  }

  // Ensure orgs exist
  await resolveOrgId('H2O.ai', { type: 'company', domain: 'h2o.ai', description: 'AI/ML platform company. Interested in joint meetups with Relevance AI.' });

  const interactions = [
    // 1. Varun - OpenAI demos
    {
      personName: 'Varun',
      type: 'event' as const,
      summary: 'Varun from OpenAI demoed real-time voice API (GPT RTR 1.5) at Relevance AI x OpenAI event. Showed voice cloning with 15-second sample, medical appointment booking with function calling. Discussed Codex sub-agents feature. Coordinated run sheet with Andrew pre-event.',
      sentiment: 'positive' as const,
      energy: 4,
      details: 'Pre-event planning: Varun doing voice piece first, then Codex, then Michael (Relevance) demos MCP integration. Discussed plugins not being released yet. Voice API is a gated feature requiring application. Showed GPT RTR CoRec Spark model optimized for high token throughput.',
      occurredAt: `${date}T15:00:00+11:00`,
    },
    // 2. Michael - Relevance demos
    {
      personName: 'Michael',
      type: 'event' as const,
      summary: 'Michael from Relevance AI demoed building agents with Codex + Relevance MCP. Live-built Instagram scraper agent and signal-based GTM outreach agent (LinkedIn comment scraping → ICP scoring → lead magnet). Gave Ralph Steen belt buckles as participation prizes. "Nothing Michael did was officially endorsed by Relevance AI." Andrew assisted with event logistics.',
      sentiment: 'positive' as const,
      energy: 4,
      details: 'Michael demoed: Instagram scraper, GTM outreach pipeline, federal government RFP scraper (audience request). Explained Relevance as iPaaS consolidating Replicate, EpiPhi etc. Showed collaboration features, multi-agent orchestration. Discussed Relevance CLI released that morning.',
      occurredAt: `${date}T15:45:00+11:00`,
    },
    // 3. Neil and Weiran - met at event
    {
      personName: 'Neil',
      type: 'event' as const,
      summary: 'Met Neil at Relevance AI x OpenAI event. Neil\'s voice was used for OpenAI voice cloning demo. Background in computer science. Andrew explained his AI operations role and offered to connect Neil with Relevance solution engineers.',
      sentiment: 'positive' as const,
      energy: 3,
      occurredAt: `${date}T16:30:00+11:00`,
    },
    {
      personName: 'Weiran',
      type: 'event' as const,
      summary: 'Met Weiran at Relevance AI x OpenAI event. Background in computer science. Brief chat after demos.',
      sentiment: 'neutral' as const,
      energy: 2,
      occurredAt: `${date}T16:30:00+11:00`,
    },
    // 4. Chris from H2O - partnership
    {
      personName: 'Chris',
      type: 'event' as const,
      summary: 'Met Chris from H2O.ai at Relevance event. H2O wants to do joint meetups/events with Relevance AI. They are looking for partners for co-hosted events/showcases. Andrew connected them, sent LinkedIn message. Discussed social marketing from company handles. Past similar meetups done with Vercel.',
      sentiment: 'positive' as const,
      energy: 4,
      details: 'HIGH VALUE PARTNERSHIP LEAD. H2O.ai exploring Relevance for their go-to-market. Want event-style showcase meetups. Andrew offered to introduce to local Relevance contacts. Follow up: LinkedIn message sent, schedule further chat.',
      occurredAt: `${date}T17:00:00+11:00`,
    },
    // 5. Chris Fong - contact exchange
    {
      personName: 'Chris Fong',
      type: 'event' as const,
      summary: 'Met Chris Fong at Relevance AI event. Usually in Singapore or US, grew up in Australia. Got banned from LinkedIn for spamming too many people. Exchanged WhatsApp numbers (has US and Singapore numbers). Brief but warm interaction.',
      sentiment: 'positive' as const,
      energy: 3,
      details: 'Exchanged contact info. Chris prefers Telegram, LinkedIn, or X. Andrew gave WhatsApp. Chris has international presence - good for ecosystem connections.',
      occurredAt: `${date}T17:30:00+11:00`,
    },
    // 6. Zoe - coffee vendor logistics
    {
      personName: 'Zoe',
      type: 'event' as const,
      summary: 'Coordinated with Zoe the coffee vendor at Relevance AI event. Served 25-30 coffees. Discussed quantities for future events (80 for 100 people). Learned 3pm timing means fewer coffee drinkers. Good logistics intel for future events.',
      sentiment: 'positive' as const,
      energy: 2,
      occurredAt: `${date}T17:15:00+11:00`,
    },
    // 7. Ish - post-event debrief
    {
      personName: 'Ish',
      type: 'meeting' as const,
      summary: 'Post-event debrief with Ish (Relevance sales/marketing). Discussed event timing (3pm awkward), people needed more mingling time. Half hour wasn\'t enough pre-event. Clarified go-to-market vs sales distinction. Ish leaving for the day.',
      sentiment: 'positive' as const,
      energy: 3,
      occurredAt: `${date}T17:20:00+11:00`,
    },
    // 8. Unknown person - company history chat + mailing list
    {
      personName: 'Visitor (OpenAI Event)',
      type: 'event' as const,
      summary: 'Met attendee who hadn\'t heard of Relevance AI before. Explained company history (used to be vector search, pivoted to AI agent platform). Person compared Relevance to n8n but noted drag-and-drop advantage. Signed them up for events mailing list. Mentioned upcoming Anthropic paper reading event on March 31st with YOP from Anthropic.',
      sentiment: 'positive' as const,
      energy: 3,
      details: 'Person found Relevance interesting vs n8n because of drag-and-drop tool connections. Andrew also mentioned their moat is "knowing people, making relationships." Person is an engineer who also likes being with people.',
      occurredAt: `${date}T17:45:00+11:00`,
    },
    // 9. Guiguang - orchestration question
    {
      personName: 'Guiguang',
      type: 'event' as const,
      summary: 'Guiguang asked about multi-agent orchestration during Q&A at Relevance x OpenAI event. Asked whether Relevance uses Symphony or rolled their own. Discussion about orchestration evolution since mid-2023, harnesses, skills.',
      sentiment: 'neutral' as const,
      energy: 3,
      occurredAt: `${date}T16:15:00+11:00`,
    },
    // 10. Community/board game person - post-event
    {
      personName: 'Visitor (Board Game Chat)',
      type: 'event' as const,
      summary: 'Extended post-event chat about community building, board game nights, dinner traditions. Andrew shared: Build Club dinner tradition (co-working → dinner), Japanese restaurant in Haymarket for future events, Thai restaurants as cheaper option. Discussion about energy management, getting fulfillment from feeding community needs. Person asked how Andrew manages energy with events on top of day job.',
      sentiment: 'positive' as const,
      energy: 4,
      details: 'Andrew mentioned: AI poker night concept, Anthropic paper reading event, poke night. Build Club ambassador program for Relevance (free tokens for community leaders). Discussed philosophy: "Just developing relationships, not transactional. You become good friends, business can come later."',
      occurredAt: `${date}T18:00:00+11:00`,
    },
  ];

  for (const interaction of interactions) {
    try {
      const personId = await resolvePersonId(interaction.personName);
      const result = await logInteraction({
        personId,
        type: interaction.type,
        summary: interaction.summary,
        sentiment: interaction.sentiment,
        energy: interaction.energy,
        details: interaction.details || undefined,
        occurredAt: new Date(interaction.occurredAt),
        eventId: eventId || undefined,
      });
      console.log(`Logged: ${interaction.personName} (${interaction.type}) -> ${result.id}`);
    } catch (err: any) {
      console.error(`FAILED: ${interaction.personName} - ${err.message}`);
    }
  }

  console.log('\nDone. Logged all interactions from 2026-03-18 transcript.');
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
