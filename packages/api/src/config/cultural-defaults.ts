/**
 * Cultural Defaults Configuration
 *
 * Default cultural proclivities by country/region of upbringing.
 * These are starting points, not deterministic — always override with observed behaviour.
 * Based on Hofstede's dimensions, Erin Meyer's Culture Map, and Hall's context theory.
 *
 * Usage: When a person's raisedIn field is set, auto-populate their culturalProfile
 * with these defaults. Individual observations should override defaults over time.
 */

export interface CulturalDefaults {
  communication: {
    directness: number; // 1-10, 1=very indirect, 10=very direct
    contextLevel: 'high-context' | 'medium-context' | 'low-context';
    feedbackStyle: 'blunt' | 'diplomatic' | 'indirect' | 'avoidant';
    conflictStyle: 'confrontational' | 'diplomatic' | 'avoidant' | 'passive-aggressive';
    formalityDefault: 'formal' | 'semi-formal' | 'casual';
    silenceMeaning: 'thinking' | 'disagreement' | 'respect' | 'discomfort';
  };
  trust: {
    trustBasis: 'institutional' | 'personal' | 'mixed';
    corruptionRisk: 'low' | 'moderate' | 'high';
    verificationNeeded: 'low' | 'moderate' | 'high';
    loyaltyPattern: 'transactional' | 'reciprocal' | 'devotional';
  };
  social: {
    hierarchyExpectation: 'flat' | 'moderate' | 'steep';
    decisionMaking: 'individual' | 'consensus' | 'top-down';
    timeOrientation: 'strict' | 'flexible' | 'very-flexible';
    relationshipBuilding: 'fast' | 'moderate' | 'slow';
    taskVsRelationship: 'task-first' | 'balanced' | 'relationship-first';
  };
  business: {
    negotiationStyle: 'collaborative' | 'competitive' | 'relationship-based' | 'adversarial';
    contractWeight: 'binding' | 'starting-point' | 'flexible';
    meetingStyle: 'agenda-driven' | 'organic' | 'relationship-first';
    alcoholInBusiness: 'none' | 'optional' | 'expected' | 'central';
    giftGiving: 'unnecessary' | 'appreciated' | 'expected' | 'ritualistic';
  };
  notes: string; // Key things to know
}

export const CULTURAL_DEFAULTS: Record<string, CulturalDefaults> = {
  // ── APAC ──

  'australia': {
    communication: {
      directness: 8,
      contextLevel: 'low-context',
      feedbackStyle: 'blunt',
      conflictStyle: 'confrontational',
      formalityDefault: 'casual',
      silenceMeaning: 'thinking',
    },
    trust: {
      trustBasis: 'institutional',
      corruptionRisk: 'low',
      verificationNeeded: 'low',
      loyaltyPattern: 'transactional',
    },
    social: {
      hierarchyExpectation: 'flat',
      decisionMaking: 'individual',
      timeOrientation: 'flexible',
      relationshipBuilding: 'fast',
      taskVsRelationship: 'task-first',
    },
    business: {
      negotiationStyle: 'collaborative',
      contractWeight: 'binding',
      meetingStyle: 'agenda-driven',
      alcoholInBusiness: 'expected',
      giftGiving: 'unnecessary',
    },
    notes: 'Tall poppy syndrome — don\'t brag. Sarcasm is affection. Pub is the real office. "No worries" can mean anything.',
  },

  'japan': {
    communication: {
      directness: 2,
      contextLevel: 'high-context',
      feedbackStyle: 'indirect',
      conflictStyle: 'avoidant',
      formalityDefault: 'formal',
      silenceMeaning: 'thinking',
    },
    trust: {
      trustBasis: 'institutional',
      corruptionRisk: 'low',
      verificationNeeded: 'low',
      loyaltyPattern: 'reciprocal',
    },
    social: {
      hierarchyExpectation: 'steep',
      decisionMaking: 'consensus',
      timeOrientation: 'strict',
      relationshipBuilding: 'slow',
      taskVsRelationship: 'relationship-first',
    },
    business: {
      negotiationStyle: 'relationship-based',
      contractWeight: 'binding',
      meetingStyle: 'relationship-first',
      alcoholInBusiness: 'central',
      giftGiving: 'ritualistic',
    },
    notes: 'Nemawashi (pre-alignment) means decisions happen before meetings. "Difficult" = no. "We\'ll consider" = no. Tatemae (public face) vs honne (real feelings). Izakaya sessions are where real talk happens.',
  },

  'south-korea': {
    communication: {
      directness: 4,
      contextLevel: 'high-context',
      feedbackStyle: 'indirect',
      conflictStyle: 'avoidant',
      formalityDefault: 'formal',
      silenceMeaning: 'respect',
    },
    trust: {
      trustBasis: 'mixed',
      corruptionRisk: 'moderate',
      verificationNeeded: 'moderate',
      loyaltyPattern: 'reciprocal',
    },
    social: {
      hierarchyExpectation: 'steep',
      decisionMaking: 'top-down',
      timeOrientation: 'strict',
      relationshipBuilding: 'moderate',
      taskVsRelationship: 'balanced',
    },
    business: {
      negotiationStyle: 'competitive',
      contractWeight: 'binding',
      meetingStyle: 'agenda-driven',
      alcoholInBusiness: 'central',
      giftGiving: 'expected',
    },
    notes: 'Age determines social dynamics — will be asked early. Nunchi (reading the room) is the most valued skill. Soju sessions build trust. Noraebang (karaoke) is a business tool. Fast execution once decided.',
  },

  'china': {
    communication: {
      directness: 3,
      contextLevel: 'high-context',
      feedbackStyle: 'indirect',
      conflictStyle: 'avoidant',
      formalityDefault: 'formal',
      silenceMeaning: 'disagreement',
    },
    trust: {
      trustBasis: 'personal',
      corruptionRisk: 'high',
      verificationNeeded: 'high',
      loyaltyPattern: 'reciprocal',
    },
    social: {
      hierarchyExpectation: 'steep',
      decisionMaking: 'top-down',
      timeOrientation: 'flexible',
      relationshipBuilding: 'slow',
      taskVsRelationship: 'relationship-first',
    },
    business: {
      negotiationStyle: 'relationship-based',
      contractWeight: 'starting-point',
      meetingStyle: 'relationship-first',
      alcoholInBusiness: 'expected',
      giftGiving: 'expected',
    },
    notes: 'Guanxi (relationship network) is the currency. Face (mianzi) is everything — never embarrass publicly. Contracts are starting points, not final words. Banquet dinners are business. WeChat or you don\'t exist. IP protection is non-negotiable.',
  },

  'india': {
    communication: {
      directness: 5,
      contextLevel: 'medium-context',
      feedbackStyle: 'diplomatic',
      conflictStyle: 'diplomatic',
      formalityDefault: 'semi-formal',
      silenceMeaning: 'thinking',
    },
    trust: {
      trustBasis: 'mixed',
      corruptionRisk: 'high',
      verificationNeeded: 'high',
      loyaltyPattern: 'reciprocal',
    },
    social: {
      hierarchyExpectation: 'steep',
      decisionMaking: 'top-down',
      timeOrientation: 'very-flexible',
      relationshipBuilding: 'moderate',
      taskVsRelationship: 'balanced',
    },
    business: {
      negotiationStyle: 'competitive',
      contractWeight: 'binding',
      meetingStyle: 'organic',
      alcoholInBusiness: 'optional',
      giftGiving: 'appreciated',
    },
    notes: '"Yes" often means "I heard you." Head wobble is context-dependent. Overpromising is cultural — verify timelines independently. Jugaad (creative improvisation) is a strength. Asking about family is expected. Cricket is the universal icebreaker.',
  },

  'indonesia': {
    communication: {
      directness: 2,
      contextLevel: 'high-context',
      feedbackStyle: 'indirect',
      conflictStyle: 'avoidant',
      formalityDefault: 'semi-formal',
      silenceMeaning: 'respect',
    },
    trust: {
      trustBasis: 'personal',
      corruptionRisk: 'high',
      verificationNeeded: 'high',
      loyaltyPattern: 'reciprocal',
    },
    social: {
      hierarchyExpectation: 'moderate',
      decisionMaking: 'consensus',
      timeOrientation: 'very-flexible',
      relationshipBuilding: 'slow',
      taskVsRelationship: 'relationship-first',
    },
    business: {
      negotiationStyle: 'relationship-based',
      contractWeight: 'flexible',
      meetingStyle: 'relationship-first',
      alcoholInBusiness: 'none',
      giftGiving: 'appreciated',
    },
    notes: 'Musyawarah (consensus through discussion). Javanese halus (refinement) vs kasar (coarseness) — directness reads as kasar. Muslim majority — respect prayer times, Ramadan, halal. Bali is Hindu. Smiling doesn\'t mean agreement. Bureaucracy is heavy.',
  },

  'philippines': {
    communication: {
      directness: 3,
      contextLevel: 'high-context',
      feedbackStyle: 'avoidant',
      conflictStyle: 'avoidant',
      formalityDefault: 'semi-formal',
      silenceMeaning: 'discomfort',
    },
    trust: {
      trustBasis: 'personal',
      corruptionRisk: 'high',
      verificationNeeded: 'moderate',
      loyaltyPattern: 'devotional',
    },
    social: {
      hierarchyExpectation: 'steep',
      decisionMaking: 'top-down',
      timeOrientation: 'flexible',
      relationshipBuilding: 'fast',
      taskVsRelationship: 'relationship-first',
    },
    business: {
      negotiationStyle: 'relationship-based',
      contractWeight: 'flexible',
      meetingStyle: 'relationship-first',
      alcoholInBusiness: 'optional',
      giftGiving: 'appreciated',
    },
    notes: 'PDI 94 — highest in world. Hiya (shame) prevents admitting confusion. Utang na loob (debt of inner self) creates deep loyalty bonds. Pakikisama (smooth relations) prioritized over task completion. "Yes" may mean "I heard you." Verify understanding, not just agreement. Catholic majority. Family is everything.',
  },

  'thailand': {
    communication: {
      directness: 2,
      contextLevel: 'high-context',
      feedbackStyle: 'indirect',
      conflictStyle: 'avoidant',
      formalityDefault: 'formal',
      silenceMeaning: 'respect',
    },
    trust: {
      trustBasis: 'personal',
      corruptionRisk: 'high',
      verificationNeeded: 'moderate',
      loyaltyPattern: 'reciprocal',
    },
    social: {
      hierarchyExpectation: 'steep',
      decisionMaking: 'top-down',
      timeOrientation: 'flexible',
      relationshipBuilding: 'moderate',
      taskVsRelationship: 'relationship-first',
    },
    business: {
      negotiationStyle: 'relationship-based',
      contractWeight: 'flexible',
      meetingStyle: 'relationship-first',
      alcoholInBusiness: 'optional',
      giftGiving: 'appreciated',
    },
    notes: 'Mai pen rai (never mind) is the national philosophy. Smiles mean many things — happiness, embarrassment, anger. Losing temper publicly = permanent credibility loss. Monarchy is sacred. Buddhism infuses everything. Feet are lowest (spiritual), head is sacred.',
  },

  'vietnam': {
    communication: {
      directness: 4,
      contextLevel: 'high-context',
      feedbackStyle: 'diplomatic',
      conflictStyle: 'avoidant',
      formalityDefault: 'semi-formal',
      silenceMeaning: 'thinking',
    },
    trust: {
      trustBasis: 'personal',
      corruptionRisk: 'high',
      verificationNeeded: 'high',
      loyaltyPattern: 'reciprocal',
    },
    social: {
      hierarchyExpectation: 'moderate',
      decisionMaking: 'top-down',
      timeOrientation: 'flexible',
      relationshipBuilding: 'moderate',
      taskVsRelationship: 'balanced',
    },
    business: {
      negotiationStyle: 'competitive',
      contractWeight: 'binding',
      meetingStyle: 'organic',
      alcoholInBusiness: 'expected',
      giftGiving: 'appreciated',
    },
    notes: 'More direct than most of SEA. "Maybe" is usually no. Negotiation is expected and enjoyed. Intense work ethic. Government relationships matter at scale. Coffee culture (ca phe sua da) is the meeting venue. Forward-looking despite war history. Tet (Lunar New Year) is the biggest event.',
  },

  'singapore': {
    communication: {
      directness: 7,
      contextLevel: 'medium-context',
      feedbackStyle: 'diplomatic',
      conflictStyle: 'diplomatic',
      formalityDefault: 'semi-formal',
      silenceMeaning: 'thinking',
    },
    trust: {
      trustBasis: 'institutional',
      corruptionRisk: 'low',
      verificationNeeded: 'low',
      loyaltyPattern: 'transactional',
    },
    social: {
      hierarchyExpectation: 'moderate',
      decisionMaking: 'individual',
      timeOrientation: 'strict',
      relationshipBuilding: 'moderate',
      taskVsRelationship: 'balanced',
    },
    business: {
      negotiationStyle: 'collaborative',
      contractWeight: 'binding',
      meetingStyle: 'agenda-driven',
      alcoholInBusiness: 'optional',
      giftGiving: 'unnecessary',
    },
    notes: 'APAC cheat code — English-speaking, efficient, multicultural. Kiasu (fear of losing) drives decisions. Small country = small network, reputation travels fast. Hawker centres are the social equalizer. Singlish signals you\'re not just passing through.',
  },

  'taiwan': {
    communication: {
      directness: 4,
      contextLevel: 'high-context',
      feedbackStyle: 'diplomatic',
      conflictStyle: 'diplomatic',
      formalityDefault: 'semi-formal',
      silenceMeaning: 'thinking',
    },
    trust: {
      trustBasis: 'mixed',
      corruptionRisk: 'moderate',
      verificationNeeded: 'moderate',
      loyaltyPattern: 'reciprocal',
    },
    social: {
      hierarchyExpectation: 'moderate',
      decisionMaking: 'consensus',
      timeOrientation: 'flexible',
      relationshipBuilding: 'moderate',
      taskVsRelationship: 'relationship-first',
    },
    business: {
      negotiationStyle: 'relationship-based',
      contractWeight: 'binding',
      meetingStyle: 'relationship-first',
      alcoholInBusiness: 'optional',
      giftGiving: 'appreciated',
    },
    notes: 'Blend of Chinese relationship culture and Japanese process orientation. Warmer and more informal than either. Tea and meals build relationships. Founders tend to be technically deep and humble — bragging backfires. China-Taiwan politics is sensitive — let them bring it up.',
  },

  'hong-kong': {
    communication: {
      directness: 7,
      contextLevel: 'medium-context',
      feedbackStyle: 'diplomatic',
      conflictStyle: 'diplomatic',
      formalityDefault: 'semi-formal',
      silenceMeaning: 'thinking',
    },
    trust: {
      trustBasis: 'mixed',
      corruptionRisk: 'low',
      verificationNeeded: 'moderate',
      loyaltyPattern: 'transactional',
    },
    social: {
      hierarchyExpectation: 'moderate',
      decisionMaking: 'individual',
      timeOrientation: 'strict',
      relationshipBuilding: 'fast',
      taskVsRelationship: 'task-first',
    },
    business: {
      negotiationStyle: 'competitive',
      contractWeight: 'binding',
      meetingStyle: 'agenda-driven',
      alcoholInBusiness: 'optional',
      giftGiving: 'appreciated',
    },
    notes: 'Fast, transactional, money-oriented. Most direct in Greater China. British colonial influence = contracts taken seriously. Dim sum is business breakfast. Status symbols matter visibly. Space is tiny — meetings in restaurants and hotel lobbies.',
  },

  'malaysia': {
    communication: {
      directness: 4,
      contextLevel: 'high-context',
      feedbackStyle: 'indirect',
      conflictStyle: 'avoidant',
      formalityDefault: 'semi-formal',
      silenceMeaning: 'respect',
    },
    trust: {
      trustBasis: 'personal',
      corruptionRisk: 'moderate',
      verificationNeeded: 'moderate',
      loyaltyPattern: 'reciprocal',
    },
    social: {
      hierarchyExpectation: 'moderate',
      decisionMaking: 'consensus',
      timeOrientation: 'flexible',
      relationshipBuilding: 'moderate',
      taskVsRelationship: 'relationship-first',
    },
    business: {
      negotiationStyle: 'relationship-based',
      contractWeight: 'flexible',
      meetingStyle: 'relationship-first',
      alcoholInBusiness: 'optional',
      giftGiving: 'appreciated',
    },
    notes: 'Multi-ethnic (Malay, Chinese, Indian) — communication style varies by ethnicity. Bumiputera policy favours Malay-owned businesses. Food is the great unifier. Mamak stalls at 2am are where all races mix. Know who you\'re with before ordering pork or alcohol.',
  },

  // ── MIDDLE EAST ──

  'gulf-states': {
    communication: {
      directness: 4,
      contextLevel: 'high-context',
      feedbackStyle: 'diplomatic',
      conflictStyle: 'diplomatic',
      formalityDefault: 'formal',
      silenceMeaning: 'respect',
    },
    trust: {
      trustBasis: 'personal',
      corruptionRisk: 'moderate',
      verificationNeeded: 'moderate',
      loyaltyPattern: 'reciprocal',
    },
    social: {
      hierarchyExpectation: 'steep',
      decisionMaking: 'top-down',
      timeOrientation: 'flexible',
      relationshipBuilding: 'slow',
      taskVsRelationship: 'relationship-first',
    },
    business: {
      negotiationStyle: 'relationship-based',
      contractWeight: 'starting-point',
      meetingStyle: 'relationship-first',
      alcoholInBusiness: 'none',
      giftGiving: 'expected',
    },
    notes: 'Wasta (connections) is the operating system. 30 min of tea before business is normal. Islam shapes daily rhythm. Left hand is unclean. Generosity is core — refusing hospitality is offensive. Publicly accusing someone of dishonesty is nuclear.',
  },

  'israel': {
    communication: {
      directness: 10,
      contextLevel: 'low-context',
      feedbackStyle: 'blunt',
      conflictStyle: 'confrontational',
      formalityDefault: 'casual',
      silenceMeaning: 'thinking',
    },
    trust: {
      trustBasis: 'institutional',
      corruptionRisk: 'low',
      verificationNeeded: 'low',
      loyaltyPattern: 'transactional',
    },
    social: {
      hierarchyExpectation: 'flat',
      decisionMaking: 'individual',
      timeOrientation: 'flexible',
      relationshipBuilding: 'fast',
      taskVsRelationship: 'task-first',
    },
    business: {
      negotiationStyle: 'competitive',
      contractWeight: 'binding',
      meetingStyle: 'agenda-driven',
      alcoholInBusiness: 'optional',
      giftGiving: 'unnecessary',
    },
    notes: 'Possibly the most direct culture on earth. Chutzpah (audacious nerve) is a virtue. A 23-year-old will tell a CEO they\'re wrong. Military service creates directness and comfort with chaos. Arguments are entertainment. Shabbat observance varies.',
  },

  'turkey': {
    communication: {
      directness: 5,
      contextLevel: 'medium-context',
      feedbackStyle: 'diplomatic',
      conflictStyle: 'diplomatic',
      formalityDefault: 'semi-formal',
      silenceMeaning: 'thinking',
    },
    trust: {
      trustBasis: 'personal',
      corruptionRisk: 'moderate',
      verificationNeeded: 'moderate',
      loyaltyPattern: 'reciprocal',
    },
    social: {
      hierarchyExpectation: 'moderate',
      decisionMaking: 'top-down',
      timeOrientation: 'flexible',
      relationshipBuilding: 'moderate',
      taskVsRelationship: 'relationship-first',
    },
    business: {
      negotiationStyle: 'relationship-based',
      contractWeight: 'flexible',
      meetingStyle: 'relationship-first',
      alcoholInBusiness: 'optional',
      giftGiving: 'appreciated',
    },
    notes: 'Bridge culture between Europe and Middle East. Tea is offered constantly — always accept. Negotiation is expected and prolonged. Honour and face matter. Atatürk is revered. Istanbul = more Western, Anatolia = more traditional.',
  },

  // ── EUROPE ──

  'united-kingdom': {
    communication: {
      directness: 4,
      contextLevel: 'medium-context',
      feedbackStyle: 'indirect',
      conflictStyle: 'passive-aggressive',
      formalityDefault: 'semi-formal',
      silenceMeaning: 'disagreement',
    },
    trust: {
      trustBasis: 'institutional',
      corruptionRisk: 'low',
      verificationNeeded: 'low',
      loyaltyPattern: 'transactional',
    },
    social: {
      hierarchyExpectation: 'moderate',
      decisionMaking: 'individual',
      timeOrientation: 'strict',
      relationshipBuilding: 'slow',
      taskVsRelationship: 'task-first',
    },
    business: {
      negotiationStyle: 'collaborative',
      contractWeight: 'binding',
      meetingStyle: 'agenda-driven',
      alcoholInBusiness: 'expected',
      giftGiving: 'unnecessary',
    },
    notes: 'Indirect masquerading as direct. "Quite interesting" = hate it. "With the greatest respect" = you\'re an idiot. Class is the invisible OS. Humour is the communication tool — decode what the joke is about. Rounds at the pub matter. Queueing is sacred.',
  },

  'germany': {
    communication: {
      directness: 9,
      contextLevel: 'low-context',
      feedbackStyle: 'blunt',
      conflictStyle: 'confrontational',
      formalityDefault: 'formal',
      silenceMeaning: 'thinking',
    },
    trust: {
      trustBasis: 'institutional',
      corruptionRisk: 'low',
      verificationNeeded: 'low',
      loyaltyPattern: 'transactional',
    },
    social: {
      hierarchyExpectation: 'moderate',
      decisionMaking: 'consensus',
      timeOrientation: 'strict',
      relationshipBuilding: 'slow',
      taskVsRelationship: 'task-first',
    },
    business: {
      negotiationStyle: 'collaborative',
      contractWeight: 'binding',
      meetingStyle: 'agenda-driven',
      alcoholInBusiness: 'optional',
      giftGiving: 'unnecessary',
    },
    notes: 'Plain feedback is respect, not rudeness. Meetings start and end on time. Titles matter (Herr Doktor). Don\'t propose half-baked ideas. Decisions are slow but execution is precise. Work/personal firmly separated. Punctuality is moral.',
  },

  'netherlands': {
    communication: {
      directness: 10,
      contextLevel: 'low-context',
      feedbackStyle: 'blunt',
      conflictStyle: 'confrontational',
      formalityDefault: 'casual',
      silenceMeaning: 'thinking',
    },
    trust: {
      trustBasis: 'institutional',
      corruptionRisk: 'low',
      verificationNeeded: 'low',
      loyaltyPattern: 'transactional',
    },
    social: {
      hierarchyExpectation: 'flat',
      decisionMaking: 'consensus',
      timeOrientation: 'strict',
      relationshipBuilding: 'moderate',
      taskVsRelationship: 'task-first',
    },
    business: {
      negotiationStyle: 'collaborative',
      contractWeight: 'binding',
      meetingStyle: 'agenda-driven',
      alcoholInBusiness: 'optional',
      giftGiving: 'unnecessary',
    },
    notes: 'Most direct culture in Europe, possibly the world. "Your idea is bad" is a favour. Poldermodel = consensus, everyone gets a say. Going Dutch is real. "You\'ve gained weight" is an observation, not an attack. Everything is scheduled.',
  },

  'france': {
    communication: {
      directness: 6,
      contextLevel: 'medium-context',
      feedbackStyle: 'diplomatic',
      conflictStyle: 'confrontational',
      formalityDefault: 'formal',
      silenceMeaning: 'thinking',
    },
    trust: {
      trustBasis: 'institutional',
      corruptionRisk: 'low',
      verificationNeeded: 'low',
      loyaltyPattern: 'transactional',
    },
    social: {
      hierarchyExpectation: 'steep',
      decisionMaking: 'top-down',
      timeOrientation: 'flexible',
      relationshipBuilding: 'slow',
      taskVsRelationship: 'balanced',
    },
    business: {
      negotiationStyle: 'competitive',
      contractWeight: 'binding',
      meetingStyle: 'organic',
      alcoholInBusiness: 'expected',
      giftGiving: 'appreciated',
    },
    notes: 'Intellectual debate is a working style, not conflict. Grandes écoles determine career trajectory for life. Presentation and style matter. Lunch is sacred (1-2 hrs). "Non" is a starting position. Speaking even bad French earns respect.',
  },

  'italy': {
    communication: {
      directness: 6,
      contextLevel: 'medium-context',
      feedbackStyle: 'diplomatic',
      conflictStyle: 'diplomatic',
      formalityDefault: 'semi-formal',
      silenceMeaning: 'thinking',
    },
    trust: {
      trustBasis: 'personal',
      corruptionRisk: 'moderate',
      verificationNeeded: 'moderate',
      loyaltyPattern: 'reciprocal',
    },
    social: {
      hierarchyExpectation: 'moderate',
      decisionMaking: 'top-down',
      timeOrientation: 'flexible',
      relationshipBuilding: 'fast',
      taskVsRelationship: 'relationship-first',
    },
    business: {
      negotiationStyle: 'relationship-based',
      contractWeight: 'flexible',
      meetingStyle: 'organic',
      alcoholInBusiness: 'expected',
      giftGiving: 'appreciated',
    },
    notes: 'Bella figura (beautiful impression) matters. Talking over each other = engagement. North (Milan) is almost German. South (Naples) runs on relationships. Family businesses dominate. Food is sacred — compliment it. No cappuccino after 11am.',
  },

  'spain': {
    communication: {
      directness: 6,
      contextLevel: 'medium-context',
      feedbackStyle: 'diplomatic',
      conflictStyle: 'diplomatic',
      formalityDefault: 'semi-formal',
      silenceMeaning: 'thinking',
    },
    trust: {
      trustBasis: 'personal',
      corruptionRisk: 'moderate',
      verificationNeeded: 'moderate',
      loyaltyPattern: 'reciprocal',
    },
    social: {
      hierarchyExpectation: 'moderate',
      decisionMaking: 'top-down',
      timeOrientation: 'flexible',
      relationshipBuilding: 'fast',
      taskVsRelationship: 'relationship-first',
    },
    business: {
      negotiationStyle: 'relationship-based',
      contractWeight: 'flexible',
      meetingStyle: 'relationship-first',
      alcoholInBusiness: 'expected',
      giftGiving: 'appreciated',
    },
    notes: 'Confianza (trust) required first. Real decisions happen at dinner. Don\'t schedule 2-4pm. Tapas = shared food culture. Regional pride is intense — don\'t call a Catalan Spanish. Dinner at 10pm is normal.',
  },

  'russia': {
    communication: {
      directness: 7,
      contextLevel: 'medium-context',
      feedbackStyle: 'blunt',
      conflictStyle: 'confrontational',
      formalityDefault: 'formal',
      silenceMeaning: 'thinking',
    },
    trust: {
      trustBasis: 'personal',
      corruptionRisk: 'high',
      verificationNeeded: 'high',
      loyaltyPattern: 'devotional',
    },
    social: {
      hierarchyExpectation: 'steep',
      decisionMaking: 'top-down',
      timeOrientation: 'flexible',
      relationshipBuilding: 'slow',
      taskVsRelationship: 'relationship-first',
    },
    business: {
      negotiationStyle: 'adversarial',
      contractWeight: 'starting-point',
      meetingStyle: 'relationship-first',
      alcoholInBusiness: 'central',
      giftGiving: 'expected',
    },
    notes: 'Unsmiling in business = normal (smiling at strangers is insincere). Deeply warm in private. Vodka is a business tool. Negotiations are adversarial — they test you. Odd flowers only (even = funerals). Hospitality is extreme.',
  },

  // ── AMERICAS ──

  'united-states': {
    communication: {
      directness: 7,
      contextLevel: 'low-context',
      feedbackStyle: 'diplomatic',
      conflictStyle: 'diplomatic',
      formalityDefault: 'casual',
      silenceMeaning: 'thinking',
    },
    trust: {
      trustBasis: 'institutional',
      corruptionRisk: 'low',
      verificationNeeded: 'low',
      loyaltyPattern: 'transactional',
    },
    social: {
      hierarchyExpectation: 'flat',
      decisionMaking: 'individual',
      timeOrientation: 'strict',
      relationshipBuilding: 'fast',
      taskVsRelationship: 'task-first',
    },
    business: {
      negotiationStyle: 'collaborative',
      contractWeight: 'binding',
      meetingStyle: 'agenda-driven',
      alcoholInBusiness: 'optional',
      giftGiving: 'unnecessary',
    },
    notes: 'Discount compliments by 40% — "amazing" is mediocre. Self-promotion is expected. Lawyers are everywhere. "How are you?" = "great, you?" NDAs before coffee is normal. Massive regional variation (NY vs South vs West Coast).',
  },

  'brazil': {
    communication: {
      directness: 5,
      contextLevel: 'medium-context',
      feedbackStyle: 'diplomatic',
      conflictStyle: 'diplomatic',
      formalityDefault: 'casual',
      silenceMeaning: 'discomfort',
    },
    trust: {
      trustBasis: 'personal',
      corruptionRisk: 'high',
      verificationNeeded: 'high',
      loyaltyPattern: 'reciprocal',
    },
    social: {
      hierarchyExpectation: 'moderate',
      decisionMaking: 'top-down',
      timeOrientation: 'very-flexible',
      relationshipBuilding: 'fast',
      taskVsRelationship: 'relationship-first',
    },
    business: {
      negotiationStyle: 'relationship-based',
      contractWeight: 'flexible',
      meetingStyle: 'relationship-first',
      alcoholInBusiness: 'expected',
      giftGiving: 'appreciated',
    },
    notes: 'Physical warmth is professional — touching, hugging, standing close. Jeitinho brasileiro = creative problem-solving around rules. Personal conversation before business, always. Bureaucracy is legendary. Optimism is cultural.',
  },

  'mexico': {
    communication: {
      directness: 4,
      contextLevel: 'high-context',
      feedbackStyle: 'indirect',
      conflictStyle: 'avoidant',
      formalityDefault: 'formal',
      silenceMeaning: 'respect',
    },
    trust: {
      trustBasis: 'personal',
      corruptionRisk: 'high',
      verificationNeeded: 'high',
      loyaltyPattern: 'reciprocal',
    },
    social: {
      hierarchyExpectation: 'steep',
      decisionMaking: 'top-down',
      timeOrientation: 'very-flexible',
      relationshipBuilding: 'moderate',
      taskVsRelationship: 'relationship-first',
    },
    business: {
      negotiationStyle: 'relationship-based',
      contractWeight: 'flexible',
      meetingStyle: 'relationship-first',
      alcoholInBusiness: 'expected',
      giftGiving: 'appreciated',
    },
    notes: 'Personalismo — personal relationships drive everything. Face-to-face over email always. "Maybe" or "let me think" may mean no. Food is identity. Títulos matter initially.',
  },

  'argentina': {
    communication: {
      directness: 6,
      contextLevel: 'medium-context',
      feedbackStyle: 'diplomatic',
      conflictStyle: 'confrontational',
      formalityDefault: 'casual',
      silenceMeaning: 'thinking',
    },
    trust: {
      trustBasis: 'personal',
      corruptionRisk: 'moderate',
      verificationNeeded: 'moderate',
      loyaltyPattern: 'reciprocal',
    },
    social: {
      hierarchyExpectation: 'moderate',
      decisionMaking: 'individual',
      timeOrientation: 'flexible',
      relationshipBuilding: 'fast',
      taskVsRelationship: 'balanced',
    },
    business: {
      negotiationStyle: 'competitive',
      contractWeight: 'binding',
      meetingStyle: 'organic',
      alcoholInBusiness: 'expected',
      giftGiving: 'appreciated',
    },
    notes: 'Most European culture in Latin America. Intellectual debate is valued. Highest psychologists per capita — unusually self-aware. Maté sharing is a trust ritual. Economic instability = intuitive understanding of inflation/hedging. Late nights — dinner 10pm.',
  },

  // ── AFRICA ──

  'nigeria': {
    communication: {
      directness: 7,
      contextLevel: 'medium-context',
      feedbackStyle: 'diplomatic',
      conflictStyle: 'confrontational',
      formalityDefault: 'semi-formal',
      silenceMeaning: 'thinking',
    },
    trust: {
      trustBasis: 'personal',
      corruptionRisk: 'high',
      verificationNeeded: 'high',
      loyaltyPattern: 'reciprocal',
    },
    social: {
      hierarchyExpectation: 'steep',
      decisionMaking: 'top-down',
      timeOrientation: 'flexible',
      relationshipBuilding: 'fast',
      taskVsRelationship: 'balanced',
    },
    business: {
      negotiationStyle: 'competitive',
      contractWeight: 'flexible',
      meetingStyle: 'organic',
      alcoholInBusiness: 'optional',
      giftGiving: 'expected',
    },
    notes: 'Intense hustle energy. Direct by African standards. Trust builds through repeated transactions. Yoruba/Igbo/Hausa are basically different cultures. Lagos tech scene is globally competitive. Due diligence on new partners is essential. Respect for elders is absolute.',
  },

  'south-africa': {
    communication: {
      directness: 7,
      contextLevel: 'low-context',
      feedbackStyle: 'diplomatic',
      conflictStyle: 'diplomatic',
      formalityDefault: 'casual',
      silenceMeaning: 'thinking',
    },
    trust: {
      trustBasis: 'mixed',
      corruptionRisk: 'moderate',
      verificationNeeded: 'moderate',
      loyaltyPattern: 'reciprocal',
    },
    social: {
      hierarchyExpectation: 'moderate',
      decisionMaking: 'individual',
      timeOrientation: 'flexible',
      relationshipBuilding: 'fast',
      taskVsRelationship: 'balanced',
    },
    business: {
      negotiationStyle: 'collaborative',
      contractWeight: 'binding',
      meetingStyle: 'agenda-driven',
      alcoholInBusiness: 'expected',
      giftGiving: 'unnecessary',
    },
    notes: 'Ubuntu (I am because we are) is a stated value. BEE policies affect business structuring. Braai (BBQ) is where real talk happens. "Now now" = soon, "just now" = eventually, "right now" = now. 11 official languages. Load-shedding bred extreme resilience.',
  },

  'kenya': {
    communication: {
      directness: 5,
      contextLevel: 'medium-context',
      feedbackStyle: 'diplomatic',
      conflictStyle: 'diplomatic',
      formalityDefault: 'semi-formal',
      silenceMeaning: 'respect',
    },
    trust: {
      trustBasis: 'mixed',
      corruptionRisk: 'high',
      verificationNeeded: 'high',
      loyaltyPattern: 'reciprocal',
    },
    social: {
      hierarchyExpectation: 'moderate',
      decisionMaking: 'consensus',
      timeOrientation: 'flexible',
      relationshipBuilding: 'moderate',
      taskVsRelationship: 'balanced',
    },
    business: {
      negotiationStyle: 'collaborative',
      contractWeight: 'binding',
      meetingStyle: 'organic',
      alcoholInBusiness: 'optional',
      giftGiving: 'appreciated',
    },
    notes: 'East Africa\'s business hub (Silicon Savannah). M-Pesa leapfrogged banking. More structured than West Africa. Harambee (pulling together) is a cultural value. Tribal dynamics (Kikuyu, Luo, Kalenjin) are politically significant. Running is national pride.',
  },
};

/**
 * Get cultural defaults for a country/region.
 * Returns null if no defaults are configured.
 */
export function getCulturalDefaults(raisedIn: string): CulturalDefaults | null {
  const key = raisedIn.toLowerCase().replace(/\s+/g, '-');
  return CULTURAL_DEFAULTS[key] || null;
}

/**
 * List all available cultural default keys.
 */
export function listCulturalDefaultKeys(): string[] {
  return Object.keys(CULTURAL_DEFAULTS);
}
