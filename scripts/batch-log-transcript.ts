// Batch log interactions from transcript: NextGen Founders Hack Pre-Launch Event
// Date: 2026-03-17

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
  const date = '2026-03-17';

  // Create the event first
  let eventId = await resolveEventId('NextGen Founders Hack Pre-Launch');
  if (!eventId) {
    const event = await createEvent({
      name: 'NextGen Founders Hack Pre-Launch AMA',
      date: new Date(`${date}T18:00:00+11:00`),
      location: 'AirTree Ventures, Sydney',
      description: 'Pre-launch event for NextGen Ventures biannual Founders Hack hackathon. Featured AMA with Simon (Alloy, YC S23) and Penny (A1Base, YC W25). Arafat presented OpenAI Codex partnership. Networking with students, founders, and investors.',
      tags: ['nextgen', 'founders-hack', 'ama', 'networking', 'hackathon'],
    });
    eventId = event.id;
    console.log(`Created event: ${event.name} (${eventId})`);
  }

  // Ensure orgs exist
  await resolveOrgId('Alloy', { type: 'company', domain: 'alloy.dev', description: 'Cloud playground for collaborative product building. Founded by Simon and Christian. YC S23, raised from Blackbird and Bain Capital.' });
  await resolveOrgId('A1Base', { type: 'company', domain: 'a1base.com', description: 'AI infrastructure communication platform for AI agents. Founded by Penny and Pasha (ex-Origin co-founder). YC W25.' });
  await resolveOrgId('NextGen Ventures', { type: 'community', domain: 'nextgenventures.co', description: 'Student-run VC firm normalizing investing among students. ~75 alumni, 15-20 active. Raised $400K fund. Runs Founders Hack biannual hackathon.' });
  await resolveOrgId('OpenAI', { type: 'company', domain: 'openai.com', description: 'AI research lab' });
  await resolveOrgId('AirTree Ventures', { type: 'company', domain: 'airtree.vc', description: 'Australian VC firm. Hosts events for student ecosystem. Pathfinder program (5 weeks, 570 applications for 25-30 cohort). Folklore is their related entity.' });
  await resolveOrgId('Forage', { type: 'company', domain: 'theforage.com', description: 'Virtual work experience platform. Served 10M+ users, 500+ Fortune 500 companies. Exited ~2024.' });

  const interactions = [
    // 1. Natasha - venue call
    {
      personName: 'Natasha',
      type: 'call' as const,
      summary: 'Called Natasha about viewing the new Relevance AI office space. Arranged meeting for Friday at 2pm, Level 13. She runs photo shoots in the morning. Todd (her colleague) might meet Andrew instead. She will call back to confirm.',
      sentiment: 'positive' as const,
      energy: 3,
      details: 'Venue/space related call. Andrew emailed her previously. Space not yet moved into. Meeting to look around.',
      occurredAt: `${date}T09:00:00+11:00`,
    },
    // 2. Annie - deep career call
    {
      personName: 'Annie',
      type: 'call' as const,
      summary: 'Deep call with Annie about growing frustration with Relevance AI direction. Discussed: pricing change ($0 free tier → $350/mo, no middle ground), events gatekeeping (kicked Build Club people from OpenAI event then had to reinvite), PLG support drying up. Andrew outlined 6-month plan: push for better pricing + community, get promotion, or leave. Also discussed potential move to SF for community building, Build Club nonprofit strategy.',
      sentiment: 'neutral' as const,
      energy: 3,
      details: 'Key topics: Relevance pricing frustration, Dadvas driving unicorn push from SF, Chelsea AI Ops bootcamp struggling, marketplace not gaining traction. Andrew considering coffee chats with external people. Annie advised on SF connections. Andrew signed off warmly. Also briefly discussed romantic prospect updates.',
      occurredAt: `${date}T11:00:00+11:00`,
    },
    // 3. Chelsea - office bootcamp chat
    {
      personName: 'Chelsea',
      type: 'meeting' as const,
      summary: 'Brief office chat about AI Ops bootcamp progress. Chelsea going hard on outbounds this week and next. Can run bootcamp in 4-6 weeks. Testing signup approach first, will pivot if needed. Experimenting with MCP setup for outreach.',
      sentiment: 'positive' as const,
      energy: 3,
      details: 'Chelsea has 30 emails going out. Planning to oversubscribe slightly for drop-offs. Wants to spend main time on content development. Using MCP for setup.',
      occurredAt: `${date}T14:30:00+11:00`,
    },
    // 4. Palm - event meetup
    {
      personName: 'Palm',
      type: 'event' as const,
      summary: 'Met Palm at NextGen Founders Hack pre-launch event. Student. Andrew explained he is mentoring for the hackathon and does AI operations at Relevance AI (~100 people). Palm asked if Andrew was CEO/CTO, Andrew said employee #20.',
      sentiment: 'positive' as const,
      energy: 3,
      eventId,
      occurredAt: `${date}T18:30:00+11:00`,
    },
    // 5. Simon - event speaker/networking
    {
      personName: 'Simon',
      type: 'event' as const,
      summary: 'Attended AMA talk by Simon, co-founder of Alloy. Ex-Atlassian PM (4-5 years), co-founder Christian was at Canva. YC S23, raised seed from Blackbird and Bain Capital, plus pre-Series A recently. Alloy is a cloud playground for collaborative product building. Spoke about SF culture, YC experience, founder journey. Brief chat after - pizza, positive energy.',
      sentiment: 'positive' as const,
      energy: 4,
      eventId,
      details: 'Key insights from Simon: "People in SF are not better than you." Intuition → framework → intuition sandwich for idea validation. Started building websites for local businesses. Co-founder initially refused then was convinced. Product pivoted once or twice. Space moving so fast they reinvent product every few weeks.',
      occurredAt: `${date}T19:00:00+11:00`,
    },
    // 6. Penny - event speaker/networking
    {
      personName: 'Penny',
      type: 'event' as const,
      summary: 'Attended AMA talk by Penny, co-founder of A1Base. Previously built Forage for 8 years (10M+ users, 500+ Fortune 500 companies, exited ~2024). Co-founder Pasha was co-founder of Origin. YC W25 batch. Got into first tech job by building a hydroponic system for cherry tomatoes. Spoke about founder health/burnout, Australian talent being underestimated.',
      sentiment: 'positive' as const,
      energy: 4,
      eventId,
      details: 'Key insights from Penny: compound learnings by sticking with problems. Batch average age 23-24 in W25. Shared burnout story - lost 10kg, making bad decisions on 3hr sleep blocks. Credentials for YC can be unconventional (top Cod player, Fallout 4 speedrun world record). "YC is like being the hot girl at a college party" for fundraising.',
      occurredAt: `${date}T19:00:00+11:00`,
    },
    // 7. Caitlin - AirTree/Folklore
    {
      personName: 'Caitlin',
      type: 'event' as const,
      summary: 'Introduced self to Caitlin, programs and community person at AirTree/Folklore. Pitched Build Club Sydney collaboration. She was enthusiastic - "You found the right person." Exchanged LinkedIn. Discussed Build Club upcoming events (co-working at Araya, hackathon with Holcim Ventures and Build Club x Vercel x UNSW Founders). She shared AirTree Pathfinder program (5 weeks, 570 applications for 25-30 spots). Discussed potential venue rotation partnership.',
      sentiment: 'positive' as const,
      energy: 5,
      eventId,
      details: 'HIGH VALUE CONNECTION. Caitlin interested in: Build Club venue rotation, student hackathon partnership (Folklore might join Build Club x Vercel x UNSW Founders hackathon), connecting ecosystems. AirTree doing a lot with student investment. They invest in NextGen fund. She said "the city is hungry" re: student appetite. Follow up: email exchange, plan concrete collaboration. She also hosted the event space tonight.',
      occurredAt: `${date}T20:30:00+11:00`,
    },
    // 8. Jerry - NextGen Ventures
    {
      personName: 'Jerry',
      type: 'event' as const,
      summary: 'Chat with Jerry (JRRY), co-founder of NextGen Ventures. Confirmed Founders Hack mentoring details: Saturday, 3x20-minute sessions via Google Meet. Teams assigned beforehand. Opening event Friday (Andrew cannot attend - hosting Relevance office party). Pitch night following Thursday (Andrew can attend). Connected on LinkedIn.',
      sentiment: 'positive' as const,
      energy: 3,
      eventId,
      details: 'Jerry co-founded NextGen ~3 years ago. Organization has had ~75 students come through, 15-20 active at any time. Partnered with OpenAI Codex for hackathon. Jerry introduced speakers and managed event flow.',
      occurredAt: `${date}T21:00:00+11:00`,
    },
    // 9. Dan - NextGen Ventures
    {
      personName: 'Dan',
      type: 'event' as const,
      summary: 'Met Dan from NextGen Ventures. Discussed NextGen origin story: started 3 years ago to normalize investing among students. Dan\'s background in crypto - "everyone young and hungry." Raised $400K fund. Discussed how they identify and engage active members. Andrew pitched Build Club collaboration and university society partnerships. Dan receptive but noted societies have a lot of politics.',
      sentiment: 'positive' as const,
      energy: 4,
      eventId,
      details: 'Dan mentioned they work with different incubators and startup orgs within unis but not societies themselves. Suggested a different approach. Also discussed Relevance AI culture shift and hiring trends - no longer hiring juniors. Andrew is 5th-6th youngest at Relevance. Dan interested in Build Club × NextGen hackathon collab.',
      occurredAt: `${date}T20:00:00+11:00`,
    },
    // 10. Arafat - OpenAI Codex
    {
      personName: 'Arafat',
      type: 'event' as const,
      summary: 'Attended presentation by Arafat, OpenAI Codex Ambassador. Announced free Codex access for all Founders Hack participants. Ran Mentimeter survey on coding assistants (cursor most popular). Explained Codex native apps available for Windows, Mac, CLI.',
      sentiment: 'neutral' as const,
      energy: 3,
      eventId,
      occurredAt: `${date}T19:45:00+11:00`,
    },
    // 11. Manasa
    {
      personName: 'Manasa',
      type: 'event' as const,
      summary: 'Brief goodbye at end of NextGen event. Exchanged names (M-A-N-A-S-A). Andrew thanked for intros.',
      sentiment: 'positive' as const,
      energy: 2,
      eventId,
      occurredAt: `${date}T21:30:00+11:00`,
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
        eventId: interaction.eventId || undefined,
      });
      console.log(`Logged: ${interaction.personName} (${interaction.type}) -> ${result.id}`);
    } catch (err: any) {
      console.error(`FAILED: ${interaction.personName} - ${err.message}`);
    }
  }

  console.log('\nDone. Logged all interactions from transcript.');
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
