import { updatePerson } from './packages/api/src/services/people.js';

const updates = [
  {
    id: 'c29afac3-0726-42c2-b642-22452aafdcc8',
    name: 'Trinidad Canales Calleja',
    data: {
      title: 'Manager, Business Transformation at Vollardian',
      instagram: 'trinidad_canales',
      tags: ['build-club-sydney', 'inner-circle', 'business-transformation', 'consulting', 'data', 'crm', 'microsoft-dynamics'],
      notes: `Inner circle crew for Build Club Sydney. Manager, Business Transformation at Vollardian (award-winning management consulting firm, #25 Smart50 2022). Vollardian's self-professed data geek — champions digging into clients' data, platforms & processes. Led 30+ projects in Operational Diagnostics and Process Mapping across multiple industries. Specializes in CRM implementation (Microsoft Dynamics 365), data analytics, business development, and strategy. Previously Lab Technician at Envirolab Group (environmental testing labs) before transitioning to consulting. Education: BSc Biotechnology + Banking & Finance / Business & Commerce from UNSW. Authored blog post "Converting CRM critics to champions" on Vollardian site. Facebook: trinidad.calleja.`,
    },
  },
  {
    id: 'c44a18c3-21dd-4603-bfdf-37e2f6d7d163',
    name: 'Edouard D Hakim',
    data: {
      title: 'Regional (APAC) Business Development at One Model',
      tags: ['build-club-sydney', 'inner-circle', 'business-development', 'saas', 'ai', 'workforce-analytics', 'entrepreneur'],
      notes: `Inner circle crew for Build Club Sydney. Regional (APAC) BD at One Model (people analytics platform). Previously BDM at Visier (workforce analytics), UniPhi (project portfolio mgmt), SkyKick (cloud security SaaS — backup, migration, security), Metarouge (sales & marketing advisor for ANZ expansion). Also founded Three Dashes Agency (email marketing automation agency in North Sydney — threedashesagency.com.au) and co-founded MarkSales in Brazil (digital marketing & sales). BSc IT from UTS. International background — attended Hawkeye Community College in Iowa, USA before UTS. Active on LinkedIn posting about AI in HR/Asia (#aiinasia #aiinhr). Tech, AI and SaaS enthusiast.`,
    },
  },
  {
    id: 'fb12ddb6-a1b7-4d1f-9921-32aaa1d4a07a',
    name: 'Jeremy Yee',
    data: {
      title: 'Senior Software Engineer at Qantas',
      tags: ['build-club-sydney', 'inner-circle', 'software-engineering', 'ai', 'rag', 'mechatronics', 'defence'],
      notes: `Inner circle crew for Build Club Sydney. Senior Software Engineer at Qantas. Previously at Defence Australia and freelance. UNSW BE Mechatronics Engineering / Computer Science (AI), 2020-2022. GitHub: jrmyyee (GitHub Pro) — built copilot_layer (VS Code extension creating HTTP REST API bridge to GitHub Copilot). Starred repos show interests in AI/LLM tooling, CNC/robotics, infrastructure. Follows George Hotz and Qantas Cloud Platform on GitHub. Speaker at AI Tinkerers Brisbane Inaugural Meetup (Sep 11 2025) — talk: "Musings on Context: RAG Meets Personalisation" (demo'd context-management patterns for RAG-based personalised chat). Based in Brisbane but connected to Sydney Build Club community.`,
    },
  },
  {
    id: 'cb190acd-6507-46a3-ad3f-36a8dce1a557',
    name: 'Jordan Shen',
    data: {
      title: 'Technology Advisory Consultant at KPMG Australia (reportedly left to co-found agentic advisory venture)',
      tags: ['build-club-sydney', 'inner-circle', 'consulting', 'finance', 'agentic-ai', 'founder', 'student-leadership'],
      notes: `Inner circle crew for Build Club Sydney. Technology Advisory Consultant at KPMG Australia (~3 years) — specializes in tech strategy and digital transformation across government, financial services, and tech sectors. Key projects: enterprise capability modeling for gov water utility, global tech strategy for G8 CTOs, SQL data pipelines and system migrations. Reportedly left KPMG to co-found an agentic advisory venture with Tom Niven. Previously Business Analyst & Intern at Allette Systems. UNSW Business School. Founded UNSW Sandbox Society (student society bridging uni and professional workforce). COO (Investments) at Australian Students Asset Management (student-run non-profit fund). Member of UNSW AIS (Alternative Investment Society). Featured in Earlywork newsletter. Crunchbase: crunchbase.com/person/jordan-shen.`,
    },
  },
  {
    id: 'ca9d4ee5-f5a1-429d-b497-75f533b19a65',
    name: 'Jason Tan',
    data: {
      tags: ['build-club-sydney', 'inner-circle'],
      notes: `Inner circle crew for Build Club Sydney. Based in Greater Sydney Area. LinkedIn handle: jasonjxtan. Minimal public digital footprint outside LinkedIn — no GitHub, Twitter/X, or personal site found under this handle. Not to be confused with Jason Tan (jpctan) who is the Build Club Brisbane City Lead / founder of Engage AI.`,
    },
  },
  {
    id: '5481ad55-9a38-4336-960a-04c8fa6ea96e',
    name: 'Ivara Huang',
    data: {
      title: 'Creative Software Engineer & Co-founder at UniScrap',
      tags: ['build-club-sydney', 'inner-circle', 'software-engineering', 'product', 'startup-founder', 'ai', 'marketplace'],
      notes: `Inner circle crew for Build Club Sydney. Full name: Ivara (Xiyu) Huang. Creative Software Engineer & co-founder at UniScrap (uniscrap.com.au) — a campus-based second-hand marketplace for university students. UniScrap's COO is Robert Fong (also UNSW Founders Startup Mentor, ex-Startmate advisor). UNSW Master of IT (AI focus) — Faculty Prize for Academic Excellence, Dean's List. Previously Product Manager at an AI company in South Korea before moving to Australia. Involved with UNSW Founders ecosystem (volunteered at UNSW Global Launchpads Summit). 500+ LinkedIn connections.`,
    },
  },
  {
    id: 'd0ba0068-c35d-4ac2-a7fa-07cc23edce33',
    name: 'Lily Lin',
    data: {
      tags: ['build-club-sydney', 'inner-circle'],
      notes: `Inner circle crew for Build Club Sydney. LinkedIn handle: thelilylin. Very minimal public digital footprint. Threads account @thelilylin exists and appears active. Instagram likely @thelilylin (same Meta handle namespace). No GitHub, Twitter/X, personal site, or public articles found. LinkedIn profile exists but not indexed by search engines.`,
    },
  },
];

async function main() {
  for (const entry of updates) {
    const result = await updatePerson(entry.id, entry.data);
    if (result) {
      console.log(`Updated ${entry.name} → Title: ${result.title || '(none)'} | Tags: ${JSON.stringify(result.tags)}`);
    } else {
      console.error(`FAILED: ${entry.name}`);
    }
  }
  process.exit(0);
}

main();
