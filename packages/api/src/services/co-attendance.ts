import { db, schema } from '../db/index.js';

const { events } = schema;

export async function computeCoAttendance(personId: string) {
  const allEvents = await db.select().from(events);

  // Find events this person attended
  const personEvents = allEvents.filter(e =>
    (e.attendeeIds as string[]).includes(personId)
  );

  // Count co-attendance with other people
  const coAttendanceMap = new Map<string, { count: number; events: string[] }>();

  for (const event of personEvents) {
    const attendees = event.attendeeIds as string[];
    for (const aid of attendees) {
      if (aid === personId) continue;
      const existing = coAttendanceMap.get(aid) || { count: 0, events: [] };
      existing.count++;
      existing.events.push(event.id);
      coAttendanceMap.set(aid, existing);
    }
  }

  // Sort by co-attendance count descending
  return Array.from(coAttendanceMap.entries())
    .map(([pid, data]) => ({
      personId: pid,
      sharedEventCount: data.count,
      sharedEventIds: data.events,
    }))
    .sort((a, b) => b.sharedEventCount - a.sharedEventCount);
}

export async function getCoAttendancePairs(minShared = 2) {
  const allEvents = await db.select().from(events);

  // Build attendance map: person -> set of event IDs
  const attendanceMap = new Map<string, Set<string>>();
  for (const event of allEvents) {
    const attendees = event.attendeeIds as string[];
    for (const aid of attendees) {
      const set = attendanceMap.get(aid) || new Set();
      set.add(event.id);
      attendanceMap.set(aid, set);
    }
  }

  // Find all pairs with minShared overlap
  const people = Array.from(attendanceMap.keys());
  const pairs: Array<{
    personA: string;
    personB: string;
    sharedEventCount: number;
  }> = [];

  for (let i = 0; i < people.length; i++) {
    for (let j = i + 1; j < people.length; j++) {
      const setA = attendanceMap.get(people[i])!;
      const setB = attendanceMap.get(people[j])!;
      const overlap = [...setA].filter(e => setB.has(e)).length;
      if (overlap >= minShared) {
        pairs.push({
          personA: people[i],
          personB: people[j],
          sharedEventCount: overlap,
        });
      }
    }
  }

  return pairs.sort((a, b) => b.sharedEventCount - a.sharedEventCount);
}
